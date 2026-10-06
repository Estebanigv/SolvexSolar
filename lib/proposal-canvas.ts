import {Font,FontNames,Encodings} from '@pdf-lib/standard-fonts';
import {proposalLayout,type ProposalPage,type ProposalBlock} from './proposal-layout';
import {money,type SavedQuote} from './quote';
import {documentTitle} from './quote-issuance';

export const canvasSize={width:842,height:595};
export type DrawOp=
 |{kind:'text';x:number;y:number;text:string;size:number;bold:boolean;color:string}
 |{kind:'rect';x:number;y:number;width:number;height:number;color:string;opacity?:number}
 |{kind:'image';x:number;y:number;width:number;height:number;image:'logo'|'roof'|'home';fit:'cover'|'contain'};
export type CanvasPage={id:string;title:string;ops:DrawOp[]};
const colors={ink:'#103b45',green:'#bdd548',muted:'#49646c',white:'#ffffff',pale:'#eef3ed',dark:'#092f38'};
const regular=Font.load(FontNames.Helvetica),bold=Font.load(FontNames.HelveticaBold);
export const printableText=(text:string)=>Array.from(text.normalize('NFC').replace(/\t/g,'  ').replace(/\u202f/g,' ').replace(/₂/g,'2').replace(/−/g,'-')).map(c=>c==='\n'||Encodings.WinAnsi.canEncodeUnicodeCodePoint(c.codePointAt(0)!)?c:'?').join('');
function width(text:string,size:number,isBold=false){const font=isBold?bold:regular;return Array.from(printableText(text)).reduce((sum,c)=>sum+(font.getWidthOfGlyph(Encodings.WinAnsi.encodeUnicodeCodePoint(c.codePointAt(0)!).name)||0),0)*size/1000;}
export function wrapProposal(text:string,size:number,maxWidth:number,isBold=false){
 const result:string[]=[];
 for(const paragraph of printableText(text).split('\n')){
  let line='';
  for(const word of paragraph.split(/\s+/)){
   if(width(line?line+' '+word:word,size,isBold)<=maxWidth){line=line?line+' '+word:word;continue;}
   if(line){result.push(line);line='';}
   for(const char of word){if(line&&width(line+char,size,isBold)>maxWidth){result.push(line);line='';}line+=char;}
  }
  result.push(line);
 }
 return result;
}

// One paginated drawing plan drives both the HTML/SVG preview and vector PDF.
// Coordinates use a top-left origin; text y is its baseline.
export function proposalCanvases(q:SavedQuote):CanvasPage[]{
 const pages:CanvasPage[]=[];
 let current:CanvasPage;
 let y=0;
 const rect=(x:number,top:number,w:number,h:number,color=colors.green)=>current.ops.push({kind:'rect',x,y:top,width:w,height:h,color});
 const text=(value:string,x:number,baseline:number,size=12,isBold=false,color=colors.ink)=>current.ops.push({kind:'text',x,y:baseline,text:printableText(value),size,bold:isBold,color});
 const lines=(value:string,x:number,top:number,w:number,size=12,isBold=false,color=colors.ink)=>{const rows=wrapProposal(value,size,w,isBold);rows.forEach((row,i)=>text(row,x,top+size+i*size*1.4,size,isBold,color));return rows.length*size*1.4;};
 const start=(page:ProposalPage,continuation=false)=>{
  current={id:`${page.id}-${pages.length}`,title:page.title,ops:[]};pages.push(current);
  rect(0,0,842,595,colors.white);
  text(q.settings.name,36,30,11,true);text(q.folio,630,30,10,false,colors.muted);
  rect(36,45,770,2);
  y=65;
  if(page.subtitle&&!continuation)y+=lines(page.subtitle,36,y,770,11,false,colors.muted)+7;
  const title=continuation?page.title+' (continuación)':page.title;
  y+=lines(title,36,y,770,continuation?17:27,true)+18;
 };
 function bodyPage(page:ProposalPage,blocks:ProposalBlock[],continuation=false){
  start(page,continuation);
  let column=0,rowHeight=0;
  const flush=()=>{if(column){y+=rowHeight+20;column=0;rowHeight=0;}};
  for(const block of blocks){
   if(block.kind==='metric'||block.kind==='equipment'){
    const h=wrapProposal(block.title,14,355,true).length*19.6+wrapProposal(block.value??'',block.kind==='metric'?26:17,355,true).length*(block.kind==='metric'?36.4:23.8)+wrapProposal(block.body,11,355).length*15.4+29;
    if(h<350){
     if(y+h>535){flush();start(page,true);}
     const x=36+column*395;let top=y;
     rect(x,top,375,2);top+=13;
     top+=lines(block.title,x,top,355,14,true)+8;
     if(block.value)top+=lines(block.value,x,top,355,block.kind==='metric'?26:17,true)+7;
     lines(block.body,x,top,355,11,false,colors.muted);
     rowHeight=Math.max(rowHeight,h);column++;
     if(column===2){y+=rowHeight+22;column=0;rowHeight=0;}continue;
    }
   }
   flush();
   const titleRows=wrapProposal(block.title,17,770,true);
   if(y+titleRows.length*24+45>535)start(page,true);
   rect(36,y,770,1);y+=13;
   if(block.title)y+=lines(block.title,36,y,770,17,true)+8;
   if(block.value){for(const row of wrapProposal(block.value,17,770,true)){if(y+24>535)start(page,true);text(row,36,y+17,17,true);y+=24;}y+=6;}
   for(const row of wrapProposal(block.body,12,770)){
    if(y+17>535)start(page,true);
    text(row,36,y+12,12,false,colors.muted);y+=17;
   }
   if(block.points){
    const max=Math.max(1,...block.points.map(p=>Math.abs(p.value)));
    for(const point of block.points){if(y+33>535)start(page,true);text(point.label,36,y+15,11);rect(108,y+3,520,16,colors.pale);rect(108,y+3,Math.max(1,Math.max(0,point.value)/max*520),16);text(money(point.value),649,y+15,11,true);y+=29;}
   }
   y+=20;
  }
 }
 function analysisPage(page:ProposalPage){
  const metrics=page.blocks.filter(b=>b.kind==='metric'),chart=page.blocks.find(b=>b.kind==='chart'),notes=page.blocks.filter(b=>b.kind==='text');
  if(metrics.length>2||!chart||notes.length!==1||wrapProposal(notes[0].body,11,770).length>6||metrics.some(m=>wrapProposal(m.title,14,250,true).length>2||wrapProposal(m.value??'',28,250,true).length>1||wrapProposal(m.body,11,250).length>3)||wrapProposal(chart.body,11,455).length>3)return false;
  const first=pages.length;
  start(page);
  let top=y;
  for(const metric of metrics){rect(36,top,250,2);top+=12;top+=lines(metric.title,36,top,250,14,true)+8;top+=lines(metric.value??'',36,top,250,28,true)+8;top+=lines(metric.body,36,top,250,11,false,colors.muted)+22;}
  let chartY=y;rect(326,chartY,480,2);chartY+=12;chartY+=lines(chart.title,326,chartY,480,17,true)+10;chartY+=lines(chart.body,326,chartY,455,11,false,colors.muted)+12;
  const max=Math.max(1,...(chart.points??[]).map(p=>Math.abs(p.value)));
  for(const point of chart.points??[]){text(point.label,326,chartY+12,10);rect(375,chartY+1,325,15,colors.pale);rect(375,chartY+1,Math.max(1,Math.max(0,point.value)/max*325),15);text(money(point.value),713,chartY+12,10,true);chartY+=28;}
  y=Math.max(top,chartY)+15;
  const note=notes[0];rect(36,y,770,1);y+=12;y+=lines(note.title,36,y,770,14,true)+6;lines(note.body,36,y,770,11,false,colors.muted);
  if(current.ops.some(op=>op.kind==='text'&&op.y>535)){pages.splice(first);return false;}
  return true;
 }
 function investmentPage(page:ProposalPage){
  const metrics=page.blocks.filter(b=>b.kind==='metric'),notes=page.blocks.filter(b=>b.kind==='text');
  if(metrics.length>4||metrics.some(m=>wrapProposal(m.title,12,175,true).length>2||wrapProposal(m.value??'',19,175,true).length>1||wrapProposal(m.body,10,175).length>3)||page.blocks.some(b=>!['metric','text'].includes(b.kind)))return false;
  const first=pages.length;
  start(page);let metricBottom=y;
  const col=770/Math.max(1,metrics.length);
  metrics.forEach((m,i)=>{const x=36+i*col;let top=y;rect(x,top,col-18,2);top+=12;top+=lines(m.title,x,top,col-18,12,true)+10;top+=lines(m.value??'',x,top,col-18,19,true)+8;top+=lines(m.body,x,top,col-18,10,false,colors.muted);metricBottom=Math.max(metricBottom,top);});
  let floor=metricBottom+22,column=0;y=floor;
  const advance=()=>{if(column===0){column=1;y=floor;}else{start(page,true);floor=y;column=0;}};
  for(const note of notes){
   const titleRows=wrapProposal(note.title,15,370,true);
   if(y+titleRows.length*21+42>535)advance();
   let x=36+column*395;rect(x,y,375,1);y+=12;
   if(note.title)y+=lines(note.title,x,y,370,15,true)+7;
   for(const row of wrapProposal(note.body,11,370)){if(y+16>535){advance();x=36+column*395;}text(row,x,y+11,11,false,colors.muted);y+=16;}
   y+=18;
  }
  if(pages.slice(first).some(p=>p.ops.some(op=>op.kind==='text'&&op.y>535))){pages.splice(first);return false;}
  return true;
 }
 for(const page of proposalLayout(q)){
  if(page.id==='analysis'&&analysisPage(page))continue;
  if(page.id==='investment-page'&&investmentPage(page))continue;
  if(!page.cover){bodyPage(page,page.blocks);continue;}
  const client=page.blocks.find(b=>b.id==='client'),metrics=page.blocks.filter(b=>b.kind==='metric');
  const coverHeight=151+wrapProposal(page.title,28,278,true).length*39.2+19+wrapProposal(page.subtitle,17,278).length*23.8+44+(client?wrapProposal(client.title,20,278,true).length*28+10+wrapProposal(client.body,11,278).length*15.4:0);
  const colWidth=770/Math.max(metrics.length,1);
  const overflow=coverHeight>439||metrics.some(m=>width(m.title,9,true)>colWidth-16||width(m.value??'',14,true)>colWidth-16||width(m.body,7)>colWidth-16);
  if(overflow){bodyPage(page,page.blocks);continue;}
  current={id:'cover',title:page.title,ops:[]};pages.push(current);
  rect(0,0,842,595,colors.dark);
  current.ops.push({kind:'image',image:'roof',x:330,y:0,width:512,height:465,fit:'cover'});
  current.ops.push({kind:'image',image:'logo',x:36,y:25,width:110,height:73,fit:'contain'});
  text(documentTitle(q),36,124,9,true,colors.green);
  let top=151;top+=lines(page.title,36,top,278,28,true,colors.white)+19;
  top+=lines(page.subtitle,36,top,278,17,false,colors.white)+25;
  rect(36,top,258,2);top+=19;
  if(client){top+=lines(client.title,36,top,278,20,true,colors.white)+10;lines(client.body,36,top,278,11,false,colors.white);}
  text('Fotografía referencial',680,451,8,false,colors.white);
  rect(0,465,842,88,colors.green);
  const col=770/Math.max(metrics.length,1);
  metrics.forEach((m,i)=>{const x=36+i*col;text(m.title,x,484,9,true);const value=m.value??'';const size=Math.min(25,(col-20)/Math.max(width(value,1,true),1));text(value,x,517,size,true);text(m.body,x,540,Math.min(9,(col-12)/Math.max(width(m.body,1),1)),false);});
  const extras=page.blocks.filter(b=>b.id!=='client'&&b.kind!=='metric');
  // Never clip user additions or a discount just to keep the cover to one sheet.
  if(extras.length)bodyPage({...page,cover:false,title:'Resumen de la propuesta',subtitle:page.subtitle},extras,true);
 }
 pages.forEach((page,i)=>{
  const cover=page.id==='cover';const color=cover?'#d9e4e4':colors.muted;
  page.ops.push({kind:'text',x:36,y:577,size:9,bold:false,color,text:printableText(`${q.settings.name} · ${q.folio}`)});
  page.ops.push({kind:'text',x:755,y:577,size:9,bold:false,color,text:`${i+1} / ${pages.length}`});
 });
 return pages;
}
