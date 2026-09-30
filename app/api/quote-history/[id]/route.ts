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
  const {db}=await requireMember(action.action==='trash'||action.action==='restore');
  const patch=action.action==='send'?{sent_on:action.sentOn,sent_channel:action.channel}:
    action.action==='clear-send'?{sent_on:null,sent_channel:null}:
    {deleted_at:action.action==='trash'?new Date().toISOString():null};
  let query=db.from('quotes').update(patch).eq('id',id);
  query=action.action==='restore'?query.not('deleted_at','is',null):query.is('deleted_at',null);
  const {data,error}=await query.select('id,sent_on,sent_channel,deleted_at').maybeSingle();
  if(error){if(error.code==='22023')throw new AccessError('Revisa la fecha de envío: debe estar entre la creación de la cotización y hoy.',400);databaseError(error);}
  if(!data)throw new AccessError('La cotización ya cambió o no está disponible. Actualiza el historial.',404);
  return Response.json({id:data.id,sentOn:data.sent_on,sentChannel:data.sent_channel,deletedAt:data.deleted_at},{headers:privateHeaders});
})}
