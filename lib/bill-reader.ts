import {billTextScore, extractBill, type BillExtraction} from './bill-extraction';
import type {Worker} from 'tesseract.js';
import type {PDFDocumentLoadingTask} from 'pdfjs-dist';
export type BillDocument = {id:string;file:File;url:string;mime:string;rotation:number};

function abortable<T>(promise:Promise<T>,signal:AbortSignal):Promise<T>{
  return new Promise((resolve,reject)=>{
    const abort=()=>reject(new DOMException('Lectura cancelada','AbortError'));
    if(signal.aborted){void promise.catch(()=>{});abort();return}
    signal.addEventListener('abort',abort,{once:true});
    promise.then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));
  });
}
export async function readBills(files:BillDocument[],signal:AbortSignal,progress:(message:string)=>void):Promise<BillExtraction>{
  let worker:Worker|undefined;let pdfTask:PDFDocumentLoadingTask|undefined;
  const texts:string[]=[];const warnings:string[]=[];
  const stop=()=>{const activeWorker=worker;const activePdf=pdfTask;worker=undefined;pdfTask=undefined;void activeWorker?.terminate();void activePdf?.destroy()};
  signal.addEventListener('abort',stop,{once:true});
  async function engine(){
    if(worker)return worker;
    progress('Preparando lector en español…');
    const {createWorker,PSM}=await import('tesseract.js');
    const pending=createWorker('spa',1,{workerPath:'/ocr/worker.min.js',corePath:'/ocr/core',langPath:'/ocr',workerBlobURL:false,cacheMethod:'write'}).then(async w=>{if(signal.aborted){await w.terminate();throw new DOMException('Cancelado','AbortError')}worker=w;return w});
    const w=await abortable(pending,signal);await w.setParameters({tessedit_pageseg_mode:PSM.SPARSE_TEXT,preserve_interword_spaces:'1'});return w;
  }
  async function recognize(source:CanvasImageSource,width:number,height:number,rotation:number,label:string){
    const w=await engine();let best={text:'',score:-1};
    const scale=Math.min(1.5,2400/Math.max(width,height));
    for(const extra of [0,270,90,180]){
      signal.throwIfAborted();progress(`${label} · ${extra?'Ajustando orientación':'Leyendo texto'}…`);
      const angle=(rotation+extra)%360;const swap=angle%180!==0;
      const canvas=document.createElement('canvas');canvas.width=Math.round((swap?height:width)*scale);canvas.height=Math.round((swap?width:height)*scale);
      const ctx=canvas.getContext('2d');if(!ctx)throw Error('No se pudo preparar la imagen.');
      ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(angle*Math.PI/180);ctx.drawImage(source,-width*scale/2,-height*scale/2,width*scale,height*scale);
      try {const {data}=await abortable(w.recognize(canvas,{rotateAuto:true}),signal);const score=billTextScore(data.text);if(score>best.score)best={text:data.text,score};if(score>=8&&data.confidence>=50)break}
      finally {canvas.width=0;canvas.height=0}
    }
    return best.text;
  }
  try {
    for(let i=0;i<files.length;i++){
      signal.throwIfAborted();const item=files[i];const label=`Documento ${i+1} de ${files.length}`;progress(`${label} · Abriendo…`);
      try {
        if(item.mime==='application/pdf'){
          const pdfjs=await import('pdfjs-dist');pdfjs.GlobalWorkerOptions.workerSrc=new URL('pdfjs-dist/build/pdf.worker.min.mjs',import.meta.url).toString();
          pdfTask=pdfjs.getDocument({data:await item.file.arrayBuffer(),useSystemFonts:true});
          const pdf=await abortable(pdfTask.promise,signal);
          if(pdf.numPages>6)warnings.push(`Documento ${i+1}: solo se revisaron las primeras 6 páginas.`);
          for(let pageNumber=1;pageNumber<=Math.min(6,pdf.numPages);pageNumber++){
            signal.throwIfAborted();const page=await pdf.getPage(pageNumber);const content=await page.getTextContent();
            const lines=new Map<number,{x:number;text:string}[]>();
            for(const piece of content.items)if('str' in piece){const y=Math.round(piece.transform[5]/3)*3;const row=lines.get(y)??[];row.push({x:piece.transform[4],text:piece.str});lines.set(y,row)}
            let text=[...lines.entries()].sort((a,b)=>b[0]-a[0]).map(([,items])=>items.sort((a,b)=>a.x-b.x).map(x=>x.text).join(' ')).join('\n');
            if(billTextScore(text)<4){const base=page.getViewport({scale:1});const viewport=page.getViewport({scale:Math.min(2.5,2400/Math.max(base.width,base.height))});const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);try{await abortable(page.render({canvas,viewport}).promise,signal);text=await recognize(canvas,canvas.width,canvas.height,item.rotation,`${label}, página ${pageNumber}`)}finally{canvas.width=0;canvas.height=0}}
            texts.push(text);page.cleanup();
          }
          await pdfTask.destroy();pdfTask=undefined;
        }else{
          const bitmap=await createImageBitmap(item.file);
          try{if(bitmap.width*bitmap.height>50000000)throw Error('Imagen demasiado grande.');texts.push(await recognize(bitmap,bitmap.width,bitmap.height,item.rotation,label))}finally{bitmap.close()}
        }
      }catch(error){if(signal.aborted)throw error;warnings.push(`No se pudo leer el documento ${i+1}. Prueba una foto nítida, sin reflejos, o un PDF sin contraseña.`);await pdfTask?.destroy();pdfTask=undefined}
    }
    signal.throwIfAborted();
    const result=extractBill(texts);result.warnings.unshift(...warnings);
    if(!texts.some(t=>billTextScore(t)>2))result.warnings.unshift('No se encontró texto suficiente. Repite la foto con la boleta completa, de frente y bien iluminada.');
    return result;
  }finally{signal.removeEventListener('abort',stop);stop()}
}
