import {requireMember,privateHeaders,AccessError,databaseError} from '@/lib/supabase/server';
import {protectedApi} from '@/lib/supabase/api';
import {z} from 'zod';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){return protectedApi(async()=>{
  const id=z.string().uuid().parse((await params).id);const {db}=await requireMember();
  const quote=await db.from('quotes').select('owner_id').eq('id',id).maybeSingle();if(quote.error)databaseError(quote.error);if(!quote.data)throw new AccessError('Cotización no encontrada.',404);
  const path=`${quote.data.owner_id}/${id}`;const {data,error}=await db.storage.from('boletas').list(path,{limit:2});if(error)throw new AccessError('No se pudieron consultar las boletas.',503);
  const files=await Promise.all((data??[]).filter(file=>['frente','reverso'].includes(file.name)).map(async file=>{const {data,error}=await db.storage.from('boletas').createSignedUrl(`${path}/${file.name}`,60);if(error||!data)throw new AccessError('No se pudo abrir la boleta.',503);return {name:file.name,url:data.signedUrl}}));
  return Response.json({files},{headers:privateHeaders});
})}
