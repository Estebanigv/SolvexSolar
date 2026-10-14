'use client';
import {useState} from 'react';
import {newEnergyInput} from '@/lib/energy';
import {QuoteIssuePanel} from '../../quote-issue-panel';
import {Proposal} from '../../proposal';
import {Button} from '@/components/ui/button';
import {newQuote,calculate,initialProducts,initialSettings,type SavedQuote} from '@/lib/quote';
import {issuanceWarnings} from '@/lib/quote-issuance';
const input={...newQuote(),customer:{...newQuote().customer,name:'',region:'Metropolitana',commune:'Santiago',bill:50000},energy:{...newEnergyInput(),consumptionKwh:300,billingDays:30,billReviewed:true}};
const settings={...initialSettings,taxMode:'included' as const,legal:'Solvex Solar',rut:'Empresa de prueba',terms:'Condiciones acordadas.',warranty:'Garantías del fabricante.',approved:true};
const fixture:SavedQuote={id:'draft',folio:'BORRADOR-SVX',date:'2026-10-14',input,settings,calculation:calculate(input,initialProducts,settings)};
export default function Preview(){const [q,setQ]=useState(fixture),[focus,setFocus]=useState('');return <main style={{maxWidth:1240,margin:'24px auto',padding:'20px 24px',background:'#edf3f5',border:'1px solid #c4d5da',borderRadius:12}}><h2 style={{fontSize:20}}>Propuesta para el cliente</h2><p style={{fontSize:14,margin:'6px 0 12px'}}>Vista de prueba · Descarga el PDF, imprímelo o prepara el archivo para compartir.</p>{!q.issuedAt&&<QuoteIssuePanel quote={q} onIssue={()=>setQ({...q,issuedAt:'2026-10-14',folio:'SVX-2026-000001',issuanceWarnings:issuanceWarnings(q)})} onSelect={issue=>setFocus(issue.message)}/>}<div className="doc-actions"><Button variant="outline">Editar propuesta</Button><Button disabled={!q.issuedAt}>Descargar PDF</Button><Button variant="outline" disabled={!q.issuedAt}>Imprimir</Button><Button variant="outline" disabled={!q.issuedAt}>Correo</Button></div>{focus&&<p role="status">{focus}</p>}<Proposal q={q}/></main>}
