import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {newProjection,automaticSavings,resolvedProjection,publishedProjection,projectionContext,savingsBillComparison} from '../lib/projection';
import {calculate,newQuote,initialProducts,initialSettings,quoteSchema,type SavedQuote} from '../lib/quote';
import {newEnergyInput} from '../lib/energy';
import {persistentQuote} from '../lib/quote-persistence';
import {proposalLayout} from '../lib/proposal-layout';
import {ProjectionPanel} from '../app/projection-panel';
import {AutomaticSavingsSummary} from '../app/automatic-savings-summary';

const settings={...initialSettings,taxMode:'included' as const};
function quote(count:number,watts:number):SavedQuote{
 const input={...newQuote(),quantities:{...newQuote().quantities,'0-10':count}};
 const products=initialProducts.map(p=>p.id==='0-10'?{...p,watts}:p);
 return {id:'synthetic-panels',folio:'PRUEBA',date:'2026-10-16',input,settings,calculation:calculate(input,products,settings)};
}
// Workbook Hoja1 B6:Z6, using independent integer arithmetic and final CLP rounding.
for(let n=6;n<=30;n++){
 const q=quote(n,585),expected=Math.floor((n*585*25215+500)/1000);
 assert.equal(resolvedProjection(q).monthlySavings,expected,`Excel: ${n} panels`);
}
for(const [watts,expected] of [[585,147508],[620,156333],[720,181548]]){
 const q=quote(10,watts),p=resolvedProjection(q);
 assert.equal(p.monthlySavings,expected);
 assert.equal(p.generationMethod,'panels');
 assert.equal(p.savingsMode,'automatic');
 assert.equal(p.tariffGrowth,5);
 assert.match(p.savingsSource,/205 CLP/);
 assert.equal(publishedProjection(q),null,'Existing PDF approval still required');
}
const q=quote(10,585),p=resolvedProjection(q);
assert.equal(q.input.customer.bill,0);assert.equal(q.input.energy,undefined);
assert.equal(automaticSavings(q,{...newProjection(),energyRate:999,selfConsumptionPercent:0,exportRate:999,referenceDays:1,peakSunHours:1,referenceLossPercent:50}).result?.monthlySavings,147508,'The fixed Excel reference must not inherit factors from the detailed model');
assert.equal(resolvedProjection({...q,input:{...q.input,customer:{...q.input.customer,bill:1}}}).monthlySavings,147508,'Reference is independent of bill amount');
assert.equal(resolvedProjection(quote(20,585)).monthlySavings,295016,'Exact half peso rounds up');
assert.equal(resolvedProjection(quote(0,585)).monthlySavings,null);
assert.equal(resolvedProjection(quote(10,0)).monthlySavings,null);
assert.equal(resolvedProjection(quote(1.5,585)).monthlySavings,null);
assert.equal(automaticSavings({...q,calculation:{...q.calculation,kwp:Infinity}},p).result,null);
assert.equal(automaticSavings({...q,calculation:{...q.calculation,kwp:NaN}},p).result,null);
const secondPanel={...initialProducts.find(p=>p.id==='0-10')!,id:'synthetic-620',watts:620};
const mixedInput={...q.input,quantities:{...q.input.quantities,'0-10':5,'synthetic-620':5}};
const mixed={...q,input:mixedInput,calculation:calculate(mixedInput,[...initialProducts,secondPanel],settings)};
assert.equal(resolvedProjection(mixed).monthlySavings,151920,'Each power contributes to total kWp');
const missingPower={...secondPanel,watts:null};
assert.equal(resolvedProjection({...mixed,calculation:calculate(mixedInput,[...initialProducts,missingPower],settings)}).monthlySavings,null,'Do not undercount a panel with missing power');

// Saving/reopening and equipment edits use the same formula; manual values stay manual.
const saved={...q,input:quoteSchema.parse(JSON.parse(JSON.stringify(persistentQuote({...q.input,projection:p}))))};
assert.equal(resolvedProjection(saved).monthlySavings,147508);
assert.equal(resolvedProjection({...quote(10,620),input:{...quote(10,620).input,projection:saved.input.projection}}).monthlySavings,156333);
const manual={...p,savingsMode:'manual' as const,monthlySavings:123456,savingsSource:'Manual scenario'};
assert.equal(resolvedProjection({...q,input:{...q.input,projection:manual}}).monthlySavings,123456);
assert.equal(resolvedProjection({...quote(10,620),input:{...q.input,projection:manual}}).monthlySavings,123456);
const approved={...saved,input:{...saved.input,projection:{...p,reviewedFor:projectionContext(saved,p)}}};
assert.equal(publishedProjection(approved)?.input.monthlySavings,147508);
assert.equal(publishedProjection({...approved,calculation:quote(10,620).calculation}),null,'Equipment changes invalidate PDF review');
const document=JSON.stringify(proposalLayout(approved));
assert.match(document,/147.508/);assert.doesNotMatch(document,/205 CLP|Supuestos del escenario/);
assert.match(approved.input.projection.savingsSource,/205 CLP/,'Conservar el fundamento dentro del cotizador');
const comparison=savingsBillComparison({...q,input:{...q.input,customer:{...q.input.customer,bill:200000},energy:{...newEnergyInput(),billingDays:60}}},p)!;
assert.equal(comparison.referenceDays,30);assert.equal(comparison.monthlyBill,100000);

const html=renderToStaticMarkup(createElement(ProjectionPanel,{q,onChange:()=>{}}));
assert.match(html,/147.508/);assert.match(html,/4,1 h/);assert.match(html,/205/);
assert.doesNotMatch(html,/Generación aprovechada para autoconsumo|Completa los kWh|PVGIS por ubicación/);
const summary=renderToStaticMarkup(createElement(AutomaticSavingsSummary,{quote:q,onReview:()=>{}}));
assert.match(summary,/147.508/);assert.doesNotMatch(summary,/Faltan datos/);
console.log('Panel savings: Excel 6–30 panels, 585/620/720 W, mixed powers, missing inputs, rounding, persistence, manual values and reviewed PDF: OK');
