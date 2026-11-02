'use client';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {contactSources,priorities,contactProfileSchema,type ContactProfile,type CrmWorkSource} from '@/lib/crm-work';

export function CrmContactProfile({clientId,profile,source,onSaved}:{clientId:string;profile:ContactProfile|null;source:CrmWorkSource;onSaved:(profile:ContactProfile)=>void}){
 const [current,setCurrent]=useState(profile),[origin,setOrigin]=useState(profile?.source??'unknown'),[priority,setPriority]=useState(profile?.priority??'normal'),[tags,setTags]=useState(profile?.tags.join(', ')??'');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function save(){
  const parsed=contactProfileSchema.safeParse({client_id:clientId,source:origin,priority,tags:tags.split(',').map(t=>t.trim()).filter(Boolean),expected:current?.updated_at??null});
  if(!parsed.success){setError('Usa hasta 12 etiquetas de 30 caracteres cada una.');return}
  setBusy(true);setError('');setNotice('');try{const result=await source.saveContact(parsed.data);setCurrent(result.profile);onSaved(result.profile);setNotice('Ficha comercial guardada.')}catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 return <form className="crm-detail-section crm-form" onSubmit={e=>{e.preventDefault();void save()}}><h3>Ficha comercial</h3><fieldset disabled={busy} className="crm-form"><label>Origen del contacto<select value={origin} onChange={e=>setOrigin(e.target.value as ContactProfile['source'])}>{Object.entries(contactSources).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label>Prioridad del cliente<select value={priority} onChange={e=>setPriority(e.target.value as ContactProfile['priority'])}>{Object.entries(priorities).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label>Etiquetas<input value={tags} maxLength={382} onChange={e=>setTags(e.target.value)} placeholder="Residencial, batería, visita pendiente"/></label><p className="crm-field-help">Separa las etiquetas con comas. Se comparten entre los proyectos del cliente.</p>{error&&<p className="crm-error" role="alert">{error}</p>}{notice&&<p role="status" className="crm-field-help">{notice}</p>}<Button type="submit" variant="outline">{busy?'Guardando…':'Guardar ficha comercial'}</Button></fieldset></form>;
}
