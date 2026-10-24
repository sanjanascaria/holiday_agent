import { env } from 'cloudflare:workers';
import { guest as getChatGPTUser } from '../../guest';
import { extract, categories, statuses } from '../../extract';
export const dynamic = 'force-dynamic';
const json = (data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const id = ()=>crypto.randomUUID();
const str = (v:unknown,n=300)=>typeof v==='string'?v.trim().slice(0,n):'';
function database(){ if(!env.DB) throw new Error('Storage unavailable'); return env.DB; }
async function access(trip:string,user:string){return database().prepare('SELECT * FROM members WHERE trip=? AND user=?').bind(trip,user).first();}
export async function GET(req:Request){
 const user=await getChatGPTUser(); if(!user)return json({error:'Please sign in.'},401);
 try {
 const db=database(); const trip=new URL(req.url).searchParams.get('trip');
 const list=await db.prepare('SELECT t.*, COALESCE((SELECT MAX(msg.created) FROM messages msg WHERE msg.trip=t.id),t.created) AS activity, (SELECT msg.body FROM messages msg WHERE msg.trip=t.id ORDER BY msg.created DESC LIMIT 1) AS last_message, (SELECT COUNT(*) FROM members people WHERE people.trip=t.id) AS member_count FROM trips t JOIN members m ON m.trip=t.id WHERE m.user=? ORDER BY activity DESC, t.id').bind(user.userId).all();
 if(!trip)return json({trips:list.results});
 if(!await access(trip,user.userId))return json({error:'This trip is private.'},403);
 const [msgs,board,people,revs]=await Promise.all([
 db.prepare('SELECT recent.*, quoted.body AS reply_body, quoted.name AS reply_name FROM (SELECT * FROM messages WHERE trip=? ORDER BY created DESC LIMIT 300) recent LEFT JOIN messages quoted ON quoted.id=recent.reply AND quoted.trip=recent.trip ORDER BY recent.created ASC').bind(trip).all(),
 db.prepare('SELECT * FROM items WHERE trip=? ORDER BY created DESC').bind(trip).all(),
 db.prepare('SELECT user,name FROM members WHERE trip=?').bind(trip).all(),
 db.prepare('SELECT id,item,after_version,name,created FROM revisions WHERE trip=? ORDER BY created DESC LIMIT 30').bind(trip).all()]);
 return json({trips:list.results,messages:msgs.results,items:board.results,members:people.results,revisions:revs.results});
 }catch{ return json({error:'Could not load your trip. Please retry.'},503); }
}
export async function POST(req:Request){
 const origin=req.headers.get('origin'); if(origin && origin!==new URL(req.url).origin)return json({error:'Invalid origin.'},403);
 const user=await getChatGPTUser(); if(!user)return json({error:'Please sign in.'},401);
 let b:any; try{b=await req.json();}catch{return json({error:'Invalid request.'},400);}
 const name=(user.fullName||user.email.split('@')[0]).slice(0,70);
 try{
 const db=database();
 if(b.action==='create'){
 const trip=id(),title=str(b.name,80); if(!title)return json({error:'Give your trip a name.'},400);
 await db.batch([db.prepare('INSERT INTO trips (id,name,destination,dates,owner,invite,created) VALUES (?,?,?,?,?,?,?)').bind(trip,title,str(b.destination,80),str(b.dates,80),user.userId,id(),Date.now()),db.prepare('INSERT INTO members (trip,user,name) VALUES (?,?,?)').bind(trip,user.userId,name)]);
 return json({trip});
 }
 if(b.action==='join'){
 const trip:any=await db.prepare('SELECT id FROM trips WHERE invite=?').bind(str(b.token,100)).first();
 if(!trip)return json({error:'This invitation is invalid or has expired.'},404);
 await db.prepare('INSERT OR IGNORE INTO members (trip,user,name) VALUES (?,?,?)').bind(trip.id,user.userId,name).run(); return json({trip:trip.id});
 }
 const trip=str(b.trip,100); if(!await access(trip,user.userId))return json({error:'This trip is private.'},403);
 if(b.action==='delete'){
 const own:any=await db.prepare('SELECT owner FROM trips WHERE id=?').bind(trip).first();if(own?.owner!==user.userId)return json({error:'Only the group creator can delete this chat.'},403);
 await db.batch([db.prepare('DELETE FROM revisions WHERE trip=?').bind(trip),db.prepare('DELETE FROM items WHERE trip=?').bind(trip),db.prepare('DELETE FROM messages WHERE trip=?').bind(trip),db.prepare('DELETE FROM members WHERE trip=?').bind(trip),db.prepare('DELETE FROM trips WHERE id=?').bind(trip)]);return json({ok:true});
 }
 if(b.action==='rename'){
 const title=typeof b.name==='string'?b.name.trim():'';if(!title||title.length>80)return json({error:'Use a group name between 1 and 80 characters.'},400);
 const result=await db.prepare('UPDATE trips SET name=? WHERE id=? AND name=?').bind(title,trip,str(b.previous,80)).run();
 if(!result.meta.changes)return json({error:'The group name changed. Cancel and try again.'},409);return json({ok:true});
 }
 if(b.action==='rotate'){
 const own:any=await db.prepare('SELECT owner FROM trips WHERE id=?').bind(trip).first(); if(own.owner!==user.userId)return json({error:'Only the organiser can reset invitations.'},403);
 await db.prepare('UPDATE trips SET invite=? WHERE id=?').bind(id(),trip).run(); return json({ok:true});
 }
 if(b.action==='message'){
 const body=str(b.body,4000),mid=str(b.id,100); if(!body||!mid)return json({error:'Write a message first.'},400);
 const exists=await db.prepare('SELECT id FROM messages WHERE id=?').bind(mid).first(); if(exists)return json({ok:true});
 let quote:any=null; if(b.reply){quote=await db.prepare('SELECT * FROM messages WHERE id=? AND trip=?').bind(str(b.reply,100),trip).first();if(!quote)return json({error:'The replied-to message is unavailable.'},400);}
 const plan=extract(body,quote?.body||''); const now=Date.now();
 const stmts=[db.prepare('INSERT INTO messages (id,trip,user,name,body,reply,created) VALUES (?,?,?,?,?,?,?)').bind(mid,trip,user.userId,name,body,quote?.id||null,now)];
 if(plan){
 const existing:any=quote?await db.prepare('SELECT * FROM items WHERE trip=? AND source=? LIMIT 1').bind(trip,quote.id).first():null;
 if(existing && !plan.review && plan.status!=='Option'){
 // Only an unchanged source card can be updated; concurrent changes become a review entry.
 stmts.push(db.prepare('INSERT INTO revisions (id,trip,item,before,after_version,name,created) SELECT ?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM items WHERE id=? AND version=?)').bind(id(),trip,existing.id,JSON.stringify(existing),existing.version+1,name,now,existing.id,existing.version));
 stmts.push(db.prepare('INSERT INTO items (id,trip,title,category,status,notes,url,source,name,review,version,created) SELECT ?,?,?,?,?,?,?,?,?,1,1,? WHERE EXISTS (SELECT 1 FROM items WHERE id=? AND version<>?)').bind(id(),trip,plan.title,plan.category,plan.status,plan.notes,plan.url,mid,name,now,existing.id,existing.version));
 stmts.push(db.prepare('UPDATE items SET status=?, notes=?, version=version+1 WHERE id=? AND version=?').bind(plan.status,existing.notes+'\n'+body,existing.id,existing.version));
 }else{
 const duplicate=plan.url?await db.prepare('SELECT id FROM items WHERE trip=? AND url=? AND status<>? LIMIT 1').bind(trip,plan.url,'Archived').first():null;
 stmts.push(db.prepare('INSERT INTO items (id,trip,title,category,status,notes,url,source,name,review,version,created) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind(id(),trip,plan.title,plan.category,plan.status,plan.notes,plan.url,mid,name,duplicate?1:plan.review,1,now));
 }
 }
 await db.batch(stmts); return json({ok:true,saved:!!plan});
 }
 if(b.action==='save'){
 const title=str(b.title,100),category=str(b.category),status=str(b.status); if(!title||!categories.includes(category)||!statuses.includes(status))return json({error:'Check the title, category and status.'},400);
 const url=str(b.url,2000); if(url){try{if(!['https:','http:'].includes(new URL(url).protocol))throw 0;}catch{return json({error:'Use a full http or https link.'},400);}}
 const notes=str(b.notes,5000); const iid=str(b.item,100); const old:any=iid?await db.prepare('SELECT * FROM items WHERE id=? AND trip=?').bind(iid,trip).first():null;
 if(iid&&!old)return json({error:'Item not found.'},404);
 if(old){
 if(old.version!==b.version)return json({error:'Someone changed this item. Close it and reopen the latest version.'},409);
 const rev=id(); await db.batch([
 db.prepare('INSERT INTO revisions (id,trip,item,before,after_version,name,created) SELECT ?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM items WHERE id=? AND version=?)').bind(rev,trip,iid,JSON.stringify(old),old.version+1,name,Date.now(),iid,old.version),
 db.prepare('UPDATE items SET title=?, category=?, status=?, notes=?, url=?, review=0, version=version+1 WHERE id=? AND version=?').bind(title,category,status,notes,url,iid,old.version)]);
 const applied=await db.prepare('SELECT id FROM revisions WHERE id=?').bind(rev).first();if(!applied)return json({error:'Someone changed this item. Reopen the latest version.'},409);
 }else await db.prepare('INSERT INTO items (id,trip,title,category,status,notes,url,source,name,review,version,created) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind(id(),trip,title,category,status,notes,url,null,name,0,1,Date.now()).run();
 return json({ok:true});
 }
 if(b.action==='undo'){
 const rev:any=await db.prepare('SELECT * FROM revisions WHERE id=? AND trip=?').bind(str(b.revision,100),trip).first();if(!rev)return json({error:'Change not found.'},404);
 const old=JSON.parse(rev.before);const result=await db.prepare('UPDATE items SET title=?,category=?,status=?,notes=?,url=?,review=?,version=version+1 WHERE id=? AND trip=? AND version=?').bind(old.title,old.category,old.status,old.notes,old.url,old.review,rev.item,trip,rev.after_version).run();
 if(!result.meta.changes)return json({error:'A newer change exists. Edit the item instead.'},409);return json({ok:true});
 }
 return json({error:'Unknown action.'},400);
 }catch{return json({error:'Could not save. Your message or edit has been kept so you can retry.'},503);}
}
