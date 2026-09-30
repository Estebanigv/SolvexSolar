import {CneError,cneQuerySchema,getCneReference} from '@/lib/cne';
import {protectedApi} from '@/lib/supabase/api';
import {privateHeaders,requireMember} from '@/lib/supabase/server';
export async function GET(request:Request){return protectedApi(async()=>{
 await requireMember();
 const parsed=cneQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
 if(!parsed.success)return Response.json({error:'Revisa región, comuna, mes y año de la consulta.'},{status:400,headers:privateHeaders});
 try{return Response.json(await getCneReference(parsed.data),{headers:privateHeaders})}
 catch(error){return Response.json({error:error instanceof CneError?error.message:'No se pudo consultar CNE.'},{status:503,headers:privateHeaders})}
})}
