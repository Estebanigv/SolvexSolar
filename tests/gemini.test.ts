import assert from 'node:assert/strict';
import {checkGeminiConnection,generateSketch,GeminiError,geminiImageModel,sketchSchema,sketchPrompt} from '../lib/gemini';
async function main(){
const original=globalThis.fetch;
const png=Uint8Array.from([137,80,78,71,13,10,26,10,0]);
const input={panels:10,style:'croquis' as const,instructions:'Conservar la chimenea'};
let calls=0;
globalThis.fetch=async()=>{calls++;return Response.json({name:'models/'+geminiImageModel})};
try{
 await assert.rejects(checkGeminiConnection(),e=>e instanceof GeminiError&&e.code==='NOT_CONFIGURED');
 assert.equal(calls,0);
 assert.equal((await checkGeminiConnection('private-test-key')).connected,true);
 await assert.rejects(generateSketch(input,new Uint8Array([1,2,3]),'private-test-key'),e=>e instanceof GeminiError&&e.code==='INVALID_IMAGE');
 await assert.rejects(generateSketch(input,new Uint8Array(4*1024*1024+1),'private-test-key'));
 assert.equal(calls,1);
 assert.equal(sketchSchema.safeParse({...input,panels:0}).success,false);
 assert.equal(sketchSchema.safeParse({...input,panels:1.5}).success,false);
 assert.ok(sketchPrompt(input).includes('10 paneles'));
 globalThis.fetch=async(url,options)=>{
  assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/interactions');
  const body=JSON.parse(options!.body as string);
  assert.equal(body.store,false);assert.equal(body.model,geminiImageModel);assert.equal(body.response_format.image_size,'1K');
  assert.equal(body.input[1].mime_type,'image/png');assert.equal((options!.headers as Record<string,string>)['x-goog-api-key'],'private-test-key');
  assert.ok(!JSON.stringify(body).includes('private-test-key'));
  return Response.json({output_image:{mime_type:'image/png',data:Buffer.from(png).toString('base64')}});
 };
 assert.equal((await generateSketch(input,png,'private-test-key')).mime,'image/png');
 globalThis.fetch=async()=>Response.json({steps:[{type:'model_output',content:[{type:'image',mime_type:'image/png',data:Buffer.from(png).toString('base64')}]}]});
 assert.equal((await generateSketch(input,png,'private-test-key')).model,geminiImageModel);
 globalThis.fetch=async()=>Response.json({output_image:{mime_type:'image/svg+xml',data:'PHN2Zz4='}});
 await assert.rejects(generateSketch(input,png,'private-test-key'),e=>e instanceof GeminiError&&e.code==='NO_IMAGE');
 globalThis.fetch=async()=>Response.json({error:{message:'sensitive upstream details private-test-key'}},{status:429});
 await assert.rejects(generateSketch(input,png,'private-test-key'),e=>e instanceof GeminiError&&e.code==='QUOTA_UNAVAILABLE'&&!e.message.includes('private-test-key'));
 globalThis.fetch=async()=>{throw new Error('private-test-key')};
 await assert.rejects(checkGeminiConnection('private-test-key'),e=>e instanceof GeminiError&&e.code==='CONNECTION_FAILED'&&!e.message.includes('private-test-key'));
 globalThis.fetch=async()=>Response.json({steps:[{type:'model_output',content:[{type:'text',text:'No image'}]}]});
 await assert.rejects(generateSketch(input,png,'private-test-key'),e=>e instanceof GeminiError&&e.code==='NO_IMAGE');
 console.log('Gemini: conexión, foto, parámetros, privacidad, respuestas, cuota y errores sin secretos: OK');
}finally{globalThis.fetch=original}

}
main().catch(error=>{console.error(error);process.exitCode=1});
