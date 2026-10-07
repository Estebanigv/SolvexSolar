# Selección y edición individual

En Editar propuesta, pinchar un texto selecciona ese campo completo; pinchar el fondo de una caja selecciona su contenedor. Los controles aparecen al principio del panel izquierdo. También se puede seleccionar con Tab y Enter/Espacio.

- Texto: contenido, tipografía, tamaño en puntos, color y negrita.
- Caja: fondo, ancho y alto porcentuales, con accesos a su título, valor y descripción.
- Restaurar estilo de este elemento retira únicamente sus ajustes visuales.
- Los importes calculados se editan mediante los controles del cálculo; seleccionar el total abre el editor del total en CLP para mantener IVA y pagos consistentes.

Los cambios se guardan en proposalContent.elements con identificadores semánticos estables. Siguen asociados al campo al reordenar páginas. El esquema valida colores, tipografías y tamaños. Las cotizaciones antiguas siguen funcionando sin este campo.

Las dimensiones se ajustan mediante controles, no arrastrando tiradores. Los cambios individuales pertenecen a esta cotización; Mi estilo sigue guardando las preferencias generales. No hay edición de palabras individuales dentro de un párrafo ni posicionamiento libre.

SVG y PDF comparten la composición final, incluyendo fuentes distintas en una misma página. Los controles y bordes de selección solo aparecen en modo edición. Se avisa de desbordes/superposiciones al personalizar tamaños y se solicita corregirlos antes de guardar.

Verificación: pruebas del modelo, persistencia, aislamiento entre elementos, reordenación, texto continuado, validación, marcado accesible y PDF con fuentes mixtas; suite completa, TypeScript y ESLint. Revisión visual del PDF de cuatro páginas. Sin prueba interactiva en navegador.
