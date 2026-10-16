'use client';
import type {QuoteInput} from '@/lib/quote';
import {LoaderCircle} from 'lucide-react';

export function CustomerBillReview({customer,checked,busy,progress,onChange,onEdit}:{
  customer:QuoteInput['customer'];checked:boolean;busy:boolean;progress?:string;onChange:(checked:boolean)=>void;onEdit:()=>void;
}){
  return <section className="customer-bill-review" data-reviewed={checked&&!busy} data-loading={busy} aria-labelledby="customer-bill-review-title">
    <div className="customer-bill-review-heading">{busy&&<LoaderCircle className="customer-read-spinner" size={20} aria-hidden="true"/>}<strong id="customer-bill-review-title">{busy?'Leyendo datos de la boleta…':checked?'Datos del cliente revisados':'Revisa el cliente leído de la boleta'}</strong></div>
    {busy?<p className="customer-read-progress" role="status" aria-live="polite">{progress||'Preparando lectura…'}</p>:<p>Revisa los campos del formulario antes de guardar. El consumo se valida por separado en Perfil energético.</p>}
    {busy&&<span className="customer-read-skeleton" aria-hidden="true"/>}
    {!busy&&<button type="button" onClick={onEdit}>Revisar o corregir datos del cliente</button>}
    <label className="customer-review-check"><input id="customer-bill-confirm" type="checkbox" checked={checked}
      disabled={busy||!customer.name.trim()} onChange={e=>onChange(e.target.checked)}/>
      <span>Revisé los datos del cliente y confirmé que corresponden a esta boleta.</span></label>
    {busy?<p>Al terminar verás los datos detectados y podrás revisar lo que falte.</p>:!checked&&<p role="status">{!customer.name.trim()?'Completa el nombre del cliente para confirmar la revisión.':'Pendiente de validación. Confirma la revisión para guardar el cliente o la cotización.'}</p>}
  </section>;
}
