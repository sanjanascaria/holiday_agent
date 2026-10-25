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
