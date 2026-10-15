'use client';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {paymentScheduleSchema,paymentSchedulePreset} from '@/lib/commercial';
import type {QuoteInput,Settings} from '@/lib/quote';
import './payment-schedule-editor.css';

export function PaymentScheduleEditor({quote,settings,onChange}:{quote:QuoteInput;settings:Settings;onChange:(patch:Partial<QuoteInput>)=>void}){
 const current=quote.documentPaymentSchedule??settings.paymentSchedule??[];
 const [editing,setEditing]=useState(false),[rows,setRows]=useState(current),[error,setError]=useState('');
 const sum=rows.reduce((n,row)=>n+row.percent,0);
 const change=(index:number,patch:Partial<typeof rows[number]>)=>{setRows(rows.map((row,i)=>i===index?{...row,...patch}:row));setError('');};
 function apply(){
  const parsed=paymentScheduleSchema.safeParse(rows.map(row=>({...row,label:row.label.trim()})));
  if(!parsed.success||!rows.length||rows.some(row=>!row.label.trim())){setError('Completa el nombre de cada etapa y distribuye el 100% en porcentajes enteros.');return;}
  onChange({documentPaymentSchedule:parsed.data});setEditing(false);setError('');
 }
 return <section className="payment-schedule-editor" aria-label="Hitos de pago de esta cotización">
  <div className="payment-schedule-heading"><div><h3>Hitos de pago</h3><p>{current.length?current.map(row=>`${row.label}: ${row.percent}%`).join(' · '):'Define cómo se pagará esta cotización.'}</p></div>{!editing&&<Button type="button" variant="outline" onClick={()=>{setRows(current.map(row=>({...row})));setError('');setEditing(true);}}>Personalizar pagos</Button>}</div>
  <div className="payment-schedule-actions payment-schedule-presets" aria-label="Elegir distribución de pagos">{([2,3] as const).map(count=><Button key={count} type="button" variant="outline" onClick={()=>{setRows(paymentSchedulePreset(count));setError('');setEditing(true);}}>{count===2?'2 hitos · 50% / 50%':'3 hitos · 20% / 30% / 50%'}</Button>)}</div>
  {editing&&<div className="payment-schedule-fields">
   <p>Elige dos o tres hitos y revisa sus porcentajes. Los cambios se incorporan al aplicar; la cotización conserva sus importes mientras editas.</p>
   {rows.map((row,i)=><div className="payment-schedule-row" key={i}><label>Etapa {i+1}<Input aria-label={`Nombre de etapa ${i+1}`} value={row.label} maxLength={80} onChange={e=>change(i,{label:e.target.value})}/></label><label>Porcentaje (%)<Input aria-label={`Porcentaje de etapa ${i+1}`} type="number" min={0} max={100} step={1} value={row.percent} onFocus={e=>e.currentTarget.select()} onChange={e=>change(i,{percent:Number(e.target.value)})}/></label></div>)}
   <div className="payment-schedule-actions"><span role="status" className={sum===100?'':'field-error'}>Asignado: {sum}% de 100%</span></div>
   {error&&<p className="field-error" role="alert">{error}</p>}
   {quote.documentTerms!==undefined&&<p className="help-text">Revisa que las condiciones personalizadas coincidan con estos pagos. Puedes registrar excepciones en Alcance y comentarios.</p>}
   <div className="payment-schedule-actions"><Button type="button" onClick={apply}>Aplicar pagos</Button><Button type="button" variant="ghost" onClick={()=>{setEditing(false);setError('');}}>Cancelar</Button></div>
  </div>}
  {!editing&&quote.documentPaymentSchedule!==undefined&&<Button type="button" variant="ghost" onClick={()=>onChange({documentPaymentSchedule:undefined})}>Usar pagos de Empresa</Button>}
 </section>;
}
