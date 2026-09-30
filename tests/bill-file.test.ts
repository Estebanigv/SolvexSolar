import assert from 'node:assert/strict';
import {validateBillFile, maxBillBytes,validateBillBatch,billStorageName,billStorageNames} from '../lib/bill-file';

async function run() {
  assert.doesNotThrow(()=>validateBillBatch(Array.from({length:8},()=>({size:1024}))));
  assert.throws(()=>validateBillBatch(Array.from({length:9},()=>({size:1024}))));
  assert.throws(()=>validateBillBatch(Array.from({length:5},()=>({size:maxBillBytes}))));
  assert.equal(new Set(billStorageNames).size,8);
  assert.equal(billStorageName(7),'documento-8');assert.throws(()=>billStorageName(8));
  assert.equal(await validateBillFile(new File(['%PDF-1.7\n'], 'boleta.pdf', {type:'application/pdf'})), 'application/pdf');
  assert.equal(await validateBillFile(new File([new Uint8Array([255,216,255,224])], 'boleta.JPG', {type:'image/jpeg'})), 'image/jpeg');
  assert.equal(await validateBillFile(new File([new Uint8Array([137,80,78,71,13,10,26,10])], 'boleta.png')), 'image/png');
  for (const file of [
    new File(['<html>no es una boleta</html>'], 'boleta.pdf', {type:'application/pdf'}),
    new File(['%PDF-1.7'], 'boleta.html', {type:'text/html'}),
    new File(['%PDF-1.7'], 'boleta.pdf', {type:'image/png'}),
    new File([], 'vacia.pdf'),
    new File([new Uint8Array(maxBillBytes+1)], 'grande.pdf'),
  ]) await assert.rejects(validateBillFile(file));
  console.log('Boletas: tipos permitidos, firmas, archivos vacíos y límite de tamaño: OK');
}
void run().catch(error => {console.error(error); process.exitCode = 1});
