import type {SavedQuote} from './quote';
import type {ProjectionInput} from './projection';
import {solarGenerationContext} from './energy';

export const calendarDays=[31,28,31,30,31,30,31,31,30,31,30,31];
/** Explicit commercial reference, never a silent substitute for a failed solar query. */
export function savingsGeneration(q:SavedQuote,p:ProjectionInput){
 const energy=q.input.energy,generation=energy?.solarGeneration;
 if(p.generationMethod==='hsp'){
  const hours=p.peakSunHours,days=p.referenceDays,loss=p.referenceLossPercent??0;
  if(!(hours&&hours>0&&hours<=12&&days&&days>=1&&days<=31&&q.calculation.kwp>0&&loss>=0&&loss<=50))return null;
  const monthly=q.calculation.kwp*hours*days*(1-loss/100);
  return {annualKwh:monthly*12,monthly:null,source:`Referencia HSP: ${q.calculation.kwp} kWp × ${hours} h/día × ${days} días × ${(1-loss/100).toFixed(2)}. Sin estudio por ubicación`};
 }
 if(!energy||!generation||generation.context!==solarGenerationContext(energy,q.calculation.kwp))return null;
 return {annualKwh:generation.annualKwh,monthly:generation.monthly??null,source:generation.source};
}
