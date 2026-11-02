import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
await build({entryPoints:['app/protected-workspace.tsx','app/acceso/page.tsx'],outdir:'.sites-runtime/crm-access',bundle:true,platform:'node',format:'cjs',jsx:'automatic',outExtension:{'.js':'.cjs'},plugins:[{
 name:'access-test',setup(build){
  build.onResolve({filter:/^(?:next\/navigation|@\/lib\/supabase\/(?:server|config)|\.\/quote-app|\.\/workspace-status|\.\/sign-in)$/},({path})=>({path,namespace:'access-test'}));
  build.onLoad({filter:/.*/,namespace:'access-test'},({path})=>({loader:'js',contents:
   path==='next/navigation'?`export function redirect(url){throw Object.assign(new Error('redirect'),{url})}`:
   path.endsWith('/config')?`export const usesSupabase=true;`:
   path.endsWith('/server')?`export class AccessError extends Error{constructor(message,status){super(message);this.status=status}};export async function requireMember(){globalThis.__crmAccess.calls++;if(globalThis.__crmAccess.status)throw new AccessError('Unavailable',globalThis.__crmAccess.status);return {}}`:
   path==='./workspace-status'?`export const WorkspaceStatus=()=>null;`:`export default function Fixture(){return null}`
  }));
 }
}]});
const {ProtectedWorkspace}=require('../.sites-runtime/crm-access/protected-workspace.cjs');
const {default:Access}=require('../.sites-runtime/crm-access/acceso/page.cjs');
globalThis.__crmAccess={calls:0,status:0};
try{
 for(const panel of ['quote','crm']){
  globalThis.__crmAccess.status=0;
  assert.equal((await ProtectedWorkspace({initialPanel:panel})).props.initialPanel,panel);
  globalThis.__crmAccess.status=401;
  await assert.rejects(()=>ProtectedWorkspace({initialPanel:panel}),e=>e.url===(panel==='crm'?'/acceso?next=%2Fcrm':'/acceso'));
  globalThis.__crmAccess.status=403;
  await assert.rejects(()=>ProtectedWorkspace({initialPanel:panel}),e=>e.url===(panel==='crm'?'/acceso?next=%2Fcrm&estado=pendiente':'/acceso?estado=pendiente'));
 }
 assert.equal(globalThis.__crmAccess.calls,6,'Both entry points verify the same membership');
 globalThis.__crmAccess.status=503;
 assert.equal((await ProtectedWorkspace({initialPanel:'crm'})).props.error,'Unavailable','Connection failure must not render workspace');
 for(const next of ['https://evil.test','//evil.test','/admin','/crm?spoof=1',undefined,['/crm']])assert.equal((await Access({searchParams:Promise.resolve({next})})).props.returnTo,'/','Unrecognized destinations are never forwarded');
 const login=await Access({searchParams:Promise.resolve({next:'/crm',estado:'pendiente'})});
 assert.equal(login.props.returnTo,'/crm');assert.equal(login.props.pending,true);
 console.log('CRM access: shared membership gate, pending users, failure closure and safe sign-in return passed.');
}finally{delete globalThis.__crmAccess}
