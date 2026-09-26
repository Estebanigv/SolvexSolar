import {build} from 'esbuild';
import {mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
mkdirSync('.sites-runtime',{recursive:true});
await build({entryPoints:['tests/quote.test.ts'],outfile:'.sites-runtime/quote-test.cjs',bundle:true,platform:'node',format:'cjs'});
const result=spawnSync(process.execPath,['.sites-runtime/quote-test.cjs'],{stdio:'inherit'});process.exit(result.status??1);
