import {z} from 'zod';
import {findCommune,locationKey,regionMatches} from './chile-location';
import {getCneToken} from './cne-auth';
export const cneSourceUrl='https://apidocs.cne.cl/facturacion-clientes-regulados-mensual-23961807e0';
export const cneQuerySchema=z.object({commune:z.string().trim().min(2).max(100),region:z.string().trim().min(2).max(100),year:z.coerce.number().int().min(2015).max(new Date().getFullYear()),month:z.coerce.number().int().min(1).max(12),sector:z.enum(['residential','non-residential'])}).strict().refine(q=>{const place=findCommune(q.commune);return !!place&&regionMatches(q.region,place.region)},{message:'Selecciona una comuna y región válidas.'});
export type CneQuery=z.infer<typeof cneQuerySchema>;
export type CneReference={period:{year:number;month:number};commune:string;region:string;sector:CneQuery['sector'];available:boolean;clients:number;totalKwh:number;averageKwh:number|null;tariffs:string[];source:{name:string;url:string;retrievedAt:string}};
export class CneError extends Error{constructor(message:string,public status=503){super(message)}}
const numeric=z.union([z.number(),z.string().regex(/^-?\d+(?:\.\d+)?$/)]).transform(Number).pipe(z.number().finite());
const rowSchema=z.object({anio:z.number().int(),mes:z.number().int(),region:z.string(),comuna:z.string(),tipo_clientes:z.string(),tarifa:z.string(),clientes_facturados:numeric.pipe(z.number().int().nonnegative()),energia_kwh:numeric});
// Source-specific spellings verified in CNE, not fuzzy geographical matching.
const sourceRegions:Record<string,string>={
 [locationKey('Región del Libertador Gral. Bernardo O’Higgins')]:"Libertador General Bernardo O'Higgins",
 [locationKey('Región Aisén del Gral.Carlos Ibáñez del Campo')]:'Aysén del General Carlos Ibáñez del Campo',
};
type CneRow=z.infer<typeof rowSchema>;
const pageSchema=z.object({success:z.literal(true),data:z.array(rowSchema),pagination:z.object({current_page:z.number().int().positive(),last_page:z.number().int().positive(),total:z.number().int().nonnegative()})});
export function summarizeCne(rows:CneRow[],q:CneQuery,retrievedAt=new Date().toISOString()):CneReference{
 const place=findCommune(q.commune)!;
 const sector=q.sector==='residential'?'residencial':'no residencial';
 const selected=rows.filter(r=>r.anio===q.year&&r.mes===q.month&&locationKey(r.comuna)===locationKey(place.commune)&&regionMatches(sourceRegions[locationKey(r.region)]??r.region,place.region)&&locationKey(r.tipo_clientes)===sector);
 if(selected.some(r=>r.energia_kwh<0))throw new CneError('La serie seleccionada contiene valores negativos informados por CNE. No se muestra un promedio de consumo hasta validar esos registros. Prueba otro período.');
 const clients=selected.reduce((sum,r)=>sum+r.clientes_facturados,0),totalKwh=selected.reduce((sum,r)=>sum+r.energia_kwh,0);
 return {period:{year:q.year,month:q.month},commune:place.commune,region:place.region,sector:q.sector,available:selected.length>0,clients,totalKwh,averageKwh:clients>0?totalKwh/clients:null,tariffs:[...new Set(selected.map(r=>r.tarifa))].sort(),source:{name:'CNE · Facturación mensual de clientes regulados',url:cneSourceUrl,retrievedAt}};
}
// Public monthly data are shared across authorized users; no customer information is cached.
const cache=new Map<string,{expires:number;rows:CneRow[];retrievedAt:string}>();
const inflight=new Map<string,Promise<{rows:CneRow[];retrievedAt:string}>>();
export async function getCneReference(input:CneQuery,options:{token?:string;fetcher?:typeof fetch}={}):Promise<CneReference>{
 const q=cneQuerySchema.parse(input),email=process.env.CNE_API_EMAIL,password=process.env.CNE_API_PASSWORD;
 const automatic=!options.token&&!!email&&!!password;
 let token=options.token??process.env.CNE_API_TOKEN;
 if(!token&&!automatic)throw new CneError('La conexión CNE todavía no está configurada en este entorno.');
 const key=`${q.year}-${q.month}`,useCache=!options.fetcher,hit=useCache?cache.get(key):undefined;
 if(hit&&hit.expires>Date.now())return summarizeCne(hit.rows,q,hit.retrievedAt);
 async function load(){
  if(automatic){try{token=await getCneToken(email!,password!)}catch{throw new CneError('CNE no permitió renovar la conexión. El administrador debe revisar el correo y la contraseña configurados.')}}
  const fetcher=options.fetcher??fetch,signal=AbortSignal.timeout(25000);let lastPage=1,total:number|undefined;const rows:CneRow[]=[];
  for(let page=1;page<=lastPage;page++){
   const params=new URLSearchParams({per_page:'2000',page:String(page),year:String(q.year),month:String(q.month)});
   const request=()=>fetcher(`https://api.cne.cl/api/ea/facturacion/cltesregulados/mensual?${params}`,{headers:{Authorization:`Bearer ${token}`,Accept:'application/json'},cache:'no-store',signal,redirect:'error'});
   let response=await request();
   if(response.status===401&&automatic){try{token=await getCneToken(email!,password!,true)}catch{throw new CneError('CNE no permitió renovar la conexión. El administrador debe revisar el correo y la contraseña configurados.')}response=await request()}
   if(response.status===401||response.status===403)throw new CneError('CNE rechazó la credencial. El administrador debe renovar la conexión.');
   if(!response.ok)throw new CneError('CNE no respondió correctamente. Inténtalo nuevamente.');
   const parsed=pageSchema.safeParse(await response.json());
   if(!parsed.success)throw new CneError('La respuesta de CNE cambió de formato. No se puede calcular una referencia confiable.');
   const body=parsed.data;
   if(body.pagination.current_page!==page||body.pagination.last_page>12||(total!==undefined&&total!==body.pagination.total)||body.data.some(r=>r.anio!==q.year||r.mes!==q.month))throw new CneError('CNE devolvió una serie incompleta o de otro período. Inténtalo nuevamente.');
   total=body.pagination.total;lastPage=body.pagination.last_page;rows.push(...body.data);
  }
  if(rows.length!==total)throw new CneError('La serie de CNE está incompleta. Inténtalo nuevamente.');
  const value={rows,retrievedAt:new Date().toISOString()};
  if(useCache){if(cache.size>=12)cache.delete(cache.keys().next().value!);cache.set(key,{...value,expires:Date.now()+24*60*60*1000})}
  return value;
 }
 try{
  let pending=useCache?inflight.get(key):undefined;
  if(!pending){pending=load();if(useCache){inflight.set(key,pending);void pending.then(()=>inflight.delete(key),()=>inflight.delete(key))}}
  const value=await pending;return summarizeCne(value.rows,q,value.retrievedAt);
 }catch(error){if(error instanceof CneError)throw error;throw new CneError('No fue posible consultar CNE. Revisa la conexión e inténtalo nuevamente.')}
}
