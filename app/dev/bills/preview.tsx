'use client';
import {useState} from 'react';
import {BillUpload,useBillAttachment} from '../../bill-upload';
import {newQuote,mergeQuotePatch} from '@/lib/quote';
import {autoFillBill} from '@/lib/bill-extraction';
import fixture from '@/tests/fixtures/pdf417.json';

export default function Preview(){
 const [quote,setQuote]=useState(newQuote);
 const bill=useBillAttachment(()=>{},extraction=>{const merged=autoFillBill(quote,extraction,{});setQuote(q=>mergeQuotePatch(q,merged.patch));return merged.result});
 function test(){const bytes=Uint8Array.from(atob(fixture.png),c=>c.charCodeAt(0));void bill.select([new File([bytes],'timbre-ficticio.png',{type:'image/png'})],true,true)}
 return <main style={{maxWidth:1000,margin:'32px auto',padding:20}}><h1>Prueba local de lectura de boletas</h1><p>No guarda cotizaciones ni envía archivos.</p><button onClick={test}>Leer timbre PDF417 de prueba</button><BillUpload bill={bill} quote={quote} onApply={patch=>setQuote(q=>mergeQuotePatch(q,patch))}/></main>;
}
