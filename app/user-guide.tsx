"use client";
import {useState} from 'react';
import dynamic from 'next/dynamic';
import {Download,BookOpen,ExternalLink,Search,CheckCircle2,ArrowRight} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {userGuide,validationChecklist,guideMarkdown} from '@/lib/user-guide';
import {manualUrl,manualFilename} from '@/lib/manual';
import './user-guide.css';

const ManualReader=dynamic(()=>import('./manual-reader'),{ssr:false,loading:()=> <p className="manual-starting" role="status">Abriendo el manual visual…</p>});
export function UserGuide(){
 const [mode,setMode]=useState<'visual'|'steps'>('visual');
 const [search,setSearch]=useState('');
 const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
 const sections=userGuide.filter(section=>normalize(section.title+' '+section.steps.join(' ')).includes(normalize(search.trim())));
 function downloadChecklist(){
  const url=URL.createObjectURL(new Blob([guideMarkdown()],{type:'text/markdown;charset=utf-8'}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download='Solvex-Solar-lista-de-pruebas.md';anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 return <section className="solvex-guide">
  <header className="guide-intro">
   <div className="guide-intro-copy"><BookOpen aria-hidden="true" size={28}/><h2>De la boleta a la propuesta</h2><p>Consulta cada etapa con imágenes y explicaciones. El mismo manual, en línea y en PDF.</p></div>
   <div className="guide-intro-actions">
    <Button asChild><a href={manualUrl} download={manualFilename}><Download size={18}/>Descargar manual PDF</a></Button>
    <a className="guide-open-pdf" href={manualUrl} target="_blank" rel="noopener noreferrer">Abrir PDF en otra pestaña<ExternalLink size={16}/></a>
    <span>15 páginas · Edición de septiembre de 2026</span>
   </div>
  </header>
  <div className="guide-mode-bar">
   <div className="guide-mode-switch" role="group" aria-label="Formato de consulta">
    <button type="button" aria-pressed={mode==='visual'} onClick={()=>setMode('visual')}><BookOpen size={18}/>Manual visual</button>
    <button type="button" aria-pressed={mode==='steps'} onClick={()=>setMode('steps')}><Search size={18}/>Pasos actualizados</button>
   </div>
   <p>{mode==='visual'?'La misma diagramación del PDF, página por página.':'Busca por tema para consultar las funciones más recientes.'}</p>
  </div>
  {mode==='visual'?<ManualReader/>:<div className="guide-reference">
   <label className="guide-search"><span>¿Qué necesitas hacer?</span><div><Search size={20}/><input type="search" placeholder="Buscar boleta, descuento, envío…" value={search} onChange={event=>setSearch(event.target.value)}/></div></label>
   <p className="guide-result-count" aria-live="polite">{sections.length} {sections.length===1?'tema disponible':'temas disponibles'}</p>
   {sections.length===0&&<div className="guide-no-results"><p>No encontramos ese tema. Prueba con otra palabra o consulta el manual visual.</p><Button variant="outline" onClick={()=>setSearch('')}>Ver todos los temas</Button></div>}
   {sections.map(section=><details key={section.title} className="guide-topic" open={search.trim()?true:undefined}>
    <summary>{section.title}<ArrowRight size={18}/></summary>
    <ol>{section.steps.map(step=><li key={step}>{step}</li>)}</ol>
   </details>)}
   <details className="guide-team-checklist">
    <summary><CheckCircle2 size={20}/>Lista de comprobación del equipo</summary>
    <p>Revisa estos puntos con tu propia cuenta y registros de prueba autorizados.</p>
    <Button variant="outline" onClick={downloadChecklist}><Download size={16}/>Descargar lista de pruebas</Button>
    <ol>{validationChecklist.map(item=><li key={item}>{item}</li>)}</ol>
   </details>
  </div>}
 </section>;
}
