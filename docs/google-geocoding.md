# Coordenadas con Google Maps

La ruta autenticada `/api/energy/location` consulta Geocoding API desde el servidor. No se usa una clave pública ni se envían nombre, correo, teléfono o boleta.

## Configuración pendiente de habilitación

1. Seleccionar/crear el proyecto Google Cloud autorizado para Solvex Solar.
2. Verificar facturación y habilitar Geocoding API. Acordar cuota diaria antes de activar consumo.
3. Crear una clave dedicada y restringirla exclusivamente a Geocoding API. Las restricciones de HTTP referrer no sirven para esta llamada de servidor. Usar restricción IP únicamente si el despliegue tiene salida IP fija.
4. Guardar la clave en Vercel Production como `GOOGLE_MAPS_GEOCODING_API_KEY` (sensible). Para pruebas locales, usar `.env.local` ignorado por Git. No usar `NEXT_PUBLIC_`.
5. Redeploy y verificar desde una sesión autenticada con una dirección conocida. Confirmar que latitud/longitud coinciden con el inmueble antes de usar PVGIS.

## Comportamiento

- Búsqueda explícita; no se consulta mientras el usuario escribe.
- País Chile, comprobación de comuna/región, exclusión de centroides de ciudad.
- Números de oficina/departamento no forman parte de la búsqueda del edificio.
- Una comuna contradictoria genera un aviso específico; no se sustituye automáticamente.
- `ROOFTOP` con número coincidente y sin `partial_match` se considera dirección numerada; los demás resultados se marcan aproximados.
- Google Maps se utiliza para la atribución y para abrir las coincidencias en el mapa.
- Se conserva `googlePlaceId`, pero no las coordenadas Google en borradores ni cotizaciones persistidas; se vuelven a consultar al recuperar. Las coordenadas manuales conservan el comportamiento anterior.
- La limitación local de dos segundos es orientativa por instancia, no una cuota global. El control efectivo de consumo debe configurarse en Google Cloud.

Documentación: https://developers.google.com/maps/documentation/geocoding/guides-v3/requests-geocoding
Políticas: https://developers.google.com/maps/documentation/geocoding/policies
