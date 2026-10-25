export const banterCaptions=['Saved absolutely nothing.','This is not an itinerary.','Noted. Unfortunately.','Anyway. Where are we staying?'];
export class BanterTracker {
 private trip:string|null=null;
 private seen=new Set<string>();
 private last=-Infinity;
 private next=0;
 observe(trip:string,jobs:{message:string;state:string}[],now=Date.now()){
  if(this.trip!==trip){this.trip=trip;this.seen=new Set(jobs.filter(j=>j.state!=='pending'&&j.state!=='processing').map(j=>j.message));this.last=-Infinity;return null;}
  let reaction:{id:string;caption:string}|null=null;
  for(const job of jobs){
   if(job.state==='pending'||job.state==='processing'||this.seen.has(job.message))continue;
   this.seen.add(job.message);
   if(job.state==='skipped'&&!reaction&&now-this.last>=15000){reaction={id:job.message,caption:banterCaptions[this.next++%banterCaptions.length]};this.last=now;}
  }
  return reaction;
 }
}
