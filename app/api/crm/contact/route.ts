import {protectedApi} from '@/lib/supabase/api';
import {requireMember,checkOrigin,privateHeaders,AccessError,databaseError} from '@/lib/supabase/server';
import {contactProfileSchema} from '@/lib/crm-work';
import {requireCrmClient} from '@/lib/supabase/crm-access';

export async function PUT(request:Request){return protectedApi(async()=>{
 checkOrigin(request);const {db,user}=await requireMember();const {client_id,expected,...values}=contactProfileSchema.parse(await request.json());
 await requireCrmClient(db,user.id,client_id);
 const result=expected
  ?await db.from('crm_contact_profiles').update(values).eq('client_id',client_id).eq('updated_at',expected).select().maybeSingle()
  :await db.from('crm_contact_profiles').insert({client_id,...values}).select().single();
 if(result.error?.code==='23505'||(!result.error&&!result.data))throw new AccessError('La ficha comercial cambió en otra sesión. Actualiza el CRM antes de guardar.',409);
 if(result.error)databaseError(result.error);
 return Response.json({profile:result.data},{headers:privateHeaders});
})}
