import nextEnv from '@next/env';
import {build} from 'esbuild';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
nextEnv.loadEnvConfig(process.cwd(),true,{info(){},error(){}});
await build({entryPoints:['lib/gemini.ts'],outfile:'.sites-runtime/gemini-client.mjs',bundle:true,platform:'node',format:'esm'});
const {checkGeminiConnection,GeminiError}=await import(pathToFileURL(resolve('.sites-runtime/gemini-client.mjs')).href);
try{console.log(JSON.stringify(await checkGeminiConnection(process.env.GEMINI_API_KEY)))}
catch(error){console.log(JSON.stringify({connected:false,code:error instanceof GeminiError?error.code:'CHECK_FAILED',message:error instanceof GeminiError?error.message:'No se pudo verificar la conexión.'}));process.exitCode=1}
