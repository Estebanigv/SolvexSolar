"use client";
import {useState} from 'react';
import {Check, AlertCircle} from 'lucide-react';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {billFields,billNumber,currentBillValues,applyBillValues,type BillExtraction,type BillValues,type BillField} from '@/lib/bill-extraction';
import type {QuoteInput} from '@/lib/quote';
import {findCommune,regionMatches} from '@/lib/chile-location';
import {CustomerLocationFields} from './customer-location';
import {billCodeSummary} from '@/lib/bill-code-summary';

export function BillReview({result,quote,onApply,disabled,onAddDocuments}:{result:BillExtraction;quote:QuoteInput;onApply:(patch:Partial<QuoteInput>)=>void;disabled:boolean;onAddDocuments?:()=>void}){
  const [values,setValues]=useState<BillValues>(result.values);
  const current=currentBillValues(quote);
  const [selected,setSelected]=useState<BillField[]>(()=>billFields.filter(f=>result.values[f.key]&&!current[f.key]).map(f=>f.key));
  const [error,setError]=useState('');
  const pendingKeys=billFields.filter(({key})=>{
    const detected=result.values[key]?.trim();if(!detected)return false;
    if(['bill','consumptionKwh','billingDays'].includes(key)&&current[key])return billNumber(detected)!==billNumber(current[key]!);
    return detected!==(current[key]??'').trim();
  }).map(field=>field.key);
  const locationPending=pendingKeys.some(key=>key==='region'||key==='commune');
  const applicable=selected.filter(key=>pendingKeys.includes(key)||(locationPending&&['region','commune'].includes(key)));
  function apply(){try{const entries=Object.fromEntries(applicable.map(key=>[key,values[key]??(['region','commune'].includes(key)?current[key]??'':'')]));const patch=applyBillValues(quote,entries);if(applicable.some(key=>key==='region'||key==='commune')){const customer=patch.customer??quote.customer;const place=findCommune(customer.commune);if(!place||!regionMatches(customer.region,place.region))throw Error('Selecciona una comuna de la región indicada y aplica ambos campos.');}onApply(patch);setSelected([]);setError('')}catch(e){setError((e as Error).message)}}
  if(!pendingKeys.length&&!result.warnings.length&&!result.codes?.length&&!result.period&&!(!result.values.consumptionKwh&&!current.consumptionKwh&&onAddDocuments))return null;
  return <div className="bill-review-panel">
    {!!pendingKeys.length&&<p className="bill-read-warnings">Hay {pendingKeys.length} {pendingKeys.length===1?'dato de la boleta diferente al formulario':'datos de la boleta diferentes al formulario'}. Se conservaron los valores ingresados. Abre “Revisar diferencias” si quieres reemplazarlos.</p>}
    {result.warnings.length>0&&<div className="bill-read-warnings">{result.warnings.map((warning,i)=><p key={i}><AlertCircle size={15}/>{warning}</p>)}</div>}
    {!result.values.consumptionKwh&&!current.consumptionKwh&&onAddDocuments&&<Button type="button" variant="outline" disabled={disabled} onClick={onAddDocuments}>Agregar página con el consumo (kWh)</Button>}
    {!!result.codes?.length&&<section className="bill-code-results" aria-label="Códigos detectados"><h4>Códigos leídos en la boleta</h4><p>Los códigos de pago pueden contener solo una referencia. No consultamos enlaces automáticamente ni deducimos el consumo desde estos números.</p>{result.codes.map((code,i)=>{const info=billCodeSummary(code.text);return <details key={i}><summary>Código {i+1} · {code.format.replaceAll('_',' ')}</summary>{info?<dl>{info.recipient&&<><dt>Receptor del documento</dt><dd>{info.recipient}</dd></>}{info.recipientRut&&<><dt>RUT receptor</dt><dd>{info.recipientRut}</dd></>}{info.folio&&<><dt>Folio</dt><dd>{info.folio}</dd></>}{info.documentAmount!==undefined&&<><dt>Monto del documento</dt><dd>{new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(info.documentAmount)} (puede diferir del total a pagar si hay deuda anterior)</dd></>}<p>Datos informativos del timbre; verifica el documento. La firma electrónica no se valida en esta lectura.</p></dl>:<p className="bill-code-content">{code.text.slice(0,500)}{code.text.length>500?'…':''}</p>}</details>})}</section>}
    {result.period&&<p className="bill-period"><strong>Período detectado:</strong> {result.period}</p>}
    {!!pendingKeys.length&&<details className="bill-adjustments"><summary>Revisar diferencias ({pendingKeys.length})</summary><div className="bill-detected-fields">{billFields.filter(field=>pendingKeys.includes(field.key)&&!['region','commune'].includes(field.key)).map(field=><div className="bill-detected-field" key={field.key}><label className="bill-field-check"><Checkbox aria-label={`Aplicar ${field.label.toLowerCase()}`} checked={selected.includes(field.key)} onCheckedChange={checked=>setSelected(keys=>checked?[...new Set([...keys,field.key])]:keys.filter(key=>key!==field.key))}/><span>{field.label}</span></label><Input aria-label={`Dato detectado: ${field.label}`} inputMode={['bill','billingDays','consumptionKwh'].includes(field.key)?'decimal':'text'} value={values[field.key]??''} placeholder="No detectado · puedes completarlo" onChange={e=>{setValues(v=>({...v,[field.key]:e.target.value}));setSelected(keys=>[...new Set([...keys,field.key])])}}/>{current[field.key]&&<small>Actual: {current[field.key]}</small>}{result.evidence[field.key]&&<details><summary>Ver texto de origen</summary><p>{result.evidence[field.key]}</p></details>}</div>)}{locationPending&&<section className="bill-location-review" aria-label="Ubicación detectada en la boleta"><div className="bill-location-checks">{(['region','commune'] as const).map(key=><label className="bill-field-check" key={key}><Checkbox aria-label={'Aplicar '+(key==='region'?'región':'comuna')} checked={selected.includes(key)} onCheckedChange={checked=>setSelected(keys=>checked?[...new Set([...keys,key])]:keys.filter(k=>k!==key))}/>{key==='region'?'Aplicar región':'Aplicar comuna'}</label>)}</div><div className="field-grid"><CustomerLocationFields region={values.region??current.region??''} commune={values.commune??current.commune??''} onChange={location=>{setValues(v=>({...v,...location}));setSelected(keys=>[...new Set([...keys,'region','commune'] as BillField[])])}}/></div>{(['region','commune'] as const).map(key=><div key={key}>{current[key]&&<small>{key==='region'?'Región actual':'Comuna actual'}: {current[key]}</small>}{result.evidence[key]&&<details><summary>Ver texto de origen de {key==='region'?'región':'comuna'}</summary><p>{result.evidence[key]}</p></details>}</div>)}</section>}</div>
    <p className="bill-contact-note">Correo y teléfono se cargan solo si están identificados como datos del cliente. Si no aparecen, complétalos manualmente. No se usan los contactos de atención o pago de la distribuidora.</p>
    {error&&<p className="field-error" role="alert">{error}</p>}
    <Button className="bill-apply" disabled={disabled||!applicable.length} onClick={apply}><Check/>Actualizar campos seleccionados</Button></details>}
  </div>;
}
