# Registro de versiones

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