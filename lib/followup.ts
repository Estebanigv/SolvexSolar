import {z} from 'zod';
import {dateSchema,type HistoryQuote} from './quote-history';
export const commercialStates={draft:'Borrador',sent:'Enviada',followup:'En seguimiento',accepted:'Aceptada',rejected:'Rechazada'};
export const followupSchema=z.object({status:z.enum(['draft','sent','followup','accepted','rejected']),next_contact:dateSchema.nullable(),expected:z.string().datetime({offset:true}).nullable()});
export type Followup={status:keyof typeof commercialStates;next_contact:string|null;updated_at:string};
export function projectKey(q:HistoryQuote){return q.projectId||q.id}
export function quoteGroups(quotes:HistoryQuote[]){const groups=new Map<string,HistoryQuote[]>();for(const q of quotes){const key=projectKey(q);groups.set(key,[...(groups.get(key)??[]),q])}return [...groups.values()].map(rows=>rows.sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id)))}
export function commercialState(q:HistoryQuote){return q.followup?.status??(q.sentOn?'sent':'draft')}
