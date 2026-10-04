import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';

mkdirSync('.sites-runtime',{recursive:true});
await build({entryPoints:['app/api/activity/route.ts'],outfile:'.sites-runtime/activity-route-test.cjs',bundle:true,platform:'node',format:'cjs',plugins:[{
  name:'activity-route-database',setup(build){
    build.onResolve({filter:/^@\/lib\/supabase\/(server|api)$/},args=>({path:args.path,namespace:'activity-test'}));
    build.onLoad({filter:/.*/,namespace:'activity-test'},args=>({loader:'js',contents:args.path.endsWith('/api')?`
      export async function protectedApi(run){try{return await run()}catch(error){return Response.json({error:error.message},{status:error.status||500})}}
    `:`
      export class AccessError extends Error{constructor(message,status){super(message);this.status=status}}
      export const privateHeaders={'Cache-Control':'private, no-store'};
      export function databaseError(error){throw Error(error.message)}
      export async function requireMember(admin){globalThis.__activityRoute.admin=admin;if(globalThis.__activityRoute.denied)throw new AccessError('Forbidden',403);return {db:globalThis.__activityRoute.db}}
    `}));
  }
}]});
const require=createRequire(import.meta.url);
const {GET}=require('../.sites-runtime/activity-route-test.cjs');
const requests=[];
const db=createClient('https://activity-test.invalid','test-key',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input,init)=>{
  const url=new URL(String(input));requests.push(url);
  assert.equal(init.method,'GET','Activity visibility must never mutate the audit trail');
  if(url.pathname.endsWith('/profiles'))return Response.json([{id:'carol',identification_color:'green'}]);
  assert.equal(url.pathname,'/rest/v1/activity_log');
  assert.equal(url.searchParams.get('actor_email'),'not.ilike.contacto@solvexsolar.cl','Exclude only the identified Dev account in the database query');
  assert.match(new Headers(init.headers).get('prefer'),/count=exact/);
  if(url.searchParams.has('actor_name')){
    assert.equal(url.searchParams.get('actor_name'),'ilike.%Dev%');
    return new Response('[]',{headers:{'Content-Type':'application/json','Content-Range':'*/0'}});
  }
  assert.equal(url.searchParams.get('offset'),'50');
  assert.equal(url.searchParams.get('limit'),'50');
  assert.equal(url.searchParams.get('entity_type'),'eq.quote');
  return new Response(JSON.stringify([{id:'event-51',actor_id:'carol',actor_name:'Carol',actor_email:'carol@example.test'}]),{headers:{'Content-Type':'application/json','Content-Range':'50-50/51'}});
}}});
globalThis.__activityRoute={db};
try{
  const response=await GET(new Request('https://app.test/api/activity?offset=50&kind=quote'));
  const body=await response.json();
  assert.equal(response.status,200);
  assert.equal(globalThis.__activityRoute.admin,true);
  assert.equal(response.headers.get('cache-control'),'private, no-store');
  assert.equal(body.total,51,'Use the filtered database count for pagination');
  assert.equal(body.events[0].actor_name,'Carol');
  assert.equal(body.events[0].actor_color,'green');
  const empty=await GET(new Request('https://app.test/api/activity?actor=Dev'));
  assert.deepEqual(await empty.json(),{events:[],total:0});
  const requestCount=requests.length;
  globalThis.__activityRoute.denied=true;
  assert.equal((await GET(new Request('https://app.test/api/activity'))).status,403);
  assert.equal(requests.length,requestCount);
  console.log('Actividad: Dev oculto antes de contar y paginar, filtros, colores y permisos: OK');
}finally{delete globalThis.__activityRoute}
