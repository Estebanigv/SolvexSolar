import assert from 'node:assert/strict';
import {acquireBillCamera,cameraError,stopBillCamera,waitForCameraFrame} from '../lib/bill-camera';
async function run(){
 let stops=0;const stream={getTracks:()=>[{stop:()=>stops++},{stop:()=>stops++}]} as unknown as MediaStream;
 const controller=new AbortController();
 assert.equal(await acquireBillCamera(async()=>stream,controller.signal),stream);
 stopBillCamera(stream);assert.equal(stops,2);
 let grant!:(stream:MediaStream)=>void;
 const late=new AbortController(),pending=acquireBillCamera(()=>new Promise(resolve=>{grant=resolve}),late.signal);
 await Promise.resolve();late.abort();await assert.rejects(pending,{name:'AbortError'});grant(stream);await new Promise(resolve=>setImmediate(resolve));assert.equal(stops,4,'Stop camera granted after dialog closes');
 const aborted=new AbortController();aborted.abort();let calls=0;
 await assert.rejects(acquireBillCamera(async()=>{calls++;return stream},aborted.signal),{name:'AbortError'});assert.equal(calls,0);
 const denied=new DOMException('private browser details','NotAllowedError');
 await assert.rejects(acquireBillCamera(async()=>{throw denied},new AbortController().signal),{name:'NotAllowedError'});
 assert.match(cameraError(denied),/bloqueada/);assert.doesNotMatch(cameraError(denied),/private/);
 const wait=new AbortController();const delay=waitForCameraFrame(wait.signal,10000);wait.abort();await assert.rejects(delay,{name:'AbortError'});
 console.log('Cámara: cancelación, permisos, cierre y autorización tardía: OK');
}
void run().catch(error=>{console.error(error);process.exitCode=1});
