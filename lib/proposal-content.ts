import {z} from 'zod';
import {proposalStyleSchema} from './proposal-style';
import {elementStylesSchema} from './proposal-elements';

const id=z.string().regex(/^[a-zA-Z0-9:_-]+$/).max(100);
export const proposalContentSchema=z.object({
 version:z.literal(1),
 style:proposalStyleSchema.optional(),
 elements:elementStylesSchema.optional(),
 text:z.record(z.string().max(12000)).refine(v=>Object.keys(v).length<=250,'Demasiados campos editados.'),
 hidden:z.array(id).max(200),
 order:z.array(id).max(40),
 sections:z.array(z.object({id,pageId:id.optional(),title:z.string().max(200),body:z.string().max(12000)})).max(20),
}).superRefine((v,ctx)=>{
 if(new Set(v.sections.map(s=>s.id)).size!==v.sections.length)ctx.addIssue({code:'custom',message:'Hay secciones duplicadas.'});
 if(Object.keys(v.text).some(key=>!id.safeParse(key).success))ctx.addIssue({code:'custom',message:'Campo de propuesta no válido.'});
 if(Object.entries(v.text).some(([key,value])=>value.length>(key.endsWith(':title')?200:key.endsWith(':subtitle')?500:key.endsWith(':value')?1000:12000)))ctx.addIssue({code:'custom',message:'Acorta el título, subtítulo o valor de la propuesta.'});
});
export type ProposalContent=z.infer<typeof proposalContentSchema>;
export const newProposalContent=():ProposalContent=>({version:1,text:{},hidden:[],order:[],sections:[]});
