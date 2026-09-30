'use client';
import {useEffect,useRef,useState} from 'react';
import {BarChart3,ExternalLink,LoaderCircle} from 'lucide-react';
import {Button} from '@/components/ui/button';
import type {CneReference} from '@/lib/cne';
const months=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const number=(n:number)=>n.toLocaleString('es-CL',{maximumFractionDigits:1});
export function CneReferencePanel({commune='',region=''}:{commune?:string;region?:string}){
 // A verified historical period, explicitly labeled; never a substitute for a current bill.
 const [year,setYear]=useState(2022),[month,setMonth]=useState(12),[sector,setSector]=useState<'residential'|'non-residential'>('residential');
 const [result,setResult]=useState<{key:string;data:CneReference}|null>(null),[error,setError]=useState<{key:string;message:string}|null>(null),[loading,setLoading]=useState(false);
 const controller=useRef<AbortController|null>(null),key=JSON.stringify({commune,region,year,month,sector}),currentKey=useRef(key);currentKey.current=key;
 const current=result?.key===key?result.data:null;
 useEffect(()=>()=>controller.current?.abort(),[]);
 async function consult(){
  controller.current?.abort();const control=new AbortController();controller.current=control;setLoading(true);setError(null);setResult(null);
  try{const params=new URLSearchParams({commune,region,year:String(year),month:String(month),sector});const response=await fetch(`/api/energy/cne?${params}`,{signal:control.signal});const body=await response.json() as CneReference & {error?:string};if(!response.ok)throw Error(body.error||'No se pudo consultar CNE.');if(currentKey.current===key)setResult({key,data:body})}
  catch(e){if(!control.signal.aborted&&currentKey.current===key)setError({key,message:(e as Error).message})}
  finally{if(controller.current===control)setLoading(false)}
 }
 return <details className="cne-reference"><summary><BarChart3 size={19}/><span>Referencia de consumo por comuna<small>Datos históricos oficiales · CNE</small></span></summary><div className="cne-body">
  <p>Consulta el consumo agregado de clientes regulados en <strong>{commune||'la comuna del proyecto'}</strong>. Esta referencia no modifica los datos de la boleta ni el cálculo de tu cotización.</p>
  <div className="cne-filters"><label>Mes<select aria-label="Mes de referencia CNE" value={month} onChange={e=>setMonth(Number(e.target.value))}>{months.map((m,i)=><option key={m} value={i+1}>{m}</option>)}</select></label><label>Año<select aria-label="Año de referencia CNE" value={year} onChange={e=>setYear(Number(e.target.value))}>{Array.from({length:new Date().getFullYear()-2014},(_,i)=>new Date().getFullYear()-i).map(y=><option key={y}>{y}</option>)}</select></label><label>Tipo de cliente<select value={sector} onChange={e=>setSector(e.target.value as typeof sector)}><option value="residential">Residencial</option><option value="non-residential">No residencial</option></select></label></div>
  <p className="cne-period-note">El período inicial es diciembre de 2022, comprobado en la fuente. La disponibilidad varía por comuna y período.</p>
  <Button variant="outline" disabled={loading||!commune||!region} onClick={consult}>{loading?<LoaderCircle size={17} className="animate-spin"/>:<BarChart3 size={17}/>} {loading?'Consultando CNE…':'Consultar referencia CNE'}</Button>
  {(!commune||!region)&&<p className="cne-feedback">Selecciona primero la región y comuna del cliente.</p>}
  {error?.key===key&&<p className="energy-error" role="alert">{error.message}</p>}
  {result&&!current&&<p className="cne-feedback">La ubicación o el período cambió. Consulta nuevamente para actualizar la referencia.</p>}
  {current&&<div className="cne-result" aria-live="polite"><div className="cne-result-title"><strong>{current.commune} · {months[month-1]} de {year}</strong><span>Referencia histórica</span></div>{current.available?<>
   <div className="cne-metrics"><div><span>Promedio por cliente facturado</span><strong>{current.averageKwh===null?'No calculable':number(current.averageKwh)}{current.averageKwh!==null&&<small> kWh / mes</small>}</strong></div><div><span>Clientes facturados</span><strong>{number(current.clients)}</strong></div><div><span>Energía del conjunto</span><strong>{number(current.totalKwh)}<small> kWh</small></strong></div></div>
   <p>{sector==='residential'?'Clientes residenciales':'Clientes no residenciales'} · Tarifas incluidas: {current.tariffs.join(', ')}.</p><p>Promedio calculado como energía total dividida por clientes facturados. No representa el consumo individual, una tarifa en pesos ni una estimación de ahorro.</p>
  </>:<p>No hay registros para esta comuna, tipo de cliente y período. Esto no significa que su consumo sea cero. Prueba otro mes o año.</p>}<a href={current.source.url} target="_blank" rel="noreferrer">Fuente y metodología CNE <ExternalLink size={13}/></a></div>}
 </div></details>;
}
