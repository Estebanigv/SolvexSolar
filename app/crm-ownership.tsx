import {Info} from 'lucide-react';
import {memberColorStyle} from '@/lib/member-color';
import {crmOwnershipNotice,type CrmOwner} from '@/lib/crm-ownership';
export function CrmOwnerBadge({client}:{client:CrmOwner}){
 const name=client.owner?.full_name?.trim()||'Sin nombre';
 return <span className="crm-owner-badge" style={memberColorStyle(client.owner?.identification_color,client.owner_id)} title={`Responsable: ${name}`}><span className="crm-owner-dot" aria-hidden="true"/><strong>{name}</strong></span>;
}
export function CrmOwnershipNotice({client,currentUserId}:{client?:CrmOwner;currentUserId:string}){
 const message=crmOwnershipNotice(client,currentUserId);
 return message?<p className="crm-ownership-notice" role="status"><Info size={18} aria-hidden="true"/><span>{message}</span></p>:null;
}
