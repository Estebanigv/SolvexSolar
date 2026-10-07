import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
await build({entryPoints:['app/api/members/me/proposal-style/route.ts'],outfile:'.sites-runtime/proposal-style-route.cjs',bundle:true,platform:'node',format:'cjs',plugins:[{name:'auth-test',setup(build){
 build.onResolve({filter:/^(?:@\/lib\/supabase\/server|\.\/server)$/},args=>({path:'server',namespace:'auth-test'}));
 build.onLoad({filter:/.*/,namespace:'auth-test'},()=>({loader:'js',contents:`
 export class AccessError extends Error{constructor(message,status){super(message);this.status=status}}
 export const privateHeaders={'Cache-Control':'private, no-store'};
 export function checkOrigin(request){if(request.headers.get('origin')!=='https://test.local')throw new AccessError('Origin',403)}
 export function databaseError(){throw Error('database')}
 export async function requireMember(){const s=globalThis.styleTest;if(!s.user)throw new AccessError('Login',401);return {user:s.user,db:{auth:{async updateUser(patch){s.writes.push(patch);if(s.fail)return {error:{}};Object.assign(s.user.user_metadata,patch.data);return {error:null}}}}}}
 `}));
}}]});
const {GET,PUT}=createRequire(import.meta.url)('../.sites-runtime/proposal-style-route.cjs');
const style={font:'serif',textScale:1,accent:'#bdd548',primary:'#16563f',text:'#103b45',background:'#ffffff',panel:'#eef4f2',cover:'#092f38',coverPhoto:true};
const req=(body=style,origin='https://test.local')=>new Request('https://test.local/api/members/me/proposal-style',{method:'PUT',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
globalThis.styleTest={user:null,writes:[]};
assert.equal((await GET()).status,401);assert.equal((await PUT(req())).status,401);
const alice={id:'alice',user_metadata:{untouched:'keep'}},bob={id:'bob',user_metadata:{}};
globalThis.styleTest.user=alice;
assert.equal((await PUT(req(style,'https://evil.example'))).status,403);
assert.equal((await PUT(req({...style,userId:'bob'}))).status,400);
assert.equal((await PUT(req())).status,200);assert.equal(alice.user_metadata.untouched,'keep');
const response=await GET();assert.equal(response.headers.get('cache-control'),'private, no-store');assert.deepEqual((await response.json()).style,style);
globalThis.styleTest.user=bob;assert.equal((await (await GET()).json()).style,null);
globalThis.styleTest.fail=true;assert.equal((await PUT(req())).status,503);assert.deepEqual(bob.user_metadata,{});
delete globalThis.styleTest;
console.log('Estilo por usuario: sesión, aislamiento, origen, validación, lectura y fallo de guardado: OK');
