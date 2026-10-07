import {Font,FontNames,Encodings} from '@pdf-lib/standard-fonts';
import {proposalLayout,type ProposalPage,type ProposalBlock} from './proposal-layout';
import type {SavedQuote} from './quote';
import {documentTitle} from './quote-issuance';

export const canvasSize={width:842,height:595};
export type DrawOp=
 |{kind:'text';x:number;y:number;text:string;size:number;bold:boolean;color:string}
 |{kind:'rect';x:number;y:number;width:number;height:number;color:string;opacity?:number;stroke?:string}
 |{kind:'fade';x:number;y:number;width:number;height:number;color:string;from:number;to:number;direction:'horizontal'|'vertical'}
 |{kind:'line';x:number;y:number;x2:number;y2:number;color:string;thickness:number;dash?:number[]}
 |{kind:'circle';x:number;y:number;r:number;color:string;stroke?:string}
 |{kind:'polygon';points:{x:number;y:number}[];color:string;stroke?:string;thickness?:number}
 |{kind:'image';x:number;y:number;width:number;height:number;image:'logo'|'roof'|'home';fit:'cover'|'contain'};
export type CanvasPage={id:string;title:string;ops:DrawOp[]};
const colors={ink:'#103b45',green:'#bdd548',muted:'#49646c',white:'#ffffff',pale:'#eef4f2',dark:'#092f38',teal:'#17695c',line:'#ccdbd8'};
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

// The same vector composition is used in the editable HTML and the PDF.
// Grid: 36 pt margins, 18 pt gutters, 770 pt content width, 535 pt lower limit.
export function proposalCanvases(q:SavedQuote):CanvasPage[]{
 const pages:CanvasPage[]=[];
 let current:CanvasPage,y=0;
 const rect=(x:number,top:number,w:number,h:number,color=colors.green,stroke?:string)=>current.ops.push({kind:'rect',x,y:top,width:w,height:h,color,stroke});
 const text=(value:string,x:number,baseline:number,size=12,isBold=false,color=colors.ink)=>current.ops.push({kind:'text',x,y:baseline,text:printableText(value),size,bold:isBold,color});
 const right=(value:string,x:number,baseline:number,size=12,isBold=false,color=colors.ink)=>text(value,x-width(value,size,isBold),baseline,size,isBold,color);
 const line=(x:number,top:number,x2:number,y2:number,color=colors.line,thickness=1,dash?:number[])=>current.ops.push({kind:'line',x,y:top,x2,y2,color,thickness,dash});
 const circle=(x:number,top:number,r:number,color=colors.pale,stroke?:string)=>current.ops.push({kind:'circle',x,y:top,r,color,stroke});
 const polygon=(points:{x:number;y:number}[],color:string,stroke?:string,thickness=1)=>current.ops.push({kind:'polygon',points,color,stroke,thickness});
 const lines=(value:string,x:number,top:number,w:number,size=12,isBold=false,color=colors.ink)=>{const rows=wrapProposal(value,size,w,isBold);rows.forEach((row,i)=>text(row,x,top+size+i*size*1.4,size,isBold,color));return rows.length*size*1.4;};
 const icon=(kind:string,x:number,top:number,s=34,color=colors.teal)=>{
  if(kind==='sun'){
   circle(x+s/2,top+s/2,s*.2,colors.green);
   for(let i=0;i<8;i++){const a=i*Math.PI/4;line(x+s/2+Math.cos(a)*s*.32,top+s/2+Math.sin(a)*s*.32,x+s/2+Math.cos(a)*s*.46,top+s/2+Math.sin(a)*s*.46,color,1.5);}return;
  }
  if(kind==='panels'){
   rect(x+2,top+3,s-4,s*.65,colors.pale,color);
   for(let i=1;i<3;i++)line(x+2+(s-4)*i/3,top+3,x+2+(s-4)*i/3,top+3+s*.65,color,.8);
   line(x+2,top+3+s*.325,x+s-2,top+3+s*.325,color,.8);line(x+s/2,top+s*.74,x+s/2,top+s*.95,color,1.4);line(x+s*.2,top+s*.95,x+s*.8,top+s*.95,color,1.4);return;
  }
  if(kind==='inverter'||kind==='battery'){
   rect(x+s*.15,top+2,s*.7,s-4,colors.pale,color);
   if(kind==='battery'){rect(x+s*.35,top-1,s*.3,3,color);for(let i=0;i<3;i++)rect(x+s*.29,top+s*(.25+i*.21),s*.42,s*.12,colors.green);}
   else{rect(x+s*.29,top+s*.23,s*.42,s*.18,colors.white,color);circle(x+s*.5,top+s*.69,2.6,colors.green);}
   return;
  }
  line(x,top+s*.43,x+s/2,top+2,color,1.5);line(x+s/2,top+2,x+s,top+s*.43,color,1.5);
  line(x+s*.15,top+s*.33,x+s*.15,top+s*.94,color,1.5);line(x+s*.85,top+s*.33,x+s*.85,top+s*.94,color,1.5);line(x+s*.15,top+s*.94,x+s*.85,top+s*.94,color,1.5);
  rect(x+s*.4,top+s*.6,s*.2,s*.34,colors.green);
 };
 const start=(page:ProposalPage,continuation=false)=>{
  current={id:`${page.id}-${pages.length}`,title:page.title,ops:[]};pages.push(current);
  rect(0,0,842,595,colors.white);
  icon('sun',36,17,21);text(q.settings.name,65,33,12,true);right(q.folio,806,32,9,false,colors.muted);
  line(36,49,806,49);
  y=68;
  if(page.subtitle&&!continuation)y+=lines(page.subtitle,36,y,770,11,false,colors.muted)+8;
  y+=lines(continuation?page.title+' (continuación)':page.title,36,y,770,continuation?18:29,true)+17;
 };
 const outside=(first:number)=>pages.slice(first).some(p=>p.ops.some(op=>op.kind==='text'&&op.y>535));
 const canFit=(s:string,size:number,w:number,n:number,b=false)=>wrapProposal(s,size,w,b).length<=n;
 function energyFlow(block:ProposalBlock,top:number){
  const labels=(block.value??'').split('|').map(s=>s.trim());
  if(labels.length!==4||labels.some(label=>!canFit(label,11,145,1,true))||!canFit(block.title,14,730,1,true)||!canFit(block.body,10,730,2))return false;
  rect(36,top,770,126,colors.pale);
  text(block.title,54,top+24,14,true);
  const centers=[129,322,515,708];
  centers.forEach((cx,i)=>{
   if(i<3){line(cx+31,top+56,centers[i+1]-33,top+56,colors.teal,1.2);polygon([{x:centers[i+1]-33,y:top+52},{x:centers[i+1]-27,y:top+56},{x:centers[i+1]-33,y:top+60}],colors.teal);}
   circle(cx,top+56,25,colors.white);icon(['sun','panels','inverter','home'][i],cx-15,top+41,30);
   text(labels[i],cx-width(labels[i],11,true)/2,top+92,11,true);
  });
  lines(block.body,54,top+103,730,9,false,colors.muted);
  return true;
 }
 function equipmentPage(page:ProposalPage){
  const flow=page.blocks.find(b=>b.kind==='diagram'),equipment=page.blocks.filter(b=>b.kind==='equipment'),notes=page.blocks.filter(b=>b.kind==='text');
  const col=(770-18*Math.max(0,equipment.length-1))/Math.max(1,equipment.length);
  if(equipment.length>3||!equipment.length||page.blocks.some(b=>!['diagram','equipment','text'].includes(b.kind))||equipment.some(b=>!canFit(b.title,11,col-75,3,true)||!canFit(b.value??'',15,col-32,2,true)||!canFit(b.body,10,col-32,1)))return false;
  const first=pages.length;start(page);
  if(y>150){pages.splice(first);return false;}
  if(flow){if(!energyFlow(flow,y)){pages.splice(first);return false;}y+=142;}
  equipment.forEach((b,i)=>{
   const x=36+i*(col+18);rect(x,y,col,144,colors.white,colors.line);icon(b.visual??'panels',x+16,y+15,27);
   lines(b.title,x+59,y+16,col-75,11,true);lines(b.value??'',x+16,y+70,col-32,15,true);text(b.body,x+16,y+130,10,false,colors.muted);
  });
  y+=163;
  if(notes.length>2||notes.some(b=>!canFit(b.title,13,369,1,true)||!canFit(b.body,10,369,5))){bodyPage(page,notes,true,true);return true;}
  notes.forEach((b,i)=>{const x=36+i*395;line(x,y,x+375,y,colors.green,2);let top=y+10;top+=lines(b.title,x,top,369,13,true)+5;lines(b.body,x,top,369,10,false,colors.muted);});
  if(outside(first)){pages.splice(first);return false;}return true;
 }
 function chart(block:ProposalBlock,x:number,top:number,w:number,h:number){
  const pts=block.points??[];if(!pts.length)return;
  const base=block.baseline??0,values=pts.map(p=>p.value);
  const min=Math.min(0,...values),max=Math.max(1,base,...values);
  const rough=(max-min)/4,unit=10**Math.floor(Math.log10(rough));
  const step=([1,2,2.5,5,10].find(n=>n*unit>=rough)??10)*unit;
  const low=Math.floor(min/step)*step,high=Math.ceil(max/step)*step,range=Math.max(step,high-low);
  const px=x+61,pw=w-82,py=top+13,ph=h-47;
  const yValue=(v:number)=>py+ph-(v-low)/range*ph;
  const lastYear=pts.at(-1)?.year??pts.length-1;
  const coords=pts.map((p,i)=>({x:px+((p.year??i)/Math.max(1,lastYear))*pw,y:yValue(p.value)}));
  const compact=(v:number)=>Math.abs(v)>=1e6?`${(v/1e6).toLocaleString('es-CL',{maximumFractionDigits:1})} M`:Math.round(v).toLocaleString('es-CL');
  for(let i=0;i<=Math.round(range/step);i++){const v=low+step*i,yy=yValue(v);line(px,yy,px+pw,yy,colors.line,.6);right('$'+compact(v),px-8,yy+3,9,false,colors.muted);}
  polygon([{x:px,y:yValue(0)},...coords,{x:px+pw,y:yValue(0)}],'#e4eec6');
  if(base>0){line(px,yValue(base),px+pw,yValue(base),colors.muted,1,[4,3]);text('Inversión inicial',px+7,yValue(base)-6,9,false,colors.muted);}
  for(let i=1;i<coords.length;i++)line(coords[i-1].x,coords[i-1].y,coords[i].x,coords[i].y,colors.teal,2.5);
  pts.forEach((p,i)=>{const year=p.year??i;if(year===0||year%5===0||i===pts.length-1){circle(coords[i].x,coords[i].y,3,colors.teal);text(String(year),coords[i].x-width(String(year),9)/2,py+ph+18,9,false,colors.muted);}});
  right('Años',px+pw,py+ph+32,9,false,colors.muted);
 }
 function analysisPage(page:ProposalPage){
  const metrics=page.blocks.filter(b=>b.kind==='metric'),plot=page.blocks.find(b=>b.kind==='chart'),notes=page.blocks.filter(b=>b.kind==='text');
  if(metrics.length>2||!plot||metrics.some(m=>!canFit(m.title,12,205,2,true)||!canFit(m.value??'',27,205,1,true)||!canFit(m.body,10,205,2))||!canFit(plot.title,17,483,1,true)||!canFit(plot.body,10,483,2))return false;
  const first=pages.length;start(page);if(y>150){pages.splice(first);return false;}
  const top=y;
  metrics.forEach((m,i)=>{const t=top+i*133;rect(36,t,243,117,i===0?colors.dark:colors.pale);const color=i===0?colors.white:colors.ink;lines(m.title,53,t+15,205,12,true,color);text(m.value??'',53,t+66,27,true,i===0?colors.green:colors.ink);lines(m.body,53,t+80,205,10,false,i===0?'#ccdddc':colors.muted);});
  text(plot.title,311,top+17,17,true);lines(plot.body,311,top+28,495,10,false,colors.muted);
  chart(plot,300,top+66,506,206);
  y=top+287;
  if(notes.length!==1||!canFit(notes[0].body,10,734,4)||!canFit(notes[0].title,12,734,1,true)){bodyPage(page,notes,true,true);return true;}
  const note=notes[0];rect(36,y,770,98,colors.pale);text(note.title,54,y+22,12,true);lines(note.body,54,y+31,734,10,false,colors.muted);
  if(outside(first)){pages.splice(first);return false;}return true;
 }
 function investmentPage(page:ProposalPage){
  const total=page.blocks.find(b=>b.id==='closing-total'),payments=page.blocks.filter(b=>b.binding==='payment'),notes=page.blocks.filter(b=>b.kind==='text');
  if(!total||payments.length>3||!canFit(total.title,12,205,2,true)||!canFit(total.value??'',29,205,1,true)||!canFit(total.body,10,205,2)||payments.some(m=>!canFit(m.title,11,145,2,true)||!canFit(m.value??'',16,145,1,true))||page.blocks.some(b=>!['metric','text'].includes(b.kind)))return false;
  const first=pages.length;start(page);if(y>155){pages.splice(first);return false;}
  const top=y;rect(36,top,243,128,colors.dark);lines(total.title,54,top+16,205,12,true,colors.white);text(total.value??'',54,top+73,29,true,colors.green);lines(total.body,54,top+94,205,10,false,'#d5e3e1');
  if(payments.length){
   text('Etapas de pago',306,top+15,14,true);rect(306,top+30,500,19,colors.pale);let x=306;
   const palette=[colors.teal,colors.green,'#82aaa0'];
   payments.forEach((m,i)=>{const segment=500*(m.share??0)/100;rect(x,top+30,segment,19,palette[i]);x+=segment;});
   const col=500/payments.length;
   payments.forEach((m,i)=>{const xx=306+i*col;circle(xx+4,top+66,3.5,palette[i]);lines(m.title,xx+15,top+58,col-21,11,true);text(m.value??'',xx+15,top+106,16,true);text(m.body,xx+15,top+123,9,false,colors.muted);});
  }
  const col=770/3;let rowTop=top+152;
  for(let offset=0;offset<notes.length;offset+=3){
   const row=notes.slice(offset,offset+3);
   const height=(note:ProposalBlock)=>wrapProposal(note.title,13,col-20,true).length*18.2+wrapProposal(note.body,10,col-20).length*14+26;
   const h=Math.max(...row.map(height));
   if(rowTop+h>546){y=rowTop;bodyPage(page,notes.slice(offset),true,true);return true;}
   row.forEach((note,i)=>{const x=36+i*col;line(x,rowTop,x+col-20,rowTop,colors.green,2);let yy=rowTop+10;yy+=lines(note.title,x,yy,col-20,13,true)+6;lines(note.body,x,yy,col-20,10,false,colors.muted);});
   rowTop+=h;
  }
  if(outside(first)){pages.splice(first);return false;}return true;
 }
 function bodyPage(page:ProposalPage,blocks:ProposalBlock[],continuation=false,append=false){
  if(!append)start(page,continuation);
  // Two equal columns for equipment and figures; paragraphs remain on a single reading axis.
  for(let i=0;i<blocks.length;i++){
   const block=blocks[i];
   if(block.kind==='diagram'){
    if(y+126>535)start(page,true);
    if(energyFlow(block,y)){y+=145;continue;}
   }
   if(block.kind==='metric'||block.kind==='equipment'){
    const pair=[block];if(['metric','equipment'].includes(blocks[i+1]?.kind))pair.push(blocks[i+1]);
    const height=(b:ProposalBlock)=>wrapProposal(b.title,13,337,true).length*18.2+wrapProposal(b.value??'',21,337,true).length*29.4+wrapProposal(b.body,11,337).length*15.4+54;
    const h=Math.max(...pair.map(height));
    if(h<345){
     if(y+h>535)start(page,true);
     pair.forEach((b,j)=>{const x=36+j*395;rect(x,y,375,h,colors.pale);let top=y+18;top+=lines(b.title,x+18,top,337,13,true)+8;if(b.value)top+=lines(b.value,x+18,top,337,21,true)+8;lines(b.body,x+18,top,337,11,false,colors.muted);});
     y+=h+18;i+=pair.length-1;continue;
    }
   }
   const titleHeight=wrapProposal(block.title,17,770,true).length*24;
   if(y+titleHeight+45>535)start(page,true);
   line(36,y,806,y,colors.green,1);y+=13;
   if(block.title)y+=lines(block.title,36,y,770,17,true)+8;
   if(block.value){for(const row of wrapProposal(block.value,17,770,true)){if(y+24>535)start(page,true);text(row,36,y+17,17,true);y+=24;}y+=6;}
   for(const row of wrapProposal(block.body,12,770)){if(y+17>535)start(page,true);text(row,36,y+12,12,false,colors.muted);y+=17;}
   if(block.points){if(y+245>535)start(page,true);chart(block,36,y+10,770,235);y+=255;}
   y+=20;
  }
 }
 function cover(page:ProposalPage){
  const client=page.blocks.find(b=>b.id==='client'),metrics=page.blocks.filter(b=>b.kind==='metric'),col=770/Math.max(1,metrics.length);
  if(!canFit(page.title,36,413,3,true)||!canFit(page.subtitle,17,413,2)||client&&(!canFit(client.title,20,413,2,true)||!canFit(client.body,11,413,2))||metrics.length>3||metrics.some(m=>!canFit(m.title,11,col-35,2,true)||!canFit(m.value??'',27,col-35,1,true)||!canFit(m.body,10,col-35,2)))return false;
  current={id:'cover',title:page.title,ops:[]};pages.push(current);rect(0,0,842,595,colors.white);rect(0,0,842,376,colors.dark);
  current.ops.push({kind:'image',image:'roof',x:330,y:0,width:512,height:376,fit:'cover'});
  // Blend the photograph into the brand field; keep editable text above the image.
  current.ops.push({kind:'rect',x:330,y:0,width:512,height:376,color:colors.dark,opacity:.12});
  current.ops.push({kind:'fade',x:330,y:0,width:384,height:376,color:colors.dark,from:1,to:0,direction:'horizontal'});
  current.ops.push({kind:'fade',x:330,y:0,width:512,height:128,color:colors.dark,from:.7,to:0,direction:'vertical'});
  current.ops.push({kind:'image',image:'logo',x:36,y:22,width:101,height:67,fit:'contain'});
  right(q.folio,806,43,9,false,'#bbd0ce');right(documentTitle(q),806,62,9,true,colors.green);
  let top=115;top+=lines(page.title,36,top,413,36,true,colors.white)+14;top+=lines(page.subtitle,36,top,413,17,false,'#c7dcda')+20;
  if(client){line(36,top,88,top,colors.green,2);top+=15;top+=lines(client.title,36,top,413,20,true,colors.white)+8;top+=lines(client.body,36,top,413,11,false,'#c7dcda');}
  if(top>353){pages.pop();return false;}
  line(36,376,806,376,colors.green,3);
  metrics.forEach((m,i)=>{const x=36+i*col;if(i)line(x-14,407,x-14,524,colors.line);lines(m.title,x,414,col-35,11,true);text(m.value??'',x,473,27,true);lines(m.body,x,492,col-35,10,false,colors.muted);});
  const extras=page.blocks.filter(b=>b.id!=='client'&&b.kind!=='metric');
  if(extras.length)bodyPage({...page,cover:false,title:'Resumen de la propuesta',subtitle:page.subtitle},extras,true);
  return true;
 }
 for(const page of proposalLayout(q)){
  if(page.cover&&cover(page))continue;
  if(page.id==='equipment'&&equipmentPage(page))continue;
  if(page.id==='analysis'&&analysisPage(page))continue;
  if(page.id==='investment-page'&&investmentPage(page))continue;
  bodyPage(page,page.blocks);
 }
 pages.forEach((page,i)=>{
  page.ops.push({kind:'line',x:36,y:553,x2:806,y2:553,color:colors.line,thickness:.6});
  page.ops.push({kind:'text',x:36,y:577,size:9,bold:false,color:colors.muted,text:printableText(`${q.settings.name} · ${q.folio}`)});
  page.ops.push({kind:'text',x:755,y:577,size:9,bold:false,color:colors.muted,text:`${i+1} / ${pages.length}`});
 });
 return pages;
}
