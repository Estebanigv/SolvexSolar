import {protectedApi} from '@/lib/supabase/api';
import {checkOrigin,privateHeaders,AccessError,databaseError} from '@/lib/supabase/server';
import {buildCrmEntries,leadFollowupSchema,type CrmClient,type CrmQuote,type CrmLead} from '@/lib/crm';
import type {Followup} from '@/lib/followup';
import type {ContactProfile} from '@/lib/crm-work';
import {requireCrmClient,requireCrmMember} from '@/lib/supabase/crm-access';

export async function GET(){return protectedApi(async()=>{
  const {db,user,canViewAll}=await requireCrmMember();
  // Read every page, rather than silently omitting older leads or quote revisions.
  async function read<T>(table:string,columns:string,active=false,projectIds?:string[]):Promise<T[]>{
    const rows:T[]=[];
    for(let offset=0;offset<20000;offset+=500){
      let query=db.from(table).select(columns).order(['crm_leads','crm_contact_profiles'].includes(table)?'client_id':table==='quote_followups'?'project_id':'id').range(offset,offset+499);
      if(active)query=query.is('deleted_at',null);
      if(table==='clients'&&!canViewAll)query=query.eq('owner_id',user.id);
      if(['quotes','crm_leads','crm_contact_profiles'].includes(table)){
        query=query.is('client.deleted_at',null);
        if(!canViewAll)query=query.eq('client.owner_id',user.id);
      }
      if(projectIds)query=query.in('project_id',projectIds);
      const {data,error}=await query;
      if(error)databaseError(error);
      rows.push(...(data??[]) as unknown as T[]);
      if((data?.length??0)<500)return rows;
    }
    throw new AccessError('La cartera supera el tamaño de esta vista. Solicita una vista paginada antes de continuar.',422);
  }
  const [clients,quotes,leads,profiles]=await Promise.all([
    read<CrmClient>('clients','id,details,updated_at,owner_id,owner:profiles!clients_owner_id_fkey(full_name,identification_color)',true),
    read<CrmQuote>('quotes','id,client_id,project_id,created_at,sent_on,is_test,owner_id,payload,client:clients!inner(owner_id,deleted_at)',true),
    read<CrmLead>('crm_leads','client_id,status,next_contact,expected_close,lost_reason,updated_at,client:clients!inner(owner_id,deleted_at)'),
    read<ContactProfile>('crm_contact_profiles','client_id,source,tags,priority,updated_at,client:clients!inner(owner_id,deleted_at)'),
  ]);
  const projectIds=[...new Set(quotes.filter(q=>!q.is_test).map(q=>q.project_id))];
  const followups:(Followup&{project_id:string})[]=[];
  for(let offset=0;offset<projectIds.length;offset+=100){
    followups.push(...await read<Followup&{project_id:string}>('quote_followups','project_id,status,next_contact,expected_close,lost_reason,updated_at',false,projectIds.slice(offset,offset+100)));
  }
  const tracking=new Map(followups.map(f=>[f.project_id,f]));
  const commercialProfiles=new Map(profiles.map(p=>[p.client_id,p]));
  return Response.json({canViewAll,currentUserId:user.id,entries:buildCrmEntries(clients,quotes.map(q=>({...q,followup:tracking.get(q.project_id)})),leads).map(entry=>({...entry,contactProfile:commercialProfiles.get(entry.client.id)??null}))},{headers:privateHeaders});
})}

export async function PUT(request:Request){return protectedApi(async()=>{
  checkOrigin(request);const {db,user,canViewAll}=await requireCrmMember();
  const body=leadFollowupSchema.parse(await request.json());
  const {client_id,expected,...values}=body;
  await requireCrmClient(db,user.id,client_id,canViewAll);
  const result=expected
    ?await db.from('crm_leads').update(values).eq('client_id',client_id).eq('updated_at',expected).select().maybeSingle()
    :await db.from('crm_leads').insert({client_id,...values}).select().single();
  if(result.error?.code==='23505'||(!result.error&&!result.data))throw new AccessError('Este lead cambió en otra sesión. Actualiza el CRM antes de guardar.',409);
  if(result.error)databaseError(result.error);
  return Response.json({lead:result.data},{headers:privateHeaders});
})}
