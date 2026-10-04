import type {SavedQuote} from './quote';
import {customerTerms,customerDocumentSettings} from './commercial';

export const proposalImages={logo:'/proposal/logo-transparent-v2.png',roof:'/proposal/solar-roof.jpg',home:'/proposal/solar-home.jpg'};

// Compare final payable amounts, including VAT in net-price catalogs.
// Older quotes keep their existing presentation until explicitly enabled.
export function proposalDiscount(q:SavedQuote){
 const c=q.calculation;
 if(q.input.showDiscount!==true||c.discount<=0)return null;
 const before=c.subtotal+(q.settings.taxMode==='net'?Math.round(c.subtotal*q.settings.taxRate/100):0);
 const amount=before-c.total;
 if(amount<=0)return null;
 return {percent:q.input.discountPercent,amount,before,total:c.total};
}

// Visibility only affects the customer document; the saved calculation remains intact.
export function proposalLines(q:SavedQuote){
 if(q.input.showItemDetails===false)return [];
 const hidden=new Set(q.input.hiddenLineIds??[]);
 return q.calculation.lines.filter(line=>!hidden.has(line.id));
}
export function hasHiddenProposalLines(q:SavedQuote){
 return q.input.showItemDetails!==false&&proposalLines(q).length<q.calculation.lines.length;
}
export const partialDetailNote='El total incluye todos los equipos y servicios de la configuración cotizada, también los que no se desglosan en este documento.';

export function proposalEquipment(q:SavedQuote){
 // The customer summary always describes the actual saved equipment. Legacy
 // item visibility controls must never reintroduce cost breakdowns into it.
 const {calculation:c,input}=q;
 const panels=c.lines.filter(l=>l.category==='PANEL FOTOVOLTAICO');
 const rows:{label:string;value:string;note:string;kind:'panels'|'inverter'|'battery'}[]=[];
 if(panels.length)rows.push({kind:'panels',label:`${c.panels.toLocaleString('es-CL')} ${c.panels===1?'panel solar':'paneles solares'} · Potencia total ${c.kwp.toLocaleString('es-CL',{maximumFractionDigits:3})} kWp`,value:panels.map(l=>`${l.qty.toLocaleString('es-CL')} × ${l.name}`).join(' · '),note:'Certificado SEC'});
 for(const line of c.lines.filter(l=>l.category.includes('INVERSOR')))rows.push({kind:'inverter',label:`${line.qty.toLocaleString('es-CL')} ${line.qty===1?'inversor':'inversores'} ${input.system==='OFF GRID'?'Off Grid':input.system.includes('HIBRIDO')?'híbrido':'On Grid'}`,value:line.name,note:input.system==='OFF GRID'?'Sistema independiente de la red eléctrica':'Permite Netbilling'});
 for(const line of c.lines.filter(l=>l.category.includes('BATER')))rows.push({kind:'battery',label:`${line.qty.toLocaleString('es-CL')} ${line.qty===1?'batería':'baterías'}${/litio/i.test(line.name)?' de litio':''}`,value:line.name,note:'Almacenamiento de energía'});
 return rows;
}

// Only surface durations explicitly present in the saved commercial terms.
export function proposalWarranties(text:string){
 return [
  {label:'Paneles solares',pattern:/(\d+)\s*años?\s+(?:para\s+)?(?:los\s+)?paneles/i},
  {label:'Inversores',pattern:/(\d+)\s*años?\s+(?:para\s+)?(?:los\s+)?inversores/i},
  {label:'Instalación',pattern:/(\d+)\s*años?\s+de\s+garantía\s+de\s+instalación/i},
 ].flatMap(({label,pattern})=>{const match=text.match(pattern);return match?[{label,years:Number(match[1])}]:[]});
}

export type ProposalTextBlock={title:string;items:string[]};

// Preserve the saved wording. Only separate sentences and group recognizable clauses.
// Unknown wording stays visible in a neutral section rather than being discarded.
export function proposalSentences(value:string){
 return value.split(/\n+|(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ])/u).map(s=>s.trim()).filter(Boolean);
}
function groupedText(value:string,groups:{title:string;match:RegExp}[],fallback:string):ProposalTextBlock[]{
 const result=groups.map(g=>({title:g.title,items:[] as string[]}));
 const remaining:ProposalTextBlock={title:fallback,items:[]};
 for(const sentence of proposalSentences(value)){
  const index=groups.findIndex(g=>g.match.test(sentence));
  (index<0?remaining:result[index]).items.push(sentence);
 }
 return [...result,remaining].filter(g=>g.items.length);
}
export function proposalReadingSections(q:SavedQuote){
 q={...q,settings:customerDocumentSettings(q.input,q.settings)};
 return {
  warranty:groupedText(q.settings.warranty||'Garantías por modelo e instalación pendientes de confirmar.',[
   {title:'Instalación',match:/^(?:\d+\s*años? de garantía de instalación|Garantía de instalación)/i},
   {title:'Equipos y fabricante',match:/^Garantía del fabricante|^\d+\s*años? para (?:paneles|inversores)/i},
   {title:'Postventa y soporte',match:/^Servicio postventa/i},
   {title:'Baterías',match:/^La garantía de baterías/i},
  ],'Cobertura y condiciones'),
  scope:groupedText(q.input.notes||'Alcance técnico pendiente de validar.',[
   {title:'Incluye',match:/^Incluye\b/i},
   {title:'No incluye',match:/^Excluye\b/i},
   {title:'Por validar',match:/^Sujeto a visita|^Sujeta a visita/i},
  ],'Alcance del proyecto'),
  commercial:groupedText(customerTerms(q.input,q.settings)||'Condiciones comerciales pendientes de aprobación.',[
   {title:'Precio y vigencia',match:/^Precios\b|^Valor\b|^Vigencia\b/i},
   {title:'Medios e hitos de pago',match:/^Formas de pago|^Anticipo\b/i},
   {title:'Equipos y servicio de instalación',match:/^Incluye\b/i},
   {title:'Adicionales y límites del alcance',match:/^Baterías y otros equipos|^Traslados\b/i},
   {title:'Validación técnica',match:/^El alcance\b/i},
  ],'Otras condiciones'),
 };
}
