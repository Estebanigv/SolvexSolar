import {attentionReason} from './crm-pipeline';
import {closedCrmEntry,contactDue,type CrmEntry} from './crm';
import {chileDate} from './quote-history';

export const smartViews={all:'Toda la cartera',attention:'Requiere atención',due:'Hoy y vencidos',overdue:'Vencidos',unplanned:'Sin próximo contacto',closing:'Cierre este mes',stale:'Sin cambios en 7 días'} as const;
export type SmartView=keyof typeof smartViews;
export const crmSorts={attention:'Prioridad de atención',recent:'Últimos cambios',value:'Mayor monto',closing:'Fecha de cierre'} as const;
export type CrmSort=keyof typeof crmSorts;
const dayNumber=(day:string)=>Date.parse(day.slice(0,10)+'T12:00:00Z')/86400000;
export function daysWithoutChanges(entry:CrmEntry,today:string){
 return Math.max(0,Math.floor(dayNumber(today)-dayNumber(chileDate(entry.updatedAt))));
}
export function matchesSmartView(entry:CrmEntry,view:SmartView,today:string){
 if(view==='all')return true;
 if(closedCrmEntry(entry))return false;
 switch(view){
  case 'attention':return !!attentionReason(entry,today);
  case 'due':return contactDue(entry,today);
  case 'overdue':return !!entry.nextContact&&entry.nextContact<today;
  case 'unplanned':return !entry.nextContact;
  case 'closing':return !!entry.expectedClose&&entry.expectedClose.slice(0,7)===today.slice(0,7);
  case 'stale':return daysWithoutChanges(entry,today)>=7;
 }
}
export function contactIndicator(entry:CrmEntry,today:string){
 if(closedCrmEntry(entry))return {tone:'closed',label:'Oportunidad cerrada'};
 if(!entry.nextContact)return {tone:'unplanned',label:'Sin próximo contacto'};
 const days=Math.floor(dayNumber(today)-dayNumber(entry.nextContact));
 if(days>0)return {tone:'overdue',label:`Vencido hace ${days} ${days===1?'día':'días'}`};
 if(days===0)return {tone:'today',label:'Contactar hoy'};
 return {tone:'upcoming',label:`Próximo contacto · ${entry.nextContact.split('-').reverse().join('/')}`};
}
export function sortCrmEntries(entries:CrmEntry[],sort:CrmSort,today:string){
 const priority={high:0,normal:1,low:2};
 const urgency=(e:CrmEntry)=>closedCrmEntry(e)?4:attentionReason(e,today)?0:!e.nextContact?1:2;
 const date=(s:string|null|undefined)=>s||'9999-12-31';
 return [...entries].sort((a,b)=>{
  let order=0;
  if(sort==='attention')order=urgency(a)-urgency(b)||date(a.nextContact).localeCompare(date(b.nextContact))||priority[a.contactProfile?.priority??'normal']-priority[b.contactProfile?.priority??'normal'];
  if(sort==='value')order=(b.amount??-1)-(a.amount??-1);
  if(sort==='closing')order=date(a.expectedClose).localeCompare(date(b.expectedClose));
  return order||b.updatedAt.localeCompare(a.updatedAt)||a.id.localeCompare(b.id);
 });
}
