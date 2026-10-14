'use client';
import {AlertCircle,CheckCircle2,ChevronDown} from 'lucide-react';
import {Button} from '@/components/ui/button';
import type {SavedQuote} from '@/lib/quote';
import {issuanceProblems,issuanceWarnings} from '@/lib/quote-issuance';
import {quoteValidationIssues,type QuoteIssue} from '@/lib/quote-validation';
import {QuotePendingGroups} from './quote-validation';
import './quote-validation.css';

export function QuoteIssuePanel({quote,busy=false,enabled=true,onIssue,onSelect}:{quote:SavedQuote;busy?:boolean;enabled?:boolean;onIssue:()=>void;onSelect:(issue:QuoteIssue)=>void}){
 const problems=issuanceProblems(quote),warnings=issuanceWarnings(quote),issues=quoteValidationIssues(quote);
 const pending=warnings.length>0||problems.length>0;
 return <section className="quote-issue-panel" aria-label="Emisión de la cotización" data-pending={pending}>
  <div className="quote-issue-main"><div className="quote-issue-message">{pending?<AlertCircle size={19}/>:<CheckCircle2 size={19}/>}<div><strong>{problems.length?'Revisa los datos mínimos':pending?'Puedes emitir con datos pendientes':'Lista para emitir'}</strong><p>{problems.length?problems.join(' '):pending?'El PDF incluirá una advertencia con la información por completar.':'Asigna el número de cotización y habilita la descarga y el envío.'}</p></div></div>
  <Button disabled={busy||!enabled||problems.length>0} onClick={onIssue}><CheckCircle2 size={17}/>{busy?'Emitiendo…':pending?'Emitir con pendientes':'Emitir cotización'}</Button></div>
  {pending&&<details className="quote-issue-details"><summary>Ver pendientes<ChevronDown size={16}/></summary><div className="quote-issue-detail-body">{issues.length>0&&<QuotePendingGroups issues={issues} busy={busy} onSelect={onSelect} prefix="preview-validation"/>}{warnings.length>0&&<div><strong>Advertencias incluidas en el documento</strong><ul className="quote-issue-warnings">{warnings.map(w=><li key={w}>{w}</li>)}</ul></div>}</div></details>}
 </section>;
}
