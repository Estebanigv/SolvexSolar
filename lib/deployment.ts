// Persistence is now provided by Supabase on Next.js and by D1 on Sites.
export const isDemoDeployment = false;

export function demoUnavailable() {
  return Response.json({
    code: 'PERSISTENCE_NOT_CONFIGURED',
    error: 'Esta demostración no guarda datos. El acceso privado y el historial están pendientes de conectar.',
  }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
}
