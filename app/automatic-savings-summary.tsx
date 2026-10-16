'use client';
import {Button} from '@/components/ui/button';
import {money,type SavedQuote} from '@/lib/quote';
import {automaticSavings,resolvedProjection,publishedProjection} from '@/lib/projection';
import './automatic-savings-summary.css';

export function AutomaticSavingsSummary({quote,onReview}:{quote:SavedQuote;onReview:()=>void}){
 const projection=resolvedProjection(quote),automatic=projection.savingsMode==='automatic',calculation=automatic?automaticSavings(quote,projection):null;
 const amount=projection.monthlySavings,available=amount!==null&&Number.isFinite(amount)&&amount>=0,reviewed=!!publishedProjection(quote);
 return <section className="automatic-savings-summary" aria-label="Ahorro mensual estimado">
  <span>Ahorro mensual estimado</span><strong aria-live="polite">{available?money(amount):'Faltan datos'}</strong>
  <small>{automatic?'Cálculo automático':'Valor manual'} · {reviewed?'Escenario revisado':'Pendiente de revisión'}</small>
  <p>{available?(automatic?(projection.generationMethod==='panels'?'Según los paneles seleccionados: 4,1 horas solares × 30 días × $205/kWh.':'Se actualiza con el consumo, la generación y la tarifa del proyecto. Revisa los supuestos antes de incluirlo en el PDF.'):'Importe ingresado por el equipo. Revisa su fundamento o activa el cálculo automático en Revisión y envío.'):calculation?.issues[0]??'Completa el ahorro y su fundamento en Revisión y envío.'}</p>
  <Button type="button" variant="outline" onClick={onReview}>{available?'Revisar cálculo':'Completar cálculo'}</Button>
 </section>;
}
