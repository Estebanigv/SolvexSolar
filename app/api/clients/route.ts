import {requireMember,privateHeaders,checkOrigin,AccessError,databaseError} from '@/lib/supabase/server';
import {protectedApi} from '@/lib/supabase/api';
import {quoteSchema} from '@/lib/quote';
import {z} from 'zod';
export async function GET(){return protectedApi(async()=>{const {db}=await requireMember();const {data,error}=await db.from('clients').select('id,details,updated_at').order('updated_at',{ascending:false}).limit(500);if(error)databaseError(error);return Response.json({clients:data},{headers:privateHeaders})})}
export async function POST(request:Request){return protectedApi(async()=>{
  checkOrigin(request);const {db}=await requireMember();const {details,id}=z.object({details:quoteSchema.shape.customer,id:z.string().uuid().nullable().optional()}).parse(await request.json());
  if(!details.name.trim())throw new AccessError('Ingresa el nombre del cliente.',400);
  const result=id?await db.from('clients').update({details,updated_at:new Date().toISOString()}).eq('id',id).select('id').maybeSingle():await db.from('clients').insert({details}).select('id').single();
  if(result.error)databaseError(result.error);if(!result.data)throw new AccessError('Cliente no encontrado.',404);
  return Response.json(result.data,{status:id?200:201,headers:privateHeaders});
})}
