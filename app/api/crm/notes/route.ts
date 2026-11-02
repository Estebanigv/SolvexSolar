import {z} from 'zod';
import {protectedApi} from '@/lib/supabase/api';
import {requireMember,checkOrigin,privateHeaders,databaseError} from '@/lib/supabase/server';
import {crmNoteSchema} from '@/lib/crm';
import {requireCrmClient} from '@/lib/supabase/crm-access';

export async function GET(request:Request){return protectedApi(async()=>{
  const {db,user}=await requireMember(),url=new URL(request.url);
  const id=z.string().uuid().parse(url.searchParams.get('client_id'));
  const offset=z.coerce.number().int().min(0).max(100000).parse(url.searchParams.get('offset')??0);
  await requireCrmClient(db,user.id,id);
  const {data,error,count}=await db.from('client_notes').select('id,body,created_at,author_id:created_by,author:profiles!client_notes_created_by_fkey(full_name)',{count:'exact'}).eq('client_id',id).order('created_at',{ascending:false}).order('id').range(offset,offset+49);
  if(error)databaseError(error);
  return Response.json({notes:data,total:count??0},{headers:privateHeaders});
})}
export async function POST(request:Request){return protectedApi(async()=>{
  checkOrigin(request);const {db,user}=await requireMember();const body=crmNoteSchema.parse(await request.json());
  await requireCrmClient(db,user.id,body.client_id);
  const {data,error}=await db.from('client_notes').insert(body).select('id,body,created_at,author_id:created_by,author:profiles!client_notes_created_by_fkey(full_name)').single();
  if(error)databaseError(error);
  return Response.json({note:data},{status:201,headers:privateHeaders});
})}
