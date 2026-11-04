import {protectedApi} from '@/lib/supabase/api';
import {requireCrmMember,requireCrmClient} from '@/lib/supabase/crm-access';
import {AccessError,checkOrigin,databaseError,privateHeaders} from '@/lib/supabase/server';
import {planSchema,workFields} from '@/lib/crm-pipeline';

export async function PUT(request:Request){return protectedApi(async()=>{
  checkOrigin(request);
  const {db,user,canViewAll}=await requireCrmMember();
  const {expected,...plan}=planSchema.parse(await request.json());
  await requireCrmClient(db,user.id,plan.client_id,canViewAll);
  const result=expected
    ?await db.from('crm_logistics').update(workFields.parse(plan)).eq('opportunity_id',plan.opportunity_id).eq('client_id',plan.client_id).eq('updated_at',expected).select().maybeSingle()
    :await db.from('crm_logistics').insert(plan).select().single();
  if(result.error?.code==='22023'||result.error?.code==='23514')throw new AccessError('Revisa las fechas y la aprobación de esta oportunidad.',422);
  if(result.error?.code==='23505'||(!result.error&&!result.data))throw new AccessError('La planificación cambió en otra sesión. Actualiza el CRM y vuelve a abrirla.',409);
  if(result.error)databaseError(result.error);
  return Response.json(result.data,{headers:privateHeaders});
})}
