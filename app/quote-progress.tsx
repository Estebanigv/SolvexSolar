'use client';
import {FileText,ArrowLeft} from 'lucide-react';
import {Button} from '@/components/ui/button';

export function QuoteProgressNotice({customer,system,stage,folio,status,error,recovery=false,onResume}:{customer:string;system:string;stage:string;folio?:string;status?:string;error?:string;recovery?:boolean;onResume:()=>void}){
 return <section className="quote-progress-notice" aria-label="Cotización en curso">
  <FileText size={24} aria-hidden="true"/>
  <div className="quote-progress-copy"><strong>{recovery?'Cotización pendiente de recuperar':'Cotización en curso'}</strong><p>{customer.trim()||'Cliente por completar'} · {system} · {stage}</p><p className="quote-progress-storage" role="status">{recovery?'Hay un borrador de este dispositivo disponible en el cotizador.':folio?`Versión guardada en historial: ${folio}.`:'Los datos se conservan mientras navegas. Aún no guardada en el historial.'}{!recovery&&status&&` ${status}.`}</p>{error&&<p className="quote-progress-error" role="alert">{error}</p>}</div>
  <Button type="button" onClick={onResume}><ArrowLeft size={17} aria-hidden="true"/>{recovery?'Ver borrador pendiente':'Retomar cotización'}</Button>
 </section>;
}
