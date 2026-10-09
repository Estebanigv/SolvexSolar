import assert from 'node:assert/strict';
import {calculate,newQuote,initialProducts,initialSettings,quoteSchema,roundCommercialTotal,type SavedQuote} from '../lib/quote';
import {paymentBreakdown} from '../lib/commercial';
import {persistentQuote} from '../lib/quote-persistence';
import {documentTitle,documentFolio,isIssued,issuanceProblems} from '../lib/quote-issuance';
import {proposalCanvases} from '../lib/proposal-canvas';
import {quotePdf} from '../lib/pdf';
import {PDFDocument} from 'pdf-lib';

async function run(){
 assert.equal(roundCommercialTotal(6003000),6000000);
 assert.equal(roundCommercialTotal(6004999),6000000);
 assert.equal(roundCommercialTotal(6005000),6010000);
 assert.equal(roundCommercialTotal(6000000),6000000);
 assert.equal(roundCommercialTotal(1),10000);
 assert.equal(roundCommercialTotal(0),0);
 const input=newQuote();assert.equal(input.roundFinalTotal,true);
 for(const taxMode of ['included','net','pending'] as const){
  const settings={...initialSettings,taxMode,paymentSchedule:[{label:'Anticipo',percent:20},{label:'Inicio',percent:30},{label:'Entrega',percent:50}]};
  for(const finalTotalOverride of [null,6003000,6005000,6000000]){
   const updated={...input,finalTotalOverride};
   const restored=quoteSchema.parse(JSON.parse(JSON.stringify(persistentQuote(updated))));
   const rounded=calculate(restored,initialProducts,settings);
   const legacy=calculate({...restored,roundFinalTotal:undefined},initialProducts,settings);
   assert.equal(rounded.total%10000,0);
   assert.equal(rounded.total,roundCommercialTotal(legacy.total));
   assert.deepEqual(rounded.lines,legacy.lines,'Redondear el cierre no altera costos ni cantidades');
   assert.equal(rounded.calculatedTotal,legacy.calculatedTotal);
   assert.equal(rounded.net+(rounded.tax??0),rounded.total);
   assert.equal(rounded.totalAdjustment,rounded.total-rounded.calculatedTotal!);
   assert.equal(paymentBreakdown(rounded.total,settings).reduce((sum,p)=>sum+p.amount,0),rounded.total);
   if(finalTotalOverride!==null)assert.equal(legacy.total,finalTotalOverride,'Los importes históricos se mantienen');
  }
 }
 const settings={...initialSettings,taxMode:'included' as const};
 const q:SavedQuote={id:'draft',folio:'BORRADOR-SVX',date:'2026-10-09',input,settings,calculation:calculate(input,initialProducts,settings)};
 const before=JSON.stringify(q);
 for(const proposalType of ['preliminary','final'] as const){
  const draft={...q,input:{...input,proposalType}};
  const text=proposalCanvases(draft).flatMap(p=>p.ops).filter(op=>op.kind==='text').map(op=>op.text).join(' ');
  assert.doesNotMatch(text,/borrador/i,'Ningún encabezado o pie del documento muestra Borrador');
  assert.equal(documentFolio(draft),'');
  assert.notEqual(documentTitle(draft),'BORRADOR');
  assert.equal(isIssued(draft),false);
  assert.ok(issuanceProblems(draft).length,'La presentación no omite validaciones de emisión');
  const pdf=await PDFDocument.load(await quotePdf(draft));
  assert.doesNotMatch(pdf.getTitle()??'',/borrador/i);
  assert.ok(pdf.getPageCount()>0);
 }
 const issued={...q,id:'saved',folio:'SVX-2026-000123',issuedAt:'2026-10-09T12:00:00Z'};
 assert.equal(documentFolio(issued),'SVX-2026-000123');
 assert.equal(documentTitle(issued),'COTIZACIÓN');
 assert.equal(JSON.stringify(q),before,'La visualización no modifica la versión guardada');
 console.log('Cierre comercial: $10.000, IVA, pagos, persistencia, legado y documentos sin Borrador: OK');
}
void run();
