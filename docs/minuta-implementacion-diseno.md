# Minuta Solvex: implementación y pendientes

Revisión local del 3 de octubre de 2026. Este archivo es una guía de desarrollo, no contenido del panel del cliente.

## Implementado en esta revisión

- Portada fotográfica continua: fotografía a todo el ancho, logo transparente, título y nombre del cliente sobre la imagen. Se elimina la base rectangular del logo y la duplicación de la marca.
- Vista previa y generador PDF con la misma dirección visual: inversión y potencia agrupadas, pagos por etapas, garantías legibles y condiciones organizadas por tema. Los textos siguen siendo texto seleccionable, no páginas convertidas en imágenes.
- Porcentaje de ahorro/beneficio respecto de la boleta. La boleta se mensualiza con monto / días facturados × 365 / 12. Funciona con ahorro automático y manual. No compara Off Grid contra una boleta de red ni publica el análisis sin validación previa del equipo.
- Barra visual y explicación de la base de comparación. Beneficios superiores al 100% conservan el porcentaje real; la barra se limita a su ancho y el texto aclara que puede incluir excedentes.
- Revisión de saltos de página, textos largos, logo PNG y compatibilidad con antiguos llamados que entregan el logo JPG.

## Funciones solicitadas ya presentes en el código, comprobadas con pruebas

- Categorías al agregar/editar equipos y eliminación del catálogo conservando cotizaciones guardadas.
- Folio correlativo y emisión antes de exportar un documento final.
- Descuento editable y check para destacarlo u ocultarlo al cliente sin modificar el total.
- TE1/TE4 excluyentes y múltiples servicios adicionales personalizados.
- Ahorro automático desde generación solar y consumo, con edición manual y aprobación técnica.
- Condiciones, vigencia y garantías editables por cotización.
- Calendario con cotizaciones creadas y conteos por responsable, además del registro de envíos.

Hay cambios locales acumulados sin publicar. Las pruebas no equivalen a confirmar una instalación en producción.

## Pendiente / dependencia externa

- Selección final del diseño por Daniel/Carol y fotografías de instalaciones reales de Solvex. Las actuales son referenciales, como se indica en el documento.
- Integración de croquis con Gemini/Nano Banana: no hay clave configurada ni llamadas a esa API en el sistema. Ver nano-banana-integracion.md.
- Activación de Google Geocoding: el código local requiere GOOGLE_MAPS_GEOCODING_API_KEY. Su configuración es independiente de Gemini y no ha sido publicada.
- Validación técnica de supuestos de ahorro, tarifas de excedentes, perfil horario y autonomía Off Grid.
- Listado comercial de categorías adicionales que no estén cubiertas; no se inventaron categorías.
- Privilegios para futuros vendedores: la minuta los condiciona a incorporar más equipo de ventas. Se conserva la instrucción vigente de que los usuarios actuales son administradores.
- Migración/validación de buzones y catálogos/imágenes de Fulltec: no se verificaron ni modificaron en esta revisión de diseño.

## Verificación

- Suite de pruebas local completa aprobada.
- Compilación de producción aprobada en directorio aislado, con Node 22.
- Vista previa inspeccionada en computador y ancho móvil; fotografías cargadas y sin desborde horizontal.
- Edición de ahorro de $105.000 a $85.000 comprobada en navegador: porcentaje de 86,3% a 69,9% para boleta de $120.000 / 30 días.
- PDF de muestra de cinco páginas revisado visualmente; se corrigió una línea huérfana. Datos y precios de muestra no corresponden a una oferta real.
- El navegador Chrome reporta un aviso de hidratación por el atributo data-google-analytics-opt-out agregado por una extensión. No proviene de los componentes del rediseño.

## Recurso de marca

Logo integrado: public/proposal/logo-transparent-v2.png. Fuente original conservada: public/logo.jpg.
Se utilizó la herramienta integrada de generación/edición de imágenes, no Nano Banana. La salida tiene canal alfa y se comprobó sobre la fotografía.
Prompt final: "Extract the original Solvex logo from image 1 with HARD CRISP EDGES on actual alpha transparency. Keep all exact original white lettering and green rays/cells intact and colored. Everything dark navy blue in original must be fully transparent, including between rays, cells and letter holes. Absolutely NO glow, NO halo, NO blurred color aura, NO vignette, NO shadow. Flat clean print-ready logo cutout. Do not add any new shape or lettering. Preserve text SOLVEX / SOLAR / PROYECTOS QUE ILUMINAN. Transparent pixels outside actual logo strokes must have alpha 0. Modest empty padding. Output a transparent PNG."
