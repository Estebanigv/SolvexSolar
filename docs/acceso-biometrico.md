# Face ID y claves de acceso

La PWA usa WebAuthn mediante Supabase Auth (SDK fijado en 2.117.2), no una contraseña guardada ni un bloqueo visual. La firma se verifica en Supabase y recién entonces se emite la sesión habitual. El servidor conserva `requireMember` y los permisos/RLS existentes. Una cuenta suspendida no obtiene acceso a las cotizaciones por registrar una clave.

## Activación del servicio

Proyecto Supabase: `oymuqllnmocfzmghbmcp` (solvex-solar).
En Authentication → Passkeys:

- Enable Passkey authentication: activado.
- Relying Party Display Name: `Solvex Solar`.
- Relying Party ID: `cotizador.solvexsolar.cl`.
- Relying Party Origins: `https://cotizador.solvexsolar.cl`.

No cambiar el RP ID una vez registradas claves: las dejaría inutilizables. No agregar dominios de preview. El SDK exige `experimental.passkey: true`; Supabase documenta esta API como experimental. Revisarla al actualizar dependencias.

## Uso por cada persona

1. Ingresar con la cuenta existente en el dominio de producción.
2. Abrir el menú de la cuenta → Face ID y claves de acceso.
3. Pulsar Activar en este dispositivo y confirmar en el sistema del celular.
4. En el siguiente ingreso, usar Ingresar con Face ID o huella.

Se requiere HTTPS, conexión y un autenticador de plataforma compatible. El navegador solo informa disponibilidad general; no permite a la web conocer si la persona tiene específicamente Face ID activado. El sistema operativo decide si solicita rostro, huella o PIN. Las claves pueden sincronizarse en el gestor del dispositivo. No se fuerza registro ni autenticación al cargar la página.

La lista pertenece al usuario autenticado, permite revocar cada clave con confirmación y conserva el acceso por contraseña. Eliminar una clave no cierra sesiones ya abiertas. Cambiar la contraseña tampoco elimina las claves; deben revocarse desde este panel si procede.

## Verificación

- Pruebas automáticas: dominio exacto, contexto seguro, capacidades ausentes/negadas, cancelación y errores de configuración/desafío/límite. No se exponen errores internos.
- Verificar configuración real antes de anunciar disponibilidad.
- Prueba física pendiente por el titular: registrar desde la PWA en iPhone, cerrar sesión, ingresar con Face ID, cancelar un intento y comprobar acceso por contraseña. Repetir en Android con huella. Nunca registrar una clave del operador en la cuenta de otra persona para realizar pruebas.

Referencia: https://supabase.com/docs/guides/auth/passkeys

## Comprobación del servicio (14-10-2026)

Configuración habilitada con autorización del titular. `auth.passkey.startAuthentication()` pasó de `passkey_disabled` a emitir un desafío válido con RP `cotizador.solvexsolar.cl`. La verificación del dispositivo solicitada por el servicio es `preferred` (valor nativo de Supabase); no es una política de exigir exclusivamente reconocimiento facial. La aplicación utiliza el flujo oficial completo y no emite sesiones por su cuenta.

Las pruebas de TypeScript y la suite del cotizador pasan. La compilación local de producción se detuvo al quedar sin progreso; la compilación de Vercel debe verificarse antes de dar por publicado el cambio.

La revisión de seguridad no requirió modificar RLS. Conserva el aviso previo sobre [protección contra contraseñas filtradas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) desactivada y la tabla privada de correlativos sin política directa (no se concede acceso por este cambio).
