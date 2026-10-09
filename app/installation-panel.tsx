'use client';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {money,type QuoteInput,type InstallationRates} from '@/lib/quote';
import './installation-panel.css';
export function InstallationPanel({quote,panels,rates,onChange}:{quote:QuoteInput;panels:number;rates:InstallationRates;onChange:(patch:Partial<QuoteInput>)=>void}){
 const rate=rates.find(r=>r.panels===panels);
 const manual=quote.installationOverride!==null;
 const applied=manual?quote.installationOverride:rate?.price;
 const restoreAutomatic=()=>onChange({installationOverride:null,installationNote:''});
 return <section className="installation-pricing" aria-label="Servicio de instalación">
  <div className="installation-box installation-automatic">
   <div>
    <span className="installation-mode">Cálculo automático por paneles</span>
    <h3>Instalación de {panels} paneles</h3>
    <p>Total según tabla Servicio Instalación. Se actualiza al cambiar la cantidad de paneles en Equipos.</p>
    <small>Pesos chilenos · IVA incluido</small>
   </div>
   <div className="installation-rate">
    <strong aria-label="Total automático de instalación">{rate?money(rate.price):'Sin tarifa'}</strong>
    <span>{manual?'Referencia automática':'Aplicado al proyecto'}</span>
   </div>
  </div>
  {!rate&&<p role="alert">No hay tarifa automática para {panels} paneles. Solicita un total aprobado y utiliza el ajuste manual.</p>}
  <div className="installation-manual">
   <label className="installation-toggle"><input type="checkbox" checked={manual} onChange={e=>e.target.checked?onChange({installationOverride:Math.round(rate?.price??0),installationNote:''}):restoreAutomatic()}/>Usar ajuste manual de instalación (opcional)</label>
   <p>El cálculo automático permanece visible como referencia. Activa el ajuste solo si necesitas un total distinto para este proyecto.</p>
   {manual&&<>
    <div className="field-grid">
     <label>Total manual (CLP, IVA incluido)<Input type="number" min={0} step={1} aria-label="Valor manual de instalación" value={Math.round(quote.installationOverride??0)} onChange={e=>onChange({installationOverride:Math.max(0,Math.round(Number(e.target.value)||0))})}/><small>Reemplaza el total automático. Un valor de $0 significa instalación sin cobro.</small></label>
     <label>Motivo y aprobación<Input value={quote.installationNote} onChange={e=>onChange({installationNote:e.target.value})} placeholder="Indica quién aprobó el ajuste y por qué"/></label>
    </div>
    <Button type="button" variant="outline" onClick={restoreAutomatic}>Volver al cálculo automático</Button>
   </>}
  </div>
  <div className="installation-applied" role="status" aria-label="Instalación aplicada al proyecto">
   <span>Total de instalación aplicado <small>{manual?'Ajuste manual':'Cálculo automático'} · IVA incluido</small></span>
   <strong>{applied!=null?money(applied):'Por definir'}</strong>
  </div>
  <p className="help-text">Se suma una sola vez al precio del proyecto. El costo de instalación se mantiene en el detalle interno y no se muestra por separado en el PDF.</p>
 </section>;
}
