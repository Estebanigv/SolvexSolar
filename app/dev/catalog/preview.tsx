"use client";
import {useState} from 'react';
import {EquipmentCatalog} from '../../catalog';
import {initialProducts} from '@/lib/quote';
export default function Preview(){const [products,setProducts]=useState(initialProducts),[dirty,setDirty]=useState(false);return <main className="qh-preview"><p className="qh-preview-note">Vista local con datos de ejemplo. Los cambios de esta página no se guardan en Supabase.</p><header><h1>Equipos y precios</h1></header><EquipmentCatalog products={products} dirty={dirty} busy={false} loaded canEdit demo onSave={()=>setDirty(false)} onApply={product=>{setProducts(ps=>ps.some(p=>p.id===product.id)?ps.map(p=>p.id===product.id?product:p):[...ps,product]);setDirty(true)}}/></main>}
