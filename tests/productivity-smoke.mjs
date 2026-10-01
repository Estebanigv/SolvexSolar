import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createServerClient} from '@supabase/ssr';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
const credentials=JSON.parse(fs.readFileSync(process.env.TEST_CREDENTIALS_FILE||'.sites-runtime/test-auth.json','utf8'));
assert.ok(credentials.email.endsWith('@solvex-test.example'),'Disposable QA account required');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3013';
const cookies=new Map(),db=createServerClient('https://oymuqllnmocfzmghbmcp.supabase.co','sb_publishable_2coc30rQ7-dKGMCz78W2Jg_dHsAWrBI',{cookies:{getAll:()=>[...cookies].map(([name,value])=>({name,value})),setAll:values=>values.forEach(({name,value})=>cookies.set(name,value))}});
const login=await db.auth.signInWithPassword(credentials);assert.equal(login.error,null,'QA login failed');
async function request(path,method='GET',body){const response=await fetch(base+path,{method,headers:{Origin:base,'Content-Type':'application/json',Cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; ')},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,body:await response.json()}}
const records=fs.existsSync('.sites-runtime/productivity-qa-records.json')?JSON.parse(fs.readFileSync('.sites-runtime/productivity-qa-records.json','utf8')):{userId:credentials.id,clients:[],quotes:[]};assert.equal(records.userId,credentials.id);const track=()=>fs.writeFileSync('.sites-runtime/productivity-qa-records.json',JSON.stringify(records));track();
try{
 assert.equal((await request('/api/workspace/health')).status,200,'Database release readiness');
 const workspace=await request('/api/workspace');assert.equal(workspace.status,200);
 await build({entryPoints:['lib/quote.ts'],outfile:'.sites-runtime/productivity-quote.cjs',bundle:true,platform:'node',format:'cjs'});const {newQuote}=createRequire(import.meta.url)('../.sites-runtime/productivity-quote.cjs');
 const input={...newQuote(),customer:{name:'QA Productividad · Temporal',email:'cliente@solvex-test.example',phone:'+56900000000',region:'Metropolitana de Santiago',commune:'Santiago',address:'Dirección de prueba',bill:0}};
 const client=await request('/api/clients','POST',{details:input.customer});assert.equal(client.status,201,client.body.error);records.clients.push(client.body.id);track();
 const root=await request('/api/quotes','POST',{input,revision:workspace.body.revision,clientId:client.body.id});assert.equal(root.status,201,root.body.error);records.quotes.push(root.body.id);track();
 const revision=await request('/api/quotes','POST',{input:{...input,notes:'Segunda versión de prueba'},revision:workspace.body.revision,clientId:client.body.id,sourceQuoteId:root.body.id});assert.equal(revision.status,201,revision.body.error);records.quotes.push(revision.body.id);track();assert.equal(revision.body.projectId,root.body.id);
 let followup=await request(`/api/projects/${root.body.id}/followup`,'PUT',{status:'followup',next_contact:'2026-10-15',expected:null});assert.equal(followup.status,200,followup.body.error);
 assert.equal((await request(`/api/projects/${root.body.id}/followup`,'PUT',{status:'accepted',next_contact:null,expected:null})).status,409,'Concurrent creation conflict');
 assert.equal((await request(`/api/projects/${root.body.id}/followup`,'PUT',{status:'accepted',next_contact:null,expected:followup.body.followup.updated_at})).status,200);
 assert.equal((await request(`/api/clients/${client.body.id}/detail`,'POST',{body:'Nota QA: revisar factibilidad del proyecto.'})).status,200);
 const detail=await request(`/api/clients/${client.body.id}/detail`);assert.equal(detail.status,200);assert.equal(detail.body.quotes.length,2);assert.equal(detail.body.notes.length,1);assert.ok(detail.body.quotes.every(q=>q.followup.status==='accepted'));
 const bill=fs.readFileSync('.sites-runtime/boleta-prueba-1.pdf');const upload=await db.storage.from('boletas').upload(`${credentials.id}/${revision.body.id}/frente`,bill,{contentType:'application/pdf'});assert.equal(upload.error,null,'Private attachment upload');
 const bills=await request(`/api/quotes/${revision.body.id}/bills`);assert.equal(bills.status,200);assert.equal(bills.body.files.length,1);assert.equal((await fetch(bills.body.files[0].url)).status,200);
 const members=await request('/api/members');assert.equal(members.status,200,members.body.error);assert.ok(members.body.members.find(m=>m.id===credentials.id).last_login);
 const access=await request('/api/members/access?user='+credentials.id);assert.equal(access.status,200);assert.ok(access.body.events.some(e=>e.source==='login'));
 assert.equal((await request('/api/activity')).status,200);
 const unauth=await fetch(base+'/api/workspace/health');assert.ok([401,403].includes(unauth.status));
 console.log('PASS: real login, release readiness, client, two linked revisions, follow-up conflict, notes, private bill, access history and unauthenticated denial.');
}finally{await db.auth.signOut()}
