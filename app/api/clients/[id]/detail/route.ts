import {z} from 'zod';
import {protectedApi} from '@/lib/supabase/api';
import {requireMember,checkOrigin,privateHeaders,AccessError,databaseError} from '@/lib/supabase/server';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return protectedApi(async()=>{
 const {db}=await requireMember();const id=z.string().uuid().parse((await params).id);
 const client=await db.from('clients').select('id,details').eq('id',id).maybeSingle();if(client.error)databaseError(client.error);if(!client.data)throw new AccessError('Cliente no encontrado.',404);
 const [quotes,notes]=await Promise.all([db.from('quotes').select('payload,project_id,parent_quote_id,sent_on,sent_channel,created_at',{count:'exact'}).eq('client_id',id).is('deleted_at',null).order('created_at',{ascending:false}).limit(100),db.from('client_notes').select('id,body,created_at,author:profiles!client_notes_created_by_fkey(full_name,email)',{count:'exact'}).eq('client_id',id).order('created_at',{ascending:false}).limit(100)]);
 if(quotes.error)databaseError(quotes.error);if(notes.error)databaseError(notes.error);
 const ids=[...new Set((quotes.data??[]).map(q=>q.project_id))];const tracking=ids.length?await db.from('quote_followups').select('*').in('project_id',ids):{data:[],error:null};if(tracking.error)databaseError(tracking.error);
 return Response.json({client:client.data,quotes:(quotes.data??[]).map(q=>({...q.payload,projectId:q.project_id,parentQuoteId:q.parent_quote_id,date:q.created_at,sentOn:q.sent_on,sentChannel:q.sent_channel,followup:tracking.data?.find(f=>f.project_id===q.project_id)??null})),notes:notes.data,quoteCount:quotes.count,noteCount:notes.count},{headers:privateHeaders});
})}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return protectedApi(async()=>{
 checkOrigin(request);const {db}=await requireMember();const client_id=z.string().uuid().parse((await params).id),{body}=z.object({body:z.string().trim().min(1).max(3000)}).parse(await request.json());const result=await db.from('client_notes').insert({client_id,body});if(result.error)databaseError(result.error);return Response.json({ok:true},{headers:privateHeaders});
})}
