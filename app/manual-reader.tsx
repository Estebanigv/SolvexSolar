"use client";
import {useEffect,useRef,useState} from 'react';
import type {PDFDocumentProxy,PDFDocumentLoadingTask,RenderTask} from 'pdfjs-dist';
import {ArrowLeft,ArrowRight,ExternalLink,LoaderCircle,ZoomIn,ZoomOut,RotateCcw} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {manualChapters,manualPages,manualUrl} from '@/lib/manual';

export default function ManualReader(){
 const canvas=useRef<HTMLCanvasElement>(null);
 const paper=useRef<HTMLDivElement>(null);
 const [pdf,setPdf]=useState<PDFDocumentProxy|null>(null);
 const [pageNumber,setPageNumber]=useState(1);
 const [zoom,setZoom]=useState(1);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [retry,setRetry]=useState(0);
 const [pageText,setPageText]=useState('');
 const title=manualPages.find(item=>item.page===pageNumber)?.title||'Manual visual';

 useEffect(()=>{
  let cancelled=false;
  let task:PDFDocumentLoadingTask|undefined;
  async function load(){
   try{
    const pdfjs=await import('pdfjs-dist');
    if(cancelled)return;
    pdfjs.GlobalWorkerOptions.workerSrc=new URL('pdfjs-dist/build/pdf.worker.min.mjs',import.meta.url).toString();
    task=pdfjs.getDocument({url:manualUrl,useSystemFonts:true});
    const document=await task.promise;
    if(!cancelled)setPdf(document);
   }catch{
    if(!cancelled){setLoading(false);setError('No se pudo abrir el manual. Reintenta o abre el PDF en otra pestaña.');}
   }
  }
  void load();
  return ()=>{cancelled=true;void task?.destroy();};
 },[retry]);

 useEffect(()=>{
  if(!pdf)return;
  let cancelled=false;
  let render:RenderTask|undefined;
  async function draw(){
   try{
    const page=await pdf!.getPage(pageNumber);
    if(cancelled||!canvas.current)return;
    const base=page.getViewport({scale:1});
    const viewport=page.getViewport({scale:Math.min(2.5,2200/Math.max(base.width,base.height))});
    const target=canvas.current;
    target.width=Math.ceil(viewport.width);target.height=Math.ceil(viewport.height);
    render=page.render({canvas:target,viewport});
    await render.promise;
    if(cancelled)return;
    setLoading(false);
    const content=await page.getTextContent();
    if(!cancelled)setPageText(content.items.map(item=>'str' in item?item.str:'').join(' '));
   }catch{
    if(!cancelled){setLoading(false);setError('No se pudo mostrar esta página. Selecciona otra página o abre el PDF original.');}
   }
  }
  void draw();
  return ()=>{cancelled=true;render?.cancel();};
 },[pdf,pageNumber]);

 function goToPage(page:number){
  if(!pdf||page<1||page>pdf.numPages||page===pageNumber)return;
  setLoading(true);setError('');setPageText('');
  setPageNumber(page);setZoom(1);
  if(paper.current){paper.current.scrollLeft=0;paper.current.scrollTop=0;}
 }
 return <div className="manual-reader">
  <aside className="manual-index" aria-label="Índice del manual">
   <h3>En esta guía</h3>
   {manualChapters.map(chapter=><div className="manual-chapter" key={chapter.title}>
    <h4>{chapter.title}</h4>
    {chapter.pages.map(item=><button type="button" key={item.page} disabled={!pdf||item.page>pdf.numPages} aria-current={pageNumber===item.page?'page':undefined} onClick={()=>goToPage(item.page)}><span>{item.title}</span><small>{String(item.page).padStart(2,'0')}</small></button>)}
   </div>)}
  </aside>
  <section className="manual-document" aria-label="Lector del manual visual">
   <div className="manual-controls">
    <label className="manual-page-select"><span>Ir a una página</span><select value={pageNumber} disabled={!pdf} onChange={event=>goToPage(Number(event.target.value))}>{manualPages.map(item=><option key={item.page} value={item.page}>{item.page}. {item.title}</option>)}</select></label>
    <div className="manual-zoom" aria-label="Ampliación del documento">
     <Button size="icon" variant="ghost" aria-label="Reducir página" disabled={zoom<=1||!pdf} onClick={()=>setZoom(value=>Math.max(1,value-.25))}><ZoomOut size={18}/></Button>
     <Button variant="ghost" aria-label="Ajustar página al ancho" onClick={()=>setZoom(1)}>{zoom===1?'Ajustar':`${Math.round(zoom*100)}%`}</Button>
     <Button size="icon" variant="ghost" aria-label="Ampliar página" disabled={zoom>=2.5||!pdf} onClick={()=>setZoom(value=>Math.min(2.5,value+.25))}><ZoomIn size={18}/></Button>
    </div>
   </div>
   <div ref={paper} className="manual-paper-scroll" tabIndex={0} role="region" aria-label="Página del manual; puedes desplazarla al ampliar">
    {loading&&<div className="manual-loading" role="status"><LoaderCircle className="animate-spin" size={23}/><span>Preparando la página…</span></div>}
    {error&&<div className="manual-error" role="alert"><p>{error}</p><Button variant="outline" onClick={()=>{setLoading(true);setError('');setPdf(null);setPageText('');setRetry(value=>value+1);}}><RotateCcw size={16}/>Reintentar</Button><a href={manualUrl} target="_blank" rel="noopener noreferrer">Abrir PDF<ExternalLink size={16}/></a></div>}
    <div className="manual-paper" style={{width:`${zoom*100}%`}} aria-busy={loading} hidden={!!error}>
     <canvas ref={canvas} style={{visibility:loading?'hidden':'visible'}} role="img" aria-label={`Página ${pageNumber}: ${title}`}/>
    </div>
   </div>
   {pageText&&<p className="sr-only">{pageText}</p>}
   <div className="manual-pagination">
    <Button variant="outline" disabled={!pdf||pageNumber<=1} onClick={()=>goToPage(pageNumber-1)} aria-label="Página anterior del manual"><ArrowLeft size={18}/><span>Anterior</span></Button>
    <p aria-live="polite"><strong>{pageNumber} / {pdf?.numPages??manualPages.length}</strong><span>{title}</span></p>
    <Button variant="outline" disabled={!pdf||pageNumber>=pdf.numPages} onClick={()=>goToPage(pageNumber+1)} aria-label="Página siguiente del manual"><span>Siguiente</span><ArrowRight size={18}/></Button>
   </div>
  </section>
 </div>;
}
