'use client';
import {useState} from 'react';
import {BillUpload,useBillAttachment} from '../../bill-upload';
import {newQuote,mergeQuotePatch} from '@/lib/quote';
import {autoFillBill} from '@/lib/bill-extraction';
import fixture from '@/tests/fixtures/pdf417.json';
import BillLiveScanner from '../../bill-live-scanner';

export default function Preview(){
 const [quote,setQuote]=useState(newQuote);
 const [live,setLive]=useState(false);
 const [diagnosticTexts,setDiagnosticTexts]=useState<string[]>([]);
 const bill=useBillAttachment(()=>{},extraction=>{const merged=autoFillBill(quote,extraction,{});setQuote(q=>mergeQuotePatch(q,merged.patch));return merged.result});
 function test(){const bytes=Uint8Array.from(atob(fixture.png),c=>c.charCodeAt(0));void bill.select([new File([bytes],'timbre-ficticio.png',{type:'image/png'})],true,true)}
 async function fixtureCamera(){
  const image=new Image();image.src=`data:image/png;base64,${fixture.png}`;await image.decode();
  const canvas=document.createElement('canvas');canvas.width=720;canvas.height=480;
  const context=canvas.getContext('2d')!;context.fillStyle='white';context.fillRect(0,0,720,480);context.drawImage(image,(720-image.width)/2,(480-image.height)/2);
  return canvas.captureStream(5);
 }
 return <main style={{maxWidth:1000,margin:'32px auto',padding:20}}><h1>Prueba local de lectura de boletas</h1><p>No guarda cotizaciones ni envía archivos.</p><button onClick={test}>Leer timbre PDF417 de prueba</button><button onClick={()=>setLive(true)}>Probar cámara con PDF417 ficticio</button>{live&&<BillLiveScanner acquire={fixtureCamera} onClose={()=>setLive(false)} onPhoto={()=>setLive(false)} onDetected={(file,codes)=>{setLive(false);void bill.select([file],true,true,codes)}}/>}<BillUpload bill={bill} quote={quote} onApply={patch=>setQuote(q=>mergeQuotePatch(q,patch))}/><details><summary onClick={()=>setDiagnosticTexts(bill.getDiagnosticTexts())}>Texto OCR local para diagnóstico</summary>{diagnosticTexts.map((text,i)=><pre key={i} style={{whiteSpace:'pre-wrap'}}>{text}</pre>)}</details></main>;
}
