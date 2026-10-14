export type BillCode={format:string;text:string};
export type BillCodeScan={codes:BillCode[];warning?:string};
/** Local, bounded decoding. Barcode contents are never fetched as URLs. */
export async function scanBillCodes(source:CanvasImageSource,width:number,height:number,signal:AbortSignal):Promise<BillCodeScan>{
  signal.throwIfAborted();
  const canvas=document.createElement('canvas');const scale=Math.min(1,2400/Math.max(width,height));
  canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
  const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)return {codes:[],warning:'El navegador no permitió preparar la imagen para leer el código.'};
  context.fillStyle='white';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(source,0,0,canvas.width,canvas.height);
  const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
  const size={width:canvas.width,height:canvas.height};canvas.width=0;canvas.height=0;
  return new Promise((resolve,reject)=>{
    let worker:Worker;
    try{worker=new Worker(new URL('./bill-barcode.worker.ts',import.meta.url),{type:'module'})}catch{resolve({codes:[],warning:'No se pudo iniciar el lector de códigos en este navegador. Actualiza Safari y vuelve a intentar.'});return}
    const finish=(result:BillCodeScan)=>{clearTimeout(timeout);signal.removeEventListener('abort',abort);worker.terminate();resolve(result)};
    const abort=()=>{clearTimeout(timeout);worker.terminate();signal.removeEventListener('abort',abort);reject(new DOMException('Cancelado','AbortError'))};
    const timeout=setTimeout(()=>finish({codes:[],warning:'El lector de códigos tardó demasiado. Vuelve a intentar con una foto cercana del timbre y buena conexión.'}),20000);
    signal.addEventListener('abort',abort,{once:true});
    if(signal.aborted){abort();return}
    worker.onmessage=(e:MessageEvent<BillCodeScan>)=>finish(e.data);
    worker.onerror=()=>finish({codes:[],warning:'El lector de códigos no pudo cargarse. Comprueba tu conexión y vuelve a leer la boleta.'});
    try{worker.postMessage({pixels,...size},[pixels.buffer])}catch{finish({codes:[],warning:'No se pudo procesar la imagen del código. Vuelve a intentar.'})}
  });
}
