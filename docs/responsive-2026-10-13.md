# Adaptación a pantallas pequeñas · 13 de octubre de 2026

## Cambios

- Navegación de escritorio de 220 px entre 1024 y 1439 px. El menú sigue siendo plegable; en móvil conserva el panel superpuesto desplazable.
- Formulario en una columna y total accesible en la barra inferior hasta 1439 px. Al plegar el menú, la barra ocupa el ancho libre.
- Cabecera, títulos y etapas más compactos en pantallas de poca altura, sin escalar ni reducir todo el sitio.
- Campos adaptados al espacio real del formulario mediante consultas de contenedor.
- Cantidades de equipos con etiqueta encima del campo. Selectores y botones largos admiten varias líneas.
- Propuesta ajustada al ancho por defecto y ampliación opcional para leer. El desplazamiento horizontal queda dentro de cada página.
- Panel de edición de 280 px en notebooks; en anchos menores, vista previa y herramientas se apilan. El diseño impreso y el PDF mantienen sus dimensiones.

## Verificación

- Cuatro etapas del cotizador con datos de ejemplo a 320, 390, 768, 1024, 1280, 1366 y 1920 px de ancho CSS. Se reprodujeron y corrigieron los desbordes de cantidades a 390 px y de revisión a 320 px.
- Menú móvil a 320 px: apertura, cierre y desplazamiento vertical de las opciones.
- Vistas locales de usuarios, historial, clientes, catálogo y actividad a 320 px: sin desborde horizontal de la página.
- Editor a 390 y 1366 px: herramientas accesibles, documento ajustado y ampliación contenida sin ensanchar el diálogo.
- TypeScript, suite existente de pruebas (incluidos cálculo y PDF) y revisión de espacios de Git.

Los ensayos locales no guardaron cotizaciones ni modificaron clientes. La configuración temporal utilizada para revisar el formulario sin sesión se retiró antes del commit; no forma parte de estos cambios.
