import assert from 'node:assert/strict';
import {backupBills,type BillBackupJob,type BillStore} from '../lib/bill-backup';

async function main(){
 const files=Array.from({length:8},(_,i)=>new File([`%PDF-1.7\noriginal-${i}`],`bill-${i}.pdf`,{type:'application/pdf'}));
 const job:BillBackupJob={quoteId:'quote',ownerId:'owner',folio:'SVX-TEST',files,completed:0};
 const stored=new Map<string,Blob>();let failed=true;const calls:string[]=[];
 const store:BillStore={
  upload:async(path,file)=>{calls.push(path);if(path.endsWith('documento-3')&&failed)throw Error('offline');if(stored.has(path))throw Error('exists');stored.set(path,file)},
  download:async path=>{if(!stored.has(path))throw Error('missing');return stored.get(path)!},
 };
 await assert.rejects(backupBills(job,store),/offline/);
 assert.equal(job.completed,2);assert.equal(stored.size,2);
 failed=false;await backupBills(job,store);
 assert.equal(job.completed,8);assert.equal(stored.size,8);
 assert.equal(calls.filter(path=>path.endsWith('/frente')).length,1,'Retry must not reupload completed files');
 assert.equal(stored.get('owner/quote/documento-8'),files[7]);
 // Lost upload response: exact original bytes establish success.
 const retry={...job,completed:0};await backupBills(retry,store);assert.equal(retry.completed,8);
 // Never silently bind an unrelated file already present in the same slot.
 stored.set('owner/quote/frente',new Blob(['%PDF-1.7\nDIFFERENT!']));
 await assert.rejects(backupBills({...job,completed:0},store),/exists/);
 let uploads=0;
 await assert.rejects(backupBills({...job,files:[files[0],new File(['invalid'],'bad.pdf')],completed:0},{...store,upload:async()=>{uploads++}}),/Formato/);
 assert.equal(uploads,0,'Validate the entire batch before the first upload');
 console.log('Bill backup: eight files, interrupted retry, lost response, conflicting slot and invalid file passed.');
}
void main().catch(error=>{console.error(error);process.exitCode=1});
