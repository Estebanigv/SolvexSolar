import {z} from 'zod';
import type {Settings, QuoteInput, Calculation} from './quote';

export const adviserSchema = z.object({id:z.string().min(1).max(80),name:z.string().min(1).max(150),email:z.string().email(),phone:z.string().max(40)});
export const roiReferenceSchema = z.object({source:z.string().max(200),panelWatts:z.number().positive(),monthlyByPanels:z.array(z.object({panels:z.number().int().positive(),amount:z.number().positive()})).max(100)});
export const paymentScheduleSchema = z.array(z.object({label:z.string().max(80),percent:z.number().int().min(0).max(100)})).max(10).refine(rows=>rows.reduce((sum,row)=>sum+row.percent,0)===100,'Los pagos deben sumar 100%.');
export const preliminaryNote = 'Precotización sujeta a visita técnica. El comercial y el instalador ajustarán y validarán equipos, compatibilidad y alcance antes de emitir la cotización final.';

export function proposalTitle(q:QuoteInput, official:boolean){
  return q.proposalType==='preliminary' ? (official?'PRECOTIZACIÓN':'PRECOTIZACIÓN EN REVISIÓN') : (official?'COTIZACIÓN':'BORRADOR');
}
export function assignedAdviser(q:QuoteInput, settings:Settings){return settings.advisers?.find(a=>a.id===q.adviserId);}
export function paymentBreakdown(total:number, settings:Settings){
  const rows=settings.paymentSchedule??[];
  let allocated=0;
  return rows.map((row,index)=>{const amount=index===rows.length-1?total-allocated:Math.round(total*row.percent/100);allocated+=amount;return {...row,amount};});
}
export function netbillingScope(q:QuoteInput, settings:Settings){return q.system==='OFF GRID'?'':settings.netbillingTerms??'';}

// This reproduces the client's reference workbook; it is not a tariff or solar model.
// Values are authenticated workspace configuration, never bundled private catalog data.
export function roiReference(q:QuoteInput, c:Calculation, settings:Settings){
  const reference=settings.roiReference;
  const panels=c.lines.filter(line=>line.category==='PANEL FOTOVOLTAICO');
  if(!reference||!c.complete||c.total<=0||!panels.length)return null;
  // Power of every selected panel is captured separately in Calculation, not inferred from names.
  if(c.panelWatts?.some(watts=>watts!==reference.panelWatts)||!c.panelWatts?.length)return null;
  const monthly=reference.monthlyByPanels.find(row=>row.panels===c.panels)?.amount;
  if(!monthly)return null;
  const annual=monthly*12;
  return {source:reference.source,monthly,annual,years:c.total/annual,exceedsBill:q.customer.bill>0&&monthly>q.customer.bill};
}

// Retire the previous template's execution-time clause without changing payment dates or warranties.
export function customerTerms(q:QuoteInput, settings:Settings){
  let terms=settings.terms.replace(/El alcance y los plazos de ejecución se acuerdan tras la visita técnica\./gi,'El alcance se acuerda tras la visita técnica.');
  if(q.showItemDetails===false){
    terms=terms.replace('los equipos y cantidades detallados en esta propuesta','los equipos y cantidades de la configuración cotizada')
      .replace('cuando figuran en el detalle','cuando forman parte de la configuración cotizada');
  }
  return terms;
}
