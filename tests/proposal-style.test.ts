import assert from 'node:assert/strict';
import {PDFDocument,PDFName,PDFDict} from 'pdf-lib';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import {AtlasProposal} from '../app/atlas-proposal';
import {defaultProposalStyle,proposalStyleSchema} from '../lib/proposal-style';
import {proposalCanvases} from '../lib/proposal-canvas';
import {quotePdf} from '../lib/pdf';
import {calculate,newQuote,initialProducts,initialSettings,quoteSchema,type SavedQuote} from '../lib/quote';

async function run(){
 const input=newQuote(),q:SavedQuote={id:'style-test',folio:'ESTILO',date:'2026-10-07T12:00:00Z',input,settings:initialSettings,calculation:calculate(input,initialProducts,initialSettings)};
 const original=JSON.stringify(q);
 assert.ok(!proposalStyleSchema.safeParse({...defaultProposalStyle,background:'url(https://evil.example)'}).success);
 assert.ok(!proposalStyleSchema.safeParse({...defaultProposalStyle,font:'<script>'}).success);
 assert.ok(!proposalStyleSchema.safeParse({...defaultProposalStyle,textScale:3}).success);
 for(const font of ['sans','serif','mono'] as const){
  const style={...defaultProposalStyle,font,textScale:1.15,primary:'#473066',accent:'#dfac50',background:'#faf4e9',cover:'#36264e',text:'#30243a',coverPhoto:false};
  const themed={...q,input:quoteSchema.parse({...input,proposalContent:{...input.proposalContent!,style,text:{'scope:body':'Texto extenso de la propuesta para validar su lectura y paginación. '.repeat(100)}}})};
  const reopened=quoteSchema.parse(JSON.parse(JSON.stringify(themed.input)));assert.deepEqual(reopened.proposalContent?.style,style);
  const pages=proposalCanvases(themed);
  assert.ok(!pages.flatMap(p=>p.ops).some(op=>op.kind==='image'&&op.image==='roof'));
  for(const page of pages){assert.equal(page.font,font);for(const op of page.ops)if(op.kind==='text')assert.ok(op.y<=577&&op.y-op.size>=0,'El texto debe permanecer dentro de la hoja');}
  const html=renderToStaticMarkup(createElement(AtlasProposal,{q:themed}));assert.ok(html.includes('#faf4e9'));
  assert.ok(html.includes(font==='sans'?'Arial':font==='serif'?'Times New Roman':'Courier New'));
  const pdf=await PDFDocument.load(await quotePdf(themed));assert.equal(pdf.getPageCount(),pages.length);
  const fonts=pdf.getPage(0).node.Resources()?.lookup(PDFName.of('Font'),PDFDict);
  const names=fonts?.entries().map(([,ref])=>pdf.context.lookup(ref,PDFDict).get(PDFName.of('BaseFont'))?.toString()).join(' ');
  assert.ok(names?.includes(font==='sans'?'Helvetica':font==='serif'?'Times':'Courier'),'PDF y HTML usan la familia elegida');
 }
 assert.equal(JSON.stringify(q),original,'Personalizar una propuesta no modifica otra');
 console.log('Estilos: validación, persistencia, tipografía HTML/PDF, tamaño máximo, fondos y paginación: OK');
}
void run();
