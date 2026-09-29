"use client";
import {useState} from 'react';
import {Check, AlertCircle} from 'lucide-react';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {billFields,currentBillValues,applyBillValues,type BillExtraction,type BillValues,type BillField} from '@/lib/bill-extraction';
import type {QuoteInput} from '@/lib/quote';

export function BillReview({result,quote,onApply,disabled}:{result:BillExtraction;quote:QuoteInput;onApply:(patch:Partial<QuoteInput>)=>void;disabled:boolean}){
  const [values,setValues]=useState<BillValues>(result.values);
  const current=currentBillValues(quote);
  const [selected,setSelected]=useState<BillField[]>(()=>billFields.filter(f=>result.values[f.key]&&!current[f.key]).map(f=>f.key));
  const [error,setError]=useState(''),[applied,setApplied]=useState(false);
  function apply(){try{const entries=Object.fromEntries(selected.map(key=>[key,values[key]??'']));onApply(applyBillValues(quote,entries));setApplied(true);setError('')}catch(e){setError((e as Error).message)}}
  if(applied)return <div className="bill-applied" role="status"><Check size={20}/><div><strong>Datos cargados en la cotización</strong><p>Revisa los campos de abajo y confirma el consumo y los días en el perfil energético.</p></div></div>;
  return <div className="bill-review-panel"><h4>{result.autoApplied?.length?'Datos cargados automáticamente':'Revisa los datos detectados'}</h4><p>{result.autoApplied?.length?`Se completaron ${result.autoApplied.length} campos. El consumo diario y el equivalente mensual se calculan con los kWh y los días detectados. Confirma los datos con la boleta antes de emitir la propuesta.`:'No se encontraron datos nuevos que puedan cargarse sin revisión. Puedes completarlos abajo.'}</p>{!!result.preserved?.length&&<p className="bill-read-warnings">Se conservaron datos ya ingresados: {result.preserved.map(key=>billFields.find(f=>f.key===key)!.label.toLowerCase()).join(', ')}. Puedes seleccionar el valor de la boleta para reemplazarlos.</p>}
    {result.period&&<p className="bill-period"><strong>Período detectado:</strong> {result.period}</p>}
    {result.warnings.length>0&&<div className="bill-read-warnings">{result.warnings.map((warning,i)=><p key={i}><AlertCircle size={15}/>{warning}</p>)}</div>}
    <details className="bill-adjustments"><summary>Revisar o corregir los datos de la boleta</summary><div className="bill-detected-fields">{billFields.map(field=><div className="bill-detected-field" key={field.key}><label className="bill-field-check"><Checkbox aria-label={`Aplicar ${field.label.toLowerCase()}`} checked={selected.includes(field.key)} onCheckedChange={checked=>setSelected(keys=>checked?[...new Set([...keys,field.key])]:keys.filter(key=>key!==field.key))}/><span>{field.label}</span></label><Input aria-label={`Dato detectado: ${field.label}`} inputMode={['bill','billingDays','consumptionKwh'].includes(field.key)?'decimal':'text'} value={values[field.key]??''} placeholder="No detectado · puedes completarlo" onChange={e=>{setValues(v=>({...v,[field.key]:e.target.value}));setSelected(keys=>[...new Set([...keys,field.key])])}}/>{current[field.key]&&<small>Actual: {current[field.key]}</small>}{result.evidence[field.key]&&<details><summary>Ver texto de origen</summary><p>{result.evidence[field.key]}</p></details>}</div>)}</div>
    <p className="bill-contact-note">Correo y teléfono se cargan solo si están identificados como datos del cliente. Si no aparecen, complétalos manualmente. No se usan los contactos de atención o pago de la distribuidora.</p>
    {error&&<p className="field-error" role="alert">{error}</p>}
    <Button className="bill-apply" disabled={disabled||!selected.length} onClick={apply}><Check/>Actualizar campos seleccionados</Button></details>
  </div>;
}
