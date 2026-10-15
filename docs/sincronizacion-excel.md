# Excel y catálogo: sincronización bidireccional prevista

Decisión del usuario, 15-10-2026: Excel compartido será la interfaz principal del equipo. La plataforma seguirá permitiendo editar. El archivo maestro está pendiente de entrega. Esta especificación no es una integración activa.

## Flujo

Un proceso de sincronización leerá cambios en el Excel y en el catálogo, comparándolos con la última versión sincronizada. Aplicará únicamente cambios válidos y registrará el resultado en ambos lados. La base de datos seguirá atendiendo las cotizaciones aunque Excel no esté disponible.

- Identificador estable por producto, independiente de su nombre y de la posición de la fila.
- Campos previstos: sistema, categoría, nombre/modelo, precio, unidad, potencia nominal, referencia de origen y ficha técnica. Las tarifas de instalación requieren una tabla independiente por sistema y cantidad de paneles.
- Validación con los esquemas del cotizador: números, unidades, IDs únicos y relación de la ficha con el modelo. Una celda vacía no equivale automáticamente a precio cero.
- Comparación de tres versiones: última sincronización, Excel actual y plataforma actual. Cambios en campos distintos pueden combinarse; dos cambios incompatibles del mismo campo quedan pendientes de resolución.
- Escritura condicionada a la revisión del catálogo y a la versión del archivo. Si otro usuario modifica mientras se sincroniza, volver a leer y comparar.
- Operaciones idempotentes para no duplicar equipos ni crear un bucle de actualizaciones. Un cambio sincronizado no se tratará como una nueva edición independiente.
- No eliminar equipos porque desaparezca una fila sin una señal explícita y revisión del cambio. Conservar historial y respaldo antes de aplicar cada lote.
- Las cotizaciones guardadas mantienen sus precios y equipos; la sincronización afecta al catálogo para nuevas configuraciones.
- Estado visible: última sincronización correcta, cambios pendientes, conflictos y errores de acceso.

## Al recibir el archivo

1. Confirmar proveedor y archivo exacto: OneDrive/SharePoint o Google Drive. Un XLSX almacenado en Drive no equivale a una hoja nativa de Google Sheets.
2. Revisar hojas, encabezados, tablas, fórmulas y tipos de datos reales antes de mapear columnas.
3. Configurar acceso del proceso solo al recurso necesario; las claves permanecen en el servidor.
4. Probar ambos sentidos con una copia y conflictos simultáneos antes de activar el archivo maestro.
5. Acordar frecuencia de sincronización según el proveedor y los límites disponibles.

No se crea un proceso programado ni se conecta un archivo supuesto mientras no se entregue el maestro.
