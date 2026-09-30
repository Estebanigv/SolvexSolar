import {memberColors} from './member-color';
import {z} from 'zod';
export const activityKinds={catalog:'Equipos y precios',company:'Empresa',installation:'Instalación',client:'Clientes',quote:'Cotizaciones',member:'Usuarios'};
export const activityActions={created:'Creación',updated:'Modificación',price_changed:'Cambio de precio',sent:'Envío registrado',send_cleared:'Envío retirado',trashed:'Enviada a papelera',restored:'Restauración',deleted:'Eliminación'};
export type Activity={id:string;occurred_at:string;occurred_on:string;actor_id:string|null;actor_name:string;actor_email:string;actor_color?:string|null;entity_type:keyof typeof activityKinds;entity_id:string;entity_label:string;action:keyof typeof activityActions;changes:{field:string;before:unknown;after:unknown}[]};
const day=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>{const d=new Date(s+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s;},'Fecha inválida').or(z.literal('')).default('');
export const activityFilterSchema=z.object({
  actor:z.string().trim().max(100).default(''),
  kind:z.enum(['','catalog','company','installation','client','quote','member']).default(''),
  action:z.enum(['','created','updated','price_changed','sent','send_cleared','trashed','restored','deleted']).default(''),
  from:day,to:day,offset:z.coerce.number().int().min(0).max(100000).default(0),
}).refine(v=>!v.from||!v.to||v.from<=v.to,'El inicio debe ser anterior al término.');
export type ActivityFilters=z.infer<typeof activityFilterSchema>;
export const emptyActivityFilters:ActivityFilters={actor:'',kind:'',action:'',from:'',to:'',offset:0};
const labels:Record<string,string>={identification_color:'Color de identificación',price:'Precio unitario',name:'Nombre',email:'Correo',phone:'Teléfono',address:'Dirección',commune:'Comuna',region:'Región',role:'Acceso',full_name:'Nombre del usuario',installation:'Tarifas de instalación',sent_on:'Fecha de envío',sent_channel:'Canal de envío',deleted_at:'Fecha de papelera',total:'Total',folio:'Folio',unit:'Unidad',category:'Categoría',system:'Sistema',watts:'Potencia (W)',source:'Fuente',warranty:'Garantías',terms:'Condiciones',taxRate:'IVA (%)',taxMode:'Tratamiento de IVA',approved:'Aprobación comercial',validDays:'Vigencia (días)',legal:'Razón social',rut:'RUT',advisers:'Contactos comerciales',document:'Documento',client_id:'Cliente asociado',owner_id:'Responsable'};
export const activityField=(field:string)=>labels[field]||field;
export function activityValue(field:string,value:unknown):string{
  if(field==='identification_color')return memberColors.find(c=>c.id===value)?.name||'Automático';
  if(value===null||value===undefined)return 'Sin valor';
  if(typeof value==='boolean')return value?'Sí':'No';
  if(['price','total'].includes(field)&&typeof value==='number')return new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(value);
  if(typeof value==='object')return JSON.stringify(value,null,2);
  if(field==='role')return ({admin:'Administrador',sales:'Ejecutivo',pending:'Pendiente',disabled:'Suspendido'} as Record<string,string>)[String(value)]||String(value);
  return String(value)||'Vacío';
}
export const activityTime=(value:string)=>new Intl.DateTimeFormat('es-CL',{timeZone:'America/Santiago',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date(value));
