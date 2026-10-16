'use client';
import {useEffect,useState} from 'react';
import {Download,FileText,LoaderCircle,MessageCircle,Paperclip,Share2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {isIssued} from '@/lib/quote-issuance';

import {whatsappUrl} from '@/lib/document-share';
import type {SavedQuote} from '@/lib/quote';

export function DocumentShare({quote,whatsapp,onClose}:{quote:SavedQuote;whatsapp:boolean;onClose:()=>void}){
  const [prepared,setPrepared]=useState<{file:File;url:string;native:boolean}|null>(null),[error,setError]=useState(''),[status,setStatus]=useState(''),[sharing,setSharing]=useState(false),[retry,setRetry]=useState(0),[phone,setPhone]=useState(quote.input.customer.phone);
  const [downloadRequested,setDownloadRequested]=useState(false);
  useEffect(()=>{
    let active=true,url='';const controller=new AbortController();setPrepared(null);setError('');setStatus('');setDownloadRequested(false);
    void (async()=>{try{
      const [{quotePdf},logo,roof]=await Promise.all([import('@/lib/pdf'),fetch('/proposal/logo-transparent-v2.png',{signal:controller.signal}),fetch('/proposal/solar-roof.jpg',{signal:controller.signal})]);
      if(!logo.ok||!roof.ok)throw new Error('No se pudieron cargar los recursos de la propuesta.');
      const bytes=await quotePdf(quote,await logo.arrayBuffer(),{roof:await roof.arrayBuffer()});
      if(!active)return;
      const file=new File([bytes as BlobPart],`${quote.folio}.pdf`,{type:'application/pdf'});
      url=URL.createObjectURL(file);let native=false;
      try{native=!!navigator.share&&!!navigator.canShare?.({files:[file]})}catch{/* Download stays available. */}
      setPrepared({file,url,native});
    }catch{if(active)setError('No se pudo preparar el PDF. Reintenta la descarga.')}})();
    return()=>{active=false;controller.abort();if(url)URL.revokeObjectURL(url)};
  },[quote,retry]);
  const message=`Hola ${quote.input.customer.name}, comparto la propuesta ${quote.folio} de ${quote.settings.name}.${isIssued(quote)?'':' Es un borrador pendiente de validación.'}`;
  const chat=whatsappUrl(phone,message);
  async function shareFile(){
    if(!prepared)return;setError('');setStatus('');setSharing(true);
    try{
      // PDF is already ready: share runs directly from the click, preserving user activation.
      await navigator.share({files:[prepared.file],title:quote.folio});
      setStatus('El PDF se entregó al menú de compartir. Completa el envío en la aplicación elegida.');
    }catch(e){if((e as Error).name==='AbortError')setStatus('Compartir cancelado. El PDF sigue disponible.');else setError('El dispositivo no pudo compartir el archivo. Descárgalo y adjúntalo como documento en WhatsApp.')}finally{setSharing(false)}
  }
  return <Dialog open onOpenChange={open=>!open&&!sharing&&onClose()}><DialogContent className="document-share-dialog"><DialogHeader><DialogTitle>{whatsapp?'Propuesta para WhatsApp':'Compartir propuesta PDF'}</DialogTitle><DialogDescription>{whatsapp?'Envía el PDF completo al cliente siguiendo estos pasos.':'Elige una aplicación para compartir el archivo o descárgalo.'}</DialogDescription></DialogHeader>
    {!prepared&&!error&&<p role="status"><LoaderCircle className="animate-spin" size={20}/> Preparando PDF…</p>}
    {error&&<p role="alert" className="field-error">{error}</p>}
    {!prepared&&error&&<Button onClick={()=>setRetry(n=>n+1)}>Reintentar</Button>}
    {prepared&&<>
      <div className="document-share-file"><FileText size={28}/><div><strong>{prepared.file.name}</strong><small>Propuesta lista · PDF · {Math.max(1,Math.ceil(prepared.file.size/1024))} KB</small></div></div>
      {prepared.native&&<div className="document-share-native"><Button disabled={sharing} onClick={shareFile}><Share2/>{sharing?'Abriendo menú…':'Compartir PDF con una aplicación'}</Button><p>Si tienes WhatsApp instalado, selecciónalo en el menú y elige el contacto. Se comparte el archivo PDF.</p></div>}
      <div className="document-share-steps"><strong>Enviar por WhatsApp Web</strong><p className="document-share-notice">WhatsApp Web abre el chat sin archivos adjuntos. Debes agregar el PDF descargado antes de enviar.</p>
      <a className="document-download" href={prepared.url} download={prepared.file.name} onClick={()=>{setDownloadRequested(true);setStatus('Descarga solicitada. Comprueba que el PDF esté en Descargas antes de abrir el chat.')}}><Download size={18}/>{downloadRequested?'Volver a descargar PDF':'1. Descargar propuesta PDF'}</a>
      <label>Teléfono del cliente (opcional)<Input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+56 9 1234 5678"/></label>
      {chat?(downloadRequested?<a className="document-download secondary" href={chat} target="_blank" rel="noreferrer"><MessageCircle size={18}/>2. Abrir chat de WhatsApp</a>:<Button variant="outline" disabled><MessageCircle size={18}/>2. Abre el chat después de descargar</Button>):<p className="field-error">Revisa el teléfono y su código de país, o déjalo vacío para elegir el contacto en WhatsApp.</p>}
      <div className="document-share-attachment"><Paperclip size={20}/><div><strong>3. Adjunta la propuesta en el chat</strong><p>Pulsa <b>+ o el clip → Documento</b> y selecciona <b>{prepared.file.name}</b> en Descargas. Comprueba el adjunto y envíalo.</p></div></div></div>
    </>}
    {status&&<p role="status">{status}</p>}
  </DialogContent></Dialog>;
}
