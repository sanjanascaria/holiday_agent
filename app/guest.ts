import { cookies } from 'next/headers';
import { env } from 'cloudflare:workers';
export const cookieName='pickl_session';
export async function digest(token:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(n=>n.toString(16).padStart(2,'0')).join('');}
export async function guest(){const token=(await cookies()).get(cookieName)?.value;if(!token||!env.DB)return null;const row=await env.DB.prepare('SELECT user,name FROM sessions WHERE hash=? AND expires>?').bind(await digest(token),Date.now()).first<{user:string,name:string}>();return row?{userId:row.user,fullName:row.name,email:''}:null;}
