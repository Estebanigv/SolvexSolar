import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {createClient} from '@supabase/supabase-js';
const require=createRequire(import.meta.url);
for(const [name,path] of [['crm','app/api/crm/route.ts'],['notes','app/api/crm/notes/route.ts'],['tasks','app/api/crm/tasks/route.ts'],['contact','app/api/crm/contact/route.ts'],['followup','app/api/projects/[id]/followup/route.ts'],['crmFollowup','app/api/crm/projects/[id]/followup/route.ts'],['assignment','app/api/crm/assignment/route.ts']]){
  await build({entryPoints:[path],outfile:`.sites-runtime/${name}-route-test.cjs`,bundle:true,platform:'node',format:'cjs',plugins:[{
    name:'crm-database-test',setup(build){
      build.onResolve({filter:/^(?:@\/lib\/supabase\/server|\.\/server)$/},()=>({path:'server',namespace:'crm-test'}));
      build.onLoad({filter:/.*/,namespace:'crm-test'},()=>({loader:'js',contents:`
        export class AccessError extends Error{constructor(message,status){super(message);this.status=status}}
        export const privateHeaders={'Cache-Control':'private, no-store'};
        export function databaseError(error){throw new AccessError('Database error',error.code==='42501'?403:503)}
        export function checkOrigin(request){if(request.headers.get('origin')!=='https://crm.test')throw new AccessError('Origin',403)}
        export async function requireMember(){if(globalThis.__crmRoute.denied)throw new AccessError('Access',401);return {db:globalThis.__crmRoute.db,user:{id:globalThis.__crmRoute.userId},profile:{role:'admin'}}}
      `}));
    }
  }]});
}
const route=require('../.sites-runtime/crm-route-test.cjs'),notes=require('../.sites-runtime/notes-route-test.cjs');
const tasks=require('../.sites-runtime/tasks-route-test.cjs'),contact=require('../.sites-runtime/contact-route-test.cjs');
const followup=require('../.sites-runtime/followup-route-test.cjs');
const crmFollowup=require('../.sites-runtime/crmFollowup-route-test.cjs');
const assignment=require('../.sites-runtime/assignment-route-test.cjs');
const requests=[];
const userId='00000000-0000-4000-8000-000000000002';
const id='00000000-0000-4000-8000-000000000001';
const db=createClient('https://crm-test.invalid','test',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input,init)=>{
  const url=new URL(String(input)),method=init.method;requests.push({url,method,body:init.body?JSON.parse(init.body):null});
  if(url.pathname.endsWith('/rpc/crm_can_view_all'))return globalThis.__crmRoute.permissionFailure?Response.json({code:'XX000'},{status:500}):Response.json(globalThis.__crmRoute.supervisor===true);
  if(url.pathname.endsWith('/rpc/crm_team'))return Response.json([{id:userId,full_name:'Team member'}]);
  if(url.pathname.endsWith('/rpc/crm_reassign_client')){
    if(globalThis.__crmRoute.assignmentError)return Response.json({code:globalThis.__crmRoute.assignmentError},{status:400});
    assert.deepEqual(Object.keys(JSON.parse(init.body)).sort(),['client_id','expected_owner_id','expected_updated_at','new_owner_id']);
    return Response.json({client_id:id,owner_id:userId});
  }
  if(method==='PATCH'){
    assert.equal(url.searchParams.get(url.pathname.endsWith('/crm_tasks')?'id':url.pathname.endsWith('/quote_followups')?'project_id':'client_id'),'eq.'+id);
    assert.equal(url.searchParams.get('updated_at'),'eq.2026-10-26T12:00:00Z');
    return Response.json([]); // Stale revision must surface as a conflict.
  }
  if(method==='POST')return Response.json({code:'23505',message:'Duplicate'},{status:409});
  if(url.pathname.endsWith('/crm_tasks')){
    assert.equal(url.searchParams.get('client.owner_id'),globalThis.__crmRoute.supervisor?null:'eq.'+userId);
    if(url.searchParams.has('id'))return Response.json(globalThis.__crmRoute.foreign?null:{id});
    assert.equal(url.searchParams.get('client.deleted_at'),'is.null');
    assert.equal(url.searchParams.get('client_id'),'eq.'+id);
    assert.equal(url.searchParams.get('status'),'eq.completed');
    assert.equal(url.searchParams.get('offset'),'100');
    assert.equal(url.searchParams.get('limit'),'100');
    return new Response('[]',{headers:{'content-type':'application/json','content-range':'*/100'}});
  }
  if(url.pathname.endsWith('/clients')){
    assert.equal(url.searchParams.get('owner_id'),globalThis.__crmRoute.supervisor?null:'eq.'+userId);
    if(url.searchParams.has('id'))return Response.json(globalThis.__crmRoute.foreign?null:{id});
    assert.equal(url.searchParams.get('deleted_at'),'is.null');
    const offset=Number(url.searchParams.get('offset'));
    return Response.json(offset===0?Array.from({length:500},(_,i)=>({id:`client-${i}`,owner_id:'owner',details:{name:`Client ${i}`},updated_at:'2026-10-26T12:00:00Z'})):[{id:'older-client',owner_id:'owner',details:{name:'Older client'},updated_at:'2026-01-01T12:00:00Z'}]);
  }
  if(url.pathname.endsWith('/client_notes')){
    assert.equal(url.searchParams.get('offset'),'50');
    assert.equal(url.searchParams.get('limit'),'50');
    return new Response('[]',{headers:{'content-type':'application/json','content-range':'*/50'}});
  }
  if(url.pathname.endsWith('/quotes')){
    assert.equal(url.searchParams.get('client.owner_id'),globalThis.__crmRoute.supervisor?null:'eq.'+userId);
    if(url.searchParams.has('project_id'))return Response.json(globalThis.__crmRoute.foreign?null:{id});
  }
  return Response.json([]);
}}});
globalThis.__crmRoute={db,userId};
const request=(method,body,origin='https://crm.test')=>new Request('https://crm.test/api/crm',{method,headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
try{
  const response=await route.GET();assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
  assert.equal((await response.json()).entries.length,501,'Read older client pages');
  const edit={client_id:id,status:'qualified',next_contact:null,expected:'2026-10-26T12:00:00Z'};
  assert.equal((await route.PUT(request('PUT',edit))).status,409);
  const closing={expected_close:'2026-11-20',lost_reason:'  Proyecto postergado  '};
  assert.equal((await route.PUT(request('PUT',{...edit,status:'no_answer',...closing}))).status,409);
  assert.equal(requests.at(-1).body.lost_reason,'Proyecto postergado');
  const context={params:Promise.resolve({id})};
  assert.equal((await followup.PUT(request('PUT',{...edit,status:'negotiation',...closing}),context)).status,409);
  assert.equal(requests.at(-1).body.expected_close,'2026-11-20');
  assert.equal('expected' in requests.at(-1).body,false);
  assert.equal((await followup.PUT(request('PUT',{...edit,status:'visit'}),context)).status,409);
  assert.equal('expected_close' in requests.at(-1).body,false,'Existing history UI preserves omitted closing fields');
  assert.equal((await followup.PUT(request('PUT',{...edit,status:'visit',expected_close:'2026-02-30'}),context)).status,400);
  assert.equal((await route.PUT(request('PUT',{...edit,expected:null}))).status,409);
  assert.equal((await route.PUT(request('PUT',{...edit,next_contact:'2026-02-30'}))).status,400);
  assert.equal((await notes.POST(request('POST',{client_id:id,body:' '}))).status,400);
  assert.equal((await notes.GET(new Request(`https://crm.test/api/crm/notes?client_id=${id}&offset=50`))).status,200);
  const task={id,client_id:id,title:'Visita técnica',kind:'visit',due_on:'2026-10-30',priority:'high',details:''};
  const taskEdit={...task,status:'completed',expected:'2026-10-26T12:00:00Z'};
  const profile={client_id:id,source:'website',tags:['Solar'],priority:'normal',expected:'2026-10-26T12:00:00Z'};
  const page=await tasks.GET(new Request(`https://crm.test/api/crm/tasks?client_id=${id}&status=completed&offset=100`));
  assert.equal(page.status,200);assert.match(page.headers.get('cache-control'),/no-store/);assert.equal((await page.json()).total,100);
  assert.equal((await tasks.GET(new Request('https://crm.test/api/crm/tasks?status=bad'))).status,400);
  assert.equal((await tasks.POST(request('POST',task))).status,409,'Duplicate task ID prevents retry duplicates');
  assert.equal((await tasks.PATCH(request('PATCH',taskEdit))).status,409);
  assert.equal((await tasks.POST(request('POST',{...task,due_on:'2026-02-30'}))).status,400);
  assert.equal((await tasks.PATCH(request('PATCH',{...taskEdit,expected:null}))).status,400);
  assert.equal((await contact.PUT(request('PUT',profile))).status,409);
  assert.equal((await contact.PUT(request('PUT',{...profile,expected:null}))).status,409);
  assert.equal((await contact.PUT(request('PUT',{...profile,tags:['x'.repeat(31)]}))).status,400);
  assert.equal((await crmFollowup.PUT(request('PUT',{...edit,status:'visit'}),context)).status,409);
  // A guessed ID must never permit a read or write outside an admin's own CRM.
  globalThis.__crmRoute.foreign=true;
  for(const [handler,method,body] of [[route.PUT,'PUT',edit],[notes.POST,'POST',{client_id:id,body:'note'}],[tasks.POST,'POST',task],[tasks.PATCH,'PATCH',taskEdit],[contact.PUT,'PUT',profile]]){
    const start=requests.length;
    assert.equal((await handler(request(method,body))).status,404);
    assert.ok(requests.slice(start).every(r=>r.method==='GET'||r.url.pathname.endsWith('/rpc/crm_can_view_all')),'Ownership rejection happens before mutation');
  }
  let start=requests.length;
  assert.equal((await notes.GET(new Request(`https://crm.test/api/crm/notes?client_id=${id}`))).status,404);
  assert.ok(!requests.slice(start).some(r=>r.url.pathname.endsWith('/client_notes')),'Foreign notes are never read');
  start=requests.length;
  assert.equal((await crmFollowup.PUT(request('PUT',{...edit,status:'visit'}),context)).status,404);
  assert.ok(requests.slice(start).every(r=>r.method==='GET'||r.url.pathname.endsWith('/rpc/crm_can_view_all')));
  globalThis.__crmRoute.foreign=false;
  globalThis.__crmRoute.supervisor=true;
  const supervised=await route.GET();assert.equal(supervised.status,200);assert.equal((await supervised.json()).canViewAll,true);
  assert.equal((await notes.GET(new Request(`https://crm.test/api/crm/notes?client_id=${id}&offset=50`))).status,200);
  assert.equal((await tasks.GET(new Request(`https://crm.test/api/crm/tasks?client_id=${id}&status=completed&offset=100`))).status,200);
  assert.equal((await route.PUT(request('PUT',edit))).status,409);
  assert.equal((await crmFollowup.PUT(request('PUT',{...edit,status:'visit'}),context)).status,409);
  globalThis.__crmRoute.supervisor=false;
  globalThis.__crmRoute.permissionFailure=true;
  let deniedStart=requests.length;
  assert.equal((await route.GET()).status,503);
  assert.equal(requests.length,deniedStart+1,'Permission failure must not query portfolio');
  globalThis.__crmRoute.permissionFailure=false;
  assert.equal((await assignment.GET()).status,200);
  const transfer={client_id:id,new_owner_id:userId,expected_owner_id:id,expected_updated_at:'2026-10-26T12:00:00Z'};
  assert.equal((await assignment.POST(request('POST',{...transfer,canViewAll:true}))).status,200,'Permission claims supplied by client are stripped');
  for(const [code,status] of [['42501',403],['40001',409],['22023',400]]){
    globalThis.__crmRoute.assignmentError=code;
    assert.equal((await assignment.POST(request('POST',transfer))).status,status);
  }
  delete globalThis.__crmRoute.assignmentError;
  deniedStart=requests.length;
  assert.equal((await assignment.POST(request('POST',{...transfer,new_owner_id:'invalid'}))).status,400);
  assert.equal(requests.length,deniedStart);
  const count=requests.length;
  assert.equal((await assignment.POST(request('POST',transfer,'https://evil.test'))).status,403);
  assert.equal((await route.PUT(request('PUT',edit,'https://evil.test'))).status,403);
  assert.equal((await notes.POST(request('POST',{client_id:id,body:'note'},'https://evil.test'))).status,403);
  assert.equal((await followup.PUT(request('PUT',{...edit,status:'visit'},'https://evil.test'),context)).status,403);
  for(const [handler,method,body] of [[tasks.POST,'POST',task],[tasks.PATCH,'PATCH',taskEdit],[contact.PUT,'PUT',profile]])assert.equal((await handler(request(method,body,'https://evil.test'))).status,403);
  assert.equal((await crmFollowup.PUT(request('PUT',{...edit,status:'visit'},'https://evil.test'),context)).status,403);
  globalThis.__crmRoute.denied=true;
  assert.equal((await assignment.GET()).status,401);
  assert.equal((await assignment.POST(request('POST',transfer))).status,401);
  assert.equal((await crmFollowup.PUT(request('PUT',{...edit,status:'visit'}),context)).status,401);
  assert.equal((await route.GET()).status,401);
  assert.equal((await followup.PUT(request('PUT',{...edit,status:'visit'}),context)).status,401);
  assert.equal((await route.PUT(request('PUT',edit))).status,401);
  assert.equal((await notes.GET(new Request(`https://crm.test/api/crm/notes?client_id=${id}`))).status,401);
  assert.equal((await notes.POST(request('POST',{client_id:id,body:'note'}))).status,401);
  assert.equal((await tasks.GET(new Request('https://crm.test/api/crm/tasks'))).status,401);
  for(const [handler,method,body] of [[tasks.POST,'POST',task],[tasks.PATCH,'PATCH',taskEdit],[contact.PUT,'PUT',profile]])assert.equal((await handler(request(method,body))).status,401);
  assert.equal(requests.length,count,'Rejected requests never reach data storage');
  console.log('CRM API: pagination, private cache, stale writes, validation, origin and session guards passed.');
}finally{delete globalThis.__crmRoute}
