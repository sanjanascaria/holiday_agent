import assert from 'node:assert/strict';
import { test } from 'node:test';
import { interpret, validateChanges, type Instruction, type PlanChange } from './intelligence.ts';
const input:Instruction={body:'@Pickl save Prado restaurant https://example.com/prado',plans:[],trip:{name:'Lisbon',destination:'',dates:''}};
const plan:PlanChange={action:'create',itemId:null,title:'Prado',category:'Food',status:'Option',notes:'Try for dinner',url:'https://example.com/prado',review:false,reason:'',day:'',time:''};
const envelope=(changes:unknown,status='completed')=>Response.json({status,output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({changes})}]}]});
test('ordinary chat never reaches the provider',async()=>{let calls=0;assert.deepEqual(await interpret({...input,body:'email@pickl.com'},'test','gpt-5-mini',async()=>{calls++;return envelope([]);}),[]);assert.equal(calls,0);});
test('structured extraction keeps data server-side and disables response storage',async()=>{
 const got=await interpret(input,'test','gpt-5-mini',async(url,opts)=>{assert.equal(url,'https://api.openai.com/v1/responses');const body=JSON.parse(String(opts?.body));assert.equal(body.store,false);assert.equal(body.text.format.strict,true);assert.equal(body.tools,undefined);assert.deepEqual(JSON.parse(body.input),input);return envelope([plan]);});
 assert.equal(got[0].title,'Prado');
});
test('invented URLs, foreign targets and duplicate modifications are rejected',()=>{
 assert.throws(()=>validateChanges({changes:[{...plan,url:'https://invented.example'}]},input));
 assert.throws(()=>validateChanges({changes:[{...plan,action:'update',itemId:'foreign-trip'}]},input));
 const existing={id:'p1',title:'Prado',category:'Food',status:'Option',notes:'',url:plan.url,source:null,version:1,review:0};
 const update={...plan,action:'update',itemId:'p1'};
 assert.throws(()=>validateChanges({changes:[update,update]},{...input,plans:[existing]}));
 assert.throws(()=>validateChanges({changes:[{...update,review:true}]},{...input,plans:[existing]}));
});
test('unsafe URLs and malformed fields cannot be saved',()=>{
 for(const patch of [{url:'javascript:alert(1)'},{title:''},{title:'x'.repeat(101)},{status:'Paid'},{status:'Archived'},{itemId:'p1'}])assert.throws(()=>validateChanges({changes:[{...plan,...patch}]},input));
});
test('incomplete responses and refusals never produce a plan',async()=>{
 await assert.rejects(()=>interpret(input,'test',undefined,async()=>envelope([plan],'incomplete')),/invalid_output/);
 await assert.rejects(()=>interpret(input,'test',undefined,async()=>Response.json({status:'completed',output:[{type:'message',content:[{type:'refusal',refusal:'No'}]}]})),/invalid_output/);
});
test('provider failures have safe, distinguishable codes',async()=>{
 await assert.rejects(()=>interpret(input,'test',undefined,async()=>Response.json({error:{code:'insufficient_quota'}},{status:429})),/quota/);
 await assert.rejects(()=>interpret(input,'test',undefined,async()=>Response.json({error:{code:'rate_limit_exceeded'}},{status:429})),/rate_limit/);
 await assert.rejects(()=>interpret(input,'test',undefined,async()=>{throw Error('private upstream detail');}),/unavailable/);
});
const stayInput:Instruction={body:'@Pickl find hotels in Lisbon',plans:[],trip:{name:'Trip',destination:'Lisbon',dates:''}};
const stay={...plan,research:{pageAccess:'read',budgetFit:'not_requested'},title:'Test Hotel',category:'Stay',status:'Booked',url:'https://hotel.com/rooms',notes:'Rooftop terrace.'};
function researched(changes:unknown,sources=[{url:stay.url,title:'Hotel'}]){return Response.json({status:'completed',output:[{type:'web_search_call',status:'completed',action:{type:'search',sources}},{type:'message',content:[{type:'output_text',text:JSON.stringify({changes})}]}]});}
test('stay searches use bounded web tools, cited URLs and server-enforced Option status',async()=>{
 const result=await interpret(stayInput,'test',undefined,async(_url,opts)=>{const b=JSON.parse(String(opts?.body));assert.equal(b.tools[0].type,'web_search');assert.equal(b.max_tool_calls,3);assert(b.include.includes('web_search_call.action.sources'));return researched([stay]);});
 assert.equal(result[0].status,'Option');assert.equal(JSON.parse(result[0].web!).sources[0].url,stay.url);
});
test('uncited properties and non-stay web changes are rejected; empty searches fail visibly',async()=>{
 await assert.rejects(()=>interpret(stayInput,'test',undefined,async()=>researched([stay],[])),/invalid_output/);
 await assert.rejects(()=>interpret(stayInput,'test',undefined,async()=>researched([{...stay,category:'Food'}])),/invalid_output/);
 await assert.rejects(()=>interpret(stayInput,'test',undefined,async()=>researched([])),/no_results/);
});
test('blocked links can be saved without claiming to have read their details',async()=>{
 const url='https://www.airbnb.com/rooms/123';
 const result=await interpret({...stayInput,body:'@Pickl save this Airbnb '+url},'test',undefined,async()=>researched([{...stay,title:'Airbnb stay',status:'Option',notes:'',url,research:{pageAccess:'blocked',budgetFit:'not_requested'}}],[]));
 assert.equal(result[0].url,url);assert.equal(JSON.parse(result[0].web!).pageRead,false);
});
test('private links are rejected before any billable request',async()=>{
 let called=false;await assert.rejects(()=>interpret({...stayInput,body:'@Pickl read this hotel http://127.0.0.1/'},'test',undefined,async()=>{called=true;return researched([]);}),/invalid_output/);assert.equal(called,false);
});
test('known over-budget properties and generic collection pages are discarded',async()=>{
 await assert.rejects(()=>interpret(stayInput,'test',undefined,async()=>researched([{...stay,research:{pageAccess:'read',budgetFit:'over'}}])),/no_results/);
 const generic='https://www.booking.com/district/pt/lisbon/alfama.html';
 await assert.rejects(()=>interpret(stayInput,'test',undefined,async()=>researched([{...stay,url:generic}],[{url:generic,title:'Alfama hotels'}])),/no_results/);
});
test('an inaccessible page stays link-only even when its URL is in search sources',async()=>{
 const url='https://www.airbnb.com/rooms/123';
 const result=await interpret({...stayInput,body:'@Pickl save this Airbnb '+url},'test',undefined,async()=>researched([{...stay,title:'Invented villa',notes:'Invented pool',url,research:{pageAccess:'blocked',budgetFit:'not_requested'}}],[{url,title:'404'}]));
 assert.equal(result[0].title,'Airbnb stay');assert.equal(result[0].notes,'');assert.equal(JSON.parse(result[0].web!).pageRead,false);
});
