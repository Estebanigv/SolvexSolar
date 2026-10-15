import assert from 'node:assert/strict';
import {newQuote,initialProducts,initialSettings,calculate,type SavedQuote} from '../lib/quote';
import {proposalCanvases} from '../lib/proposal-canvas';
import {proposalLayout} from '../lib/proposal-layout';
import {proposalDiscount} from '../lib/proposal-document';
import {paymentSchedulePreset,customerTerms,customerDocumentSettings,paymentBreakdown} from '../lib/commercial';

const input={...newQuote(),discountPercent:30,showDiscount:true,customer:{...newQuote().customer,name:'Cliente de prueba',commune:'Santiago'}};
const settings={...initialSettings,taxMode:'included' as const,paymentSchedule:[{label:'Anticipo',percent:20},{label:'Inicio de obras',percent:30},{label:'Entrega',percent:50}],
 terms:'Formas de pago: transferencia. Anticipo 20%, inicio de obras 30% y entrega 50%. '+('Condiciones de ejemplo: el alcance se valida en terreno y se confirma por escrito. '.repeat(8)),
 warranty:'Garantía de ejemplo: se cubren las fallas indicadas en el contrato del proyecto. '.repeat(8)};
const q:SavedQuote={id:'pagination-test',folio:'TEST',date:'2026-10-14',input,settings,calculation:{...calculate(input,initialProducts,settings),subtotal:5154907,total:3610000,discount:1546472,totalAdjustment:1565}};
const snapshot=JSON.stringify(q),pages=proposalCanvases(q);
const text=(p:typeof pages[number])=>p.ops.filter(o=>o.kind==='text').map(o=>o.text).join(' ');
const cover=pages[0],discount=proposalDiscount(q)!;
assert.equal(discount.effectivePercent,29.97);
assert.equal(discount.amount,1544907);
assert.ok(text(cover).includes('29,97% efectivo'));
assert.ok(text(cover).includes('Precio anterior: $5.154.907 · Total final: $3.610.000'));
assert.equal(pages.filter(p=>p.sourcePage==='cover').length,1,'El descuento normal no genera una hoja de continuación');
assert.ok(pages.length<=4,'Las cláusulas y notas habituales se distribuyen sin hojas casi vacías');
const compact=(s:string)=>s.replace(/\s+/g,' ').trim();
for(const page of proposalLayout(q))for(const block of page.blocks.filter(b=>b.kind==='text')){
 const actual=pages.flatMap(p=>p.ops).filter(o=>o.kind==='text'&&o.elementId===`${block.id}:body`).map(o=>o.kind==='text'?o.text:'').join(' ');
 assert.equal(compact(actual),compact(block.body),`Se conserva el texto completo de ${block.id}`);
}
for(const page of pages){assert.deepEqual(page.issues,[]);for(const op of page.ops)if(op.kind==='text')assert.ok(op.y<=577&&op.y-op.size>=0);}
const hidden=proposalCanvases({...q,input:{...input,showDiscount:false}});
assert.ok(!hidden.flatMap(p=>p.ops).some(o=>o.elementId?.startsWith('discount:')));
const paymentInput={...input,documentPaymentSchedule:[{label:'Pago único',percent:100}]};
const terms=customerTerms(paymentInput,settings);
assert.ok(terms.includes('Pago único 100%'));
assert.ok(!terms.includes('Anticipo 20%'));
assert.ok(terms.endsWith(settings.terms.slice(settings.terms.indexOf('Condiciones'))));
assert.equal(customerTerms({...paymentInput,documentTerms:'Reserva especial 20%. Saldo según acta.'},settings),'Reserva especial 20%. Saldo según acta.','No reescribir acuerdos personalizados');
const document=customerDocumentSettings(paymentInput,settings);
assert.deepEqual(paymentBreakdown(q.calculation.total,document),[{label:'Pago único',percent:100,amount:3610000}]);
assert.equal(JSON.stringify(q),snapshot,'Rediagramar no modifica el snapshot ni importes emitidos');
console.log('Minuta: descuento integrado, porcentaje efectivo, cláusulas completas y pagos coherentes: OK');

for(const count of [2,3] as const){
 const schedule=paymentSchedulePreset(count);
 assert.equal(schedule.length,count);
 assert.deepEqual(schedule.map(p=>p.percent),count===2?[50,50]:[20,30,50]);
 const configuration=customerDocumentSettings({...input,documentPaymentSchedule:schedule},settings);
 assert.equal(paymentBreakdown(1234567,configuration).reduce((sum,p)=>sum+p.amount,0),1234567);
 assert.ok(customerTerms({...input,documentPaymentSchedule:schedule},settings).includes(`Anticipo ${schedule[0].percent}%`));
}
assert.equal(proposalLayout(q)[0].blocks.find(b=>b.id==='discount')?.title,'Descuento para tu proyecto · 29,97%');
