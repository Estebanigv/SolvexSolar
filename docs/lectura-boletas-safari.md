# Lectura de códigos y compatibilidad con Safari

## Cambios
- Lector ZXing-C++ WebAssembly 3.1.5 local, dentro de un worker. Reconoce PDF417, QR, Code128, Code39, ITF, EAN13 y DataMatrix. Solo acepta símbolos válidos; no abre enlaces ni deduce consumo de referencias de pago.
- Motor servido por el propio dominio en /ocr/zxing_reader.wasm. Se prepara durante prebuild y predev. Si no carga, se intenta el lector básico y se muestra una advertencia.
- Los errores de arranque, carga o tiempo máximo del lector ya no se confunden con ausencia de códigos. Las lecturas con errores no quedan en caché.
- Alternativa HTMLImageElement cuando createImageBitmap no está disponible o rechaza una imagen.
- Visores y lector PDF usan la distribución legacy de PDF.js para incluir sus adaptaciones de compatibilidad.
- Se retiró una expresión regular con lookbehind de proposal-document, importada durante el arranque. Safari anterior a 16.4 no puede interpretar esa expresión y puede impedir cargar el cotizador entero.
- Compilación dirigida explícitamente a Safari/iOS 16, y pantalla recuperable de error. Esto no demuestra compatibilidad con todas las versiones o dispositivos.
- El resumen de lectura muestra también distribuidora y tarifa, y el mensaje distingue los códigos leídos de los campos autocompletados.

## Verificación
- Suite completa de pruebas de cálculo, cotizaciones, permisos y lectura aprobada.
- PDF417 con TED ficticio probado con píxeles reales, orientación normal y girada; imagen vacía sin falsos resultados.
- Flujo real en navegador local: archivo ficticio → worker → WASM local → resumen de receptor, folio y monto del timbre.
- TypeScript sin errores; lint de archivos afectados sin errores (advertencias existentes por miniaturas img locales).
- Foto COPELEC 1.jpeg: 900 × 1600. El timbre no se decodificó con el lector anterior ni con el nuevo, tampoco con recortes, ampliación y contraste. Se requiere una toma más cercana y enfocada; no se inventan datos. No se incluye esa foto privada en el repositorio.
- No hay un Safari físico disponible para validar el equipo de Nidia; faltan versión del sistema y comprobación en ese dispositivo. No se debe borrar su almacenamiento: puede contener cotizaciones pendientes.

## Escaneo en vivo (14 de octubre de 2026)
- Escanear código abre un lector de video. Iniciar cámara solicita la cámara trasera sin micrófono; detecta automáticamente QR, barras o PDF417 y adjunta solamente el fotograma detectado. Usar una foto conserva la captura alternativa.
- Un único worker se reutiliza, sin acumular fotogramas. La cámara se detiene al detectar, cancelar, ocultar la página o superar 90 segundos; una autorización tardía también libera la cámara.
- Prueba de navegador con MediaStream de un PDF417 ficticio: video → worker → detección → imagen adjunta → resumen de un código leído. No utiliza una cámara física ni documentos de clientes.
- Pruebas de permisos denegados, cancelación y autorización tardía aprobadas. La comprobación física en el iPhone de Nidia sigue pendiente.

## Direcciones partidas en fotos (14 de octubre de 2026)
- La extracción conserva la continuación de la dirección de suministro (departamento y comuna), incluso con confusiones OCR Deplo/Deplto. No toma la continuación de la dirección postal si hay dirección de suministro ni une direcciones entre documentos.
- La región se resuelve desde la comuna del cliente mediante el catálogo territorial existente. Direcciones de sucursales y subestaciones no se utilizan para ubicar al cliente.
- Si no se lee el año de emisión, se calcula la duración entre días/meses solo cuando es idéntica en años comunes y bisiestos. Un período que cruza febrero y depende del año permanece pendiente.
- Prueba local con las dos fotos COPELEC originales: 8 campos autocompletados frente a 5, incluida dirección con departamento, Chillán/Ñuble y 29 días. El consumo kWh permanece vacío porque no está visible. No se guardaron cotizaciones ni se incorporaron fotos o transcripciones privadas al repositorio.
- El banco de prueba solo en desarrollo permite consultar el texto OCR para diagnosticar variaciones del navegador. No se expone ese panel en producción.
