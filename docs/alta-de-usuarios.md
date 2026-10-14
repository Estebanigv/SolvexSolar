# Alta de usuarios

Todos los administradores activos pueden usar **Usuarios → Agregar usuario**.
Ingresan nombre, correo y contraseña inicial (12 a 72 caracteres, máximo 72 bytes),
confirman la contraseña y crean una cuenta administradora. La contraseña se entrega
de forma privada y se puede cambiar desde la propia cuenta; no se envía por correo.

La ruta `/api/members/create` valida origen, sesión y rol en la base de datos.
Invoca `member-create` con la sesión del solicitante. La función vuelve a validar el
token mediante `auth.getUser` y consulta el rol actual antes de usar Auth Admin.
Su verificación JWT de gateway está desactivada porque la autenticación explícita
admite las claves de firma actuales de Supabase; esto no habilita acceso anónimo.
Las claves de servicio permanecen en el entorno de la función, nunca en Vercel ni
en el navegador.

El trigger existente crea el perfil pendiente y la promoción a administrador usa
la conexión del solicitante, con RLS y la auditoría existentes. Si falla la promoción,
la cuenta queda pendiente y el mensaje indica autorizarla desde Usuarios. Un correo
duplicado nunca modifica una cuenta existente ni su contraseña. Se rechazan nuevas
altas si ya se registraron cinco cuentas durante el último minuto.

Despliegue: publicar `supabase/functions/member-create` (incluido `deno.json`) antes
del frontend. No requiere cambios de esquema. Las pruebas automatizadas cubren
permisos, datos inválidos, duplicados, creación, autorización pendiente y privacidad.
La comprobación de producción no debe crear cuentas ficticias con acceso real.
