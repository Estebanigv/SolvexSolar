import {persistentEnergy,solarGenerationContext} from './energy';
import {z} from 'zod';
import type {SavedQuote} from './quote';

export const projectionSchema=z.object({
 savingsMode:z.enum(['automatic','manual']).optional(),
 selfConsumptionPercent:z.number().finite().min(0).max(100).optional(),
 energyRate:z.number().finite().min(0).max(1e6).nullable().optional(),
 nonEnergyCharges:z.number().finite().min(0).max(1e9).optional(),
 exportRate:z.number().finite().min(0).max(1e6).optional(),
 monthlySavings:z.number().finite().min(0).max(1e9).nullable(),
 savingsSource:z.string().max(500),years:z.number().int().min(1).max(30),
 tariffGrowth:z.number().finite().min(0).max(20),degradation:z.number().finite().min(0).max(5),
 annualMaintenance:z.number().finite().min(0).max(1e9),
 replacementYear:z.number().int().min(1).max(30).nullable(),replacementCost:z.number().finite().min(0).max(1e10),
 avoidedKwh:z.number().finite().min(0).max(1e8).nullable(),emissionFactor:z.number().finite().min(0).max(10).nullable(),
 emissionSource:z.string().max(500),reviewedFor:z.string().max(20000),
});
export type ProjectionInput=z.infer<typeof projectionSchema>;
export const newProjection=():ProjectionInput=>({savingsMode:'automatic',selfConsumptionPercent:70,energyRate:null,exportRate:0,monthlySavings:null,savingsSource:'',years:25,tariffGrowth:0,degradation:0.5,annualMaintenance:0,replacementYear:null,replacementCost:0,avoidedKwh:null,emissionFactor:null,emissionSource:'',reviewedFor:''});

export function automaticSavings(q:SavedQuote,p:ProjectionInput){
 const energy=q.input.energy,generation=energy?.solarGeneration,issues:string[]=[];
 const validGeneration=!!energy&&!!generation&&generation.context===solarGenerationContext(energy,q.calculation.kwp);
 if(!validGeneration)issues.push('Completa la ubicación y consulta la generación solar del sistema actual.');
 const kwh=energy?.consumptionKwh,days=energy?.billingDays;
 if(!(kwh&&kwh>0&&days&&days>0))issues.push('Completa el consumo en kWh y los días del período.');
 const offGrid=q.input.system==='OFF GRID';
 const rate=p.energyRate??(!offGrid&&kwh&&q.input.customer.bill>0?Math.max(0,q.input.customer.bill-(p.nonEnergyCharges??0))/kwh:null);
 if(!(rate!==null&&Number.isFinite(rate)&&rate>0))issues.push(offGrid?'Ingresa el costo por kWh de la energía o combustible que se reemplaza.':'Completa el monto de la boleta o ingresa una tarifa por kWh.');
 if(issues.length)return {issues,result:null};
 const monthlyGeneration=generation!.annualKwh/12,monthlyConsumption=kwh!/days!*365/12;
 const selfConsumed=Math.min(monthlyConsumption,monthlyGeneration*(p.selfConsumptionPercent??70)/100);
 const surplus=offGrid?0:Math.max(0,monthlyGeneration-selfConsumed),exportRate=offGrid?0:p.exportRate??0;
 const selfSavings=selfConsumed*rate!,exportCredit=surplus*exportRate;
 return {issues,result:{monthlyGeneration,monthlyConsumption,selfConsumed,surplus,rate:rate!,exportRate,selfSavings,exportCredit,
  monthlySavings:Math.round(selfSavings+exportCredit),billRate:p.energyRate==null&&!offGrid,
  source:`${generation!.source}; generación ${generation!.annualKwh.toFixed(1)} kWh/año. Autoconsumo supuesto ${p.selfConsumptionPercent??70}%: ${selfConsumed.toFixed(1)} kWh/mes × ${rate!.toFixed(2)} CLP/kWh${p.energyRate==null?' (promedio boleta)':''}. Excedentes ${surplus.toFixed(1)} kWh/mes × ${exportRate.toFixed(2)} CLP/kWh. Promedio anual; validar perfil horario${offGrid?' y pérdidas/autonomía Off Grid':''}.`}};
}

// Legacy projections remain manual. New proposals default to the automatic model.
export function resolvedProjection(q:SavedQuote):ProjectionInput{
 const p=q.input.projection??newProjection();
 if(p.savingsMode!=='automatic')return p;
 const automatic=automaticSavings(q,p);
 return {...p,monthlySavings:automatic.result?.monthlySavings??null,savingsSource:automatic.result?.source??''};
}

// Compare like-for-like monthly periods. This is an economic reference, not a
// simulated electricity bill: export credits and fixed charges differ by tariff.
export function savingsBillComparison(q:SavedQuote,p=resolvedProjection(q)){
 const bill=q.input.customer.bill,days=q.input.energy?.billingDays,savings=p.monthlySavings;
 if(q.input.system==='OFF GRID'||!days||days<=0||!Number.isFinite(days)||!Number.isFinite(bill)||bill<=0||savings==null||!Number.isFinite(savings)||savings<0)return null;
 const monthlyBill=bill/days*365/12;
 return {monthlyBill,monthlySavings:savings,percent:savings/monthlyBill*100,
  barPercent:Math.min(100,savings/monthlyBill*100),billingDays:days};
}

// Bind approval to both the assumptions and the exact technical/economic snapshot.
// Old quotes and edited configurations never inherit an earlier approval.
export function projectionContext(q:SavedQuote,p:ProjectionInput){
 const {reviewedFor:_,...assumptions}=p;
 return JSON.stringify({assumptions,system:q.input.system,customer:q.input.customer,energy:persistentEnergy(q.input.energy),total:q.calculation.total,kwp:q.calculation.kwp,lines:q.calculation.lines},(_,value)=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b))):value);
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
 if(!q.input.projection)return null;
 const p=resolvedProjection(q);
 if(!q.calculation.complete||p.reviewedFor!==projectionContext(q,p))return null;
 const result=calculateProjection(p,q.calculation.total);
 return result?{...result,input:p}:null;
}
export const projectionAssumptions=(p:ProjectionInput)=>`Horizonte: ${p.years} años. Variación anual de tarifa: ${p.tariffGrowth}%. Degradación anual: ${p.degradation}%. Mantención anual: ${Math.round(p.annualMaintenance).toLocaleString('es-CL')} CLP. Reposición: ${p.replacementCost>0?`${Math.round(p.replacementCost).toLocaleString('es-CL')} CLP en año ${p.replacementYear}`:'no contemplada'}. Valores nominales, sin descuento financiero ni financiamiento. No garantiza resultados; depende del consumo, recurso solar y condiciones de operación.`;
