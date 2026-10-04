import {z} from 'zod';
import {locationKey,findCommune,regionMatches} from './chile-location';

export const addressQuerySchema=z.object({address:z.string().trim().min(3).max(300),commune:z.string().trim().min(2).max(100),region:z.string().trim().min(2).max(100)}).strict().refine(input=>{const place=findCommune(input.commune);return !!place&&regionMatches(input.region,place.region)},{message:'Selecciona una comuna que pertenezca a la región indicada.'});
export type AddressQuery=z.infer<typeof addressQuerySchema>;
export type LocationCandidate={latitude:number;longitude:number;label:string;approximate:boolean;provider?:'google';placeId?:string};
const feature=z.object({geometry:z.object({type:z.literal('Point'),coordinates:z.tuple([z.number().finite(),z.number().finite()])}),properties:z.object({countrycode:z.string(),type:z.string().optional(),name:z.string().optional(),street:z.string().optional(),housenumber:z.string().optional(),city:z.string().optional(),district:z.string().optional(),locality:z.string().optional(),county:z.string().optional(),state:z.string().optional()})});
export function parseLocations(raw:unknown,input:AddressQuery):LocationCandidate[]{
  const data=z.object({features:z.array(z.unknown())}).parse(raw),seen=new Set<string>();
  return data.features.flatMap(row=>{
    const result=feature.safeParse(row);if(!result.success)return [];
    const {geometry:{coordinates:[longitude,latitude]},properties:p}=result.data;
    if(p.countrycode.toUpperCase()!=='CL'||latitude< -56.6||latitude> -17||longitude< -110||longitude> -66)return [];
    if(!['house','street'].includes(p.type??''))return [];
    // Do not substitute the centre of a municipality or a result in a different municipality.
    const towns=[p.city,p.district,p.locality,p.county].filter(Boolean).map(v=>locationKey(v!).replace(/^comuna de /,''));
    if(!towns.includes(locationKey(input.commune)))return [];
    const place=findCommune(input.commune);
    if(!place||!regionMatches(input.region,place.region)||(p.state&&!regionMatches(p.state,place.region)))return [];
    const key=`${latitude},${longitude}`;if(seen.has(key))return [];seen.add(key);
    const label=[...new Set([p.name,[p.street,p.housenumber].filter(Boolean).join(' '),place.commune,place.region].filter(Boolean))].join(', ');
    return [{latitude,longitude,label,approximate:p.type!=='house'||!p.housenumber||!input.address.match(/\d+/g)?.includes(p.housenumber)}];
  }).slice(0,5);
}
export async function geocodeAddress(input:AddressQuery,fetcher:typeof fetch=fetch){
  input=addressQuerySchema.parse(input);
  const params=new URLSearchParams({q:[input.address,input.commune,input.region,'Chile'].join(', '),countrycode:'CL',limit:'5'});
  const response=await fetcher(`https://photon.komoot.io/api/?${params}`,{signal:AbortSignal.timeout(12000),cache:'no-store',headers:{Accept:'application/json','User-Agent':'SolvexSolar/1.0 (https://solvex-solar.vercel.app)'}});
  if(!response.ok)throw Error('El servicio de ubicaciones no está disponible. Intenta nuevamente o ingresa las coordenadas manualmente.');
  return parseLocations(await response.json(),input);
}
