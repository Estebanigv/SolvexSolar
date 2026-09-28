import {serverDatabase,checkOrigin,privateHeaders} from '@/lib/supabase/server';
import {protectedApi} from '@/lib/supabase/api';
export async function POST(request:Request){return protectedApi(async()=>{checkOrigin(request);const db=await serverDatabase();const {error}=await db.auth.signOut();if(error)return Response.json({error:'No se pudo cerrar la sesión. Inténtalo nuevamente.'},{status:503,headers:privateHeaders});return Response.json({ok:true},{headers:privateHeaders})})}
