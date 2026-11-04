'use client';
import {useEffect,useState} from 'react';
import {Check,FileText,Mail,MessageCircle,Phone,Plus,Trash2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {crmStages,leadStages,projectStages,type CrmEntry,type CrmStage,type CrmNote} from '@/lib/crm';
import type {ContactProfile} from '@/lib/crm-work';
import type {ClosingFields} from '@/lib/followup';
import {money,type SavedQuote} from '@/lib/quote';
import type {ClientRecord} from './clients';
import type {CrmSource} from './crm';
import {CrmContactProfile} from './crm-contact-profile';
import {CrmTasks} from './crm-tasks';
import {TimingSummary,EmailFollowup,SendFollowup} from './crm-timing';
import {CrmReassign} from './crm-reassign';
import {CrmActivity} from './crm-activity';
import {CrmOwnerBadge,CrmOwnershipNotice} from './crm-ownership';

export function CrmDetail({entry,related,source,onClose,onSave,onQuote,onPreview,onProfile,onAssigned,onProgress,onLogistics,onDelete,quoteDisabled,currentUserId=''}:{onDelete?:()=>void;currentUserId?:string;entry:CrmEntry;related:CrmEntry[];source:CrmSource;onClose:()=>void;onSave:(entry:CrmEntry,stage:CrmStage,date:string|null,closing?:ClosingFields)=>Promise<void>;onQuote?:(client:ClientRecord)=>void;onPreview?:(quote:SavedQuote)=>void;onProfile:(profile:ContactProfile)=>void;onAssigned:()=>Promise<void>;onProgress:()=>Promise<void>;onLogistics:()=>void;quoteDisabled:boolean}){
 const [assigning,setAssigning]=useState(false);
 const [panel,setPanel]=useState<'overview'|'tasks'|'notes'|'activity'>('overview');
 const [stage,setStage]=useState(entry.stage),[date,setDate]=useState(entry.nextContact??''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [expectedClose,setExpectedClose]=useState(entry.expectedClose??''),[lostReason,setLostReason]=useState(entry.lostReason??'');
 const [notes,setNotes]=useState<CrmNote[]>([]),[total,setTotal]=useState(0),[note,setNote]=useState(''),[noteLoading,setNoteLoading]=useState(true),[noteBusy,setNoteBusy]=useState(false),[noteError,setNoteError]=useState('');
 const customer=entry.client.details,allowed=entry.kind==='lead'?leadStages:projectStages;
 useEffect(()=>{let active=true;source.notes(entry.client.id,0).then(r=>{if(active){setNotes(r.notes);setTotal(r.total)}}).catch(e=>{if(active)setNoteError(e.message)}).finally(()=>{if(active)setNoteLoading(false)});return()=>{active=false}},[source,entry.client.id]);
 async function save(){setBusy(true);setError('');try{await onSave(entry,stage,date||null,{expected_close:expectedClose||null,lost_reason:lostReason.trim()||null});onClose()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 async function addNote(){setNoteBusy(true);setNoteError('');try{const result=await source.addNote(entry.client.id,note.trim());setNotes(rows=>[result.note,...rows]);setTotal(n=>n+1);setNote('')}catch(e){setNoteError((e as Error).message)}finally{setNoteBusy(false)}}
 async function moreNotes(reset=false){setNoteLoading(true);setNoteError('');try{const result=await source.notes(entry.client.id,reset?0:notes.length);setNotes(rows=>reset?result.notes:[...rows,...result.notes.filter(n=>!rows.some(r=>r.id===n.id))]);setTotal(result.total)}catch(e){setNoteError((e as Error).message)}finally{setNoteLoading(false)}}
 async function preview(id:string){if(!onPreview)return;setBusy(true);setError('');try{onPreview(await source.quote(id));onClose()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 const phone=customer.phone.replace(/[^\d+]/g,''),whatsapp=customer.phone.replace(/\D/g,'');
 return <Dialog open onOpenChange={open=>{if(!open&&!busy&&!noteBusy&&!assigning)onClose()}}><DialogContent className="crm-detail-dialog">
  <DialogHeader><DialogTitle>{customer.name}</DialogTitle><DialogDescription>{entry.folio??'Lead sin cotización'} · {customer.commune||'Comuna por completar'}</DialogDescription></DialogHeader>
  <CrmOwnershipNotice client={entry.client} currentUserId={currentUserId}/>
  <div className="crm-profile-layout"><aside className="crm-profile-sidebar">
   <section className="crm-detail-section"><h3>Contacto</h3><p>{customer.email||'Sin correo electrónico'}</p><p>{customer.phone||'Sin teléfono'}</p><p>{customer.address||'Dirección por completar'}</p><CrmOwnerBadge client={entry.client}/><div className="crm-contact-links">{customer.email&&<a href={`mailto:${customer.email}`}><Mail size={16}/>Correo</a>}{phone&&<a href={`tel:${phone}`}><Phone size={16}/>Llamar</a>}{whatsapp.length>=8&&<a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer"><MessageCircle size={16}/>WhatsApp</a>}</div></section>
   <CrmReassign entry={entry} source={source} disabled={busy||noteBusy} onAssigned={onAssigned} onBusy={setAssigning}/>
   <CrmContactProfile clientId={entry.client.id} profile={entry.contactProfile??null} source={source} onSaved={onProfile}/>
   {onDelete&&<Button variant="outline" className="crm-delete-lead" disabled={busy||noteBusy||assigning} onClick={onDelete}><Trash2 size={16}/>Eliminar lead</Button>}
  </aside><div className="crm-profile-content">
   <nav className="crm-detail-tabs" aria-label="Ficha del cliente">{([['overview','Seguimiento'],['tasks','Tareas'],['notes','Notas'],['activity','Actividad']] as const).map(([id,label])=><button key={id} aria-current={panel===id?'page':undefined} onClick={()=>setPanel(id)}>{label}{id==='notes'&&<span>{total}</span>}</button>)}</nav>
   {error&&<p className="crm-error" role="alert">{error}</p>}
   {panel==='overview'&&<>
    <section className="crm-detail-section"><h3>Tiempo y seguimiento</h3><TimingSummary entry={entry} detail/><SendFollowup entry={entry} source={source} onSaved={onProgress}/><EmailFollowup entry={entry} source={source} onSaved={onProgress}/>{(entry.stage==='visit'||entry.stage==='accepted')&&<Button variant="outline" onClick={onLogistics}>Abrir Logística CRM</Button>}</section>
    <form className="crm-detail-section crm-form" onSubmit={e=>{e.preventDefault();void save()}}><h3>Seguimiento de {entry.folio??'este lead'}</h3><label>Etapa<select value={stage} disabled={busy} onChange={e=>setStage(e.target.value as CrmStage)}>{allowed.map(s=><option key={s} value={s}>{crmStages[s]}</option>)}</select></label><label>Próximo contacto<input type="date" disabled={busy} value={date} onChange={e=>setDate(e.target.value)}/></label><label>Fecha estimada de cierre<input type="date" disabled={busy} value={expectedClose} onChange={e=>setExpectedClose(e.target.value)}/></label>{(stage==='rejected'||!!lostReason)&&<label>Motivo de pérdida<textarea rows={3} maxLength={500} disabled={busy} value={lostReason} onChange={e=>setLostReason(e.target.value)} placeholder="Ej.: presupuesto, factibilidad o proyecto postergado"/><span className="crm-field-help">Se conserva al reabrir la oportunidad; puedes editarlo o borrarlo.</span></label>}<p className="crm-field-help">Para coordinar llamadas, visitas o entregas, crea una tarea con su fecha.</p><Button disabled={busy||noteBusy||assigning} type="submit"><Check size={16}/>{busy?'Guardando…':'Guardar seguimiento'}</Button></form>
    <section className="crm-detail-section"><h3>Proyectos del cliente</h3>{related.filter(e=>e.kind==='project').map(project=><article className="crm-related-project" key={project.id}><div><strong>{project.folio}</strong><span>{crmStages[project.stage]} · {project.revisions} {project.revisions===1?'versión':'versiones'}</span></div><strong>{money(project.amount??0)}</strong>{onPreview&&project.quoteId&&<Button variant="outline" disabled={busy||noteBusy||assigning} onClick={()=>void preview(project.quoteId!)}><FileText size={15}/>Ver cotización</Button>}</article>)}{!related.some(e=>e.kind==='project')&&<p>El cliente todavía no tiene una propuesta guardada.</p>}{onQuote&&<Button variant="outline" disabled={busy||noteBusy||assigning||quoteDisabled} onClick={()=>{onQuote(entry.client);onClose()}}><Plus size={16}/>{entry.kind==='lead'?'Cotizar':'Cotizar otro proyecto'}</Button>}{quoteDisabled&&<p className="crm-field-help">Termina o guarda el borrador actual antes de iniciar otra cotización.</p>}</section>
   </>}
   {panel==='tasks'&&<CrmTasks currentUserId={currentUserId} source={source} clients={[entry.client]} clientId={entry.client.id} compact/>}
   {panel==='activity'&&<CrmActivity source={source} clientId={entry.client.id}/>}
   {panel==='notes'&&<section className="crm-detail-section crm-notes"><h3>Historial de notas</h3><p className="crm-field-help">El mismo historial que aparece en Clientes, compartido entre sus proyectos.</p><form onSubmit={e=>{e.preventDefault();void addNote()}}><label><span className="sr-only">Nueva nota</span><textarea aria-label="Nueva nota" maxLength={4000} rows={4} placeholder="Registra acuerdos, necesidades y próximos pasos…" value={note} disabled={noteBusy} onChange={e=>setNote(e.target.value)}/></label><Button type="submit" disabled={noteBusy||noteLoading||busy||assigning||!note.trim()}>{noteBusy?'Guardando…':'Agregar nota'}</Button></form>{noteError&&<div role="alert" className="crm-error">{noteError}<button onClick={()=>void moreNotes(true)}>Reintentar lectura</button></div>}{noteLoading&&<p role="status">Cargando notas…</p>}<div className="crm-note-list">{notes.map(n=><article key={n.id}><div><strong>{n.author?.full_name||'Equipo Solvex'}</strong><time dateTime={n.created_at}>{new Date(n.created_at).toLocaleString('es-CL',{timeZone:'America/Santiago',dateStyle:'short',timeStyle:'short'})}</time></div><p>{n.body}</p></article>)}</div>{!noteLoading&&!notes.length&&!noteError&&<p className="crm-notes-empty">Registra el primer contacto para que el equipo pueda continuar el seguimiento.</p>}{notes.length<total&&<Button variant="outline" disabled={noteLoading} onClick={()=>void moreNotes()}>Ver notas anteriores</Button>}</section>}
  </div></div>
 </DialogContent></Dialog>;
}
