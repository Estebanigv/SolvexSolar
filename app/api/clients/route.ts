import {requireMember,privateHeaders,checkOrigin,AccessError,databaseError} from '@/lib/supabase/server';
import {protectedApi} from '@/lib/supabase/api';
import {quoteSchema} from '@/lib/quote';
import {z} from 'zod';
const missingTrash=(error:{code?:string;message?:string}|null)=>!!error&&['42703','PGRST204'].includes(error.code??'')&&!!error.message?.includes('deleted_at');
export async function GET(request:Request){return protectedApi(async()=>{
 const {db}=await requireMember();const trash=new URL(request.url).searchParams.get('trash')==='true';
 let query=db.from('clients').select('id,details,updated_at,deleted_at').order('updated_at',{ascending:false}).limit(500);
 query=trash?query.not('deleted_at','is',null):query.is('deleted_at',null);
 const result=await query;
 if(missingTrash(result.error)){
   if(trash)return Response.json({clients:[],trashAvailable:false},{headers:privateHeaders});
   const fallback=await db.from('clients').select('id,details,updated_at').order('updated_at',{ascending:false}).limit(500);
   if(fallback.error)databaseError(fallback.error);
   return Response.json({clients:fallback.data,trashAvailable:false},{headers:privateHeaders});
 }
 if(result.error)databaseError(result.error);
 return Response.json({clients:result.data,trashAvailable:true},{headers:privateHeaders});
})}
export async function POST(request:Request){return protectedApi(async()=>{
 checkOrigin(request);const {db}=await requireMember();
 const {details,id}=z.object({details:quoteSchema.shape.customer,id:z.string().uuid().nullable().optional()}).parse(await request.json());
 if(!details.name.trim())throw new AccessError('Ingresa el nombre del cliente.',400);
 const result=id?await db.from('clients').update({details,updated_at:new Date().toISOString()}).eq('id',id).select('id').maybeSingle():await db.from('clients').insert({details}).select('id').single();
 if(result.error?.code==='55000')throw new AccessError('Este cliente está en la papelera. Restáuralo antes de editar o cotizar.',409);
 if(result.error)databaseError(result.error);if(!result.data)throw new AccessError('Cliente no encontrado.',404);
 return Response.json(result.data,{status:id?200:201,headers:privateHeaders});
})}
export async function PATCH(request:Request){return protectedApi(async()=>{
 checkOrigin(request);const {db}=await requireMember(true);
 const {id,action}=z.object({id:z.string().uuid(),action:z.enum(['trash','restore'])}).parse(await request.json());
 const result=await db.from('clients').update({deleted_at:action==='trash'?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq('id',id).select('id').maybeSingle();
 if(missingTrash(result.error))throw new AccessError('La papelera aún requiere activar la actualización de la base de datos.',503);
 if(result.error)databaseError(result.error);if(!result.data)throw new AccessError('Cliente no encontrado.',404);
 return Response.json(result.data,{headers:privateHeaders});
})}
