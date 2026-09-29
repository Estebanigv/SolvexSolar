'use client';
import {Checkbox} from '@/components/ui/checkbox';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {money,type QuoteInput,type Settings,type Calculation} from '@/lib/quote';
import {assignedAdviser,paymentBreakdown,preliminaryNote,roiReference} from '@/lib/commercial';

export function CommercialFields({quote,settings,onChange}:{quote:QuoteInput;settings:Settings;onChange:(patch:Partial<QuoteInput>)=>void}){
 const adviser=assignedAdviser(quote,settings);
 const advisers=[...(settings.advisers??[])].sort((a,b)=>a.name.localeCompare(b.name,'es',{sensitivity:'base'}));
 return <section className="commercial-options"><h3>Etapa y responsable comercial</h3><div className="field-grid">
  <label>Tipo de propuesta<Select value={quote.proposalType??'final'} onValueChange={proposalType=>onChange({proposalType:proposalType as 'preliminary'|'final',technicalReviewed:false})}><SelectTrigger aria-label="Tipo de propuesta"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="preliminary">Precotización · antes de la visita</SelectItem><SelectItem value="final">Cotización final · después de la visita</SelectItem></SelectContent></Select></label>
  <label>Comercial asignado<Select value={quote.adviserId||'none'} onValueChange={id=>onChange({adviserId:id==='none'?'':id})}><SelectTrigger aria-label="Comercial asignado"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">Contacto general de la empresa</SelectItem>{advisers.map(a=><SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></label>
 </div>{adviser&&<p className="help-text">{adviser.email} · {adviser.phone}</p>}
 {quote.proposalType==='preliminary'?<p className="notice">{preliminaryNote}</p>:<label className="check-label"><Checkbox checked={quote.technicalReviewed} onCheckedChange={v=>onChange({technicalReviewed:v===true})}/>El comercial y el instalador revisaron modelos, compatibilidad, estructura y alcance tras la visita técnica.</label>}
 <h3>Documento para el cliente</h3><label className="check-label"><Checkbox checked={quote.showItemDetails!==false} onCheckedChange={v=>onChange({showItemDetails:v===true})}/>Mostrar detalle de equipos y servicios</label><p className="help-text">{quote.showItemDetails===false?'El documento mostrará el resumen del proyecto y los totales, sin desglosar los ítems.':'El documento incluirá los equipos, cantidades e importes por ítem.'} Se aplica a la vista previa, impresión y PDF compartido.</p>
 </section>;
}

export function PaymentSummary({total,settings}:{total:number;settings:Settings}){
 const rows=paymentBreakdown(total,settings);
 if(!rows.length)return null;
 return <section className="payment-summary"><h3>Distribución de pagos</h3><div className="field-grid">{rows.map(row=><div key={row.label}><span>{row.label} · {row.percent}%</span><strong>{money(row.amount)}</strong></div>)}</div></section>;
}

export function RoiReference({quote,calculation,settings}:{quote:QuoteInput;calculation:Calculation|null;settings:Settings}){
 if(!settings.roiReference)return null;
 const result=calculation?roiReference(quote,calculation,settings):null;
 return <section className="roi-reference"><h3>Referencia de ahorro y retorno</h3><p className="section-caption">Ejemplo del cliente · {settings.roiReference.source} · Uso interno</p>
 <p>La planilla contiene ahorros mensuales fijos por cantidad de paneles de {settings.roiReference.panelWatts} W. No define tarifa, ubicación, autoconsumo ni valorización de excedentes, y no distingue inversores o baterías. Esta referencia no se incorpora al PDF del cliente.</p>
 {result?<><div className="field-grid"><div><span>Ahorro mensual de referencia</span><strong>{money(result.monthly)}</strong></div><div><span>Referencia anual (× 12)</span><strong>{money(result.annual)}</strong></div><div><span>Recuperación simple de referencia</span><strong>{result.years.toLocaleString('es-CL',{maximumFractionDigits:2})} años</strong></div></div><p className="help-text">Inversión actual {money(calculation!.total)} ÷ referencia anual {money(result.annual)}. No incluye mantenimiento, degradación, financiamiento ni variaciones de tarifa.</p>{result.exceedsBill&&<p className="notice" role="status">El ahorro de la planilla supera el monto de la boleta. Hay que aclarar si incluye ingresos por excedentes; no puede presentarse como reducción garantizada de la cuenta.</p>}</>:<p className="notice">No hay una referencia aplicable a esta selección. No se extrapolan valores a otras potencias, cantidades sin datos o propuestas con importes incompletos.</p>}
 </section>;
}
