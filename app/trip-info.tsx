'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { X, Check, ExternalLink, Pencil, ArrowLeft, CircleHelp, Archive, Plus, BedDouble, CalendarDays, Plane, Sparkles, NotebookPen, Clock } from 'lucide-react';
import { conciseNotes } from './plan-notes';
import { categories, statuses } from './extract';
import { organizeTrip, scheduleFor, dayKey, type TripItem } from './trip-plan';
export type { TripItem } from './trip-plan';

type Controls={busy:boolean;onEdit:(item:TripItem)=>void;onArchive:(item:TripItem)=>void};
function Status({item}:{item:TripItem}){
 return <span className={'plan-status '+(item.review?'plan-review':item.status.toLowerCase())}>{item.review?'Needs review':item.status==='Option'?'Option':item.status}</span>;
}
function Actions({item,busy,onEdit,onArchive}:Controls&{item:TripItem}){
 return <div className="plan-actions">{item.url&&/^https?:\/\//i.test(item.url)&&<a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={'Open link for '+item.title} title="Open link"><ExternalLink size={14}/></a>}<button disabled={busy} onClick={()=>onEdit(item)} aria-label={(item.review?'Review ':'Edit ')+item.title} title={item.review?'Review details':'Edit plan'}><Pencil size={14}/></button>{item.status!=='Archived'&&<button disabled={busy} onClick={()=>onArchive(item)} aria-label={'Archive '+item.title} title="Archive plan"><Archive size={14}/></button>}</div>;
}
function Notes({text}:{text:string}){
 text=conciseNotes(text);
 if(!text)return null;
 if(text.length<=220)return <p className="plan-notes">{text}</p>;
 return <details className="plan-details"><summary>View details</summary><p className="plan-notes">{text}</p></details>;
}
function PlanRow({item,time,showCategory=false,...controls}:Controls&{item:TripItem;time?:string;showCategory?:boolean}){
 return <article className={'plan-row'+(time!==undefined?' itinerary-event':'')}>
  {time!==undefined&&<div className="event-time">{time}</div>}
  <div className="plan-row-content"><div className="plan-row-title"><h4>{item.title}</h4><Status item={item}/></div>{showCategory&&<span className="plan-category">{item.category}</span>}{time===undefined&&(item.day||item.time)&&<span className="plan-schedule-tag"><Clock size={11}/>{[item.day?dayKey(item.day).label:"",item.time].filter(Boolean).join(" · ")}</span>}<Notes text={item.notes}/></div>
  <Actions item={item} {...controls}/>
 </article>;
}
function SectionTitle({icon:Icon,children,aside}:{icon:typeof CalendarDays;children:React.ReactNode;aside?:string}){
 return <div className="plan-section-title"><h3><Icon size={17} aria-hidden="true"/>{children}</h3>{aside&&<span>{aside}</span>}</div>;
}

export default function TripInfo({open,onClose,tripId,tripName,items,focusId,onSave}:{open:boolean;onClose:()=>void;tripId:string;tripName:string;items:TripItem[];focusId:string|null;onSave:(payload:unknown)=>Promise<void>}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [editing,setEditing]=useState<TripItem|null>(null),[filter,setFilter]=useState('Trip plan'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{if(open){setEditing(focusId?items.find(i=>i.id===focusId)||null:null);setFilter('Trip plan');setError('');setNotice('');dialog.current?.showModal();}else dialog.current?.close();},[open]);
 function edit(item:TripItem){const schedule=scheduleFor(item);setEditing({...item,day:schedule.day,time:schedule.time});setError('');setNotice('');}
 function add(){edit({id:'',title:'',category:'Other',status:'Option',notes:'',url:'',source:null,name:'you',review:0,version:0,day:'',time:''});}
 async function save(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!editing||busy)return;const f=new FormData(e.currentTarget);setBusy(true);setError('');
  try{await onSave({action:'save',trip:tripId,item:editing.id,version:editing.version,...Object.fromEntries(f)});setEditing(null);setNotice('Plan saved.');}catch(e:any){setError(e.message);}finally{setBusy(false);}
 }
 async function archive(item:TripItem){
  if(busy)return;setBusy(true);setError('');
  try{await onSave({action:'archive',trip:tripId,item:item.id,version:item.version});setEditing(null);setNotice('Plan archived. Find it under Archived.');}catch(e:any){setError(e.message);}finally{setBusy(false);}
 }
 const active=items.filter(i=>i.status!=='Archived'),reviews=active.filter(i=>i.review);
 const plan=organizeTrip(items),controls={busy,onEdit:edit,onArchive:archive};
 const filtered=filter==='Archived'?items.filter(i=>i.status==='Archived'):reviews;
 return <dialog ref={dialog} className="trip-info-dialog trip-plan-dialog" aria-labelledby="trip-info-title" onCancel={e=>{if(busy)e.preventDefault();else onClose();}} onClose={()=>{if(!busy)onClose();}}>
  <div className="trip-info-heading"><div><h2 id="trip-info-title">Trip info</h2><p>{tripName}</p></div><button type="button" className="info-icon" aria-label="Close trip info" disabled={busy} onClick={onClose}><X size={20}/></button></div>
  {editing?<>
   <button className="info-back" disabled={busy} onClick={()=>{setEditing(null);setError('');}}><ArrowLeft size={14}/> Back to trip plan</button>
   {editing.review===1&&<p className="info-review"><CircleHelp size={15}/> Resolve or archive this item.</p>}
   <form className="info-edit" key={editing.id} onSubmit={save}>
    <label>Title<input autoFocus name="title" required maxLength={100} defaultValue={editing.title}/></label>
    <div className="info-row"><label>Category<select name="category" defaultValue={editing.category}>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label>Status<select name="status" defaultValue={editing.status}>{statuses.map(s=><option key={s}>{s}</option>)}</select></label></div>
    <div className="info-row"><label>Day or date<input name="day" maxLength={60} placeholder="Friday, Day 1 or Every day" defaultValue={editing.day}/></label><label>Time<input name="time" maxLength={40} placeholder="19:00 or Evening" defaultValue={editing.time}/></label></div>
    <label>Link<input name="url" type="url" placeholder="https://…" defaultValue={editing.url}/></label>
    <label>Details<textarea name="notes" rows={5} maxLength={5000} defaultValue={editing.notes}/></label>
    <p className="info-caption">Added by {editing.name}.</p>
    {error&&<p className="error" role="alert">{error}</p>}
    <button className="info-save" disabled={busy}><Check size={15}/>{busy?'Saving…':!editing.id?'Add plan':editing.review?'Save & resolve review':'Save changes'}</button>
    {editing.id&&editing.status!=='Archived'&&<button type="button" className="info-archive" disabled={busy} onClick={()=>archive(editing)}><Archive size={14}/>Archive this item</button>}
   </form>
  </>:<>
   <div className="plan-toolbar"><div className="plan-tabs" aria-label="Filter saved plans">{['Trip plan','Needs review','Archived'].map(f=><button key={f} aria-pressed={filter===f} onClick={()=>setFilter(f)}>{f}{f==='Needs review'&&reviews.length>0&&<span>{reviews.length}</span>}</button>)}</div><button className="plan-add" onClick={add} aria-label="Add a plan"><Plus size={15}/><span>Add plan</span></button></div>
   {notice&&<p className="info-notice" role="status">{notice}</p>}{error&&<p className="error" role="alert">{error}</p>}
   {filter!=='Trip plan'?<div className="plan-filtered">{filtered.length?filtered.map(item=><PlanRow key={item.id} item={item} showCategory {...controls}/>):<div className="info-empty"><h3>{filter==='Archived'?'No archived plans':'Nothing needs review'}</h3></div>}</div>:
    <div className="trip-plan-content">
     {active.length===0&&<div className="info-empty"><CalendarDays size={28}/><h3>No saved plans yet</h3><p>Tag @Pickl in the chat to save a plan.</p></div>}
     {reviews.length>0&&<button className="plan-review-banner" onClick={()=>setFilter('Needs review')}><CircleHelp size={16}/><span>{reviews.length} {reviews.length===1?'detail needs':'details need'} a second look</span><span aria-hidden="true">→</span></button>}
     {(plan.stays.length>0||plan.everyDay.length>0)&&<section className="trip-basics" aria-label="Trip-wide information">
     {plan.stays.length>0&&<section className="stay-callout" aria-label="Where to stay"><SectionTitle icon={BedDouble}>Where to stay</SectionTitle>{plan.stays.map((item,index)=><article className={'stay-place'+(index===0?' primary-stay':'')} key={item.id}><div className="stay-title"><h4>{item.title}</h4><Status item={item}/></div><Notes text={item.notes}/>{(item.day||item.time)&&<div className="stay-arrival"><Clock size={12}/><span>Check-in: {[item.day?dayKey(item.day).label:"",item.time].filter(Boolean).join(' · ')}</span></div>}<div className="stay-footer"><Actions item={item} {...controls}/></div></article>)}</section>}
     {plan.everyDay.length>0&&<section className="daily-callout" aria-label="Every day"><SectionTitle icon={Clock}>Every day</SectionTitle>{plan.everyDay.map(item=><PlanRow key={item.id} item={item} time={item.time||undefined} {...controls}/>)}</section>}
     </section>}
     {plan.days.length>0&&<section className="daily-itinerary" aria-label="Daily itinerary"><SectionTitle icon={CalendarDays} aside={`${plan.days.length} ${plan.days.length===1?'day':'days'}`}>Itinerary</SectionTitle>{plan.days.map(day=><section className="itinerary-day" key={day.key} aria-label={day.label}><h4 className="itinerary-day-label"><span aria-hidden="true"/>{day.label}</h4><div className="day-events">{day.items.map(({item,time})=><PlanRow key={item.id} item={item} time={time} {...controls}/>)}</div></section>)}</section>}
     {plan.travel.length>0&&<section className="travel-overview" aria-label="Travel"><SectionTitle icon={Plane}>Getting there & around</SectionTitle>{plan.travel.map(item=><PlanRow key={item.id} item={item} {...controls}/>)}</section>}
     {plan.toSchedule.length>0&&<section className="plan-section" aria-label="Still to schedule"><SectionTitle icon={Clock}>Still to schedule</SectionTitle>{plan.toSchedule.map(item=><PlanRow key={item.id} item={item} {...controls}/>)}</section>}
     {plan.ideas.length>0&&<section className="plan-section plan-shortlist" aria-label="Ideas to choose from"><SectionTitle icon={Sparkles}>Ideas to choose from</SectionTitle>{plan.ideas.map(([category,group])=><div className="shortlist-group" key={category}><h4 className="shortlist-label">{category==='Food'?'Eat & drink':category==='Things to do'?'Out & about':category==='Travel'?'Travel options':'Other ideas'}</h4>{group.map(item=><PlanRow key={item.id} item={item} {...controls}/>)}</div>)}</section>}
     {plan.essentials.length>0&&<section className="plan-section" aria-label="Good to know"><SectionTitle icon={NotebookPen}>Good to know</SectionTitle>{plan.essentials.map(item=><PlanRow key={item.id} item={item} {...controls}/>)}</section>}
    </div>}
  </>}
 </dialog>;
}
