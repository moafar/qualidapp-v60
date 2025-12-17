# Registro de versiones

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