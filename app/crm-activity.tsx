'use client';
import {useEffect,useState} from 'react';
import {CalendarDays,CheckCircle2,StickyNote} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {readAllTasks,type CrmTask} from '@/lib/crm-work';
import type {CrmNote} from '@/lib/crm';
import type {CrmSource} from './crm';

export function CrmActivity({source,clientId}:{source:CrmSource;clientId:string}){
 const [data,setData]=useState<{notes:CrmNote[];tasks:CrmTask[];total:number}|null>(null);
 const [error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  let active=true;
  Promise.all([source.notes(clientId,0),readAllTasks(source,clientId,'all')]).then(([notes,tasks])=>{if(active)setData({notes:notes.notes,total:notes.total,tasks})}).catch(e=>{if(active)setError(e.message)});
  return()=>{active=false};
 },[source,clientId,attempt]);
 const events=[
  ...(data?.notes??[]).map(n=>({id:'note:'+n.id,date:n.created_at,title:'Nota registrada',body:n.body,author:n.author?.full_name??'Equipo Solvex',kind:'note'})),
  ...(data?.tasks??[]).flatMap(t=>[
   {id:'created:'+t.id,date:t.created_at,title:'Tarea creada',body:t.title,author:`Fecha prevista: ${t.due_on.split('-').reverse().join('/')}`,kind:'task'},
   ...(t.completed_at?[{id:'completed:'+t.id,date:t.completed_at,title:'Tarea completada',body:t.title,author:'',kind:'completed'}]:[]),
  ]),
 ].sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id)).slice(0,30);
 return <section className="crm-detail-section crm-activity"><h3>Actividad reciente del cliente</h3><p className="crm-field-help">Notas y tareas compartidas entre sus proyectos. Las llamadas y mensajes externos no se registran automáticamente.</p>
  {error?<div role="alert" className="crm-error">{error}<Button variant="outline" onClick={()=>{setError('');setAttempt(v=>v+1)}}>Reintentar</Button></div>:!data?<p role="status">Cargando actividad…</p>:<>
   {!events.length&&<p className="crm-empty">Todavía no hay actividad. Agrega una nota o crea la primera tarea.</p>}
   <ol className="crm-activity-list">{events.map(event=><li key={event.id}><span className="crm-activity-icon" aria-hidden="true">{event.kind==='note'?<StickyNote size={17}/>:event.kind==='completed'?<CheckCircle2 size={17}/>:<CalendarDays size={17}/>}</span><div><header><strong>{event.title}</strong><time dateTime={event.date}>{new Date(event.date).toLocaleString('es-CL',{timeZone:'America/Santiago',dateStyle:'short',timeStyle:'short'})}</time></header><p>{event.body}</p>{event.author&&<small>{event.author}</small>}</div></li>)}</ol>
   <p className="crm-field-help">Hasta 30 eventos recientes. Consulta las pestañas Notas y Tareas para ver sus registros completos{data.total>data.notes.length?' y cargar las notas anteriores':''}.</p>
  </>}
 </section>;
}
