import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {PDFDocument,PDFArray,PDFRawStream} from 'pdf-lib';
import {QuoteIssuePanel,IssuedQuotePending} from '../app/quote-issue-panel';
import {newQuote,calculate,initialProducts,initialSettings,type SavedQuote} from '../lib/quote';
import {issuanceWarnings,issuedWarnings,documentTitle} from '../lib/quote-issuance';
import {proposalCanvases} from '../lib/proposal-canvas';
import {quotePdf} from '../lib/pdf';
import {newProjection,projectionContext,publishedProjection} from '../lib/projection';
import {Proposal} from '../app/proposal';
async function pdfContents(q:SavedQuote){
 const pdf=await PDFDocument.load(await quotePdf(q));
 return pdf.getPages().map(page=>{
  const contents=page.node.Contents();
  const streams=contents instanceof PDFArray?contents.asArray():[contents];
  return streams.map(ref=>Array.from((pdf.context.lookup(ref) as PDFRawStream).getContents()));
 });
}
async function run(){
 const input={...newQuote(),customer:{...newQuote().customer,name:'Prueba pendiente'}};
 const settings={...initialSettings,taxMode:'included' as const};
 const q:SavedQuote={id:'test',folio:'TEST',date:'2026-10-14',input,settings,calculation:calculate(input,initialProducts,settings)};
 const panel=renderToStaticMarkup(createElement(QuoteIssuePanel,{quote:q,onIssue:()=>{},onSelect:()=>{}}));
 assert.match(panel,/Emitir con pendientes/);assert.match(panel,/Ver pendientes/);assert.match(panel,/Pendientes internos/);
 assert.ok(!panel.includes('disabled=""'));assert.ok(!panel.includes('<details open'));assert.ok(!panel.includes('Advertencias incluidas en el documento'));
 const issued={...q,issuedAt:'2026-10-14',folio:'SVX-2026-000001',issuanceWarnings:issuanceWarnings(q)};
 const before=JSON.stringify(issued);
 const internal=renderToStaticMarkup(createElement(IssuedQuotePending,{quote:issued}));
 assert.match(internal,/Falta correo o teléfono/);assert.match(internal,/Solo para el equipo/);assert.ok(!internal.includes('<details open'));
 assert.equal(renderToStaticMarkup(createElement(IssuedQuotePending,{quote:{...issued,issuanceWarnings:[]}})),'');
 assert.equal(documentTitle(issued),'COTIZACIÓN');
 for(const legacy of [false,true]){
  const document={...issued,input:{...input,proposalContent:legacy?undefined:input.proposalContent}};
  const clean={...document,issuanceWarnings:[]};
  assert.equal(renderToStaticMarkup(createElement(Proposal,{q:document})),renderToStaticMarkup(createElement(Proposal,{q:clean})),'El documento del cliente no depende de los pendientes internos');
  assert.deepEqual(await pdfContents(document),await pdfContents(clean),'El PDF no contiene avisos internos, tampoco en el formato antiguo');
 }
 // Savings explanations stay internal, including already saved overrides of the removed block.
 for(const legacy of [false,true]){
  const scenario={...newProjection(),savingsMode:'manual' as const,monthlySavings:100000,savingsSource:'INTERNAL-SAVINGS-NOTE'};
  const document={...issued,input:{...input,projection:scenario,proposalContent:legacy?undefined:{...input.proposalContent!,text:{'assumptions:body':'OLD-INTERNAL-OVERRIDE'}}}};
  scenario.reviewedFor=projectionContext(document,scenario);
  const forecast=publishedProjection(document)!;
  assert.ok(forecast);assert.equal(forecast.input.monthlySavings,100000);
  const html=renderToStaticMarkup(createElement(Proposal,{q:document}));
  assert.doesNotMatch(html,/INTERNAL-SAVINGS-NOTE|OLD-INTERNAL-OVERRIDE|Supuestos del escenario|Cómo se calculó/);
  const changedScenario={...scenario,savingsSource:'DIFFERENT-INTERNAL-NOTE'};
  const changed={...document,input:{...document.input,projection:changedScenario}};
  changedScenario.reviewedFor=projectionContext(changed,changedScenario);
  assert.deepEqual(await pdfContents(document),await pdfContents(changed),'El comentario interno no cambia el PDF de ninguno de los formatos');
  assert.equal(document.input.projection.savingsSource,'INTERNAL-SAVINGS-NOTE');
 }
 assert.deepEqual(proposalCanvases(issued),proposalCanvases({...issued,issuanceWarnings:[]}));
 const long={...issued,issuanceWarnings:Array.from({length:80},(_,i)=>`Pendiente interno ${i}`)};
 assert.deepEqual(proposalCanvases(long),proposalCanvases({...long,issuanceWarnings:[]}), 'Los pendientes no agregan páginas ni cambian el encabezado');
 assert.deepEqual(issuedWarnings(issued),issued.issuanceWarnings);
 assert.equal(JSON.stringify(issued),before,'Conservar los pendientes almacenados para seguimiento interno');
 assert.match(readFileSync('app/quote-validation.css','utf8'),/@media print\s*\{\.quote-issue-panel\s*\{display:none!important/,'El panel interno no se imprime');
 console.log('Pendientes internos antes y después de emitir; HTML, PDF y formato antiguo limpios; impresión oculta; historial intacto: OK');
}void run();
