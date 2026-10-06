import type {SavedQuote} from './quote';
import {money,systemNames} from './quote';
import {customerDocumentSettings,assignedAdviser,paymentBreakdown,netbillingScope,preliminaryNote} from './commercial';
import {proposalEquipment,proposalDiscount} from './proposal-document';
import {publishedProjection,projectionAssumptions} from './projection';
import {newProposalContent} from './proposal-content';

export type ProposalBlock={id:string;kind:'text'|'metric'|'equipment'|'chart';title:string;body:string;value?:string;binding?:'total'|'payment'|'savings'|'discount';points?:{label:string;value:number}[]};
export type ProposalPage={id:string;cover?:boolean;title:string;subtitle:string;blocks:ProposalBlock[]};
export const usesAtlasProposal=(q:SavedQuote)=>!!q.input.proposalContent;

// HTML, the editor and the downloadable PDF share this one content model.
export function proposalLayout(original:SavedQuote,includeHidden=false):ProposalPage[]{
 const q={...original,settings:customerDocumentSettings(original.input,original.settings)};
 const {input,settings,calculation:c}=q;
 const content=input.proposalContent??newProposalContent(),projection=publishedProjection(q);
 const adviser=assignedAdviser(input,settings),discount=proposalDiscount(q);
 const text=(key:string,fallback:string)=>content.text[key]??fallback;
 const pages:ProposalPage[]=[
  {id:'cover',cover:true,title:systemNames[input.system],subtitle:'Tu techo. Tu energía.',blocks:[
   {id:'client',kind:'text',title:input.customer.name||'Nombre del cliente',body:[input.customer.commune,new Date(q.issuedAt??q.date).toLocaleDateString('es-CL',{timeZone:'America/Santiago'})].filter(Boolean).join(' · ')},
   {id:'investment',kind:'metric',title:'Inversión total',value:money(c.total),binding:'total',body:c.tax===null?'Pesos chilenos · IVA por confirmar':'Pesos chilenos · IVA incluido'},
   {id:'power',kind:'metric',title:'Potencia instalada',value:`${c.kwp.toLocaleString('es-CL',{maximumFractionDigits:3})} kWp`,body:`${c.panels} paneles solares`},
   ...(projection?[{id:'saving-summary',kind:'metric' as const,title:'Ahorro mensual estimado',value:money(projection.input.monthlySavings!),binding:'savings' as const,body:'Primer año · Según escenario validado'}]:[]),
   ...(discount?[{id:'discount',kind:'text' as const,binding:'discount' as const,title:'Descuento para tu proyecto',body:`${discount.percent?`${discount.percent}% de descuento. `:''}Ahorras ${money(discount.amount)}. Precio anterior: ${money(discount.before)}.`}]:[]),
  ]},
  {id:'equipment',title:'Lo que forma tu sistema.',subtitle:'Equipamiento y alcance',blocks:[
   ...proposalEquipment(q).map((item,i)=>({id:`equipment-${i}`,kind:'equipment' as const,title:item.label,value:item.value,body:item.note})),
   {id:'scope',kind:'text',title:'Suministro e instalación',body:input.notes||'Alcance de instalación pendiente de validar.'},
   ...(input.proposalType==='preliminary'?[{id:'technical',kind:'text' as const,title:'Validación técnica',body:preliminaryNote}]:[]),
  ]},
  ...(projection?[{id:'analysis',title:'El valor de tu energía.',subtitle:'Análisis del proyecto',blocks:[
   {id:'saving',kind:'metric' as const,title:'Ahorro mensual inicial',value:money(projection.input.monthlySavings!),binding:'savings' as const,body:'Antes de costos de mantención y reposición'},
   {id:'payback',kind:'metric' as const,title:'Recuperación estimada',value:projection.payback===null?'Fuera del horizonte':`${projection.payback.toLocaleString('es-CL',{maximumFractionDigits:1})} años`,body:`Inversión ${money(c.total)}`},
   {id:'chart',kind:'chart' as const,title:'Ahorro acumulado',body:'Después de mantención y reposiciones, antes de descontar la inversión.',points:projection.rows.filter(r=>r.year===1||r.year%5===0||r.year===projection.input.years).map(r=>({label:`Año ${r.year}`,value:Math.round(r.cumulative)}))},
   {id:'assumptions',kind:'text' as const,title:'Supuestos del escenario',body:projection.input.savingsSource+'\n'+projectionAssumptions(projection.input)},
   ...(projection.co2Tonnes!==null?[{id:'environment',kind:'text' as const,title:'Impacto ambiental estimado',body:`${projection.co2Tonnes.toLocaleString('es-CL',{maximumFractionDigits:2})} toneladas de CO₂ evitadas en el primer año. ${projection.input.avoidedKwh?.toLocaleString('es-CL')} kWh sustituidos × ${projection.input.emissionFactor} kg CO₂/kWh. Fuente: ${projection.input.emissionSource}`}]:[]),
  ]}]:[]),
  {id:'investment-page',title:'Inversión y respaldo.',subtitle:'Tu propuesta, en detalle',blocks:[
   {id:'closing-total',kind:'metric',title:'Total del proyecto',value:money(c.total),binding:'total',body:input.payment},
   ...paymentBreakdown(c.total,settings).map((p,i)=>({id:`payment-${i}`,kind:'metric' as const,title:p.label,value:money(p.amount),binding:'payment' as const,body:`${p.percent}% del total`})),
   {id:'warranty',kind:'text',title:'Respaldo del proyecto',body:settings.warranty||'Garantías pendientes de confirmar.'},
   {id:'terms',kind:'text',title:'Condiciones comerciales',body:settings.terms||'Condiciones pendientes de confirmar.'},
   {id:'validity',kind:'text',title:'Vigencia',body:`${settings.validDays} días desde la emisión.`},
   ...(netbillingScope(input,settings)?[{id:'netbilling',kind:'text' as const,title:'Certificación y Netbilling',body:netbillingScope(input,settings)}]:[]),
   ...(input.financingNote?[{id:'financing',kind:'text' as const,title:'Acompañamiento financiero',body:input.financingNote}]:[]),
   {id:'contact',kind:'text',title:'Conversemos sobre tu proyecto',body:[adviser?.name||settings.legal||settings.name,adviser?.email||settings.email,adviser?.phone||settings.phone].filter(Boolean).join('\n')},
  ]},
  ...content.sections.filter(s=>!s.pageId).map(section=>({id:`custom-${section.id}`,title:section.title,subtitle:'Información adicional',blocks:[{id:`custom-body-${section.id}`,kind:'text' as const,title:'',body:section.body}]})),
 ];
 for(const page of pages)page.blocks.push(...content.sections.filter(s=>s.pageId===page.id).map(s=>({id:`custom-body-${s.id}`,kind:'text' as const,title:s.title,body:s.body})));
 const mapped=pages.map(page=>({...page,title:text(`${page.id}:title`,page.title),subtitle:text(`${page.id}:subtitle`,page.subtitle),blocks:page.blocks.map(block=>({...block,title:text(`${block.id}:title`,block.title),body:!block.binding?text(`${block.id}:body`,block.body):block.body,value:!block.binding&&block.value!==undefined?text(`${block.id}:value`,block.value):block.value})).filter(b=>includeHidden||!content.hidden.includes(b.id))})).filter(p=>includeHidden||!content.hidden.includes(p.id));
 const order=content.order;
 return mapped.sort((a,b)=>{const ai=order.indexOf(a.id),bi=order.indexOf(b.id);return (ai<0?order.length+pages.findIndex(p=>p.id===a.id):ai)-(bi<0?order.length+pages.findIndex(p=>p.id===b.id):bi)});
}
