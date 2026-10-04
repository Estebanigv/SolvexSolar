'use client';
import {useState} from 'react';
import {AdditionalServices} from '../../additional-services';
import {calculate,initialProducts,initialSettings,mergeQuotePatch,newQuote,money} from '@/lib/quote';
import {certificationType,serviceQuantities} from '@/lib/additional-services';
export default function Preview(){
 const [quote,setQuote]=useState(newQuote);
 let total:string;try{total=money(calculate(quote,initialProducts,{...initialSettings,taxMode:'included'}).total)}catch{total='Revisa los servicios seleccionados'}
 return <main style={{maxWidth:1120,margin:'32px auto',padding:24}}><section className="card"><h1>Instalación y adicionales</h1><p>Prueba local · precios de ejemplo. No modifica cotizaciones guardadas.</p><AdditionalServices services={initialProducts.filter(p=>p.system===quote.system&&certificationType(p))} quote={quote} onChange={patch=>setQuote(q=>mergeQuotePatch(q,patch))} onQuantityChange={(product,n)=>setQuote(q=>({...q,quantities:serviceQuantities(q,initialProducts,product,n)}))} priceLabel="Precio unitario (CLP, IVA incluido)"/><p role="status" style={{fontSize:24,marginTop:24}}>Total del proyecto: <strong>{total}</strong></p></section></main>
}
