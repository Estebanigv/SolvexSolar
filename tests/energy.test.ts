import assert from 'node:assert/strict';
import {consumptionSummary, newEnergyInput, energyInputSchema, solarQuerySchema, getSolarEstimate, SolarServiceError} from '../lib/energy';
import {quoteSchema, newQuote, calculate, initialProducts, initialSettings} from '../lib/quote';
import {workflowReadiness} from '../lib/workflow';
import {GET} from '../app/api/energy/solar/route';

async function run() {
  assert.equal(consumptionSummary(), null);
  assert.equal(consumptionSummary(newEnergyInput()), null);
  const bill = {...newEnergyInput(), consumptionKwh: 600, billingDays: 60, billReviewed: true};
  assert.deepEqual(consumptionSummary(bill), {dailyKwh: 10, equivalent30DaysKwh: 300});
  assert.equal(consumptionSummary({...bill, consumptionKwh: 0})?.equivalent30DaysKwh, 0);
  for (const bad of [{billingDays: 0}, {billingDays: 2.5}, {consumptionKwh: -1}, {consumptionKwh: Infinity}]) {
    assert.equal(energyInputSchema.safeParse({...bill, ...bad}).success, false);
  }
  assert.equal(quoteSchema.parse(newQuote()).energy, undefined, 'Older quotes remain readable');
  assert.deepEqual(quoteSchema.parse({...newQuote(), energy: bill}).energy, bill, 'Saving retains the bill fields');
  const q = {...newQuote(), energy: bill, technicalReviewed: true,
    customer: {name: 'Prueba', email: 'prueba@example.com', phone: '+56911111111', region: 'Metropolitana', commune: 'Santiago', address: '', bill: 50000}};
  assert.equal(workflowReadiness(q, initialProducts, calculate(q, initialProducts, initialSettings)).customer, true);
  const unreviewed = {...q, proposalType: 'final' as const, technicalReviewed: false};
  assert.equal(workflowReadiness(unreviewed, initialProducts, calculate(q, initialProducts, initialSettings)).customer, true, 'Customer data can be completed before the final technical review');
  assert.equal(workflowReadiness(unreviewed, initialProducts, calculate(q, initialProducts, initialSettings)).review, false);
  assert.equal(workflowReadiness({...q, energy: {...bill, billReviewed: false}}, initialProducts, calculate(q, initialProducts, initialSettings)).customer, false);
  assert.ok(calculate({...q, energy: undefined}, initialProducts, initialSettings).warnings.some(w => w.includes('kWh')));

  const input = {latitude:'-33.45',longitude:'-70.66',peakPower:'4.4',tilt:'30',azimuth:'180',loss:'14'};
  const parsed = solarQuerySchema.parse(input);
  for (const bad of [{latitude:''},{latitude:'NaN'},{longitude:'0'},{loss:'101'},{peakPower:'0'},{tilt:'91'},{url:'https://example.com'}]) {
    assert.equal(solarQuerySchema.safeParse({...input, ...bad}).success, false);
  }
  const invalid = await GET(new Request('http://localhost/api/energy/solar?latitude='));
  assert.equal(invalid.status, 400);
  assert.equal(invalid.headers.get('Cache-Control'), 'no-store');
  const response = {inputs:{meteo_data:{radiation_db:'PVGIS-ERA5',year_min:2005,year_max:2023}},
    outputs:{totals:{fixed:{E_y:1200}},monthly:{fixed:Array.from({length:12},(_,i)=>({month:i+1,E_m:100}))}}};
  let requested = '';
  const solar = await getSolarEstimate(parsed, (async (url: string | URL | Request) => {
    requested = String(url); return Response.json(response);
  }) as typeof fetch);
  assert.equal(new URL(requested).host, 're.jrc.ec.europa.eu');
  assert.equal(new URL(requested).searchParams.get('aspect'), '180', 'North in PVGIS coordinates');
  assert.equal(solar.annualKwh, 1200);
  assert.equal(solar.monthly.length, 12);
  assert.equal(solar.source.firstYear, 2005);
  assert.equal(solar.inputs.peakPower, 4.4);
  for (const status of [400,429,500,529]) {
    await assert.rejects(getSolarEstimate(parsed, (async () => new Response('', {status})) as typeof fetch),
      (e: unknown) => e instanceof SolarServiceError && e.status === (status === 400 ? 422 : 503));
  }
  for (const bad of [{}, {...response,outputs:{...response.outputs,monthly:{fixed:[{month:1,E_m:100}]}}}]) {
    await assert.rejects(getSolarEstimate(parsed, (async () => Response.json(bad)) as typeof fetch),
      (e: unknown) => e instanceof SolarServiceError && e.status === 502);
  }
  console.log('Energía: períodos, compatibilidad, estados, parámetros y errores de proveedor: OK');
}
void run().catch(error => {console.error(error); process.exitCode = 1;});
