import type {SavedQuote} from './quote';
import {customerTerms} from './commercial';

export const proposalImages={roof:'/proposal/solar-roof.jpg',home:'/proposal/solar-home.jpg'};

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
 if(q.input.showItemDetails===false)return [];
 const groups=[{label:'Paneles solares',match:(category:string)=>category.includes('PANEL FOTOVOLTAICO')},{label:'Inversor',match:(category:string)=>category.includes('INVERSOR')},{label:'Almacenamiento',match:(category:string)=>category.includes('BATER')}];
 const rows=groups.flatMap(group=>{const selected=proposalLines(q).filter(l=>group.match(l.category));return selected.length?[{label:group.label,value:selected.map(l=>`${l.qty.toLocaleString('es-CL')} × ${l.name}`).join(' · ')}]:[]});
 if(proposalLines(q).some(l=>l.id==='installation'))rows.push({label:'Instalación',value:'Servicio considerado en esta propuesta'});
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
   {title:'Precio y vigencia',match:/^Precios\b|^Vigencia\b/i},
   {title:'Medios e hitos de pago',match:/^Formas de pago|^Anticipo\b/i},
   {title:'Equipos y servicio de instalación',match:/^Incluye\b/i},
   {title:'Adicionales y límites del alcance',match:/^Baterías y otros equipos|^Traslados\b/i},
   {title:'Validación técnica',match:/^El alcance\b/i},
  ],'Otras condiciones'),
 };
}
