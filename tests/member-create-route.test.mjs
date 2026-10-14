import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
await build({entryPoints:['app/api/members/create/route.ts'],outfile:'.sites-runtime/member-create-route-test.cjs',bundle:true,platform:'node',format:'cjs',plugins:[{name:'auth-boundary',setup(build){
 build.onResolve({filter:/^@\/lib\/supabase\/server$/},()=>({path:'server',namespace:'test-auth'}));
 build.onResolve({filter:/^\.\/server$/},args=>args.importer.replaceAll('\\','/').endsWith('/lib/supabase/api.ts')?{path:'server',namespace:'test-auth'}:undefined);
 build.onLoad({filter:/.*/,namespace:'test-auth'},()=>({loader:'js',contents:`
 export class AccessError extends Error{constructor(message,status){super(message);this.status=status}}
 export const privateHeaders={'Cache-Control':'private, no-store'};
 export function checkOrigin(){if(globalThis.__createTest.badOrigin)throw new AccessError('origin',403)}
 export async function requireMember(admin){globalThis.__createTest.admin=admin;if(globalThis.__createTest.denied)throw new AccessError('denied',403);return {db:{functions:{invoke:async(name,options)=>{globalThis.__createTest.called={name,options};return globalThis.__createTest.result}}}}}
 export function databaseError(){throw Error('database')}
 `}));
}}]});
const {POST}=createRequire(import.meta.url)('../.sites-runtime/member-create-route-test.cjs');
const input={name:'Nombre Prueba',email:'prueba@example.com',password:'Una clave de ejemplo 2026'};
const request=(body=input)=>new Request('https://example.test/api/members/create',{method:'POST',body:JSON.stringify(body)});
try{
 for(const failure of ['badOrigin','denied']){globalThis.__createTest={[failure]:true};assert.equal((await POST(request())).status,403);assert.equal(globalThis.__createTest.called,undefined);}
 globalThis.__createTest={};assert.equal((await POST(request({...input,password:'short'}))).status,400);assert.equal(globalThis.__createTest.called,undefined);
 globalThis.__createTest={result:{data:{id:'new'},error:null}};const created=await POST(request());assert.equal(created.status,201);assert.equal(globalThis.__createTest.admin,true);assert.deepEqual(globalThis.__createTest.called,{name:'member-create',options:{body:input}});assert.deepEqual(await created.json(),{id:'new'});
 globalThis.__createTest={result:{data:null,error:{context:Response.json({code:'duplicate',private:'never return this'},{status:409})}}};const duplicate=await POST(request());assert.equal(duplicate.status,409);assert.ok(!(await duplicate.text()).includes('never return this'));
 console.log('Ruta alta de usuarios: origen, administrador, validación, invocación y errores controlados: OK');
}finally{delete globalThis.__createTest;}
