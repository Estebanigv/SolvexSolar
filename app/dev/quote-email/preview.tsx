'use client';
import {useState} from 'react';
import {Input} from '@/components/ui/input';
import {newQuote,initialProducts,initialSettings,money} from '@/lib/quote';
import {calculateEditingQuote} from '@/lib/quote-editing';
import {invalidCustomerEmail} from '@/lib/customer-email';
const initial={...newQuote(),customer:{...newQuote().customer,name:'Cliente de demostración'},discountPercent:10,finalTotalOverride:4200000};
export default function Preview(){const [q,setQ]=useState(initial);const c=calculateEditingQuote(q,initialProducts,{...initialSettings,taxMode:'included'});const invalid=invalidCustomerEmail(q.customer.email);return <main style={{maxWidth:800,margin:'40px auto',padding:24}}><h1>Conservar la cotización al editar el correo</h1><p>Prueba local con datos de demostración.</p><label>Correo electrónico<Input aria-label="Correo electrónico" type="email" value={q.customer.email} aria-invalid={invalid} onChange={e=>setQ({...q,customer:{...q.customer,email:e.target.value}})}/></label>{invalid&&<p className="field-error" role="alert">Revisa el correo. Los equipos y el cálculo se conservan.</p>}<section className="card" style={{marginTop:20}} aria-label="Resumen del proyecto"><h2>Resumen del proyecto</h2><p>{c.panels} paneles · {c.kwp.toLocaleString('es-CL')} kWp</p><p>Equipos e instalación: {money(c.subtotal)}</p><p>Descuento: {money(c.discount)}</p><p>IVA incluido: {money(c.tax??0)}</p><h2>Total final: {money(c.total)}</h2></section></main>}
