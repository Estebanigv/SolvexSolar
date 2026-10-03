import {build} from 'esbuild';
import {mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
mkdirSync('.sites-runtime',{recursive:true});
for (const name of ['quote-issuance','projection','panel-costs','productivity','bill-backup','cne','management-dashboard','bill-barcode','profile-compatibility','password-change','member-color','activity','commercial','proposal-document','quote-history','quote','energy','bill-file','bill-extraction','geocoding','request-origin']) {
  await build({entryPoints:[`tests/${name}.test.ts`],outfile:`.sites-runtime/${name}-test.cjs`,bundle:true,platform:'node',format:'cjs'});
  const result=spawnSync(process.execPath,[`.sites-runtime/${name}-test.cjs`],{stdio:'inherit'});
  if (result.status !== 0) process.exit(result.status ?? 1);
}
