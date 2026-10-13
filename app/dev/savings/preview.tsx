'use client';
import {useState} from 'react';
import {ProjectionPanel} from '../../projection-panel';
import {FinalQuoteTotal} from '../../final-quote-total';
import {newQuote,calculate,initialProducts,initialSettings,mergeQuotePatch} from '@/lib/quote';
import {newEnergyInput,solarGenerationContext} from '@/lib/energy';
export default function Preview(){
 const [input,setInput]=useState(()=>({...newQuote(),customer:{...newQuote().customer,bill:200000},energy:{...newEnergyInput(),consumptionKwh:1000,billingDays:30,latitude:-33.45,longitude:-70.66}}));
 const [hasKwh,setHasKwh]=useState(true);
 const settings={...initialSettings,taxMode:'included' as const},calculation=calculate(input,initialProducts,settings);
 const update=(patch:Parameters<typeof mergeQuotePatch>[1])=>setInput(previous=>mergeQuotePatch(previous,patch) as typeof input);
 const energy={...input.energy,consumptionKwh:hasKwh?1000:null,solarGeneration:{annualKwh:6000,monthly:Array.from({length:12},(_,i)=>({month:i+1,kwh:i<6?300:700})),context:solarGenerationContext(input.energy,calculation.kwp),retrievedAt:'2026-10-13T12:00:00Z',source:'PVGIS · datos simulados de prueba'}};
 return <main className="workspace" style={{maxWidth:1120,margin:'32px auto',padding:24}}><h1>Análisis del proyecto</h1><p>Prueba local · datos sintéticos. No guarda datos reales.</p><div className="field-grid"><label>Paneles de prueba<input type="number" aria-label="Paneles de prueba" min={1} value={input.quantities['0-10']} onChange={e=>update({quantities:{...input.quantities,'0-10':Number(e.target.value)}})}/></label><label>Boleta de prueba (CLP)<input aria-label="Boleta de prueba (CLP)" type="number" value={input.customer.bill} onChange={e=>update({customer:{...input.customer,bill:Number(e.target.value)}})}/></label><label><input type="checkbox" checked={hasKwh} onChange={e=>setHasKwh(e.target.checked)}/>Consumo legible en la boleta</label></div><FinalQuoteTotal quote={input} calculation={calculation} onChange={update}/><ProjectionPanel q={{id:'test',folio:'PRUEBA',date:'2026-10-13',input:{...input,energy},settings,calculation}} onChange={projection=>update({projection})}/></main>;
}
