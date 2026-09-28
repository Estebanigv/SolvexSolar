# Solvex Solar — Cotizador

Plataforma privada de propuestas fotovoltaicas. Next.js 16 en Vercel, Supabase Auth, Postgres y Storage. Cotización en cuatro etapas: cliente y boleta, equipos, instalación, revisión y envío.

## Datos privados y catálogo

El repositorio público contiene únicamente un catálogo ficticio para pruebas. El catálogo comercial recibido y el tarifario de instalación se cargan en `public.workspace_config` de Supabase, protegidos con RLS. No copiar precios reales, boletas, transcripciones OCR, correos de clientes ni credenciales al repositorio.

La aplicación carga productos, tarifas y condiciones desde la base privada. Los datos legales, IVA, modelos, garantías y condiciones pendientes deben validarse antes de aprobar documentos. El cálculo de instalación usa el tarifario guardado en la base; no vuelve a aplicar los factores incluidos en el Excel. Las fichas técnicas siguen pendientes de vinculación individual y validación de discrepancias.

## Supabase y permisos

Proyecto: `solvex-solar` (`oymuqllnmocfzmghbmcp`), organización `yqfpmervkqmynjjbudwf`, región São Paulo.

- `profiles`: cuentas vinculadas a Supabase Auth. Roles `pending`, `sales`, `admin`, `disabled`.
- `workspace_config`: catálogo, tarifas de instalación, configuración de empresa y revisión compartida.
- `clients`: datos de clientes y ejecutivo responsable.
- `quotes`: versiones inmutables, con copia de cliente, equipos, precios, cálculo y condiciones.
- Storage `boletas`: bucket privado, PDF/JPG/PNG, máximo 10 MB por archivo y dos posiciones por cotización.

Un ejecutivo consulta y modifica su cartera. Administración consulta el conjunto, edita el catálogo y autoriza otras cuentas. Un usuario pendiente o deshabilitado no tiene acceso a datos comerciales. Los permisos se consultan en la base, no en metadatos editables del usuario ni en encabezados del navegador. La sesión se verifica con Supabase y se renueva con Proxy; las respuestas privadas usan `Cache-Control: private, no-store`.

Los guardados de cotización y cliente son atómicos. Un conflicto de revisión del catálogo devuelve 409 sin dejar clientes huérfanos. El catálogo y el guardado de propuestas comparten un bloqueo transaccional. Las cuentas no pueden modificar su propio rol. Las propuestas guardadas no se sobreescriben: se crea una nueva revisión.

### Primera cuenta administradora

1. En Supabase Dashboard → Authentication → Users, crear la cuenta real con el correo autorizado. La contraseña la define su titular en un canal privado; no se almacena en código ni se publica en el chat.
2. Una cuenta nueva recibe el rol `pending`. Verificar su identidad/correo antes de habilitarla.
3. Desde SQL Editor, asignar `admin` a la cuenta autorizada (sustituir el marcador, no usar un correo inventado):

```sql
update public.profiles p set role = 'admin'
from auth.users u
where p.id = u.id and lower(u.email) = lower('CORREO_AUTORIZADO')
  and u.email_confirmed_at is not null;
```

4. Ingresar en `/acceso`. En **Usuarios**, autorizar al resto del equipo una vez creadas sus cuentas en Supabase Auth.

El alta, recuperación de contraseña e invitaciones se gestionan en Supabase Auth por ahora; no hay registro público ni invitaciones automáticas desde esta interfaz. Para enviar correos de acceso a personas externas al equipo del proyecto, configurar SMTP propio y las URL permitidas siguiendo la [documentación de Supabase](https://supabase.com/docs/guides/auth/auth-smtp). No desactivar la validación de correo para evitar ese requisito.

### Conexión

`lib/supabase/config.ts` incluye la URL y una clave **publishable** del proyecto. Es una clave pública destinada al navegador; la protección efectiva es Auth + RLS. No otorga acceso administrativo. Puede reemplazarse por las variables de Vercel:

```text
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

La aplicación no utiliza claves `service_role` o secretas. Nunca incorporarlas a Git o variables `NEXT_PUBLIC_*`.

Las migraciones versionadas están en `supabase/migrations/`. No incluyen el catálogo comercial ni una cuenta administradora. Para otro proyecto, aplicar las migraciones y cargar el catálogo privado validado por separado. No ejecutar la importación nuevamente sobre una configuración en uso.

## Clientes, cotizaciones y boletas

En el primer paso se puede seleccionar un cliente existente o registrar uno nuevo. **Guardar cliente** conserva la ficha sin exigir una propuesta completa. **Guardar en historial** conserva una versión de la cotización y su cliente; los cambios sin guardar siguen siendo temporales.

La cámara del celular (si el navegador es compatible) y la carga de PDF/JPG/PNG permiten adjuntar frente y reverso. PDF.js lee texto; Tesseract.js lee fotos y páginas escaneadas en español, ajustando orientación y revisando hasta seis páginas por PDF. El OCR se realiza en el dispositivo. La revisión permite corregir y seleccionar campos sin sobrescribir automáticamente datos existentes. No se toman contactos de atención o pagos de la distribuidora como contactos del cliente. No se garantiza extracción completa de todos los formatos.

Tras guardar una cotización, **Guardar boletas en esta cotización** respalda los archivos en el bucket privado. Antes de pulsarlo, los archivos solo están en memoria y desaparecen al recargar. El envío a Storage ocurre directamente desde el navegador autenticado, evitando el límite de cuerpo de las funciones de Vercel. En el historial, **Consultar boletas guardadas** genera enlaces privados que caducan en 60 segundos. Una nueva versión tiene su propio respaldo; no se sustituyen los archivos de versiones anteriores.

`npm run prebuild` y `npm run predev` generan `public/ocr/` con las dependencias de motor e idioma fijadas en el lockfile. La primera lectura necesita conexión para descargar esos recursos del mismo sitio.

## Energía y documentos

Los kWh y días proceden de la boleta y requieren revisión. El equivalente a 30 días es `kWh / días × 30`; no representa todo el año. La API `/api/energy/solar` utiliza PVGIS/JRC para estimar generación según ubicación, potencia y parámetros técnicos. No obtiene el consumo individual de una distribuidora ni acredita ahorro. La conexión CNE de consumo agregado sigue pendiente.

PDF, impresión y compartir archivo conservan los datos de la versión seleccionada. WhatsApp y correo abren un mensaje preparado; el PDF se adjunta manualmente. No hay envío automático. Ahorro, retorno, compatibilidad y condiciones requieren aprobación técnica/comercial.

## Desarrollo y verificación

Node.js 22.x. Vercel usa Next.js, `npm run build` y `.next`.

```sh
npm ci
npm test
npm run build
npm run start
```

Con la app iniciada, ejecutar `TEST_BASE_URL=http://127.0.0.1:3000 node tests/next-smoke.mjs` (ajustar la sintaxis de la variable a la terminal). Comprueba acceso privado, bloqueo de APIs y encabezados falsificados. `supabase/tests/access.sql` verifica aislamiento, roles, revocación y transacciones con registros sintéticos dentro de un `ROLLBACK`. Las comprobaciones no incorporan datos reales a las pruebas.

Para una prueba autenticada con una cuenta temporal expresamente autorizada, `tests/authenticated-smoke.mjs` toma `TEST_CREDENTIALS_FILE` (JSON local ignorado con `id`, `email`, `password`) y `TEST_BASE_URL`. Solo acepta el dominio ficticio de pruebas, crea cliente/cotización sintéticos y verifica catálogo, cálculo, historial y cierre de sesión. El operador debe revocar y eliminar después esa cuenta y sus registros; no usar cuentas reales ni comprometer el archivo de credenciales.

La revisión de seguridad no informó problemas de RLS. El aviso de protección contra contraseñas filtradas corresponde a una función disponible desde el plan Pro; se mantuvo el plan gratuito autorizado. [Detalle y configuración de Supabase](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Los comandos `dev:sites`, `build:sites` y `start:sites` conservan el adaptador anterior de Sites/D1. La identidad de Sites solo se acepta en ese entorno; nunca en Vercel.
