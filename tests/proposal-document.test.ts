import assert from 'node:assert/strict';
import {proposalDiscount,proposalLines,proposalEquipment,proposalReadingSections,proposalSentences} from '../lib/proposal-document';
import {customerTerms} from '../lib/commercial';
import {newQuote,initialSettings,initialProducts,calculate,quoteSchema,type SavedQuote} from '../lib/quote';
const input={...newQuote(),roundFinalTotal:undefined,notes:'Incluye paneles de 5.5 kWp. Excluye obras civiles. Sujeto a visita técnica. Condición especial acordada con el cliente.'};
const settings={...initialSettings,warranty:'1 año de garantía de instalación: reparación sin costo.\nGarantía del fabricante: 15 años para paneles fotovoltaicos. Servicio postventa: soporte según contrato. La garantía de baterías se confirmará por modelo. Condición particular de cobertura.',terms:'Precios con IVA incluidos. Vigencia de la oferta: 10 días. Formas de pago: transferencia. Anticipo 20%, entrega 80%. Incluye los equipos y cantidades detallados en esta propuesta. Baterías y otros equipos solo cuando figuran en el detalle. Traslados especiales se cobran aparte. El alcance se acuerda tras la visita técnica. Descuento especial de 2.5%.'};
const quote:SavedQuote={id:'layout-check',folio:'CHECK',date:'2026-09-29T12:00:00Z',input,settings,calculation:calculate(input,initialProducts,settings)};
const before=JSON.stringify(quote),sections=proposalReadingSections(quote);
for(const [key,source] of [['warranty',settings.warranty],['scope',input.notes],['commercial',customerTerms(input,settings)]] as const){
 assert.deepEqual(sections[key].flatMap(g=>g.items).sort(),proposalSentences(source).sort(),'Cada cláusula debe permanecer completa y una sola vez');
}
assert.equal(JSON.stringify(quote),before);
assert.equal(sections.scope.find(g=>g.title==='No incluye')?.items[0],'Excluye obras civiles.');
assert.ok(sections.scope.find(g=>g.title==='Incluye')?.items[0].includes('5.5 kWp'));
assert.ok(sections.commercial.find(g=>g.title==='Otras condiciones')?.items[0].includes('2.5%'));
const hidden=proposalReadingSections({...quote,input:{...input,showItemDetails:false}});
assert.ok(!hidden.commercial.flatMap(g=>g.items).join(' ').includes('detallados en esta propuesta'));
assert.ok(hidden.commercial.flatMap(g=>g.items).join(' ').includes('configuración cotizada'));
const empty=proposalReadingSections({...quote,settings:{...settings,warranty:'',terms:''},input:{...input,notes:''}});
assert.ok(empty.warranty[0].items[0].includes('pendientes'));
assert.ok(empty.scope[0].items[0].includes('pendiente'));
console.log('Propuesta: cláusulas completas, agrupación, decimales, condiciones personalizadas y detalle oculto: OK');

const hiddenId='0-35';
assert.ok(quote.calculation.lines.some(line=>line.id===hiddenId));
const selectiveInput={...input,hiddenLineIds:[hiddenId]};
const reopened=quoteSchema.parse(JSON.parse(JSON.stringify(selectiveInput)));
assert.deepEqual(reopened.hiddenLineIds,[hiddenId],'La selección se conserva al guardar y reabrir');
const selectiveQuote={...quote,input:reopened};
assert.ok(!proposalLines(selectiveQuote).some(line=>line.id===hiddenId));
assert.equal(proposalLines(selectiveQuote).length,quote.calculation.lines.length-1);
assert.deepEqual(calculate(reopened,initialProducts,settings),quote.calculation,'Ocultar un ítem no cambia importes ni validaciones');
assert.deepEqual(proposalLines({...selectiveQuote,input:{...reopened,showItemDetails:false}}),[],'El control global prevalece');
assert.deepEqual(proposalLines({...selectiveQuote,input:{...reopened,hiddenLineIds:[]}}),quote.calculation.lines,'Volver a marcar restaura el detalle');
assert.deepEqual(proposalLines(quote),quote.calculation.lines,'Las cotizaciones anteriores mantienen todos sus ítems');
assert.equal(quoteSchema.safeParse({...input,hiddenLineIds:[42]}).success,false);
assert.ok(proposalEquipment({...quote,input:{...input,hiddenLineIds:['0-10']}}).some(row=>row.kind==='panels'),'El nuevo resumen siempre informa los equipos cotizados');
assert.ok(customerTerms(reopened,settings).includes('configuración cotizada'));
assert.equal(JSON.stringify(quote),before,'No se modifica el cálculo ni la cotización original');
console.log('Detalle por ítem: persistencia, compatibilidad, importes y restauración: OK');

for(const taxMode of ['net','included','pending'] as const){
 const config={...settings,taxMode};
 const discountedInput={...input,discountPercent:10,showDiscount:true};
 const discounted={...quote,input:discountedInput,settings:config,calculation:calculate(discountedInput,initialProducts,config)};
 const display=proposalDiscount(discounted)!;
 assert.equal(display.percent,10);
 assert.equal(display.before,calculate({...discountedInput,discountPercent:0},initialProducts,config).total);
 assert.equal(display.amount,display.before-discounted.calculation.total,'El ahorro compara precios finales con el mismo IVA y redondeo');
 const hiddenInput={...discountedInput,showDiscount:false};
 assert.equal(proposalDiscount({...discounted,input:hiddenInput}),null);
 assert.deepEqual(calculate(hiddenInput,initialProducts,config),discounted.calculation,'La visibilidad nunca cambia precio ni pagos');
 const reopened=quoteSchema.parse(JSON.parse(JSON.stringify(discountedInput)));
 assert.equal(reopened.showDiscount,true,'La opción se conserva al guardar y reabrir');
 assert.equal(proposalDiscount({...discounted,input:{...discountedInput,showDiscount:undefined}}),null,'Cotizaciones antiguas no exponen descuentos sin optar por ello');
 assert.equal(proposalDiscount({...discounted,calculation:calculate({...discountedInput,discountPercent:0},initialProducts,config)}),null,'No destacar un descuento de cero');
}
console.log('Descuento al cliente: visibilidad, persistencia y montos con IVA y redondeo: OK');
