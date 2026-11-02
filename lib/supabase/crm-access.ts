import {AccessError,databaseError,requireMember} from './server';

type Member=Awaited<ReturnType<typeof requireMember>>;

// CRM ownership is personal even for admins of the shared quoting workspace.
export async function requireCrmClient(db:Member['db'],userId:string,clientId:string){
  const {data,error}=await db.from('clients').select('id').eq('id',clientId).eq('owner_id',userId).is('deleted_at',null).maybeSingle();
  if(error)databaseError(error);
  if(!data)throw new AccessError('Este cliente no está disponible en tu cartera.',404);
}
