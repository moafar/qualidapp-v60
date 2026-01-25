# Registro de versiones

## [2.2.0] – 2026-01-25
### Añadido
- Selector de contratos disponible tanto en la sección **Contrato** (para visualizar el contenido oficial) como en **Dataset** (para usarlo en validación); ambos dropdowns se sincronizan automáticamente.
- Visualización directa de contratos del repositorio oficial en la sección Contrato en modo solo lectura; importar un YAML propio desactiva el modo de solo lectura.
- Etiquetas de reglas `range` y `date-range` muestran el rango configurado en el propio chip (`[min..max]` con límites infinitos cuando faltan valores).

### Cambiado
- La sección 'Contrato' servirá solamente para visualizar contratos, bien sea seleccionados del selector de contratos o cargados desde el disco.
- La validación en la sección 'Dataset' se realizará con el contrato seleccionado en el selector de contratos de la misma sección.
- Los contratos ahora vivirán en el codebase, dentro de la carpeta `contracts`
- El selector de contratos consume el contenido de `manifest.json` para mostrar los contratos disponibles

### Notas
- Los mensajes de estado junto a los selectores se eliminaron; solo se mantienen los dropdowns sincronizados.

## [2.1.0] – 2026-01-24
### Añadido
- Spinner global indicador de trabajo en segundo plano: aparece automáticamente durante la carga de contrato YAML o dataset, mostrando overlay semi-transparente y animación de carga centrada.
- Contador de violaciones por columna en el reporte de validación: ahora cada columna muestra el número de violaciones entre paréntesis (ej: "email_column (5)").

### Cambiado
- **Simplificación de la política de severidad:** todas las violaciones de reglas se reportan ahora como error, ignorando completamente el parámetro `criticality` de las columnas del contrato.
- Eliminada la columna "Criticidad" de la tabla de visualización de columnas en el contrato (lectura y edición).
- Eliminado el filtro de criticidad de la barra de filtros en la pestaña Columnas.
- Eliminado el badge de criticidad del resumen del dataset (perfil estadístico).
- Eliminadas opciones de filtrado y ordenamiento por criticidad en el visor del perfil del dataset.
- Simplificado el reporte de validación:
  - Remover badges de severidad (E/W/I) del encabezado y grupos.
  - Remover select de filtro por nivel (Error/Warning/Info) de los controles.
  - Mostrar solo un contador de violaciones totales en el encabezado.
  - El mensaje de estado ahora muestra solo violaciones: `"Validación completada con N violación(es)."` o `"Validación completada sin hallazgos."`.

### Arreglado
- Corregido el comportamiento del toggle de grupos en el reporte de validación después de los cambios en la presentación del contador.

### Notas de compatibilidad / Breaking change
- El parámetro `criticality` del contrato se mantiene por compatibilidad pero ya no afecta la severidad de las violaciones reportadas.
- Todos los reportes de validación mostrarán ahora solo violaciones como error, sin distinción de severidad intermedia.
- El filtrado y ordenamiento por criticidad se ha removido de la UI; contratos existentes con este parámetro seguirán siendo válidos pero no afectarán la visualización.

## [2.0.1] – 2025-12-31
### Arreglado
- Corregido el cálculo de la barra de progreso para '% Nulos' en el resumen del dataset: ahora muestra correctamente el porcentaje de valores nulos en lugar del porcentaje de no nulos, asegurando que sea complementario al 100% con la columna 'Cobertura'.
- Corregidos errores de redacción (pie de yaml en vista YAML del contrato ahora dice "automáticamente")

## [2.0.0] – 2025-12-27
### Añadido
- Nueva vista “Vista previa” para datasets: muestra las primeras filas en formato tabular con limitación configurable (20 filas, 10 columnas) y estados de carga/error dedicados.
- Botón “Seleccionar dataset” integrado a la sección Dataset para abrir el picker estándar sin depender del input expuesto.

### Cambiado
- La UI ahora se organiza en dos secciones principales: “Contrato” y “Dataset”, cada una con sus propias subpestañas (Resumen, Árbol, Columnas, Reglas, YAML / Vista previa, Perfil, Validación) y barra de acciones contextual.
- El editor YAML se mueve a una pestaña específica dentro de “Contrato”, manteniendo acceso con un clic pero evitando mezclarlo con vistas del dataset.
- Los botones heredados “Cargar” y “Editar” se renombraron a “Importar YAML” y “Editar contrato” y conviven con guardar/cancelar en la barra del contrato.
- La carga de dataset genera simultáneamente la vista previa y el perfil estadístico; ambos se actualizan cuando cambia el archivo o ocurre un error.

### Notas
- El layout ya no usa el resizer lateral legado; la nueva estructura se basa en tarjetas y paneles independientes.

## [1.5.0] – 2025-12-27
### Añadido
- Sección de descripción estadística del dataset cargado: tarjetas de resumen (# filas, # columnas, extras y faltantes, nulos) y detalles por columna (tipo detectado, cobertura, nulos y unicidad), además de un set de tarjetas de resumen (total, nulos unicos, min, max, etc) y un histograsna/diagrama de barras

### Cambiado
- Se agrega la pestña 'Dataset' 

### Notas
- Han crecido ahora dos secciones que deberán reorganizarse en el futuro agrupando las funcionalidades actuales: una sección de 'Contrato' y otra de 'Dataset'.

## [1.4.2] – 2025-12-25
### Añadido
- Refactoring de archivos de rules: eliminado severity de la sección 'parameters', no utilizado.

### Cambiado
No hay cambios.

### Notas
La sección Severity estaba pensada para definir severidad de violaciones, pero se determiinó que puede definirse con el parámetro 'criticality' en la declaración de reglas de cada columna.

## [1.4.1] – 2025-12-24
### Añadido
- Popover de detalle por fila en el reporte de validación: el número de fila ahora abre un panel fijo con los datos completos de la fila y resalta la columna con violación.

### Cambiado
- Se adjunta una sola copia de las filas del dataset al reporte para evitar duplicación de memoria y alimentar el popover.
- El número de fila se estiliza como enlace para invitar a la acción de apertura del popover.

### Notas
- El tooltip flotante previo se mantiene para otros usos; el popover de filas se abre por click y admite scroll interno.

## [1.4.0] – 2025-12-23
### Añadido
- Nueva regla **`date-range`** para validación de rangos de fechas a nivel de contrato.
  - Soporta fechas en formato **`DD/MM/YYYY`**.
  - Acepta valores con hora adjunta (la hora se ignora durante la validación).
  - Validación inclusiva (`min ≤ fecha ≤ max`).
  - Parámetros configurables desde el contrato YAML: `min`, `max`, `format`, `severity`.
- Integración completa de `date-range` en el flujo de validación:
  - Ejecución fila a fila a través de `RuleEngine`.
  - Generación de violaciones por fila con `rowIndex`, valor observado y mensaje descriptivo.
  - Resolución de severidad final (`soft` / `hard`) mediante `SeverityPolicy`.

### Cambiado
- Normalización de fechas en `ExcelDatasetLoader`:
  - Las celdas de fecha provenientes de Excel ahora se convierten por defecto a **`DD/MM/YYYY`**.
  - Se mantiene el uso de `cellDates: true` para evitar números seriales de Excel.
- Alineación explícita entre el formato de fechas producido por el loader y el parseo estricto usado en `DateRangeRule` (`dayjs` + `customParseFormat`).

### Notas de compatibilidad / Breaking change
- Cambio en el formato por defecto de fechas cargadas desde Excel:
  - **Antes:** `YYYY-MM-DDTHH:mm:ssZ` (ISO).
  - **Ahora:** `DD/MM/YYYY`.
- Contratos, reglas o consumidores que asumían formato ISO deben ajustarse para reflejar el nuevo formato o redefinir su lógica de validación.

### Documentación
- Ejemplo de uso de la regla `date-range` documentado en contratos YAML.
- Comentarios y JSDoc actualizados en:
  - `src/core/rules/DateRangeRule.js`
  - `src/infrastructure/ExcelDatasetLoader.js`
  

## [1.3.1] - 2025-12-22
### Añadido
- Persistencia de ediciones de reglas desde el editor JSON inline en la UI del contrato.
  - `ContractViewer.flushRuleEdits()` ahora convierte/valida el contenido de los textareas `.rule-json-editor` y actualiza `this.currentContract.columns[idx].rules` antes del guardado.
  - `UIManager.handleSaveClick` invoca `flushRuleEdits()` y aborta el guardado si hay errores de JSON.

### Cambiado
- Se revirtió temporalmente el intento de mostrar la versión de la app desde `CHANGELOG.md`; la UI sigue mostrando la versión del contrato hasta completar una implementación robusta.

### Notas de compatibilidad / Breaking change
- Ninguna breaking change funcional; comportamientos del contrato en disco se mantienen.

### Documentación
- Documentados los pasos para validar y guardar reglas editadas desde la UI en `src/ui/ContractViewer.js` y `src/ui/UIManager.js`.

## [1.3.0] - 2025-12-22
### Añadido
- Soporte de parseo y normalización de fechas en `src/infrastructure/ExcelDatasetLoader.js`.
  - `ExcelDatasetLoader.load(file, { parseDates = true, dateAsISOString = true })` ahora está disponible.
  - Por defecto `parseDates` y `dateAsISOString` están activados y las fechas se normalizan a `YYYY-MM-DDTHH:mm:ssZ`.

### Cambiado
- Cambio por defecto en el comportamiento de carga de Excel/CSV: las celdas de fecha se tratan como `Date` y se exportan por defecto como cadenas ISO completas (`YYYY-MM-DDTHH:mm:ssZ`).

### Notas de compatibilidad / Breaking change
- Este cambio altera el formato de salida de columnas con fechas: antes podían llegar números seriales de Excel o cadenas, ahora por defecto se devolverán cadenas ISO con hora (si la celda no contiene hora, se normaliza a `00:00:00Z`).
- Si algún consumidor dependía del formato anterior, ajuste su consumo o llame a `load(file, { parseDates: false })` para restaurar el comportamiento previo.

### Documentación
- JSDoc y código en `src/infrastructure/ExcelDatasetLoader.js` actualizados para reflejar las nuevas opciones.

## [1.2.0] - 2025-12-17
### Añadido
- Nuevo campo escalar `sensitivity` a nivel de columna (`pii`, `quasi_identifier`) para representar datos sensibles de forma explícita.
- Gestión completa de sensibilidad en la UI:
  - Visualización mediante badges (PII / QID) en la pestaña **Columns**.
  - Edición bidireccional mediante selector dedicado en modo edición.
- Persistencia correcta del campo `sensitivity` en memoria y en el YAML exportado.

### Cambiado
- Refactor del modelo de sensibilidad:
  - Se elimina el uso de `tags` para indicar sensibilidad a nivel de columna.
  - `sensitivity` pasa a ser un atributo 1:1, alineado con `expected_type` y `criticality`.
- Renderizado de la columna **Sensitive** basado exclusivamente en `col.sensitivity`.
- Lógica de edición genérica (`_handleDynamicInput`) ajustada para tratar `sensitivity` como caso especial:
  - Eliminación de la propiedad cuando el valor es vacío.
- Generación del YAML al guardar basada siempre en el objeto en memoria (`currentContractObj`), no en el textarea.
- Ajustes de layout en la pestaña **Columns** para separar estructura estática y contenido dinámico.

### Arreglado
- Bug de scroll en la pestaña **Columns** causado por configuración incorrecta de Flexbox y `overflow`.
- Pérdida del scroll al re-renderizar la tabla de columnas (sobrescritura del contenedor scrolleable).
- Estilos CSS inválidos definidos dentro de `:root` que impedían la correcta aplicación de badges.
- Aplicación incompleta de estilos de criticidad (colores diferenciados para `high`, `medium`, `low`).
- Lógica ambigua previa basada en flags booleanos (`col.sensitive`) y detección por `tags`.


## [1.0.0] - 2025-12-13
### Añadido
- Contrato inicial definido en [`contract_ejemplo.yaml`](contract_ejemplo.yaml) para el dataset de estudios basales.
- Reglas registradas en [`src/main.js`](src/main.js) y motor de reglas en [`src/core/RuleEngine.js`](src/core/RuleEngine.js).
- UI de contrato y catálogos en [`src/ui/`](src/ui/).

### Cambiado
- Detallado el loader de Excel en [`src/infrastructure/ExcelDatasetLoader.js`](src/infrastructure/ExcelDatasetLoader.js).
- Parser YAML en [`src/infrastructure/YamlContractParser.js`](src/infrastructure/YamlContractParser.js).

### Arreglado
- Validaciones y descarga de contratos actualizadas en [`src/main.js`](src/main.js).