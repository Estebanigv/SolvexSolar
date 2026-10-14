import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
await build({entryPoints:['app/api/quotes/[id]/issue/route.ts'],outfile:'.sites-runtime/quote-issue-route-test.cjs',bundle:true,platform:'node',format:'cjs',plugins:[{name:'auth-boundary',setup(build){
 build.onResolve({filter:/^@\/lib\/supabase\/server$/},()=>({path:'server',namespace:'test-auth'}));
 build.onResolve({filter:/^\.\/server$/},args=>args.importer.replaceAll('\\','/').endsWith('/lib/supabase/api.ts')?{path:'server',namespace:'test-auth'}:undefined);
 build.onLoad({filter:/.*/,namespace:'test-auth'},()=>({loader:'js',contents:`
 export class AccessError extends Error{constructor(message,status){super(message);this.status=status}}
 export const privateHeaders={'Cache-Control':'private, no-store'};
 export function checkOrigin(){if(globalThis.__issueTest.badOrigin)throw new AccessError('origin',403)}
 export async function requireMember(){const t=globalThis.__issueTest;if(t.denied)throw new AccessError('denied',403);const chain={select:()=>chain,eq:()=>chain,is:()=>chain,maybeSingle:async()=>({data:t.missing?null:{payload:t.quote}})};return {db:{from:()=>chain,rpc:async(name,options)=>{t.called={name,options};return t.result}}}}
 export function databaseError(){throw Error('database')}
 `}));
}}]});
const {POST}=createRequire(import.meta.url)('../.sites-runtime/quote-issue-route-test.cjs');
const id='11111111-1111-4111-8111-111111111111';
const quote={input:{customer:{name:'Prueba',email:'',phone:''},proposalType:'final'},settings:{taxMode:'pending'},calculation:{lines:[],total:119000,complete:false,tax:null,official:false,warnings:[]}};
const call=()=>POST(new Request('https://example.test/api/quotes/'+id+'/issue',{method:'POST'}),{params:Promise.resolve({id})});
try{
 for(const failure of ['badOrigin','denied']){globalThis.__issueTest={[failure]:true};assert.equal((await call()).status,403);assert.equal(globalThis.__issueTest.called,undefined);}
 globalThis.__issueTest={missing:true};assert.equal((await call()).status,404);
 globalThis.__issueTest={quote,result:{data:{...quote,issuanceWarnings:['Falta contacto']},error:null}};const result=await call();assert.equal(result.status,200);assert.deepEqual((await result.json()).issuanceWarnings,['Falta contacto']);assert.deepEqual(globalThis.__issueTest.called,{name:'issue_quote',options:{quote_id:id}});
 for(const total of [0,-1,Infinity]){globalThis.__issueTest={quote:{...quote,calculation:{...quote.calculation,total}}};assert.equal((await call()).status,422);assert.equal(globalThis.__issueTest.called,undefined);}
 console.log('Ruta emisión: pendientes permitidos, advertencias del servidor, origen, sesión e importes inválidos: OK');
}finally{delete globalThis.__issueTest;}
