import {timingSafeEqual} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import webpush from 'web-push';
import {supabaseUrl,supabaseKey} from '@/lib/supabase/config';
import {allowedPushEndpoint} from '@/lib/push-validation';
export const runtime='nodejs';
export const maxDuration=60;
export const dynamic='force-dynamic';
type Delivery={delivery_id:string;lease_id:string;endpoint:string;p256dh:string;auth_key:string;notification_id:string;title:string;body:string};
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET,auth=request.headers.get('authorization')??'';
 const expected=secret?'Bearer '+secret:'';
 if(!secret||Buffer.byteLength(auth)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(auth),Buffer.from(expected)))return Response.json({error:'Unauthorized'},{status:401});
 if(!process.env.VAPID_PUBLIC_KEY||!process.env.VAPID_PRIVATE_KEY)return Response.json({error:'Push unavailable'},{status:503});
 const db=createClient(supabaseUrl,supabaseKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const claim=await db.rpc('crm_push_claim',{p_secret:secret});
 if(claim.error)return Response.json({error:'Queue unavailable'},{status:503});
 const rows=(claim.data??[]) as Delivery[];let sent=0,failed=0,ackFailed=0;
 // Bounded concurrency, timeout and database leases keep retries safe across cron invocations.
 for(let i=0;i<rows.length;i+=10)await Promise.all(rows.slice(i,i+10).map(async row=>{
 let status=400;
 if(allowedPushEndpoint(row.endpoint))try{
 const response=await webpush.sendNotification({endpoint:row.endpoint,keys:{p256dh:row.p256dh,auth:row.auth_key}},JSON.stringify({title:row.title,body:row.body,id:row.notification_id,url:'/crm?notification='+row.notification_id}),{
 vapidDetails:{subject:'mailto:contacto@fogeli.cl',publicKey:process.env.VAPID_PUBLIC_KEY!,privateKey:process.env.VAPID_PRIVATE_KEY!},TTL:3600,timeout:8000,urgency:'normal'});
 status=response.statusCode;
 }catch(e){status=(e as {statusCode?:number}).statusCode??503}
 if(status>=200&&status<300)sent++;else failed++;
 const ack=await db.rpc('crm_push_finish',{p_secret:secret,p_id:row.delivery_id,p_lease:row.lease_id,p_status:status});if(ack.error)ackFailed++;
 }));
 return Response.json({claimed:rows.length,sent,failed,ackFailed},{status:ackFailed?503:200,headers:{'Cache-Control':'no-store'}});
}

