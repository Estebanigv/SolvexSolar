'use client';
import type {QuoteInput} from '@/lib/quote';
import {money} from '@/lib/quote';

export function CustomerBillReview({customer,checked,busy,onChange,onEdit}:{
  customer:QuoteInput['customer'];checked:boolean;busy:boolean;onChange:(checked:boolean)=>void;onEdit:()=>void;
}){
  return <section className="customer-bill-review" data-reviewed={checked} aria-labelledby="customer-bill-review-title">
    <strong id="customer-bill-review-title">{checked?'Datos del cliente revisados':'Revisa el cliente leído de la boleta'}</strong>
    <p>Comprueba estos datos y corrige lo que falte en “Datos del cliente” antes de guardar. El consumo se valida por separado en Perfil energético.</p>
    <dl>{([
      ['Nombre',customer.name],['Dirección',customer.address],['Comuna',customer.commune],['Región',customer.region],
      ['Correo',customer.email],['Teléfono',customer.phone],['Monto de la boleta',customer.bill?money(customer.bill):''],
    ] as const).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value||'Por completar'}</dd></div>)}</dl>
    <button type="button" onClick={onEdit}>Revisar o corregir datos del cliente</button>
    <label className="customer-review-check"><input id="customer-bill-confirm" type="checkbox" checked={checked}
      disabled={busy||!customer.name.trim()} onChange={e=>onChange(e.target.checked)}/>
      <span>Revisé los datos del cliente y confirmé que corresponden a esta boleta.</span></label>
    {!checked&&<p role="status">{busy?'Espera a que termine la lectura de la boleta.':!customer.name.trim()?'Completa el nombre del cliente para confirmar la revisión.':'Pendiente de validación. Confirma la revisión para guardar el cliente o la cotización.'}</p>}
  </section>;
}
