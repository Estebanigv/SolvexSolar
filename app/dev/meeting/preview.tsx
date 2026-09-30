"use client";
import {useMemo,useState} from 'react';
import {ManagementDashboard,type DashboardSource} from '../../management-dashboard';
import {UserGuide} from '../../user-guide';
import {CommercialFields} from '../../commercial-panel';
import {newQuote,initialSettings,initialProducts,calculate} from '@/lib/quote';
import {chileDate} from '@/lib/quote-history';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';
export default function Preview(){
 const [quote,setQuote]=useState(newQuote);
 const source=useMemo<DashboardSource>(()=>async()=>{const month=chileDate().slice(0,7);return {members:Array.from({length:4},()=>({role:'admin'})),quotes:Array.from({length:7},(_,i)=>{const input={...newQuote(),customer:{...newQuote().customer,name:'Cliente de ejemplo '+(i+1)}};return {id:'sample-'+i,folio:'DEMO-'+i,date:month+'-01T15:00:00Z',input,settings:initialSettings,owner:{id:String(i%4),name:['Carol','Daniel','Marcelo','Nidia'][i%4]},calculation:{...calculate(input,initialProducts,initialSettings),total:2500000+i*100000,complete:true},sentOn:i<5?month+'-02':null}})}},[]);
 return <main className="qh-preview"><div className="qh-preview-note">Vista local de funciones comerciales · datos de ejemplo, sin cambios en Supabase.</div><header><h1>Gestión comercial</h1></header><Tabs defaultValue="summary"><TabsList><TabsTrigger value="summary">Resumen</TabsTrigger><TabsTrigger value="credit">Crédito verde</TabsTrigger><TabsTrigger value="guide">Guía de uso</TabsTrigger></TabsList><TabsContent value="summary"><ManagementDashboard dataSource={source}/></TabsContent><TabsContent value="credit"><section className="card"><CommercialFields quote={quote} settings={initialSettings} onChange={patch=>setQuote(q=>({...q,...patch}))}/><div className="notice" role="status">Texto que aparecerá en el documento: {quote.financingNote||'Observación excluida'}</div></section></TabsContent><TabsContent value="guide"><UserGuide/></TabsContent></Tabs></main>
}
