# CRM Solvex: referencia y alcance

Revisión del 26 de octubre de 2026 en la cuenta de referencia autorizada de [GoHighLevel](https://app.gohighlevel.com). Inspección de oportunidades, ficha comercial, tareas, notas y directorio de contactos. No se importaron registros ni se guardaron cambios en la cuenta de referencia.

## Patrones observados y adaptación

| Referencia | Solvex |
| --- | --- |
| Tablero por etapas, cantidad y monto por columna | Una oportunidad por proyecto; las revisiones no duplican el valor |
| Nuevo Prospecto, No Contesta, En Contacto, Cotizado, Visita Terreno, Negociación, Cierre de Venta | Nuevos leads, No contesta, Contactado, Calificado, En cotización, Propuesta enviada, Visita técnica, En seguimiento, Negociación, Ganado y Perdido |
| Origen, etiquetas y responsable | Ficha del cliente compartida con sus proyectos; responsable según permisos existentes |
| Fecha estimada de cierre y motivo de pérdida | Campos por lead o proyecto, independientes del próximo contacto |
| Tareas y notas en la oportunidad | Agenda por cliente e historial de notas compartido con Clientes |
| Filtros por estado | Todas, abiertas, ganadas y perdidas, combinables con búsqueda, responsable, origen y prioridad |
| Smart Lists y filtros de oportunidades | Vistas calculadas: hoy y vencidos, vencidos, sin próximo contacto, cierre este mes y sin cambios en siete días |
| Orden y control de columnas | Orden por atención, cambios recientes, monto o cierre; filtro de leads/proyectos y opción de ocultar etapas vacías |
| Notas, tareas e información comercial en la ficha | Pestaña Actividad con notas, creación y finalización de tareas, compartida entre los proyectos del cliente |
| Cierre y motivo de pérdida | Confirmación al cambiar a Ganado o Perdido desde la ficha o el tablero, con motivo de pérdida y limpieza del próximo contacto |

La segunda revisión incluyó las listas inteligentes de contactos, el tablero de oportunidades y una ficha de prueba de Enerlife. Se adaptaron los patrones de organización; los datos de ejemplo de Solvex son ficticios.

Las vistas de seguimiento excluyen oportunidades cerradas y usan la fecha de Santiago. Sus contadores respetan los filtros actuales. La vista de actividad presenta eventos de notas y tareas; no es un registro de auditoría ni registra automáticamente llamadas o mensajes externos.

El panel conserva los filtros y la vista al pasar al cotizador y volver. Al regresar vuelve a consultar la misma fuente de datos para mostrar cambios guardados en las cotizaciones. La vista `/dev/crm` usa datos de demostración en memoria; `/crm` usa la sesión y las tablas existentes del cotizador.

## Conexión con el cotizador existente

- El historial ofrece **Ver en CRM** para abrir directamente el proyecto de una cotización activa. Las revisiones del mismo proyecto abren la misma oportunidad y muestran su versión vigente.
- Después de guardar, la cabecera del cotizador ofrece **Ver esta cotización en CRM**. El guardado también actualiza las referencias del historial y del selector de clientes.
- Las propuestas de prueba no ofrecen ese acceso. Si el proyecto ya no está disponible, se informa sin abrir otro proyecto del cliente por error.
- La demo tiene un enlace **Abrir CRM con datos reales**, que conduce a `/crm` con la autenticación normal. No copia datos ficticios a la base ni comparte sesiones entre dominios.
- Verificación del 2 de noviembre de 2026: la base compartida contiene las tres migraciones del CRM y mantiene RLS habilitada en clientes, cotizaciones, seguimiento, notas, tareas y perfiles comerciales. La comprobación de navegación con una cuenta real en localhost requiere iniciar sesión en ese origen. La publicación del frontend queda separada de esta integración local.

En Solvex, la etapa registra avance comercial: no envía una propuesta, no confirma pagos y no agenda automáticamente una visita. La visita se coordina mediante una tarea con fecha. El motivo de pérdida se conserva al reabrir una oportunidad y puede editarse o borrarse. El historial anterior puede guardar un seguimiento sin borrar los campos nuevos de cierre.

El CRM implementado no incluye sincronización con GoHighLevel, bandeja omnicanal, envío automático, publicidad, pagos, pronósticos ponderados ni edición de múltiples embudos. Esas funciones requieren integraciones o definiciones adicionales.

## Validación

- Pruebas de modelos, rutas, sesiones, origen y conflictos entre versiones.
- Pruebas de vistas, fechas de Santiago, exclusión de cierres y ordenamiento sin modificar los datos de origen.
- Navegación desde revisiones al proyecto correcto, exclusión de propuestas de prueba y ausencia de desvíos a otros proyectos del cliente.
- Integración del 2 de noviembre: suite completa y compilación de producción correctas; prueba HTTP sobre producción local confirma acceso privado en `/` y `/crm`, rechazo de sesiones ausentes, encabezados falsificados y solicitudes de otros orígenes. La prueba con cuenta real queda pendiente: el usuario inició sesión en el dominio publicado, no en localhost.
- SQL transaccional en `supabase/tests/crm.sql`, `crm-work.sql` y `crm-sales.sql`: aislamiento por ejecutivo, autoría, permisos y campos de cierre.
- Compilación de producción y revisión visual local con datos ficticios.
