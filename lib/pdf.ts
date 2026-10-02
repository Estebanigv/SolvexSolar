import {BlendMode,PDFDocument,StandardFonts,rgb,pushGraphicsState,popGraphicsState,rectangle,clip,endPath,type PDFImage} from 'pdf-lib';
import {assignedAdviser,paymentBreakdown,netbillingScope,preliminaryNote,proposalTitle} from './commercial';
import {consumptionSummary} from './energy';
import {proposalEquipment,proposalWarranties,proposalReadingSections,type ProposalTextBlock} from './proposal-document';
import type {SavedQuote} from './quote';
import {money,systemNames} from './quote';
import {publishedProjection,projectionAssumptions} from './projection';

type ProposalPhotos={roof?:ArrayBuffer;home?:ArrayBuffer};
export async function quotePdf(q:SavedQuote,logoBytes?:ArrayBuffer,photos:ProposalPhotos={}){
 const pdf=await PDFDocument.create();pdf.setTitle(`${q.folio} - ${q.settings.name}`);pdf.setAuthor(q.settings.name);
 const regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const ink=rgb(.05,.20,.25),brand=rgb(.03,.17,.22),teal=rgb(.06,.25,.28),green=rgb(.69,.80,.24),muted=rgb(.34,.44,.48),rule=rgb(.84,.89,.90),pale=rgb(.94,.96,.93),white=rgb(1,1,1),light=rgb(.79,.86,.86),lime=rgb(.79,.86,.38);
 const logo=logoBytes?await pdf.embedJpg(logoBytes):null,roof=photos.roof?await pdf.embedJpg(photos.roof):null,home=photos.home?await pdf.embedJpg(photos.home):null;
 const W=595.28,H=841.89,M=36,R=W-M,CW=R-M;
 let page=pdf.addPage([W,H]),y=0,count=0,section='Resumen del proyecto';const sections:string[]=[];
 const clean=(s:string)=>s.replace(/[\u2010-\u2015]/g,'-').replace(/\u202f|\u00a0/g,' ').replace(/×/g,'x').replace(/[^\x20-\x7e\xa0-\xff\u2022\n]/g,'');
 const draw=(s:string,x:number,baseline:number,size=10,isBold=false,color=ink)=>page.drawText(clean(s),{x,y:baseline,size,font:isBold?bold:regular,color});
 const right=(s:string,x:number,baseline:number,size=10,isBold=false,color=ink)=>draw(s,x-(isBold?bold:regular).widthOfTextAtSize(clean(s),size),baseline,size,isBold,color);
 const line=(yy:number,x=M,end=R)=>page.drawLine({start:{x,y:yy},end:{x:end,y:yy},thickness:.6,color:rule});
 const box=(x:number,top:number,width:number,height:number,color=pale)=>page.drawRectangle({x,y:top-height,width,height,color});
 const fitted=(s:string,size:number,width:number,isBold=true)=>Math.min(size,width/(isBold?bold:regular).widthOfTextAtSize(clean(s),1));
 function wrap(s:string,size=10,width=CW,isBold=false){const font=isBold?bold:regular,result:string[]=[];for(const paragraph of clean(s).split('\n')){let current='';for(const word of paragraph.split(/\s+/)){const candidate=current?current+' '+word:word;if(font.widthOfTextAtSize(candidate,size)<=width){current=candidate;continue}if(current){result.push(current);current=''}for(const char of word){if(font.widthOfTextAtSize(current+char,size)>width&&current){result.push(current);current=''}current+=char}}result.push(current)}return result}
 function imageCover(img:PDFImage,x:number,top:number,width:number,height:number){const scale=Math.max(width/img.width,height/img.height);page.pushOperators(pushGraphicsState(),rectangle(x,top-height,width,height),clip(),endPath());page.drawImage(img,{x:x+(width-img.width*scale)/2,y:top-height+(height-img.height*scale)/2,width:img.width*scale,height:img.height*scale});page.pushOperators(popGraphicsState())}
 const newPage=(nextSection=section)=>{if(count)page=pdf.addPage([W,H]);count++;section=nextSection;sections.push(section);if(count>1){draw(q.settings.name,M,H-30,11,true);right(q.folio,R,H-30,9,false,muted);line(H-42);y=H-64}};
 const space=(height:number)=>{if(y-height<57)newPage()};
 function text(s:string,size=9.5,isBold=false,color=muted){for(const row of wrap(s,size,CW,isBold)){space(size+4.5);draw(row,M,y-size,size,isBold,color);y-=size+4.5}}
 function block(s:string,x:number,top:number,width:number,size=10,isBold=false,color=muted){const rows=wrap(s,size,width,isBold);rows.forEach((row,i)=>draw(row,x,top-size-i*(size+4.5),size,isBold,color));return rows.length*(size+4.5)}
 const heading=(s:string)=>{space(63);y-=6;draw(s,M,y-13,13,true);y-=27;};
 const title=(s:string,subtitle:string)=>{space(90);draw(s,M,y-25,25,true);y-=36;text(subtitle,10);y-=8};
 newPage();
 box(0,H,W,84,brand);if(logo)page.drawImage(logo,{x:M-10,y:H-70,width:91,height:61,blendMode:BlendMode.Lighten});
 draw(q.settings.name,M+86,H-37,fitted(q.settings.name,17,235),true,white);draw('Proyectos que iluminan',M+86,H-54,8,false,light);
 right(proposalTitle(q.input,q.calculation.official),R,H-32,8,true,lime);right(q.folio,R,H-51,9,false,white);
 const heroTop=H-84;box(0,heroTop,W,208,teal);if(roof)imageCover(roof,326,heroTop,W-326,208);
 draw(systemNames[q.input.system],M,heroTop-33,10,true,lime);draw('Tu proyecto',M,heroTop-78,29,true,white);draw('fotovoltaico',M,heroTop-113,29,true,white);
 draw(q.calculation.kwp.toLocaleString('es-CL',{maximumFractionDigits:3})+' kWp',M,heroTop-156,28,true,lime);draw(q.calculation.panels+' paneles para tu proyecto',M,heroTop-179,10,false,light);
 if(roof){box(W-127,heroTop-187,112,14,brand);draw('Imagen referencial',W-119,heroTop-197,8,false,white)}
 y=heroTop-228;
 const facts=[['Cliente',q.input.customer.name||'Por completar'],['Teléfono',q.input.customer.phone||'Por completar'],['Correo',q.input.customer.email||'Por completar'],['Región',q.input.customer.region||'Por completar'],['Comuna',q.input.customer.commune||'Por completar'],['Emisión',new Date(q.date).toLocaleDateString('es-CL')]];
 const factWidth=(CW-28)/3;
 for(let row=0;row<2;row++){const values=facts.slice(row*3,row*3+3),height=Math.max(...values.map(([,v])=>wrap(v,9.5,factWidth,true).length*14))+23;space(height);values.forEach(([label,value],i)=>{const x=M+i*(factWidth+14);draw(label,x,y-8,8,false,muted);block(value,x,y-16,factWidth,9.5,true,ink)});y-=height+8}
 if(q.input.customer.address){text(q.input.customer.address,9);y-=7}line(y);y-=3;
 heading('Sistema cotizado');space(84);const half=(CW-12)/2;
 box(M,y,half,76,teal);box(M+half+12,y,half,76,green);
 draw(q.calculation.complete?'Inversión total':'Subtotal parcial',M+15,y-18,9,false,light);draw(money(q.calculation.total),M+15,y-47,fitted(money(q.calculation.total),26,half-30),true,white);draw(q.calculation.tax===null?'IVA pendiente · CLP':'Valor final con IVA · CLP',M+15,y-64,8,false,light);
 draw('Potencia del sistema',M+half+27,y-18,9,false,ink);draw(q.calculation.kwp.toLocaleString('es-CL',{maximumFractionDigits:3})+' kWp',M+half+27,y-47,25,true);draw(q.calculation.panels+' paneles',M+half+27,y-64,8,false,ink);y-=87;
 const equipment=proposalEquipment(q);
 const consumption=consumptionSummary(q.input.energy);
 if(consumption&&q.input.energy){space(104);heading('Consumo de referencia');const values=[['Boleta informada',money(q.input.customer.bill)],['Consumo del período',q.input.energy.consumptionKwh?.toLocaleString('es-CL')+' kWh'],['Período facturado',q.input.energy.billingDays+' días']];values.forEach(([label,value],i)=>{const x=M+i*(factWidth+14);draw(label,x,y-8,8,false,muted);draw(value,x,y-29,17,true)});y-=41;text([q.input.energy.distributor,q.input.energy.tariff,q.input.energy.billReviewed?'Revisado con la boleta':'Pendiente de revisión'].filter(Boolean).join(' · '),8);text(`Equivalente a 30 días: ${consumption.equivalent30DaysKwh.toLocaleString('es-CL',{maximumFractionDigits:1})} kWh. No representa una proyección anual.`,8);}
 newPage('Equipos y pagos');title('Equipos y alcance','Los equipos seleccionados para tu proyecto y su forma de pago.');
 heading('Tu proyecto incluye');y-=5;
 for(const item of equipment){
  const width=CW-30;
  const height=wrap(item.label,16,width,true).length*20.5+wrap(item.value,11,width,true).length*15.5+wrap(item.note,10,width).length*14.5+39;
  space(height);page.drawRectangle({x:M,y:y-height+13,width:3,height:height-18,color:green});
  let top=y-3;
  top-=block(item.label,M+17,top,width,16,true,teal)+8;
  top-=block(item.value,M+17,top,width,11,true,ink)+5;
  block(item.note,M+17,top,width,10,false,muted);
  y-=height;line(y);y-=16;
 }
 text(`Vigencia de ${q.settings.validDays} días desde la emisión.`,10);y-=10;
 const c=q.calculation;
 const payments=paymentBreakdown(c.total,q.settings);const paymentHeight=payments.length?72:0;space(58+paymentHeight);heading('Forma de pago');text(q.input.payment,10,true);y-=10;
 for(let i=0;i<payments.length;i+=3){const group=payments.slice(i,i+3),col=(CW-20)/3;const height=Math.max(...group.map(row=>wrap(row.label,9,col-20,true).length*13.5))+54;space(height);group.forEach((row,j)=>{const x=M+j*(col+10);box(x,y,col,height,pale);block(row.label,x+10,y-10,col-20,9,true,ink);const labelHeight=wrap(row.label,9,col-20,true).length*13.5;draw(`${row.percent}% del total`,x+10,y-23-labelHeight,8,false,muted);draw(money(row.amount),x+10,y-height+12,fitted(money(row.amount),17,col-20),true,ink)});y-=height+10}
 if(c.warnings.length){heading('Propuesta en revisión');for(const warning of c.warnings)text('- '+warning,9,false,rgb(.46,.36,.16))}
 const forecast=publishedProjection(q);
 if(forecast){
  newPage('Proyección y supuestos');title('El valor de tu energía','Escenario estimado, sujeto a los supuestos revisados del proyecto.');
  const metrics=[['Ahorro mensual inicial',money(forecast.input.monthlySavings!)],['Recuperación estimada',forecast.payback!==null?forecast.payback.toLocaleString('es-CL',{maximumFractionDigits:1})+' años':'Fuera del horizonte'],['Balance neto a '+forecast.input.years+' años',money(forecast.net)]];
  const col=(CW-20)/3;space(80);metrics.forEach(([label,value],i)=>{const x=M+i*(col+10);box(x,y,col,70,teal);draw(label,x+10,y-18,8,false,light);draw(value,x+10,y-45,fitted(value,19,col-20),true,lime)});y-=86;
  text('Inversión total: '+money(c.total)+'. Ahorro del primer año después de costos: '+money(forecast.annual)+'.',10,true);y-=6;heading('Ahorro acumulado');text('Después de mantenciones y reposición; antes de descontar la inversión inicial de '+money(c.total)+'.',10);y-=15;
  const max=Math.max(1,c.total,...forecast.rows.map(r=>r.cumulative));
  for(const row of forecast.rows.filter(r=>r.year===1||r.year%5===0||r.year===forecast.input.years)){
   space(35);draw('Año '+row.year,M,y-14,10,true);box(M+60,y-3,285,17,pale);if(row.cumulative>0)box(M+60,y-3,285*row.cumulative/max,17,teal);right(money(row.cumulative),R,y-15,10,true);y-=32;
  }
  y-=8;text('Ahorro acumulado: '+money(forecast.cumulative)+'. Balance después de inversión: '+money(forecast.net)+'.',10,true);
  if(forecast.co2Tonnes!==null){heading('Impacto ambiental estimado');text(forecast.co2Tonnes.toLocaleString('es-CL',{maximumFractionDigits:2})+' t CO2 evitadas en el primer año',15,true,teal);text(forecast.input.avoidedKwh?.toLocaleString('es-CL')+' kWh sustituidos x '+forecast.input.emissionFactor+' kg CO2/kWh. Fuente: '+forecast.input.emissionSource,9)}
  heading('Cómo se calculó');text(forecast.input.savingsSource,10);text(projectionAssumptions(forecast.input),9);y-=6;text('La recuperación es el primer cruce del ahorro acumulado con la inversión. Reposiciones posteriores pueden reducir el balance. El ahorro mensual inicial se expresa antes de costos.',9);
 }
 const reading=proposalReadingSections(q);
 function bulletList(items:string[],x=M,width=CW,size=10){
  for(const item of items){const rows=wrap(item,size,width-13);space(Math.min(rows.length,2)*(size+4.5)+5);
   rows.forEach((row,i)=>{space(size+4.5);if(i===0)draw('•',x,y-size,size,true,teal);draw(row,x+13,y-size,size,false,muted);y-=size+4.5});y-=6;
  }
 }
 function readingBlock(group:ProposalTextBlock){space(64);draw(group.title,M,y-12,12,true);y-=23;bulletList(group.items);y-=10}
 newPage('Garantías y alcance');
 if(home){imageCover(home,M,y,CW,65);box(R-115,y-48,115,14,brand);draw('Imagen referencial',R-107,y-58,8,false,white);y-=80}
 heading('Respaldo para tu proyecto');const warranties=proposalWarranties(q.settings.warranty);
 if(warranties.length){space(70);box(M,y,CW,58,teal);warranties.forEach((w,i)=>{const x=M+15+i*(CW/3);draw(w.years+' '+(w.years===1?'año':'años'),x,y-28,23,true,lime);draw(w.label,x,y-48,9,false,light)});y-=78}
 const coverageWidth=(CW-28)/2;
 for(let i=0;i<reading.warranty.length;i+=2){
  const pair=reading.warranty.slice(i,i+2),height=Math.max(...pair.map(g=>28+g.items.reduce((h,item)=>h+wrap(item,10,coverageWidth-12).length*14.5+6,0)))+14;
  // Very long custom conditions flow as full-width text instead of overflowing a column.
  if(height>620){for(const group of pair)readingBlock(group);continue}
  space(height);pair.forEach((group,j)=>{const x=M+j*(coverageWidth+28);draw(group.title,x,y-11,11,true);let top=y-25;for(const item of group.items){draw('•',x,top-10,10,true,teal);top-=block(item,x+12,top,coverageWidth-12,10)+6}});y-=height;
 }
 heading('Alcance de tu proyecto');
 if(q.input.proposalType==='preliminary'){
  const rows=wrap(preliminaryNote,10,CW-28),height=rows.length*14.5+45;space(height+14);box(M,y,CW,height,pale);draw('Antes de la cotización final',M+14,y-20,11,true);block(preliminaryNote,M+14,y-30,CW-28,10);y-=height+18;
 }
 for(const group of reading.scope)readingBlock(group);
 newPage('Condiciones comerciales');title('Condiciones claras','Pagos, servicios y validaciones de tu propuesta.');
 for(const group of reading.commercial){
  const x=M+168,width=CW-168,height=Math.max(wrap(group.title,11,145,true).length*15.5,group.items.reduce((h,item)=>h+wrap(item,10,width-13).length*14.5+6,0));
  if(height>610){readingBlock(group);continue}
  space(height+28);const groupTop=y;block(group.title,M,y,145,11,true,ink);bulletList(group.items,x,width);y=Math.min(y,groupTop-height);y-=8;line(y);y-=18;
 }
 const netbilling=netbillingScope(q.input,q.settings);
 if(netbilling){heading('Certificación y Netbilling');bulletList([netbilling])}
 if(q.input.financingNote?.trim()){heading('Acompañamiento financiero');bulletList([q.input.financingNote])}
 const adviser=assignedAdviser(q.input,q.settings);heading('Conversemos sobre tu proyecto');text(adviser?.name||q.settings.legal||q.settings.name,11,true,ink);text([adviser?.email||q.settings.email,adviser?.phone||q.settings.phone].filter(Boolean).join(' · '),9);y-=8;if(adviser)text(q.settings.legal||q.settings.name,9,true);if(adviser&&adviser.email!==q.settings.email)text(q.settings.email,9);y-=8;text('Las fotografías son referenciales y no representan la instalación cotizada. No se incluyen estimaciones de ahorro, generación o retorno sin parámetros técnicos validados.',8);
 const pages=pdf.getPages();pages.forEach((p,i)=>{page=p;line(42);draw(q.settings.name+' · '+sections[i],M,27,8,false,muted);right(`${q.folio} · ${i+1} / ${pages.length}`,R,27,8,false,muted)});
 return new Uint8Array(await pdf.save());
}
