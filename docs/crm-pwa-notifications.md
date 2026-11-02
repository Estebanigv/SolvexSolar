# CRM móvil y avisos de Solvex Solar

- En pantallas de hasta 700 px, los filtros se abren con «Filtrar y ordenar». El tablero muestra una etapa seleccionable; las vistas Lista y Contactos se presentan como tarjetas.
- La campana muestra únicamente avisos del usuario conectado, incluso para administradores.
- Activación voluntaria por dispositivo: campana → Activar notificaciones. iPhone/iPad requiere la app agregada a inicio y un sistema compatible con Web Push.
- Nuevas asignaciones: trigger de clients, con exclusión de autoasignaciones. Reasignar preserva el historial del cliente; el anterior responsable deja de tener acceso al aviso.
- Recordatorio diario desde las 09:00 America/Santiago (hasta las 19:00 si hubo interrupción): un resumen por usuario y fecha. Cuenta tareas pendientes y próximos contactos hoy/vencidos, de leads sin cotizar y proyectos vigentes. Excluye clientes eliminados, cotizaciones de prueba y oportunidades cerradas. Abre «Ver tareas» o «Ver contactos».
- Vercel Cron ejecuta /api/notifications/dispatch cada 5 minutos. Autorización Bearer CRON_SECRET, solo producción.
- VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY se configuran en producción, nunca se guardan en Git. La clave pública llega al navegador mediante la API autenticada.
- El worker usa la clave publicable de Supabase y RPC dedicadas con secreto de 256 bits. No necesita service_role. private.crm_push_config conserva únicamente SHA-256 del secreto. Las funciones comprueban ese secreto antes de operar.
- RLS limita la bandeja a su destinatario activo y dueño actual del cliente. Dispositivos y entregas están en el esquema privado, sin permisos directos para anon/authenticated. Avisos del linter sobre las RPC SECURITY DEFINER son intencionales: la RPC de dispositivos exige usuario activo; las del worker exigen el secreto. Las tablas privadas tienen RLS sin políticas y sin grants.
- El remitente acepta únicamente endpoints HTTPS oficiales de Apple, Google, Mozilla y Windows. Payload cifrado Web Push; la pantalla bloqueada no muestra el nombre del lead.
- Entregas por dispositivo, deduplicación, lotes de 40, leases de 5 minutos, hasta 5 intentos y reintentos a 10 minutos. HTTP 404/410 elimina el dispositivo. Un tag estable evita avisos duplicados visibles si se pierde la confirmación.
- Los dispositivos nuevos reciben eventos futuros, no una avalancha de avisos históricos. Dispositivos sin renovación por 90 días expiran. La bandeja conserva 90 días.
- Cerrar sesión anula la suscripción de este navegador. Una cuenta diferente debe activar su propio dispositivo.
- El service worker solo recibe push: no almacena páginas ni datos de clientes sin conexión. Abrir el aviso crea una ventana del CRM para conservar una cotización en edición.
- Sonido, vibración, modo silencio y entrega final dependen del sistema operativo y permisos del usuario.

## Verificación
npm test
npm run build
node tests/crm-assignment-db.mjs

La última prueba usa PostgreSQL aislado en Docker y no modifica producción. Cubre carteras, RLS, reasignaciones, avisos personales, endpoints, cambios de usuario en el dispositivo, leases, reintentos y resumen diario en hora chilena.
