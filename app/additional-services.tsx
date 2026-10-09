'use client';
import {useRef,useState} from 'react';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Plus,Trash2} from 'lucide-react';
import {money,type Product,type QuoteInput} from '@/lib/quote';
import {requiredMaterial,isLinearService,serviceQuantity,certificationType,hasCertificationConflict,certificationConflictMessage,type CustomService} from '@/lib/additional-services';
import './additional-services.css';

export function AdditionalServices({services,quote,onChange,onQuantityChange,priceLabel='Precio unitario (CLP)'}:{services:Product[];quote:QuoteInput;onChange:(patch:Partial<QuoteInput>)=>void;onQuantityChange:(product:Product,qty:number)=>void;priceLabel?:string}){
 const previous=useRef<Record<string,number>>({});
 const [notice,setNotice]=useState('');
 const custom=quote.customServices??[];
 const conflict=hasCertificationConflict([...services.filter(p=>(quote.quantities[p.id]??0)>0),...custom.filter(s=>s.quantity>0).map(s=>({name:s.name,category:'ADICIONALES'}))]);
 function quantity(product:Product,value:number){
  const kind=certificationType(product);
  const removed=value>0&&kind?services.filter(p=>(quote.quantities[p.id]??0)>0&&certificationType(p)&&certificationType(p)!==kind):[];
  onQuantityChange(product,value);
  setNotice(removed.length?`${kind} seleccionado. Se retiró ${removed.map(p=>p.name).join(', ')} del total.`:'');
 }
 const edit=(id:string,patch:Partial<CustomService>)=>onChange({customServices:custom.map(s=>s.id===id?{...s,...patch}:s)});
 return <div className="additional-services additional-services-internal">
  <div className="additional-services-help"><div><strong>Detalle interno de costos</strong><p>Estos servicios forman parte del precio final. El PDF del cliente presenta los paneles, inversor y baterías, sin este desglose.</p></div></div>
  {services.some(p=>certificationType(p))&&<p className="certification-rule">TE1 y TE4 son alternativas: al incluir uno, se desmarca el otro y se actualiza el total.</p>}
  {conflict&&<p className="energy-error" role="alert">{certificationConflictMessage} Selecciona el que corresponde para continuar.</p>}
  <p className="service-selection-notice" role="status">{notice}</p>
  <div className="additional-services-head" aria-hidden="true"><span>Servicio o material</span><span>Cantidad</span></div>
  {services.map(p=>{const required=requiredMaterial(p),linear=isLinearService(p),qty=serviceQuantity(p,quote.quantities[p.id]??0);return <div className="additional-service" key={p.id}>
   <div className="additional-service-name"><label className="service-include"><input type="checkbox" checked={qty>0} disabled={required} aria-label={'Incluir '+p.name} onChange={e=>{if(!e.target.checked)previous.current[p.id]=qty;quantity(p,e.target.checked?(previous.current[p.id]||(linear?15:1)):0)}}/><strong>{p.name}</strong></label><p>{p.price===null?'Sin precio':money(p.price)} / {p.unit} · {required?'Obligatorio · incluido en el total':qty>0?'Incluido en el total':'Sin cobro'}</p>{linear&&<small>Desde 15 metros, en incrementos de 1 metro.</small>}</div>
   <label className="additional-service-quantity"><span>Cantidad</span><Input type="number" min={required?1:linear&&qty>0?15:0} step={linear?1:p.unit==='metro'?0.1:1} aria-label={'Cantidad '+p.name} value={qty} onChange={e=>quantity(p,Math.max(0,+e.target.value||0))}/></label>
  </div>})}
  <section className="custom-services" aria-label="Otros servicios adicionales">
   <div className="custom-services-heading"><div><h4>Otros servicios adicionales</h4><p>Agrega servicios o materiales que falten para este proyecto.</p></div><Button variant="outline" disabled={custom.length>=50} onClick={()=>onChange({customServices:[...custom,{id:crypto.randomUUID(),name:'',quantity:1,price:null}]})}><Plus size={18}/>Agregar servicio</Button></div>
   {custom.map((service,index)=><fieldset className="custom-service" key={service.id}><legend>Servicio adicional {index+1}</legend><div className="custom-service-fields">
    <label>Descripción<Input aria-label={`Descripción del servicio adicional ${index+1}`} maxLength={180} value={service.name} placeholder="Ej. Retiro de escombros" onChange={e=>edit(service.id,{name:e.target.value})}/></label>
    <label>Cantidad<Input aria-label={`Cantidad del servicio adicional ${index+1}`} type="number" min={0} max={100000} step="any" value={service.quantity} onChange={e=>edit(service.id,{quantity:Math.min(100000,Math.max(0,Number(e.target.value)||0))})}/></label>
    <label>{priceLabel}<Input aria-label={`Precio del servicio adicional ${index+1}`} type="number" min={0} max={1e10} value={service.price??''} placeholder="Ingresa el precio" onChange={e=>edit(service.id,{price:e.target.value===''?null:Math.min(1e10,Math.max(0,Number(e.target.value)||0))})}/></label>
    <div className="custom-service-total"><span>Importe</span><strong>{service.quantity===0?'Sin cobro':service.price===null?'Por completar':money(Math.round(service.quantity*service.price))}</strong></div>
    <Button variant="ghost" aria-label={`Eliminar servicio adicional ${index+1}`} onClick={()=>onChange({customServices:custom.filter(s=>s.id!==service.id)})}><Trash2 size={18}/><span>Eliminar</span></Button>
   </div></fieldset>)}
  </section>
 </div>;
}
