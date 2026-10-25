import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reactionQueue,type MascotReaction} from './reaction-queue.ts';
const happy:MascotReaction={key:'happy:one',id:'one',kind:'happy'};
const deadpan:MascotReaction={key:'banter:one',id:'one',kind:'banter',caption:'Noted.'};
test('a result arriving during the happy peek waits and never resumes that peek',()=>{
 let q=reactionQueue([],{type:'enqueue',reactions:[happy]});
 q=reactionQueue(q,{type:'enqueue',reactions:[deadpan]});assert.equal(q[0].kind,'happy');
 q=reactionQueue(q,{type:'finish',key:happy.key});assert.equal(q[0].kind,'banter');
 q=reactionQueue(q,{type:'finish',key:deadpan.key});assert.deepEqual(q,[]);
});
test('simultaneous results enqueue exactly two stages; duplicate completion cannot skip a stage',()=>{
 let q=reactionQueue([],{type:'enqueue',reactions:[happy,deadpan,happy]});assert.equal(q.length,2);
 q=reactionQueue(q,{type:'finish',key:happy.key});q=reactionQueue(q,{type:'finish',key:happy.key});assert.equal(q[0].key,deadpan.key);
 q=reactionQueue(q,{type:'finish',key:deadpan.key});assert.deepEqual(q,[]);
});
test('new events and polling do not replace the active reaction',()=>{
 const next={...happy,key:'happy:two',id:'two'};const q=reactionQueue([happy,deadpan],{type:'enqueue',reactions:[happy,next]});assert.deepEqual(q,[happy,deadpan,next]);
});
test('switching trips clears old reactions; stale callbacks cannot remove new ones',()=>{
 const next={...happy,key:'happy:two',id:'two'};
 let q=reactionQueue([happy],{type:'reset'});q=reactionQueue(q,{type:'enqueue',reactions:[next]});assert.deepEqual(reactionQueue(q,{type:'finish',key:happy.key}),[next]);
});
