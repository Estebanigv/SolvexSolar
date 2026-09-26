# Solvex Solar — Cotizador

Plataforma comercial para preparar propuestas de sistemas fotovoltaicos, con React, TypeScript, Vinext y Cloudflare D1.

> **Este repositorio público incluye datos de demostración.** Los precios comerciales, documentos privados, registros de clientes, credenciales e identidad del alojamiento de la empresa no se publican aquí. La plataforma privada conserva su catálogo real.

## Experiencia

- Navegación lateral y cotización en tres etapas: sistema, instalación y cliente.
- Selección visual de cinco tipos de sistema, catálogo editable y total en tiempo real.
- Resumen accesible en celular, validaciones y confirmación antes de reiniciar.
- Historial de versiones, vista previa, descarga PDF e impresión.
- WhatsApp y correo abren un mensaje preparado; el PDF se adjunta manualmente. No incluye envío automático.

## Desarrollo

Requiere Node.js 22.13 o superior.

```sh
npm ci
npm run dev
```

La sesión de desarrollo utiliza la identidad local simulada de Sites; no es un sistema de autenticación para exponer a Internet. En producción requiere el acceso autenticado de Sites.

```sh
npx tsc --noEmit
node tests/run.mjs
npm run build
```

Para aplicar la migración local después del primer build:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_spotty_dexter_bennett.sql
```

## Datos y publicación

`lib/catalog.json` contiene productos y tarifas ficticios para desarrollo. `lib/documents.ts` contiene una lista genérica de pendientes. Integrar datos comerciales solamente en un entorno privado autorizado. No sustituir el catálogo real de una instalación existente con esta demostración.

La configuración `.openai/hosting.json` conserva los enlaces lógicos de almacenamiento y omite el identificador del sitio privado. Registrar una instalación propia mediante Sites antes de publicar. No incluye una configuración de despliegue automático desde GitHub.

Las APIs validan la identidad y separan los registros por usuario. Cada cotización conserva una copia de sus precios y condiciones; se recalcula en el servidor. La instalación ya incluye los factores del tarifario, y nunca se aplica un segundo margen. El IVA y las condiciones deben validarse antes de emitir documentos reales.

## Límites

No se calculan ahorros ni compatibilidad eléctrica sin información técnica validada. Requiere conexión para guardar. El catálogo no se sincroniza con Drive. El historial devuelve las 100 versiones más recientes. Las fuentes PDF estándar cubren texto latino.

La fuente Manrope se distribuye con su licencia OFL en `public/fonts/OFL.txt`.

