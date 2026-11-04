// Opt-in integration test: node tests/crm-assignment-db.mjs (Docker required).
// No ports, network, remote credentials or production data are used.
import {readFileSync,readdirSync} from 'node:fs';
import {spawnSync,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID} from 'node:crypto';
import {setTimeout} from 'node:timers/promises';
const name=`solvex-crm-qa-${randomUUID().slice(0,8)}`;
function docker(args,input){
 const result=spawnSync('docker',args,{input,encoding:'utf8'});
 if(result.status!==0)throw Error(result.stderr||result.error?.message||'Docker failed');
 return result.stdout;
}
const sql=file=>readFileSync(file,'utf8').replace(/^\uFEFF/,'');
const migrations=readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')&&!f.includes('trash')).sort();
const assignment=migrations.find(f=>f.endsWith('_crm_supervision_and_assignment.sql'));
if(!assignment)throw Error('CRM assignment migration missing');
const setup=sql('supabase/tests/fixtures/crm-auth-storage.sql')+'\n'+migrations.filter(f=>f<assignment).map(f=>sql(`supabase/migrations/${f}`)).join('\n')+'\n'+sql('supabase/tests/fixtures/crm-users.sql')+'\n'+sql(`supabase/migrations/${assignment}`);
docker(['run','--name',name,'--rm','--network','none','-d','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17-alpine']);
try{
 let ready=false;
 for(let attempt=0;attempt<50;attempt++){
  if(spawnSync('docker',['exec',name,'pg_isready','-U','postgres'],{stdio:'ignore'}).status===0){ready=true;break}
  await setTimeout(200);
 }
 if(!ready)throw Error('Local PostgreSQL did not start');
 docker(['exec',name,'createdb','-U','postgres','solvex_crm_test']);
 docker(['exec','-i',name,'psql','-U','postgres','-d','solvex_crm_test','-v','ON_ERROR_STOP=1'],setup);
 console.log(docker(['exec','-i',name,'psql','-U','postgres','-d','solvex_crm_test','-v','ON_ERROR_STOP=1'],sql('supabase/tests/crm-assignment.sql')));
 const admin=migrations.find(f=>f.endsWith('_crm_admin_shared_portfolio.sql'));
 if(!admin)throw Error('Admin portfolio migration missing');
 console.log(docker(['exec','-i',name,'psql','-U','postgres','-d','solvex_crm_test','-v','ON_ERROR_STOP=1'],sql(`supabase/migrations/${admin}`)+'\n'+sql('supabase/tests/crm-admin-portfolio.sql')));
 const push=migrations.find(f=>f.endsWith('_crm_pwa_notifications.sql'));
 if(push)console.log(docker(['exec','-i',name,'psql','-U','postgres','-d','solvex_crm_test','-v','ON_ERROR_STOP=1'],sql(`supabase/migrations/${push}`)+'\n'+sql('supabase/tests/crm-push.sql')));
 const pipeline=migrations.find(f=>f.endsWith('_crm_pipeline_and_logistics.sql'));
 const psql=['exec','-i',name,'psql','-U','postgres','-d','solvex_crm_test','-v','ON_ERROR_STOP=1'];
 docker(psql,sql('supabase/migrations/'+pipeline)+'\n'+sql('supabase/tests/crm-pipeline.sql'));
 // Hold the counter lock briefly to exercise two overlapping transactions from different users.
 docker(psql,`insert into public.workspace_config(id,products,settings) values(true,'[{"id":"fixture","name":"Fixture"}]','{}') on conflict(id) do nothing;`);
 const reserve=async(user)=>{
   const snapshot=JSON.stringify({id:randomUUID(),folio:'placeholder',input:{customer:{name:'Concurrent'}}});
   const query="begin;set local role authenticated;select set_config('request.jwt.claim.sub','"+user+"',true);"+
    "select public.save_quote('"+snapshot+"'::jsonb,(select revision from public.workspace_config where id),null)->>'folio';select pg_sleep(0.2);commit;";
   const r=await promisify(execFile)('docker',[...psql,'-At','-c',query]);
   const match=r.stdout.match(/SVX-\d{4}-(\d+)/);
   if(!match)throw Error('Missing concurrent folio');
   return Number(match[1]);
 };
 const numbers=await Promise.all(['00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003'].map(reserve));
 if(Math.abs(numbers[0]-numbers[1])!==1)throw Error('Concurrent quotes did not reserve consecutive folios');
 console.log('Pipeline, logistics RLS, unanswered email reminders and concurrent folios passed.');
}finally{docker(['stop',name])}
