import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MentionTracker} from './mention-tracker.ts';
test('opening history does not replay mentions',()=>{assert.deepEqual(new MentionTracker().observe('trip',[{id:'1',body:'@Pickl save this'}]),[]);});
test('new mentions animate once, including other participants and batched messages',()=>{const t=new MentionTracker();t.observe('trip',[]);const msgs=[{id:'1',body:'hello'},{id:'2',body:'@PiCkL save this'},{id:'3',body:'hey @pickl add dinner'},{id:'4',body:'email@pickl.com'}];assert.deepEqual(t.observe('trip',msgs),['2','3']);assert.deepEqual(t.observe('trip',msgs),[]);});
test('switching trips resets history without replaying it',()=>{const t=new MentionTracker();t.observe('one',[]);assert.deepEqual(t.observe('two',[{id:'2',body:'@pickl'}]),[]);assert.deepEqual(t.observe('two',[{id:'3',body:'@pickl'}]),['3']);});
