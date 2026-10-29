import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { captureMessage } from './capture.ts';
import { IntelligenceError, type PlanChange } from './intelligence.ts';

function fixture(){
 const sql=new DatabaseSync(':memory:');
 for(const file of ['0000_productive_bloodscream.sql','0001_high_peter_quill.sql','0002_charming_jack_flag.sql','0003_steep_namora.sql','0004_volatile_micromacro.sql'])sql.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
 sql.exec("INSERT INTO trips VALUES ('trip','Test','','','user','invite',1); INSERT INTO messages VALUES ('msg','trip','user','Maya','@Pickl save this',NULL,1); INSERT INTO capture_jobs (message,trip,state,created,updated) VALUES ('msg','trip','pending',1,1)");
 function prepare(query:string){let values:any[]=[];return {
  bind(...v:any[]){values=v;return this;},
  async first(){return sql.prepare(query).get(...values)||null;},
  async all(){return {results:sql.prepare(query).all(...values)};},
  async run(){const result=sql.prepare(query).run(...values);return {meta:{changes:Number(result.changes)}};}
 };}
 const db={prepare,async batch(statements:ReturnType<typeof prepare>[]){sql.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sql.exec('COMMIT');return results;}catch(e){sql.exec('ROLLBACK');throw e;}}} as unknown as D1Database;
 const job=()=>sql.prepare('SELECT * FROM capture_jobs').get()!;
 return {sql,db,job};
}
const change:PlanChange={action:'create',itemId:null,title:'Prado',category:'Food',status:'Option',notes:'Friday',url:'',review:false,reason:'',day:'2027-06-12',time:'19:00'};
test('concurrent duplicate captures call AI once and persist one card',async()=>{
 const {sql,db,job}=fixture();let calls=0;
 await Promise.all([1,2].map(()=>captureMessage(db,'msg','trip','test',undefined,async()=>{calls++;return [change];})));
 assert.equal(calls,1);assert.equal(sql.prepare('SELECT COUNT(*) n FROM items').get()?.n,1);assert.equal(sql.prepare('SELECT day FROM items').get()?.day,'2027-06-12');assert.equal(sql.prepare('SELECT time FROM items').get()?.time,'19:00');assert.equal(job().state,'complete');
 await captureMessage(db,'msg','trip','test',undefined,async()=>{calls++;return [change];});assert.equal(calls,1);sql.close();
});
test('provider failure retains message and explicit retry can succeed',async()=>{
 const {sql,db,job}=fixture();await captureMessage(db,'msg','trip','test',undefined,async()=>{throw new IntelligenceError('quota');});
 assert.equal(job().state,'failed');assert.equal(job().error,'quota');assert.equal(sql.prepare('SELECT COUNT(*) n FROM messages').get()?.n,1);
 await captureMessage(db,'msg','trip','test',undefined,async()=>[change]);assert.equal(job().state,'complete');assert.equal(job().attempts,2);sql.close();
});
test('spending cap rejects before invoking AI',async()=>{
 const {sql,db,job}=fixture();sql.prepare('INSERT INTO ai_usage VALUES (?,1000)').run('site:'+Math.floor(Date.now()/86400000));let calls=0;
 await captureMessage(db,'msg','trip','test',undefined,async()=>{calls++;return [change];});assert.equal(calls,0);assert.equal(job().error,'rate_limit');sql.close();
});
test('distinct activities sharing a website are not automatically marked for review',async()=>{
 const {sql,db,job}=fixture();
 sql.exec("INSERT INTO items (id,trip,title,category,status,notes,url,source,name,review,version,created,day,time) VALUES ('existing','trip','Breakfast','Food','Option','','https://example.com','older','Maya',0,1,1,'','')");
 await captureMessage(db,'msg','trip','test',undefined,async()=>[{...change,title:'Tea tasting',day:'Day 1',time:'',url:'https://example.com'}]);
 const saved=sql.prepare("SELECT * FROM items WHERE source='msg'").get()!;
 assert.equal(saved.review,0);assert.equal(saved.status,'Option');assert.equal(saved.day,'Day 1');assert.equal(saved.time,'');assert.equal(job().state,'complete');sql.close();
});
test('concurrent manual edit is preserved and AI result becomes review card',async()=>{
 const {sql,db,job}=fixture();sql.exec("INSERT INTO items (id,trip,title,category,status,notes,url,source,name,review,version,created,day,time) VALUES ('plan','trip','Prado','Food','Option','Original','','old','Maya',0,1,1,'','')");
 await captureMessage(db,'msg','trip','test',undefined,async()=>{
  sql.exec("UPDATE items SET title='Manually corrected',version=2 WHERE id='plan'");
  return [{...change,action:'update',itemId:'plan',status:'Booked'}];
 });
 assert.equal(sql.prepare("SELECT title FROM items WHERE id='plan'").get()?.title,'Manually corrected');
 const review=sql.prepare("SELECT * FROM items WHERE id<>'plan'").get()!;assert.equal(review.review,1);assert.equal(review.status,'Option');assert.equal(sql.prepare('SELECT COUNT(*) n FROM revisions').get()?.n,0);assert.equal(job().state,'complete');sql.close();
});
test('deleting a group while AI runs cannot recreate its plans',async()=>{
 const {sql,db}=fixture();await captureMessage(db,'msg','trip','test',undefined,async()=>{
  sql.exec("DELETE FROM capture_jobs;DELETE FROM messages;DELETE FROM trips;");return [change];
 });assert.equal(sql.prepare('SELECT COUNT(*) n FROM items').get()?.n,0);sql.close();
});
test('web provenance persists and survives an unrelated plan update',async()=>{
 const {sql,db}=fixture();const web=JSON.stringify({mode:'search',checkedAt:'2026-10-26T12:00:00Z',sources:[{url:'https://hotel.com',title:'Hotel'}],pageRead:true});
 await captureMessage(db,'msg','trip','test',undefined,async()=>[{...change,category:'Stay',url:'https://hotel.com',web}]);
 const original:any=sql.prepare('SELECT * FROM items').get();assert.equal(original.web,web);
 sql.exec("INSERT INTO messages VALUES ('msg2','trip','user','Maya','@Pickl add breakfast',NULL,2); INSERT INTO capture_jobs (message,trip,state,created,updated) VALUES ('msg2','trip','pending',2,2)");
 await captureMessage(db,'msg2','trip','test',undefined,async()=>[{...change,action:'update',itemId:original.id,category:'Stay',url:'https://hotel.com',notes:'Breakfast included.'}]);
 assert.equal(sql.prepare('SELECT web FROM items WHERE id=?').get(original.id)?.web,web);sql.close();
});
