import assert from 'node:assert/strict';
import {calculate,newQuote,initialProducts,initialSettings,quoteSchema,settingsSchema} from '../lib/quote';
import {paymentBreakdown,roiReference,netbillingScope,proposalTitle,assignedAdviser} from '../lib/commercial';
import {workflowReadiness} from '../lib/workflow';
import {newEnergyInput} from '../lib/energy';

const q=newQuote();
const settings={...initialSettings,taxMode:'included' as const,paymentSchedule:[{label:'Anticipo',percent:20},{label:'Inicio',percent:30},{label:'Entrega',percent:50}],advisers:[{id:'sample',name:'Ejemplo',email:'test@example.com',phone:''}],netbillingTerms:'Certificación incluida para sistemas conectados.'};
const base=calculate(q,initialProducts,settings);
for(const percent of [0,1,30]){
 const c=calculate({...q,discountPercent:percent},initialProducts,settings);
 assert.equal(c.discount,Math.round(base.subtotal*percent/100));
 assert.equal(c.net+c.tax!,c.total);
 assert.equal(c.total,base.subtotal-c.discount,'No agregar IVA nuevamente');
}
for(const percent of [-1,1.5,31,Infinity])assert.equal(quoteSchema.safeParse({...q,discountPercent:percent}).success,false);
assert.equal(paymentBreakdown(100003,settings).reduce((s,r)=>s+r.amount,0),100003,'Redondeos concilian con total');
assert.equal(settingsSchema.safeParse({...settings,paymentSchedule:[{label:'Mal',percent:20}]}).success,false);
assert.ok(calculate({...q,proposalType:'final'},initialProducts,settings).warnings.some(w=>w.includes('revisión técnica')));
assert.ok(!base.warnings.some(w=>w.includes('revisión técnica')));
assert.equal(proposalTitle(q,true),'PRECOTIZACIÓN');
assert.equal(proposalTitle({...q,proposalType:undefined},true),'COTIZACIÓN','Historial anterior mantiene su tipo');
assert.equal(netbillingScope({...q,system:'OFF GRID'},settings),'');
assert.equal(assignedAdviser({...q,adviserId:'sample'},settings)?.email,'test@example.com');
assert.ok(calculate({...q,adviserId:'deleted'},initialProducts,settings).warnings.some(w=>w.includes('comercial vigente')));
const complete={...q,customer:{name:'Ejemplo',email:'test@example.com',phone:'+56900000000',region:'Región',commune:'Comuna',address:'',bill:1000},energy:{...newEnergyInput(),consumptionKwh:100,billingDays:30,billReviewed:true}};
assert.equal(workflowReadiness(complete,initialProducts,calculate(complete,initialProducts,settings)).review,true);
assert.equal(workflowReadiness({...complete,proposalType:'final'},initialProducts,base).review,false);
// Synthetic reference data exercise the formula without publishing the client's table.
const reference={...settings,roiReference:{source:'Fixture',panelWatts:585,monthlyByPanels:[{panels:base.panels,amount:100}]}};
const calc={...base,panelWatts:[585],total:12000};
assert.equal(roiReference(q,calc,reference)?.years,10);
assert.equal(roiReference({...q,customer:{...q.customer,bill:90}},calc,reference)?.exceedsBill,true);
assert.equal(roiReference(q,{...calc,panelWatts:[620]},reference),null);
assert.equal(roiReference(q,{...calc,panelWatts:[585,620]},reference),null);
assert.equal(roiReference(q,{...calc,panels:99},reference),null);
assert.equal(roiReference(q,{...calc,complete:false},reference),null);
assert.equal(roiReference(q,{...calc,total:0},reference),null);
console.log('Condiciones comerciales: descuentos, IVA, pagos, etapas, contactos y referencia ROI: OK');

// International WhatsApp URLs, local Chilean mobile numbers and invalid destinations.
import {whatsappNumber,whatsappUrl} from '../lib/document-share';
assert.equal(whatsappNumber('+56 9 1234 5678'),'56912345678');
assert.equal(whatsappNumber('9 1234 5678'),'56912345678');
assert.equal(whatsappNumber('0056 9 1234 5678'),'56912345678');
assert.equal(whatsappNumber(''), '');
assert.equal(whatsappNumber('abc123'),null);
assert.equal(whatsappUrl('123','Hola'),null);
assert.equal(whatsappUrl('','Hola & propuesta'),'https://wa.me/?text=Hola%20%26%20propuesta');

import {customerTerms} from '../lib/commercial';
const summaryQuote={...q,showItemDetails:false};
assert.equal(quoteSchema.parse(JSON.parse(JSON.stringify(summaryQuote))).showItemDetails,false,'La preferencia sobrevive al guardado');
assert.equal(quoteSchema.parse({...q,showItemDetails:undefined}).showItemDetails,undefined,'Cotizaciones anteriores siguen siendo compatibles');
assert.deepEqual(calculate(summaryQuote,initialProducts,settings),base,'Ocultar el detalle no altera importes ni validaciones');
const termsSettings={...settings,terms:'Vigencia: 10 días. Incluye los equipos y cantidades detallados en esta propuesta. Baterías cuando figuran en el detalle. El alcance y los plazos de ejecución se acuerdan tras la visita técnica. Garantía: 1 año.'};
assert.equal(customerTerms(summaryQuote,termsSettings),'Vigencia: 10 días. Incluye los equipos y cantidades de la configuración cotizada. Baterías cuando forman parte de la configuración cotizada. El alcance se acuerda tras la visita técnica. Garantía: 1 año.');
assert.ok(customerTerms(q,termsSettings).includes('detallados en esta propuesta'));
assert.equal(termsSettings.terms.includes('plazos de ejecución'),true,'No modifica la configuración histórica');
