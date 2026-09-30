'use client';
import {useEffect,useState} from 'react';
import {ArrowRight,RotateCcw,ShieldCheck,TriangleAlert} from 'lucide-react';

export function WorkspaceStatus({error,onRetry}:{error?:string;onRetry?:()=>void}){
  const [slow,setSlow]=useState(false);
  useEffect(()=>{setSlow(false);if(error)return;const timer=setTimeout(()=>setSlow(true),8000);return()=>clearTimeout(timer)},[error]);
  return <main className="solar-status" data-error={!!error}>
    <div className="solar-status-brand"><span>Solvex <b>Solar</b></span><span>Plataforma comercial</span></div>
    <section className="solar-status-content" aria-labelledby="solar-status-title">
      <div className="solar-status-art" aria-hidden="true">
        <svg viewBox="0 0 360 230" fill="none">
          <ellipse cx="180" cy="200" rx="128" ry="13" fill="currentColor" opacity=".04"/>
          <g className="solar-sun"><circle cx="180" cy="58" r="21" fill="#d0df68"/><circle cx="180" cy="58" r="32" stroke="#a1bb42" strokeOpacity=".25"/>
            {Array.from({length:12},(_,i)=><path key={i} d="M180 14v7" stroke="#91a939" strokeWidth="2" strokeLinecap="round" transform={`rotate(${i*30} 180 58)`}/>)}</g>
          <path className="solar-energy-ray" d="M153 92l-11 23m38-18v18m27-23 11 23" stroke="#a1bb42" strokeWidth="2" strokeLinecap="round"/>
          <path d="M113 188l-6 12m140-12 6 12M93 200h174" stroke="#98adb5" strokeWidth="3" strokeLinecap="round"/>
          <path d="M99 118h162l31 65a5 5 0 0 1-5 7H73a5 5 0 0 1-5-7z" fill="#103e4b" stroke="#326370" strokeWidth="2"/>
          <path d="M139 118l-12 72m53-72v72m41-72 12 72M88 142h184M77 166h206" stroke="#7da6b0" strokeOpacity=".45"/>
          <path className="solar-panel-glow" d="M101 122h34l-3 16H94z" fill="#d0df68" fillOpacity=".65"/>
          <path className="solar-panel-glow solar-panel-glow-late" d="M184 146h40l3 16h-43z" fill="#d0df68" fillOpacity=".45"/>
        </svg>
      </div>
      <div role={error?'alert':'status'} aria-live="polite">
        <span className="solar-status-kicker">{error?<><TriangleAlert size={15}/>Carga interrumpida</>:<><span className="solar-live-dot"/>Preparando tu espacio</>}</span>
        <h1 id="solar-status-title">{error?'Retomemos tu proyecto.':'Cada proyecto empieza con energía.'}</h1>
        <p className="solar-status-description">{error||'Estamos cargando tu catálogo y la información de tu equipo.'}</p>
      </div>
      {!error&&<><div className="solar-status-track" aria-hidden="true"><span/></div><p className="solar-status-hint">{slow?'Está tardando más de lo habitual. Puedes volver a intentarlo.':'Tu espacio estará listo en unos momentos.'}</p></>}
      {(error||slow)&&<div className="solar-status-actions">{onRetry?<button type="button" onClick={onRetry}><RotateCcw size={16}/>Reintentar</button>:<a className="solar-status-retry" href="/"><RotateCcw size={16}/>Reintentar</a>}<a href="/acceso">Volver al acceso<ArrowRight size={15}/></a></div>}
    </section>
    <footer className="solar-status-footer"><ShieldCheck size={15}/><span>Espacio privado de Solvex Solar</span></footer>
  </main>;
}
