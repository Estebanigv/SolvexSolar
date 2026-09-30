"use client";
import {Download,BookOpen,ExternalLink} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {userGuide,validationChecklist} from '@/lib/user-guide';

export function UserGuide(){
 return <section className="user-guide">
  <div className="user-guide-top">
   <div>
    <BookOpen size={24}/>
    <h2>De la boleta a la propuesta</h2>
    <p>Consulta el manual visual cuando tengas dudas o descárgalo para tenerlo a mano.</p>
   </div>
   <div className="user-guide-actions">
    <Button asChild>
     <a href="/manual-solvex-solar.pdf" target="_blank" rel="noopener noreferrer" aria-label="Ver manual en línea (abre en una nueva pestaña)">
      <BookOpen size={16}/>Ver manual en línea<ExternalLink size={14}/>
     </a>
    </Button>
    <Button asChild variant="outline">
     <a href="/manual-solvex-solar.pdf" download="Solvex-Solar-Manual-visual-de-uso.pdf">
      <Download size={16}/>Descargar PDF
     </a>
    </Button>
   </div>
  </div>
  <p className="help-text">También puedes consultar los pasos de uso aquí mismo, sin salir de la plataforma.</p>
  {userGuide.map((section,i)=><details key={section.title} open={i===0}>
   <summary>{section.title}</summary>
   <ol>{section.steps.map(step=><li key={step}>{step}</li>)}</ol>
  </details>)}
  <details className="guide-validation">
   <summary>Prueba de aceptación del equipo</summary>
   <p>Carol, Daniel, Marcelo y Nidia deben completar una prueba con su propia cuenta. Utiliza registros de prueba autorizados y anota los resultados en la lista de pruebas.</p>
   <a href="/manual-solvex-solar.md" download="Solvex-Solar-lista-de-pruebas.md">Descargar lista de pruebas en texto</a>
   <ol>{validationChecklist.map(item=><li key={item}>{item}</li>)}</ol>
  </details>
 </section>;
}
