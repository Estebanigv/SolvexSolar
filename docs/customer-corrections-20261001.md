# Correcciones del cotizador — 1 de octubre de 2026

## Documento del cliente

La vista previa, impresión y PDF presentan cantidad de paneles, potencia total y modelos seleccionados de paneles, inversores y baterías. On Grid e híbrido indican Netbilling; Off Grid no. Las baterías solo aparecen si forman parte de la configuración. Se retiraron las partidas con precios y el resumen de subtotal, descuento, neto e IVA. Se conserva el precio final de portada y los hitos de pago.

El detalle completo permanece en el cotizador interno y en el cálculo guardado. Los antiguos controles de visibilidad de partidas ya no condicionan el resumen técnico del documento del cliente.

## Cálculo e instalación

- Paneles, estructura y material de techo usan la cantidad de paneles seleccionada. Se normaliza también al guardar en el servidor.
- El servicio de instalación se toma de una única ficha de catálogo por sistema, categoría `SERVICIO DE INSTALACIÓN`, y se multiplica por paneles.
- Las tarifas omitidas en la importación original se recuperaron de la columna D de Valores cotizador, en el catálogo privado. No se publican precios privados en este repositorio.
- Un importe manual de instalación es un total con IVA y requiere motivo. No se multiplica de nuevo. La tabla histórica de totales permanece como compatibilidad si el catálogo no tiene ficha unitaria.
- Los metros de cable, unidades de inversores y baterías mantienen sus cantidades independientes. La potencia kWp suma únicamente paneles.
- No se recalculan ni modifican las versiones de cotizaciones ya guardadas al editar el catálogo.

## Verificación

- Pruebas automáticas de cinco sistemas, cantidades 1, 8, 11, 16 y 33, IVA incluido/neto, instalación manual, precios faltantes y conservación de snapshots.
- Se comprobaron totales antes de descuento y potencia en las 18 hojas de los tres archivos de ejemplos. Para esa comparación se usaron los precios de cada hoja. La instalación se obtuvo del total informado dividido por paneles exclusivamente como adaptación del dato de prueba, no como tarifa nueva aprobada.
- Diferencias de origen: OFF GRID / Hoja5 repite para 9 paneles el total de instalación usado con 8. OFF GRID / OFF usa 35% de descuento y tiene una diferencia de $100.000 entre un total manual y el calculado. Se conserva el límite vigente de 30%.
- PDF de On Grid, Off Grid e híbrido generado y revisado; descarga real desde navegador comprobada. Vista previa comprobada en escritorio y móvil.
- Compilación de producción con Node 22 y TypeScript completada.

Las fichas, cotizaciones y precios privados utilizados para verificar se mantienen fuera de Git.
