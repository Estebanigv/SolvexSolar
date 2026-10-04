'use client';
import {memberColorStyle} from '@/lib/member-color';
import {useEffect,useState} from 'react';
import {History,ShieldCheck,ArrowRight,RefreshCw,Search,ChevronLeft,ChevronRight} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {activityKinds,activityActions,activityField,activityValue,activityTime,emptyActivityFilters,type Activity,type ActivityFilters} from '@/lib/activity';
export type ActivitySource=(filters:ActivityFilters,signal:AbortSignal)=>Promise<{events:Activity[];total:number}>;
const source:ActivitySource=async(filters,signal)=>{const response=await fetch('/api/activity?'+new URLSearchParams(Object.entries(filters).map(([k,v])=>[k,String(v)])),{signal});const data=await response.json() as {events:Activity[];total:number;error?:string};if(!response.ok)throw Error(data.error||'No se pudo consultar la actividad.');return data;};
export function ActivityHistory({dataSource=source}:{dataSource?:ActivitySource}){
  const [draft,setDraft]=useState(emptyActivityFilters),[filters,setFilters]=useState(emptyActivityFilters),[refresh,setRefresh]=useState(0);
  const [events,setEvents]=useState<Activity[]>([]),[total,setTotal]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState(''),[selected,setSelected]=useState<Activity|null>(null);
  useEffect(()=>{const abort=new AbortController();setLoading(true);setError('');dataSource(filters,abort.signal).then(data=>{if(!abort.signal.aborted){setEvents(data.events);setTotal(data.total);}}).catch(e=>{if(!abort.signal.aborted)setError((e as Error).message);}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});return()=>abort.abort();},[filters,refresh,dataSource]);
  const field=(key:keyof ActivityFilters,value:string)=>setDraft(old=>({...old,[key]:value}));
  return <section className="activity-history" aria-label="Historial de actividad">
    <header className="activity-heading"><div className="activity-symbol"><History size={25}/></div><div><p>TRAZABILIDAD DEL EQUIPO</p><h2>Cada cambio tiene un responsable.</h2></div><Button variant="outline" disabled={loading} onClick={()=>setRefresh(n=>n+1)} aria-label="Actualizar actividad"><RefreshCw size={17}/></Button></header>
    <div className="activity-assurance"><ShieldCheck size={19}/><p><strong>Registro protegido.</strong> Usuario, fecha y valores antes y después de cada cambio guardado. Cada persona debe usar su propia cuenta.</p></div>
    <form className="activity-filters" onSubmit={e=>{e.preventDefault();setFilters({...draft,offset:0});}}>
      <label>Usuario<input placeholder="Nombre del usuario" value={draft.actor} onChange={e=>field('actor',e.target.value)}/></label>
      <label>Área<select value={draft.kind} onChange={e=>field('kind',e.target.value)}><option value="">Todas las áreas</option>{Object.entries(activityKinds).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
      <label>Acción<select value={draft.action} onChange={e=>field('action',e.target.value)}><option value="">Todas las acciones</option>{Object.entries(activityActions).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
      <label>Desde<input type="date" value={draft.from} max={draft.to||undefined} onChange={e=>field('from',e.target.value)}/></label>
      <label>Hasta<input type="date" value={draft.to} min={draft.from||undefined} onChange={e=>field('to',e.target.value)}/></label>
      <Button type="submit"><Search size={16}/>Filtrar</Button>
      <button className="activity-clear" type="button" onClick={()=>{setDraft(emptyActivityFilters);setFilters(emptyActivityFilters);}}>Limpiar</button>
    </form>
    <div className="activity-results"><strong>{loading?'Consultando actividad…':`${total} ${total===1?'registro':'registros'}`}</strong><span>Hora de Chile · Más recientes primero</span></div>
    {error?<div className="activity-empty" role="alert">{error}<Button variant="outline" onClick={()=>setRefresh(n=>n+1)}>Reintentar</Button></div>:loading?<div className="activity-empty" role="status">Cargando historial…</div>:!events.length?<div className="activity-empty"><History size={28}/><strong>No hay actividad para estos filtros.</strong><p>Los cambios aparecerán al guardar operaciones después de activar el registro.</p></div>:<div className="activity-events">{events.map(event=>{
      const price=event.changes.find(change=>change.field==='price');
      return <article className="activity-event" key={event.id}>
        <div className="activity-avatar team-person-color" style={memberColorStyle(event.actor_color,event.actor_id||'system')} aria-hidden="true">{event.actor_name.trim().split(/\s+/).slice(0,2).map(s=>s[0]).join('')}</div>
        <div className="activity-content"><div className="activity-meta"><strong>{event.actor_name}</strong><span className="activity-badge" data-price={event.action==='price_changed'}>{activityActions[event.action]}</span><span className="activity-area">{activityKinds[event.entity_type]}</span></div><h3>{event.entity_label}</h3><div className="activity-actor">{event.actor_email||'Operación sin sesión personal'} · <time dateTime={event.occurred_at}>{activityTime(event.occurred_at)}</time></div>{price&&<div className="activity-price"><span>{activityValue('price',price.before)}</span><ArrowRight size={15}/><strong>{activityValue('price',price.after)}</strong><small>Precio unitario</small></div>}</div>
        <Button variant="outline" onClick={()=>setSelected(event)}>Ver cambios<ChevronRight size={15}/></Button>
      </article>;
    })}</div>}
    <footer className="activity-footer"><p>Solo consulta · No se reconstruyen cambios anteriores a la activación.<br/>Incluye cambios guardados; no registra navegación ni intentos de inicio de sesión.</p><div><Button aria-label="Página anterior" variant="outline" disabled={loading||!filters.offset} onClick={()=>setFilters(f=>({...f,offset:Math.max(0,f.offset-50)}))}><ChevronLeft size={16}/></Button><span>Página {Math.floor(filters.offset/50)+1}</span><Button aria-label="Página siguiente" variant="outline" disabled={loading||filters.offset+50>=total} onClick={()=>setFilters(f=>({...f,offset:f.offset+50}))}><ChevronRight size={16}/></Button></div></footer>
    <Dialog open={!!selected} onOpenChange={open=>{if(!open)setSelected(null);}}><DialogContent className="activity-dialog"><DialogHeader><DialogTitle>{selected?.entity_label}</DialogTitle><DialogDescription>{selected&&<><strong>{selected.actor_name}</strong><span>{activityTime(selected.occurred_at)} · Hora de Chile</span></>}</DialogDescription></DialogHeader><div className="activity-diff">{selected?.changes.map((change,i)=><div className="activity-diff-row" key={change.field+i}><h3>{activityField(change.field)}</h3><div><section><small>Antes</small><pre data-financial={['price','total'].includes(change.field)&&typeof change.before==='number'}>{activityValue(change.field,change.before)}</pre></section><section><small>Después</small><pre data-financial={['price','total'].includes(change.field)&&typeof change.after==='number'}>{activityValue(change.field,change.after)}</pre></section></div></div>)}</div><div className="activity-record"><p>{selected?.actor_email}</p><details key={selected?.id}><summary>Referencia del registro</summary><p>{selected?.id}</p></details></div></DialogContent></Dialog>
  </section>;
}
