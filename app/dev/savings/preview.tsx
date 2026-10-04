'use client';
import {useState} from 'react';
import {ProjectionPanel} from '../../projection-panel';
import {newQuote,calculate,initialProducts,initialSettings} from '@/lib/quote';
import {newEnergyInput,solarGenerationContext} from '@/lib/energy';
import {newProjection} from '@/lib/projection';
export default function Preview(){
 const [projection,setProjection]=useState(newProjection),[bill,setBill]=useState(120000);
 const input={...newQuote(),projection,customer:{...newQuote().customer,bill},energy:{...newEnergyInput(),consumptionKwh:400,billingDays:30,latitude:-33.45,longitude:-70.66}},settings={...initialSettings,taxMode:'included' as const};
 const calculation=calculate(input,initialProducts,settings);
 const energy={...input.energy,solarGeneration:{annualKwh:6000,context:solarGenerationContext(input.energy,calculation.kwp),retrievedAt:'2026-10-03T12:00:00Z',source:'PVGIS · datos simulados de prueba'}};
 return <main style={{maxWidth:1120,margin:'32px auto',padding:24}}><h1>Análisis del proyecto</h1><p>Prueba local · 400 kWh en 30 días y generación simulada de 6.000 kWh/año. No guarda datos reales.</p><label>Boleta de prueba (CLP)<input aria-label="Boleta de prueba (CLP)" type="number" value={bill} onChange={e=>setBill(Number(e.target.value))}/></label><ProjectionPanel q={{id:'test',folio:'PRUEBA',date:'2026-10-03',input:{...input,energy},settings,calculation}} onChange={setProjection}/></main>
}
