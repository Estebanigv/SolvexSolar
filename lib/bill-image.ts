/** HTMLImageElement fallback for Safari versions/formats that reject createImageBitmap. */
export async function openBillImage(file:File,signal:AbortSignal):Promise<{source:CanvasImageSource;width:number;height:number;close:()=>void}>{
 signal.throwIfAborted();
 if(typeof createImageBitmap==='function'){
  try{
   const bitmap=await createImageBitmap(file);
   if(signal.aborted){bitmap.close();signal.throwIfAborted()}
   return {source:bitmap,width:bitmap.width,height:bitmap.height,close:()=>bitmap.close()};
  }catch(error){if(signal.aborted)throw error}
 }
 return new Promise((resolve,reject)=>{
  const image=new Image();const url=URL.createObjectURL(file);
  const cleanup=()=>{image.onload=null;image.onerror=null;signal.removeEventListener('abort',abort);URL.revokeObjectURL(url)};
  const abort=()=>{cleanup();image.src='';reject(new DOMException('Cancelado','AbortError'))};
  image.onload=()=>{cleanup();resolve({source:image,width:image.naturalWidth,height:image.naturalHeight,close:()=>{image.src=''}})};
  image.onerror=()=>{cleanup();reject(Error('No se pudo abrir la imagen.'))};
  signal.addEventListener('abort',abort,{once:true});
  if(signal.aborted){abort();return}
  image.src=url;
 });
}
