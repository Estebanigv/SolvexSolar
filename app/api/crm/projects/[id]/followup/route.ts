import {z} from 'zod';
import {protectedApi} from '@/lib/supabase/api';
import {requireMember,checkOrigin,privateHeaders,AccessError,databaseError} from '@/lib/supabase/server';
import {followupSchema} from '@/lib/followup';

export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){return protectedApi(async()=>{
  checkOrigin(request);
  const {db,user}=await requireMember();
  const id=z.string().uuid().parse((await params).id);
  const {expected,...values}=followupSchema.parse(await request.json());
  const project=await db.from('quotes').select('id,client:clients!inner(owner_id,deleted_at)').eq('project_id',id).eq('client.owner_id',user.id).is('client.deleted_at',null).is('deleted_at',null).eq('is_test',false).limit(1).maybeSingle();
  if(project.error)databaseError(project.error);
  if(!project.data)throw new AccessError('Este proyecto no está disponible en tu cartera.',404);
  const result=expected
    ?await db.from('quote_followups').update(values).eq('project_id',id).eq('updated_at',expected).select().maybeSingle()
    :await db.from('quote_followups').insert({project_id:id,...values}).select().single();
  if(result.error?.code==='23505'||(!result.error&&!result.data))throw new AccessError('El seguimiento cambió en otra sesión. Actualiza el CRM antes de guardar.',409);
  if(result.error)databaseError(result.error);
  return Response.json({followup:result.data},{headers:privateHeaders});
})}
