import {resolvedProjection} from '@/lib/projection';
import {persistentQuote} from '@/lib/quote-persistence';
import {z} from 'zod';
import {calculate,panelQuantities,isInstallation,installationSchema,productSchema,quoteSchema,settingsSchema} from '@/lib/quote';
import {AccessError,requireMember,checkOrigin,databaseError,privateHeaders} from './server';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:privateHeaders});
export async function protectedApi(run:()=>Promise<Response>){
  try{return await run()}catch(e){
    return reply({error:e instanceof AccessError?e.message:e instanceof z.ZodError?'Revisa los campos ingresados.':'No se pudo completar la operación. Inténtalo nuevamente.'},e instanceof AccessError?e.status:e instanceof z.ZodError||e instanceof SyntaxError?400:503);
  }
}
export async function workspaceGet(){return protectedApi(async()=>{
  const {db,profile}=await requireMember();
  const {data,error}=await db.from('workspace_config').select('products,settings,revision,installation').eq('id',true).single();
  if(error)databaseError(error);return reply({...data,profile});
})}
export async function workspacePut(request:Request){return protectedApi(async()=>{
  checkOrigin(request);const {db}=await requireMember(true);
  const body=z.object({revision:z.number().int().positive(),products:z.array(productSchema).min(1).max(1000),settings:settingsSchema}).parse(await request.json());
  if(new Set(body.products.map(p=>p.id)).size!==body.products.length)throw new AccessError('Hay códigos de producto duplicados.',400);
  const installationSystems=body.products.filter(isInstallation).map(p=>p.system);
  if(new Set(installationSystems).size!==installationSystems.length)throw new AccessError('Debe existir una sola tarifa de instalación por sistema.',400);
  const {data,error}=await db.rpc('save_workspace',{expected_revision:body.revision,new_products:body.products,new_settings:body.settings});
  if(error)databaseError(error);return reply({revision:data});
})}
export async function quotesGet(request:Request){return protectedApi(async()=>{
  const {db}=await requireMember();const id=new URL(request.url).searchParams.get('id');
  if(id){z.string().uuid().parse(id);const {data,error}=await db.from('quotes').select('payload').eq('id',id).maybeSingle();if(error)databaseError(error);return data?reply(data.payload):reply({error:'Cotización no encontrada.'},404)}
  const {data,error}=await db.from('quotes').select('payload').order('created_at',{ascending:false}).limit(100);
  if(error)databaseError(error);return reply({quotes:data?.map(r=>r.payload)??[]});
})}
export async function quotesPost(request:Request){return protectedApi(async()=>{
  checkOrigin(request);const {db}=await requireMember();
  const body=z.object({input:quoteSchema,revision:z.number().int().positive(),clientId:z.string().uuid().nullable().optional(),sourceQuoteId:z.string().uuid().nullable().optional()}).parse(await request.json());
  if(!body.input.customer.name.trim())throw new AccessError('Ingresa el nombre del cliente antes de guardar.',400);
  const config=await db.from('workspace_config').select('products,settings,revision,installation').eq('id',true).single();
  if(config.error)databaseError(config.error);
  if(config.data!.revision!==body.revision)throw new AccessError('El catálogo cambió. Recarga antes de guardar.',409);
  const products=z.array(productSchema).parse(config.data!.products),settings=settingsSchema.parse(config.data!.settings);
  body.input.quantities=panelQuantities(body.input,products);
  const id=crypto.randomUUID(),date=new Date().toISOString(),folio=`SVX-${date.slice(0,4)}-${id.slice(0,8).toUpperCase()}`;
  let projectId=id;
  if(body.sourceQuoteId){const parent=await db.from('quotes').select('project_id,client_id').eq('id',body.sourceQuoteId).is('deleted_at',null).maybeSingle();if(parent.error)databaseError(parent.error);if(!parent.data||parent.data.client_id!==body.clientId)throw new AccessError('La revisión debe pertenecer al mismo cliente y a una propuesta activa.',409);projectId=parent.data.project_id}
  const snapshot={id,projectId,parentQuoteId:body.sourceQuoteId??null,folio,date,input:persistentQuote(body.input),settings,calculation:calculate(body.input,products,settings,installationSchema.parse(config.data!.installation))};
  snapshot.input.projection=resolvedProjection(snapshot);
  const {data,error}=await db.rpc('save_quote',{snapshot,expected_revision:body.revision,customer_id:body.clientId??null});
  if(error?.code==='55000')throw new AccessError('Este cliente está en la papelera. Restáuralo antes de cotizar.',409);
  if(error)databaseError(error);return reply(data,201);
})}
