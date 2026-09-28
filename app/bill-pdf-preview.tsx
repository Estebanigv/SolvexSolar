"use client";
import {useEffect, useRef, useState} from 'react';
import type {PDFDocumentProxy, PDFDocumentLoadingTask, RenderTask} from 'pdfjs-dist';
import {ArrowLeft, ArrowRight, LoaderCircle} from 'lucide-react';
import {Button} from '@/components/ui/button';

export default function BillPdfPreview({file}: {file: File}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let task: PDFDocumentLoadingTask | undefined;
    async function load() {
      try {
        const pdfjs = await import('pdfjs-dist');
        if (cancelled) return;
        pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
        const data = await file.arrayBuffer();
        if (cancelled) return;
        task = pdfjs.getDocument({data, useSystemFonts:true});
        const pdf = await task.promise;
        if (!cancelled) setDocument(pdf);
      } catch {
        if (!cancelled) {setError('No se pudo mostrar este PDF. Si tiene contraseña, adjunta una copia sin protección o una imagen de la boleta.'); setLoading(false)}
      }
    }
    void load();
    return () => {cancelled = true; void task?.destroy()};
  }, [file]);

  useEffect(() => {
    if (!document) return;
    let cancelled = false;
    let render: RenderTask | undefined;
    setLoading(true); setError('');
    async function draw() {
      try {
        const page = await document!.getPage(pageNumber);
        if (cancelled || !canvas.current) return;
        const base = page.getViewport({scale:1});
        // Bound the canvas allocation even for unusually large PDF page dimensions.
        const scale = Math.min(2, 1800 / Math.max(base.width, base.height));
        const viewport = page.getViewport({scale});
        const target = canvas.current;
        target.width = Math.ceil(viewport.width); target.height = Math.ceil(viewport.height);
        render = page.render({canvas:target, viewport});
        await render.promise;
        if (!cancelled) setLoading(false);
      } catch {
        if (!cancelled) {setError('Esta página no se pudo visualizar. Prueba otra página o abre el archivo original.'); setLoading(false)}
      }
    }
    void draw();
    return () => {cancelled = true; render?.cancel()};
  }, [document, pageNumber]);

  return <div className="bill-pdf-preview">
    {loading && <p className="pdf-loading" role="status"><LoaderCircle className="animate-spin" size={18}/>Preparando vista previa…</p>}
    {error && <p className="field-error" role="alert">{error}</p>}
    <div className="pdf-paper" hidden={!!error}><canvas ref={canvas} role="img" aria-label={`Boleta de electricidad, página ${pageNumber}`}/></div>
    {document && <div className="pdf-pagination"><Button variant="outline" aria-label="Página anterior de la boleta" disabled={loading || pageNumber<=1} onClick={()=>setPageNumber(p=>p-1)}><ArrowLeft/></Button><span aria-live="polite">Página {pageNumber} de {document.numPages}</span><Button variant="outline" aria-label="Página siguiente de la boleta" disabled={loading || pageNumber>=document.numPages} onClick={()=>setPageNumber(p=>p+1)}><ArrowRight/></Button></div>}
  </div>;
}
