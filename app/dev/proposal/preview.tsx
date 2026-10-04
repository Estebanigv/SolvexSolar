'use client';
import {useState} from 'react';
import {DiscountField} from '../../discount-field';
import {CommercialFields} from '../../commercial-panel';
import {Proposal} from '../../proposal';
import {calculate,initialSettings,newQuote,money,type Product,type QuoteInput} from '@/lib/quote';
import {InstallationPanel} from '../../installation-panel';
import {AdditionalServices} from '../../additional-services';
import {ProjectionPanel} from '../../projection-panel';
import {newProjection,type ProjectionInput} from '@/lib/projection';
import {quotePdf} from '@/lib/pdf';
const settings={...initialSettings,legal:'Solvex Solar SpA',validDays:10,taxMode:'included' as const,warranty:'Garantía del fabricante: 15 años para paneles fotovoltaicos y 5 años para inversores.\n1 año de garantía de instalación: cubre fallas técnicas y errores de montaje.',terms:'Precios con IVA incluidos. Vigencia de la oferta: 10 días. El alcance se acuerda tras la visita técnica.',paymentSchedule:[{label:'Anticipo',percent:20},{label:'Inicio de obras',percent:30},{label:'Entrega',percent:50}]};
export default function Preview(){
 const [issued,setIssued]=useState(false);
 const [wording,setWording]=useState<Partial<QuoteInput>>({});
 const [projection,setProjection]=useState<ProjectionInput>({...newProjection(),savingsMode:'manual',monthlySavings:100000,savingsSource:'Escenario sintético para revisión visual',avoidedKwh:6000,emissionFactor:0.4,emissionSource:'Factor sintético de prueba; no utilizar en propuestas reales'}),[manual,setManual]=useState<number|null>(null),[note,setNote]=useState(''),[serviceQty,setServiceQty]=useState(1);
 const rates=[{panels:8,price:631907.136,source:'Ejemplo de tabla'},{panels:10,price:718272.576,source:'Ejemplo de tabla'}];
 const [system,setSystem]=useState<QuoteInput['system']>('HIBRIDO'),[panels,setPanels]=useState(8),[mobile,setMobile]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const products:Product[]=[
  {id:'panel',system,name:'Panel fotovoltaico 585 W · Modelo de ejemplo',category:'PANEL FOTOVOLTAICO',watts:585,price:100000,unit:'panel',source:'Ejemplo'},
  {id:'inverter',system,name:system==='OFF GRID'?'Voltronic 6,2 kW':system==='ON GRID'?'Solis 5 kW':'RENAC 8 kW · 48 V',category:'INVERSOR',watts:null,price:1000000,unit:'unidad',source:'Ejemplo'},
  {id:'battery',system,name:'Batería de litio 9,6 kWh · 48 V · 200 Ah ROXON',category:'BATERÍA',watts:null,price:1000000,unit:'unidad',source:'Ejemplo'},
  {id:'roof',system,name:'Material de techo',category:'MATERIAL DE TECHO',watts:null,price:10000,unit:'unidad',source:'Ejemplo'},
  {id:'structure',system,name:'Estructura a piso',category:'TIPO DE ESTRUCTURA',watts:null,price:20000,unit:'unidad por confirmar',source:'Ejemplo'},
  {id:'service',system,name:'TE1 de ejemplo',category:'ADICIONALES',watts:null,price:100000,unit:'unidad',source:'Ejemplo'},
 ];
 const input={...newQuote(),...wording,projection,installationOverride:manual,installationNote:note,system,quantities:{panel:panels,inverter:1,battery:system==='ON GRID'?0:1,roof:1,structure:1,service:serviceQty},customer:{...newQuote().customer,name:'Cliente de ejemplo',email:'cliente@ejemplo.cl',phone:'+56 9 1234 5678',region:'Metropolitana de Santiago',commune:'Santiago'},notes:'Incluye los equipos indicados en esta propuesta. Sujeto a visita técnica.'};
 const calculation=calculate(input,products,settings,rates),q={id:'example',folio:issued?'SVX-2026-999999':'VISTA-DE-EJEMPLO',issuedAt:issued?'2026-10-02T15:00:00Z':undefined,date:'2026-10-02T15:00:00Z',input,settings,calculation};
 async function download(){setBusy(true);setError('');try{const get=(p:string)=>fetch(p).then(r=>r.arrayBuffer());const [logo,roof,home]=await Promise.all(['/proposal/logo-transparent-v2.png','/proposal/solar-roof.jpg','/proposal/solar-home.jpg'].map(get));const bytes=await quotePdf(q,logo,{roof,home}),url=URL.createObjectURL(new Blob([bytes as BlobPart],{type:'application/pdf'}));const a=document.createElement('a');a.href=url;a.download='propuesta-ejemplo.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch{setError('No se pudo generar el PDF de ejemplo.')}finally{setBusy(false)}}
 return <main style={{padding:24,maxWidth:1000,margin:'auto'}}><section className="card"><h1>Revisión local de la propuesta</h1><p>Datos y precios de prueba. No guarda cambios en la base de datos.</p><div className="field-grid"><label>Sistema<select value={system} onChange={e=>setSystem(e.target.value as QuoteInput['system'])}><option value="ON GRID">On Grid</option><option value="OFF GRID">Off Grid</option><option value="HIBRIDO">Híbrido</option></select></label><label>Paneles<input type="number" min={1} max={100} value={panels} onChange={e=>setPanels(Math.max(1,Number(e.target.value)))}/></label></div><p>Techo: {calculation.lines.find(l=>l.id==='roof')?.qty} paneles. Estructura: {calculation.lines.find(l=>l.id==='structure')?.qty} paneles. Instalación: total según tabla. Inversión: {money(calculation.total)}.</p><InstallationPanel quote={input} panels={panels} rates={rates} onChange={patch=>{if('installationOverride' in patch)setManual(patch.installationOverride??null);if('installationNote' in patch)setNote(patch.installationNote??'')}}/><AdditionalServices services={products.filter(p=>p.id==='service')} quote={input} onChange={patch=>setWording(v=>({...v,...patch}))} onQuantityChange={(_,n)=>setServiceQty(n)}/><DiscountField quote={input} onChange={patch=>setWording(v=>({...v,...patch}))}/><ProjectionPanel q={q} onChange={setProjection}/><CommercialFields quote={input} settings={settings} onChange={patch=>setWording(v=>({...v,...patch}))}/><button onClick={()=>setIssued(!issued)}>{issued?'Ver borrador de prueba':'Simular emisión (solo ejemplo)'}</button> <button onClick={()=>setMobile(!mobile)}>{mobile?'Ver ancho completo':'Ver ancho de celular'}</button> <button disabled={busy} onClick={download}>{busy?'Generando PDF…':'Descargar PDF de ejemplo'}</button>{error&&<p role="alert">{error}</p>}</section><div style={{maxWidth:mobile?390:900,margin:'24px auto'}}><Proposal q={q}/></div></main>;
}
