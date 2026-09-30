export type BillCode={format:string;text:string};
/** Local, bounded decoding. Barcode contents are never fetched as URLs. */
export async function scanBillCodes(source:CanvasImageSource,width:number,height:number,signal:AbortSignal):Promise<BillCode[]>{
  signal.throwIfAborted();
  const canvas=document.createElement('canvas');const scale=Math.min(1,2400/Math.max(width,height));
  canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
  const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)return [];
  context.fillStyle='white';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(source,0,0,canvas.width,canvas.height);
  const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
  const size={width:canvas.width,height:canvas.height};canvas.width=0;canvas.height=0;
  return new Promise((resolve,reject)=>{
    let worker:Worker;
    try{worker=new Worker(new URL('./bill-barcode.worker.ts',import.meta.url),{type:'module'})}catch{resolve([]);return}
    const finish=(codes:BillCode[])=>{clearTimeout(timeout);signal.removeEventListener('abort',abort);worker.terminate();resolve(codes)};
    const abort=()=>{clearTimeout(timeout);worker.terminate();signal.removeEventListener('abort',abort);reject(new DOMException('Cancelado','AbortError'))};
    const timeout=setTimeout(()=>finish([]),12000);
    signal.addEventListener('abort',abort,{once:true});
    if(signal.aborted){abort();return}
    worker.onmessage=(e:MessageEvent<BillCode[]>)=>finish(e.data);
    worker.onerror=()=>finish([]);
    worker.postMessage({pixels,...size},[pixels.buffer]);
  });
}
