import {AccessError,databaseError,requireMember} from './server';

type Member=Awaited<ReturnType<typeof requireMember>>;

export async function requireCrmMember(){
  const member=await requireMember();
  const {data,error}=await member.db.rpc('crm_can_view_all');
  if(error)databaseError(error);
  return {...member,canViewAll:data===true};
}

// The database grants global CRM access to active admins and explicit supervisors.
export async function requireCrmClient(db:Member['db'],userId:string,clientId:string,canViewAll=false){
  let query=db.from('clients').select('id').eq('id',clientId).is('deleted_at',null);
  if(!canViewAll)query=query.eq('owner_id',userId);
  const {data,error}=await query.maybeSingle();
  if(error)databaseError(error);
  if(!data)throw new AccessError('Este cliente no está disponible en tu cartera.',404);
}
