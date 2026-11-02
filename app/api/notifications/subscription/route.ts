import {z} from 'zod';
import {protectedApi} from '@/lib/supabase/api';
import {requireMember,checkOrigin,privateHeaders,databaseError,AccessError} from '@/lib/supabase/server';
import {pushSubscriptionSchema} from '@/lib/push-validation';
export async function POST(request:Request){return protectedApi(async()=>{
 checkOrigin(request);const {db}=await requireMember();
 if(!process.env.VAPID_PUBLIC_KEY||!process.env.VAPID_PRIVATE_KEY)throw new AccessError('Los avisos al teléfono aún no están configurados.',503);
 const sub=pushSubscriptionSchema.parse(await request.json());
 const {error}=await db.rpc('crm_push_device',{p_endpoint:sub.endpoint,p_p256dh:sub.keys.p256dh,p_auth:sub.keys.auth});
 if(error)databaseError(error);return Response.json({ok:true},{headers:privateHeaders});
})}
export async function DELETE(request:Request){return protectedApi(async()=>{
 checkOrigin(request);const {db}=await requireMember();const {endpoint}=z.object({endpoint:z.string().max(2048)}).parse(await request.json());
 const {error}=await db.rpc('crm_push_device',{p_endpoint:endpoint,p_remove:true});
 if(error)databaseError(error);return Response.json({ok:true},{headers:privateHeaders});
})}
