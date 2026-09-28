import {build} from 'esbuild';
import {mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
mkdirSync('.sites-runtime',{recursive:true});
for (const name of ['quote','energy']) {
  await build({entryPoints:[`tests/${name}.test.ts`],outfile:`.sites-runtime/${name}-test.cjs`,bundle:true,platform:'node',format:'cjs'});
  const result=spawnSync(process.execPath,[`.sites-runtime/${name}-test.cjs`],{stdio:'inherit'});
  if (result.status !== 0) process.exit(result.status ?? 1);
}
