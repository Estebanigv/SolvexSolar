# Productividad del espacio comercial

- Los borradores y archivos pendientes se recuperan por usuario y dispositivo mediante IndexedDB. No son copias en la nube. Se muestra un error si el navegador bloquea almacenamiento o una segunda pestaña cambió el borrador.
- La propuesta preliminar permite avanzar sin boleta. Los datos de energía siguen pendientes de validar; una propuesta final requiere consumo y revisión técnica.
- Crear revisión conserva la relación con el proyecto original. El resumen cuenta proyectos únicos y suma la última revisión enviada en cada mes, excluyendo la papelera.
- Clientes → Ver ficha reúne contacto, versiones, boletas privadas y notas con autor/fecha. El estado comercial y próximo contacto se comparten entre revisiones; no envían mensajes automáticamente.
- Usuarios muestra último acceso y última modificación por separado. El historial de accesos conserva la última fecha conocida anterior a su activación y registra nuevos inicios de sesión. No acredita presencia en línea ni tiempo conectado.

## Publicación y verificación

Aplicar primero las migraciones `activity_log` y `workspace_productivity`. Son aditivas y se ejecutan en transacciones; los snapshots comerciales existentes no se sobrescriben. Antes de aplicar, ensayar con PostgreSQL aislado y datos ficticios. Ante fallo, comprobar rollback completo antes de reintentar. Para revertir la aplicación, desplegar el commit anterior conservando estas tablas y sus registros. Si el registro de accesos impide autenticar, deshabilitar únicamente el trigger `solvex_member_login` como administrador y revisar el error antes de habilitarlo otra vez.

La ruta privada `/api/workspace/health` devuelve 200 solamente si las estructuras y versión requeridas están disponibles. No contiene claves ni datos de clientes.

1. `npm test` y `npx tsc --noEmit`.
2. Build nativo con Node 22 en una carpeta separada del servidor de desarrollo.
3. `tests/productivity-database.sql` sobre el fixture aislado: revisiones, permisos, auditoría y acceso.
4. `node tests/productivity-smoke.mjs`, exclusivamente con una cuenta temporal autorizada en `.sites-runtime/test-auth.json`. Registra los IDs creados para su posterior limpieza; no modifica precios ni configuración. `TEST_BASE_URL` permite verificar local o producción.
5. `/dev/recovery` comprueba bytes originales tras recarga, conflicto de borradores y continuación del respaldo. `/dev/responsive` proporciona un viewport real de 390 px. Ambas rutas devuelven 404 en producción.
6. Eliminar archivos, registros y cuenta de pruebas; revocar sus sesiones. No incluir credenciales o archivos de prueba en Git.

La carga de archivos depende de los permisos del navegador. La cámara debe verificarse en un teléfono físico; una prueba de escritorio no valida hardware.
