'use client';
import {useEffect,useRef} from 'react';
import {AlertCircle,ArrowRight} from 'lucide-react';
import {issueLocation,type QuoteIssue} from '@/lib/quote-validation';
import './quote-validation.css';

export function QuoteValidationList({issues,onSelect,busy=false,prefix='validation'}:{issues:QuoteIssue[];onSelect:(issue:QuoteIssue)=>void;busy?:boolean;prefix?:string}){
 if(!issues.length)return null;
 return <section className="quote-validation-list" aria-label="Datos pendientes para emitir">
  <h3><AlertCircle size={20}/>Falta completar {issues.length} {issues.length===1?'dato':'datos'}</h3>
  <p>Selecciona un pendiente para ir al campo marcado en rojo.</p>
  <ul>{issues.map(issue=><li key={issue.id}><button type="button" disabled={busy} id={`${prefix}-${issue.id}`} onClick={()=>onSelect(issue)}><span><strong>{issue.message}</strong><small>{issueLocation(issue)}</small></span><ArrowRight size={17}/></button></li>)}</ul>
 </section>;
}

const controls='input,textarea,select,button[role="combobox"],button[role="checkbox"]';
export function findValidationField(field:string):HTMLElement|null{
 const visible=(el:HTMLElement)=>!!el.getClientRects().length&&!el.closest('[data-state="inactive"]');
 const marked=Array.from(document.querySelectorAll<HTMLElement>('[data-validation-field]')).find(el=>el.dataset.validationField===field&&visible(el));
 if(marked)return marked.matches(controls)?marked:marked.querySelector<HTMLElement>(controls)??marked;
 return Array.from(document.querySelectorAll<HTMLElement>(controls)).find(el=>{
  if(!visible(el))return false;
  if(el.getAttribute('aria-label')===field)return true;
  const label=el.closest('label');
  const text=label?Array.from(label.childNodes).filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join('').trim():'';
  return text===field;
 })??null;
}

export type ValidationFocus={issue:QuoteIssue;token:number};
export function useQuoteValidation(issues:QuoteIssue[],focus:ValidationFocus|null,location:string){
 const serialized=JSON.stringify(issues);
 const focused=useRef<number|null>(null);
 useEffect(()=>{
  const cleanup:(()=>void)[]=[];
  const marked=new Set<HTMLElement>();
  const grouped=new Map<string,QuoteIssue[]>();
  for(const issue of JSON.parse(serialized) as QuoteIssue[])grouped.set(issue.field,[...(grouped.get(issue.field)??[]),issue]);
  const highlight=()=>{
  for(const [field,rows] of grouped){
   const el=findValidationField(field);if(!el||marked.has(el))continue;
   marked.add(el);
   const box=el.closest<HTMLElement>('label')??el;
   const invalid=el.getAttribute('aria-invalid'),described=el.getAttribute('aria-describedby');
   box.classList.add('quote-invalid');box.dataset.validationMessage=rows.map(r=>r.message).join(' ');
   el.setAttribute('aria-invalid','true');
   const messages=rows.map(r=>'workspace-validation-'+r.id).filter(id=>document.getElementById(id));
   if(messages.length)el.setAttribute('aria-describedby',[described,...messages].filter(Boolean).join(' '));
   cleanup.push(()=>{box.classList.remove('quote-invalid');delete box.dataset.validationMessage;if(invalid===null)el.removeAttribute('aria-invalid');else el.setAttribute('aria-invalid',invalid);if(described===null)el.removeAttribute('aria-describedby');else el.setAttribute('aria-describedby',described)});
  }
  };
  highlight();
  // Radix can mount a tab or dialog after this parent effect has run.
  const observer=new MutationObserver(highlight);
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-state']});
  return()=>{observer.disconnect();cleanup.forEach(fn=>fn())};
 },[serialized,location]);
 useEffect(()=>{
  if(!focus||focused.current===focus.token)return;
  let frame=0;
  const locate=()=>{
   const field=findValidationField(focus.issue.field);if(!field||field.closest('[inert],[aria-hidden="true"]'))return;
   for(let el=field.parentElement;el;el=el.parentElement)if(el instanceof HTMLDetailsElement)el.open=true;
   if(field.matches(':disabled')){const box=field.closest<HTMLElement>('label');box?.setAttribute('tabindex','-1');box?.focus({preventScroll:true});}
   else {field.focus({preventScroll:true});if(document.activeElement!==field)return;}
   field.scrollIntoView({block:'center',behavior:'instant'});focused.current=focus.token;observer.disconnect();
  };
  const observer=new MutationObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(locate)});
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-hidden','inert']});
  frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(locate)});
  const timer=setTimeout(()=>observer.disconnect(),3000);
  return()=>{observer.disconnect();clearTimeout(timer);cancelAnimationFrame(frame)};
 },[focus,location]);
}
