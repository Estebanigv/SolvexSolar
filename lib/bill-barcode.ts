export type BillCode={format:string;text:string};
export type BillCodeScan={codes:BillCode[];warning?:string};
/** Reuse a worker across live frames; one frame at a time, never queue camera images. */
export function createBillCodeScanner(signal:AbortSignal){
 signal.throwIfAborted();
 const worker=new Worker(new URL('./bill-barcode.worker.ts',import.meta.url),{type:'module'});
 let closed=false,pending:{resolve:(value:BillCodeScan)=>void;reject:(error:unknown)=>void;timer:ReturnType<typeof setTimeout>}|undefined;
 function settle(value:BillCodeScan){if(!pending)return;const current=pending;pending=undefined;clearTimeout(current.timer);current.resolve(value)}
 function close(){if(closed)return;closed=true;worker.terminate();signal.removeEventListener('abort',close);if(pending){const current=pending;pending=undefined;clearTimeout(current.timer);current.reject(new DOMException('Cancelado','AbortError'))}}
 signal.addEventListener('abort',close,{once:true});
 worker.onmessage=(event:MessageEvent<BillCodeScan>)=>settle(event.data);
 worker.onerror=()=>{settle({codes:[],warning:'El lector de códigos no pudo cargarse. Comprueba tu conexión y vuelve a leer la boleta.'});close()};
 async function scan(source:CanvasImageSource,width:number,height:number):Promise<BillCodeScan>{
  signal.throwIfAborted();if(closed)throw new DOMException('Lector cerrado','AbortError');if(pending)throw Error('Ya hay una imagen en lectura.');
  const canvas=document.createElement('canvas'),scale=Math.min(1,2400/Math.max(width,height));
  canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
  const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)return {codes:[],warning:'El navegador no permitió preparar la imagen para leer el código.'};
  context.fillStyle='white';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(source,0,0,canvas.width,canvas.height);
  const pixels=context.getImageData(0,0,canvas.width,canvas.height).data,size={width:canvas.width,height:canvas.height};canvas.width=0;canvas.height=0;
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{settle({codes:[],warning:'El lector de códigos tardó demasiado. Vuelve a intentar con el código enfocado y buena conexión.'});close()},20000);
   pending={resolve,reject,timer};
   try{worker.postMessage({pixels,...size},[pixels.buffer])}catch{settle({codes:[],warning:'No se pudo procesar la imagen del código. Vuelve a intentar.'});close()}
  });
 }
 return {scan,close};
}
/** Local, bounded decoding. Barcode contents are never fetched as URLs. */
export async function scanBillCodes(source:CanvasImageSource,width:number,height:number,signal:AbortSignal):Promise<BillCodeScan>{
 signal.throwIfAborted();let scanner:ReturnType<typeof createBillCodeScanner>;
 try{scanner=createBillCodeScanner(signal)}catch{return {codes:[],warning:'No se pudo iniciar el lector de códigos en este navegador. Actualiza Safari y vuelve a intentar.'}}
 try{return await scanner.scan(source,width,height)}finally{scanner.close()}
}
