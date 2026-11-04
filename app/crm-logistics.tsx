'use client';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {chileDate} from '@/lib/quote-history';
import {clientRef,daysBetween,shortDate,type WorkPlan,type PlanInput} from '@/lib/crm-pipeline';
import type {CrmEntry} from '@/lib/crm';
import type {CrmSource} from './crm';

type Job={entry:CrmEntry;plan:WorkPlan|null};
function status({entry,plan}:Job){
  if(plan?.installed_on)return 'Instalación terminada';
  if(plan?.planned_on)return plan.planned_on<chileDate()?'Instalación atrasada':'Instalación programada';
  if(plan)return 'Falta programar instalación';
  return entry.stage==='accepted'?'Cotización aceptada':'Visita por aprobar';
}
export function CrmLogistics({entries,plans,source,onSaved}:{entries:CrmEntry[];plans:WorkPlan[];source:CrmSource;onSaved:()=>Promise<boolean>}){
  const [filter,setFilter]=useState('Todas');
  const [editing,setEditing]=useState<Job|null>(null),[message,setMessage]=useState('');
  const jobs:Job[]=entries.flatMap(entry=>{
    const plan=plans.find(p=>p.opportunity_id===entry.id)??null;
    return plan||entry.stage==='accepted'||entry.stage==='visit'?[{entry,plan}]:[];
  });
  // A visit approved before quoting stays attached to its client when the first project is created.
  for(const plan of plans.filter(p=>p.kind==='lead'&&!jobs.some(j=>j.plan?.opportunity_id===p.opportunity_id))){
    const linked=entries.find(e=>e.client.id===plan.client_id);
    if(linked)jobs.push({entry:{...linked,id:plan.opportunity_id,kind:'lead',folio:null},plan});
  }
  jobs.sort((a,b)=>Number(!!a.plan?.installed_on)-Number(!!b.plan?.installed_on)||(a.plan?.planned_on??'9999').localeCompare(b.plan?.planned_on??'9999'));
  if(editing)return <PlanEditor key={editing.entry.id} job={editing} source={source} onClose={()=>setEditing(null)} onSaved={async()=>{setEditing(null);await onSaved();setMessage('Planificación guardada.')}}/>;
  const groups=['Todas','Visita por aprobar','Cotización aceptada','Falta programar instalación','Instalación programada','Instalación atrasada','Instalación terminada'];
  const visible=jobs.filter(job=>filter==='Todas'||status(job)===filter);
  return <section className="crm-operations"><header><h3>Agenda de instalaciones</h3><p>Del visto bueno comercial a la visita en terreno.</p></header>
    <div className="crm-job-filters" aria-label="Estado logístico">{groups.filter(group=>group==='Todas'||group===filter||jobs.some(job=>status(job)===group)).map(group=>
      <button key={group} type="button" aria-pressed={filter===group} onClick={()=>setFilter(group)}>{group} <b>{group==='Todas'?jobs.length:jobs.filter(job=>status(job)===group).length}</b></button>)}</div>
    {message&&<p role="status" className="crm-feedback">{message}</p>}
    {!visible.length&&<p className="crm-empty">{jobs.length?'No hay instalaciones en este estado.':'Aquí aparecerán los proyectos ganados y las oportunidades en visita técnica de esta cartera.'}</p>}
    <div className="crm-jobs">{visible.map(job=>{const {entry,plan}=job;return <article key={entry.id} className="crm-job">
      <header><div><small>{clientRef(entry.client.crm_number)} · {entry.folio??'Visita inicial'}</small><h4>{entry.client.details.name}</h4></div><span data-late={status(job)==='Instalación atrasada'}>{status(job)}</span></header>
      {plan&&<><dl><div><dt>Plazo desde aprobación</dt><dd>{daysBetween(plan.approved_on,plan.installed_on??chileDate())} días {plan.installed_on?'hasta instalar':'transcurridos'}</dd></div>
        <div><dt>Viaje en vehículo</dt><dd>{plan.drive_minutes?plan.drive_minutes+' min estimados':'Por estimar'}</dd></div></dl>
        <p>Aprobación {shortDate(plan.approved_on)}{plan.planned_on?' · Prevista '+shortDate(plan.planned_on)+' ('+daysBetween(plan.approved_on,plan.planned_on)+' días)':''}{plan.installed_on?' · Instalada '+shortDate(plan.installed_on):''}</p>
        {plan.planned_on&&!plan.installed_on&&plan.planned_on<chileDate()&&<strong className="crm-late">{daysBetween(plan.planned_on,chileDate())} días de atraso</strong>}
        <p>{plan.origin||'Origen pendiente'} → {plan.destination||'Destino pendiente'}</p></>}
      <Button variant="outline" onClick={()=>setEditing(job)}>{plan?'Editar planificación':entry.stage==='visit'?'Aprobar visita y planificar':'Planificar instalación'}</Button>
    </article>})}</div></section>;
}

function PlanEditor({job:{entry,plan},source,onClose,onSaved}:{job:Job;source:CrmSource;onClose:()=>void;onSaved:()=>Promise<void>}){
  const today=chileDate();
  const [values,setValues]=useState<PlanInput>(()=>({
    opportunity_id:entry.id,client_id:entry.client.id,kind:entry.kind,approval:entry.stage==='accepted'?'quote':'visit',
    approved_on:entry.stage==='accepted'&&entry.stageSince?chileDate(entry.stageSince):today,origin:'',
    destination:[entry.client.details.address,entry.client.details.commune].filter(Boolean).join(', '),
    drive_minutes:null,planned_on:null,installed_on:null,...plan,expected:plan?.updated_at??null,
  }));
  const [saving,setSaving]=useState(false),[routing,setRouting]=useState(false),[error,setError]=useState(''),[estimate,setEstimate]=useState('');
  function address(field:'origin'|'destination',value:string){setEstimate('');setValues(v=>({...v,[field]:value,drive_minutes:null}))}
  async function calculate(){
    setRouting(true);setError('');setEstimate('');
    try{const route=await source.routeTime(entry.client.id,values.origin,values.destination);
      setValues(v=>({...v,drive_minutes:route.minutes}));setEstimate('Google Maps · '+route.km+' km · '+route.minutes+' minutos estimados para salir ahora.');
    }catch(e){setError((e as Error).message)}finally{setRouting(false)}
  }
  async function save(){setSaving(true);setError('');
    try{await source.savePlan(values);await onSaved()}catch(e){setError((e as Error).message)}finally{setSaving(false)}
  }
  const maps='https://www.google.com/maps/dir/?'+new URLSearchParams({api:'1',origin:values.origin,destination:values.destination,travelmode:'driving'});
  return <form className="crm-operations crm-form crm-detail-section" onSubmit={e=>{e.preventDefault();void save()}}>
    <h3>{entry.client.details.name}</h3><p>{entry.folio??clientRef(entry.client.crm_number)} · {values.approval==='quote'?'Cotización aceptada':'Aprobación de visita técnica'}</p>
    <fieldset disabled={saving||routing}><legend>De la aprobación a la instalación</legend>
      <label>Fecha de aprobación<input type="date" required disabled={!!plan} max={today} value={values.approved_on} onChange={e=>setValues({...values,approved_on:e.target.value})}/></label>
      <label>Instalación prevista<input type="date" min={values.approved_on} value={values.planned_on??''} onChange={e=>setValues({...values,planned_on:e.target.value||null})}/></label>
      <label>Instalación realizada<input type="date" min={values.approved_on} max={today} value={values.installed_on??''} onChange={e=>setValues({...values,installed_on:e.target.value||null})}/></label>
      {values.approved_on&&values.planned_on&&<p>Plazo previsto: {daysBetween(values.approved_on,values.planned_on)} días.</p>}
    </fieldset>
    <fieldset disabled={saving||routing}><legend>Traslado en vehículo</legend>
      <label>Punto A · Salida<input maxLength={300} value={values.origin} onChange={e=>address('origin',e.target.value)} placeholder="Dirección y comuna de salida"/></label>
      <label>Punto B · Destino<input maxLength={300} value={values.destination} onChange={e=>address('destination',e.target.value)} placeholder="Dirección y comuna de llegada"/></label>
      <p>Al calcular el trayecto se consultan ambas direcciones en Google Maps.</p>
      <Button type="button" variant="outline" disabled={values.origin.trim().length<3||values.destination.trim().length<3} onClick={()=>void calculate()}>{routing?'Calculando…':'Calcular traslado'}</Button>
      {values.origin&&values.destination&&<a href={maps} target="_blank" rel="noreferrer">Ver trayecto en Google Maps ↗</a>}
      {estimate&&<p role="status">{estimate}</p>}
      <label>Minutos estimados de viaje<input type="number" min="1" max="10080" value={values.drive_minutes??''} onChange={e=>{setEstimate('');setValues({...values,drive_minutes:e.target.value?Number(e.target.value):null})}}/></label>
    </fieldset>
    {error&&<p role="alert" className="crm-error">{error}</p>}
    <div className="crm-actions"><Button type="button" variant="outline" disabled={saving||routing} onClick={onClose}>Volver</Button><Button disabled={saving||routing}>{saving?'Guardando…':!plan&&values.approval==='visit'?'Confirmar visita aprobada':'Guardar planificación'}</Button></div>
  </form>;
}
