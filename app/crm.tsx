'use client';

import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ArrowUpRight,CalendarDays,GripVertical,LayoutGrid,List,Plus,RefreshCw,Search,Users} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {crmStages,leadStages,projectStages,closedCrmEntry,contactDue,filterCrmEntries,findCrmTarget,type CrmTarget,type CrmEntry,type CrmStage,type CrmNote} from '@/lib/crm';
import {CrmTasks} from './crm-tasks';
import {CrmDetail} from './crm-detail';
import {CrmSmartViews} from './crm-smart-views';
import {contactIndicator,crmSorts,matchesSmartView,sortCrmEntries,smartViews,type SmartView,type CrmSort} from '@/lib/crm-views';
import {contactSources,priorities,type CrmWorkSource} from '@/lib/crm-work';
import {chileDate} from '@/lib/quote-history';
import {money,newQuote,quoteSchema,type SavedQuote,type QuoteInput} from '@/lib/quote';
import type {ClientRecord} from './clients';
import type {ClosingFields} from '@/lib/followup';
import './crm.css';

export type CrmSource=CrmWorkSource&{
  load:()=>Promise<{entries:CrmEntry[]}>;
  save:(entry:CrmEntry,stage:CrmStage,date:string|null,closing?:ClosingFields)=>Promise<unknown>;
  create:(details:QuoteInput['customer'])=>Promise<unknown>;
  notes:(clientId:string,offset:number)=>Promise<{notes:CrmNote[];total:number}>;
  addNote:(clientId:string,body:string)=>Promise<{note:CrmNote}>;
  quote:(id:string)=>Promise<SavedQuote>;
};
async function api<T>(url:string,init?:RequestInit):Promise<T>{
  const response=await fetch(url,{...init,cache:'no-store'});
  const body=await response.json() as T&{error?:string};
  if(!response.ok)throw Error(body.error||'No se pudo completar la operación. Inténtalo nuevamente.');
  return body;
}
const json=(method:string,body:unknown)=>({method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const source:CrmSource={
  load:()=>api('/api/crm'),
  tasks:(id,status,offset)=>api(`/api/crm/tasks?status=${status}&offset=${offset}${id?'&client_id='+id:''}`),
  createTask:values=>api('/api/crm/tasks',json('POST',values)),
  updateTask:values=>api('/api/crm/tasks',json('PATCH',values)),
  saveContact:values=>api('/api/crm/contact',json('PUT',values)),
  save:(entry,status,next_contact,closing)=>api(entry.kind==='lead'?'/api/crm':`/api/crm/projects/${entry.id}/followup`,json('PUT',{client_id:entry.client.id,status,next_contact,expected:entry.expected,...closing})),
  create:details=>api('/api/clients',json('POST',{details})),
  notes:(id,offset)=>api(`/api/crm/notes?client_id=${id}&offset=${offset}`),
  addNote:(client_id,body)=>api('/api/crm/notes',json('POST',{client_id,body})),
  quote:id=>api(`/api/quotes?id=${id}`),
};
const dateLabel=(date:string)=>date.split('-').reverse().join('/');
const initials=(name:string)=>name.trim().split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase();

export function CrmWorkspace({dataSource=source,onQuote,onPreview,onChange,quoteDisabled=false,visible=true,openRequest}:{dataSource?:CrmSource;onQuote?:(client:ClientRecord)=>void;onPreview?:(quote:SavedQuote)=>void;onChange?:()=>void;quoteDisabled?:boolean;visible?:boolean;openRequest?:(CrmTarget&{token:number})|null}){
  const [entries,setEntries]=useState<CrmEntry[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [area,setArea]=useState<'opportunities'|'tasks'|'contacts'>('opportunities');
  const [originFilter,setOriginFilter]=useState(''),[priorityFilter,setPriorityFilter]=useState(''),[statusFilter,setStatusFilter]=useState('all');
  const [search,setSearch]=useState(''),[view,setView]=useState<'board'|'list'>('board');
  const [smartView,setSmartView]=useState<SmartView>('all'),[sort,setSort]=useState<CrmSort>('attention');
  const [kind,setKind]=useState<'all'|'lead'|'project'>('all'),[hideEmpty,setHideEmpty]=useState(false);
  const [closing,setClosing]=useState<{entry:CrmEntry;stage:'accepted'|'rejected'}|null>(null);
  const [selected,setSelected]=useState<CrmEntry|null>(null),[creating,setCreating]=useState(false),[busy,setBusy]=useState(false),[dragId,setDragId]=useState<string|null>(null);
  const load=useCallback(async()=>{setLoading(true);setError('');try{const result=await dataSource.load();setEntries(result.entries);return true}catch(e){setError((e as Error).message);return false}finally{setLoading(false)}},[dataSource]);
  const openedRequest=useRef<number|null>(null);
  useEffect(()=>{
    if(!visible)return;
    let active=true;
    dataSource.load().then(r=>{
      if(!active)return;
      setEntries(r.entries);setError('');
      if(openRequest&&openedRequest.current!==openRequest.token){
        openedRequest.current=openRequest.token;
        const target=findCrmTarget(r.entries,openRequest);
        setArea('opportunities');setSelected(target);
        setNotice(target?'': 'Esta oportunidad no está disponible en tu cartera. Puede estar en papelera, marcada como prueba o fuera de tus permisos.');
      }
    }).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)});
    return()=>{active=false};
  },[dataSource,visible,openRequest]);
  const today=chileDate(),baseFiltered=useMemo(()=>filterCrmEntries(entries,search,'',false,today).filter(e=>(kind==='all'||e.kind===kind)&&(!originFilter||(e.contactProfile?.source??'unknown')===originFilter)&&(!priorityFilter||(e.contactProfile?.priority??'normal')===priorityFilter)&&(statusFilter==='all'||statusFilter==='open'&&!closedCrmEntry(e)||e.stage===statusFilter)),[entries,search,today,kind,originFilter,priorityFilter,statusFilter]);
  const filtered=useMemo(()=>sortCrmEntries(baseFiltered.filter(e=>matchesSmartView(e,smartView,today)),sort,today),[baseFiltered,smartView,sort,today]);
  const allowedStages:readonly string[]=kind==='lead'?leadStages:projectStages;
  const visibleStages=Object.entries(crmStages).filter(([stage])=>(kind==='all'||allowedStages.includes(stage))&&(!hideEmpty||filtered.some(e=>e.stage===stage)));
  function resetFilters(){setSearch('');setOriginFilter('');setPriorityFilter('');setStatusFilter('all');setKind('all');setSmartView('all');setHideEmpty(false)}
  const hasFilters=!!search||!!originFilter||!!priorityFilter||statusFilter!=='all'||kind!=='all'||smartView!=='all'||hideEmpty;
  const contacts=[...new Map(filterCrmEntries(entries,search,'',false).map(e=>[e.client.id,e])).values()];
  const clients=[...new Map(entries.map(e=>[e.client.id,e.client])).values()];
  const active=filtered.filter(e=>!closedCrmEntry(e)),pending=entries.filter(e=>contactDue(e,today));
  async function save(entry:CrmEntry,stage:CrmStage,date:string|null,closing?:ClosingFields){
    await dataSource.save(entry,stage,date,closing);
    const refreshed=await load();onChange?.();
    setNotice(refreshed?'Seguimiento guardado.':'Seguimiento guardado. Actualiza para ver los datos más recientes.');
  }
  async function saveDetail(entry:CrmEntry,stage:CrmStage,date:string|null,fields?:ClosingFields){
    if((stage==='accepted'||stage==='rejected')&&stage!==entry.stage){
      setClosing({entry:{...entry,expectedClose:fields?.expected_close??null,lostReason:fields?.lost_reason??null},stage});
      return;
    }
    await save(entry,stage,date,fields);
  }
  async function drop(stage:CrmStage,transferredId:string){
    const entry=entries.find(e=>e.id===(transferredId||dragId));setDragId(null);
    if(!entry||entry.stage===stage||busy)return;
    const allowed:readonly string[]=entry.kind==='lead'?leadStages:projectStages;
    if(!allowed.includes(stage)){setError(entry.kind==='lead'?'Abre el lead y pulsa Cotizar para crear su primera propuesta.':'Un proyecto cotizado debe permanecer en las etapas de cotización o cierre.');return}
    if(stage==='accepted'||stage==='rejected'){setClosing({entry,stage});return}
    setBusy(true);setError('');try{await save(entry,stage,entry.nextContact)}catch(e){setError((e as Error).message)}finally{setBusy(false)}
  }
  return <section className="crm-workspace" aria-label="CRM comercial">
    <div className="crm-intro"><div className="crm-intro-copy"><span className="crm-sun" aria-hidden="true"><Users size={24}/></span><div><h2>Mi cartera comercial</h2><p>Tus leads, cotizaciones y próximos contactos.</p></div></div><div className="crm-actions"><Button variant="outline" disabled={loading||busy} aria-label="Actualizar CRM" onClick={()=>void load()}><RefreshCw size={17}/></Button><Button onClick={()=>setCreating(true)}><Plus size={17}/>Nuevo lead</Button></div></div>
    <nav className="crm-area-nav" aria-label="Secciones del CRM">{([['opportunities','Oportunidades'],['tasks','Agenda y tareas'],['contacts','Contactos']] as const).map(([id,label])=><button key={id} aria-current={area===id?'page':undefined} onClick={()=>setArea(id)}>{label}{id==='contacts'&&<span>{clients.length}</span>}</button>)}</nav>
    {error&&<div className="crm-feedback crm-error" role="alert">{error}<Button variant="outline" disabled={loading} onClick={()=>void load()}>Actualizar</Button></div>}
    {notice&&<p className="crm-feedback" role="status">{notice}</p>}
    {area==='tasks'?<CrmTasks source={dataSource} clients={clients}/>:area==='contacts'?<div className="crm-contacts"><div className="crm-controls"><label className="crm-search"><Search size={18}/><input aria-label="Buscar contactos del CRM" placeholder="Nombre, correo, comuna o etiqueta…" value={search} onChange={e=>setSearch(e.target.value)}/></label></div><div className="crm-table-wrap"><table className="crm-table"><thead><tr><th>Contacto</th><th>Correo y teléfono</th><th>Origen</th><th>Etiquetas</th><th>Proyectos</th></tr></thead><tbody>{contacts.map(entry=><tr key={entry.client.id}><td><button onClick={()=>setSelected(entry)}>{entry.client.details.name}<ArrowUpRight size={15}/></button><small>{entry.client.details.commune||'Comuna pendiente'}</small></td><td>{entry.client.details.email||'Sin correo'}<small>{entry.client.details.phone||'Sin teléfono'}</small></td><td>{contactSources[entry.contactProfile?.source??'unknown']}</td><td>{entry.contactProfile?.tags.join(', ')||'Sin etiquetas'}</td><td>{entries.filter(e=>e.client.id===entry.client.id&&e.kind==='project').length}</td></tr>)}</tbody></table></div>{!contacts.length&&<p className="crm-empty">{loading?'Cargando contactos…':clients.length?'No hay contactos que coincidan con la búsqueda.':'Crea tu primer lead para comenzar la cartera.'}</p>}</div>:<>
    <div className="crm-metrics" aria-label="Resumen de la vista filtrada"><div><span>Oportunidades abiertas</span><strong>{loading?'—':active.length}</strong></div><div><span>Valor en gestión</span><strong>{loading?'—':money(active.reduce((sum,e)=>sum+(e.amount??0),0))}</strong><small>Última cotización por proyecto</small></div><div><span>Proyectos ganados</span><strong>{loading?'—':filtered.filter(e=>e.stage==='accepted').length}</strong></div><button type="button" aria-pressed={smartView==='due'} onClick={()=>{const next=smartView==='due'?'all':'due';resetFilters();setSmartView(next)}}><span><CalendarDays size={16}/>Contactos para hoy o vencidos</span><strong>{loading?'—':pending.length}</strong><small>{smartView==='due'?'Quitar filtro':'Ver mis pendientes'}</small></button></div>
    <CrmSmartViews entries={baseFiltered} value={smartView} today={today} onChange={setSmartView}/>
    <div className="crm-controls"><label className="crm-search"><Search size={18}/><input aria-label="Buscar oportunidades" placeholder="Buscar cliente, comuna o folio…" value={search} onChange={e=>setSearch(e.target.value)}/></label><div className="crm-view" role="group" aria-label="Vista del CRM"><button aria-pressed={view==='board'} onClick={()=>setView('board')}><LayoutGrid size={17}/>Tablero</button><button aria-pressed={view==='list'} onClick={()=>setView('list')}><List size={17}/>Lista</button></div></div>
    <div className="crm-extra-filters"><label>Cartera<select value={kind} onChange={e=>setKind(e.target.value as typeof kind)}><option value="all">Leads y proyectos</option><option value="lead">Solo leads</option><option value="project">Solo proyectos</option></select></label><label>Ordenar<select value={sort} onChange={e=>setSort(e.target.value as CrmSort)}>{Object.entries(crmSorts).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label>Estado<select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">Todas las oportunidades</option><option value="open">Abiertas</option><option value="accepted">Ganadas</option><option value="rejected">Perdidas</option></select></label><label>Origen<select value={originFilter} onChange={e=>setOriginFilter(e.target.value)}><option value="">Todos los orígenes</option>{Object.entries(contactSources).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label>Prioridad<select value={priorityFilter} onChange={e=>setPriorityFilter(e.target.value)}><option value="">Todas las prioridades</option>{Object.entries(priorities).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label></div><div className="crm-board-tools">{view==='board'&&<label><input type="checkbox" checked={hideEmpty} onChange={e=>setHideEmpty(e.target.checked)}/>Ocultar etapas vacías</label>}{hasFilters&&<button type="button" onClick={resetFilters}>Limpiar filtros</button>}</div><div className="crm-view-caption"><span>{filtered.length} oportunidades · {smartViews[smartView]}</span><span>{view==='board'?'Desliza para ver las etapas. Arrastra una tarjeta o edita su ficha.':'Abre una oportunidad para registrar su próximo contacto.'}</span></div>
    {loading?<div className="crm-empty" role="status">Cargando tu cartera comercial…</div>:view==='board'?<div className="crm-board" aria-label="Etapas comerciales" tabIndex={0}>{visibleStages.map(([key,label])=>{
      const stage=key as CrmStage,rows=filtered.filter(e=>e.stage===stage),total=rows.reduce((sum,e)=>sum+(e.amount??0),0);
      return <section key={stage} className="crm-column" data-stage={stage} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();void drop(stage,e.dataTransfer.getData('text/plain'))}}><header><div><i aria-hidden="true"/><h3>{label}</h3><span>{rows.length}</span></div><p>{total?money(total):rows.some(e=>e.kind==='lead')||['new','no_answer','contacted','qualified'].includes(stage)?'Por cotizar':'Sin monto'}</p></header><div className="crm-column-body">{rows.map(entry=><button key={entry.id} className="crm-card" draggable={!busy} disabled={busy} onDragStart={e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',entry.id);setDragId(entry.id)}} onDragEnd={()=>setDragId(null)} onClick={()=>setSelected(entry)}><div className="crm-card-top"><span>{entry.kind==='lead'?'Lead':entry.folio}</span><GripVertical size={15}/></div><h4>{entry.client.details.name}</h4><p>{entry.client.details.commune||'Comuna por completar'}</p>{entry.contactProfile&&<div className="crm-card-tags">{entry.contactProfile.priority==='high'&&<span className="crm-priority-high">Prioridad alta</span>}{entry.contactProfile.tags.slice(0,2).map(tag=><span key={tag}>{tag}</span>)}</div>}<strong className="crm-card-amount">{entry.amount===null?'Aún sin cotización':money(entry.amount)}</strong>{entry.expectedClose&&<p className="crm-card-close">Cierre estimado · {dateLabel(entry.expectedClose)}</p>}{entry.stage==='rejected'&&entry.lostReason&&<p className="crm-card-loss">{entry.lostReason}</p>}<div className="crm-card-person"><span className="crm-avatar">{initials(entry.client.owner?.full_name||'SS')}</span><span>{entry.client.owner?.full_name||'Ejecutivo sin nombre'}</span></div><CrmContactStatus entry={entry} today={today}/></button>)}{!rows.length&&<div className="crm-column-empty">Sin oportunidades en esta etapa</div>}</div></section>;
    })}</div>:<div className="crm-table-wrap"><table className="crm-table"><thead><tr><th>Cliente / proyecto</th><th>Etapa</th><th>Valor</th><th>Responsable del cliente</th><th>Próximo contacto</th></tr></thead><tbody>{filtered.map(entry=><tr key={entry.id}><td><button onClick={()=>setSelected(entry)}>{entry.client.details.name}<ArrowUpRight size={15}/></button><small>{entry.folio||'Sin cotización'}{entry.revisions>1?` · ${entry.revisions} revisiones`:''}</small></td><td><span className="crm-stage-badge" data-stage={entry.stage}>{crmStages[entry.stage]}</span></td><td>{entry.amount===null?'Por cotizar':money(entry.amount)}</td><td>{entry.client.owner?.full_name||'Sin nombre'}</td><td data-due={contactDue(entry,today)}><CrmContactStatus entry={entry} today={today}/></td></tr>)}</tbody></table></div>}
    {!loading&&!filtered.length&&<div className="crm-empty"><Users size={30}/><h3>{entries.length?'No hay coincidencias':'Tu próxima oportunidad empieza aquí'}</h3><p>{entries.length?'Cambia la búsqueda o los filtros para ver más oportunidades.':'Crea un lead. Los clientes y las cotizaciones guardadas aparecerán automáticamente.'}</p>{entries.length?<Button variant="outline" onClick={resetFilters}>Limpiar filtros</Button>:<Button onClick={()=>setCreating(true)}>Crear primer lead</Button>}</div>}
    </>}
    <p className="crm-footnote">Las etapas registran el avance comercial. Un cambio de etapa no envía mensajes ni confirma pagos. Se excluyen cotizaciones de prueba y registros en papelera.</p>
    {selected&&<CrmDetail key={selected.id} entry={selected} related={entries.filter(e=>e.client.id===selected.client.id)} source={dataSource} onProfile={profile=>{setEntries(rows=>rows.map(e=>e.client.id===profile.client_id?{...e,contactProfile:profile}:e));setSelected(e=>e?{...e,contactProfile:profile}:e)}} onClose={()=>setSelected(null)} onSave={saveDetail} onQuote={onQuote} onPreview={onPreview} quoteDisabled={quoteDisabled}/>}
    {closing&&<CloseOpportunity entry={closing.entry} stage={closing.stage} onClose={()=>setClosing(null)} onSave={save}/>}
    {creating&&<NewLead source={dataSource} onClose={()=>setCreating(false)} onCreated={async()=>{setCreating(false);await load();onChange?.();setNotice('Lead creado. Ya puedes registrar su seguimiento o preparar una cotización.')}}/>}
  </section>;
}

function CloseOpportunity({entry,stage,onClose,onSave}:{entry:CrmEntry;stage:'accepted'|'rejected';onClose:()=>void;onSave:(entry:CrmEntry,stage:CrmStage,date:string|null,closing?:ClosingFields)=>Promise<void>}){
 const [reason,setReason]=useState(entry.lostReason??''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(){setBusy(true);setError('');try{await onSave(entry,stage,null,{expected_close:entry.expectedClose??null,lost_reason:stage==='rejected'?reason.trim()||null:entry.lostReason??null});onClose()}catch(e){setError((e as Error).message);setBusy(false)}}
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose()}}><DialogContent className="crm-dialog"><DialogHeader><DialogTitle>{stage==='accepted'?'Marcar proyecto como ganado':'Cerrar oportunidad como perdida'}</DialogTitle><DialogDescription>{entry.client.details.name} · {entry.folio??'Lead sin cotización'}. Se cerrará el seguimiento pendiente de esta oportunidad. Sus tareas se mantienen en la agenda para revisarlas.</DialogDescription></DialogHeader><form className="crm-form" onSubmit={e=>{e.preventDefault();void submit()}}>{stage==='rejected'&&<label>Motivo de pérdida<textarea value={reason} onChange={e=>setReason(e.target.value)} maxLength={500} disabled={busy} rows={3} placeholder="Presupuesto, factibilidad, proyecto postergado…"/></label>}<p className="crm-field-help">Esta acción registra el resultado comercial; no confirma pagos ni envía mensajes.</p>{error&&<p role="alert" className="crm-error">{error}</p>}<div className="crm-actions"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancelar</Button><Button type="submit" disabled={busy}>{busy?'Guardando…':'Confirmar cierre'}</Button></div></form></DialogContent></Dialog>;
}

function NewLead({source,onClose,onCreated}:{source:CrmSource;onClose:()=>void;onCreated:()=>Promise<void>}){
  const [details,setDetails]=useState(newQuote().customer),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function submit(){
    const parsed=quoteSchema.shape.customer.safeParse(details);
    if(!parsed.success||!details.name.trim()){setError('Completa el nombre y revisa el correo electrónico.');return}
    setBusy(true);setError('');try{await source.create(parsed.data);await onCreated()}catch(e){setError((e as Error).message);setBusy(false)}
  }
  return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose()}}><DialogContent className="crm-dialog"><DialogHeader><DialogTitle>Nuevo lead</DialogTitle><DialogDescription>Registra el contacto ahora y completa el proyecto cuando esté listo para cotizar.</DialogDescription></DialogHeader><form onSubmit={e=>{e.preventDefault();void submit()}}><fieldset disabled={busy} className="crm-form">{(['name','email','phone','commune'] as const).map(field=><label key={field}>{({name:'Nombre del contacto',email:'Correo electrónico',phone:'Teléfono',commune:'Comuna'})[field]}<input autoFocus={field==='name'} required={field==='name'} type={field==='email'?'email':field==='phone'?'tel':'text'} maxLength={field==='name'?150:field==='email'?254:field==='phone'?40:100} value={details[field]} onChange={e=>setDetails({...details,[field]:e.target.value})}/></label>)}{error&&<p role="alert" className="crm-error">{error}</p>}<div className="crm-actions"><Button variant="outline" type="button" onClick={onClose}>Cancelar</Button><Button type="submit">{busy?'Guardando…':'Crear lead'}</Button></div></fieldset></form></DialogContent></Dialog>;
}


function CrmContactStatus({entry,today}:{entry:CrmEntry;today:string}){
 const indicator=contactIndicator(entry,today);
 return <div className="crm-card-contact" data-tone={indicator.tone}><CalendarDays size={14}/>{indicator.label}</div>;
}
