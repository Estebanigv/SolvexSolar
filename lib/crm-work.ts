import {z} from 'zod';
import {dateSchema,chileDate} from './quote-history';

export const contactSources={unknown:'Sin registrar',website:'Sitio web',whatsapp:'WhatsApp',referral:'Referido',phone:'Llamada',event:'Feria o evento',other:'Otro'} as const;
export const taskKinds={call:'Llamada',visit:'Visita técnica',proposal:'Preparar propuesta',followup:'Seguimiento'} as const;
export const priorities={normal:'Normal',high:'Alta',low:'Baja'} as const;
export const contactProfileSchema=z.object({
  client_id:z.string().uuid(),source:z.enum(['unknown','website','whatsapp','referral','phone','event','other']),
  tags:z.array(z.string().trim().min(1).max(30)).max(12).transform(tags=>[...new Set(tags)]),
  priority:z.enum(['normal','high','low']),expected:z.string().datetime({offset:true}).nullable(),
});
export type ContactProfile={client_id:string;source:keyof typeof contactSources;tags:string[];priority:keyof typeof priorities;updated_at:string};
export const taskFieldsSchema=z.object({
  title:z.string().trim().min(1).max(180),kind:z.enum(['call','visit','proposal','followup']),
  due_on:dateSchema,priority:z.enum(['normal','high','low']),details:z.string().trim().max(2000),
});
export const taskCreateSchema=taskFieldsSchema.extend({id:z.string().uuid(),client_id:z.string().uuid()});
export const taskUpdateSchema=taskFieldsSchema.extend({id:z.string().uuid(),status:z.enum(['pending','completed','cancelled']),expected:z.string().datetime({offset:true})});
export type TaskFields=z.infer<typeof taskFieldsSchema>;
export type CrmTask=TaskFields&{id:string;client_id:string;status:'pending'|'completed'|'cancelled';created_at:string;updated_at:string;completed_at:string|null;updated_by:string;client?:{details:{name:string;commune?:string};owner_id:string;owner?:{full_name:string}|null}|null};
export type CrmWorkSource={
 tasks:(clientId:string|null,status:CrmTask['status']|'all',offset:number)=>Promise<{tasks:CrmTask[];total:number}>;
 createTask:(values:z.infer<typeof taskCreateSchema>)=>Promise<{task:CrmTask}>;
 updateTask:(values:z.infer<typeof taskUpdateSchema>)=>Promise<{task:CrmTask}>;
 saveContact:(values:z.infer<typeof contactProfileSchema>)=>Promise<{profile:ContactProfile}>;
};
export async function readAllTasks(source:CrmWorkSource,clientId:string|null,status:CrmTask['status']|'all'){
 const rows:CrmTask[]=[];
 for(let offset=0;offset<20000;offset+=100){
  const result=await source.tasks(clientId,status,offset);rows.push(...result.tasks);
  if(offset+result.tasks.length>=result.total)return orderTasks(rows);
  if(!result.tasks.length)throw Error('La agenda cambió mientras se cargaba. Actualiza para consultar todas las tareas.');
 }
 throw Error('La agenda supera el límite de esta vista. No se muestran resultados parciales.');
}
export const taskDue=(task:CrmTask,today=chileDate())=>task.status==='pending'&&task.due_on<=today;
export function orderTasks(tasks:CrmTask[]){const rank={high:0,normal:1,low:2};return [...tasks].sort((a,b)=>a.due_on.localeCompare(b.due_on)||rank[a.priority]-rank[b.priority]||a.id.localeCompare(b.id));}
export function taskBuckets(tasks:CrmTask[],today=chileDate()){
  return {overdue:tasks.filter(t=>t.status==='pending'&&t.due_on<today),today:tasks.filter(t=>t.status==='pending'&&t.due_on===today),upcoming:tasks.filter(t=>t.status==='pending'&&t.due_on>today),completed:tasks.filter(t=>t.status==='completed')};
}
