import assert from 'node:assert/strict';
import {proposalReadingSections,proposalSentences} from '../lib/proposal-document';
import {customerTerms} from '../lib/commercial';
import {newQuote,initialSettings,initialProducts,calculate,type SavedQuote} from '../lib/quote';
const input={...newQuote(),notes:'Incluye paneles de 5.5 kWp. Excluye obras civiles. Sujeto a visita técnica. Condición especial acordada con el cliente.'};
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
