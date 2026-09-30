"use client";
import {useState} from 'react';
import {ProjectLocation} from '../../project-location';
import {BillReview} from '../../bill-review';
import {newQuote,mergeQuotePatch} from '@/lib/quote';
import {newEnergyInput} from '@/lib/energy';
import type {BillExtraction} from '@/lib/bill-extraction';
const result:BillExtraction={values:{name:'Cliente de ejemplo',address:'Calle de ejemplo 100',commune:'Santiago',region:'Metropolitana de Santiago'},evidence:{commune:'Calle de ejemplo 100, Santiago'},warnings:[]};
export default function Preview(){const [quote,setQuote]=useState(()=>({...newQuote(),customer:{...newQuote().customer,name:'Cliente de ejemplo',address:'Calle de ejemplo 100',commune:'Santiago',region:'Metropolitana de Santiago'},energy:newEnergyInput()}));return <main className="qh-preview"><div className="qh-preview-note">Revisión local · dirección y resultados simulados. Esta vista no consulta servicios externos.</div><header><h1>Georreferencia del proyecto</h1></header><BillReview result={result} quote={quote} disabled={false} onApply={patch=>setQuote(q=>({...mergeQuotePatch(q,patch),energy:mergeQuotePatch(q,patch).energy??newEnergyInput()}))}/><ProjectLocation address={{address:quote.customer.address,commune:quote.customer.commune,region:quote.customer.region}} latitude={quote.energy.latitude} longitude={quote.energy.longitude} onChange={point=>setQuote(q=>({...q,energy:{...q.energy,...point}}))} lookup={async address=>[{latitude:-33.4489,longitude:-70.6693,label:address.address+', '+address.commune+' (ejemplo simulado)',approximate:true}]}/></main>}
