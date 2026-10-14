# Emisión con información pendiente

La vista previa permite **Emitir con pendientes** cuando faltan contacto, datos energéticos, precios por completar, IVA o validaciones finales. El aviso es compacto, con los detalles cerrados inicialmente y enlaces a los campos correspondientes.

Se mantienen como mínimos el nombre del cliente, un importe finito mayor que cero y la ausencia de servicios incompatibles TE1/TE4. Los valores con formato inválido y los procesos de lectura/respaldo todavía en curso se corrigen o completan antes de guardar.

La base de datos calcula y conserva `issuanceWarnings` dentro de la versión emitida. No cambia precios, datos, aprobaciones ni registra un envío ficticio. Mantiene los controles de usuario activo y propietario/administrador, bloqueo transaccional, correlativo e idempotencia existentes.

Las advertencias aparecen en el HTML, impresión y PDF. El diseño horizontal añade una hoja de observaciones que no se puede ocultar desde el editor, con un aviso en portada. Los importes incompletos se identifican como parciales. Una nueva revisión debe emitirse nuevamente. Las versiones antiguas sin este campo no se modifican.

Validación: pruebas de emisión, ruta HTTP, composición HTML/PDF y paginación; prueba SQL con datos sintéticos y ROLLBACK (sin consumir folios ni crear cotizaciones reales). La vista `/dev/quote-issuance` permite probar la interacción sin guardar y está bloqueada en producción.
