import {z} from 'zod';

export const energyInputSchema = z.object({
  consumptionKwh: z.number().finite().min(0).max(1e8).nullable(),
  billingDays: z.number().int().min(1).max(366).nullable(),
  distributor: z.string().max(120),
  tariff: z.string().max(50),
  latitude: z.number().finite().min(-56.6).max(-17).nullable(),
  longitude: z.number().finite().min(-110).max(-66).nullable(),
  googlePlaceId: z.string().min(1).max(500).optional(),
  solarGeneration: z.object({annualKwh:z.number().finite().min(0).max(1e10),context:z.string().max(1500),retrievedAt:z.string().datetime(),source:z.string().max(200)}).optional(),
  tilt: z.number().finite().min(0).max(90),
  azimuth: z.number().finite().min(-180).max(180),
  loss: z.number().finite().min(0).max(50),
  billReviewed: z.boolean(),
});
export type EnergyInput = z.infer<typeof energyInputSchema>;
export const newEnergyInput = (): EnergyInput => ({
  consumptionKwh: null, billingDays: null, distributor: '', tariff: '',
  latitude: null, longitude: null, tilt: 30, azimuth: 180, loss: 14, billReviewed: false,
});

// Google permits indefinite storage of place IDs, not of its geocoded coordinates.
// Keep coordinates in the current session and refresh them when a proposal is reopened.
export function persistentEnergy(input?:EnergyInput){
  return input?.googlePlaceId?{...input,latitude:null,longitude:null}:input;
}

// Bind generation to the actual project parameters; omit Google coordinates from persisted keys.
export function solarGenerationContext(input:EnergyInput,peakPower:number){
 return JSON.stringify({location:input.googlePlaceId?{placeId:input.googlePlaceId}:{latitude:input.latitude,longitude:input.longitude},peakPower,tilt:input.tilt,azimuth:input.azimuth,loss:input.loss});
}

export function consumptionSummary(input?: EnergyInput) {
  if (!input || input.consumptionKwh === null || input.billingDays === null) return null;
  const dailyKwh = input.consumptionKwh / input.billingDays;
  return {dailyKwh, equivalent30DaysKwh: dailyKwh * 30};
}

// Required numeric query parameters must not coerce an empty string to zero.
const queryNumber = (min: number, max: number) => z.string().trim().min(1)
  .transform(Number).pipe(z.number().finite().min(min).max(max));
export const solarQuerySchema = z.object({
  latitude: queryNumber(-56.6, -17), longitude: queryNumber(-110, -66),
  peakPower: queryNumber(0.01, 10000), tilt: queryNumber(0, 90),
  azimuth: queryNumber(-180, 180), loss: queryNumber(0, 50),
}).strict();
export type SolarQuery = z.infer<typeof solarQuerySchema>;
export type SolarEstimate = {
  source: {name: string; url: string; database: string; firstYear: number; lastYear: number};
  inputs: SolarQuery;
  annualKwh: number;
  monthly: {month: number; kwh: number}[];
  retrievedAt: string;
};
export const solarSourceUrl = 'https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis_en';

const nonnegative = z.number().finite().nonnegative();
const pvgisSchema = z.object({
  inputs: z.object({meteo_data: z.object({
    radiation_db: z.literal('PVGIS-ERA5'), year_min: z.number().int(), year_max: z.number().int(),
  })}),
  outputs: z.object({
    totals: z.object({fixed: z.object({E_y: nonnegative})}),
    monthly: z.object({fixed: z.array(z.object({month: z.number().int().min(1).max(12), E_m: nonnegative}))
      .length(12).refine(rows => new Set(rows.map(row => row.month)).size === 12)}),
  }),
});

export class SolarServiceError extends Error {
  constructor(message: string, public status: number) {super(message);}
}

export async function getSolarEstimate(input: SolarQuery, fetcher: typeof fetch = fetch): Promise<SolarEstimate> {
  const params = new URLSearchParams({
    lat: String(input.latitude), lon: String(input.longitude), peakpower: String(input.peakPower),
    angle: String(input.tilt), aspect: String(input.azimuth), loss: String(input.loss),
    raddatabase: 'PVGIS-ERA5', pvtechchoice: 'crystSi', mountingplace: 'free',
    usehorizon: '1', outputformat: 'json',
  });
  // Fixed upstream host: neither credentials nor bill/customer data are forwarded.
  const response = await fetcher(`https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?${params}`, {
    signal: AbortSignal.timeout(12000), headers: {Accept: 'application/json'},
    next: {revalidate: 86400},
  });
  if (!response.ok) {
    if (response.status === 400) throw new SolarServiceError('PVGIS no dispone de datos para esta ubicación o configuración. Revisa las coordenadas.', 422);
    throw new SolarServiceError('La fuente solar está temporalmente ocupada o no disponible. Vuelve a consultar en unos minutos.', 503);
  }
  const result = pvgisSchema.safeParse(await response.json());
  if (!result.success) throw new SolarServiceError('La fuente solar devolvió datos incompletos. Inténtalo nuevamente.', 502);
  const data = result.data;
  return {
    source: {name: 'PVGIS · Comisión Europea (JRC)', url: solarSourceUrl,
      database: data.inputs.meteo_data.radiation_db, firstYear: data.inputs.meteo_data.year_min,
      lastYear: data.inputs.meteo_data.year_max},
    inputs: input, annualKwh: data.outputs.totals.fixed.E_y,
    monthly: data.outputs.monthly.fixed.map(row => ({month: row.month, kwh: row.E_m})).sort((a,b) => a.month-b.month),
    retrievedAt: new Date().toISOString(),
  };
}
