import {requireMember,checkOrigin,privateHeaders,AccessError} from '@/lib/supabase/server';
import {protectedApi} from '@/lib/supabase/api';
import {addressQuerySchema,geocodeAddress} from '@/lib/geocoding';

// Modest, explicit searches only; avoid overlapping calls from this server instance.
let nextRequest=0;
export async function POST(request:Request){return protectedApi(async()=>{
  checkOrigin(request);await requireMember();
  const input=addressQuerySchema.parse(await request.json());
  if(Date.now()<nextRequest)throw new AccessError('Espera unos segundos antes de buscar otra ubicación.',429);
  nextRequest=Date.now()+2000;
  try{return Response.json({locations:await geocodeAddress(input)},{headers:privateHeaders})}
  catch{throw new AccessError('No se pudo consultar la ubicación. Intenta nuevamente o ingresa las coordenadas manualmente.',503)}
})}
