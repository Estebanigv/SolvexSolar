import {combineBillCodes} from './bill-code-extraction';
import {billTextScore, extractBill, type BillExtraction} from './bill-extraction';
import type {Worker} from 'tesseract.js';
import type {PDFDocumentLoadingTask} from 'pdfjs-dist';
import {scanBillCodes,type BillCode} from './bill-barcode';
import {openBillImage} from './bill-image';
import {mergeBillDetailTexts,billDetailRegions,billOcrScore,needsBillDetailPass} from './bill-ocr';
export type BillDocument = {id:string;file:File;url:string;mime:string;rotation:number;codeOnly?:boolean};

function abortable<T>(promise:Promise<T>,signal:AbortSignal):Promise<T>{
  return new Promise((resolve,reject)=>{
    const abort=()=>reject(new DOMException('Lectura cancelada','AbortError'));
    if(signal.aborted){void promise.catch(()=>{});abort();return}
    signal.addEventListener('abort',abort,{once:true});
    promise.then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));
  });
}
export type BillReadCache=Map<string,{texts:string[];codes:BillCode[];warnings:string[]}>;
export async function readBills(files:BillDocument[],signal:AbortSignal,progress:(message:string)=>void,cache:BillReadCache=new Map()):Promise<BillExtraction>{
  let worker:Worker|undefined;let pdfTask:PDFDocumentLoadingTask|undefined;
  const texts:string[]=[];const warnings:string[]=[];const codes:BillCode[]=[];
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
    const w=await engine();let best={text:'',score:-1,angle:rotation};
    const scale=Math.min(1.5,2400/Math.max(width,height));
    for(const extra of [0,270,90,180]){
      signal.throwIfAborted();progress(`${label} · ${extra?'Ajustando orientación':'Leyendo texto'}…`);
      const angle=(rotation+extra)%360;const swap=angle%180!==0;
      const canvas=document.createElement('canvas');canvas.width=Math.round((swap?height:width)*scale);canvas.height=Math.round((swap?width:height)*scale);
      const ctx=canvas.getContext('2d');if(!ctx)throw Error('No se pudo preparar la imagen.');
      ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(angle*Math.PI/180);ctx.drawImage(source,-width*scale/2,-height*scale/2,width*scale,height*scale);
      try {const {data}=await abortable(w.recognize(canvas,{rotateAuto:true}),signal);const score=billOcrScore(data.text);if(score>best.score)best={text:data.text,score,angle};if((score>=100||billTextScore(data.text)>=8)&&data.confidence>=50)break}
      finally {canvas.width=0;canvas.height=0}
    }
    const details:string[]=[];
    if(needsBillDetailPass([best.text])){
      const swap=best.angle%180!==0,orientedWidth=swap?height:width,orientedHeight=swap?width:height;
      for(const [index,region] of billDetailRegions.entries()){
        signal.throwIfAborted();progress(`${label} · Ampliando sección ${index+1} de 4…`);
        const cropWidth=orientedWidth*region.width,cropHeight=orientedHeight*region.height;
        const detailScale=Math.min(3,1800/Math.max(cropWidth,cropHeight));
        const canvas=document.createElement('canvas');canvas.width=Math.round(cropWidth*detailScale);canvas.height=Math.round(cropHeight*detailScale);
        try{
          const ctx=canvas.getContext('2d');if(!ctx)throw Error('No se pudo preparar la sección.');
          ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);
          ctx.translate((orientedWidth/2-region.x*orientedWidth)*detailScale,(orientedHeight/2-region.y*orientedHeight)*detailScale);
          ctx.rotate(best.angle*Math.PI/180);
          ctx.drawImage(source,-width*detailScale/2,-height*detailScale/2,width*detailScale,height*detailScale);
          const {data}=await abortable(w.recognize(canvas,{rotateAuto:true}),signal);
          details.push(data.text);
        }finally{canvas.width=0;canvas.height=0}
      }
    }
    return mergeBillDetailTexts(best.text,details);
  }
  try {
    for(let i=0;i<files.length;i++){
      signal.throwIfAborted();const item=files[i];const label=`Documento ${i+1} de ${files.length}`;progress(`${label} · Abriendo…`);
      const cacheKey=`${item.id}:${item.rotation}:${!!item.codeOnly}`;const previous=cache.get(cacheKey);
      if(previous){texts.push(...previous.texts);codes.push(...previous.codes);warnings.push(...previous.warnings);continue}
      const textStart=texts.length,codeStart=codes.length,warningStart=warnings.length;
      try {
        if(item.mime==='application/pdf'){
          const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');pdfjs.GlobalWorkerOptions.workerSrc=new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs',import.meta.url).toString();
          pdfTask=pdfjs.getDocument({data:await item.file.arrayBuffer(),useSystemFonts:true});
          const pdf=await abortable(pdfTask.promise,signal);
          if(pdf.numPages>6)warnings.push(`Documento ${i+1}: solo se revisaron las primeras 6 páginas.`);
          for(let pageNumber=1;pageNumber<=Math.min(6,pdf.numPages);pageNumber++){
            signal.throwIfAborted();const page=await pdf.getPage(pageNumber);const content=await page.getTextContent();
            const lines=new Map<number,{x:number;text:string}[]>();
            for(const piece of content.items)if('str' in piece){const y=Math.round(piece.transform[5]/3)*3;const row=lines.get(y)??[];row.push({x:piece.transform[4],text:piece.str});lines.set(y,row)}
            const text=[...lines.entries()].sort((a,b)=>b[0]-a[0]).map(([,items])=>items.sort((a,b)=>a.x-b.x).map(x=>x.text).join(' ')).join('\n');
            let pageTexts=[text];
            {const needsOcr=billTextScore(text)<4;const base=page.getViewport({scale:1});const viewport=page.getViewport({scale:Math.min(2.5,2400/Math.max(base.width,base.height))});const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);try{await abortable(page.render({canvas,viewport}).promise,signal);progress(`${label}, página ${pageNumber} · Buscando códigos…`);const scan=await scanBillCodes(canvas,canvas.width,canvas.height,signal);codes.push(...scan.codes);if(scan.warning)warnings.push(`${label}: ${scan.warning}`);if(needsOcr)pageTexts=await recognize(canvas,canvas.width,canvas.height,item.rotation,`${label}, página ${pageNumber}`)}finally{canvas.width=0;canvas.height=0}}
            texts.push(...pageTexts);page.cleanup();
          }
          await pdfTask.destroy();pdfTask=undefined;
        }else{
          const bitmap=await openBillImage(item.file,signal);
          try{
            if(bitmap.width*bitmap.height>50000000)throw Error('Imagen demasiado grande.');
            progress(`${label} · Buscando códigos de barras o QR…`);
            const found=await scanBillCodes(bitmap.source,bitmap.width,bitmap.height,signal);codes.push(...found.codes);if(found.warning)warnings.push(`${label}: ${found.warning}`);
            if(!item.codeOnly)texts.push(...await recognize(bitmap.source,bitmap.width,bitmap.height,item.rotation,label));
            if(!found.codes.length&&!found.warning&&item.codeOnly)warnings.push(`Documento ${i+1}: no se pudo leer el código. Toma otra foto de cerca, con el timbre completo, enfocado y sin pliegues. Ampliar una foto borrosa no recupera sus datos.`);
          }finally{bitmap.close()}
        }
        if(warnings.length===warningStart)cache.set(cacheKey,{texts:texts.slice(textStart),codes:codes.slice(codeStart),warnings:[]});
      }catch(error){if(signal.aborted)throw error;warnings.push(`No se pudo leer el documento ${i+1}. Prueba una foto nítida, sin reflejos, o un PDF sin contraseña.`);await pdfTask?.destroy();pdfTask=undefined}
    }
    signal.throwIfAborted();
    const result=combineBillCodes(extractBill(texts),codes.filter((code,i)=>codes.findIndex(c=>c.text===code.text)===i));result.warnings.unshift(...warnings);
    if(!texts.some(t=>billTextScore(t)>2))result.warnings.unshift(codes.length?'Código leído. Adjunta también la boleta completa para obtener cliente, región, comuna y consumo.':'No se encontró texto suficiente. Repite la foto con la boleta completa, de frente y bien iluminada.');
    if(files.some(file=>file.mime!=='application/pdf'&&!file.codeOnly)&&needsBillDetailPass(texts))result.warnings.unshift('Lectura parcial de la imagen. Si es una captura de WhatsApp o del teléfono y el texto se ve pequeño o borroso, solicita el PDF original o fotos de cerca de los datos y del consumo. Ampliar no recupera detalles perdidos.');
    return result;
  }finally{signal.removeEventListener('abort',stop);stop()}
}
