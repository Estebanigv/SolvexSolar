import type {CrmClient} from './crm';
export type CrmOwner=Pick<CrmClient,'owner_id'|'owner'>;
export function crmOwnershipNotice(client:CrmOwner|undefined,currentUserId:string){
 if(!client||!currentUserId||client.owner_id===currentUserId)return null;
 return `Este prospecto pertenece a ${client.owner?.full_name?.trim()||'otro responsable'}. Puedes modificarlo; seguirá asignado a esa persona.`;
}
