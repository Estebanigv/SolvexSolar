import {z} from 'zod';
import type {SavedQuote} from './quote';

export const projectionSchema=z.object({
 monthlySavings:z.number().finite().min(0).max(1e9).nullable(),
 savingsSource:z.string().max(500),years:z.number().int().min(1).max(30),
 tariffGrowth:z.number().finite().min(0).max(20),degradation:z.number().finite().min(0).max(5),
 annualMaintenance:z.number().finite().min(0).max(1e9),
 replacementYear:z.number().int().min(1).max(30).nullable(),replacementCost:z.number().finite().min(0).max(1e10),
 avoidedKwh:z.number().finite().min(0).max(1e8).nullable(),emissionFactor:z.number().finite().min(0).max(10).nullable(),
 emissionSource:z.string().max(500),reviewedFor:z.string().max(20000),
});
export type ProjectionInput=z.infer<typeof projectionSchema>;
export const newProjection=():ProjectionInput=>({monthlySavings:null,savingsSource:'',years:25,tariffGrowth:0,degradation:0.5,annualMaintenance:0,replacementYear:null,replacementCost:0,avoidedKwh:null,emissionFactor:null,emissionSource:'',reviewedFor:''});

// Bind approval to both the assumptions and the exact technical/economic snapshot.
// Old quotes and edited configurations never inherit an earlier approval.
export function projectionContext(q:SavedQuote,p:ProjectionInput){
 const {reviewedFor:_,...assumptions}=p;
 return JSON.stringify({assumptions,system:q.input.system,customer:q.input.customer,energy:q.input.energy,total:q.calculation.total,kwp:q.calculation.kwp,lines:q.calculation.lines},(_,value)=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b))):value);
}
export function projectionIssues(p:ProjectionInput,total:number){
 const issues:string[]=[];
 if(!projectionSchema.safeParse(p).success)return ['Revisa los valores: horizonte y año de reposición deben ser enteros entre 1 y 30.'];
 if(!p.monthlySavings||p.monthlySavings<=0)issues.push('Ingresa el ahorro mensual estimado.');
 if(!p.savingsSource.trim())issues.push('Describe cómo se validó el ahorro: energía aprovechada, tarifa y/o combustible reemplazado.');
 if(total<=0)issues.push('Completa la inversión del proyecto.');
 if(p.replacementCost>0&&(!p.replacementYear||p.replacementYear>p.years))issues.push('Indica un año de reposición dentro del período.');
 if((p.avoidedKwh!==null||p.emissionFactor!==null||p.emissionSource.trim())&&(!(p.avoidedKwh!>0)||!(p.emissionFactor!>0)||!p.emissionSource.trim()))issues.push('Para calcular CO₂ completa energía evitada, factor y fuente del factor.');
 return issues;
}
export function calculateProjection(p:ProjectionInput,investment:number){
 if(projectionIssues(p,investment).length)return null;
 let cumulative=0,payback:number|null=null;
 const rows=Array.from({length:p.years},(_,index)=>{
  const year=index+1,gross=p.monthlySavings!*12*Math.pow((1+p.tariffGrowth/100)*(1-p.degradation/100),index);
  const costs=p.annualMaintenance+(year===p.replacementYear?p.replacementCost:0),annual=gross-costs,previous=cumulative;
  cumulative+=annual;
  if(payback===null&&cumulative>=investment&&annual>0)payback=index+(investment-previous)/annual;
  return {year,gross,annual,cumulative,net:cumulative-investment};
 });
 return {rows,payback:payback as number|null,annual:rows[0].annual,cumulative,net:cumulative-investment,co2Tonnes:p.avoidedKwh&&p.emissionFactor?p.avoidedKwh*p.emissionFactor/1000:null};
}
export function publishedProjection(q:SavedQuote){
 const p=q.input.projection;
 if(!p||!q.calculation.complete||p.reviewedFor!==projectionContext(q,p))return null;
 const result=calculateProjection(p,q.calculation.total);
 return result?{...result,input:p}:null;
}
export const projectionAssumptions=(p:ProjectionInput)=>`Horizonte: ${p.years} años. Variación anual de tarifa: ${p.tariffGrowth}%. Degradación anual: ${p.degradation}%. Mantención anual: ${Math.round(p.annualMaintenance).toLocaleString('es-CL')} CLP. Reposición: ${p.replacementCost>0?`${Math.round(p.replacementCost).toLocaleString('es-CL')} CLP en año ${p.replacementYear}`:'no contemplada'}. Valores nominales, sin descuento financiero ni financiamiento. No garantiza resultados; depende del consumo, recurso solar y condiciones de operación.`;
