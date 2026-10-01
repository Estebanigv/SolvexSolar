import type {Followup} from './followup';
import {z} from 'zod';
import {memberColors} from './member-color';
import type {SavedQuote} from './quote';

export type HistoryQuote=SavedQuote&{
  followup?:Followup|null;
  owner?:{id:string;name:string;identification_color?:string|null};
  responsibleColor?:string|null;
  sentOn?:string|null;
  sentChannel?:'whatsapp'|'email'|'other'|null;
  deletedAt?:string|null;
};
export const channelNames={whatsapp:'WhatsApp',email:'Correo',other:'Otro canal'};
export function chileDate(value:Date|string=new Date()){
  return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
}
export const dateSchema=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s,'Fecha inválida');
export const historyActionSchema=z.discriminatedUnion('action',[
  z.object({action:z.literal('send'),sentOn:dateSchema.refine(s=>s<=chileDate(),'El envío no puede ser futuro'),channel:z.enum(['whatsapp','email','other'])}),
  z.object({action:z.literal('clear-send')}),z.object({action:z.literal('trash')}),z.object({action:z.literal('restore')}),
]);
export type HistoryAction=z.infer<typeof historyActionSchema>;
export function responsible(q:HistoryQuote){
  const adviser=q.settings.advisers?.find(a=>a.id===q.input.adviserId);
  return adviser?{id:'adviser:'+adviser.id,name:adviser.name}:q.owner?{id:'owner:'+q.owner.id,name:q.owner.name}:{id:'unassigned',name:'Sin responsable'};
}
export function personColor(id:string){let hash=0;for(const c of id)hash=(hash*31+c.charCodeAt(0))>>>0;return hash%6;}
export function quotePersonColor(q:HistoryQuote){
  const selected=memberColors.findIndex(c=>c.id===q.responsibleColor);
  if(selected>=0)return selected;
  const advisers=[...(q.settings.advisers??[])].sort((a,b)=>a.id.localeCompare(b.id));
  const index=advisers.findIndex(a=>a.id===q.input.adviserId);
  return index>=0?index%6:personColor(responsible(q).id);
}
export function monthCells(month:string){
  const [year,m]=month.split('-').map(Number),first=new Date(Date.UTC(year,m-1,1));
  const offset=(first.getUTCDay()+6)%7,count=new Date(Date.UTC(year,m,0)).getUTCDate();
  return Array.from({length:Math.ceil((offset+count)/7)*7},(_,i)=>i<offset||i>=offset+count?null:`${month}-${String(i-offset+1).padStart(2,'0')}`);
}
export function shiftMonth(month:string,amount:number){const [y,m]=month.split('-').map(Number);return new Date(Date.UTC(y,m-1+amount,1)).toISOString().slice(0,7);}
export function monthLabel(month:string){return new Intl.DateTimeFormat('es-CL',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(month+'-01T12:00:00Z'));}
