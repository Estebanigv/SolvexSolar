export function stopBillCamera(stream:MediaStream){stream.getTracks().forEach(track=>track.stop())}

/** getUserMedia cannot be cancelled: also stop streams granted after closing. */
export function acquireBillCamera(open:()=>Promise<MediaStream>,signal:AbortSignal):Promise<MediaStream>{
 return new Promise((resolve,reject)=>{
  const abort=()=>reject(new DOMException('Cancelado','AbortError'));
  if(signal.aborted){abort();return}
  signal.addEventListener('abort',abort,{once:true});
  Promise.resolve().then(open).then(stream=>{
   if(signal.aborted){stopBillCamera(stream);return}
   resolve(stream);
  },reject).finally(()=>signal.removeEventListener('abort',abort));
 });
}

export function cameraError(error:unknown){
 const name=error instanceof Error?error.name:'';
 if(name==='NotAllowedError'||name==='SecurityError')return 'La cámara está bloqueada. Permite su uso para este sitio en Safari o en tu navegador y vuelve a intentar. También puedes usar una foto.';
 if(name==='NotFoundError'||name==='OverconstrainedError')return 'No encontramos una cámara disponible. Puedes adjuntar una foto del código.';
 if(name==='NotReadableError')return 'Otra aplicación podría estar usando la cámara. Ciérrala y vuelve a intentar, o usa una foto.';
 return 'No se pudo iniciar la cámara. Abre el cotizador directamente en Safari o Chrome, o utiliza una foto.';
}

export function waitForCameraFrame(signal:AbortSignal,delay=350):Promise<void>{
 return new Promise((resolve,reject)=>{
  const abort=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);reject(new DOMException('Cancelado','AbortError'))};
  const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve()},delay);
  signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
 });
}
