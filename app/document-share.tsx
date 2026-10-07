'use client';
import {useEffect,useState} from 'react';
import {Download,LoaderCircle,Share2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {isIssued} from '@/lib/quote-issuance';

import {whatsappUrl} from '@/lib/document-share';
import type {SavedQuote} from '@/lib/quote';

export function DocumentShare({quote,whatsapp,onClose}:{quote:SavedQuote;whatsapp:boolean;onClose:()=>void}){
  const [prepared,setPrepared]=useState<{file:File;url:string;native:boolean}|null>(null),[error,setError]=useState(''),[status,setStatus]=useState(''),[sharing,setSharing]=useState(false),[retry,setRetry]=useState(0),[phone,setPhone]=useState(quote.input.customer.phone);
  useEffect(()=>{
    let active=true,url='';const controller=new AbortController();setPrepared(null);setError('');
    void (async()=>{try{
      const [{quotePdf},logo]=await Promise.all([import('@/lib/pdf'),fetch('/proposal/logo-transparent-v2.png',{signal:controller.signal})]);
      const bytes=await quotePdf(quote,logo.ok?await logo.arrayBuffer():undefined);
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
  return <Dialog open onOpenChange={open=>!open&&onClose()}><DialogContent className="document-share-dialog"><DialogHeader><DialogTitle>{whatsapp?'Enviar documento por WhatsApp':'Compartir documento PDF'}</DialogTitle><DialogDescription>Prepara el archivo y completa el envío en la aplicación elegida.</DialogDescription></DialogHeader>
    {!prepared&&!error&&<p role="status"><LoaderCircle className="animate-spin" size={20}/> Preparando PDF…</p>}
    {error&&<p role="alert" className="field-error">{error}</p>}
    {!prepared&&error&&<Button onClick={()=>setRetry(n=>n+1)}>Reintentar</Button>}
    {prepared&&<>
      <p><strong>{prepared.file.name}</strong><br/><small>PDF listo · {Math.max(1,Math.ceil(prepared.file.size/1024))} KB</small></p>
      {prepared.native&&<><Button disabled={sharing} onClick={shareFile}><Share2/>{sharing?'Abriendo menú…':'Compartir PDF'}</Button><p>Elige WhatsApp y selecciona el contacto. El archivo irá adjunto al menú de compartir.</p></>}
      <div className="document-share-steps"><strong>{prepared.native?'También puedes enviarlo manualmente':'Enviar desde este navegador'}</strong><ol><li>Descarga el PDF.</li><li>Abre el chat de WhatsApp.</li><li>En WhatsApp, pulsa <strong>+ o el clip → Documento</strong>, selecciona el PDF descargado y envíalo.</li></ol>
      <a className="document-download" href={prepared.url} download={prepared.file.name} onClick={()=>setStatus('Descarga solicitada. Busca el PDF en Descargas y adjúntalo en WhatsApp.')}><Download size={18}/>1. Descargar PDF</a>
      <label>Teléfono del cliente (opcional)<Input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+56 9 1234 5678"/></label>
      {chat?<a className="document-download secondary" href={chat} target="_blank" rel="noreferrer">2. Abrir WhatsApp{phone.trim()?' con el cliente':''}</a>:<p className="field-error">Revisa el teléfono y su código de país, o déjalo vacío para elegir el contacto en WhatsApp.</p>}
      <p className="help-text">Abrir el chat no adjunta el PDF automáticamente. El envío se completa dentro de WhatsApp.</p></div>
    </>}
    {status&&<p role="status">{status}</p>}
  </DialogContent></Dialog>;
}
