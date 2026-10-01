'use client';
import {Input} from '@/components/ui/input';
import {money,type Product,type QuoteInput} from '@/lib/quote';
import './additional-services.css';

export function AdditionalServices({services,quote,onQuantityChange}:{services:Product[];quote:QuoteInput;onChange:(patch:Partial<QuoteInput>)=>void;onQuantityChange:(product:Product,qty:number)=>void}){
 return <div className="additional-services additional-services-internal">
  <div className="additional-services-help"><div><strong>Detalle interno de costos</strong><p>Estos servicios forman parte del precio final. El PDF del cliente presenta los paneles, inversor y baterías, sin este desglose.</p></div></div>
  <div className="additional-services-head" aria-hidden="true"><span>Servicio o material</span><span>Cantidad</span></div>
  {services.map(p=>{const qty=quote.quantities[p.id]??0;return <div className="additional-service" key={p.id}>
   <div className="additional-service-name"><strong>{p.name}</strong><p>{p.price===null?'Sin precio':money(p.price)} / {p.unit}</p></div>
   <label className="additional-service-quantity"><span>Cantidad</span><Input type="number" min={0} step={p.unit==='metro'?0.1:1} aria-label={'Cantidad '+p.name} value={qty} onChange={e=>onQuantityChange(p,Math.max(0,+e.target.value||0))}/></label>
  </div>})}
 </div>;
}
