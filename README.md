# Solvex Solar — Cotizador

Plataforma comercial para preparar propuestas fotovoltaicas, con React y TypeScript. Incluye Next.js nativo para Vercel y comandos separados de Vinext para Sites/Cloudflare.

> **Este repositorio público incluye datos de demostración.** Los precios comerciales, documentos privados, registros de clientes, credenciales e identidad del alojamiento de la empresa no se publican aquí. La plataforma privada conserva su catálogo real.

## Experiencia

- Navegación lateral y cotización en tres etapas: sistema, instalación y cliente.
- Selección visual de cinco tipos de sistema, catálogo editable y total en tiempo real.
- Resumen accesible en celular, validaciones y confirmación antes de reiniciar.
- Historial de versiones, vista previa, descarga PDF e impresión.
- WhatsApp y correo abren un mensaje preparado; el PDF se adjunta manualmente. No incluye envío automático.

## Consumo y estudio solar

En **Cliente y revisión → Perfil energético**, registrar los kWh y días reales de la boleta, distribuidora y tarifa. El equivalente a 30 días se calcula como `kWh / días × 30`; no se obtiene dividiendo el monto en CLP ni se presenta como consumo anual. Confirmar la revisión de la boleta. Los campos acompañan al documento y al payload de cotización; las cotizaciones antiguas siguen siendo compatibles. La extracción automática desde archivos queda pendiente de la boleta de ejemplo y no se simula.

**Generación solar:** `GET /api/energy/solar` consulta PVGIS 5.3 / JRC (Comisión Europea), base PVGIS-ERA5. Recibe `latitude`, `longitude`, `peakPower` (kWp), `tilt` (0–90°), `azimuth` (convención PVGIS: 0 sur, 180 norte, -90 este, 90 oeste) y `loss` (0–50%). Utiliza un proveedor fijo, validación de entrada y respuesta, tiempo máximo de consulta de 12 segundos y caché del proveedor de 24 horas. No requiere claves. No envía nombres, boletas ni datos de contacto. Devuelve generación anual y mensual en kWh, período meteorológico, fuente y parámetros. `400` indica parámetros inválidos; `422`, ubicación/configuración sin datos; `502/503`, respuesta incompleta o fuente no disponible. No se devuelven estimaciones ficticias como respaldo.

Ejemplo: `/api/energy/solar?latitude=-33.45&longitude=-70.66&peakPower=4.4&tilt=30&azimuth=180&loss=14`.

Los valores iniciales de 30° y 14% son supuestos editables, no parámetros validados del proyecto. El cálculo usa módulos de silicio cristalino y montaje libre; no modela baterías, sombras cercanas, limitaciones del inversor ni ahorro. La estimación queda fuera del PDF comercial mientras no exista un método aprobado. Al cambiar los parámetros se invalida el resultado visible.

**Consumo por comuna:** todavía no conectado. Al revisar la CNE el 28-09-2026, el enlace de API de Energía Abierta estaba en mantenimiento y la descarga comunal devolvía una página de error. No se inventan promedios regionales ni se usa radiación como consumo. El [catálogo oficial](https://energiaabierta.cne.cl/categorias-estadistica/electricidad?_sft_etiquetas-estadistica=consumo) sigue enlazado. El [Explorador de Energía de Chile](https://api.exploradorenergia.cl/) requiere solicitar registro; esta implementación utiliza la alternativa pública PVGIS y no afirma estar conectada a la CNE.

Fuente y parámetros: [documentación oficial de PVGIS](https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/using-pvgis-5/api-non-interactive-service_en).

## Vercel

Importar este repositorio con el directorio raíz `./` y el framework **Next.js**. `vercel.json` fija `npm run build` y la salida `.next`; `package.json` fija Node.js `22.x`. No seleccionar Vite ni utilizar `dist` como salida.

El build anterior ejecutaba Vinext y generaba archivos para Cloudflare Workers. Ese resultado no sirve como salida de Next.js en Vercel.

En Vercel se puede configurar una propuesta, calcular importes, revisar el documento, descargar PDF e imprimir. **El acceso privado, el guardado del catálogo y el historial todavía no están integrados en Vercel.** Los cambios permanecen en pantalla y se pierden al recargar o cerrar. La interfaz muestra este límite y deshabilita el guardado. Las APIs responden `503 PERSISTENCE_NOT_CONFIGURED`; no guardan en memoria ni simulan una operación exitosa.

Para una instalación comercial en Vercel falta conectar:

1. Un proveedor de autenticación que verifique identidad y usuarios autorizados.
2. Una base de datos persistente con el esquema de `db/schema.ts` (o una migración equivalente), aislamiento por usuario y control de revisiones.
3. El catálogo y las condiciones comerciales validados, cargados de forma privada.

La sesión de ChatGPT y el enlace D1 del sitio anterior **no se transfieren con GitHub**. Los encabezados `oai-authenticated-user-*` no se aceptan como identidad en Next.js. No habilitar acceso público a las APIs para eludir esta protección ni colocar secretos en variables `NEXT_PUBLIC_*`.

La decisión del entorno se toma en la compilación. `next.config.ts` utiliza un adaptador que bloquea almacenamiento no configurado; los comandos de Sites conservan sus enlaces originales. Esta corrección no migra la base de datos privada ni constituye una instalación comercial completa.

## Desarrollo con Next.js

Requiere Node.js 22.x.

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
npm run start
```

Con el servidor de producción iniciado, en otra terminal:

```sh
node tests/next-smoke.mjs
```

La comprobación HTTP valida página, logo y rechazo de lectura/guardado, incluso con encabezados de identidad falsificados. `TEST_BASE_URL` permite comprobar otra dirección.

## Sites / Cloudflare

Se conserva este entorno como alternativa separada:

```sh
npm run dev:sites
npm run build:sites
npm run start:sites
```

Estos comandos requieren Sites, su autenticación y Cloudflare D1. La identidad local simulada es únicamente para desarrollo. Para aplicar la migración local después de compilar con Sites:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_spotty_dexter_bennett.sql
```

## Datos y publicación

`lib/catalog.json` contiene productos y tarifas ficticios para desarrollo. `lib/documents.ts` contiene una lista genérica de pendientes. Integrar datos comerciales solamente en un entorno privado autorizado. No sustituir el catálogo real de una instalación existente con esta demostración.

La configuración `.openai/hosting.json` conserva los enlaces lógicos de almacenamiento y omite el identificador del sitio privado. Registrar una instalación propia mediante Sites antes de publicar allí. En Vercel, la integración Git puede desplegar cada actualización de `main`.

En Sites, las APIs validan la identidad y separan los registros por usuario. Cada cotización conserva una copia de sus precios y condiciones; se recalcula en el servidor. La instalación ya incluye los factores del tarifario, y nunca se aplica un segundo margen. El IVA y las condiciones deben validarse antes de emitir documentos reales.

## Límites

No se calculan ahorros ni compatibilidad eléctrica sin información técnica validada. Requiere conexión para guardar. El catálogo no se sincroniza con Drive. El historial devuelve las 100 versiones más recientes. Las fuentes PDF estándar cubren texto latino.

La fuente Manrope se distribuye con su licencia OFL en `public/fonts/OFL.txt`.
