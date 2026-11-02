import {z} from 'zod';
import {protectedApi} from '@/lib/supabase/api';
import {requireMember,checkOrigin,privateHeaders,databaseError} from '@/lib/supabase/server';
export async function GET(){return protectedApi(async()=>{
 const {db}=await requireMember();
 const [rows,count]=await Promise.all([
 db.from('crm_notifications').select('id,title,body,kind,client_id,created_at,read_at').order('created_at',{ascending:false}).limit(50),
 db.from('crm_notifications').select('id',{count:'exact',head:true}).is('read_at',null)
 ]);
 if(rows.error)databaseError(rows.error);if(count.error)databaseError(count.error);
 return Response.json({notifications:rows.data,unread:count.count??0,publicKey:process.env.VAPID_PUBLIC_KEY??null},{headers:privateHeaders});
})}
export async function PATCH(request:Request){return protectedApi(async()=>{
 checkOrigin(request);const {db}=await requireMember();const {id}=z.object({id:z.string().uuid().optional()}).parse(await request.json());
 let query=db.from('crm_notifications').update({read_at:new Date().toISOString()}).is('read_at',null);
 if(id)query=query.eq('id',id);const result=await query;if(result.error)databaseError(result.error);
 return Response.json({ok:true},{headers:privateHeaders});
})}
