import {z} from 'zod';
import {protectedApi} from '@/lib/supabase/api';
import {requireMember,privateHeaders,databaseError} from '@/lib/supabase/server';
export async function GET(request:Request){return protectedApi(async()=>{
 const {db}=await requireMember(true);const url=new URL(request.url),user=z.string().uuid().optional().parse(url.searchParams.get('user')||undefined),offset=z.coerce.number().int().min(0).max(100000).parse(url.searchParams.get('offset')??0);
 let query=db.from('member_access_events').select('id,user_id,occurred_at,source',{count:'exact'});if(user)query=query.eq('user_id',user);
 const result=await query.order('occurred_at',{ascending:false}).order('id').range(offset,offset+49);if(result.error)databaseError(result.error);return Response.json({events:result.data,total:result.count},{headers:privateHeaders});
})}
