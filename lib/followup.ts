import {z} from 'zod';
import {dateSchema,type HistoryQuote} from './quote-history';
export const commercialStates={draft:'Borrador',sent:'Enviada',visit:'Visita técnica',followup:'En seguimiento',negotiation:'Negociación',accepted:'Aceptada',rejected:'Rechazada'};
export const closingFields={expected_close:dateSchema.nullable().optional(),lost_reason:z.string().trim().max(500).nullable().optional()};
export type ClosingFields={expected_close?:string|null;lost_reason?:string|null};
export const followupSchema=z.object({status:z.enum(['draft','sent','visit','followup','negotiation','accepted','rejected']),next_contact:dateSchema.nullable(),expected:z.string().datetime({offset:true}).nullable(),...closingFields});
export type Followup=ClosingFields&{status:keyof typeof commercialStates;next_contact:string|null;updated_at:string};
export function projectKey(q:HistoryQuote){return q.projectId||q.id}
export function quoteGroups(quotes:HistoryQuote[]){const groups=new Map<string,HistoryQuote[]>();for(const q of quotes){const key=projectKey(q);groups.set(key,[...(groups.get(key)??[]),q])}return [...groups.values()].map(rows=>rows.sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id)))}
export function commercialState(q:HistoryQuote){return q.followup?.status??(q.sentOn?'sent':'draft')}
