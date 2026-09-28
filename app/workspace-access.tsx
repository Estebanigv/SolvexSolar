"use client";
import {useEffect,useState} from 'react';
import {Button} from '@/components/ui/button';
import {toast} from 'sonner';
import type {QuoteInput,SavedQuote} from '@/lib/quote';
import type {BillDocument} from '@/lib/bill-reader';
import {browserDatabase} from '@/lib/supabase/client';
import {validateBillFile} from '@/lib/bill-file';
export type MemberProfile={id:string;email:string;full_name:string;role:'admin'|'sales'};
async function api<T=Record<string,unknown>>(path:string,init?:RequestInit):Promise<T>{const response=await fetch(path,init);const body=await response.json() as T&{error?:string};if(!response.ok)throw Error(body.error||'No se pudo completar la operación.');return body}
export function MemberBar({profile}:{profile:MemberProfile}){
  const [busy,setBusy]=useState(false);
  async function logout(){setBusy(true);try{await api('/auth/signout',{method:'POST'});window.location.assign('/acceso')}catch(e){toast.error((e as Error).message);setBusy(false)}}
  return <div className="member-bar"><span><strong>{profile.full_name||profile.email}</strong><small>{profile.role==='admin'?'Administración':'Ejecutivo comercial'} · Espacio privado</small></span><Button variant="outline" disabled={busy} onClick={logout}>Cerrar sesión</Button></div>;
}
type Client={id:string;details:QuoteInput['customer']};
export function ClientPicker({customer,clientId,onSelect,onSave}:{customer:QuoteInput['customer'];clientId:string|null;onSelect:(client:Client|null)=>void;onSave:(id:string)=>void}){
  const [clients,setClients]=useState<Client[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function load(){try{const body=await api<{clients:Client[]}>('/api/clients');setClients(body.clients);setError('')}catch(e){setError((e as Error).message)}}
  useEffect(()=>{void load()},[]);
  async function save(){setBusy(true);try{const body=await api<{id:string}>('/api/clients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({details:customer,id:clientId})});onSave(body.id);await load();toast.success('Cliente guardado.')}catch(e){toast.error((e as Error).message)}finally{setBusy(false)}}
  return <section className="client-picker"><label htmlFor="existing-client"><strong>Cliente nuevo o registrado</strong></label><select id="existing-client" value={clientId??''} onChange={e=>onSelect(clients.find(c=>c.id===e.target.value)??null)}><option value="">Nuevo cliente</option>{clientId&&!clients.some(c=>c.id===clientId)&&<option value={clientId}>Cliente de esta cotización</option>}{clients.map(client=><option key={client.id} value={client.id}>{client.details.name}{client.details.email?` · ${client.details.email}`:''}</option>)}</select><p>Guardar una cotización también guarda los datos del cliente. Puedes guardarlos ahora, aunque aún no tengas la propuesta.</p><Button variant="outline" onClick={save} disabled={busy||!customer.name.trim()}>{clientId?'Actualizar cliente':'Guardar cliente'}</Button>{error&&<p role="alert">{error} <button onClick={load}>Reintentar</button></p>}</section>;
}
export function Members({currentId}:{currentId:string}){
  const [members,setMembers]=useState<Array<MemberProfile&{role:string}>>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [roles,setRoles]=useState<Record<string,string>>({});
  async function load(){try{const body=await api<{members:Array<MemberProfile&{role:string}>}>('/api/members');setMembers(body.members);setError('')}catch(e){setError((e as Error).message)}}
  useEffect(()=>{void load()},[]);
  async function save(id:string){setBusy(true);try{await api('/api/members',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,role:roles[id]})});await load();setRoles(r=>{const next={...r};delete next[id];return next});toast.success('Permisos actualizados.')}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
  return <section className="card access-members"><h2>Usuarios y permisos</h2><p>Las cuentas se crean en Supabase Auth. Desde aquí autorizas su acceso: cada ejecutivo ve sus clientes y cotizaciones; administración puede consultar el conjunto y modificar el catálogo.</p><Button variant="outline" onClick={load}>Actualizar usuarios</Button>{error&&<p role="alert">{error}</p>}<table><thead><tr><th>Usuario</th><th>Acceso</th><th>Acción</th></tr></thead><tbody>{members.map(m=><tr key={m.id}><td>{m.full_name||m.email}{m.id===currentId?' (tú)':''}</td><td><select aria-label={`Permiso de ${m.email}`} disabled={busy||m.id===currentId} value={roles[m.id]??m.role} onChange={e=>setRoles(r=>({...r,[m.id]:e.target.value}))}><option value="pending">Pendiente</option><option value="sales">Ejecutivo</option><option value="admin">Administrador</option><option value="disabled">Deshabilitado</option></select></td><td><Button disabled={busy||m.id===currentId||!roles[m.id]||roles[m.id]===m.role} onClick={()=>save(m.id)}>Guardar permiso</Button></td></tr>)}</tbody></table></section>;
}
export function SaveBills({quote,documents,userId}:{quote:SavedQuote;documents:BillDocument[];userId:string}){
  const [busy,setBusy]=useState(false),[done,setDone]=useState(false);
  async function save(){setBusy(true);try{const db=browserDatabase(),folder=`${userId}/${quote.id}`;const existing=await db.storage.from('boletas').list(folder,{limit:2});if(existing.error)throw Error('No se pudo comprobar el respaldo.');
    for(let i=0;i<documents.length;i++){const name=i===0?'frente':'reverso';if(existing.data.some(f=>f.name===name))continue;const doc=documents[i];const mime=await validateBillFile(doc.file);const {error}=await db.storage.from('boletas').upload(`${folder}/${name}`,doc.file,{contentType:mime,upsert:false});if(error)throw Error('La cotización está guardada, pero faltó respaldar una boleta. Reintenta sin crear otra cotización.')}
    setDone(true);toast.success('Boletas respaldadas en el espacio privado.');
  }catch(e){toast.error((e as Error).message)}finally{setBusy(false)}}
  if(!documents.length)return null;
  return <div className="saved-bills"><strong>{done?'Boletas respaldadas':'Respalda las boletas de esta versión'}</strong><p>Se guardarán en Supabase y podrán consultarlas el ejecutivo responsable y administración.</p><Button variant="outline" disabled={busy||done} onClick={save}>{busy?'Guardando…':done?'Respaldo completo':'Guardar boletas en esta cotización'}</Button></div>;
}
export function OpenBills({quoteId}:{quoteId:string}){
  const [busy,setBusy]=useState(false),[files,setFiles]=useState<{name:string;url:string}[]|null>(null),[error,setError]=useState('');
  async function load(){setBusy(true);try{setFiles((await api<{files:{name:string;url:string}[]}>(`/api/quotes/${quoteId}/bills`)).files);setError('')}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
  return <div className="saved-bills"><Button variant="outline" disabled={busy} onClick={load}>Consultar boletas guardadas</Button>{files?.map(f=><a key={f.name} href={f.url} target="_blank" rel="noreferrer">Abrir {f.name} </a>)}{files&&<p>{files.length?'Los enlaces caducan en un minuto. Vuelve a consultar para renovarlos.':'Esta versión no tiene boletas respaldadas.'}</p>}{error&&<p role="alert">{error}</p>}</div>;
}
