import {z} from 'zod';
import type {QuoteInput, SavedQuote} from './quote';
import {dateSchema, chileDate} from './quote-history';
import {closingFields,type Followup,type ClosingFields} from './followup';
import type {ContactProfile} from './crm-work';

export const crmStages = {
  new: 'Nuevo lead', no_answer: 'No contesta', contacted: 'Contactado', qualified: 'Calificado',
  draft: 'En cotización', sent: 'Propuesta enviada', visit: 'Visita técnica', followup: 'En seguimiento', negotiation: 'Negociación',
  accepted: 'Ganado', rejected: 'Perdido',
} as const;
export type CrmStage = keyof typeof crmStages;
export const leadStages = ['new', 'no_answer', 'contacted', 'qualified', 'visit', 'rejected'] as const;
export const projectStages = ['draft', 'sent', 'visit', 'followup', 'negotiation', 'accepted', 'rejected'] as const;
export const leadFollowupSchema = z.object({
  client_id: z.string().uuid(), status: z.enum(leadStages),
  next_contact: dateSchema.nullable(), expected: z.string().datetime({offset:true}).nullable(),...closingFields,
});
export const crmNoteSchema = z.object({client_id:z.string().uuid(),body:z.string().trim().min(1).max(4000)});
export type CrmClient = {id:string;details:QuoteInput['customer'];updated_at:string;deleted_at?:string|null;owner_id:string;owner?:{full_name:string;identification_color?:string|null}|null};
export type CrmLead = ClosingFields&{client_id:string;status:typeof leadStages[number];next_contact:string|null;updated_at:string};
export type CrmQuote = {id:string;project_id:string;client_id:string;created_at:string;sent_on:string|null;is_test?:boolean;deleted_at?:string|null;owner_id:string;payload:Pick<SavedQuote,'folio'|'calculation'>;followup?:Followup|null};
export type CrmEntry = {
  id:string;kind:'lead'|'project';client:CrmClient;stage:CrmStage;
  nextContact:string|null;expected:string|null;amount:number|null;
  quoteId:string|null;folio:string|null;revisions:number;updatedAt:string;
  contactProfile?:ContactProfile|null;
  expectedClose?:string|null;lostReason?:string|null;
};
export type CrmNote = {id:string;body:string;created_at:string;author_id:string;author?:{full_name:string}|null};

export type CrmTarget = {projectId:string};
export function quoteCrmTarget(quote:Pick<SavedQuote,'id'|'projectId'|'isTest'|'input'>):CrmTarget|null{
  if(quote.id==='draft'||(quote.isTest??quote.input.isTest))return null;
  return {projectId:quote.projectId||quote.id};
}
export function findCrmTarget(entries:CrmEntry[],target:CrmTarget){
  return entries.find(entry=>entry.kind==='project'&&entry.id===target.projectId)??null;
}

// Projects, not quote revisions, are sales opportunities. Unquoted clients remain leads.
export function buildCrmEntries(clients:CrmClient[],quotes:CrmQuote[],leads:CrmLead[]):CrmEntry[]{
  const customers=new Map(clients.filter(c=>!c.deleted_at).map(c=>[c.id,c]));
  const projects=new Map<string,CrmQuote[]>();
  for(const q of quotes){
    if(q.deleted_at||q.is_test||!customers.has(q.client_id))continue;
    projects.set(q.project_id,[...(projects.get(q.project_id)??[]),q]);
  }
  const quoted=new Set<string>();
  const entries:CrmEntry[]=[];
  for(const [id,versions] of projects){
    versions.sort((a,b)=>b.created_at.localeCompare(a.created_at)||b.id.localeCompare(a.id));
    const latest=versions[0],tracking=latest.followup;
    quoted.add(latest.client_id);
    entries.push({id,kind:'project',client:customers.get(latest.client_id)!,
      stage:tracking?.status??(versions.some(q=>q.sent_on)?'sent':'draft'),
      nextContact:tracking?.next_contact??null,expected:tracking?.updated_at??null,
      expectedClose:tracking?.expected_close??null,lostReason:tracking?.lost_reason??null,
      amount:latest.payload.calculation.total,quoteId:latest.id,folio:latest.payload.folio,
      revisions:versions.length,updatedAt:tracking?.updated_at??latest.created_at});
  }
  const tracking=new Map(leads.map(l=>[l.client_id,l]));
  for(const client of customers.values())if(!quoted.has(client.id)){
    const lead=tracking.get(client.id);
    entries.push({id:client.id,kind:'lead',client,stage:lead?.status??'new',
      nextContact:lead?.next_contact??null,expected:lead?.updated_at??null,
      expectedClose:lead?.expected_close??null,lostReason:lead?.lost_reason??null,
      amount:null,quoteId:null,folio:null,revisions:0,updatedAt:lead?.updated_at??client.updated_at});
  }
  return entries.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)||a.id.localeCompare(b.id));
}
export const closedCrmEntry=(entry:CrmEntry)=>entry.stage==='accepted'||entry.stage==='rejected';
export const contactDue=(entry:CrmEntry,today=chileDate())=>!closedCrmEntry(entry)&&!!entry.nextContact&&entry.nextContact<=today;
export function filterCrmEntries(entries:CrmEntry[],search:string,owner:string,due:boolean,today=chileDate()){
  const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
  const query=normalize(search.trim());
  return entries.filter(e=>(!owner||e.client.owner_id===owner)&&(!due||contactDue(e,today))&&normalize([e.client.details.name,e.client.details.email,e.client.details.phone,e.client.details.commune,e.folio,...e.contactProfile?.tags??[]].join(' ')).includes(query));
}
