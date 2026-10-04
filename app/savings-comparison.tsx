import type {SavedQuote} from '@/lib/quote';
import {money} from '@/lib/quote';
import {savingsBillComparison,type ProjectionInput} from '@/lib/projection';

export function SavingsComparison({q,projection}:{q:SavedQuote;projection?:ProjectionInput}){
 const comparison=savingsBillComparison(q,projection);
 if(!comparison)return null;
 return <section className="savings-comparison" aria-label="Ahorro respecto de la boleta">
  <div className="savings-comparison-heading"><div><span>Ahorro respecto de tu boleta</span><p>Referencia mensual del primer año</p></div><strong>{comparison.percent.toLocaleString('es-CL',{maximumFractionDigits:1})}<small>%</small></strong></div>
  <div className="savings-comparison-track" aria-hidden="true"><span style={{width:`${comparison.barPercent}%`}}/></div>
  <dl><div><dt>Boleta mensualizada</dt><dd>{money(comparison.monthlyBill)}</dd></div><div><dt>Beneficio mensual estimado</dt><dd>{money(comparison.monthlySavings)}</dd></div></dl>
  <p className="savings-comparison-note">Boleta de {comparison.billingDays} días ajustada a un mes promedio (365 ÷ 12 días). El beneficio puede incluir excedentes; no representa una boleta futura ni un ahorro garantizado.</p>
 </section>;
}
