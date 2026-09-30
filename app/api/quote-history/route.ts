import {resolveResponsibleColor} from '@/lib/member-color';
import type {SavedQuote} from '@/lib/quote';
import {z} from 'zod';
import {usesSupabase} from '@/lib/supabase/config';
import {requireMember,AccessError,databaseError,privateHeaders} from '@/lib/supabase/server';
import {protectedApi} from '@/lib/supabase/api';
import {shiftMonth} from '@/lib/quote-history';

export async function GET(request:Request){return protectedApi(async()=>{
  if(!usesSupabase)throw new AccessError('Conecta el espacio privado para consultar el historial.',503);
  const url=new URL(request.url);
  const view=z.enum(['list','calendar','trash']).parse(url.searchParams.get('view')??'list');
  const offset=z.coerce.number().int().min(0).max(100000).parse(url.searchParams.get('offset')??0);
  const {db}=await requireMember(view==='trash');
  let query=db.from('quotes').select('payload,owner_id,created_at,sent_on,sent_channel,deleted_at,owner:profiles!quotes_owner_id_fkey(id,full_name,email,identification_color)',{count:'exact'});
  query=view==='trash'?query.not('deleted_at','is',null):query.is('deleted_at',null);
  if(view==='calendar'){
    const month=z.string().regex(/^(20\d{2})-(0[1-9]|1[0-2])$/).parse(url.searchParams.get('month'));
    query=query.gte('sent_on',month+'-01').lt('sent_on',shiftMonth(month,1)+'-01');
  }
  const {data,error,count}=await query.order(view==='calendar'?'sent_on':'created_at',{ascending:false}).order('id').range(offset,offset+99);
  if(error){
    if(['42703','PGRST204'].includes(error.code))throw new AccessError('El historial actualizado requiere activar la migración de envíos y papelera.',503);
    databaseError(error);
  }
  // Read through RLS; matching by email avoids assigning the author's color to a different adviser.
  const {data:members,error:memberError}=await db.from('profiles').select('id,email,identification_color');
  if(memberError)databaseError(memberError);
  return Response.json({quotes:(data??[]).map(row=>{
    const owner=Array.isArray(row.owner)?row.owner[0]:row.owner;
    const snapshot=row.payload as SavedQuote;
    const adviser=snapshot.settings.advisers?.find(a=>a.id===snapshot.input.adviserId);
    const responsibleColor=resolveResponsibleColor(adviser?.email,{id:row.owner_id,identification_color:owner?.identification_color},members??[]);
    return {...row.payload,responsibleColor,date:row.created_at,owner:{id:row.owner_id,name:owner?.full_name||owner?.email||'Usuario'},sentOn:row.sent_on,sentChannel:row.sent_channel,deletedAt:row.deleted_at};
  }),total:count??0},{headers:privateHeaders});
})}
