import {test} from 'node:test';
import assert from 'node:assert/strict';
import {conciseNotes} from './plan-notes.ts';
test('hides tone asides without hiding real trip descriptions',()=>{
 assert.equal(conciseNotes('playful/aggressive tone toward Pickl noted.'),'');
 assert.equal(conciseNotes('Budget €25 per person. Playful tone towards Pickl acknowledged.'),'Budget €25 per person.');
 assert.equal(conciseNotes('A playful walking tour. Avoid aggressive tour sellers.'),'A playful walking tour.\nAvoid aggressive tour sellers.');
});
test('omits legacy placeholder sentences, preserving useful details',()=>{
 assert.equal(conciseNotes('Near Hagia Sophia. Time not specified. Booking requirements unknown. Price: TBD.'),'Near Hagia Sophia.');
 assert.equal(conciseNotes('No specific venue provided.\nTime to be confirmed.'),'');
});
test('keeps actual constraints, uncertainty and review explanations',()=>{
 for(const text of ['Reservations required.','No reservation needed.','Book before Friday.','€25 (not yet confirmed).','Dinner 19:30.','Time conflicts with our flight.','Which tea tasting: Hagia Sophia or Galata Tower?','Booking not confirmed until payment.','https://example.com/stay'])assert.equal(conciseNotes(text),text);
});
