'use client';
import {useCallback,useEffect,useState} from 'react';
import {Bell,BellRing,CheckCheck,RefreshCw} from 'lucide-react';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {disconnectPushDevice} from '@/lib/push-device';
import './notifications.css';
type Notice={id:string;title:string;body:string;kind:'assignment'|'reminder';client_id:string|null;created_at:string;read_at:string|null};
async function api<T>(url:string,method='GET',body?:unknown):Promise<T>{
 const r=await fetch(url,{method,cache:'no-store',...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
 const value=await r.json() as T&{error?:string};if(!r.ok)throw Error(value.error||'No se pudieron consultar los avisos.');return value;
}
export function NotificationCenter({userId,preview=false}:{userId:string;preview?:boolean}){
 const [open,setOpen]=useState(false),[items,setItems]=useState<Notice[]>([]),[unread,setUnread]=useState(0);
 const [key,setKey]=useState<string|null>(null),[enabled,setEnabled]=useState(false),[supported,setSupported]=useState(false),[iosInstall,setIosInstall]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const refresh=useCallback(async()=>{
  if(preview)return;
  const data=await api<{notifications:Notice[];unread:number;publicKey:string|null}>('/api/notifications');
  setItems(data.notifications);setUnread(data.unread);setKey(data.publicKey);
 },[preview]);
 useEffect(()=>{
  if(preview)return;
  let active=true;
  async function sync(){
   if(document.hidden)return;
   try{await refresh();if(active)setError('')}catch(e){if(active)setError((e as Error).message)}
  }
  void sync();const interval=setInterval(()=>void sync(),60000);
  window.addEventListener('focus',sync);document.addEventListener('visibilitychange',sync);
  return()=>{active=false;clearInterval(interval);window.removeEventListener('focus',sync);document.removeEventListener('visibilitychange',sync)};
 },[refresh,preview]);
 useEffect(()=>{
  if(preview)return;
  let active=true;
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const standalone=matchMedia('(display-mode: standalone)').matches||(navigator as Navigator&{standalone?:boolean}).standalone===true;
  const needsInstall=ios&&!standalone;
  const ok='serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
  Promise.resolve().then(()=>{if(active){setIosInstall(needsInstall);setSupported(ok&&!needsInstall)}});
  if(ok&&!needsInstall)void (async()=>{
   try{
    const registration=await navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});
    const sub=await registration.pushManager.getSubscription();
    if(sub){
     let owner='';try{owner=localStorage.getItem('solvex-push-owner')||''}catch{/* Ask for activation again. */}
     if(owner!==userId){await disconnectPushDevice();return}
     await api('/api/notifications/subscription','POST',sub.toJSON());
     if(active)setEnabled(true);
    }
   }catch{if(active)setMessage('No se pudo verificar el dispositivo. Abre los avisos para reintentar la activación.')}
  })();
  return()=>{active=false};
 },[userId,preview]);
 useEffect(()=>{
  if(preview||!items.length)return;
  const url=new URL(window.location.href),id=url.searchParams.get('notification');
  if(!id)return;
  const item=items.find(n=>n.id===id);
  if(item){setTimeout(()=>setOpen(true),0);url.searchParams.delete('notification');history.replaceState(null,'',url);}
 },[items,preview]);
 async function enable(){
  setBusy(true);setError('');setMessage('');
  try{
   // Called directly from a tap, as required on iOS.
   const permission=await Notification.requestPermission();
   if(permission!=='granted'){setMessage(permission==='denied'?'Los avisos están bloqueados. Permítelos en los ajustes del navegador o de la app.':'No activaste los avisos. Puedes volver a intentarlo cuando quieras.');return}
   if(!key)throw Error('La configuración de avisos todavía no está disponible. Actualiza e inténtalo otra vez.');
   await navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});
   const registration=await navigator.serviceWorker.ready;
   const bytes=Uint8Array.from(atob(key.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
   const sub=await registration.pushManager.getSubscription()??await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});
   await api('/api/notifications/subscription','POST',sub.toJSON());
   try{localStorage.setItem('solvex-push-owner',userId)}catch{/* Delivery works during this session. */}
   setEnabled(true);setMessage('Este dispositivo recibirá nuevas asignaciones y el resumen diario de pendientes.');
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 async function disable(){setBusy(true);try{await disconnectPushDevice();setEnabled(false);setMessage('Avisos al teléfono desactivados en este dispositivo.')}catch{setError('No se pudo desactivar. Inténtalo nuevamente.')}finally{setBusy(false)}}
 async function read(id?:string){
  try{await api('/api/notifications','PATCH',id?{id}:{});await refresh()}catch(e){setError((e as Error).message)}
 }
 async function openNotice(n:Notice,area:'tasks'|'opportunities'='opportunities'){
  await read(n.id);setOpen(false);
  window.dispatchEvent(new CustomEvent('solvex:crm-notification',{detail:{clientId:n.client_id,area,pending:n.kind==='reminder'}}));
 }
 return <><button type="button" className="toolbar-icon notification-bell" onClick={()=>setOpen(true)} title="Notificaciones" aria-label={unread?'Notificaciones: '+unread+' sin leer':'Notificaciones'}><Bell size={19}/>{unread>0&&<span>{unread>99?'99+':unread}</span>}</button>
 <Dialog open={open} onOpenChange={setOpen}><DialogContent className="notification-dialog"><DialogHeader><DialogTitle><BellRing size={22}/>Tus notificaciones</DialogTitle><DialogDescription>Leads asignados y recordatorios de tus tareas y contactos.</DialogDescription></DialogHeader>
 <section className="notification-settings"><strong>{enabled?'Avisos activados en este dispositivo':'Recibe los avisos en tu teléfono'}</strong>
 <p>Resumen diario desde las 09:00, hora de Chile, con pendientes de hoy y vencidos. Las nuevas asignaciones se avisan durante el día.</p>
 {preview?<p>La activación está disponible al iniciar sesión en el sistema real.</p>:iosInstall?<p>En iPhone: abre el sitio en Safari, toca Compartir → Agregar a inicio y abre la app instalada para activar los avisos.</p>:!supported?<p>Este navegador no permite avisos al dispositivo. Puedes consultar siempre esta campana al entrar al CRM.</p>:<Button disabled={busy||(!enabled&&!key)} variant={enabled?'outline':'default'} onClick={()=>void(enabled?disable():enable())}>{busy?'Guardando…':enabled?'Desactivar en este dispositivo':'Activar notificaciones'}</Button>}
 <small>El sonido y la vibración dependen de los ajustes del teléfono. No necesitas dejar la app abierta.</small></section>
 {message&&<p role="status" className="notification-message">{message}</p>}{error&&<p role="alert" className="notification-error">{error}</p>}
 <div className="notification-tools"><Button variant="ghost" disabled={preview||!unread} onClick={()=>void read()}><CheckCheck size={16}/>Marcar leídas</Button><Button variant="ghost" aria-label="Actualizar notificaciones" disabled={preview} onClick={()=>void refresh().catch(e=>setError(e.message))}><RefreshCw size={16}/></Button></div>
 <div className="notification-list">{items.length?items.map(n=><article key={n.id} data-unread={!n.read_at}><strong>{n.title}</strong><p>{n.body}</p><time>{new Date(n.created_at).toLocaleString('es-CL',{timeZone:'America/Santiago',dateStyle:'short',timeStyle:'short'})}</time><div className="notification-links"><button type="button" onClick={()=>void openNotice(n)}>{n.kind==='reminder'?'Ver contactos':'Abrir lead'} →</button>{n.kind==='reminder'&&<button type="button" onClick={()=>void openNotice(n,'tasks')}>Ver tareas →</button>}</div></article>):<p className="notification-empty">Aún no tienes avisos. Las nuevas asignaciones y los próximos recordatorios aparecerán aquí.</p>}</div>
 </DialogContent></Dialog></>;
}
