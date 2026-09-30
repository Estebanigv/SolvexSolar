import {requireMember,privateHeaders,checkOrigin,AccessError,databaseError} from '@/lib/supabase/server';
import {protectedApi} from '@/lib/supabase/api';
import {missingProfileColor} from '@/lib/profile-compatibility';
import {colorRequestSchema} from '@/lib/member-color';
export async function PATCH(request:Request){return protectedApi(async()=>{
  checkOrigin(request);
  const {db,user}=await requireMember(true);
  const {color}=colorRequestSchema.parse(await request.json());
  const {data,error}=await db.from('profiles').update({identification_color:color}).eq('id',user.id).select('identification_color').maybeSingle();
  if(missingProfileColor(error))throw new AccessError('La personalización de colores aún no está habilitada en este entorno. Puedes seguir usando tu cuenta.',503);
  if(error)databaseError(error);
  if(!data)throw new AccessError('No se pudo encontrar tu perfil.',404);
  return Response.json({color:data.identification_color},{headers:privateHeaders});
})}
