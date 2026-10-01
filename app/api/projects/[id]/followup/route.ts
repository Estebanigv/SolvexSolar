import {z} from 'zod';
import {protectedApi} from '@/lib/supabase/api';
import {requireMember,checkOrigin,privateHeaders,AccessError,databaseError} from '@/lib/supabase/server';
import {followupSchema} from '@/lib/followup';
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){return protectedApi(async()=>{
 checkOrigin(request);const {db}=await requireMember();const id=z.string().uuid().parse((await params).id),body=followupSchema.parse(await request.json());
 const values={status:body.status,next_contact:body.next_contact};
 const result=body.expected?await db.from('quote_followups').update(values).eq('project_id',id).eq('updated_at',body.expected).select().maybeSingle():await db.from('quote_followups').insert({project_id:id,...values}).select().single();
 if(result.error?.code==='23505'||(!result.error&&!result.data))throw new AccessError('Otra persona actualizó este seguimiento. Cierra y actualiza el historial antes de editar.',409);
 if(result.error)databaseError(result.error);return Response.json({followup:result.data},{headers:privateHeaders});
})}
