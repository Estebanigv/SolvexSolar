"use client";
import {useEffect, useRef, useState} from 'react';
import {Upload, FileText, Eye, Trash2, CheckCircle2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription} from '@/components/ui/dialog';
import {validateBillFile} from '@/lib/bill-file';
import dynamic from 'next/dynamic';

const BillPdfPreview = dynamic(() => import('./bill-pdf-preview'), {ssr:false, loading:()=> <p role="status">Cargando visor de boletas…</p>});

type Attachment = {file: File; url: string; mime: string};

// Owned by the quote, so navigation between steps retains the document.
export function useBillAttachment(onDocumentChange: () => void) {
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);
  useEffect(() => () => {generation.current++}, []);
  useEffect(() => () => {if (attachment) URL.revokeObjectURL(attachment.url)}, [attachment]);
  async function select(file?: File) {
    if (!file) return;
    const id = ++generation.current;
    setLoading(true); setError('');
    try {
      const mime = await validateBillFile(file);
      if (id !== generation.current) return;
      setAttachment({file, mime, url: URL.createObjectURL(new Blob([file], {type: mime}))});
      onDocumentChange();
    } catch (e) {
      if (id === generation.current) setError((e as Error).message);
    } finally {
      if (id === generation.current) setLoading(false);
    }
  }
  function clear() {
    generation.current++; setAttachment(null); setLoading(false); setError(''); onDocumentChange();
  }
  return {attachment, error, loading, select, clear};
}

export function BillUpload({bill}: {bill: ReturnType<typeof useBillAttachment>}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(false);
  const {attachment, error, loading} = bill;
  return <section className="bill-upload" aria-labelledby="bill-upload-title">
    <div className="bill-upload-heading"><span className="bill-symbol"><FileText size={24}/></span><div><h3 id="bill-upload-title">Boleta de electricidad del cliente</h3><p>Adjunta el documento y registra su consumo en kWh.</p></div></div>
    <input ref={input} className="sr-only" tabIndex={-1} type="file" accept=".pdf,.jpg,.jpeg,.png" aria-label="Seleccionar boleta de electricidad" onChange={e => {void bill.select(e.target.files?.[0]); e.target.value = ''}}/>
    {attachment ? <div className="bill-selected"><CheckCircle2 size={20}/><div><strong>{attachment.file.name}</strong><span>{(attachment.file.size / 1024).toLocaleString('es-CL', {maximumFractionDigits: 0})} KB · Disponible en esta sesión</span></div><div className="bill-file-actions"><Button variant="outline" onClick={() => setPreview(true)}><Eye/>Ver boleta</Button><Button variant="ghost" aria-label="Quitar boleta" onClick={() => {setPreview(false); bill.clear()}}><Trash2/></Button></div></div> : <p className="bill-empty">PDF, JPG o PNG · Máximo 10 MB</p>}
    <Button className="bill-choose" disabled={loading} onClick={() => input.current?.click()}><Upload/>{loading ? 'Revisando archivo…' : attachment ? 'Cambiar boleta' : 'Adjuntar boleta'}</Button>
    {error && <p className="field-error" role="alert">{error}</p>}
    <p className="bill-local-note">El archivo permanece en este navegador hasta recargar. Los datos se ingresan manualmente; todavía no hay lectura automática ni guardado del documento.</p>
    <Dialog open={preview && !!attachment} onOpenChange={setPreview}><DialogContent className="bill-preview-dialog"><DialogHeader><DialogTitle>Boleta del cliente</DialogTitle><DialogDescription>{attachment?.file.name}</DialogDescription></DialogHeader>{attachment && (attachment.mime === 'application/pdf' ? <><BillPdfPreview key={attachment.url} file={attachment.file}/><a href={attachment.url} target="_blank" rel="noopener noreferrer">Abrir PDF original</a></> : <img src={attachment.url} alt="Boleta de electricidad adjunta"/>)}</DialogContent></Dialog>
  </section>;
}
