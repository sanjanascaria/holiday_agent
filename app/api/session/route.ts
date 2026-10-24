import { env } from 'cloudflare:workers';
import { guest,digest,cookieName } from '../../guest';
export const dynamic='force-dynamic';
export async function POST(req:Request){
 const origin=req.headers.get('origin');if(!origin||origin!==new URL(req.url).origin)return Response.json({error:'Invalid origin.'},{status:403});
 try{const existing=await guest();if(existing)return Response.json({ok:true});const b:any=await req.json();const name=typeof b.name==='string'?b.name.trim().slice(0,50):'';if(!name)return Response.json({error:'Enter your name.'},{status:400});
 const token=crypto.randomUUID()+crypto.randomUUID(),user='guest_'+crypto.randomUUID();await env.DB!.prepare('INSERT INTO sessions (hash,user,name,expires) VALUES (?,?,?,?)').bind(await digest(token),user,name,Date.now()+180*86400000).run();
 return Response.json({ok:true},{headers:{'Set-Cookie':`${cookieName}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=15552000${new URL(req.url).protocol==='https:'?'; Secure':''}`,'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Could not join. Please retry.'},{status:503});}
}
