'use client';
import {Input} from '@/components/ui/input';
import {money,type QuoteInput} from '@/lib/quote';
import './discount-field.css';

export function DiscountField({quote,onChange}:{quote:QuoteInput;onChange:(patch:Partial<QuoteInput>)=>void}){
 const active=(quote.discountPercent??0)>0;
 return <div className="discount-field">
  <label>Descuento (%)<Input aria-label="Descuento (%)" type="number" min={0} max={30} step={1} value={quote.discountPercent??''} onChange={e=>onChange({discountPercent:Math.min(30,Math.max(0,Math.floor(Number(e.target.value)||0))),discount:0})}/><small>Porcentaje entero entre 0 y 30. {quote.discountPercent===undefined&&quote.discount>0?`Descuento anterior: ${money(quote.discount)}. Selecciona un porcentaje para actualizarlo.`:'Se aplica una sola vez sobre el subtotal.'}</small></label>
  <label className="discount-visibility"><input type="checkbox" checked={quote.showDiscount===true} disabled={!active} onChange={e=>onChange({showDiscount:e.target.checked})}/><span><strong>Destacar descuento en la propuesta del cliente</strong><small>{!active?'Ingresa un descuento para activar esta opción.':quote.showDiscount?'Se mostrarán el porcentaje, el monto descontado y el precio anterior en la vista previa y el PDF.':'El cliente verá solo el precio final con el descuento aplicado.'}</small></span></label>
 </div>;
}
