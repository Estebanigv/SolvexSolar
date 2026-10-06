import assert from 'node:assert/strict';
import {calculate,newQuote,initialProducts,initialSettings,productSchema,reconcileQuoteProducts,quoteSchema,money} from '../lib/quote';
import {persistentQuote} from '../lib/quote-persistence';
import {paymentBreakdown} from '../lib/commercial';
import {proposalDiscount} from '../lib/proposal-document';
initialProducts.forEach(p=>productSchema.parse(p));
const q=newQuote(); const a=calculate(q,initialProducts,initialSettings);
assert.equal(a.panels,8); assert.equal(a.official,false); assert.equal(a.tax,null);
assert.ok(a.lines.some(l=>l.category==='PANEL FOTOVOLTAICO'&&l.total!>0));
const discounted=calculate({...q,discountPercent:undefined,discount:10000},initialProducts,initialSettings);
assert.equal(a.total-discounted.total,10000);
const missing=calculate({...q,quantities:{...q.quantities,'0-10':11}},initialProducts,initialSettings);
assert.equal(missing.complete,false);
const invalid=calculate({...q,discountPercent:undefined,discount:1e10},initialProducts,initialSettings);
assert.equal(invalid.complete,false);
const customRates=calculate(q,initialProducts,initialSettings,[{panels:8,price:123456,source:'Tarifa sintética de base de datos'}]);
assert.equal(customRates.lines.find(l=>l.id==='installation')?.total,123456);
console.log('Pruebas del catálogo de demostración: OK');
const original={...newQuote(),technicalReviewed:true,hiddenLineIds:['0-10','installation','extra']};
const frozenSnapshot=JSON.stringify(original),storedCalculation=JSON.stringify(calculate(original,initialProducts,initialSettings));
const remaining=initialProducts.filter(p=>p.id!=='0-10');
const cleaned=reconcileQuoteProducts(original,remaining);
assert.equal(cleaned.quantities['0-10'],undefined);
assert.equal(cleaned.technicalReviewed,false);
assert.deepEqual(cleaned.hiddenLineIds,['installation','extra']);
assert.equal(cleaned.quantities['0-13'],0,'Sin paneles, estructura se recalcula');
assert.equal(calculate(cleaned,remaining,initialSettings).complete,false,'Debe revisar y elegir panel de reemplazo');
assert.equal(JSON.stringify(original),frozenSnapshot,'La cotización original no se modifica');
assert.equal(JSON.stringify(calculate(original,initialProducts,initialSettings)),storedCalculation);
assert.throws(()=>calculate(original,remaining,initialSettings),/ya no está en el catálogo/,'El servidor sigue rechazando equipos retirados');
assert.equal(reconcileQuoteProducts(original,initialProducts),original,'Sin eliminaciones no cambia la revisión');
assert.doesNotThrow(()=>calculate(reconcileQuoteProducts(newQuote(),remaining),remaining,initialSettings),'Un nuevo borrador no vuelve a seleccionar equipos eliminados');
console.log('Eliminar equipo: borradores, totales, revisión e historial conservado: OK');

for(const taxMode of ['included','net','pending'] as const){
 const settings={...initialSettings,taxMode,paymentSchedule:[{label:'Anticipo',percent:33},{label:'Entrega',percent:67}]};
 const input={...newQuote(),discountPercent:10,showDiscount:true,extra:123.45,extraLabel:'Prueba de fracciones'};
 const baseline=calculate(input,initialProducts,settings);
 for(const amount of [1,5155000,baseline.total+999,baseline.total-321,1e10]){
  const manual={...input,finalTotalOverride:amount};
  const reopened=quoteSchema.parse(JSON.parse(JSON.stringify(persistentQuote(manual))));
  const c=calculate(reopened,initialProducts,settings);
  assert.equal(reopened.finalTotalOverride,amount,'El precio de cierre se conserva al reabrir');
  assert.equal(c.total,amount);
  assert.equal(c.calculatedTotal,baseline.total);
  assert.equal(c.totalAdjustment,amount-baseline.total);
  assert.deepEqual(c.lines,baseline.lines,'El cierre no altera costos ni cantidades');
  assert.equal(c.discount,baseline.discount,'El ajuste no reescribe el descuento pactado');
  assert.equal(c.net+(c.tax??0),amount,'Neto e IVA cuadran con el total final');
  assert.ok([c.subtotal,c.discount,c.net,c.tax??0,c.total].every(Number.isInteger));
  const payments=paymentBreakdown(c.total,settings);
  assert.equal(payments.reduce((sum,p)=>sum+p.amount,0),amount);
  assert.ok(payments.every(p=>Number.isInteger(p.amount)));
  const document=proposalDiscount({id:'test',folio:'TEST',date:'2026-10-06',input:manual,settings,calculation:c});
  if(document){assert.equal(document.amount,document.before-amount);assert.equal(document.percent,undefined,'No anunciar un porcentaje que cambió al negociar el total');}
  const restored=calculate({...reopened,finalTotalOverride:null},initialProducts,settings);
  assert.deepEqual(restored,baseline,'Restaurar devuelve el cálculo original');
 }
}
for(const value of [-1,0,1.5,Infinity,NaN,1e10+1])assert.equal(quoteSchema.safeParse({...q,finalTotalOverride:value}).success,false,'Rechazar totales inválidos en servidor');
assert.equal(money(5154907.49),money(5154907));
assert.equal(money(5154907.51),money(5154908));
console.log('Cierre editable: persistencia, pesos enteros, IVA, pagos, descuento y restauración: OK');
