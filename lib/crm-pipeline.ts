import {z} from 'zod';
import {chileDate,dateSchema} from './quote-history';
import type {CrmEntry} from './crm';

export const WAIT_DAYS=3;
export const workFields=z.object({
  origin:z.string().trim().max(300),destination:z.string().trim().max(300),
  drive_minutes:z.number().int().min(1).max(10080).nullable(),
  planned_on:dateSchema.nullable(),installed_on:dateSchema.nullable(),
});
export const planSchema=workFields.extend({
  opportunity_id:z.string().uuid(),client_id:z.string().uuid(),kind:z.enum(['lead','project']),
  approval:z.enum(['quote','visit']),approved_on:dateSchema,expected:z.string().datetime({offset:true}).nullable(),
}).refine(p=>p.approved_on<=chileDate()&&(!p.installed_on||p.installed_on>=p.approved_on&&p.installed_on<=chileDate())&&(!p.planned_on||p.planned_on>=p.approved_on),'Revisa el orden de las fechas de aprobación e instalación.')
.refine(p=>!p.drive_minutes||!!p.origin&&!!p.destination,'Completa las dos direcciones para guardar el tiempo de viaje.');
export type PlanInput=z.infer<typeof planSchema>;
export type WorkPlan=Omit<PlanInput,'expected'>&{updated_at:string};
export type SentEmail={quoteId:string;folio:string;sentOn:string;recordedAt:string|null;replyOn:string|null};

export function daysBetween(start:string,end:string){
  return Math.floor((Date.parse(end+'T12:00:00Z')-Date.parse(start+'T12:00:00Z'))/86400000);
}
export function clientRef(number:number|undefined){
  return number?'CLI-'+String(number).padStart(6,'0'):'';
}
export function attentionReason(entry:CrmEntry,today=chileDate()){
  if(entry.stage==='rejected'||entry.stage==='accepted')return null;
  const email=entry.lastEmail;
  if(email&&!email.replyOn){
    const days=daysBetween(email.sentOn,today);
    if(days>=WAIT_DAYS)return days+' días sin respuesta registrada al correo';
  }
  if(entry.nextContact&&entry.nextContact<=today){
    const overdue=daysBetween(entry.nextContact,today);
    return overdue?'Seguimiento vencido hace '+overdue+' días':'Seguimiento para hoy';
  }
  if(entry.kind==='project'&&!entry.lastSentOn&&entry.firstQuotedAt){
    const days=daysBetween(chileDate(entry.firstQuotedAt),today);
    if(days>=WAIT_DAYS)return 'Cotización sin envío registrado hace '+days+' días';
  }
  if(!entry.nextContact&&daysBetween(chileDate(entry.updatedAt),today)>=7)return 'Sin cambios ni próximo contacto en 7 días';
  return null;
}
export const shortDate=(day:string)=>day.split('-').reverse().join('/');
const timestampFormat=new Intl.DateTimeFormat('es-CL',{dateStyle:'short',timeStyle:'short',timeZone:'America/Santiago'});
export function quoteTimestamp(value:string){
  return timestampFormat.format(new Date(value));
}
