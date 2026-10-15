'use client';
import {AlertCircle,CheckCircle2,ChevronDown,ClipboardList,LockKeyhole} from 'lucide-react';
import {Button} from '@/components/ui/button';
import type {SavedQuote} from '@/lib/quote';
import {issuanceProblems,issuanceWarnings,issuedWarnings} from '@/lib/quote-issuance';
import {quoteValidationIssues,type QuoteIssue} from '@/lib/quote-validation';
import {QuotePendingGroups} from './quote-validation';
import './quote-validation.css';

export function QuoteIssuePanel({quote,busy=false,enabled=true,onIssue,onSelect}:{quote:SavedQuote;busy?:boolean;enabled?:boolean;onIssue:()=>void;onSelect:(issue:QuoteIssue)=>void}){
 const problems=issuanceProblems(quote),warnings=issuanceWarnings(quote),issues=quoteValidationIssues(quote);
 const pending=warnings.length>0||problems.length>0;
 return <section className="quote-issue-panel" aria-label="Emisión de la cotización" data-pending={pending}>
  <div className="quote-issue-main"><div className="quote-issue-message">{pending?<AlertCircle size={19}/>:<CheckCircle2 size={19}/>}<div><strong>{problems.length?'Revisa los datos mínimos':pending?'Puedes emitir con datos pendientes':'Lista para emitir'}</strong><p>{problems.length?problems.join(' '):pending?'Los pendientes quedan para revisión interna. No aparecen en el PDF ni en la impresión.':'Asigna el número de cotización y habilita la descarga y el envío.'}</p></div></div>
  <Button disabled={busy||!enabled||problems.length>0} onClick={onIssue}><CheckCircle2 size={17}/>{busy?'Emitiendo…':pending?'Emitir con pendientes':'Emitir cotización'}</Button></div>
  {pending&&<details className="quote-issue-details"><summary>Ver pendientes<ChevronDown size={16}/></summary><div className="quote-issue-detail-body">{issues.length>0&&<QuotePendingGroups issues={issues} busy={busy} onSelect={onSelect} prefix="preview-validation"/>}{warnings.length>0&&<div><strong>Pendientes internos</strong><ul className="quote-issue-warnings">{warnings.map(w=><li key={w}>{w}</li>)}</ul></div>}</div></details>}
 </section>;
}

export function IssuedQuotePending({quote}:{quote:SavedQuote}){
 const warnings=issuedWarnings(quote);
 if(!warnings.length)return null;
 return <aside className="quote-issue-panel quote-internal-pending" data-pending="true" aria-label="Pendientes internos de la cotización">
  <details className="quote-internal-details"><summary className="quote-internal-header">
   <span className="quote-internal-icon"><ClipboardList size={20} aria-hidden="true"/></span>
   <span className="quote-internal-heading"><strong>Pendientes internos <span className="quote-internal-count">{warnings.length}</span></strong><span>Información por revisar al emitir esta cotización</span></span>
   <span className="quote-internal-private"><LockKeyhole size={13} aria-hidden="true"/>Solo para el equipo</span>
   <ChevronDown className="quote-internal-chevron" size={18} aria-hidden="true"/>
  </summary>
   <div className="quote-internal-body"><ul className="quote-internal-list">{warnings.map((warning,index)=><li key={index}><span className="quote-internal-dot" aria-hidden="true"/>{warning}</li>)}</ul>
   <p><LockKeyhole size={13} aria-hidden="true"/>Estos avisos no aparecen en el PDF ni en la impresión del cliente.</p></div>
  </details>
 </aside>;
}
