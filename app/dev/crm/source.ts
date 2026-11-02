import type {CrmSource} from '../../crm';
import {newQuote} from '@/lib/quote';
import {type CrmEntry,type CrmNote} from '@/lib/crm';
import type {CrmTask,ContactProfile} from '@/lib/crm-work';
import {chileDate} from '@/lib/quote-history';

export function createPreviewSource():CrmSource{
    const day=(offset:number)=>{const date=new Date(chileDate()+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+offset);return date.toISOString().slice(0,10)};
    const names=['Ana Torres','Daniel Pérez','María Soto','Felipe Rojas','Paula Silva','Diego Muñoz','Camila Vera','Tomás Reyes'];
    let rows:CrmEntry[]=(['new','no_answer','qualified','draft','sent','visit','negotiation','accepted','rejected'] as const).map((stage,i)=>({id:`example-${i}`,kind:i<3?'lead':'project',stage:stage as CrmEntry['stage'],
      client:{id:`00000000-0000-4000-8000-${String(i+1).padStart(12,"0")}`,details:{...newQuote().customer,name:names[i%names.length],email:`ejemplo${i}@example.com`,commune:['Colina','Santiago','La Reina','Peñalolén'][i%4]},owner_id:i%2?'sales-b':'sales-a',owner:{full_name:i%2?'Asesora de ejemplo':'Ejecutivo de ejemplo'},updated_at:new Date().toISOString()},
      nextContact:i===1?day(-2):i===3?day(0):i===5?day(2):null,expectedClose:i===6?day(0):null,expected:null,amount:i<3?null:2400000+i*430000,quoteId:i<3?null:`quote-${i}`,folio:i<3?null:`SVX-DEMO-00${i}`,revisions:i===4?2:1,updatedAt:i===2?day(-9)+'T12:00:00Z':new Date().toISOString()}));
    rows=rows.map((row,i)=>({...row,contactProfile:{client_id:row.client.id,source:i%2?'referral':'website',priority:i===2?'high':'normal',tags:i<3?['Residencial']:['On Grid'],updated_at:new Date().toISOString()}}));
    const notes=new Map<string,CrmNote[]>([[rows[0].client.id,[{id:'demo-note-1',body:'Contacto de ejemplo: solicita evaluar paneles para su vivienda. Pedir la última cuenta de luz antes de preparar la propuesta.',created_at:day(-1)+'T15:00:00Z',author_id:'demo',author:{full_name:'Equipo de ejemplo'}}]]]);
    let tasks:CrmTask[]=rows.slice(0,4).map((row,i)=>({id:`10000000-0000-4000-8000-${String(i+1).padStart(12,"0")}`,client_id:row.client.id,title:['Llamar para conocer el consumo','Coordinar visita técnica','Preparar propuesta con batería','Revisar condiciones de instalación'][i],kind:i===1?'visit':i===2?'proposal':'call',due_on:i===0?day(-1):day(0),priority:i===0?'high':'normal',details:'Tarea de ejemplo para revisar la agenda.',status:'pending',created_at:new Date().toISOString(),updated_at:new Date().toISOString(),updated_by:'demo',completed_at:null,client:row.client}));
    const trashed=new Set<string>();
    return {
      move:async(id,action)=>{if(action==='trash')trashed.add(id);else trashed.delete(id);return {id}},
      team:async()=>({members:[{id:'sales-a',full_name:'Ejecutivo de ejemplo'},{id:'sales-b',full_name:'Asesora de ejemplo'}]}),
      reassign:async values=>{const owner={full_name:values.new_owner_id==='sales-a'?'Ejecutivo de ejemplo':'Asesora de ejemplo'};rows=rows.map(r=>r.client.id===values.client_id?{...r,client:{...r.client,owner_id:values.new_owner_id,owner}}:r);tasks=tasks.map(t=>t.client_id===values.client_id&&t.client?{...t,client:{...t.client,owner_id:values.new_owner_id,owner}}:t);return {client_id:values.client_id,owner_id:values.new_owner_id}},
      tasks:async(clientId,status,offset)=>{const filtered=tasks.filter(t=>!trashed.has(t.client_id)&&(!clientId||t.client_id===clientId)&&(status==='all'||t.status===status));return {tasks:filtered.slice(offset,offset+100),total:filtered.length}},
      createTask:async values=>{if(tasks.some(t=>t.id===values.id))throw Error('Esta tarea ya existe.');const task:CrmTask={...values,status:'pending',created_at:new Date().toISOString(),updated_at:new Date().toISOString(),updated_by:'demo',completed_at:null,client:rows.find(r=>r.client.id===values.client_id)?.client};tasks=[task,...tasks];return {task}},
      updateTask:async values=>{const old=tasks.find(t=>t.id===values.id);if(!old||old.updated_at!==values.expected)throw Error('La tarea cambió. Actualiza la agenda.');const task:CrmTask={...old,...values,updated_at:new Date().toISOString(),completed_at:values.status==='completed'?new Date().toISOString():null};tasks=tasks.map(t=>t.id===task.id?task:t);return {task}},
      saveContact:async values=>{const profile:ContactProfile={...values,updated_at:new Date().toISOString()};rows=rows.map(r=>r.client.id===values.client_id?{...r,contactProfile:profile}:r);return {profile}},
      load:async()=>({entries:rows.filter(r=>!trashed.has(r.client.id)),canViewAll:true,canTrashLeads:true,currentUserId:'sales-a'}),save:async(entry,stage,date,closing)=>{rows=rows.map(r=>r.id===entry.id?{...r,stage,nextContact:date,...(closing?{expectedClose:closing.expected_close,lostReason:closing.lost_reason}:{}),expected:new Date().toISOString(),updatedAt:new Date().toISOString()}:r)},
      create:async details=>{const id=crypto.randomUUID();rows=[{id,kind:'lead',stage:'new',client:{id,details,updated_at:new Date().toISOString(),owner_id:'sales-a',owner:{full_name:'Ejecutivo de ejemplo'}},nextContact:null,expected:null,amount:null,quoteId:null,folio:null,revisions:0,updatedAt:new Date().toISOString()},...rows]},
      notes:async(id,offset)=>({notes:(notes.get(id)??[]).slice(offset,offset+50),total:(notes.get(id)??[]).length}),
      addNote:async(id,body)=>{const note:CrmNote={id:crypto.randomUUID(),body,created_at:new Date().toISOString(),author_id:'demo',author:{full_name:'Equipo de ejemplo'}};notes.set(id,[note,...notes.get(id)??[]]);return {note}},
      quote:async()=>{throw Error('Esta demostración no contiene documentos reales.')},
    };
}
