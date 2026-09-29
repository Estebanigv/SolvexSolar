import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import {assignedAdviser,paymentBreakdown,netbillingScope,preliminaryNote,proposalTitle,customerTerms} from './commercial';
import {consumptionSummary} from './energy';
import type {SavedQuote} from './quote';
import {money,systemNames} from './quote';
export async function quotePdf(q:SavedQuote,logoBytes?:ArrayBuffer){
 const pdf=await PDFDocument.create();pdf.setTitle(`${q.folio} - ${q.settings.name}`);pdf.setAuthor(q.settings.name);
 const regular=await pdf.embedFont(StandardFonts.Helvetica);const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const navy=rgb(.02,.17,.22), lime=rgb(.65,.78,.14),grey=rgb(.33,.41,.45),white=rgb(1,1,1);
 const logo=logoBytes?await pdf.embedJpg(logoBytes):null;
 let page=pdf.addPage([595.28,841.89]),y=0,count=0;
 const clean=(s:string)=>s.replace(/[\u2010-\u2015]/g,'-').replace(/\u202f|\u00a0/g,' ').replace(/[^\x20-\x7e\xa0-\xff\n]/g,'');
 const draw=(s:string,x:number,yy:number,size=10,isBold=false,color=navy)=>page.drawText(clean(s),{x,y:yy,size,font:isBold?bold:regular,color});
 const newPage=()=>{if(count)page=pdf.addPage([595.28,841.89]);count++;page.drawRectangle({x:0,y:736,width:596,height:106,color:navy});if(logo)page.drawImage(logo,{x:35,y:748,width:102,height:68});draw(q.settings.name.toUpperCase(),155,793,20,true,white);draw(q.folio,155,771,10,false,white);draw(proposalTitle(q.input,q.calculation.official),155,751,9,true,lime);draw('Solvex Solar · '+q.folio,35,25,8,false,grey);draw(String(count),545,25,9,false,grey);y=711;};
 const space=(h:number)=>{if(y-h<58)newPage();};
 const text=(s:string,size=10,isBold=false,color=navy)=>{for(const paragraph of clean(s).split('\n')){let line='';for(const word of paragraph.split(/\s+/)){const candidate=line?line+' '+word:word;if((isBold?bold:regular).widthOfTextAtSize(candidate,size)>525&&line){space(size+6);draw(line,35,y-size,size,isBold,color);y-=size+6;line=word;}else line=candidate;}space(size+6);draw(line,35,y-size,size,isBold,color);y-=size+6;}};
 const heading=(s:string)=>{space(38);y-=13;page.drawRectangle({x:35,y:y-2,width:3,height:16,color:lime});draw(s,46,y,13,true);y-=28;};
 newPage();text('PROYECTO FOTOVOLTAICO',11,true,grey);text(systemNames[q.input.system],24,true);text(`${q.calculation.kwp.toLocaleString('es-CL',{maximumFractionDigits:3})} kWp · ${q.calculation.panels} paneles`,16,true);y-=15;
 text(`Cliente: ${q.input.customer.name||'Por completar'}`,12,true);text(`Correo: ${q.input.customer.email||'Por completar'} | Teléfono: ${q.input.customer.phone||'Por completar'}`);text(`Ubicación: ${[q.input.customer.address,q.input.customer.commune,q.input.customer.region].filter(Boolean).join(', ')||'Por completar'}`);text(`Fecha: ${new Date(q.date).toLocaleDateString('es-CL')} | Vigencia propuesta: ${q.settings.validDays} días`);text(`Monto de la boleta informado: ${money(q.input.customer.bill)}`);
 const consumption=consumptionSummary(q.input.energy);
 if(consumption&&q.input.energy){heading('CONSUMO INFORMADO');text(`${q.input.energy.consumptionKwh} kWh en ${q.input.energy.billingDays} días. ${q.input.energy.billReviewed?'Revisado con la boleta.':'Pendiente de revisión.'}`);text([q.input.energy.distributor,q.input.energy.tariff].filter(Boolean).join(' | '));text(`Equivalente a 30 días: ${consumption.equivalent30DaysKwh.toLocaleString('es-CL',{maximumFractionDigits:1})} kWh. No es una proyección anual.`,9,false,grey);}
 if(q.input.showItemDetails!==false){heading('EQUIPOS Y SERVICIOS');
 for(const l of q.calculation.lines){space(54);text(l.name,10,true);text(`${l.qty} ${l.unit} x ${l.price===null?'Sin precio':money(l.price)} = ${l.total===null?'Por confirmar':money(l.total)}`,10,false,grey);y-=8;}}
 space(150);heading('INVERSIÓN');text(`Subtotal: ${money(q.calculation.subtotal)}`);text(`Descuento: ${money(q.calculation.discount)}`);
 if(q.calculation.tax!==null){text(`Neto: ${money(q.calculation.net)} | IVA (${q.settings.taxRate}%): ${money(q.calculation.tax)}`);}else text('Tratamiento de IVA pendiente. Valores del catálogo sin IVA adicional.',10,false,grey);
 text(`${q.calculation.complete?'Total calculado':'Subtotal parcial, faltan importes'}: ${money(q.calculation.total)} CLP`,18,true);text(`Forma de pago propuesta: ${q.input.payment}`);
 const payments=paymentBreakdown(q.calculation.total,q.settings);
 if(payments.length){heading('DISTRIBUCIÓN DE PAGOS');for(const row of payments)text(`${row.label} (${row.percent}%): ${money(row.amount)}`);}
 if(q.calculation.warnings.length){heading('VALIDACIONES PENDIENTES');for(const w of q.calculation.warnings)text('- '+w,9,false,grey);}
 heading('ALCANCE Y CONDICIONES');if(q.input.proposalType==='preliminary')text(preliminaryNote); text(q.input.notes||'Alcance técnico pendiente de confirmar en visita y revisión del proyecto.');text(customerTerms(q.input,q.settings)||'Condiciones comerciales pendientes de aprobación.');
 if(netbillingScope(q.input,q.settings))text(netbillingScope(q.input,q.settings));
 space(225);heading('GARANTÍAS');text(q.settings.warranty||'Garantías por modelo y garantía de instalación pendientes de confirmación.');
 const adviser=assignedAdviser(q.input,q.settings);if(adviser){heading('TU CONTACTO COMERCIAL');text(adviser.name,11,true);text(`${adviser.email} | ${adviser.phone}`);}
 heading('DATOS DE LA EMPRESA');text(q.settings.legal||q.settings.name,11,true);if(q.settings.rut)text('RUT: '+q.settings.rut);text([q.settings.email,q.settings.phone].filter(Boolean).join(' | '));
 text('No se incluyen estimaciones de ahorro, generación o retorno sin parámetros técnicos validados.',9,false,grey);
 return new Uint8Array(await pdf.save());
}
