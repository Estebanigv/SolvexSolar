import {Info,UserRound} from 'lucide-react';
import {crmOwnershipNotice,type CrmOwner} from '@/lib/crm-ownership';
export function CrmOwnerBadge({client}:{client:CrmOwner}){
 return <span className="crm-owner-badge"><UserRound size={14} aria-hidden="true"/><span>Responsable: <strong>{client.owner?.full_name||'Sin nombre'}</strong></span></span>;
}
export function CrmOwnershipNotice({client,currentUserId}:{client?:CrmOwner;currentUserId:string}){
 const message=crmOwnershipNotice(client,currentUserId);
 return message?<p className="crm-ownership-notice" role="status"><Info size={18} aria-hidden="true"/><span>{message}</span></p>:null;
}
