'use client';
import {Input} from '@/components/ui/input';
import {money,type QuoteInput,type InstallationRates} from '@/lib/quote';
export function InstallationPanel({quote,panels,rates,onChange}:{quote:QuoteInput;panels:number;rates:InstallationRates;onChange:(patch:Partial<QuoteInput>)=>void}){
 const rate=rates.find(r=>r.panels===panels),manual=quote.installationOverride!==null,value=manual?quote.installationOverride:rate?.price;
 return <section className="installation-pricing"><div className="installation-box"><div><h3>Instalación de {panels} paneles</h3><p>{manual?'Total excepcional aprobado':'Total según tabla Servicio Instalación'}</p><small>IVA incluido · Se suma una sola vez al precio del proyecto.</small></div><strong>{value!=null?money(value):'Sin tarifa'}</strong></div>
 {!rate&&!manual&&<p role="alert">No hay tarifa para esta cantidad. Solicita un total aprobado y utiliza el ajuste excepcional.</p>}
 <label className="installation-toggle"><input type="checkbox" checked={manual} onChange={e=>onChange({installationOverride:e.target.checked?(rate?.price??0):null,installationNote:''})}/>Usar un total excepcional de instalación</label>
 {manual&&<div className="field-grid"><label>Total excepcional (CLP, IVA incluido)<Input type="number" min={0} aria-label="Valor manual de instalación" value={quote.installationOverride??0} onChange={e=>onChange({installationOverride:Math.max(0,Number(e.target.value)||0)})}/><small>Reemplaza la tabla. Un valor de $0 significa instalación sin cobro.</small></label><label>Motivo y aprobación<Input value={quote.installationNote} onChange={e=>onChange({installationNote:e.target.value})} placeholder="Indica quién aprobó el ajuste y por qué"/></label></div>}
 <p className="help-text">El ajuste cambia la inversión total del cliente. El costo de instalación se mantiene en el detalle interno y no se muestra por separado en el PDF.</p></section>;
}
