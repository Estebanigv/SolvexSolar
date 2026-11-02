// Opt-in integration test: node tests/crm-assignment-db.mjs (Docker required).
// No ports, network, remote credentials or production data are used.
import {readFileSync,readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
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
}finally{docker(['stop',name])}
