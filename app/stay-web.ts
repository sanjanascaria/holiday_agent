export type StayWeb={mode:'search'|'link';checkedAt:string;sources:{url:string;title:string}[];pageRead:boolean;budgetFit?:'within'|'unknown'|'not_requested'};

/** Only public web URLs: never hand local/private addresses or credentials to research. */
export function publicWebUrl(raw:string):boolean{
 try{
  const u=new URL(raw),h=u.hostname.toLowerCase();
  if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.port&&!['80','443'].includes(u.port))return false;
  if(!h.includes('.')||h.includes(':')||h.startsWith('[')||/\.(?:localhost|local|internal|test|invalid)$/.test(h))return false;
  if(/^\d+\.\d+\.\d+\.\d+$/.test(h))return false;
  return h!=='metadata.google.internal';
 }catch{return false;}
}
export function propertyPageUrl(raw:string):boolean{
 if(!publicWebUrl(raw))return false;
 const u=new URL(raw),host=u.hostname.replace(/^www\./,'');
 if(host==='booking.com'&&!/^\/hotel\//i.test(u.pathname))return false;
 if(/(?:^|\.)kayak\./.test(host)&&(/\.N\d+|_/.test(u.pathname)||!/\.\d+\.(?:ksp|hotel)/.test(u.pathname)))return false;
 if(host==='airbnb.com'&&!/^\/rooms\/\d+/.test(u.pathname))return false;
 if(/tripadvisor\./.test(host)&&!/^\/Hotel_Review-/i.test(u.pathname))return false;
 return !/\.(?:pdf|docx?|xlsx?)$/i.test(u.pathname)&&!/(?:^|\/)(?:district|city|search|searchresults|guides?|articles?|blog|destinations?|collections?|s)(?:\/|\.|$)/i.test(u.pathname);
}
export function messageUrls(input:{body:string;quote?:{body:string}}){
 return [...new Set(([input.body,input.quote?.body||''].join('\n').match(/https?:\/\/[^\s<>"']+/gi)||[]).map(u=>u.replace(/[),.!?]+$/,'')))];
}
export function stayWebIntent(input:{body:string;quote?:{body:string}}):'search'|'link'|null{
 const body=input.body.replace(/https?:\/\/\S+/gi,''),context=body+' '+(input.quote?.body||'');
 if(/\b(?:don't|do not|never|no need to)\s+(?:search|browse|fetch|look|read|open)/i.test(body))return null;
 const stay=/\b(?:hotels?|airbnbs?|accommodations?|hostels?|apartments?|resorts?|villas?|lodging|stays?)\b/i;
 const search=/\b(?:find|search|look\s+(?:for|up)|recommend|suggest|shortlist|options\s+for)\b/i;
 const urls=messageUrls(input);
 if(urls.length&&/\b(?:save|add|read|open|fetch|check|compare|details|this)\b/i.test(body)&&
  (stay.test(context)||urls.some(u=>/(?:airbnb\.[^/]+|booking\.com|hotels\.com|vrbo\.com|expedia\.[^/]+|\/hotel[s]?\/|\/rooms\/)/i.test(u))))return 'link';
 if(stay.test(body)&&search.test(body))return 'search';
 return null;
}
export function webSources(data:any):{url:string;title:string}[]{
 const sources=new Map<string,string>();
 const add=(url:unknown,title:unknown)=>{if(typeof url==='string'&&url.length<=2000&&publicWebUrl(url))sources.set(url,typeof title==='string'?title.slice(0,160):new URL(url).hostname);};
 for(const o of data.output||[]){
  if(o.type==='web_search_call'&&o.status==='completed'){
   for(const s of o.action?.sources||[])add(s.url,s.title);
   if(o.action?.type==='open_page')add(o.action.url,o.action.url);
  }
  if(o.type==='message')for(const c of o.content||[])for(const a of c.annotations||[])if(a.type==='url_citation')add(a.url,a.title);
 }
 return [...sources].map(([url,title])=>({url,title}));
}
export function parseStayWeb(raw?:string):StayWeb|null{
 try{const w=JSON.parse(raw||'');if(!['search','link'].includes(w.mode)||typeof w.checkedAt!=='string'||!Number.isFinite(Date.parse(w.checkedAt))||!Array.isArray(w.sources))return null;
  return {...w,sources:w.sources.filter((s:any)=>typeof s.url==='string'&&publicWebUrl(s.url)).slice(0,4)};
 }catch{return null;}
}
