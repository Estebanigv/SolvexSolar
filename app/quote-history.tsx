'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {isIssued} from '@/lib/quote-issuance';
import {FollowupControl} from './followup';
import {quoteGroups,commercialStates,commercialState,projectKey} from '@/lib/followup';
import {CalendarDays,List,Trash2,ChevronLeft,ChevronRight,RotateCcw,Search,Send,FileText,Copy,Undo2,LoaderCircle} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {money,systemNames,type SavedQuote} from '@/lib/quote';
import {channelNames,chileDate,monthCells,monthLabel,shiftMonth,responsible,quotePersonColor,calendarDate,calendarDays,type CalendarBasis,type HistoryQuote,type HistoryAction} from '@/lib/quote-history';
import {toast} from 'sonner';
import {memberColors,memberColorStyle} from '@/lib/member-color';

export type HistoryQuery={view:'list'|'calendar'|'trash';month:string;offset:number;basis?:CalendarBasis};
export type HistorySource={
  load:(query:HistoryQuery,signal:AbortSignal)=>Promise<{quotes:HistoryQuote[];total:number}>;
  update:(id:string,action:HistoryAction)=>Promise<unknown>;
};
async function responseJson<T=unknown>(response:Response):Promise<T>{const body=await response.json() as T&{error?:string};if(!response.ok)throw Error(body.error||'No se pudo actualizar el historial.');return body;}
const source:HistorySource={
  load:(query,signal)=>fetch('/api/quote-history?'+new URLSearchParams({view:query.view,month:query.month,offset:String(query.offset),basis:query.basis??'created'}),{signal}).then(responseJson<{quotes:HistoryQuote[];total:number}>),
  update:(id,action)=>fetch('/api/quote-history/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(action)}).then(responseJson),
};
function PersonTag({quote}:{quote:HistoryQuote}){const person=responsible(quote);return <span className="qh-person" style={memberColorStyle(memberColors[quotePersonColor(quote)].id,'')}><i aria-hidden="true"/>{person.name}</span>;}

function CalendarLoading({month}:{month:string}){
  return <div className="qh-calendar-loading">
    <div className="qh-loading-message" role="status" aria-live="polite"><LoaderCircle className="qh-loading-spinner" size={22} aria-hidden="true"/><div><strong>Cargando calendario…</strong><p>Estamos consultando las cotizaciones de {monthLabel(month).toLocaleLowerCase('es-CL')}.</p></div></div>
    <div className="qh-calendar-scroll" aria-hidden="true"><div className="qh-calendar qh-calendar-counts"><div className="qh-week">{['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(label=><span key={label}>{label}</span>)}</div><div className="qh-days">{monthCells(month).map((date,index)=><div key={date??'blank'+index} className={date?'qh-day qh-loading-day':'qh-day qh-day-blank'}>{date&&<><span className="qh-day-number">{Number(date.slice(-2))}</span><span className="qh-loading-placeholder"/></>}</div>)}</div></div></div>
  </div>;
}

export function QuoteHistory({isAdmin,onPreview,onRevision,onDeleted,renderAttachments,dataSource=source}:{
  isAdmin:boolean;onPreview:(q:SavedQuote)=>void;onRevision:(q:SavedQuote)=>void;onDeleted?:(id:string)=>void;
  renderAttachments?:(q:SavedQuote)=>React.ReactNode;dataSource?:HistorySource;
}){
  const [view,setView]=useState<HistoryQuery['view']>('list'),[month,setMonth]=useState(()=>chileDate().slice(0,7));
  const [basis,setBasis]=useState<CalendarBasis>('created');
  const [quotes,setQuotes]=useState<HistoryQuote[]>([]),[total,setTotal]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState(''),[refresh,setRefresh]=useState(0);
  const [search,setSearch]=useState(''),[person,setPerson]=useState('all'),[status,setStatus]=useState('all'),[day,setDay]=useState<string|null>(null);
  const [dialog,setDialog]=useState<{quote:HistoryQuote;kind:'send'|'trash'|'restore'}|null>(null),[saving,setSaving]=useState(false),[actionError,setActionError]=useState('');
  const [sentOn,setSentOn]=useState(chileDate),[channel,setChannel]=useState<'whatsapp'|'email'|'other'>('whatsapp');
  const epoch=useRef(0);
  useEffect(()=>{setPerson('all');setDay(null);},[view,month,basis]);
  useEffect(()=>{
    const controller=new AbortController(),current=++epoch.current;
    setLoading(true);setError('');setQuotes([]);setTotal(0);setDay(null);
    async function load(){
      const data=await dataSource.load({view,month,basis,offset:0},controller.signal);
      // Calendar counts must include the whole month, not just the first page.
      while(view==='calendar'&&data.quotes.length<data.total){
        if(controller.signal.aborted)return;
        const next=await dataSource.load({view,month,basis,offset:data.quotes.length},controller.signal);
        if(!next.quotes.length)throw Error('No se pudo completar el calendario. Actualiza para volver a cargarlo.');
        data.quotes.push(...next.quotes);data.total=next.total;
      }
      if(current===epoch.current){setQuotes(Array.from(new Map(data.quotes.map(q=>[q.id,q])).values()));setTotal(data.total);}
    }
    void load().catch(e=>{if(!controller.signal.aborted)setError((e as Error).message);}).finally(()=>{if(current===epoch.current)setLoading(false);});
    return()=>{controller.abort();epoch.current++;};
  },[view,month,basis,refresh,dataSource]);
  async function more(){const current=epoch.current;setLoading(true);setError('');try{const data=await dataSource.load({view,month,basis,offset:quotes.length},new AbortController().signal);if(current===epoch.current){setQuotes(old=>Array.from(new Map([...old,...data.quotes].map(q=>[q.id,q])).values()));setTotal(data.total);}}catch(e){if(current===epoch.current)setError((e as Error).message);}finally{if(current===epoch.current)setLoading(false);}}
  const people=useMemo(()=>Array.from(new Map(quotes.map(q=>{const p=responsible(q);return [p.id,p];})).values()).sort((a,b)=>a.name.localeCompare(b.name,'es')),[quotes]);
  const groups=useMemo(()=>quoteGroups(quotes),[quotes]);
  const listed=useMemo(()=>view==='list'?groups.map(rows=>rows[0]):quotes,[groups,quotes,view]);
  const filtered=useMemo(()=>listed.filter(q=>{
    const match=[q.folio,q.input.customer.name,responsible(q).name].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const term=search.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    return match.includes(term)&&(person==='all'||responsible(q).id===person)&&(view!=='list'||status==='all'||commercialState(q)===status);
  }),[listed,search,person,status,view]);
  const days=useMemo(()=>calendarDays(filtered,basis),[filtered,basis]);
  const selected=day?filtered.filter(q=>calendarDate(q,basis)===day):filtered;
  function open(q:HistoryQuote,kind:'send'|'trash'|'restore'){setDialog({quote:q,kind});setSentOn(q.sentOn||chileDate());setChannel(q.sentChannel||'whatsapp');setActionError('');}
  async function save(action:HistoryAction){if(!dialog)return;setSaving(true);setActionError('');try{await dataSource.update(dialog.quote.id,action);if(action.action==='trash')onDeleted?.(dialog.quote.id);setDialog(null);setRefresh(n=>n+1);toast.success(action.action==='send'?'Envío registrado.':action.action==='clear-send'?'Registro de envío retirado.':action.action==='trash'?'Cotización movida a la papelera.':'Cotización restaurada.');}catch(e){setActionError((e as Error).message);}finally{setSaving(false);}}
  return <section className="quote-history" aria-label="Gestión de cotizaciones">
    <div className="qh-top"><div><h2>Propuestas y seguimiento</h2><p>Identifica al responsable y organiza los envíos a tus clientes.</p></div><Button variant="outline" disabled={loading} onClick={()=>setRefresh(n=>n+1)}><RotateCcw size={16}/>Actualizar</Button></div>
    <div className="qh-toolbar"><div className="qh-views" aria-label="Vista de cotizaciones">
      <button type="button" aria-pressed={view==='list'} onClick={()=>setView('list')}><List size={16}/>Listado</button>
      <button type="button" aria-pressed={view==='calendar'} onClick={()=>setView('calendar')}><CalendarDays size={16}/>Calendario</button>
      {isAdmin&&<button type="button" aria-pressed={view==='trash'} onClick={()=>setView('trash')}><Trash2 size={16}/>Papelera</button>}
    </div><div className="qh-filters"><label className="qh-search"><Search size={17} aria-hidden="true"/><input aria-label="Buscar cotización" placeholder="Buscar cliente, folio o responsable" value={search} onChange={e=>setSearch(e.target.value)}/></label><select aria-label="Filtrar responsable" value={person} onChange={e=>setPerson(e.target.value)}><option value="all">Todos los responsables</option>{people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>{view==='list'&&<select aria-label="Filtrar estado comercial" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">Todos los estados</option>{Object.entries(commercialStates).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>}</div></div>
    {view==='calendar'&&<>
      <div className="qh-month"><div><h3>{monthLabel(month)}</h3><p>{loading?'Cargando el mes…':filtered.length+' cotizaciones '+(basis==='created'?'creadas':'con envío registrado')}</p></div><div><button type="button" aria-label="Mes anterior" onClick={()=>setMonth(m=>shiftMonth(m,-1))}><ChevronLeft/></button><button type="button" onClick={()=>setMonth(chileDate().slice(0,7))}>Este mes</button><button type="button" aria-label="Mes siguiente" onClick={()=>setMonth(m=>shiftMonth(m,1))}><ChevronRight/></button></div></div>
      <div className="qh-calendar-controls" role="group" aria-label="Fecha del calendario">
        <button type="button" aria-pressed={basis==='created'} onClick={()=>setBasis('created')}>Cotizaciones creadas</button>
        <button type="button" aria-pressed={basis==='sent'} onClick={()=>setBasis('sent')}>Envíos registrados</button>
      </div>
      <p className="qh-note">{basis==='created'?'Se muestran automáticamente al guardarlas, según su fecha de creación en Chile. Incluye las revisiones guardadas.':'Solo muestra los envíos confirmados en “Registrar envío”. Crear o descargar una propuesta no registra un envío.'} Selecciona un día para ver sus cotizaciones.</p>
    </>}
    {view==='trash'&&<p className="qh-note">Solo administración puede eliminar y restaurar. La cotización y sus documentos se conservan en la papelera.</p>}
    {error&&<div className="qh-error" role="alert">{error} <button onClick={()=>setRefresh(n=>n+1)}>Reintentar</button></div>}
    {loading&&!quotes.length?(view==='calendar'?<CalendarLoading month={month}/>:<div className="qh-empty" role="status">Cargando cotizaciones…</div>):!error&&<>
      {view==='calendar'&&<div className="qh-calendar-scroll" role="region" aria-label="Calendario mensual de cotizaciones" tabIndex={0}><div className="qh-calendar qh-calendar-counts"><div className="qh-week" aria-hidden="true">{['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d=><span key={d}>{d}</span>)}</div><div className="qh-days">{monthCells(month).map((date,i)=>{
        if(!date)return <div className="qh-day qh-day-blank" key={'blank'+i}/>;
        const summary=days.get(date),count=summary?.total??0;
        const people=Array.from(summary?.people.values()??[]).sort((a,b)=>a.name.localeCompare(b.name,'es'));
        return <button type="button" key={date} className="qh-day" aria-pressed={day===date} aria-label={date+': '+count+' cotizaciones'+(people.length?', '+people.map(p=>p.name+': '+p.count).join(', '):'')} data-today={date===chileDate()} onClick={()=>setDay(previous=>previous===date?null:date)}>
          <span className="qh-day-heading"><span className="qh-day-number">{Number(date.slice(-2))}</span>{count>0&&<span className="qh-day-total" title="Total del día">{count}<span className="qh-day-total-label"> cot.</span></span>}</span>
          {people.map(p=><span key={p.id} className="qh-person-count" style={memberColorStyle(memberColors[quotePersonColor(p.quote)].id,'')} title={p.name+': '+p.count+' cotizaciones'}><span>{p.name.trim().split(/\s+/)[0]||'Sin nombre'}</span><strong>{p.count}</strong></span>)}
        </button>;
      })}</div></div></div>}
      {view==='calendar'&&<section className="qh-day-detail" aria-label="Cotizaciones por persona" aria-live="polite">
        {day?<><h4>{'Responsables del '+day.split('-').reverse().join('/')}</h4><div>{Array.from(days.get(day)?.people.values()??[]).sort((a,b)=>a.name.localeCompare(b.name,'es')).map(p=><span key={p.id} className="qh-person-count" style={memberColorStyle(memberColors[quotePersonColor(p.quote)].id,'')}><span>{p.name.trim().split(/\s+/)[0]||'Sin nombre'}</span><strong aria-label={p.count+' cotizaciones'}>{p.count}</strong></span>)}</div>{!days.get(day)?.total&&<p>No hay cotizaciones para este día con los filtros actuales.</p>}</>:<p>El número indica las cotizaciones del día. Toca una fecha para ver el nombre de cada responsable y su cantidad de cotizaciones.</p>}
      </section>}
      <div className="qh-results"><h3>{day?`Cotizaciones del ${day.split('-').reverse().join('/')}`:view==='calendar'?'Cotizaciones del mes':view==='trash'?'Cotizaciones en papelera':'Cotizaciones guardadas'}</h3><span>{selected.length} {selected.length===1?'resultado':'resultados'}{day&&<button onClick={()=>setDay(null)}>Ver todo el mes</button>}</span></div>
      {!selected.length?<div className="qh-empty"><FileText size={32}/><strong>{quotes.length?'No hay coincidencias':view==='calendar'?(basis==='created'?'Sin cotizaciones creadas este mes':'Sin envíos registrados este mes'):view==='trash'?'La papelera está vacía':'Aún no hay cotizaciones guardadas'}</strong><p>{quotes.length?'Ajusta la búsqueda o el responsable.':view==='calendar'?(basis==='created'?'Prueba con el mes anterior. Las cotizaciones nuevas aparecen automáticamente al guardarlas.':'Selecciona Cotizaciones creadas para ver también las propuestas sin envío.'):'Las versiones guardadas aparecerán en este espacio.'}</p></div>:<div className="qh-rows">{selected.map(q=><article className="qh-row" key={q.id}><div className="qh-client"><span className="qh-folio">{q.folio}</span><h4>{q.input.customer.name||'Cliente sin nombre'}</h4><p>{systemNames[q.input.system]} · {q.calculation.kwp.toLocaleString('es-CL',{maximumFractionDigits:2})} kWp</p><small>Creada el {chileDate(q.date).split('-').reverse().join('/')}{q.owner?` por ${q.owner.name}`:''}</small></div><div className="qh-owner"><PersonTag quote={q}/><span className="qh-state" data-sent={!!q.sentOn}>{q.sentOn?`${channelNames[q.sentChannel||'other']} · ${q.sentOn.split('-').reverse().join('/')}`:'Sin envío registrado'}</span><small>{isIssued(q)?'Emitida para cliente':q.calculation.official?'Propuesta validada':'Borrador / en revisión'}</small>{view!=='trash'&&dataSource===source&&<FollowupControl quote={q} onChange={()=>setRefresh(n=>n+1)}/>}</div><div className="qh-value"><strong>{money(q.calculation.total)}</strong><span>{q.calculation.complete?'Total cotizado':'Subtotal parcial'}</span></div><div className="qh-actions"><Button variant="outline" onClick={()=>onPreview(q)}><FileText size={15}/>Ver propuesta</Button>{view==='trash'?<Button variant="outline" onClick={()=>open(q,'restore')}><Undo2 size={15}/>Restaurar</Button>:<><Button variant="ghost" onClick={()=>open(q,'send')}><Send size={15}/>{q.sentOn?'Editar envío':'Registrar envío'}</Button><button className="qh-link" onClick={()=>onRevision(q)}><Copy size={14}/>Crear revisión</button>{isAdmin&&<button className="qh-delete" aria-label={`Eliminar ${q.folio}`} onClick={()=>open(q,'trash')}><Trash2 size={14}/>Eliminar</button>}</>}{renderAttachments&&<details className="qh-attachments"><summary>Boletas del cliente</summary>{renderAttachments(q)}</details>}</div>{view==='list'&&(groups.find(rows=>projectKey(rows[0])===projectKey(q))?.length??0)>1&&<details className="quote-versions"><summary>Ver revisiones anteriores</summary>{groups.find(rows=>projectKey(rows[0])===projectKey(q))?.slice(1).map(version=><div key={version.id}><strong>{version.folio}</strong><small>{chileDate(version.date)}</small><Button variant="ghost" onClick={()=>onPreview(version)}>Ver propuesta</Button>{renderAttachments&&<details><summary>Boletas</summary>{renderAttachments(version)}</details>}{isAdmin&&<button className="qh-delete" onClick={()=>open(version,'trash')}>Eliminar versión</button>}</div>)}</details>}</article>)}</div>}
    </>}
    <div className="qh-pagination"><span>{loading&&!quotes.length?'Consultando cotizaciones…':`${quotes.length} de ${total} cotizaciones cargadas${quotes.length<total?' · carga las restantes para completar la vista':''}`}</span>{quotes.length<total&&<Button variant="outline" disabled={loading} onClick={more}>{loading?'Cargando…':'Cargar más'}</Button>}</div>
    <Dialog open={!!dialog} onOpenChange={value=>{if(!value&&!saving)setDialog(null);}}><DialogContent className="qh-dialog"><DialogHeader><DialogTitle>{dialog?.kind==='send'?'Registrar envío al cliente':dialog?.kind==='trash'?'Eliminar cotización':'Restaurar cotización'}</DialogTitle><DialogDescription>{dialog?.quote.folio} · {dialog?.quote.input.customer.name}</DialogDescription></DialogHeader>
      {dialog?.kind==='send'?<form onSubmit={e=>{e.preventDefault();void save({action:'send',sentOn,channel});}}><p>Confirma la fecha y el canal por el que ya enviaste la propuesta. Este registro no envía mensajes.</p><label>Fecha de envío<input required type="date" min={chileDate(dialog.quote.date)} max={chileDate()} value={sentOn} onChange={e=>setSentOn(e.target.value)}/></label><label>Canal<select value={channel} onChange={e=>setChannel(e.target.value as typeof channel)}><option value="whatsapp">WhatsApp</option><option value="email">Correo</option><option value="other">Otro canal</option></select></label>{actionError&&<p role="alert" className="qh-error">{actionError}</p>}<div className="qh-dialog-actions">{dialog.quote.sentOn&&<Button type="button" variant="ghost" disabled={saving} onClick={()=>save({action:'clear-send'})}>Quitar registro</Button>}<Button type="submit" disabled={saving}>{saving?'Guardando…':'Confirmar envío'}</Button></div></form>:<><p>{dialog?.kind==='trash'?'La moverás a la papelera. Dejará de aparecer en el listado y calendario; podrás restaurarla como administrador.':'La cotización volverá al historial con sus datos y documentos originales.'}</p>{actionError&&<p role="alert" className="qh-error">{actionError}</p>}<div className="qh-dialog-actions"><Button variant="outline" disabled={saving} onClick={()=>setDialog(null)}>Cancelar</Button><Button disabled={saving} onClick={()=>save({action:dialog?.kind==='trash'?'trash':'restore'})}>{saving?'Guardando…':dialog?.kind==='trash'?'Mover a la papelera':'Restaurar'}</Button></div></>}
    </DialogContent></Dialog>
  </section>;
}
