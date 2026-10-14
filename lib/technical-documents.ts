import {z} from 'zod';
import type {Product} from './quote';

const driveUrl=z.string().url().max(1000).refine(value=>{try{const url=new URL(value);return url.protocol==='https:'&&url.hostname==='drive.google.com'&&!url.username&&!url.password}catch{return false}},'Usa un enlace HTTPS de Google Drive.');
export const technicalDocumentSchema=z.object({id:z.string().min(1).max(100),name:z.string().min(1).max(250),url:driveUrl,model:z.string().min(1).max(180),category:z.string().min(1).max(100),watts:z.array(z.number().int().positive().max(2000)).max(50),note:z.string().max(1000).optional(),reviewRequired:z.boolean().optional()});
export const technicalLibrarySchema=z.object({folderUrl:driveUrl,documents:z.array(technicalDocumentSchema).max(100).refine(docs=>new Set(docs.map(d=>d.id)).size===docs.length,'Hay fichas duplicadas.')});
export type TechnicalDocument=z.infer<typeof technicalDocumentSchema>;
export type TechnicalLibrary=z.infer<typeof technicalLibrarySchema>;

export function matchesTechnicalDocument(product:Pick<Product,'category'|'watts'>,document:TechnicalDocument){
  return product.category===document.category&&(document.watts.length===0||product.watts!==null&&document.watts.includes(product.watts));
}
export function productDocuments(product:Product,library?:TechnicalLibrary){
  const candidates=(library?.documents??[]).filter(doc=>matchesTechnicalDocument(product,doc));
  const linked=candidates.find(doc=>doc.id===product.technicalDocumentId);
  return {linked,candidates};
}
