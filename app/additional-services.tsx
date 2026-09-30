'use client';
import {Checkbox} from '@/components/ui/checkbox';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {money,type Product,type QuoteInput} from '@/lib/quote';
import './additional-services.css';

export function AdditionalServices({services,quote,onChange,onQuantityChange}:{services:Product[];quote:QuoteInput;onChange:(patch:Partial<QuoteInput>)=>void;onQuantityChange:(product:Product,qty:number)=>void}){
 const hidden=new Set(quote.hiddenLineIds??[]);
 const detailEnabled=quote.showItemDetails!==false;
 const selected=services.filter(p=>(quote.quantities[p.id]??0)>0);
 const visible=detailEnabled?selected.filter(p=>!hidden.has(p.id)).length:0;
 return <div className="additional-services">
  <div className="additional-services-help"><div><strong>Elige qué verá el cliente</strong><p>Marca los adicionales que quieres mostrar en el detalle. Los que ocultes siguen incluidos en el precio total.</p></div><span>{visible} de {selected.length} visibles</span></div>
  {!detailEnabled&&<div className="additional-services-notice"><p>El desglose completo está desactivado en Revisión y envío. Actívalo para mostrar los ítems que marques aquí.</p><Button variant="outline" type="button" onClick={()=>onChange({showItemDetails:true})}>Activar detalle</Button></div>}
  <div className="additional-services-head" aria-hidden="true"><span>Servicio o material</span><span>Cantidad</span><span>En detalle del cliente</span></div>
  {services.map(p=>{const qty=quote.quantities[p.id]??0;return <div className="additional-service" key={p.id}>
   <div className="additional-service-name"><strong>{p.name}</strong><p>{p.price===null?'Sin precio':money(p.price)} / {p.unit}</p></div>
   <label className="additional-service-quantity"><span>Cantidad</span><Input type="number" min={0} step={p.unit==='metro'?0.1:1} aria-label={'Cantidad '+p.name} value={qty} onChange={e=>onQuantityChange(p,Math.max(0,+e.target.value||0))}/></label>
   <label className="additional-service-visibility"><Checkbox aria-label={'Mostrar en cotización: '+p.name} disabled={!detailEnabled||qty<=0} checked={detailEnabled&&qty>0&&!hidden.has(p.id)} onCheckedChange={checked=>onChange({hiddenLineIds:checked===true?[...hidden].filter(id=>id!==p.id):[...new Set([...hidden,p.id])]})}/><span>{qty<=0?'Sin cantidad':!detailEnabled?'Detalle desactivado':hidden.has(p.id)?'Oculto al cliente':'Mostrar al cliente'}</span></label>
  </div>})}
 </div>;
}
