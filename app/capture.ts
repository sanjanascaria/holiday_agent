import { IntelligenceError, interpret, type Instruction, type SavedPlan } from './intelligence.ts';

/** Persisted jobs make retries explicit and keep API failures from losing chat messages. */
export async function captureMessage(db:D1Database,mid:string,trip:string,key:string,model?:string,interpretPlan:typeof interpret=interpret){
 const now=Date.now(),run=crypto.randomUUID();
 const claim=await db.prepare("UPDATE capture_jobs SET state='processing',error='',attempts=attempts+1,run=?,updated=? WHERE message=? AND trip=? AND attempts<3 AND (state IN ('pending','failed') OR (state='processing' AND updated<?))")
  .bind(run,now,mid,trip,now-120000).run();
 if(!claim.meta.changes)return;
 try{
  // Reserve bounded usage before calling a billable provider, even on failures.
  const message:any=await db.prepare('SELECT * FROM messages WHERE id=? AND trip=?').bind(mid,trip).first();
  if(!message)return;
  const limits:[string,number][]=[['user:'+message.user+':'+Math.floor(now/3600000),30],['trip:'+trip+':'+Math.floor(now/86400000),200],['site:'+Math.floor(now/86400000),1000]];
  for(const [scope,limit] of limits){
   const reserved=await db.prepare('INSERT INTO ai_usage (scope,count) VALUES (?,1) ON CONFLICT(scope) DO UPDATE SET count=count+1 WHERE count<? RETURNING count').bind(scope,limit).first();
   if(!reserved)throw new IntelligenceError('rate_limit');
  }
  const quote:any=message.reply?await db.prepare('SELECT id,body FROM messages WHERE id=? AND trip=?').bind(message.reply,trip).first():null;
  const plans=await db.prepare("SELECT id,title,category,status,notes,url,source,version,review,day,time,web FROM items WHERE trip=? AND (status<>'Archived' OR source=?) ORDER BY CASE WHEN source=? THEN 0 ELSE 1 END,created DESC LIMIT 60").bind(trip,quote?.id||'',quote?.id||'').all<SavedPlan>();
  const details:any=await db.prepare('SELECT name,destination,dates FROM trips WHERE id=?').bind(trip).first();
  if(!details)return;
  const input:Instruction={body:message.body,quote:quote||undefined,plans:boundedPlans(plans.results),trip:details};
  const changes=await interpretPlan(input,key,model);
  const statements:D1PreparedStatement[]=[],ids:string[]=[];
  const alive="EXISTS (SELECT 1 FROM capture_jobs WHERE message=? AND trip=? AND run=? AND state='processing')";
  for(const change of changes){
   const notes=[change.notes,change.review&&change.reason?'Needs review: '+change.reason:''].filter(Boolean).join('\n');
   if(change.action==='create'){
    const iid=crypto.randomUUID();ids.push(iid);
    statements.push(db.prepare(`INSERT INTO items (id,trip,title,category,status,notes,url,day,time,web,source,name,review,version,created) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,1,? WHERE ${alive}`)
     .bind(iid,trip,change.title,change.category,change.status,notes,change.url,change.day,change.time,change.web||'',mid,message.name,change.review?1:0,now,mid,trip,run));
   }else{
    // Reload the full snapshot for undo; use the version originally supplied to AI.
    const original=input.plans.find(p=>p.id===change.itemId)!;
    const old:any=await db.prepare('SELECT * FROM items WHERE id=? AND trip=?').bind(original.id,trip).first();
    const rev=crypto.randomUUID(),conflict=crypto.randomUUID();ids.push(original.id,conflict);
    statements.push(db.prepare(`INSERT INTO revisions (id,trip,item,before,after_version,name,created) SELECT ?,?,?,?,?,?,? WHERE ${alive} AND EXISTS (SELECT 1 FROM items WHERE id=? AND trip=? AND version=?)`)
     .bind(rev,trip,original.id,JSON.stringify(old||original),original.version+1,message.name,now,mid,trip,run,original.id,trip,original.version));
    statements.push(db.prepare(`INSERT INTO items (id,trip,title,category,status,notes,url,day,time,web,source,name,review,version,created) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,1,1,? WHERE ${alive} AND NOT EXISTS (SELECT 1 FROM items WHERE id=? AND trip=? AND version=?)`)
     .bind(conflict,trip,change.title,change.category,'Option',notes+'\nNeeds review: this plan changed while Pickl was processing your instruction.',change.url,change.day,change.time,change.web||old?.web||'',mid,message.name,now,mid,trip,run,original.id,trip,original.version));
    statements.push(db.prepare(`UPDATE items SET title=?,category=?,status=?,notes=?,url=?,day=?,time=?,web=?,review=0,version=version+1 WHERE id=? AND trip=? AND version=? AND ${alive}`)
     .bind(change.title,change.category,change.status,notes,change.url,change.day,change.time,change.web||(change.url===old?.url?old?.web:'')||'',original.id,trip,original.version,mid,trip,run));
   }
  }
  statements.push(db.prepare("UPDATE capture_jobs SET state=?,result_ids=?,updated=? WHERE message=? AND trip=? AND run=? AND state='processing'")
   .bind(changes.length?'complete':'skipped',JSON.stringify(ids),Date.now(),mid,trip,run));
  await db.batch(statements);
 }catch(e){
  const code=e instanceof IntelligenceError?e.code:'unavailable';
  await db.prepare("UPDATE capture_jobs SET state='failed',error=?,updated=? WHERE message=? AND trip=? AND run=? AND state='processing'").bind(code,Date.now(),mid,trip,run).run();
 }
}

function boundedPlans(plans:SavedPlan[]){
 let size=0;return plans.filter(p=>{const length=JSON.stringify(p).length;if(size+length>40000)return false;size+=length;return true;});
}
