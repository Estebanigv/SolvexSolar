import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';

await build({entryPoints:['supabase/functions/quote-trash/index.ts'],outfile:'.sites-runtime/quote-trash-test.cjs',bundle:true,platform:'node',format:'cjs',plugins:[{name:'trash-boundary',setup(build){
 build.onResolve({filter:/^@supabase\/supabase-js$/},()=>({path:'db',namespace:'trash-test'}));
 build.onLoad({filter:/.*/,namespace:'trash-test'},()=>({loader:'js',contents:'export const createClient=()=>new Proxy({},{get:(_,key)=>globalThis.__trashDB[key]});'}));
}}]});
let handler;
globalThis.Deno={env:{get:key=>key},serve:fn=>{handler=fn;}};
createRequire(import.meta.url)('../.sites-runtime/quote-trash-test.cjs');
const id='11111111-1111-4111-8111-111111111111',folio='SVX-TEST-001';
let calls,opts;
function setup(options={}){
 opts=options;calls=[];
 globalThis.__trashDB={
  auth:{getUser:async()=>({data:{user:opts.noUser?null:{id:'admin'}},error:null})},
  from:()=>{const query={select:()=>query,eq:()=>query,not:()=>query,or:()=>query,order:()=>query,
   single:async()=>({data:{role:opts.role??'admin'},error:null}),limit:async()=>({data:[{id,folio}],error:null})};return query;},
  rpc:async(name)=>{calls.push(name);return {data:name==='trash_verify_cron'?!opts.badToken:name==='trash_claim_quote'?(opts.noClaim?null:'owner/'+id):!opts.finishFails,error:null};},
  storage:{from:()=>({
   list:async prefix=>{calls.push('list:'+prefix);return {data:opts.empty?[]:[{id:'file',name:'frente'}],error:opts.listFails?{}:null};},
   remove:async paths=>{calls.push(paths);return {error:opts.removeFails?{}:null};},
  })},
 };
}
const request=(body={id,folio},headers={Authorization:'Bearer test'})=>new Request('https://example.test',{method:'POST',headers,body:JSON.stringify(body)});
try{
 setup();assert.equal((await handler(request(undefined,{}))).status,401);assert.deepEqual(calls,[]);
 setup({noUser:true});assert.equal((await handler(request())).status,401);assert.deepEqual(calls,[]);
 setup({role:'sales'});assert.equal((await handler(request())).status,403);assert.deepEqual(calls,[]);
 setup();assert.equal((await handler(request({id:'bad',folio}))).status,400);assert.deepEqual(calls,[]);
 setup({noClaim:true});assert.equal((await handler(request())).status,409);assert.deepEqual(calls,['trash_claim_quote']);
 for(const failure of ['listFails','removeFails']){
  setup({[failure]:true});assert.equal((await handler(request())).status,503);assert.ok(!calls.includes('trash_finish_quote'));
 }
 setup({finishFails:true});assert.equal((await handler(request())).status,503);
 setup();assert.deepEqual(await (await handler(request())).json(),{ok:true,deleted:1});
 assert.deepEqual(calls,['trash_claim_quote','list:owner/'+id,['owner/'+id+'/frente'],'trash_finish_quote']);
 setup({empty:true});assert.equal((await handler(request())).status,200);assert.ok(calls.includes('trash_finish_quote'));assert.ok(!calls.some(Array.isArray));
 setup({badToken:true});assert.equal((await handler(request({}, {'x-trash-token':'test'}))).status,401);assert.deepEqual(calls,['trash_verify_cron']);
 setup();assert.equal((await handler(request({}, {'x-trash-token':'test'}))).status,200);
 console.log('Papelera: sesión, administrador, confirmación, borrado de archivos antes de cotización, fallos reintentables y cron autenticado: OK');
}finally{delete globalThis.__trashDB;delete globalThis.Deno;}
