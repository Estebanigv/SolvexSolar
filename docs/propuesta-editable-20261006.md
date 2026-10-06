# Cotización horizontal y edición antes de emitir

Implementación basada en la minuta del 5 de octubre de 2026 y en los comentarios del archivo `02_Solvex_Atlas_solar REV1.pptx` enviado por Waldo.

## Uso

1. Abre **Ver propuesta**, desde el cotizador o el historial.
2. Pulsa **Editar propuesta**. Selecciona una página y modifica sus títulos, textos y descripciones.
3. Usa **Mostrar** para retirar o recuperar páginas y bloques. Puedes agregar textos, agregar páginas y cambiar el orden de las páginas.
4. En **Total y pagos**, ajusta el total en pesos chilenos, aplica el valor y modifica las etapas de pago. Sus porcentajes deben sumar 100%; los montos se calculan desde el mismo total.
5. En **Ahorro y gráficos**, ajusta y valida los supuestos para incluir el análisis. Al cambiar el proyecto, vuelve a validar el escenario. En una cotización final, confirma además la revisión técnica de esta versión.
6. Pulsa **Guardar propuesta** y luego **Emitir cotización para cliente** para descargar o compartir el PDF.

El guardado crea una versión nueva con su vínculo a la anterior y conserva las boletas recuperadas de la cotización original. Los cambios se guardan al pulsar Guardar; Cancelar permite descartarlos. Las cotizaciones antiguas emitidas conservan su salida original hasta que se cree una nueva versión.

## Diseño y datos

- A4 horizontal con fotografía integrada, logo transparente, líneas verdes y tipografía más grande.
- Portada con nombre, comuna y fecha del cliente, tipo de sistema, inversión y ahorro validado.
- Sin la página de croquis eliminada en el referente.
- Contenido editable como texto, nunca HTML ejecutable. Los importes financieros se editan en sus controles y actualizan pagos e impuestos conjuntamente.
- El HTML usa texto SVG seleccionable y el PDF conserva texto vectorial. Ambos comparten el mismo modelo de contenido y paginación.
- Los párrafos largos continúan en otra hoja; los títulos extensos usan una composición alternativa para evitar recortes.

## Verificación local

Pruebas automatizadas de persistencia, compatibilidad con cotizaciones emitidas, CLP, pagos, descuento, validación de proyección, contenido oculto, páginas nuevas, orden, escape HTML, tamaño horizontal y paginación de textos largos. Muestra de cuatro páginas revisada visualmente en PDF con datos ficticios.
