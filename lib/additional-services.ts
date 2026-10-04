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
 const quantities={...input.quantities,[selected.id]:quantity},kind=certificationType(selected);
 if(quantity>0&&kind)for(const product of products){
  const other=certificationType(product);
  if(product.system===input.system&&other&&other!==kind)quantities[product.id]=0;
 }
 return quantities;
}
