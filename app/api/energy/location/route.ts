import {requireMember,checkOrigin,privateHeaders,AccessError} from '@/lib/supabase/server';
import {protectedApi} from '@/lib/supabase/api';
import {addressQuerySchema} from '@/lib/geocoding';
import {geocodeGoogleAddress,GeocodingError} from '@/lib/google-geocoding';

// Modest, explicit searches only; avoid overlapping calls from this server instance.
let nextRequest=0;
export async function POST(request:Request){return protectedApi(async()=>{
  checkOrigin(request);await requireMember();
  const input=addressQuerySchema.parse(await request.json());
  if(Date.now()<nextRequest)throw new AccessError('Espera unos segundos antes de buscar otra ubicación.',429);
  nextRequest=Date.now()+2000;
  try{return Response.json({locations:await geocodeGoogleAddress(input,process.env.GOOGLE_MAPS_GEOCODING_API_KEY)},{headers:privateHeaders})}
  catch(error){throw new AccessError(error instanceof GeocodingError?error.message:'No se pudo consultar la ubicación. Intenta nuevamente o ingresa las coordenadas manualmente.',error instanceof GeocodingError?error.status:503)}
})}
