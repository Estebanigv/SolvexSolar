"use client";
import {useEffect, useRef, useState} from 'react';
import {Upload, Camera, FileText, Eye, Trash2, RotateCw, ScanText, LoaderCircle, X, ScanBarcode} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription} from '@/components/ui/dialog';
import {validateBillFile,validateBillBatch,maxBillFiles} from '@/lib/bill-file';
import type {BillDocument,BillReadCache} from '@/lib/bill-reader';
import type {BillExtraction} from '@/lib/bill-extraction';
import type {QuoteInput} from '@/lib/quote';
import {BillReview} from './bill-review';
import dynamic from 'next/dynamic';
const BillPdfPreview=dynamic(()=>import('./bill-pdf-preview'),{ssr:false,loading:()=> <p role="status">Cargando visor de boletas…</p>});

export function useBillAttachment(onDocumentChange:()=>void,onRead:(result:BillExtraction)=>BillExtraction){
 const [attachments,setAttachments]=useState<BillDocument[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(false),[reading,setReading]=useState(false),[progress,setProgress]=useState(''),[result,setResult]=useState<(BillExtraction&{id:number})|null>(null);
 const list=useRef<BillDocument[]>([]),generation=useRef(0),selection=useRef(0),control=useRef<AbortController|null>(null),urls=useRef(new Set<string>()),change=useRef(onDocumentChange);change.current=onDocumentChange;
 const readCache=useRef<BillReadCache>(new Map());
 const completeRead=useRef(onRead);completeRead.current=onRead;
 useEffect(()=>()=>{selection.current++;generation.current++;control.current?.abort();urls.current.forEach(url=>URL.revokeObjectURL(url));urls.current.clear()},[]);
 function cancel(){generation.current++;control.current?.abort();setReading(false);setProgress('Lectura cancelada. Puedes volver a intentarlo o completar los datos manualmente.');setResult(null)}
 async function read(documents=list.current,refresh=false){
  if(refresh)readCache.current.clear();
  cancel();if(!documents.length)return;const id=++generation.current;const controller=new AbortController();control.current=controller;setReading(true);setError('');setProgress('Preparando documentos…');
  const timeout=setTimeout(()=>controller.abort(),Math.min(600000,Math.max(180000,documents.length*90000)));
  try{const {readBills}=await import('@/lib/bill-reader');controller.signal.throwIfAborted();const extraction=await readBills(documents,controller.signal,message=>{if(id===generation.current)setProgress(message)},readCache.current);if(id===generation.current){const completed=completeRead.current(extraction);setResult({...completed,id});setProgress(completed.autoApplied?.length?`Lectura terminada. ${completed.autoApplied.length} datos cargados automáticamente.`:'Lectura terminada. Revisa los campos pendientes o los datos que ya estaban ingresados.')}}
  catch{if(id===generation.current)setError(controller.signal.aborted?'La lectura tardó demasiado. Intenta una cara a la vez o una imagen más nítida.':'No se pudo iniciar el lector. Comprueba la conexión para cargarlo o completa los datos manualmente.')}
  finally{clearTimeout(timeout);if(id===generation.current)setReading(false)}
 }
 function changeList(next:BillDocument[]){list.current=next;setAttachments(next);change.current();void read(next)}
 async function select(files:File[],replace=false,codeOnly=false){
  if(!files.length)return;const id=++selection.current;setLoading(true);setError('');
  try{
   const base=replace?[]:list.current;validateBillBatch([...base.map(x=>x.file),...files]);
   const formats=await Promise.all(files.map(validateBillFile));if(id!==selection.current)return;
   const added=files.map((file,i)=>{const url=URL.createObjectURL(new Blob([file],{type:formats[i]}));urls.current.add(url);return {id:crypto.randomUUID(),file,url,mime:formats[i],rotation:0,codeOnly}});
   if(replace)list.current.forEach(doc=>{URL.revokeObjectURL(doc.url);urls.current.delete(doc.url)});
   changeList([...base,...added]);
  }catch(e){if(id===selection.current)setError((e as Error).message)}finally{if(id===selection.current)setLoading(false)}
 }
 function remove(id:string){const old=list.current.find(d=>d.id===id);if(old){URL.revokeObjectURL(old.url);urls.current.delete(old.url)}changeList(list.current.filter(d=>d.id!==id))}
 function rotate(id:string){changeList(list.current.map(d=>d.id===id?{...d,rotation:(d.rotation+90)%360}:d))}
 function clear(){readCache.current.clear();selection.current++;cancel();urls.current.forEach(url=>URL.revokeObjectURL(url));urls.current.clear();list.current=[];setAttachments([]);setError('');setLoading(false);setProgress('');change.current()}
 return {attachments,error,loading,reading,progress,result,select,remove,rotate,clear,cancel,read};
}

export function BillUpload({bill,quote,onApply}:{bill:ReturnType<typeof useBillAttachment>;quote:QuoteInput;onApply:(patch:Partial<QuoteInput>)=>void}){
 const input=useRef<HTMLInputElement>(null),camera=useRef<HTMLInputElement>(null),codeCamera=useRef<HTMLInputElement>(null),replace=useRef(false);const [preview,setPreview]=useState<string|null>(null);
 const {attachments,error,loading,reading}=bill;const selected=attachments.find(d=>d.id===preview);
 function pick(replaceAll=false){replace.current=replaceAll;input.current?.click()}
 return <section className="bill-upload" aria-labelledby="bill-upload-title">
  <div className="bill-upload-heading"><span className="bill-symbol"><ScanText size={24}/></span><div><h3 id="bill-upload-title">Escanea la boleta del cliente</h3><p>Adjunta el frente, el reverso y los acercamientos que necesites de la misma boleta. Leemos los datos del cliente, la ubicación, el monto y el consumo.</p></div></div>
  <input ref={input} className="sr-only" tabIndex={-1} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" aria-label="Seleccionar fotos o PDF de la boleta" onChange={e=>{void bill.select(Array.from(e.target.files??[]),replace.current);e.target.value=''}}/>
  <input ref={camera} className="sr-only" tabIndex={-1} type="file" accept="image/jpeg,image/png" capture="environment" aria-label="Fotografiar boleta con cámara" onChange={e=>{void bill.select(Array.from(e.target.files??[]));e.target.value=''}}/>
  <input ref={codeCamera} className="sr-only" tabIndex={-1} type="file" accept="image/jpeg,image/png" capture="environment" aria-label="Fotografiar código de barras o QR" onChange={e=>{void bill.select(Array.from(e.target.files??[]),false,true);e.target.value=''}}/>
  <div className="bill-capture-actions"><Button disabled={loading||attachments.length>=maxBillFiles} onClick={()=>camera.current?.click()}><Camera/>Tomar foto</Button><Button variant="outline" disabled={loading||attachments.length>=maxBillFiles} onClick={()=>pick()}><Upload/>{attachments.length?'Agregar fotos o PDF':'Adjuntar boleta'}</Button><Button variant="outline" disabled={loading||attachments.length>=maxBillFiles} onClick={()=>codeCamera.current?.click()}><ScanBarcode/>Escanear código</Button></div>
  <p className="bill-capture-hint">{attachments.length} de {maxBillFiles} archivos · PDF, JPG o PNG · 10 MB por archivo · 40 MB en total. En el celular, “Tomar foto” abre la cámara si el dispositivo lo permite. “Escanear código” lee una foto cercana del código de barras, QR o timbre PDF417. Adjunta también la boleta completa para leer todos los datos.</p>
  {attachments.map((doc,i)=><div className="bill-document" key={doc.id}><button className="bill-thumbnail" type="button" onClick={()=>setPreview(doc.id)} aria-label={`Ver documento ${i+1}`}>{doc.mime==='application/pdf'?<FileText size={27}/>:<img src={doc.url} alt={`Foto ${i+1} de la boleta`} style={{transform:`rotate(${doc.rotation}deg)`}}/>}</button><div className="bill-document-name"><strong>Documento {i+1}</strong><span>{doc.file.name}</span></div><div className="bill-document-actions"><Button variant="ghost" aria-label={`Ver documento ${i+1}`} onClick={()=>setPreview(doc.id)}><Eye/></Button>{doc.mime!=='application/pdf'&&<Button variant="ghost" aria-label={`Girar documento ${i+1}`} onClick={()=>bill.rotate(doc.id)} disabled={loading}><RotateCw/></Button>}<Button variant="ghost" aria-label={`Quitar documento ${i+1}`} onClick={()=>bill.remove(doc.id)} disabled={loading}><Trash2/></Button></div></div>)}
  {attachments.length>0&&<div className="bill-secondary-actions"><Button variant="link" disabled={loading} onClick={()=>pick(true)}>Reemplazar documentos</Button>{!reading&&<Button variant="outline" disabled={loading} onClick={()=>void bill.read(undefined,true)}><ScanText/>Volver a leer</Button>}</div>}
  {bill.progress&&<div className="bill-reading" role="status" aria-live="polite">{reading&&<LoaderCircle size={18} className="animate-spin"/>}<span>{bill.progress}</span>{reading&&<Button variant="ghost" onClick={bill.cancel}><X/>Cancelar</Button>}</div>}
  {error&&<p className="field-error" role="alert">{error}</p>}
  {bill.result&&!reading&&<BillReview key={bill.result.id} result={bill.result} quote={quote} onApply={onApply} disabled={loading}/>}
  <p className="bill-local-note">La lectura se realiza en este dispositivo. Las fotos y el PDF no se envían a un servicio de OCR. Para conservarlos, guarda la cotización y pulsa “Guardar boletas en esta cotización”. Sin ese respaldo, se pierden al recargar. Adjunta solo documentos de la misma boleta para evitar mezclar clientes o períodos. Usa buena luz y procura que la boleta quede plana.</p>
  <Dialog open={!!selected} onOpenChange={open=>!open&&setPreview(null)}><DialogContent className="bill-preview-dialog"><DialogHeader><DialogTitle>Boleta del cliente</DialogTitle><DialogDescription>{selected?.file.name}</DialogDescription></DialogHeader>{selected&&(selected.mime==='application/pdf'?<BillPdfPreview key={selected.url} file={selected.file}/>:<div className="bill-image-preview"><img src={selected.url} alt="Boleta de electricidad adjunta" style={{transform:`rotate(${selected.rotation}deg)`}}/></div>)}</DialogContent></Dialog>
 </section>;
}
