'use client';
import {useMemo,useState} from 'react';
import {useQuoteDraft,DraftStatus} from '../../quote-draft';
import {initialProducts} from '@/lib/quote';
import {freshQuote} from '@/lib/new-quote';
import {readRecovery,saveDraft,clearDraft} from '@/lib/local-recovery';
export default function Preview(){
 const blank=()=>({input:freshQuote(initialProducts),clientId:null,sourceQuoteId:null,step:'customer',files:[] as File[]});
 const [value,setValue]=useState(blank),[result,setResult]=useState('');
 const draft=useQuoteDraft('qa-new-quote-isolated',useMemo(()=>value,[value]),async d=>{setValue({...d,clientId:null,sourceQuoteId:null})},!!value.input.customer.name||value.files.length>0);
 async function reset(){const next=blank();try{await draft.reset(next);setValue(next);setResult('PASS: formulario y archivos limpiados')}catch(e){setResult('ERROR: '+(e as Error).message)}}
 async function verify(){const stored=await readRecovery('draft:qa-new-quote-isolated');setResult(!stored?'PASS: no queda borrador anterior':'ERROR: borrador aún almacenado')}
 async function conflict(){const key='qa-reset-conflict';const record=await readRecovery<{version:string}>(key);const first=await saveDraft(key,{name:'Original'},record?.version??null);const second=await saveDraft(key,{name:'Otro editor'},first);let rejected=false;try{await clearDraft(key,first)}catch{rejected=true}const after=await readRecovery<{version:string}>(key);if(rejected&&after?.version===second){await clearDraft(key,second);setResult('PASS: el reinicio no borra cambios de otra pestaña')}else setResult('ERROR: protección de conflicto')}
 return <main style={{padding:32,maxWidth:700}}><h1>Reinicio de cotizaciones · prueba local</h1><DraftStatus draft={draft}/><label>Nombre de prueba<input value={value.input.customer.name} onChange={e=>setValue(v=>({...v,input:{...v.input,customer:{...v.input.customer,name:e.target.value}}}))}/></label><p>Archivos: {value.files.length}</p><button onClick={()=>setValue(v=>({...v,files:[new File(['sintético'],'boleta-qa.txt')]}))}>Agregar archivo sintético</button><button onClick={()=>void reset()}>Limpiar y comenzar</button><button onClick={()=>void verify()}>Verificar almacenamiento vacío</button><button onClick={()=>void conflict()}>Verificar conflicto entre pestañas</button><p role="status">{result}</p></main>
}
