import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extract } from './extract.ts';
test('ordinary messages are not processed',()=>{assert.equal(extract('We booked dinner'),null);assert.equal(extract('email@pickl.com'),null);});
test('clear saves are options',()=>{const p=extract('@Pickl save Prado restaurant as an option');assert.equal(p?.category,'Food');assert.equal(p?.status,'Option');assert.equal(p?.review,0);});
test('chosen is distinct from booked',()=>{assert.equal(extract('@Pickl we have chosen the Alfama apartment')?.status,'Chosen');assert.equal(extract('@Pickl we booked the Alfama apartment')?.status,'Booked');});
test('uncertainty and negation never imply booked',()=>{for(const text of ['@Pickl we have not booked Prado','@Pickl maybe we booked Prado','@Pickl should we book Prado?']){assert.equal(extract(text)?.status,'Option');assert.equal(extract(text)?.review,1);}});
test('quoted content supplies the subject but not a booking claim',()=>{const p=extract('@Pickl save this','A restaurant called Prado. https://example.com/prado');assert.equal(p?.category,'Food');assert.equal(p?.url,'https://example.com/prado');assert.equal(p?.status,'Option');});
test('unresolved references and destructive commands require review',()=>{assert.equal(extract('@Pickl save this')?.review,1);assert.equal(extract('@Pickl remove the boat trip')?.review,1);assert.equal(extract('@Pickl update dinner to Friday')?.review,1);});
