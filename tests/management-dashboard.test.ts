import assert from 'node:assert/strict';
import {managementSummary,loadAllHistory} from '../lib/management-dashboard';
import {newQuote,initialSettings,initialProducts,calculate} from '../lib/quote';
import type {HistoryQuote} from '../lib/quote-history';
const input=newQuote(),base={id:'a',folio:'A',input,settings:initialSettings,date:'2026-09-01T02:00:00Z',calculation:{...calculate(input,initialProducts,initialSettings),complete:true,total:100},owner:{id:'one',name:'Responsable'}};
const rows:HistoryQuote[]=[{...base,sentOn:'2026-09-02'}, {...base,id:'b',date:'2026-09-02T15:00:00Z'}, {...base,id:'c',date:'2026-09-02T15:00:00Z',sentOn:'2026-09-03',calculation:{...base.calculation,complete:false,total:900}}, {...base,id:'d',date:'2026-09-02T15:00:00Z',sentOn:'2026-09-03',deletedAt:'2026-09-04T12:00:00Z'}];
const result=managementSummary(rows,'2026-09');
assert.equal(result.created,2,'Chile: 02:00 UTC on Sep 1 belongs to August');assert.equal(result.sent,2,'Includes sent quotes created before this month');assert.equal(result.pending,1);assert.equal(result.amount,100,'Exclude partial amounts');assert.equal(result.unvalued,1);assert.equal(result.people[0].sent,2);assert.equal(managementSummary(rows,'2025-01').created,0);
async function run(){const signal=new AbortController().signal;const pages:number[]=[];const loaded=await loadAllHistory(async offset=>{pages.push(offset);return {quotes:rows.slice(offset,offset+2),total:4}},signal);assert.equal(loaded.length,4);assert.deepEqual(pages,[0,2]);await assert.rejects(()=>loadAllHistory(async()=>({quotes:[],total:1}),signal));await assert.rejects(()=>loadAllHistory(async offset=>({quotes:rows.slice(offset,offset+2),total:offset?5:4}),signal));const abort=new AbortController();abort.abort();await assert.rejects(()=>loadAllHistory(async()=>({quotes:[],total:0}),abort.signal));console.log('Resumen: fechas chilenas, versiones, montos incompletos, papelera y paginación: OK')}
void run();
