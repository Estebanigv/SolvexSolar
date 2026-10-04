import {activityFilterSchema} from '@/lib/activity';
import {requireMember,AccessError,databaseError,privateHeaders} from '@/lib/supabase/server';
import {protectedApi} from '@/lib/supabase/api';
export async function GET(request:Request){return protectedApi(async()=>{
  const {db}=await requireMember(true);
  const f=activityFilterSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  // Hide the Dev account in this feed, before counting and paginating; retain the audit trail.
  let query=db.from('activity_log').select('*',{count:'exact'}).not('actor_email','ilike','contacto@solvexsolar.cl');
  if(f.kind)query=query.eq('entity_type',f.kind);
  if(f.action)query=query.eq('action',f.action);
  if(f.actor)query=query.ilike('actor_name','%'+f.actor.replace(/[\\%_]/g,'\\$&')+'%');
  if(f.from)query=query.gte('occurred_on',f.from);
  if(f.to)query=query.lte('occurred_on',f.to);
  const {data,count,error}=await query.order('occurred_at',{ascending:false}).order('id',{ascending:false}).range(f.offset,f.offset+49);
  if(error){if(['42P01','PGRST205'].includes(error.code))throw new AccessError('El historial de actividad está pendiente de activar en la base de datos.',503);databaseError(error);}
  const actorIds=[...new Set((data??[]).map(row=>row.actor_id).filter(Boolean))];
  const {data:people,error:peopleError}=actorIds.length?await db.from('profiles').select('id,identification_color').in('id',actorIds):{data:[],error:null};
  if(peopleError)databaseError(peopleError);
  const colors=new Map((people??[]).map(p=>[p.id,p.identification_color]));
  return Response.json({events:(data??[]).map(row=>({...row,actor_color:colors.get(row.actor_id)??null})),total:count??0},{headers:privateHeaders});
})}
