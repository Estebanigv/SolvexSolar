'use client';
import {useState} from 'react';
import {DocumentShare} from '../../document-share';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {calculate,initialProducts,initialSettings,type SavedQuote} from '@/lib/quote';
import {freshQuote} from '@/lib/new-quote';
const input=freshQuote(initialProducts);
input.customer={...input.customer,name:'Cliente de ejemplo',phone:'',email:'cliente@example.com'};
const quote:SavedQuote={id:'share-example',folio:'SVX-2026-999998',date:'2026-10-16T12:00:00Z',issuedAt:'2026-10-16T12:00:00Z',input,settings:initialSettings,calculation:calculate(input,initialProducts,initialSettings)};
export default function Preview(){
  const [preview,setPreview]=useState(false),[share,setShare]=useState(false);
  return <main className="workspace" style={{padding:32}}><h1>Compartir propuesta · revisión local</h1><p>Documento sintético. No guarda datos ni envía mensajes.</p><Button onClick={()=>setPreview(true)}>Ver propuesta de ejemplo</Button>
    {share&&<DocumentShare quote={quote} whatsapp onClose={()=>setShare(false)}/>}
    <Dialog open={preview&&!share} onOpenChange={setPreview}><DialogContent><DialogHeader><DialogTitle>Propuesta para el cliente</DialogTitle><DialogDescription>Propuesta de ejemplo para verificar el archivo adjunto.</DialogDescription></DialogHeader><Button onClick={()=>setShare(true)}>WhatsApp</Button></DialogContent></Dialog>
  </main>;
}
