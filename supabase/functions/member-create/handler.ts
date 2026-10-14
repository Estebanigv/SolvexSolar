import {createClient} from '@supabase/supabase-js';
import {z} from 'zod';

const inputSchema=z.object({
 name:z.string().trim().min(2).max(150),
 email:z.string().trim().toLowerCase().email().max(254),
 password:z.string().min(12).max(72).refine(v=>new TextEncoder().encode(v).length<=72),
}).strict();
type Options={url:string;anonKey:string;serviceKey:string;client?:typeof createClient;now?:()=>number};
export function createMemberHandler({url,anonKey,serviceKey,client=createClient,now=Date.now}:Options){
 const reply=(code:string,status:number)=>Response.json({code},{status,headers:{'Cache-Control':'no-store'}});
 return async(request:Request)=>{
  try{
   if(request.method!=='POST')return reply('method',405);
   const authorization=request.headers.get('Authorization');
   if(!authorization?.startsWith('Bearer '))return reply('unauthorized',401);
   const db=client(url,anonKey,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
   // Validate with Auth, then read the current database role on EVERY request.
   const identity=await db.auth.getUser(authorization.slice(7));
   if(identity.error||!identity.data.user)return reply('unauthorized',401);
   const profile=await db.from('profiles').select('role').eq('id',identity.data.user.id).single();
   if(profile.error)return reply('unavailable',503);
   if(profile.data?.role!=='admin')return reply('forbidden',403);
   const text=await request.text();
   if(text.length>4096)return reply('invalid',400);
   let body:unknown;try{body=JSON.parse(text);}catch{return reply('invalid',400);}
   const parsed=inputSchema.safeParse(body);
   if(!parsed.success)return reply('invalid',400);
   const {name,email,password}=parsed.data;
   const escapedEmail=email.replace(/[\\%_]/g,'\\$&');
   const existing=await db.from('profiles').select('id').ilike('email',escapedEmail).limit(1);
   if(existing.error)return reply('unavailable',503);
   if(existing.data?.length)return reply('duplicate',409);
   const recent=await db.from('profiles').select('id',{count:'exact',head:true}).gte('created_at',new Date(now()-60000).toISOString());
   if(recent.error)return reply('unavailable',503);
   if((recent.count??0)>=5)return reply('rate_limit',429);
   // Service key remains exclusively inside the Supabase function runtime.
   const admin=client(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
   const created=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:name}});
   if(created.error){
    const code=created.error.code;
    return code==='email_exists'||code==='user_already_exists'?reply('duplicate',409):code==='weak_password'?reply('weak_password',400):reply('unavailable',503);
   }
   const id=created.data.user?.id;
   if(!id)return reply('unavailable',503);
   // The Auth trigger creates a pending profile. Promote through the caller's
   // RLS-protected connection so the existing audit records the administrator.
   const granted=await db.from('profiles').update({role:'admin'}).eq('id',id).select('id').maybeSingle();
   if(granted.error||!granted.data)return reply('pending',409);
   return Response.json({id},{status:201,headers:{'Cache-Control':'no-store'}});
  }catch{return reply('unavailable',503);}
 };
}
