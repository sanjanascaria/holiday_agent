import { guest as getChatGPTUser } from './guest';
import Pickl from './pickl';
export const dynamic = 'force-dynamic';
export default async function Page(){const user=await getChatGPTUser();return <Pickl user={user?{id:user.userId,name:user.fullName||user.email.split('@')[0]}:null}/>;}
