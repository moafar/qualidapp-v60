# Prompt de arquitectura para LLM — QualidApp v60

Este prompt resume cómo está armada la app (browser-only, sin bundler) para que un LLM pueda proponer cambios o nuevas features sin romper el diseño actual.

## Propósito del proyecto
- Valida datasets (Excel/CSV) contra un contrato YAML.
- Genera violaciones por columna/fila y las muestra en una UI ligera en el navegador.

## Vista general de la arquitectura
- **Ejecución 100% navegador**: módulos ES cargados directo en `index.html` (no hay build). Servir con `python3 -m http.server 8000` o `npx live-server .` y abrir `http://localhost:8000`.
- **Punto de entrada**: `src/main.js` orquesta infra, reglas, UI y flujo de validación.
- **Motor de reglas**: `src/core/RuleEngine.js` mantiene un mapa `rules[id]` con instancias; ejecuta `validateColumn()` si la regla la expone, si no recorre valores y llama `validate()`.
- **Reglas**: clases en `src/core/rules/*.js` exportadas con `export class`. Cada una define `id`, `validate(value, ruleConfig)` y/o `validateColumn(data, ruleConfig)`, y `createViolation()`.
- **Infra**: `YamlContractParser` usa `window.jsyaml` para parse/stringify; `ExcelDatasetLoader` usa XLSX global para leer Excel/CSV a `rows[]` (array de objetos).
- **UI**: componentes en `src/ui/*` (`UIManager`, `ContractViewer`, `ContractTreeViewer`, `RuleCatalogViewer`, `ValidationReportViewer`, etc.). Layout dividido en editor YAML + visores/tabs.
- **Reporte v2**: `SchemaValidator` (estructura), `RuleEngine` (reglas), `SeverityPolicy` (severidad final), `ReportBuilder` (acumula issues/counters), `ValidationReportViewer` (render UI).

## Flujo de validación (según `src/main.js`)
1. Parsear contrato desde el textarea YAML o estado en memoria (`YamlContractParser`).
2. Cargar dataset vía `ExcelDatasetLoader.load(file)` → `rows[]`.
3. Normalizar filas a columnas (`buildColumnsData`): `{ columnsData, datasetColumns }`.
4. Validar esquema con `SchemaValidator` (extra/missing). Añadir issues al `ReportBuilder` con severidad resuelta por `SeverityPolicy`.
5. Por cada columna declarada en el contrato: si existe en datos, correr `RuleEngine.validateColumn(colName, data, rulesConfig)` → `violations`.
6. Mapear violaciones a issues tipo `rule`, resolver severidad con `SeverityPolicy`, agregarlos al `ReportBuilder`.
7. Finalizar reporte (`report.finalize()`), renderizar con `ValidationReportViewer`, mostrar resumen en UI.

## Convenciones de reglas
- Dos tipos: a) valor a valor (`validate`) y b) columna completa (`validateColumn`, ej. `UniqueRule`).
- `createViolation(ruleConfig)` devuelve shape base de la violación; `RuleEngine` añade `column`, `index` (fila 0-based, o `null` si no aplica) y `value`.
- Las reglas se registran explícitamente en `main.js` (ej. `engine.registerRule(new RequiredRule())`); no cambiar `id` sin actualizar contratos/ejemplos.

## Dependencias globales (no npm imports)
- `js-yaml` expuesto como `window.jsyaml` (parseo YAML) en `index.html`.
- `dayjs` + plugin `customParseFormat` para fechas (p. ej. `DateRangeRule`).
- `xlsx` (SheetJS) como global `XLSX` para leer Excel/CSV.

## UI y UX
- Tabs: Resumen, Árbol, Columns, Rule catalog, Validación.
- `UIManager` enlaza botones (cargar YAML, editar/guardar/cancelar, validar) y expone `outputElement` para mensajes.
- `ContractViewer` y `ContractTreeViewer` se renderizan tras parsear YAML; `RuleCatalogViewer` se renderiza lazy la primera vez.
- `LayoutResizer` permite arrastrar la división entre textarea y visores.
- En reporte v2, la UI muestra filas 1-based aunque internamente se manejen índices 0-based.

## Políticas y decisiones clave
- No hay build ni bundler: mantener módulos ES y dependencias globales vía script tags.
- Mantener separación: infra (I/O), core (reglas/engine/schema/report), UI (visores/controladores).
- Evitar limpiar helpers legacy en `main.js` sin plan (se anotan como LEGACY para rollback fácil).
- No sustituir dependencias globales por imports sin ajustar `index.html` y verificar compatibilidad.

## Puntos de integración y extensibilidad
- **Nuevas reglas**: crear archivo en `src/core/rules/`, exportar clase con `id`, `validate`/`validateColumn`, `createViolation`; registrar en `main.js`; opcionalmente agregar metadatos para `RuleCatalogViewer` si aplica.
- **Nuevos visores/reportes**: consumir `report.finalize()`; las issues incluyen `type` (schema|rule), `level` (error|warning|info), `column`, `rowIndex`, `value`, `ruleId`.
- **Contratos**: estructura típica `columns: [{ name, rules: [{id, params?}], criticality? }]` y `schema_policy` para extra/missing.

## Qué debe recordar el LLM al proponer cambios
- Respetar APIs públicas actuales (`RuleEngine.validateColumn`, `SchemaValidator.validate`, `ReportBuilder.start/finalize`, etc.).
- Conservar la carga global de `jsyaml/dayjs/XLSX` y la ejecución en navegador sin bundling.
- Mantener índices internos 0-based y presentación 1-based en UI.
- No renombrar IDs de reglas existentes ni mover instancias sin actualizar registros y contratos.
- Añadir comentarios solo cuando el código no sea autoexplicativo; mantener estilo ligero.

## Dataset y contratos de referencia
- Ejemplos de contratos/datasets en raíz (`contract_basal.yaml`, `basal_contract_v330.yaml`, `xpap_contract_v330.yaml`, `dataset_ejemplo.csv`). Útiles para pruebas manuales.

Usa esta guía como contexto base antes de generar código o instrucciones nuevas sobre QualidApp v60.
