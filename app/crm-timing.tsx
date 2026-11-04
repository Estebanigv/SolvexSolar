'use client';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {chileDate} from '@/lib/quote-history';
import {attentionReason,clientRef,daysBetween,quoteTimestamp,shortDate} from '@/lib/crm-pipeline';
import type {CrmEntry} from '@/lib/crm';
import type {CrmSource} from './crm';

export function TimingSummary({entry,detail=false}:{entry:CrmEntry;detail?:boolean}){
  const start=entry.firstQuotedAt??entry.client.created_at;
  const today=chileDate(),attention=attentionReason(entry,today),email=entry.lastEmail;
  return <div className="crm-timing">
    {clientRef(entry.client.crm_number)&&<span>{clientRef(entry.client.crm_number)}</span>}
    {start&&<span>{entry.kind==='lead'?'Ingreso':'Primera cotización'} · <time dateTime={start}>{quoteTimestamp(start)}</time> · hace {daysBetween(chileDate(start),today)} días</span>}
    {entry.stageSince&&<span>{entry.stage==='accepted'||entry.stage==='rejected'?'Cierre registrado':'Etapa actual'} · {daysBetween(chileDate(entry.stageSince),today)} días desde {shortDate(chileDate(entry.stageSince))}</span>}
    {detail&&entry.firstQuotedAt&&entry.client.created_at&&<span>Desde el ingreso del cliente hasta esta primera cotización · {daysBetween(chileDate(entry.client.created_at),chileDate(entry.firstQuotedAt))} días</span>}
    {detail&&entry.lastQuotedAt&&entry.lastQuotedAt!==start&&<span>Última revisión · {quoteTimestamp(entry.lastQuotedAt)}</span>}
    {entry.kind==='project'&&<span>{entry.lastSentOn?'Último envío registrado · '+shortDate(entry.lastSentOn):'Envío pendiente de registrar'}</span>}
    {detail&&email&&<span>{email.folio} · Correo enviado el {shortDate(email.sentOn)} · {email.replyOn?'Respuesta registrada el '+shortDate(email.replyOn):daysBetween(email.sentOn,today)+' días sin respuesta registrada'}</span>}
    {attention&&<strong className="crm-attention">{attention}</strong>}
  </div>;
}

export function EmailFollowup({entry,source,onSaved}:{entry:CrmEntry;source:CrmSource;onSaved:()=>Promise<void>}){
  const [day,setDay]=useState(chileDate()),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const email=entry.lastEmail;
  if(!email||email.replyOn)return null;
  async function save(){if(!email)return;setBusy(true);setError('');
    try{await source.reply(entry.client.id,email,day);await onSaved()}catch(e){setError((e as Error).message)}finally{setBusy(false)}
  }
  return <form className="crm-form" onSubmit={e=>{e.preventDefault();void save()}}>
    <label>Fecha en que respondió el cliente<input type="date" required min={email.sentOn} max={chileDate()} value={day} disabled={busy} onChange={e=>setDay(e.target.value)}/></label>
    <Button variant="outline" disabled={busy}>{busy?'Guardando…':'Registrar respuesta al correo'}</Button>
    {error&&<p role="alert" className="crm-error">{error}</p>}
  </form>;
}

export function SendFollowup({entry,source,onSaved}:{entry:CrmEntry;source:CrmSource;onSaved:()=>Promise<void>}){
  const [opened,setOpened]=useState(false),[day,setDay]=useState(chileDate());
  const [channel,setChannel]=useState<'email'|'whatsapp'|'other'>('email');
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  if(!entry.quoteId||entry.stage==='rejected'||entry.stage==='accepted')return null;
  if(!opened)return <Button variant="outline" onClick={()=>setOpened(true)}>Registrar envío de la cotización</Button>;
  async function save(){setBusy(true);setError('');
    try{await source.recordSend(entry.quoteId!,day,channel);await onSaved()}catch(e){setError((e as Error).message)}finally{setBusy(false)}
  }
  return <form className="crm-form" onSubmit={e=>{e.preventDefault();void save()}}>
    <p>Registra el último envío realizado de {entry.folio}.</p>
    <label>Canal<select value={channel} onChange={e=>setChannel(e.target.value as typeof channel)}><option value="email">Correo</option><option value="whatsapp">WhatsApp</option><option value="other">Otro</option></select></label>
    <label>Fecha de envío<input required type="date" value={day} min={entry.lastQuotedAt?chileDate(entry.lastQuotedAt):undefined} max={chileDate()} onChange={e=>setDay(e.target.value)}/></label>
    {error&&<p role="alert">{error}</p>}
    <div className="crm-actions"><Button type="button" variant="outline" disabled={busy} onClick={()=>setOpened(false)}>Cancelar</Button><Button disabled={busy}>Guardar envío</Button></div>
  </form>;
}
