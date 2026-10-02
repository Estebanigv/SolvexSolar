'use client';
import {useMemo,useState} from 'react';
import {QuoteHistory,type HistorySource} from '../../quote-history';
import {newQuote,initialSettings,initialProducts,calculate} from '@/lib/quote';
import {chileDate,calendarDate,historyActionSchema,type HistoryQuote} from '@/lib/quote-history';
import {Toaster,toast} from 'sonner';
function examples():HistoryQuote[]{
 const today=chileDate(),month=today.slice(0,7);
 return ['Proyecto Los Aromos','Familia del Valle','Taller El Roble','Comercial Horizonte','Casa Las Palmas','Parcela El Molino'].map((name,i)=>{
   const input={...newQuote(),customer:{...newQuote().customer,name},adviserId:['carol','daniel','marcelo','nidia'][i%4]};
   const settings={...initialSettings,advisers:[{id:'carol',name:'Carol Ibaceta',email:'carol@example.com',phone:''},{id:'daniel',name:'Daniel Bernal',email:'daniel@example.com',phone:''},{id:'marcelo',name:'Marcelo González',email:'marcelo@example.com',phone:''},{id:'nidia',name:'Nidia Alonso',email:'nidia@example.com',phone:''}]};
   return {id:'demo-'+i,folio:'SVX-DEMO-00'+(i+1),date:month+'-01T15:00:00Z',input,settings,owner:{id:'dev',name:'Dev'},calculation:{...calculate(input,initialProducts,settings),total:2300000+i*430000},sentOn:i<4?`${month}-${String(Math.min(Number(today.slice(-2)),7+i*3)).padStart(2,'0')}`:null,sentChannel:i%2?'email':'whatsapp',deletedAt:null};
 });
}
export default function HistoryPreview(){
 const [isAdmin,setIsAdmin]=useState(true);
 const dataSource=useMemo<HistorySource>(()=>{let records=examples();return {
   load:async({view,month,offset,basis})=>{const data=records.filter(q=>view==='trash'?!!q.deletedAt:!q.deletedAt&&(view!=='calendar'||calendarDate(q,basis??'created')?.startsWith(month)));return {quotes:data.slice(offset,offset+(view==='calendar'?2:100)),total:data.length};},
   update:async(id,body)=>{const action=historyActionSchema.parse(body);if(!isAdmin&&['trash','restore'].includes(action.action))throw Error('Solo administración');records=records.map(q=>q.id!==id?q:action.action==='trash'?{...q,deletedAt:new Date().toISOString()}:action.action==='restore'?{...q,deletedAt:null}:action.action==='send'?{...q,sentOn:action.sentOn,sentChannel:action.channel}:{...q,sentOn:null,sentChannel:null});},
 };},[isAdmin]);
 return <main className="workspace qh-preview"><Toaster/><div className="qh-preview-note"><strong>Revisión local · datos de ejemplo</strong><span>Los cambios de esta pantalla no se guardan en Supabase.</span><label><input type="checkbox" checked={isAdmin} onChange={e=>setIsAdmin(e.target.checked)}/> Vista de administrador</label></div><header><p>Solvex Solar / Gestión comercial</p><h1>Tus cotizaciones</h1></header><QuoteHistory key={String(isAdmin)} isAdmin={isAdmin} dataSource={dataSource} onPreview={q=>toast.info('Vista previa de ejemplo: '+q.folio)} onRevision={()=>toast.info('Acción de ejemplo: crear revisión')}/></main>;
}
