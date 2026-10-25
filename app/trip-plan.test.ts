import assert from 'node:assert/strict';
import { test } from 'node:test';
import { organizeTrip, dayKey, scheduleFor, appliesEveryDay, type TripItem } from './trip-plan.ts';
const item=(id:string,patch:Partial<TripItem>={}):TripItem=>({id,title:id,category:'Things to do',status:'Chosen',notes:'',url:'',source:null,name:'Maya',review:0,version:1,day:'',time:'',...patch});
test('one shared day groups meals, transport and activities in time order',()=>{
 const plan=organizeTrip([item('Dinner',{category:'Food',day:'Friday',time:'7pm'}),item('Museum',{day:'Fri',time:'14:00'}),item('Train',{category:'Travel',day:'Friday',time:'09:00'})]);
 assert.equal(plan.days.length,1);assert.deepEqual(plan.days[0].items.map(p=>p.item.id),['Train','Museum','Dinner']);
});
test('trip-wide routines appear once near the stay rather than as an itinerary day or idea',()=>{
 const plan=organizeTrip([item('Poop timing',{category:'Other',status:'Option',day:'Every day',time:'09:00'}),item('Museum',{day:'Day 1'}),item('Stay',{category:'Stay'})]);
 assert.equal(plan.everyDay.length,1);assert.equal(plan.everyDay[0].time,'09:00');assert.equal(plan.days.length,1);assert.equal(plan.days[0].label,'Day 1');assert.equal(plan.ideas.length,0);
});
test('explicit all-days labels and legacy daily notes are recognized without inferring one-off routines',()=>{
 for(const day of ['Daily','All days','Each day','Every day of the trip'])assert(appliesEveryDay(item('Routine',{day})));
 assert(appliesEveryDay(item('Poop timing',{notes:'Every day at 9am.'})));
 for(const notes of ['Bathroom break at 9am','Not every day','Daily only on the first 2 days','Every day except Friday'])assert(!appliesEveryDay(item('Routine',{notes})));
 assert(!appliesEveryDay(item('Routine',{day:'Day 1',notes:'Usually a daily routine.'})));
});
test('stays are prominent and not repeated as itinerary events',()=>{
 const plan=organizeTrip([item('Stay option',{category:'Stay',status:'Option'}),item('Booked stay',{category:'Stay',status:'Booked',day:'2026-06-12'}),item('Walk',{status:'Option',day:'2026-06-12'})]);
 assert.equal(plan.stays[0].id,'Booked stay');assert.deepEqual(plan.days[0].items.map(p=>p.item.id),['Walk']);
});
test('equivalent explicit dates group together, unknown years stay unknown',()=>{
 assert.equal(dayKey('12 June 2026').key,dayKey('2026-06-12').key);
 assert.equal(dayKey('12 Jun').key,dayKey('12 June').key);
 assert.equal(dayKey('12 June').label,'12 June');
 const plan=organizeTrip([item('Later',{day:'2026-06-13'}),item('Earlier',{day:'2026-06-12'})]);assert.equal(plan.days[0].label,'12 June 2026');
});
test('unassigned records remain visible without guessing a day from prose',()=>{
 const unknown=item('Dinner',{category:'Food',notes:'Friday or Saturday; not decided'});
 assert.equal(scheduleFor(unknown).day,'');assert.equal(organizeTrip([unknown]).toSchedule.length,1);
});
test('each active resolved record appears once; reviews and archives stay separate',()=>{
 const input=[item('Stay',{category:'Stay'}),item('Flight',{category:'Travel'}),item('Dinner',{category:'Food'}),item('Idea',{status:'Option'}),item('Packing',{category:'Other'}),item('Dated',{day:'Day 1'}),item('Review',{review:1}),item('Archived',{status:'Archived'})];
 const plan=organizeTrip(input);const ids=[...plan.stays,...plan.travel,...plan.toSchedule,...plan.essentials,...plan.ideas.flatMap(([,items])=>items),...plan.days.flatMap(d=>d.items.map(p=>p.item))].map(i=>i.id);
 assert.equal(ids.length,6);assert.equal(new Set(ids).size,6);assert(!ids.includes('Review'));assert(!ids.includes('Archived'));
});
