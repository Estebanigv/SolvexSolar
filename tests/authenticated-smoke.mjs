import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {createServerClient} from '@supabase/ssr';
const credentials=JSON.parse(fs.readFileSync(process.env.TEST_CREDENTIALS_FILE||new URL('../.sites-runtime/test-auth.json',import.meta.url),'utf8'));
assert.ok(credentials.email.endsWith('@solvex-test.example'),'Use only an explicitly authorized disposable test account');
fs.mkdirSync('.sites-runtime',{recursive:true});
await build({entryPoints:['lib/quote.ts'],outfile:'.sites-runtime/quote-validation.cjs',bundle:true,platform:'node',format:'cjs'});
const cookies=new Map();
const db=createServerClient('https://oymuqllnmocfzmghbmcp.supabase.co','sb_publishable_2coc30rQ7-dKGMCz78W2Jg_dHsAWrBI',{cookies:{getAll:()=>[...cookies].map(([name,value])=>({name,value})),setAll:values=>values.forEach(({name,value})=>cookies.set(name,value))}});
const login=await db.auth.signInWithPassword({email:credentials.email,password:credentials.password});
assert.equal(login.error,null,'Supabase password sign-in failed');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3014';
async function request(path,method='GET',body){const response=await fetch(base+path,{method,headers:{Origin:base,'Content-Type':'application/json',Cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; ')},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,body:await response.json()};}
try {
const workspace=await request('/api/workspace');assert.equal(workspace.status,200);assert.equal(workspace.body.profile.id,credentials.id);assert.ok(workspace.body.products.length>0);assert.ok(workspace.body.installation.length>0);
const customer={name:'Cliente QA temporal',email:'cliente@solvex-test.example',phone:'+56 9 0000 0000',region:'Región de prueba',commune:'Comuna de prueba',address:'Dirección de prueba',bill:150000};
const client=await request('/api/clients','POST',{details:customer});assert.equal(client.status,201,client.body.error);
const require=createRequire(import.meta.url);const {newQuote,calculate}=require('../.sites-runtime/quote-validation.cjs');const input={...newQuote(),customer};
const quote=await request('/api/quotes','POST',{input,revision:workspace.body.revision,clientId:client.body.id});assert.equal(quote.status,201);assert.equal(quote.body.clientId,client.body.id);assert.equal(quote.body.calculation.total,calculate(input,workspace.body.products,workspace.body.settings,workspace.body.installation).total);
fs.writeFileSync(new URL('../.sites-runtime/qa-results.json',import.meta.url),JSON.stringify({userId:credentials.id,clientId:client.body.id,quoteId:quote.body.id}));
assert.equal((await request('/api/quotes')).body.quotes.some(q=>q.id===quote.body.id),true);
assert.equal((await request('/api/clients')).body.clients.some(c=>c.id===client.body.id),true);
assert.equal((await request('/api/quotes?id='+quote.body.id)).body.input.customer.name,customer.name);
assert.equal((await request('/api/quotes','POST',{input,revision:workspace.body.revision+100})).status,409);
assert.deepEqual((await request(`/api/quotes/${quote.body.id}/bills`)).body.files,[]);
assert.equal((await request('/api/members')).body.members.some(p=>p.id===credentials.id),true);
assert.equal((await request('/api/members','PATCH',{id:credentials.id,role:'disabled'})).status,400);
const updated=await request('/api/workspace','PUT',{products:workspace.body.products,settings:workspace.body.settings,revision:workspace.body.revision});assert.equal(updated.status,200);assert.equal(updated.body.revision,workspace.body.revision+1);
assert.equal((await request('/auth/signout','POST')).status,200);
} finally {await db.auth.signOut();}
console.log('PASS: real Auth session, private catalog, customer save, quote save/reload, conflict rejection, members, bills access and sign-out.');
