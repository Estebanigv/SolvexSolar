# Boletas eléctricas de Chile

Actualizado: 14 de octubre de 2026.

## Cobertura implementada

El ingreso, cálculo de consumo y búsqueda de coordenadas no se limitan a una empresa. Se aceptan PDF, JPG y PNG de cualquier distribuidora o cooperativa. El nombre puede elegirse del catálogo o escribirse libremente. Un proveedor no reconocido no bloquea la cotización.

El catálogo de reconocimiento contiene 36 nombres, incluyendo denominaciones presentes en boletas antiguas. No certifica que todos esos nombres sigan operando como empresas independientes ni sustituye un registro de concesiones. Se reconocen marcas, siglas y razones sociales documentadas; la comuna no se utiliza para adivinar el emisor. Un rótulo explícito de distribuidora tiene prioridad frente a menciones del grupo empresarial. Los emisores contradictorios requieren revisión.

Se amplió la lectura de consumo con la unidad antes del valor, “Energía consumida”, “Días de consumo”, “Señor(a)” y “Dirección del cliente”. Se conserva la revisión de campos faltantes, importes contradictorios y valores ingresados manualmente. No se interpreta una lectura acumulada, consumo de referencia o promedio histórico como consumo del período.

La georreferencia usa dirección, comuna y región, independientemente de la empresa. Una coincidencia precisa única puede cargarse automáticamente; un punto aproximado requiere confirmación.

## Fuentes del catálogo

- [SEC: tramitación de conexión y empresas distribuidoras](https://www.sec.cl/gda/tramitacion-de-conexion-en-linea/).
- [SEC: empresas incluidas en resolución de costos de explotación](https://www.sec.cl/sitio-web/wp-content/uploads/2022/11/REE-14692-Fija-CExp-2021.pdf).
- [CNE: denominaciones de distribuidoras en informe de precios de nudo 2026](https://www.cne.cl/wp-content/uploads/2026/06/Rex__CNE_N_286-2026__aprueba_rect_ITD_PNP_2026-2.pdf).
- [CNE: denominaciones en informe 2021](https://www.cne.cl/archivos_bajar/RE_CNE_194-2021.pdf).

## Límites y validación

Reconocer el nombre no equivale a garantizar lectura automática de todos los diseños de boleta. Las pruebas nuevas son sintéticas y cubren nombres, alias, conflictos, datos faltantes, proveedores fuera del catálogo y normalización de consumo. Se mantienen las regresiones anteriores de lectura. Para certificar un diseño particular se necesitan ejemplos anonimizados de anverso y reverso de ese proveedor.

Los kWh y los días deben revisarse contra la boleta. El cálculo no asigna una tarifa o precio de excedentes por el nombre de la distribuidora: esos valores y condiciones deben corresponder al suministro. El total a pagar, que puede incluir deuda anterior, no se convierte automáticamente en ahorro. No se cambiaron las fórmulas de ahorro ni las validaciones de emisión.
