import {z} from 'zod';
import {usesSupabase} from '@/lib/supabase/config';
import {protectedApi} from '@/lib/supabase/api';
import {AccessError,checkOrigin,databaseError,privateHeaders,requireMember} from '@/lib/supabase/server';
import {issuanceProblems} from '@/lib/quote-issuance';
import type {SavedQuote} from '@/lib/quote';

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return protectedApi(async()=>{
 checkOrigin(request);
 if(!usesSupabase)throw new AccessError('Conecta el espacio privado para emitir un correlativo.',503);
 const {db}=await requireMember();
 const {id}=await params;z.string().uuid().parse(id);
 const found=await db.from('quotes').select('payload').eq('id',id).is('deleted_at',null).maybeSingle();
 if(found.error)databaseError(found.error);
 if(!found.data)throw new AccessError('La cotización no está disponible.',404);
 const problems=issuanceProblems(found.data.payload as SavedQuote);
 if(problems.length)throw new AccessError(problems.join(' '),422);
 const {data,error}=await db.rpc('issue_quote',{quote_id:id});
 if(error?.code==='22023')throw new AccessError('Completa los datos y validaciones antes de emitir.',422);
 if(error)databaseError(error);
 return Response.json(data,{headers:privateHeaders});
})}
