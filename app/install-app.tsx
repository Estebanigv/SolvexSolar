"use client";

import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {Download,Check,MonitorSmartphone} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription,DialogHeader} from '@/components/ui/dialog';

type InstallPrompt = Event & {prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
const InstallContext=createContext({installed:false,openGuide:()=>{}});

export function AppInstallProvider({children}:{children:ReactNode}){
  const prompt=useRef<InstallPrompt|null>(null);
  const [available,setAvailable]=useState(false),[installed,setInstalled]=useState(false),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const [platform,setPlatform]=useState<'ios'|'android'|'desktop'>('desktop');
  useEffect(()=>{
    const display=window.matchMedia('(display-mode: standalone)');
    const isStandalone=()=>display.matches||!!(navigator as Navigator&{standalone?:boolean}).standalone;
    setInstalled(isStandalone());
    setPlatform(/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)?'ios':/Android/.test(navigator.userAgent)?'android':'desktop');
    const onPrompt=(event:Event)=>{event.preventDefault();prompt.current=event as InstallPrompt;setAvailable(true)};
    const onInstalled=()=>{prompt.current=null;setAvailable(false);setInstalled(true);setMessage('Solvex Solar ya está instalada en este dispositivo.')};
    const onDisplay=()=>setInstalled(isStandalone());
    window.addEventListener('beforeinstallprompt',onPrompt);
    window.addEventListener('appinstalled',onInstalled);
    display.addEventListener('change',onDisplay);
    return()=>{window.removeEventListener('beforeinstallprompt',onPrompt);window.removeEventListener('appinstalled',onInstalled);display.removeEventListener('change',onDisplay)};
  },[]);
  async function install(){
    const pending=prompt.current;if(!pending||busy)return;
    setBusy(true);setMessage('');
    // The browser event is single-use, including when installation is dismissed.
    prompt.current=null;setAvailable(false);
    try{await pending.prompt();const choice=await pending.userChoice;setMessage(choice.outcome==='accepted'?'Solicitud aceptada. El navegador completará la instalación.':'Puedes instalarla cuando quieras desde el menú del navegador.')}catch{setMessage('Usa el menú del navegador para instalar la app siguiendo estos pasos.')}finally{setBusy(false)}
  }
  return <InstallContext.Provider value={{installed,openGuide:()=>{setMessage('');setOpen(true)}}}>{children}<Dialog open={open} onOpenChange={setOpen}><DialogContent className="install-dialog"><DialogHeader><div className="install-symbol"><MonitorSmartphone size={24}/></div><DialogTitle>{installed?'Tu app de Solvex Solar':'Solvex Solar, siempre a mano'}</DialogTitle><DialogDescription>Accede al cotizador desde el escritorio o la pantalla de inicio de tu dispositivo.</DialogDescription></DialogHeader>{installed?<p className="install-confirmed"><Check size={18}/> La app está instalada en este dispositivo.</p>:<>{available&&<button className="install-primary" type="button" disabled={busy} onClick={install}><Download size={18}/>{busy?'Abriendo instalación…':'Instalar ahora'}</button>}<div className="install-instructions"><h3>{platform==='ios'?'En iPhone o iPad':platform==='android'?'En tu celular Android':'En tu computador'}</h3>{platform==='ios'?<ol><li>Abre esta plataforma en Safari.</li><li>Toca <strong>Compartir</strong> y luego <strong>Agregar a inicio</strong>.</li><li>Confirma con <strong>Agregar</strong>.</li></ol>:platform==='android'?<ol><li>Abre esta plataforma en Chrome.</li><li>Abre el menú <strong>⋮</strong> y selecciona <strong>Instalar app</strong> o <strong>Agregar a pantalla de inicio</strong>.</li><li>Confirma la instalación.</li></ol>:<><ol><li>Abre esta plataforma en Chrome o Edge.</li><li>Busca el ícono de instalación en la barra de direcciones o la opción <strong>Instalar Solvex Solar</strong> en el menú del navegador.</li><li>Confirma con <strong>Instalar</strong>.</li></ol><p>En Safari para Mac, usa Archivo → Agregar al Dock. Si no ves la opción, abre el sitio en Chrome o Edge.</p></>}</div></>}{message&&<p className="install-feedback" role="status">{message}</p>}<p className="install-footnote">Usarás la misma cuenta. Necesitas conexión a internet para consultar y guardar información.</p></DialogContent></Dialog></InstallContext.Provider>;
}

export function InstallAppButton(){
  const {installed,openGuide}=useContext(InstallContext);
  return <button className="nav-install" type="button" onClick={openGuide}>{installed?<Check size={17}/>:<Download size={17}/>}<span>{installed?'App instalada':'Instalar app'}</span></button>;
}
