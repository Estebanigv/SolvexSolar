import {AccessError,checkOrigin,privateHeaders,requireMember} from '@/lib/supabase/server';
import {protectedApi} from '@/lib/supabase/api';
import {checkGeminiConnection,generateSketch,GeminiError,sketchSchema} from '@/lib/gemini';

export const runtime='nodejs';
export const maxDuration=120;
// Isolated local pilot. Production stays closed until durable quotas and
// versioned private image storage are installed and tested.
function pilot(){if(process.env.NODE_ENV!=='development')throw new AccessError('Página no encontrada.',404)}
let active=false,attempts=0;
export async function GET(){return protectedApi(async()=>{
 pilot();await requireMember(true);
 try{return Response.json({...await checkGeminiConnection(process.env.GEMINI_API_KEY),generationEnabled:process.env.GEMINI_IMAGE_GENERATION_ENABLED==='true',remainingAttempts:Math.max(0,3-attempts)},{headers:privateHeaders})}
 catch(e){throw new AccessError(e instanceof GeminiError?e.message:'No se pudo verificar la conexión.',e instanceof GeminiError?e.status:503)}
})}
export async function POST(request:Request){return protectedApi(async()=>{
 pilot();checkOrigin(request);await requireMember(true);
 if(process.env.GEMINI_IMAGE_GENERATION_ENABLED!=='true')throw new AccessError('La generación está pausada hasta confirmar facturación y presupuesto de prueba.',503);
 if(active||attempts>=3)throw new AccessError(active?'Ya hay una generación en curso.':'Se completaron los tres intentos de esta sesión de prueba.',429);
 if(Number(request.headers.get('content-length')??0)>4.3*1024*1024)throw new AccessError('Usa una foto de hasta 4 MB.',413);
 const form=await request.formData(),photo=form.get('photo');
 if(form.get('consent')!=='true')throw new AccessError('Confirma que puedes enviar esta fotografía a Google para generar el croquis.',400);
 if(!(photo instanceof File)||photo.size>4*1024*1024||!photo.size)throw new AccessError('Usa una fotografía JPG o PNG de hasta 4 MB.',400);
 const input=sketchSchema.parse({panels:Number(form.get('panels')),style:form.get('style'),instructions:form.get('instructions')??''});
 // Check again after async body parsing: concurrent requests cannot both pass.
 if(active||attempts>=3)throw new AccessError('Espera antes de iniciar otra generación.',429);
 active=true;attempts++;
 try{return Response.json(await generateSketch(input,new Uint8Array(await photo.arrayBuffer()),process.env.GEMINI_API_KEY),{headers:privateHeaders})}
 catch(e){throw new AccessError(e instanceof GeminiError?e.message:'No se pudo generar la imagen.',e instanceof GeminiError?e.status:503)}
 finally{active=false}
})}
