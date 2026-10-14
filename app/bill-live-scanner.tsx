'use client';
import {useEffect,useRef,useState} from 'react';
import {Camera,ScanBarcode} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {acquireBillCamera,cameraError,stopBillCamera,waitForCameraFrame} from '@/lib/bill-camera';
import type {BillCode} from '@/lib/bill-barcode';

export default function BillLiveScanner({onClose,onPhoto,onDetected,acquire}:{onClose:()=>void;onPhoto:()=>void;onDetected:(file:File,codes:BillCode[])=>void;acquire?:()=>Promise<MediaStream>}){
 const video=useRef<HTMLVideoElement>(null),control=useRef<AbortController|null>(null),stream=useRef<MediaStream|null>(null);
 const [running,setRunning]=useState(false),[status,setStatus]=useState('Apunta a un solo código. Se leerá automáticamente, sin tomar una foto.'),[error,setError]=useState('');
 function stop(){control.current?.abort();control.current=null;if(stream.current){stopBillCamera(stream.current);stream.current=null}if(video.current)video.current.srcObject=null}
 useEffect(()=>{
  const hide=()=>{if(document.hidden){stop();setRunning(false);setStatus('Cámara pausada. Pulsa Iniciar cámara para continuar.')}};
  document.addEventListener('visibilitychange',hide);
  return()=>{document.removeEventListener('visibilitychange',hide);stop()};
 },[]);
 async function start(){
  if(control.current)return;
  const controller=new AbortController();control.current=controller;const {signal}=controller;
  setRunning(true);setError('');setStatus('Permite el acceso a la cámara…');
  const deadline=setTimeout(()=>{if(!signal.aborted){stop();setRunning(false);setStatus('No se completó la lectura. Acércate al código, mejora el enfoque y vuelve a iniciar.')}},90000);
  let scanner:ReturnType<typeof import('@/lib/bill-barcode').createBillCodeScanner>|undefined;
  const canvas=document.createElement('canvas');
  try{
   if(!acquire&&(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia))throw Error('Cámara no disponible');
   stream.current=await acquireBillCamera(acquire??(()=>navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}}})),signal);
   signal.throwIfAborted();const target=video.current;if(!target)throw Error('Cámara cerrada');
   target.srcObject=stream.current;await target.play();signal.throwIfAborted();
   const {createBillCodeScanner}=await import('@/lib/bill-barcode');signal.throwIfAborted();scanner=createBillCodeScanner(signal);
   setStatus('Buscando QR, código de barras o timbre PDF417… Mantén el código completo y enfocado.');
   while(!signal.aborted){
    if(target.readyState>=2&&target.videoWidth>0&&target.videoHeight>0){
     const scale=Math.min(1,1920/Math.max(target.videoWidth,target.videoHeight));canvas.width=Math.round(target.videoWidth*scale);canvas.height=Math.round(target.videoHeight*scale);
     const context=canvas.getContext('2d');if(!context)throw Error('Imagen no disponible');context.drawImage(target,0,0,canvas.width,canvas.height);
     const result=await scanner.scan(canvas,canvas.width,canvas.height);signal.throwIfAborted();
     if(result.codes.length){
      const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',0.95));signal.throwIfAborted();
      if(!blob)throw Error('Imagen no disponible');
      stop();setRunning(false);onDetected(new File([blob],`codigo-${Date.now()}.jpg`,{type:'image/jpeg'}),result.codes);return;
     }
     if(result.warning){setError(result.warning);stop();setRunning(false);return}
    }
    await waitForCameraFrame(signal);
   }
  }catch(cause){if(!signal.aborted){setError(cameraError(cause));stop();setRunning(false)}}
  finally{clearTimeout(deadline);scanner?.close();canvas.width=0;canvas.height=0}
 }
 function close(){stop();onClose()}
 return <Dialog open onOpenChange={open=>{if(!open)close()}}><DialogContent className="bill-live-dialog"><DialogHeader><DialogTitle>Escanear código en vivo</DialogTitle><DialogDescription>QR, código de barras o timbre PDF417 de la boleta. No necesitas presionar el obturador.</DialogDescription></DialogHeader>
  <div className="bill-live-view"><video ref={video} muted playsInline autoPlay aria-label="Vista de la cámara para escanear la boleta"/>{!running&&<div className="bill-live-placeholder"><ScanBarcode size={52}/><span>Cámara detenida</span></div>}<div className="bill-live-guide" aria-hidden="true"/></div>
  <p role="status" aria-live="polite">{status}</p>{error&&<p className="field-error" role="alert">{error}</p>}
  <div className="bill-live-actions">{running?<Button variant="outline" onClick={()=>{stop();setRunning(false);setStatus('Cámara detenida. Puedes volver a iniciar.')}}>Detener cámara</Button>:<Button onClick={()=>void start()}><Camera/>Iniciar cámara</Button>}<Button variant="outline" onClick={()=>{stop();onPhoto()}}>Usar una foto</Button><Button variant="ghost" onClick={close}>Cancelar</Button></div>
  <small>La lectura ocurre en tu dispositivo, sin micrófono. Solo se adjunta la imagen donde se detectó el código. Un QR de pago puede contener únicamente un enlace; adjunta la boleta completa para obtener consumo y datos del cliente.</small>
 </DialogContent></Dialog>;
}
