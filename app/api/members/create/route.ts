import {requireMember,checkOrigin,privateHeaders,AccessError} from '@/lib/supabase/server';
import {protectedApi} from '@/lib/supabase/api';
import {memberCreateSchema} from '@/lib/member-create';

export async function POST(request:Request){return protectedApi(async()=>{
 checkOrigin(request);
 const {db}=await requireMember(true);
 const input=memberCreateSchema.parse(await request.json());
 const {data,error}=await db.functions.invoke('member-create',{body:input});
 if(error){
  // The function returns only controlled public messages, never provider errors.
  if(error.context instanceof Response){
   const body=await error.context.json().catch(()=>null);
   if(body?.code&&messages[body.code])throw new AccessError(messages[body.code],error.context.status);
  }
  throw new AccessError('No se pudo crear el usuario. Inténtalo nuevamente.',503);
 }
 if(!data?.id)throw new AccessError('No se pudo confirmar la creación del usuario.',503);
 return Response.json({id:data.id},{status:201,headers:privateHeaders});
});}

const messages:Record<string,string>={
 unauthorized:'Inicia sesión nuevamente.',forbidden:'Solo los administradores activos pueden agregar usuarios.',
 invalid:'Revisa nombre, correo y contraseña. Usa al menos 12 caracteres.',
 duplicate:'Ya existe una cuenta con ese correo. Búscala en Usuarios; no es necesario volver a crearla.',
 rate_limit:'Se crearon varias cuentas recientemente. Espera un minuto e inténtalo de nuevo.',
 weak_password:'Elige una contraseña más segura de al menos 12 caracteres.',
 pending:'La cuenta se creó, pero su autorización quedó pendiente. Actualiza Usuarios y selecciona Autorizar acceso.',
 unavailable:'No se pudo crear el usuario. Inténtalo nuevamente.',
};
