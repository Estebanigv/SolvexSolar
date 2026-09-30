# Solvex Solar — Manual de uso

Versión de revisión local: 29 de septiembre de 2026. La disponibilidad depende de la publicación y las migraciones pendientes. No contiene credenciales.

## Acceso y cuenta personal

1. Ingresa con tu correo y contraseña en la pantalla de acceso. Cada integrante debe usar su propia cuenta para identificar sus modificaciones.
2. En Usuarios puedes cambiar tu contraseña y tu color de identificación. El equipo comienza con rol administrador.
3. Todos los administradores pueden cambiar precios maestros, configuración y accesos. La futura separación de permisos debe acordarse antes de aplicarla.

## Cliente y lectura de boleta

1. Selecciona un cliente registrado o crea uno con nombre, correo y teléfono. También puedes cotizar sin boleta y completar los datos manualmente.
2. Carga hasta 8 archivos PDF, JPG o PNG, o usa la cámara del teléfono. Revisa nombre, dirección de suministro, monto, consumo, días, distribuidora y tarifa.
3. Al corregir la boleta, elige primero región y luego una de sus comunas. Marca los campos que quieres aplicar.
4. Los códigos de barras o QR pueden contener solo una referencia de pago. No reemplazan la revisión de la boleta ni garantizan encontrar todos los datos.
5. El consumo mensual equivalente se obtiene de los kWh y días del período. Marca la revisión del consumo solo después de comprobar la boleta.

## Ubicación y generación solar

1. En Ubicación del proyecto, completa dirección, comuna y región. Buscar coordenadas por dirección envía esos tres datos a Photon/Komoot; no envía la boleta ni los datos de contacto.
2. Revisa las coincidencias, abre el mapa si hace falta y elige Usar esta ubicación. Puedes corregir latitud y longitud manualmente. Cambiar la dirección invalida las coordenadas anteriores.
3. En Revisión y envío puedes consultar PVGIS para una estimación de generación solar. Esta consulta no obtiene el consumo del cliente ni garantiza ahorro. La API CNE sigue pendiente.

## Equipos, instalación y precios

1. Selecciona el sistema, equipos, cantidades e instalación. Revisa los adicionales y descuentos. El catálogo recibido ya incluye margen comercial: el sistema no calcula utilidad real.
2. Actualiza los precios de referencia únicamente en Equipos y precios y guarda el catálogo. Cambiar cantidades o descuentos de una propuesta no cambia los precios maestros.
3. Para un importe manual de instalación, escribe el motivo. Las fichas técnicas y compatibilidad de los modelos deben validarse antes de aprobar la propuesta final.
4. No se incluyen plazos de instalación ni la dirección física de la empresa en el documento del cliente.

## Revisión, crédito verde y documento

1. Revisa las etapas anteriores y asigna el comercial responsable. Una precotización está sujeta a visita; la cotización final requiere revisión técnica.
2. Activa o desactiva Mostrar detalle de equipos y servicios según lo acordado con el cliente. El total no cambia.
3. Revisa la observación de crédito verde. Puedes editarla o excluirla. Es acompañamiento para gestionar financiamiento con una entidad financiera, no un medio de pago ni crédito otorgado por Solvex.
4. Guarda una versión en el historial y revisa su PDF. El documento conserva los datos comerciales de esa versión; las cotizaciones anteriores no se modifican al editar el catálogo.
5. Descarga el PDF, imprime o utiliza Compartir/WhatsApp. Según el navegador, tendrás que adjuntar el archivo manualmente. En correo también debes adjuntar el PDF. Abrir una aplicación no confirma el envío.

## Clientes, cotizaciones y resumen

1. En Clientes puedes buscar, crear y corregir datos. Administración puede enviar un registro a la papelera y restaurarlo; las cotizaciones y boletas guardadas se conservan.
2. En Cotizaciones revisa las versiones, filtra por responsable y registra la fecha y el canal del envío realizado. El calendario usa esa fecha registrada manualmente.
3. En Resumen selecciona un mes para consultar versiones creadas, enviadas, pendientes de envío y montos de propuestas completas. No son indicadores de ventas cobradas.
4. Cada versión guardada cuenta por separado. Las propuestas en papelera se excluyen. Los responsables provienen del comercial asignado o, si no existe, del autor.

## Auditoría y trazabilidad

1. En Actividad consulta usuario, fecha y cambios registrados en precios, equipos, clientes, cotizaciones y usuarios.
2. La auditoría registra cambios de datos; no es un historial de cada clic, navegación o inicio de sesión.
3. El resumen, historial ampliado, papelera, colores y auditoría necesitan las actualizaciones de base de datos correspondientes. Si aparece un aviso de actualización pendiente, esa función aún no está habilitada en ese entorno.

## Prueba de aceptación por integrante

Usar registros de prueba autorizados. Completar una copia por integrante; anotar fecha, entorno y resultado.

- [ ] Ingresar con la cuenta propia y cerrar sesión correctamente.
- [ ] Cambiar la contraseña y verificar el color personal.
- [ ] Cargar una boleta de prueba y confirmar cliente, región, comuna, monto, kWh, días y distribuidora.
- [ ] Probar el ingreso manual sin boleta y revisar la ubicación del proyecto.
- [ ] Cotizar equipos e instalación; comprobar descuentos y totales.
- [ ] Guardar y descargar dos propuestas: una con detalle y otra sin detalle; revisar crédito verde y garantías.
- [ ] Compartir el PDF por WhatsApp/correo y comprobar el archivo adjunto; registrar el envío en el historial.
- [ ] Revisar el resumen mensual y la actividad por responsable.
- [ ] Corregir un cliente de prueba, enviarlo a papelera y restaurarlo.
- [ ] Modificar un precio de prueba y comprobar autor, fecha y valores en Actividad; restablecer el precio correcto.

Nombre: __________  Fecha: __________  Entorno: __________

Observaciones y evidencias: __________
