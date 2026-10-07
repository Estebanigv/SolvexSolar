# Estilos personales de cotización

En Ver propuesta → Editar propuesta → Diseño y mi estilo cada integrante puede elegir tipografía (Arial/Helvetica, Times o Courier), tamaño (85–115%), colores de texto, acentos, bloques, páginas y portada, y mostrar u ocultar la fotografía.

- **Guardar propuesta** conserva el estilo dentro de la nueva versión de esa cotización.
- **Guardar como mi estilo** conserva únicamente las preferencias visuales del usuario conectado.
- **Aplicar mi estilo** reutiliza esas preferencias en la cotización abierta. La aplicación es explícita: no altera cotizaciones anteriores ni las de otros integrantes.
- **Restaurar diseño Solvex** devuelve los valores visuales originales en la propuesta actual.

Los textos, números y bloques se editan con las herramientas de contenido existentes. El HTML y el PDF comparten composición, medidas de tipografía, colores y paginación. El aumento de tamaño puede generar páginas adicionales.

Las preferencias se almacenan mediante Supabase Auth en los metadatos del usuario autenticado; no requieren migración. Los metadatos de estilo no conceden permisos. El endpoint verifica sesión y membresía; la escritura valida origen y esquema estricto. No acepta un identificador de otro usuario. Las cotizaciones antiguas sin estilo utilizan el diseño Solvex.

En modo demostración el estilo se guarda solamente en el navegador y la interfaz lo indica.

Validación: pruebas de aislamiento de cuentas, errores de autenticación/origen/guardado, esquema y persistencia; tipografías HTML/PDF, tamaño máximo, paginación y fotografía opcional; revisión visual de un PDF de tres estilos. No se realizó una prueba interactiva de navegador.
