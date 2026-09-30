import {billStorageName,validateBillBatch,validateBillFile} from './bill-file';

export type BillBackupJob={quoteId:string;folio:string;ownerId:string;files:File[];completed:number};
export type BillStore={
  upload:(path:string,file:File,mime:string)=>Promise<void>;
  download:(path:string)=>Promise<Blob>;
};

export async function validateBackupFiles(files:File[]){
  validateBillBatch(files);
  return Promise.all(files.map(validateBillFile));
}

/** A job owns an immutable file selection; retries never create another quote. */
export async function backupBills(job:BillBackupJob,store:BillStore,onProgress:(count:number)=>void=()=>{}){
  const formats=await validateBackupFiles(job.files);
  for(let i=job.completed;i<job.files.length;i++){
    const path=`${job.ownerId}/${job.quoteId}/${billStorageName(i)}`;
    try{await store.upload(path,job.files[i],formats[i])}
    catch(uploadError){
      // A response can be lost after a successful upload. Verify bytes before
      // treating an existing immutable slot as complete; never overwrite it.
      let matches=false;
      try{
        const remote=await store.download(path);
        if(remote.size===job.files[i].size){
          const [a,b]=await Promise.all([remote.arrayBuffer(),job.files[i].arrayBuffer()]);
          const bytes=new Uint8Array(b);matches=new Uint8Array(a).every((v,n)=>v===bytes[n]);
        }
      }catch{/* Keep the original upload failure. */}
      if(!matches)throw uploadError;
    }
    job.completed=i+1;onProgress(job.completed);
  }
}
