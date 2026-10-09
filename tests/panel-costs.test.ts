import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {InstallationPanel} from '../app/installation-panel';
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
 const rates=[{panels:count,price:718272.576,source:'Servicio Instalación'}];
 const before=JSON.stringify(input),c=calculate(input,products,settings,rates);
 assert.equal(c.panels,count);assert.ok(Math.abs(c.kwp-count*.585)<1e-10,'Solo los paneles contribuyen a la potencia');
 for(const id of ['roof','structure'])assert.equal(c.lines.find(l=>l.id===id)?.qty,count);
 assert.equal(c.lines.find(l=>l.id==='cable')?.qty,15,'Metros no siguen paneles');
 assert.equal(c.lines.filter(l=>l.category==='INSTALACIÓN').length,1,'No duplicar instalación por cantidad del producto');
 const subtotal=count*150+200+150+(input.quantities.battery?300:0)+718273;
 assert.equal(c.subtotal,subtotal);assert.equal(c.net+c.tax!,c.total);
 assert.equal(workflowReadiness(input,products,c,rates).installation,true);
 assert.equal(c.lines.find(l=>l.id==='installation')?.qty,1);
 assert.equal(workflowReadiness(input,products,c,[]).installation,false);
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
 const net=calculate(input,products,{...settings,taxMode:'net'},rates);
 assert.equal(net.lines.find(l=>l.id==='installation')?.total,Math.round(718272.576/1.19));
 assert.equal(net.calculatedTotal,net.subtotal+Math.round(net.subtotal*.19));
}
const products=template('ON GRID'),input={...newQuote(),quantities:{panel:8,roof:1,structure:1,inverter:1}};
const noPrice=calculate(input,products.map(p=>p.id==='install-rate'?{...p,price:null}:p),settings,[]);
assert.equal(noPrice.complete,false);assert.equal(noPrice.lines.find(l=>l.id==='installation')?.total,null,'No usar tarifas por panel si falta total en tabla');
const zero=calculate({...input,quantities:{...input.quantities,panel:0}},products,settings);
assert.equal(zero.complete,false);assert.ok(!zero.lines.some(l=>l.id==='roof'||l.id==='structure'));
console.log('Cantidades por panel, total de instalación, impuestos, excepciones y resumen de cliente: OK');

// Switching to an override must not hide the live automatic reference.
const rates=[{panels:8,price:600000,source:'Servicio Instalación'},{panels:9,price:650000,source:'Servicio Instalación'}];
const renderInstallation=(quote:typeof input,panels:number)=>renderToStaticMarkup(createElement(InstallationPanel,{quote,panels,rates,onChange:()=>{}}));
const manualInput={...input,installationOverride:700000,installationNote:'Ajuste aprobado'};
const manualHtml=renderInstallation(manualInput,8);
assert.ok(manualHtml.includes('$600.000')&&manualHtml.includes('$700.000'),'Automatic reference and manual total remain visible together');
assert.ok(manualHtml.includes('Volver al cálculo automático'));
const ninePanels={...manualInput,quantities:{...manualInput.quantities,panel:9}};
const updatedHtml=renderInstallation(ninePanels,9);
assert.ok(updatedHtml.includes('$650.000')&&updatedHtml.includes('$700.000'),'Changing panel count updates the reference while retaining the chosen override');
const manualCalculation=calculate(ninePanels,products,settings,rates);
const automaticInput={...ninePanels,installationOverride:null,installationNote:''};
const automaticCalculation=calculate(automaticInput,products,settings,rates);
assert.equal(manualCalculation.lines.find(l=>l.id==='installation')?.total,700000);
assert.equal(automaticCalculation.lines.find(l=>l.id==='installation')?.total,650000);
assert.equal(manualCalculation.subtotal-automaticCalculation.subtotal,50000,'Charge only the selected installation total, never both');
assert.ok(!renderInstallation(automaticInput,9).includes('Valor manual de instalación'));
assert.ok(renderInstallation({...manualInput,installationOverride:0},8).includes('$0'),'A free approved installation is still a manual override');
assert.ok(renderInstallation({...manualInput,installationOverride:631907.136},8).includes('value="631907"'),'Manual input displays whole Chilean pesos even for older fractional overrides');
assert.ok(renderInstallation(manualInput,7).includes('No hay tarifa automática para 7 paneles'),'Missing rates remain explicit even in manual mode');
console.log('Instalación: referencia automática visible, cambio de paneles, ajuste opcional y regreso a tarifa sin doble cobro: OK');
