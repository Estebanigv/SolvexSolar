// A build-time constant supplied by next.config.ts, never a request header.
export const isDemoDeployment = process.env.NEXT_PUBLIC_APP_RUNTIME === 'nextjs';

export function demoUnavailable() {
  return Response.json({
    code: 'PERSISTENCE_NOT_CONFIGURED',
    error: 'Esta demostración no guarda datos. El acceso privado y el historial están pendientes de conectar.',
  }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
}
