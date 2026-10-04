# Croquis con Gemini / Nano Banana

## Estado

Piloto local implementado y compilado el 3 de octubre de 2026. El propietario eligió **SolvexSolar**, proyecto `gen-lang-client-0608726042`, en la cuenta `solvexsolar.cl@gmail.com`. Su clave existente quedó en `.env.local`, ignorado por Git. La consulta real de metadatos confirmó acceso a **Nano Banana 2**, modelo `gemini-3.1-flash-image`. No se generaron imágenes ni se activó facturación desde esta revisión.

La cuenta Gmail se usa para entrar a Google AI Studio; no se necesita acceso al correo ni su contraseña dentro del cotizador. Google todavía muestra Free tier. Falta que el propietario complete facturación para el proyecto elegido y acuerde el presupuesto de prueba.

## Piloto disponible en local

- Ruta `/dev/croquis`: fotografía PNG/JPG de hasta 4 MB, número de paneles, indicaciones y selección entre croquis o fotomontaje.
- Requiere sesión administradora; la clave se usa únicamente en servidor. El control de conexión también requiere sesión.
- `npm run gemini:check` verifica clave y modelo sin generar imágenes. Comprobado correctamente con la clave elegida.
- La generación permanece deshabilitada: `GEMINI_IMAGE_GENERATION_ENABLED` debe seguir sin definir o en `false` hasta confirmar facturación y presupuesto.
- Al habilitar el piloto se permiten tres intentos por proceso local, uno a la vez y sin reintentos automáticos. No es un límite persistente de producción: reiniciar el servidor restablece el contador.
- El resultado se puede revisar y descargar. No se guarda en la cotización ni se añade al PDF todavía.
- El piloto responde 404 en producción. No se ha configurado la clave en Vercel ni publicado esta integración.
- Validación: pruebas de cliente con respuestas simuladas, compilación de producción y comprobación en navegador del bloqueo sin sesión. Generación real pendiente.

## Para probar con la cuenta personal

1. Acceso a Google AI Studio: https://aistudio.google.com/apikey
2. Proyecto de pruebas elegido por el propietario y una clave para Gemini, restringida a esa API. Guardarla en el servidor como GEMINI_API_KEY, nunca como NEXT_PUBLIC ni en Git. No pegar claves en documentos de entrega.
3. Facturación y cuota para el modelo de imágenes, con presupuesto de prueba aprobado. Las alertas de Google no equivalen a un límite duro de gasto: implementar también límite de generaciones por usuario/proyecto y control de concurrencia.
4. Una fotografía de techo de prueba que se pueda enviar a Google, con número de paneles, modelo/dimensiones, zonas disponibles y obstáculos. Para una prueba inicial, usar material de demostración sin datos personales.
5. Confirmar el resultado visual esperado: croquis conceptual, fotomontaje sobre el techo o ambos.

Modelo a verificar al activar: gemini-3.1-flash-image (Nano Banana 2). El modelo debe configurarse en servidor para poder cambiarlo según disponibilidad; comprobar documentación y precio al activar, no fijar una promesa comercial de costo.

## Flujo de aplicación a implementar

- Cargar foto del proyecto, conservar original y orientación.
- Equipo define parámetros técnicos y autoriza generación con la foto indicada.
- Servidor autenticado valida archivo, límites, origen, propiedad del proyecto y cuota interna; la clave nunca llega al navegador.
- Generar una propuesta visual conservando geometría y perspectiva. El dibujo es referencial: la IA no valida resistencia, sombras, distancias reglamentarias ni ingeniería.
- Previsualizar original y croquis, editar o descartar. No incluir en PDF hasta aprobación expresa de un integrante.
- Guardar imagen aprobada, usuario, fecha, modelo y parámetros en almacenamiento privado vinculado a la versión de la cotización. Las revisiones conservan su imagen, no se sobrescribe el histórico.
- Incluir únicamente el croquis aprobado en la propuesta, con nota de alcance y sin prompts internos.

## Paso a cuenta Solvex

Usar un proyecto propiedad de la empresa con su facturación y una clave nueva. Probar primero en entorno de revisión, cambiar el secreto del servidor y verificar generación/guardado/PDF. Mantener disponibles los archivos históricos aunque la nueva cuenta tenga otra clave. Revocar el acceso personal después de comprobar la migración.

Google Maps es una integración distinta, con GOOGLE_MAPS_GEOCODING_API_KEY. Tener una clave de Gemini no habilita geocodificación.

## Fuentes oficiales consultadas

- https://ai.google.dev/gemini-api/docs/api-key
- https://ai.google.dev/gemini-api/docs/image-generation
- https://ai.google.dev/gemini-api/docs/pricing
