import {copyFile, mkdir, readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const root = process.cwd();
const output = path.join(root, 'public/ocr');
await mkdir(path.join(output, 'core'), {recursive:true});
const tesseract = path.dirname(require.resolve('tesseract.js/package.json'));
const core = path.dirname(require.resolve('tesseract.js-core/package.json'));
const spanish = path.dirname(require.resolve('@tesseract.js-data/spa/package.json'));
await copyFile(path.join(tesseract, 'dist/worker.min.js'), path.join(output, 'worker.min.js'));
// Keep the available core variants: the worker selects the supported WASM build.
for (const file of await readdir(core)) {
  if (file.endsWith('.wasm.js')) await copyFile(path.join(core, file), path.join(output, 'core', file));
}
await copyFile(path.join(spanish,'4.0.0_best_int/spa.traineddata.gz'),path.join(output,'spa.traineddata.gz'));
await copyFile(path.join(core,'LICENSE'),path.join(output,'LICENSE-tesseract-core.txt'));
console.log('OCR local: motor e idioma español preparados.');
