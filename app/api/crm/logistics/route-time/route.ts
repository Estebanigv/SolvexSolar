import {z} from 'zod';
import {protectedApi} from '@/lib/supabase/api';
import {requireCrmMember,requireCrmClient} from '@/lib/supabase/crm-access';
import {AccessError,checkOrigin,privateHeaders} from '@/lib/supabase/server';

export async function POST(request:Request){return protectedApi(async()=>{
  checkOrigin(request);
  const {db,user,canViewAll}=await requireCrmMember();
  const {clientId,origin,destination}=z.object({clientId:z.string().uuid(),origin:z.string().trim().min(3).max(300),destination:z.string().trim().min(3).max(300)}).parse(await request.json());
  await requireCrmClient(db,user.id,clientId,canViewAll);
  const key=process.env.GOOGLE_MAPS_ROUTES_API_KEY||process.env.GOOGLE_MAPS_GEOCODING_API_KEY;
  if(!key)throw new AccessError('El cálculo automático requiere Google Routes. Abre la ruta en Maps y registra los minutos que indica.',503);
  let response:Response;
  try{
    response=await fetch('https://routes.googleapis.com/directions/v2:computeRoutes',{method:'POST',cache:'no-store',signal:AbortSignal.timeout(10000),
      headers:{'Content-Type':'application/json','X-Goog-Api-Key':key,'X-Goog-FieldMask':'routes.duration,routes.distanceMeters'},
      body:JSON.stringify({origin:{address:origin},destination:{address:destination},travelMode:'DRIVE',regionCode:'cl',languageCode:'es-CL',routingPreference:'TRAFFIC_AWARE'})});
  }catch{throw new AccessError('La consulta de ruta no respondió. Puedes ingresar el tiempo manualmente.',503)}
  if(!response.ok)throw new AccessError('Google Routes no pudo calcular el trayecto. Verifica las direcciones o consulta la ruta en Maps.',422);
  const data=z.object({routes:z.array(z.object({duration:z.string().regex(/^\d+(\.\d+)?s$/),distanceMeters:z.number().nonnegative()}))}).safeParse(await response.json());
  const route=data.success?data.data.routes[0]:null;
  if(!route)throw new AccessError('No se encontró una ruta en vehículo entre esos puntos.',422);
  return Response.json({minutes:Math.max(1,Math.ceil(parseFloat(route.duration)/60)),km:Math.round(route.distanceMeters/100)/10},{headers:privateHeaders});
})}
