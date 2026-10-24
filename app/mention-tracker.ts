export class MentionTracker {
 private trip:string|null=null;
 private seen=new Set<string>();
 observe(trip:string,messages:{id:string,body:string}[]){
  if(this.trip!==trip){this.trip=trip;this.seen=new Set(messages.map(m=>m.id));return [];}
  const mentions:string[]=[];
  for(const m of messages){if(!this.seen.has(m.id)&&/(?:^|\s)@pickl\b/i.test(m.body))mentions.push(m.id);this.seen.add(m.id);}
  return mentions;
 }
}
