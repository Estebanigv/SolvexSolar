import {z} from 'zod';
import {addressQuerySchema,type AddressQuery,type LocationCandidate} from './geocoding';
import {findCommune,locationFromAddress,locationKey,regionMatches} from './chile-location';

export class GeocodingError extends Error {
  constructor(message:string,public status=503){super(message)}
}

// Office/apartment numbers identify a unit, not the building's street number.
export function streetAddress(address:string){
  return address.replace(/\b(?:oficina|of\.?|departamento|depto\.?|dpto\.?|piso|local)\s*(?:n[º°o.]?\s*)?\d+[a-z]?\b/gi,'').replace(/\s+/g,' ').replace(/\s+([,.])/g,'$1').trim();
}
export function googleAddressQuery(input:AddressQuery){
  const street=streetAddress(input.address),embedded=locationFromAddress(street);
  if(embedded&&locationKey(embedded.place.commune)!==locationKey(input.commune)){
    throw new GeocodingError(`La dirección indica ${embedded.place.commune}, pero seleccionaste ${input.commune}. Corrige la comuna antes de buscar.`,422);
  }
  return [embedded?.street??street,input.commune,input.region,'Chile'].join(', ');
}
const googleResult=z.object({
  formatted_address:z.string(),place_id:z.string().min(1),types:z.array(z.string()),partial_match:z.boolean().optional(),
  address_components:z.array(z.object({long_name:z.string(),short_name:z.string(),types:z.array(z.string())})),
  geometry:z.object({location:z.object({lat:z.number().finite(),lng:z.number().finite()}),location_type:z.string()}),
});
export function parseGoogleLocations(raw:unknown,input:AddressQuery):LocationCandidate[]{
  const response=z.object({status:z.string(),results:z.array(z.unknown()).optional()}).safeParse(raw);
  if(!response.success)throw new GeocodingError('Google Maps devolvió una respuesta incompleta. Vuelve a intentarlo.',502);
  const {status,results=[]}=response.data;
  if(status==='ZERO_RESULTS')return [];
  if(status==='REQUEST_DENIED')throw new GeocodingError('Google Maps no está autorizado. El administrador debe revisar la clave, la API Geocoding y la facturación.');
  if(status==='OVER_QUERY_LIMIT'||status==='OVER_DAILY_LIMIT')throw new GeocodingError('Se alcanzó el límite de consultas de Google Maps. Intenta más tarde o ingresa las coordenadas manualmente.',429);
  if(status!=='OK')throw new GeocodingError('Google Maps no pudo completar la búsqueda. Intenta nuevamente.');
  const seen=new Set<string>(),otherCommunes=new Set<string>();
  const found=results.flatMap(rawResult=>{
    const parsed=googleResult.safeParse(rawResult);if(!parsed.success)return [];
    const p=parsed.data,{lat:latitude,lng:longitude}=p.geometry.location;
    const component=(type:string)=>p.address_components.find(c=>c.types.includes(type));
    if(component('country')?.short_name!=='CL'||latitude< -56.6||latitude> -17||longitude< -110||longitude> -66)return [];
    if(!p.types.some(t=>['street_address','premise','subpremise','route'].includes(t)))return [];
    // Province/locality can both say Santiago. Prefer the actual commune component.
    const communeTypes=['administrative_area_level_3','sublocality_level_1','sublocality','locality'];
    const place=communeTypes.map(t=>findCommune(component(t)?.long_name??'')).find(Boolean);
    const region=component('administrative_area_level_1')?.long_name;
    if(!place||!region||!regionMatches(region,place.region)||!regionMatches(input.region,place.region))return [];
    if(locationKey(place.commune)!==locationKey(input.commune)){otherCommunes.add(place.commune);return []}
    const key=`${latitude},${longitude}`;if(seen.has(key))return [];seen.add(key);
    const number=component('street_number')?.long_name;
    return [{latitude,longitude,label:p.formatted_address,placeId:p.place_id,provider:'google' as const,
      approximate:!!p.partial_match||p.geometry.location_type!=='ROOFTOP'||!number||!streetAddress(input.address).match(/\d+/g)?.includes(number)}];
  }).slice(0,5);
  if(!found.length&&otherCommunes.size)throw new GeocodingError(`Google Maps encontró la dirección en ${[...otherCommunes].join(' o ')}, pero seleccionaste ${input.commune}. Revisa la comuna del cliente.`,422);
  return found;
}
export async function geocodeGoogleAddress(input:AddressQuery,apiKey:string|undefined,fetcher:typeof fetch=fetch){
  input=addressQuerySchema.parse(input);
  const address=googleAddressQuery(input);
  if(!apiKey?.trim())throw new GeocodingError('La búsqueda con Google Maps está pendiente de configuración. Puedes ingresar las coordenadas manualmente.');
  const params=new URLSearchParams({address,components:'country:CL',language:'es',region:'cl',key:apiKey.trim()});
  // Fixed host, no client-controlled keys, no customer contact data, no upstream error logging.
  let response:Response;
  try{response=await fetcher(`https://maps.googleapis.com/maps/api/geocode/json?${params}`,{signal:AbortSignal.timeout(12000),cache:'no-store',headers:{Accept:'application/json'}})}
  catch{throw new GeocodingError('Google Maps no respondió a tiempo. Intenta nuevamente o ingresa las coordenadas manualmente.')}
  if(!response.ok)throw new GeocodingError('No se pudo consultar Google Maps. Intenta nuevamente.',response.status===429?429:503);
  return parseGoogleLocations(await response.json(),input);
}
