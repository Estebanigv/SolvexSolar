import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';

mkdirSync('.sites-runtime',{recursive:true});
await build({entryPoints:['app/api/members/route.ts'],outfile:'.sites-runtime/members-route-test.cjs',bundle:true,platform:'node',format:'cjs',plugins:[{
  name:'members-route-database',
  setup(build){
    build.onResolve({filter:/^@\/lib\/supabase\/(server|api)$/},args=>({path:args.path,namespace:'members-test'}));
    build.onLoad({filter:/.*/,namespace:'members-test'},args=>({loader:'js',contents:args.path.endsWith('/api')?`
      export async function protectedApi(run){try{return await run()}catch(error){return Response.json({error:error.message},{status:error.status||500})}}
    `:`
      export class AccessError extends Error{constructor(message,status){super(message);this.status=status}}
      export const privateHeaders={'Cache-Control':'private, no-store'};
      export const checkOrigin=()=>{};
      export function databaseError(error){throw Error(error.message)}
      export async function requireMember(admin){globalThis.__membersRoute.admin=admin;if(globalThis.__membersRoute.denied)throw new AccessError('Forbidden',403);return {db:globalThis.__membersRoute.db,user:{id:'self'}}}
    `}));
  }
}]});
const require=createRequire(import.meta.url);
const {GET}=require('../.sites-runtime/members-route-test.cjs');
function deferred(){let resolve;const promise=new Promise(done=>{resolve=done});return {promise,resolve}}
function scenario(profileQuery,accessQuery){
  const started=[];
  globalThis.__membersRoute={db:{
    from(table){assert.equal(table,'profiles');return {select(columns){return {order(){return {limit(){started.push('profiles');return profileQuery(columns)}}}}}}},
    rpc(name){assert.equal(name,'member_access_summary');started.push('access');return accessQuery()}
  }};
  return started;
}
try{
  const profiles=deferred(),access=deferred();
  const started=scenario(()=>profiles.promise,()=>access.promise);
  const request=GET();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(globalThis.__membersRoute.admin,true,'Admin authorization must run before reading team data');
  assert.deepEqual(started,['profiles','access'],'Both reads must start before either resolves');
  access.resolve({data:[{user_id:'carol',last_login:'2026-10-04T10:00:00Z'}],error:null});
  profiles.resolve({data:[{id:'carol',full_name:'Carol'},{id:'marcelo',full_name:'Marcelo'}],error:null});
  const response=await request,body=await response.json();
  assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'private, no-store');
  assert.equal(body.members.length,2);
  assert.equal(body.members[0].last_login,'2026-10-04T10:00:00Z');
  assert.equal(body.members[1].full_name,'Marcelo','A missing activity row must not remove a member');

  let attempts=0;
  const fallback=scenario(columns=>{attempts++;return Promise.resolve(columns.includes('identification_color')?{data:null,error:{code:'42703',message:'identification_color does not exist'}}:{data:[{id:'carol'}],error:null})},()=>Promise.resolve({data:[],error:null}));
  assert.equal((await GET()).status,200);
  assert.equal(attempts,2,'Missing optional color retains its compatibility fallback');
  assert.equal(fallback.filter(v=>v==='access').length,1,'Optional color fallback does not repeat access query');

  scenario(()=>Promise.resolve({data:[],error:null}),()=>Promise.resolve({data:null,error:{message:'Access query unavailable'}}));
  assert.equal((await GET()).status,500,'Do not present a failed activity query as complete data');
  const blocked=scenario(()=>{throw Error('Must not query')},()=>{throw Error('Must not query')});
  globalThis.__membersRoute.denied=true;
  assert.equal((await GET()).status,403);
  assert.deepEqual(blocked,[],'Denied users cannot start either query');
  console.log('Usuarios: consultas simultáneas, combinación de accesos, permisos, errores y compatibilidad: OK');
}finally{delete globalThis.__membersRoute}
