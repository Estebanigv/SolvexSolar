import {z} from 'zod';

export const geminiImageModel='gemini-3.1-flash-image';
const api='https://generativelanguage.googleapis.com/v1beta';
export const sketchSchema=z.object({
 panels:z.number().int().min(1).max(200),
 style:z.enum(['croquis','fotomontaje']),
 instructions:z.string().trim().max(1200),
});
export type SketchInput=z.infer<typeof sketchSchema>;
export class GeminiError extends Error{
 constructor(message:string,public code:string,public status=503){super(message)}
}
function keyRequired(key?:string){if(!key?.trim())throw new GeminiError('Falta configurar la clave privada de Gemini.','NOT_CONFIGURED');return key.trim()}
function failure(status:number){
 if(status===401||status===403)return new GeminiError('Google rechazó el acceso. Revisa la clave y los permisos del proyecto.','ACCESS_DENIED',503);
 if(status===429)return new GeminiError('Google no tiene cuota disponible. Revisa facturación y límites del proyecto antes de repetir.','QUOTA_UNAVAILABLE',429);
 if(status===400)return new GeminiError('Google no aceptó la solicitud. Revisa el modelo y sus parámetros.','INVALID_REQUEST',400);
 if(status===404)return new GeminiError('El modelo no está disponible para este proyecto.','MODEL_UNAVAILABLE',503);
 return new GeminiError('Google no pudo completar la generación. No se reintentó automáticamente.','PROVIDER_UNAVAILABLE');
}
async function provider(path:string,key:string,init:RequestInit={}){
 try{
  const response=await fetch(api+path,{...init,headers:{'Content-Type':'application/json','x-goog-api-key':key},cache:'no-store',signal:AbortSignal.timeout(110000)});
  if(!response.ok){await response.body?.cancel();throw failure(response.status)}
  const reader=response.body?.getReader();if(!reader)throw new GeminiError('Respuesta vacía de Google.','EMPTY_RESPONSE');
  let length=0;const chunks:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>24*1024*1024){await reader.cancel();throw new GeminiError('La imagen generada excede el límite permitido.','RESPONSE_TOO_LARGE')}chunks.push(value)}
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
 }catch(error){if(error instanceof GeminiError)throw error;throw new GeminiError('La conexión con Google no respondió. No se reintentó automáticamente para evitar cobros duplicados.','CONNECTION_FAILED')}
}
export async function checkGeminiConnection(key?:string){
 // Listing model metadata does not generate an image or consume generation tokens.
 const data=await provider('/models/'+geminiImageModel,keyRequired(key));
 const model=z.object({name:z.string(),displayName:z.string().optional()}).safeParse(data);
 if(!model.success)throw new GeminiError('No se pudo verificar el modelo.','INVALID_RESPONSE');
 return {connected:true,model:geminiImageModel,displayName:model.data.displayName??geminiImageModel,
  note:'Clave y modelo verificados. La cuota de generación se confirma al realizar una prueba.'};
}
export function imageMime(bytes:Uint8Array){
 if([137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n))return 'image/png' as const;
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg' as const;
 throw new GeminiError('Usa una fotografía JPG o PNG válida.','INVALID_IMAGE',400);
}
export function sketchPrompt(input:SketchInput){return [
 'Produce una visualización conceptual de instalación fotovoltaica a partir de la fotografía adjunta.',
 `Estilo: ${input.style==='croquis'?'croquis arquitectónico limpio, trazos precisos y paneles en azul petróleo':'fotomontaje realista sobre la fotografía original'}.`,
 `Representa ${input.panels} paneles solares. Conserva geometría, perspectiva, obstáculos y límites del techo original.`,
 'No alteres la vivienda ni inventes medidas, cotas, orientación geográfica, marcas, certificados o cálculos de ingeniería. No agregues logos ni textos.',
 'El resultado es referencial, para revisión humana; no es un plano técnico ni valida la cantidad de paneles que cabe.',
 input.instructions?`Preferencias del diseño: ${input.instructions}`:'',
].filter(Boolean).join('\n')}
const imageOutput=z.object({mime_type:z.enum(['image/png','image/jpeg']),data:z.string().min(1).max(22*1024*1024)});
export async function generateSketch(input:SketchInput,photo:Uint8Array,key?:string){
 const secret=keyRequired(key),parsed=sketchSchema.parse(input);
 if(!photo.length||photo.length>4*1024*1024)throw new GeminiError('La foto debe pesar entre 1 byte y 4 MB.','INVALID_IMAGE',400);
 const mime=imageMime(photo);
 const result=await provider('/interactions',secret,{method:'POST',body:JSON.stringify({model:geminiImageModel,
  input:[{type:'text',text:sketchPrompt(parsed)},{type:'image',mime_type:mime,data:Buffer.from(photo).toString('base64')}],
  response_format:{type:'image',mime_type:'image/png',aspect_ratio:'16:9',image_size:'1K'},store:false,
 })});
 const envelope=z.object({output_image:z.unknown().optional(),steps:z.array(z.object({type:z.string(),content:z.array(z.unknown()).optional()})).optional()}).safeParse(result);
 if(!envelope.success)throw new GeminiError('Google devolvió una respuesta inesperada.','INVALID_RESPONSE');
 const candidates=[envelope.data.output_image,...(envelope.data.steps??[]).filter(s=>s.type==='model_output').flatMap(s=>s.content??[])];
 const image=candidates.map(c=>imageOutput.safeParse(c)).find(c=>c.success);
 if(!image?.success)throw new GeminiError('Google no generó una imagen. Revisa la foto y las instrucciones antes de repetir.','NO_IMAGE');
 const bytes=Buffer.from(image.data.data,'base64');
 if(bytes.length>16*1024*1024||imageMime(bytes)!==image.data.mime_type)throw new GeminiError('La imagen recibida no es válida.','INVALID_RESPONSE');
 return {image:bytes.toString('base64'),mime:image.data.mime_type,model:geminiImageModel,generatedAt:new Date().toISOString()};
}
