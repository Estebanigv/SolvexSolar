"use client";
import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {toast} from 'sonner';
import {LogOut,FileText,ExternalLink} from 'lucide-react';
import type {QuoteInput,SavedQuote} from '@/lib/quote';
import {browserDatabase} from '@/lib/supabase/client';
import {backupBills,validateBackupFiles,type BillBackupJob} from '@/lib/bill-backup';
export type MemberProfile={id:string;email:string;full_name:string;role:'admin'|'sales';identification_color?:string|null};
async function api<T=Record<string,unknown>>(path:string,init?:RequestInit):Promise<T>{const response=await fetch(path,init);const body=await response.json() as T&{error?:string};if(!response.ok)throw Error(body.error||'No se pudo completar la operación.');return body}
export function SignOutButton(){
  const [busy,setBusy]=useState(false);
  async function logout(){setBusy(true);try{await api('/auth/signout',{method:'POST'});window.location.assign('/acceso')}catch(e){toast.error((e as Error).message);setBusy(false)}}
  return <Button type="button" variant="ghost" className="nav-signout" disabled={busy} onClick={logout}><LogOut size={16} aria-hidden="true"/>{busy?'Cerrando sesión…':'Cerrar sesión'}</Button>;
}
type Client={id:string;details:QuoteInput['customer']};
export function ClientPicker({customer,clientId,onSelect,onSave,refresh=0,onManage}:{refresh?:number;onManage?:()=>void;customer:QuoteInput['customer'];clientId:string|null;onSelect:(client:Client|null)=>void;onSave:(id:string)=>void}){
  const [clients,setClients]=useState<Client[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function load(){try{const body=await api<{clients:Client[]}>('/api/clients');setClients(body.clients);setError('')}catch(e){setError((e as Error).message)}}
  useEffect(()=>{void load()},[refresh]);
  async function save(){setBusy(true);try{const body=await api<{id:string}>('/api/clients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({details:customer,id:clientId})});onSave(body.id);await load();toast.success('Cliente guardado.')}catch(e){toast.error((e as Error).message)}finally{setBusy(false)}}
  return <section className="client-picker"><label htmlFor="existing-client"><strong>Cliente nuevo o registrado</strong></label><select id="existing-client" value={clientId??''} onChange={e=>onSelect(clients.find(c=>c.id===e.target.value)??null)}><option value="">Nuevo cliente</option>{clientId&&!clients.some(c=>c.id===clientId)&&<option value={clientId}>Cliente de esta cotización</option>}{clients.map(client=><option key={client.id} value={client.id}>{client.details.name}{client.details.email?` · ${client.details.email}`:''}</option>)}</select><p>Guardar una cotización también guarda los datos del cliente. Puedes guardarlos ahora, aunque aún no tengas la propuesta.</p><Button variant="outline" onClick={save} disabled={busy||!customer.name.trim()}>{clientId?'Actualizar cliente':'Guardar cliente'}</Button>{onManage&&<Button variant="ghost" onClick={onManage}>Ver y administrar clientes</Button>}{error&&<p role="alert">{error} <button onClick={load}>Reintentar</button></p>}</section>;
}
export {Members} from './members';
export function useQuoteBillBackup(){
  const [job,setJob]=useState<BillBackupJob|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const running=useRef(false);
  const pending=!!job&&job.completed<job.files.length;
  useEffect(()=>{if(!pending)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[pending]);
  async function run(target:BillBackupJob){
    if(running.current)return false;
    running.current=true;setBusy(true);setError('');setJob({...target});
    try{
      const bucket=browserDatabase().storage.from('boletas');
      await backupBills(target,{
        upload:async(path,file,mime)=>{const {error}=await bucket.upload(path,file,{contentType:mime,upsert:false});if(error)throw error},
        download:async path=>{const {data,error}=await bucket.download(path);if(error||!data)throw error??Error('Archivo no disponible');return data},
      },completed=>setJob({...target,completed}));
      return true;
    }catch{setError('La cotización está guardada, pero el respaldo quedó incompleto. Revisa la conexión y reintenta aquí antes de cerrar esta página.');return false}
    finally{running.current=false;setBusy(false)}
  }
  return {job,busy,error,pending,validate:validateBackupFiles,
    save:(quote:SavedQuote,files:File[],ownerId:string)=>run({quoteId:quote.id,folio:quote.folio,files:[...files],ownerId,completed:0}),
    retry:()=>job?run({...job,files:[...job.files]}):Promise.resolve(false)};
}
export function BillBackupStatus({backup}:{backup:ReturnType<typeof useQuoteBillBackup>}){
  if(!backup.job?.files.length)return null;
  return <section className="notice bill-backup-status" aria-live="polite"><div><strong>{backup.busy?'Respaldando boletas…':backup.pending?'Respaldo pendiente':'Boletas respaldadas'} · {backup.job.folio}</strong><p>{backup.job.completed} de {backup.job.files.length} archivos guardados en el espacio privado. {!backup.pending&&'Puedes abrirlos desde Cotizaciones → Boletas del cliente.'}</p>{backup.error&&<p role="alert">{backup.error}</p>}</div>{backup.pending&&!backup.busy&&<Button variant="outline" onClick={()=>void backup.retry()}>Reintentar respaldo</Button>}</section>;
}
export function OpenBills({quoteId}:{quoteId:string}){
  const [busy,setBusy]=useState(false),[files,setFiles]=useState<{name:string;url:string}[]|null>(null),[error,setError]=useState('');
  async function load(){setBusy(true);try{setFiles((await api<{files:{name:string;url:string}[]}>(`/api/quotes/${quoteId}/bills`)).files);setError('')}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
  return <div className="saved-bills"><Button variant="outline" disabled={busy} onClick={load}>{busy?'Consultando…':files?.length?'Actualizar enlaces':'Consultar boletas guardadas'}</Button>{!!files?.length&&<strong>{files.length} {files.length===1?'archivo respaldado':'archivos respaldados'}</strong>}{files?.map((f,i)=><a className="bill-file-link" key={f.name} href={f.url} target="_blank" rel="noreferrer"><FileText size={18}/><span>Abrir documento {i+1}</span><ExternalLink size={14}/></a>)}{files&&<p>{files.length?'Enlaces privados válidos por un minuto. Puedes renovarlos con “Actualizar enlaces”.':'Esta versión no tiene boletas respaldadas.'}</p>}{error&&<p role="alert">{error}</p>}</div>;
}
