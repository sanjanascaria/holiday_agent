import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stayWebIntent,publicWebUrl,propertyPageUrl,webSources,parseStayWeb} from './stay-web.ts';
test('research is limited to requested stays and shared accommodation links',()=>{
 assert.equal(stayWebIntent({body:'@Pickl find hotels in Lisbon under €200'}),'search');
 assert.equal(stayWebIntent({body:'@Pickl save this',quote:{body:'https://www.airbnb.com/rooms/123'}}),'link');
 assert.equal(stayWebIntent({body:'@Pickl save this hotel https://example.com/stay'}),'link');
 for(const body of ['@Pickl we booked Hotel Prado','@Pickl find restaurants in Lisbon','@Pickl no need to search hotels, we chose Prado','@Pickl u fatass'])assert.equal(stayWebIntent({body}),null);
});
test('public URL validation rejects credentials, private network targets and non-web URLs',()=>{
 for(const url of ['http://localhost/','http://127.0.0.1/','http://2130706433/','http://169.254.169.254/','http://[::1]/','http://metadata.google.internal/','https://user:pass@hotel.com/','file:///etc/passwd','https://hotel.com:8080/'])assert.equal(publicWebUrl(url),false,url);
 assert.equal(publicWebUrl('https://www.memmoalfama.com/'),true);
});
test('only actual completed tool sources and citations authorize new links',()=>{
 assert.deepEqual(webSources({output:[{type:'web_search_call',status:'completed',action:{type:'search',sources:[{url:'https://hotel.com/rooms',title:'Hotel'},{url:'http://127.0.0.1',title:'bad'}]}},{type:'web_search_call',status:'failed',action:{sources:[{url:'https://invented.com'}]}}]}),[{url:'https://hotel.com/rooms',title:'Hotel'}]);
 assert.equal(parseStayWeb('nonsense'),null);
 assert.equal(parseStayWeb(JSON.stringify({mode:'search',checkedAt:'2026-10-26T12:00:00Z',sources:[{url:'javascript:alert(1)'}]}))?.sources.length,0);
});

test('generic search pages and guides are not property sources',()=>{
 for(const url of ['https://www.booking.com/district/pt/lisbon/alfama.html','https://guides.example.com/Lisbon.pdf','https://www.kayak.com/Lisbon-Hotels_Alfama.N211048.2172.hotel.ksp'])assert.equal(propertyPageUrl(url),false);
 assert.equal(propertyPageUrl('https://www.booking.com/hotel/pt/example.html'),true);
 assert.equal(propertyPageUrl('https://www.memmoalfama.com/'),true);
});
