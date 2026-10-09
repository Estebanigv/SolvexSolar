'use client';

import {useId,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {money,roundCommercialTotal,type Calculation,type QuoteInput} from '@/lib/quote';
import './final-quote-total.css';

export function FinalQuoteTotal({quote,calculation,onChange}:{quote:QuoteInput;calculation:Calculation|null;onChange:(patch:Partial<QuoteInput>)=>void}){
 if(!calculation)return null;
 return <TotalEditor key={`${quote.finalTotalOverride}:${calculation.calculatedTotal}`} quote={quote} calculation={calculation} onChange={onChange}/>;
}

function TotalEditor({quote,calculation:c,onChange}:{quote:QuoteInput;calculation:Calculation;onChange:(patch:Partial<QuoteInput>)=>void}){
 const id=useId();
 const [amount,setAmount]=useState(String(c.total));
 const [attempted,setAttempted]=useState(false);
 const value=Number(amount);
 const valid=amount.trim()!==''&&Number.isFinite(value)&&value>=1&&value<=1e10;
 const pending=amount!==String(c.total);
 const apply=()=>{
  setAttempted(true);
  if(!valid)return;
  onChange({roundFinalTotal:true,finalTotalOverride:roundCommercialTotal(value)});
  setAmount(String(roundCommercialTotal(value)));
 };
 return <section data-validation-field="final-total" className="final-quote-total" aria-labelledby={`${id}-title`}>
  <div className="final-total-heading"><div><h3 id={`${id}-title`}>Total final de la cotización</h3><p>Define el importe que recibirá el cliente, en pesos chilenos.</p></div><strong aria-live="polite">{money(c.total)}</strong></div>
  <p>Según equipos, instalación y descuento: <b>{money(c.calculatedTotal??c.total)}</b>.</p>
  <div className="final-total-controls">
   <label htmlFor={`${id}-amount`}>Total a enviar (CLP{c.tax!==null?', IVA incluido':''})<Input id={`${id}-amount`} type="number" inputMode="decimal" min={1} max={1e10} step="10000" value={amount} onChange={e=>setAmount(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();apply();}}} aria-describedby={`${id}-help`} aria-invalid={attempted&&!valid||undefined}/></label>
   <Button type="button" onClick={()=>apply()}>Aplicar total</Button>
   <Button type="button" variant="outline" onClick={()=>apply()}>Redondear a $10.000</Button>
  </div>
  <p id={`${id}-help`}>El total se redondea al múltiplo de $10.000 más cercano; los últimos cuatro dígitos quedan en cero. Por ejemplo, $6.003.000 queda en $6.000.000. El mismo total se usa en la propuesta, el PDF y los pagos.</p>
  {attempted&&!valid&&<p role="alert" className="field-error">Ingresa un monto entre $1 y $10.000.000.000.</p>}
  {pending&&valid&&<p role="status">Tienes un valor pendiente de aplicar. El total vigente sigue siendo {money(c.total)}.</p>}
  {quote.finalTotalOverride!=null&&<div className="final-total-adjustment"><span>Ajuste de cierre: <b>{(c.totalAdjustment??0)>0?'+ ':''}{money(c.totalAdjustment??0)}</b>{c.tax!==null?' · IVA incluido':''}</span><Button type="button" variant="outline" onClick={()=>onChange({roundFinalTotal:true,finalTotalOverride:null})}>Restaurar cálculo</Button></div>}
  {quote.finalTotalOverride!=null&&<p>El total final queda fijo hasta que lo edites o restaures el cálculo. Revísalo si cambias los equipos o la instalación.</p>}
 </section>;
}
