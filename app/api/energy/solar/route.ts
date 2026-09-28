import {getSolarEstimate, solarQuerySchema, SolarServiceError} from '@/lib/energy';

export async function GET(request: Request) {
  const parsed = solarQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  const headers = {'Cache-Control': 'no-store'};
  if (!parsed.success) return Response.json({error: 'Revisa ubicación, potencia, inclinación, orientación y pérdidas.', code: 'INVALID_SOLAR_INPUT'}, {status: 400, headers});
  try {
    return Response.json(await getSolarEstimate(parsed.data), {headers});
  } catch (error) {
    return Response.json({
      error: error instanceof SolarServiceError ? error.message : 'No fue posible consultar la fuente solar. Inténtalo nuevamente.',
      code: 'SOLAR_SOURCE_UNAVAILABLE',
    }, {status: error instanceof SolarServiceError ? error.status : 503, headers});
  }
}
