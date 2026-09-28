"use client";
import {useEffect, useRef, useState} from 'react';
import {Activity, ExternalLink, MapPin, Sun, LoaderCircle} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Checkbox} from '@/components/ui/checkbox';
import {consumptionSummary, newEnergyInput, solarSourceUrl, type EnergyInput, type SolarEstimate} from '@/lib/energy';

const number = (value: number) => value.toLocaleString('es-CL', {maximumFractionDigits: 1});
const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export function EnergyPanel({value, peakPower, onChange}: {
  value?: EnergyInput; peakPower: number; onChange: (value: EnergyInput) => void;
}) {
  const energy = value ?? newEnergyInput();
  const consumption = consumptionSummary(energy);
  const [result, setResult] = useState<{key: string; data: SolarEstimate} | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const query = {latitude: energy.latitude, longitude: energy.longitude, peakPower,
    tilt: energy.tilt, azimuth: energy.azimuth, loss: energy.loss};
  const queryKey = JSON.stringify(query);
  const currentKey = useRef(queryKey);
  currentKey.current = queryKey;
  const current = result?.key === queryKey ? result.data : null;
  useEffect(() => () => controller.current?.abort(), []);
  function edit(patch: Partial<EnergyInput>) {
    setError('');
    onChange({...energy, ...patch, billReviewed: ('consumptionKwh' in patch || 'billingDays' in patch || 'distributor' in patch || 'tariff' in patch) ? false : patch.billReviewed ?? energy.billReviewed});
  }
  async function consult() {
    controller.current?.abort();
    const control = new AbortController();
    controller.current = control;
    setLoading(true); setError(''); setResult(null);
    try {
      const params = new URLSearchParams(Object.entries(query).map(([key, value]) => [key, String(value)]));
      const response = await fetch(`/api/energy/solar?${params}`, {signal: control.signal});
      const body = await response.json() as SolarEstimate & {error?: string};
      if (!response.ok) throw new Error(body.error || 'No se pudo obtener la estimación solar.');
      if (currentKey.current === queryKey) setResult({key: queryKey, data: body as SolarEstimate});
    } catch (e) {
      if (!control.signal.aborted && currentKey.current === queryKey) setError((e as Error).message);
    } finally {
      if (controller.current === control) setLoading(false);
    }
  }
  return <section className="energy-panel" aria-labelledby="energy-title">
    <div className="energy-heading"><span className="energy-icon"><Activity size={20}/></span><div><h3 id="energy-title">Perfil energético</h3><p>El consumo de la boleta es la base del estudio.</p></div><span className="energy-badge">{energy.billReviewed && consumption ? 'Boleta revisada' : 'Por completar'}</span></div>
    <div className="field-grid energy-fields">
      <label>Consumo de la boleta (kWh)<Input type="number" min={0} max={1e8} step="any" value={energy.consumptionKwh ?? ''} placeholder="Ej. 350" onChange={e => edit({consumptionKwh: e.target.value === '' ? null : Math.max(0, Number(e.target.value))})}/></label>
      <label>Días del período facturado<Input type="number" min={1} max={366} step={1} value={energy.billingDays ?? ''} placeholder="Ej. 30" onChange={e => edit({billingDays: e.target.value === '' ? null : Math.min(366, Math.max(1, Math.round(Number(e.target.value))))})}/></label>
      <label>Distribuidora<Input maxLength={120} value={energy.distributor} placeholder="Como aparece en la boleta" onChange={e => edit({distributor: e.target.value})}/></label>
      <label>Tarifa eléctrica<Input maxLength={50} value={energy.tariff} placeholder="Ej. BT1" onChange={e => edit({tariff: e.target.value})}/></label>
    </div>
    {consumption && <div className="consumption-result" role="status"><div><span>Consumo diario</span><strong>{number(consumption.dailyKwh)} <small>kWh/día</small></strong></div><div><span>Equivalente a 30 días</span><strong>{number(consumption.equivalent30DaysKwh)} <small>kWh</small></strong></div><p>Normalizado desde {energy.billingDays} días. Una boleta no representa todo el año; solicita 12 meses para revisar la estacionalidad.</p></div>}
    <label className="bill-review"><Checkbox disabled={!consumption} checked={energy.billReviewed} onCheckedChange={v => edit({billReviewed: v === true})}/>Verifiqué estos datos en la boleta del cliente.</label>
    <details className="solar-study"><summary><Sun size={18}/><span>Estimar generación solar por ubicación<small>Consulta pública de PVGIS · Comisión Europea</small></span></summary>
      <div className="solar-study-body">
        <p>Usa las coordenadas del proyecto y ajusta los supuestos según el techo. La potencia seleccionada es <strong>{peakPower.toLocaleString('es-CL', {maximumFractionDigits: 3})} kWp</strong>.</p>
        <div className="field-grid energy-fields">
          <label>Latitud<Input type="number" step="any" min={-56.6} max={-17} value={energy.latitude ?? ''} placeholder="Ej. -33.45" onChange={e => edit({latitude: e.target.value === '' ? null : Number(e.target.value)})}/></label>
          <label>Longitud<Input type="number" step="any" min={-110} max={-66} value={energy.longitude ?? ''} placeholder="Ej. -70.66" onChange={e => edit({longitude: e.target.value === '' ? null : Number(e.target.value)})}/></label>
          <label>Inclinación del panel (°)<Input type="number" min={0} max={90} value={energy.tilt} onChange={e => edit({tilt: Number(e.target.value)})}/></label>
          <label>Orientación del panel<select value={energy.azimuth} onChange={e => edit({azimuth: Number(e.target.value)})}><option value={180}>Norte</option><option value={-135}>Noreste</option><option value={-90}>Este</option><option value={-45}>Sureste</option><option value={0}>Sur</option><option value={45}>Suroeste</option><option value={90}>Oeste</option><option value={135}>Noroeste</option></select></label>
          <label>Pérdidas del sistema (%)<Input type="number" min={0} max={50} step="any" value={energy.loss} onChange={e => edit({loss: Number(e.target.value)})}/></label>
        </div>
        <p className="energy-explanation"><MapPin size={15}/>La consulta envía únicamente coordenadas y parámetros técnicos. No envía la boleta ni los datos de contacto.</p>
        <Button className="solar-consult" variant="outline" disabled={loading || energy.latitude === null || energy.longitude === null || peakPower <= 0} onClick={consult}>{loading ? <LoaderCircle className="animate-spin"/> : <Sun/>}{loading ? 'Consultando fuente solar…' : current ? 'Actualizar estimación' : 'Consultar generación solar'}</Button>
        {error && <p className="energy-error" role="alert">{error}</p>}
        {result && !current && <p className="energy-explanation" role="status">Los parámetros cambiaron. Consulta nuevamente para actualizar la estimación.</p>}
        {current && <div className="solar-result" aria-live="polite">
          <span>Generación anual estimada</span><strong>{number(current.annualKwh)} <small>kWh/año</small></strong>
          <p>{current.source.database} · Datos meteorológicos {current.source.firstYear}–{current.source.lastYear}</p>
          <div className="solar-months" aria-label="Generación estimada por mes">{current.monthly.map(row => <div key={row.month}><span className="solar-bar-track" aria-hidden="true"><span style={{height: `${Math.max(2, row.kwh / Math.max(1, ...current.monthly.map(m => m.kwh)) * 100)}%`}}/></span><strong>{number(row.kwh)}</strong><span>{months[row.month-1]}</span><span className="sr-only">kWh estimados</span></div>)}</div>
          <p>Estimación preliminar de producción fotovoltaica. No equivale a ahorro ni autoconsumo y no modela baterías, sombras cercanas o límites del inversor. Requiere revisión técnica; no se incorpora al PDF comercial.</p>
          <a href={current.source.url} target="_blank" rel="noreferrer">Consultar fuente y metodología <ExternalLink size={13}/></a>
        </div>}
        {!current && <a className="energy-source" href={solarSourceUrl} target="_blank" rel="noreferrer">Fuente: PVGIS / JRC <ExternalLink size={13}/></a>}
      </div>
    </details>
    <p className="energy-reference">Consumo por comuna: integración CNE pendiente de una fuente operativa. Los datos agregados de una zona no reemplazan el consumo del cliente. <a href="https://energiaabierta.cne.cl/categorias-estadistica/electricidad?_sft_etiquetas-estadistica=consumo" target="_blank" rel="noreferrer">Ver catálogo oficial</a>.</p>
  </section>;
}
