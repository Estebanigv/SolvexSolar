import {z} from 'zod';
import {protectedApi} from '@/lib/supabase/api';
import {requireCrmClient,requireCrmMember} from '@/lib/supabase/crm-access';
import {AccessError,checkOrigin,databaseError,privateHeaders} from '@/lib/supabase/server';
import {chileDate,dateSchema} from '@/lib/quote-history';

const reply=z.object({clientId:z.string().uuid(),quoteId:z.string().uuid(),sentOn:dateSchema,recordedAt:z.string().datetime({offset:true}).nullable(),replyOn:dateSchema});
export async function PUT(request:Request){return protectedApi(async()=>{
  checkOrigin(request);
  const {db,user,canViewAll}=await requireCrmMember();
  const input=reply.parse(await request.json());
  if(input.replyOn<input.sentOn||input.replyOn>chileDate())throw new AccessError('La respuesta debe estar entre la fecha del envío y hoy.',422);
  await requireCrmClient(db,user.id,input.clientId,canViewAll);
  let query=db.from('quotes').update({email_reply_on:input.replyOn}).eq('id',input.quoteId).eq('client_id',input.clientId)
    .eq('sent_channel','email').eq('sent_on',input.sentOn).is('email_reply_on',null).is('deleted_at',null).eq('is_test',false);
  query=input.recordedAt?query.eq('sent_recorded_at',input.recordedAt):query.is('sent_recorded_at',null);
  const {data,error}=await query.select('id').maybeSingle();
  if(error)databaseError(error);
  if(!data)throw new AccessError('El envío cambió o ya tiene una respuesta registrada. Actualiza la ficha.',409);
  return Response.json({replyOn:input.replyOn},{headers:privateHeaders});
})}
