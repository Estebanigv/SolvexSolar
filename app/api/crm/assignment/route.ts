import {protectedApi} from '@/lib/supabase/api';
import {requireMember,checkOrigin,privateHeaders,AccessError,databaseError} from '@/lib/supabase/server';
import {crmAssignmentSchema} from '@/lib/crm-assignment';

export async function GET(){return protectedApi(async()=>{
  const {db}=await requireMember();
  const {data,error}=await db.rpc('crm_team');
  if(error)databaseError(error);
  return Response.json({members:data??[]},{headers:privateHeaders});
})}

export async function POST(request:Request){return protectedApi(async()=>{
  checkOrigin(request);
  const {db}=await requireMember();
  const values=crmAssignmentSchema.parse(await request.json());
  // The database locks the client and checks ownership, supervisor access and the recipient atomically.
  const {data,error}=await db.rpc('crm_reassign_client',values);
  if(error?.code==='40001')throw new AccessError('El cliente cambió en otra sesión. Actualiza el CRM antes de reasignar.',409);
  if(error?.code==='22023')throw new AccessError('La persona seleccionada ya no tiene acceso activo al equipo.',400);
  if(error)databaseError(error);
  return Response.json(data,{headers:privateHeaders});
})}
