import {z} from 'zod';
import {protectedApi} from '@/lib/supabase/api';
import {requireMember,checkOrigin,privateHeaders,AccessError,databaseError} from '@/lib/supabase/server';
import {taskCreateSchema,taskUpdateSchema} from '@/lib/crm-work';
import {requireCrmClient} from '@/lib/supabase/crm-access';
const columns='id,client_id,title,kind,due_on,priority,details,status,created_at,updated_at,updated_by,completed_at,client:clients!inner(details,owner_id,deleted_at,owner:profiles!clients_owner_id_fkey(full_name))';

export async function GET(request:Request){return protectedApi(async()=>{
 const {db,user}=await requireMember(),url=new URL(request.url);
 const clientId=z.string().uuid().nullable().parse(url.searchParams.get('client_id'));
 const status=z.enum(['pending','completed','cancelled','all']).parse(url.searchParams.get('status')??'pending');
 const offset=z.coerce.number().int().min(0).max(100000).parse(url.searchParams.get('offset')??0);
 let query=db.from('crm_tasks').select(columns,{count:'exact'}).is('client.deleted_at',null).eq('client.owner_id',user.id);
 if(clientId)query=query.eq('client_id',clientId);
 if(status!=='all')query=query.eq('status',status);
 const {data,error,count}=await query.order('due_on').order('id').range(offset,offset+99);
 if(error)databaseError(error);
 return Response.json({tasks:data??[],total:count??0},{headers:privateHeaders});
})}
export async function POST(request:Request){return protectedApi(async()=>{
 checkOrigin(request);const {db,user}=await requireMember();const body=taskCreateSchema.parse(await request.json());
 await requireCrmClient(db,user.id,body.client_id);
 const {data,error}=await db.from('crm_tasks').insert(body).select(columns).single();
 if(error?.code==='23505')throw new AccessError('Esta tarea ya fue registrada. Actualiza la agenda para verla.',409);
 if(error)databaseError(error);
 return Response.json({task:data},{status:201,headers:privateHeaders});
})}
export async function PATCH(request:Request){return protectedApi(async()=>{
 checkOrigin(request);const {db,user}=await requireMember();const {id,expected,...values}=taskUpdateSchema.parse(await request.json());
 const task=await db.from('crm_tasks').select('id,client:clients!inner(owner_id,deleted_at)').eq('id',id).eq('client.owner_id',user.id).is('client.deleted_at',null).maybeSingle();
 if(task.error)databaseError(task.error);
 if(!task.data)throw new AccessError('Esta tarea no está disponible en tu cartera.',404);
 const {data,error}=await db.from('crm_tasks').update(values).eq('id',id).eq('updated_at',expected).select(columns).maybeSingle();
 if(error)databaseError(error);
 if(!data)throw new AccessError('La tarea cambió o ya no está disponible. Actualiza la agenda antes de editar.',409);
 return Response.json({task:data},{headers:privateHeaders});
})}
