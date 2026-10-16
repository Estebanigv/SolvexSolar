'use client';
import {CustomerBillReview} from '../../customer-bill-review';
import {customerReviewKey,needsCustomerReview} from '@/lib/customer-review';
import {ClientSelection} from '../../client-selection';
import {useState} from 'react';
import {EnergyPanel} from '../../energy-panel';
import {BillUpload,useBillAttachment} from '../../bill-upload';
import {newQuote,mergeQuotePatch} from '@/lib/quote';
import {autoFillBill} from '@/lib/bill-extraction';
import fixture from '@/tests/fixtures/pdf417.json';
import BillLiveScanner from '../../bill-live-scanner';

export default function Preview(){
 const [quote,setQuote]=useState(newQuote);
 const [live,setLive]=useState(false);
 const [clientId,setClientId]=useState<string|null>(null);
 const clients=[{id:'demo-1',owner:{id:'demo-owner',full_name:'Responsable de ejemplo',identification_color:'violet'},details:{...newQuote().customer,name:'Cliente Álvarez de prueba',email:'demo@example.com',phone:'+56 9 1234 5678'}}];
 const [diagnosticTexts,setDiagnosticTexts]=useState<string[]>([]);
 const bill=useBillAttachment(()=>{},extraction=>{const merged=autoFillBill(quote,extraction,{});setQuote(q=>mergeQuotePatch(q,merged.patch));return merged.result});
 const [accepted,setAccepted]=useState<string|null>(null);
 const reviewKey=customerReviewKey(quote.customer,bill.attachments,bill.result?.id??null);
 const pending=needsCustomerReview(reviewKey,accepted);
 function test(){const bytes=Uint8Array.from(atob(fixture.png),c=>c.charCodeAt(0));void bill.select([new File([bytes],'timbre-ficticio.png',{type:'image/png'})],true,true)}
 async function testDrop(){
  const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=1200;
  const context=canvas.getContext('2d')!;context.fillStyle='white';context.fillRect(0,0,1000,1200);context.fillStyle='black';context.font='22px Arial';
  const lines=['BOLETA DE PRUEBA - DATOS FICTICIOS','ENEL','Titular: Persona Ficticia','Dirección de suministro: Calle Ejemplo 100, Temuco','Total a pagar $ 80.000','Electricidad consumida (321 kWh)','Días facturados: 30','Tipo de tarifa contratada: BT1'];
  lines.forEach((line,index)=>context.fillText(line,40,60+index*90));
  const blob=await new Promise<Blob>(resolve=>canvas.toBlob(value=>resolve(value!),'image/png'));
  const transfer=new DataTransfer();transfer.items.add(new File([blob],'boleta-ficticia.png',{type:'image/png'}));
  const zone=document.querySelector('.bill-drop-zone')!;
  zone.dispatchEvent(new DragEvent('dragenter',{bubbles:true,cancelable:true,dataTransfer:transfer}));
  zone.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));
 }
 async function fixtureCamera(){
  const image=new Image();image.src=`data:image/png;base64,${fixture.png}`;await image.decode();
  const canvas=document.createElement('canvas');canvas.width=720;canvas.height=480;
  const context=canvas.getContext('2d')!;context.fillStyle='white';context.fillRect(0,0,720,480);context.drawImage(image,(720-image.width)/2,(480-image.height)/2);
  return canvas.captureStream(5);
 }
 return <main style={{maxWidth:1000,margin:'32px auto',padding:20}}><h1>Prueba local de lectura de boletas</h1><p>No guarda cotizaciones ni envía archivos.</p><button onClick={testDrop}>Probar arrastre con boleta ficticia</button><button onClick={test}>Leer timbre PDF417 de prueba</button><button onClick={()=>setLive(true)}>Probar cámara con PDF417 ficticio</button>{live&&<BillLiveScanner acquire={fixtureCamera} onClose={()=>setLive(false)} onPhoto={()=>setLive(false)} onDetected={(file,codes)=>{setLive(false);void bill.select([file],true,true,codes)}}/>}<section className="client-picker"><ClientSelection customer={quote.customer} clientId={clientId} clients={clients} onSelect={client=>{bill.clear();setClientId(client.id);setQuote(q=>({...q,customer:client.details}))}}/>{reviewKey&&<CustomerBillReview customer={quote.customer} checked={!pending} busy={bill.loading||bill.reading} progress={bill.loading?'Preparando archivos…':bill.progress} onChange={value=>setAccepted(value?reviewKey:null)} onEdit={()=>document.getElementById('dev-customer-name')?.focus()}/>}<button disabled={pending||bill.loading||bill.reading}>Guardar cliente (prueba sin persistencia)</button></section><label>Nombre para prueba local<input id="dev-customer-name" value={quote.customer.name} onChange={event=>setQuote(q=>({...q,customer:{...q.customer,name:event.target.value}}))}/></label><BillUpload bill={bill} quote={quote} onApply={patch=>setQuote(q=>mergeQuotePatch(q,patch))}/><EnergyPanel value={quote.energy} hasBill={bill.attachments.length>0&&!bill.reading} peakPower={0} onChange={energy=>setQuote(q=>({...q,energy}))}/><details><summary onClick={()=>setDiagnosticTexts(bill.getDiagnosticTexts())}>Texto OCR local para diagnóstico</summary>{diagnosticTexts.map((text,i)=><pre key={i} style={{whiteSpace:'pre-wrap'}}>{text}</pre>)}</details></main>;
}
