import {z} from 'zod';
import type {Product,QuoteInput} from './quote';

export const customServiceSchema=z.object({
 id:z.string().uuid(),name:z.string().max(180),
 quantity:z.number().finite().min(0).max(100000),
 price:z.number().finite().min(0).max(1e10).nullable(),
});
export type CustomService=z.infer<typeof customServiceSchema>;
export const certificationConflictMessage='Selecciona TE1 o TE4: no pueden incluirse ambos en la misma cotización.';
export function certificationType(product:Pick<Product,'name'|'category'>):'TE1'|'TE4'|null{
 const text=`${product.category} ${product.name}`.toUpperCase();
 if(/\bTE?\s*-?\s*1\b/.test(text))return 'TE1';
 if(/\bTE\s*-?\s*4\b/.test(text))return 'TE4';
 return null;
}
export function hasCertificationConflict(products:Pick<Product,'name'|'category'>[]){
 const types=new Set(products.map(certificationType));return types.has('TE1')&&types.has('TE4');
}
export function serviceQuantities(input:Pick<QuoteInput,'quantities'|'system'>,products:Product[],selected:Product,quantity:number){
 const quantities={...input.quantities,[selected.id]:serviceQuantity(selected,quantity)},kind=certificationType(selected);
 if(quantity>0&&kind)for(const product of products){
  const other=certificationType(product);
  if(product.system===input.system&&other&&other!==kind)quantities[product.id]=0;
 }
 return quantities;
}

const normalizedCategory=(p:Pick<Product,'category'>)=>p.category.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
export const requiredMaterial=(p:Pick<Product,'category'>)=>/^(KIT DE ADHESIVOS?|TABLERO ELECTRICO|TABLERO TRIFASICO)$/.test(normalizedCategory(p));
export const isLinearDrop=(p:Pick<Product,'category'>)=>normalizedCategory(p)==='BAJADA UNICA METRO LINEAL';
export const isLinearService=(p:Pick<Product,'category'>)=>isLinearDrop(p)||/^ACOMETIDA(?: |$)/.test(normalizedCategory(p));
export function serviceQuantity(product:Pick<Product,'category'|'unit'>,quantity:number){
 const n=Number.isFinite(quantity)?Math.max(0,quantity):0;
 if(requiredMaterial(product))return Math.max(1,Math.floor(n));
 if(isLinearService(product))return n===0?0:Math.max(15,Math.ceil(n));
 return product.unit==='unidad'?Math.floor(n):n;
}
// Apply the same required materials and linear-metre increments in UI and server calculations.
export function requiredServiceQuantities(input:Pick<QuoteInput,'system'|'quantities'>,products:Product[]){
 const quantities={...input.quantities};
 for(const p of products)if(p.system===input.system&&(requiredMaterial(p)||isLinearService(p)&&quantities[p.id]>0))quantities[p.id]=serviceQuantity(p,quantities[p.id]??0);
 return quantities;
}
export function equipmentCategories(products:Product[]){
 const rank=(category:string)=>category==='PANEL FOTOVOLTAICO'?0:category.includes('INVERSOR')?1:category.includes('BATER')?2:category==='TIPO DE ESTRUCTURA'?3:4;
 return [...new Set(products.map(p=>p.category))].filter(c=>['PANEL FOTOVOLTAICO','TIPO DE ESTRUCTURA','MATERIAL DE TECHO'].includes(c)||c.includes('INVERSOR')||c.includes('BATER')).sort((a,b)=>rank(a)-rank(b));
}
