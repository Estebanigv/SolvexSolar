"use client";
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {newQuote,quoteSchema,type QuoteInput} from '@/lib/quote';
import {CustomerLocationFields} from './customer-location';

type Client={id:string;details:QuoteInput['customer']};
export function ClientCreateDialog({onCreated,onClose}:{onCreated:(client:Client)=>void;onClose:()=>void}){
 const [details,setDetails]=useState(()=>newQuote().customer),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const edit=(patch:Partial<QuoteInput['customer']>)=>{setDetails(value=>({...value,...patch}));setError('');};
 async function save(event:React.FormEvent){
  event.preventDefault();if(busy)return;
  const parsed=quoteSchema.shape.customer.safeParse({...details,name:details.name.trim(),email:details.email.trim()});
  if(!details.name.trim()){setError('Ingresa el nombre del cliente.');return;}
  if(!parsed.success){setError('Revisa el correo y los datos del cliente antes de guardar.');return;}
  setBusy(true);setError('');
  try{const response=await fetch('/api/clients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({details:parsed.data})});
   const body=await response.json() as {id?:string;error?:string};if(!response.ok||!body.id)throw Error(body.error||'No se pudo guardar el cliente.');
   onCreated({id:body.id,details:parsed.data});
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className="client-edit-dialog"><DialogHeader><DialogTitle>Nuevo cliente</DialogTitle><DialogDescription>Registra sus datos aquí. Al guardar, quedará seleccionado para esta cotización. Solo el nombre es obligatorio.</DialogDescription></DialogHeader><form onSubmit={save}><fieldset disabled={busy}><div className="client-edit-grid">
  <label>Nombre y apellido<Input autoFocus required maxLength={150} value={details.name} onChange={e=>edit({name:e.target.value})}/></label>
  <label>Correo electrónico<Input type="email" maxLength={254} value={details.email} onChange={e=>edit({email:e.target.value})}/></label>
  <label>Teléfono<Input type="tel" maxLength={40} value={details.phone} onChange={e=>edit({phone:e.target.value})} placeholder="+56 9 1234 5678"/></label>
  <label>Dirección (opcional)<Input maxLength={300} value={details.address} onChange={e=>edit({address:e.target.value})}/></label>
  <CustomerLocationFields region={details.region} commune={details.commune} onChange={edit}/>
 </div>{error&&<p className="field-error" role="alert">{error}</p>}<div className="client-dialog-actions"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit">{busy?'Guardando…':'Crear y usar cliente'}</Button></div></fieldset></form></DialogContent></Dialog>;
}
