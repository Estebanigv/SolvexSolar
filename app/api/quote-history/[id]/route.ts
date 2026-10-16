import {z} from 'zod';
import {usesSupabase} from '@/lib/supabase/config';
import {requireMember,checkOrigin,AccessError,databaseError,privateHeaders} from '@/lib/supabase/server';
import {protectedApi} from '@/lib/supabase/api';
import {historyActionSchema} from '@/lib/quote-history';

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){return protectedApi(async()=>{
  checkOrigin(request);
  if(!usesSupabase)throw new AccessError('Conecta el espacio privado para actualizar cotizaciones.',503);
  const {id}=await params;z.string().uuid().parse(id);
  const action=historyActionSchema.parse(await request.json());
  const {db}=await requireMember(['trash','restore','purge'].includes(action.action));
  if(action.action==='purge'){
    const {data,error}=await db.functions.invoke('quote-trash',{body:{id,folio:action.confirmFolio}});
    if(error){
      const body=error.context instanceof Response?await error.context.json().catch(()=>null):null;
      if(body?.code==='changed')throw new AccessError('El folio no coincide o la cotización ya no está en la papelera. Actualiza y revisa.',409);
      throw new AccessError('No se pudo completar la eliminación. Se conservará como eliminación en curso y podrás reintentar; la limpieza automática también lo intentará.',503);
    }
    if(!data?.ok||data.deleted!==1)throw new AccessError('No se pudo confirmar la eliminación definitiva. Actualiza el historial.',503);
    return Response.json({ok:true,id},{headers:privateHeaders});
  }
  const patch=action.action==='test-label'?{is_test:action.isTest}:action.action==='send'?{sent_on:action.sentOn,sent_channel:action.channel}:
    action.action==='clear-send'?{sent_on:null,sent_channel:null}:
    {deleted_at:action.action==='trash'?new Date().toISOString():null};
  let query=db.from('quotes').update(patch).eq('id',id);
  query=action.action==='restore'?query.not('deleted_at','is',null):query.is('deleted_at',null);
  const {data,error}=await query.select('id,is_test,sent_on,sent_channel,deleted_at').maybeSingle();
  if(error){if(error.code==='55000')throw new AccessError('Esta cotización ya está en eliminación definitiva y no se puede restaurar.',409);if(error.code==='22023')throw new AccessError('Revisa la fecha de envío: debe estar entre la creación de la cotización y hoy.',400);databaseError(error);}
  if(!data)throw new AccessError('La cotización ya cambió o no está disponible. Actualiza el historial.',404);
  return Response.json({id:data.id,isTest:data.is_test,sentOn:data.sent_on,sentChannel:data.sent_channel,deletedAt:data.deleted_at},{headers:privateHeaders});
})}
