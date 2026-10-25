export type TripItem={id:string;title:string;category:string;status:string;notes:string;url:string;source:string|null;name:string;review:number;version:number;day?:string;time?:string};
const weekdays=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
export function dayKey(day:string){
 const clean=day.trim().replace(/\s+/g,' ');
 const iso=clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
 if(iso){const date=new Date(clean+'T12:00:00Z');if(!Number.isNaN(+date)&&date.toISOString().slice(0,10)===clean)return {key:clean,label:`${Number(iso[3])} ${months[Number(iso[2])-1]} ${iso[1]}`,order:+date};}
 const calendar=clean.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)(?:,?\s+(\d{4}))?$/i);
 if(calendar){const month=months.findIndex(m=>m.toLowerCase().startsWith(calendar[2].toLowerCase()));const n=Number(calendar[1]);if(month>=0&&n>=1&&n<=31){
  if(calendar[3])return dayKey(`${calendar[3]}-${String(month+1).padStart(2,'0')}-${String(n).padStart(2,'0')}`);
  return {key:`month:${month}:${n}`,label:`${n} ${months[month]}`,order:2e12+month*32+n};
 }}
 const weekday=weekdays.findIndex(d=>new RegExp('^'+d.slice(0,3)+'(?:'+d.slice(3)+')?$','i').test(clean));
 if(weekday>=0)return {key:weekdays[weekday],label:weekdays[weekday],order:3e12+weekday};
 const numbered=clean.match(/^day\s+(\d+)$/i);if(numbered)return {key:'Day '+Number(numbered[1]),label:'Day '+Number(numbered[1]),order:4e12+Number(numbered[1])};
 return {key:clean.toLowerCase(),label:clean,order:5e12};
}

export function appliesEveryDay(item:TripItem){
 const day=item.day?.trim()||'';
 if(day)return /^(?:every\s*day(?:\s+of\s+(?:the\s+)?trip)?|daily|all\s+(?:trip\s+)?days(?:\s+of\s+(?:the\s+)?trip)?|each\s+day|throughout\s+(?:the\s+)?trip)$/i.test(day);
 // Support older records with an explicit recurrence but no structured day.
 const text=item.title+' '+item.notes;
 if(/\b(?:not|never|isn't|isnt)\s+(?:every\s*day|daily)|\b(?:except|only|until|between)\b|\b(?:first|last)\s+\d+/i.test(text))return false;
 return /\b(?:every\s*day|daily|all\s+(?:trip\s+)?days(?:\s+of\s+(?:the\s+)?trip)?|each\s+day|throughout\s+the\s+trip)\b/i.test(text);
}
/** Explicit recurrence is supported; concrete dates are never guessed from prose. */
export function scheduleFor(item:TripItem){
 return {day:appliesEveryDay(item)?'Every day':item.day?.trim()||'',time:item.time?.trim()||''};
}
function timeOrder(time:string){
 const clock=time.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]m)?$/i);
 if(clock){let hour=Number(clock[1]);if(clock[3])hour=hour%12+(clock[3].toLowerCase()==='pm'?12:0);return hour*60+Number(clock[2]||0);}
 const period=['morning','afternoon','evening','night'].indexOf(time.toLowerCase());return period>=0?period*300+480:2000;
}
export function organizeTrip(items:TripItem[]){
 const stays:TripItem[]=[],everyDay:TripItem[]=[],travel:TripItem[]=[],toSchedule:TripItem[]=[],essentials:TripItem[]=[];
 const ideas=new Map<string,TripItem[]>(),days=new Map<string,{key:string;label:string;order:number;items:{item:TripItem;time:string}[]}>();
 for(const item of items){
  if(item.review||item.status==='Archived')continue;
  if(item.category==='Stay'){stays.push(item);continue;}
  const schedule=scheduleFor(item);
  if(schedule.day==='Every day'){everyDay.push(item);continue;}
  if(schedule.day){const day=dayKey(schedule.day);if(!days.has(day.key))days.set(day.key,{...day,items:[]});days.get(day.key)!.items.push({item,time:schedule.time});continue;}
  if(item.status==='Option'){if(!ideas.has(item.category))ideas.set(item.category,[]);ideas.get(item.category)!.push(item);}
  else if(item.category==='Travel')travel.push(item);
  else if(item.category==='Other')essentials.push(item);
  else toSchedule.push(item);
 }
 stays.sort((a,b)=>Number(b.status!=='Option')-Number(a.status!=='Option'));
 const itinerary=[...days.values()].sort((a,b)=>a.order-b.order||a.label.localeCompare(b.label));
 for(const day of itinerary)day.items.sort((a,b)=>timeOrder(a.time)-timeOrder(b.time)||a.item.title.localeCompare(b.item.title));
 everyDay.sort((a,b)=>timeOrder(a.time||'')-timeOrder(b.time||''));
 return {stays,everyDay,travel,toSchedule,essentials,ideas:[...ideas.entries()],days:itinerary};
}
