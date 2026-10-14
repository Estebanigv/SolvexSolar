'use client';
import {useEffect,useRef,useState} from 'react';
import {Fingerprint,KeyRound,Trash2} from 'lucide-react';
import type {PasskeyListItem} from '@supabase/supabase-js';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {browserDatabase} from '@/lib/supabase/client';
import {passkeyError} from '@/lib/passkeys';
import {usePasskeySupport} from '@/hooks/use-passkey-support';
import './passkeys.css';

export function PasskeySettings({preview=false}:{preview?:boolean}){
  const support=usePasskeySupport();
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false);
  const [keys,setKeys]=useState<PasskeyListItem[]>([]),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [remove,setRemove]=useState<string|null>(null),[loaded,setLoaded]=useState(false);
  const operation=useRef(false),request=useRef(0),controller=useRef<AbortController|null>(null);
  useEffect(()=>()=>{request.current++;controller.current?.abort()},[]);

  async function load(){
    const id=++request.current;setLoading(true);
    try{
      const result=await browserDatabase().auth.passkey.list();
      if(id!==request.current)return;
      if(result.error)throw result.error;
      setKeys(result.data??[]);setLoaded(true);
    }catch(e){if(id===request.current)setError(passkeyError(e))}
    finally{if(id===request.current)setLoading(false)}
  }
  function changeOpen(value:boolean){
    if(operation.current)return;
    setOpen(value);setError('');setNotice('');setRemove(null);
    if(value){setLoaded(false);if(!preview&&support!=='wrong-origin')void load()}
    else{request.current++;setLoading(false)}
  }
  async function register(){
    if(preview||support!=='available'||operation.current)return;
    operation.current=true;setBusy(true);setError('');setNotice('');
    controller.current=new AbortController();
    try{
      const result=await browserDatabase().auth.registerPasskey({options:{signal:controller.current.signal}});
      if(result.error)throw result.error;
      if(!result.data)throw Error('Missing verified credential');
      setNotice('Clave de acceso activada. La próxima vez puedes ingresar con Face ID, huella o el desbloqueo que indique tu dispositivo.');
      await load();
    }catch(e){setError(passkeyError(e))}
    finally{operation.current=false;setBusy(false);controller.current=null}
  }
  async function revoke(id:string){
    if(preview||operation.current||remove!==id)return;
    operation.current=true;setBusy(true);setError('');setNotice('');
    try{
      const result=await browserDatabase().auth.passkey.delete({passkeyId:id});
      if(result.error)throw result.error;
      setKeys(current=>current.filter(key=>key.id!==id));setRemove(null);
      setNotice('Clave eliminada de tu cuenta. Puedes seguir ingresando con tu contraseña.');
    }catch(e){setError(passkeyError(e))}
    finally{operation.current=false;setBusy(false)}
  }
  return <><Button type="button" variant="outline" onClick={()=>changeOpen(true)}><Fingerprint size={16}/>Face ID y claves de acceso</Button>
    <Dialog open={open} onOpenChange={changeOpen}><DialogContent className="passkey-dialog"><DialogHeader><DialogTitle>Face ID y claves de acceso</DialogTitle><DialogDescription>Activa el ingreso desde tu celular con Face ID, huella o el desbloqueo del dispositivo. Primero debes entrar con tu cuenta.</DialogDescription></DialogHeader>
      <p className="passkey-explanation">Tu rostro y tu huella permanecen en el dispositivo. Solvex no los recibe. La contraseña sigue disponible como alternativa y necesitas conexión para ingresar.</p>
      {preview?<p role="note">Vista de ejemplo: la activación está disponible en tu cuenta conectada.</p>:support==='wrong-origin'?<p role="note">Para activar y usar tus claves, abre <a href="https://cotizador.solvexsolar.cl/">cotizador.solvexsolar.cl</a>.</p>:<>
        {support==='unavailable'&&<p role="note">Este navegador no informa un desbloqueo compatible. Prueba desde tu celular con Face ID, huella o bloqueo de pantalla habilitado.</p>}
        <Button type="button" onClick={()=>void register()} disabled={busy||loading||support!=='available'||!loaded}><Fingerprint size={18}/>{busy?'Procesando…':support==='checking'?'Comprobando dispositivo…':'Activar en este dispositivo'}</Button>
        <p className="passkey-explanation">Confirma la activación cuando lo pida tu celular. La clave puede sincronizarse con tu gestor de contraseñas.</p>
        <h3>Mis claves de acceso</h3>
        {loading?<p role="status">Consultando tus claves…</p>:loaded&&keys.length===0?<p>Aún no tienes claves registradas.</p>:null}
        <ul className="passkey-list">{keys.map(key=><li key={key.id}><div><KeyRound size={18} aria-hidden="true"/><div><strong>{key.friendly_name||'Clave de acceso'}</strong><small>Registrada el {new Date(key.created_at).toLocaleDateString('es-CL')}</small></div></div>{remove===key.id?<div className="passkey-confirm"><p>¿Eliminar esta clave de tu cuenta? Tendrás que activarla de nuevo para volver a usarla.</p><Button type="button" variant="outline" disabled={busy} onClick={()=>setRemove(null)}>Cancelar</Button><Button type="button" variant="destructive" disabled={busy} onClick={()=>void revoke(key.id)}>Confirmar eliminación</Button></div>:<Button type="button" variant="outline" disabled={busy} aria-label={'Eliminar '+(key.friendly_name||'clave de acceso')} onClick={()=>setRemove(key.id)}><Trash2 size={16}/>Eliminar</Button>}</li>)}</ul>
      </>}
      {notice&&<p className="passkey-success" role="status">{notice}</p>}{error&&<div role="alert" className="passkey-error"><p>{error}</p><Button type="button" variant="outline" disabled={busy||loading} onClick={()=>{setError('');void load()}}>Volver a consultar</Button></div>}
    </DialogContent></Dialog>
  </>;
}
