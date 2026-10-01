import assert from 'node:assert/strict';
import {calculate,newQuote,initialSettings,panelQuantities,systems,type Product} from '../lib/quote';
import {proposalEquipment} from '../lib/proposal-document';
import {workflowReadiness} from '../lib/workflow';
const template=(system:Product['system']):Product[]=>[
 {id:'panel',system,category:'PANEL FOTOVOLTAICO',name:'Panel 585 W Modelo QA',price:100,unit:'panel',watts:585,source:'Synthetic'},
 {id:'roof',system,category:'MATERIAL DE TECHO',name:'Teja QA',price:20,unit:'unidad',watts:null,source:'Synthetic'},
 {id:'structure',system,category:'TIPO DE ESTRUCTURA',name:'Estructura a piso QA',price:30,unit:'unidad por confirmar',watts:null,source:'Synthetic'},
 {id:'inverter',system,category:'INVERSOR',name:'Inversor Modelo QA',price:200,unit:'unidad',watts:1000,source:'Synthetic'},
 {id:'battery',system,category:'BATERÍA',name:'Batería de litio Modelo QA',price:300,unit:'unidad',watts:null,source:'Synthetic'},
 {id:'cable',system,category:'ADICIONALES',name:'Cable privado QA',price:10,unit:'metro',watts:null,source:'Synthetic'},
 {id:'install-rate',system,category:'SERVICIO DE INSTALACIÓN',name:'Instalación por panel',price:40.25,unit:'panel',watts:null,source:'Synthetic'},
];
const settings={...initialSettings,taxMode:'included' as const};
for(const system of systems)for(const count of [1,8,11,16,33]){
 const products=template(system);
 const input={...newQuote(),system,quantities:{panel:count,roof:1,structure:2,inverter:1,battery:system==='OFF GRID'||system.includes('HIBRIDO')?1:0,cable:15,'install-rate':5}};
 const before=JSON.stringify(input),c=calculate(input,products,settings,[]);
 assert.equal(c.panels,count);assert.ok(Math.abs(c.kwp-count*.585)<1e-10,'Solo los paneles contribuyen a la potencia');
 for(const id of ['roof','structure','installation'])assert.equal(c.lines.find(l=>l.id===id)?.qty,count);
 assert.equal(c.lines.find(l=>l.id==='cable')?.qty,15,'Metros no siguen paneles');
 assert.equal(c.lines.filter(l=>l.category==='INSTALACIÓN').length,1,'No duplicar instalación por cantidad del producto');
 const subtotal=count*150+200+150+(input.quantities.battery?300:0)+Math.round(count*40.25);
 assert.equal(c.subtotal,subtotal);assert.equal(c.net+c.tax!,c.total);
 assert.equal(workflowReadiness(input,products,c,[]).installation,true,'La tarifa por panel no depende de una banda de la tabla antigua');
 assert.equal(JSON.stringify(input),before,'No altera snapshots históricos');
 const normalized=panelQuantities(input,products);assert.deepEqual(panelQuantities({...input,quantities:normalized},products),normalized);
 const overridden=calculate({...input,installationOverride:119,installationNote:'Excepción aprobada'},products,settings);
 assert.equal(overridden.lines.find(l=>l.id==='installation')?.total,119);
 assert.equal(overridden.lines.find(l=>l.id==='installation')?.qty,1,'El total manual no se multiplica');
 const summary=proposalEquipment({id:'qa',folio:'QA',date:'2026-10-01',input:{...input,showItemDetails:false,hiddenLineIds:['panel']},settings,calculation:c});
 assert.ok(summary.some(r=>r.kind==='panels'));
 assert.equal(summary.some(r=>r.kind==='battery'),input.quantities.battery===1);
 assert.equal(summary.some(r=>r.note==='Permite Netbilling'),system!=='OFF GRID');
 assert.ok(!JSON.stringify(summary).includes('Cable privado'));
 const net=calculate(input,products,{...settings,taxMode:'net'});
 assert.equal(net.subtotal,subtotal,'No quitar IVA a una tarifa de catálogo expresada en neto');
 assert.equal(net.total,subtotal+Math.round(subtotal*.19));
}
const products=template('ON GRID'),input={...newQuote(),quantities:{panel:8,roof:1,structure:1,inverter:1}};
const noPrice=calculate(input,products.map(p=>p.id==='install-rate'?{...p,price:null}:p),settings);
assert.equal(noPrice.complete,false);assert.equal(noPrice.lines.find(l=>l.id==='installation')?.total,null,'No usar tabla si la tarifa seleccionada carece de precio');
const zero=calculate({...input,quantities:{...input.quantities,panel:0}},products,settings);
assert.equal(zero.complete,false);assert.ok(!zero.lines.some(l=>l.id==='roof'||l.id==='structure'));
console.log('Cantidades por panel, tarifa unitaria, impuestos, excepciones y resumen de cliente: OK');
