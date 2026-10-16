'use client';
import {persistentQuote} from '@/lib/quote-persistence';
import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {readRecovery,saveDraft,clearDraft} from '@/lib/local-recovery';
import type {QuoteInput} from '@/lib/quote';
import {editableQuoteSchema} from '@/lib/quote-editing';
export type QuoteDraft={input:QuoteInput;clientId:string|null;sourceQuoteId:string|null;step:string;files:File[];savedAt:string};
export function useQuoteDraft(ownerId:string|undefined,value:Omit<QuoteDraft,'savedAt'>,restore:(draft:QuoteDraft)=>Promise<void>,active=true){
 const [candidate,setCandidate]=useState<QuoteDraft|null>(null),[ready,setReady]=useState(false),[status,setStatus]=useState(''),[error,setError]=useState('');
 const current=useRef(value);current.current=value;const version=useRef<string|null>(null),queue=useRef(Promise.resolve()),last=useRef<typeof value|null>(null),scheduled=useRef<typeof value|null>(null),failed=useRef(false);
 const resetting=useRef(false);
 const key=ownerId?'draft:'+ownerId:null;
 useEffect(()=>{if(!key)return;let cancelled=false;setReady(false);readRecovery<{version:string;value:QuoteDraft}>(key).then(record=>{if(cancelled)return;version.current=record?.version??null;if(record&&editableQuoteSchema.safeParse(record.value.input).success){setCandidate(record.value);setStatus('Borrador disponible en este dispositivo')}else setReady(true)}).catch(()=>{if(!cancelled){setError('El navegador no permite recuperar borradores locales. Mantén esta página abierta hasta guardar.');setReady(true);failed.current=true}});return()=>{cancelled=true}},[key]);
 function persist(){if(!key||!ready||!active||failed.current||resetting.current)return;const next=current.current;if(scheduled.current===next)return;scheduled.current=next;setStatus('Guardando borrador…');queue.current=queue.current.then(async()=>{if(failed.current||resetting.current)return;try{version.current=await saveDraft(key,{...next,input:persistentQuote(next.input),savedAt:new Date().toISOString()},version.current);last.current=next;if(current.current===next)setStatus('Borrador guardado en este dispositivo')}catch(e){failed.current=true;setError((e as Error).message)}})}
 async function reset(next:typeof value){
  resetting.current=true;
  try{await queue.current;if(key)await clearDraft(key,version.current);version.current=null;failed.current=false;last.current=next;scheduled.current=next;current.current=next;setCandidate(null);setError('');setStatus('Nueva cotización preparada');setReady(true)}
  catch(e){setError((e as Error).message);throw e}
  finally{resetting.current=false}
 }
 useEffect(()=>{if(!ready)return;const timer=setTimeout(persist,600);return()=>clearTimeout(timer)},[value.input,value.clientId,value.sourceQuoteId,value.step,value.files,ready,active]);
 useEffect(()=>{const hide=()=>{if(document.visibilityState==='hidden')persist()};const warn=(e:BeforeUnloadEvent)=>{if(ready&&active&&(last.current!==current.current||failed.current)){e.preventDefault();e.returnValue=''}};document.addEventListener('visibilitychange',hide);window.addEventListener('beforeunload',warn);return()=>{document.removeEventListener('visibilitychange',hide);window.removeEventListener('beforeunload',warn)}},[ready,key,active]);
 return {candidate,status,error,reset,async recover(){if(!candidate)return;try{await restore(candidate);setCandidate(null);setReady(true);setError('')}catch{setError('No se pudo recuperar el borrador. Conserva esta página y vuelve a intentarlo.')}},discard(){void reset(current.current).then(()=>{if(active){scheduled.current=null;last.current=null}}).catch(()=>{})}};
}
export function DraftStatus({draft}:{draft:ReturnType<typeof useQuoteDraft>}){return <div className="draft-recovery" role="status">{draft.candidate?<><div><strong>Tienes una propuesta sin terminar</strong><p>{draft.candidate.input.customer.name||'Cliente por completar'} · {new Date(draft.candidate.savedAt).toLocaleString('es-CL',{timeZone:'America/Santiago'})} · {draft.candidate.files.length} archivos</p></div><Button onClick={()=>void draft.recover()}>Recuperar borrador</Button><Button variant="ghost" onClick={draft.discard}>Comenzar sin recuperar</Button></>:<small>{draft.status}</small>}{draft.error&&<p role="alert">{draft.error}</p>}</div>}
