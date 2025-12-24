/**
 * src/main.js
 * Responsabilidad: Orquestador Principal
 *
 * ============================================================
 * VISIÓN GENERAL (lectura rápida)
 * ============================================================
 * Este archivo conecta 4 cosas:
 *  1) Contrato YAML (fuente de verdad)
 *  2) Dataset Excel/CSV (entrada)
 *  3) Core de validación (SchemaValidator + RuleEngine + SeverityPolicy)
 *  4) UI (ContractViewer/Tree/Catalog + ValidationReportViewer + mensajes)
 *
 * El flujo de validación (pestaña Dataset) es:
 *  A) Parsear contrato (desde memoria o desde textarea)
 *  B) Cargar dataset -> rows[]
 *  C) Normalizar rows[] -> columnsData{} (vectores por columna)
 *  D) Validar esquema (extra/missing) -> issues tipo "schema"
 *  E) Validar reglas por columna -> issues tipo "rule"
 *  F) Resolver severidad (error|warning|info) con SeverityPolicy
 *  G) Construir reporte v2 (ReportBuilder)
 *  H) Renderizar reporte v2 (ValidationReportViewer)
 *
 * Nota importante sobre índices:
 *  - Interno (Core/Report): rowIndex es 0-based.
 *  - UI: muestra rowIndex+1 para que sea natural para humanos/Excel.
 */

// ============================================================
// IMPORTACIONES
// ============================================================

// --- Reglas (Core: reglas individuales) ---
import { DomainRule } from './core/rules/DomainRule.js';
import { LengthRangeRule } from './core/rules/LengthRangeRule.js';
import { MaxMissingRateRule } from './core/rules/MaxMissingRateRule.js';
import { RangeRule } from './core/rules/RangeRule.js';
import { RegexRule } from './core/rules/RegexRule.js';
import { RequiredRule } from './core/rules/RequiredRule.js';
import { UniqueRule } from './core/rules/UniqueRule.js';
import { DateRangeRule } from './core/rules/DateRangeRule.js';

// --- Motor de reglas ---
import { RuleEngine } from './core/RuleEngine.js';

// --- Infraestructura (I/O) ---
import { YamlContractParser } from './infrastructure/YamlContractParser.js';
import { ExcelDatasetLoader } from './infrastructure/ExcelDatasetLoader.js';

// --- UI (controladores / vistas) ---
import { UIManager } from './ui/UIManager.js';
import { ContractViewer } from './ui/ContractViewer.js';
import { ContractTreeViewer } from './ui/ContractTreeViewer.js';
import { RuleCatalogViewer } from './ui/RuleCatalogViewer.js';
import { LayoutResizer } from './ui/LayoutResizer.js';

// --- Utilidades ---
import { TooltipManager } from './ui/ToolTipManager.js';
import { FileDownloader } from './utils/FileDownloader.js';

// --- Validación y Reportes v2 ---
import { SchemaValidator } from './core/schema/SchemaValidator.js';
import { SeverityPolicy } from './core/report/SeverityPolicy.js';
import { ReportBuilder } from './core/report/ReportBuilder.js';
import { ValidationReportViewer } from './ui/report/ValidationReportViewer.js';


// ============================================================
// SETUP E INICIALIZACIÓN (Core, Infra, UI)
// ============================================================

/**
 * 1) Motor de reglas
 * - Registro explícito de reglas disponibles.
 * - El contrato YAML referenciará reglas por id (ej. "required", "range", "unique").
 * - RuleEngine resuelve id -> instancia.
 */
const engine = new RuleEngine();
engine.registerRule(new RequiredRule());
engine.registerRule(new RangeRule());
engine.registerRule(new LengthRangeRule());
engine.registerRule(new MaxMissingRateRule());
engine.registerRule(new DomainRule());
engine.registerRule(new RegexRule());
engine.registerRule(new UniqueRule());
engine.registerRule(new DateRangeRule());

// tras instanciar RuleEngine y registrar reglas
window.engine = engine;

/**
 * 2) Infraestructura
 * - parser: YAML <-> object
 * - loader: Excel/CSV -> rows[]
 */
const parser = new YamlContractParser();
const loader = new ExcelDatasetLoader();

/**
 * 3) UI
 * - UIManager: eventos y mensajes (validar, loading, showResult, showError...)
 * - ContractViewer: edición/visualización del contrato (pestañas)
 * - ContractTreeViewer: árbol del contrato
 * - RuleCatalogViewer: catálogo de reglas disponibles
 */
const ui = new UIManager();
const viewer = new ContractViewer();
const treeViewer = new ContractTreeViewer('tab-tree');
const catalogViewer = new RuleCatalogViewer('tab-catalog', engine);

/**
 * 4) Utilidades
 */
const tooltipManager = new TooltipManager(); // (si tu UI lo usa; aquí no se invoca directamente)
const downloader = new FileDownloader();

/**
 * 5) Layout / UX
 * - Permite redimensionar paneles (si existe en tu HTML).
 */
new LayoutResizer('mainLayout', 'resizeGutter');

/**
 * 6) Validación y reporte v2
 * - SchemaValidator: issues "schema" (extra/missing columns)
 * - SeverityPolicy: decide severidad final
 * - ReportBuilder: consolida issues en reporte v2 (counters + groups)
 * - ValidationReportViewer: render mínimo del reporte v2
 */
const schemaValidator = new SchemaValidator();
const severityPolicy = new SeverityPolicy();
const reportBuilder = new ReportBuilder();
const reportViewer = new ValidationReportViewer('reportContainer');


// ============================================================
// ESTADO GLOBAL (mínimo)
// ============================================================

/**
 * currentContractObj:
 * - Se actualiza al parsear YAML del textarea o cargar archivo.
 * - Es la fuente de verdad "en memoria" cuando editas con ContractViewer.
 */
let currentContractObj = null;


// ============================================================
// REFERENCIAS DOM (Contrato)
// ============================================================

const yamlInput = document.getElementById('yamlInput');
const btnLoadYaml = document.getElementById('btnLoadYaml');
const yamlFileInput = document.getElementById('yamlFileInput');

const btnEdit = document.getElementById('btnEdit');
const btnSave = document.getElementById('btnSave');
const btnCancel = document.getElementById('btnCancel');


// ============================================================
// HELPERS (LEGACY / UTILIDADES)
// ============================================================

/**
 * LEGACY: estos helpers eran parte del reporte v1 (pushFinding + summary).
 * Hoy NO se usan en el flujo v2, pero los dejamos por ahora para:
 * - evitar una limpieza grande de golpe
 * - permitir volver atrás si algo falla
 *
 * Cuando el flujo v2 esté estabilizado, conviene eliminarlos.
 */

/** Normaliza schema_policy con defaults seguros (LEGACY) */
function getSchemaPolicy(contract) {
  const sp = contract?.schema_policy || {};
  return {
    mode: sp.mode || 'strict',
    on_extra_columns: (sp.on_extra_columns || 'warn').toLowerCase(),   // warn|fail|ignore
    on_missing_columns: (sp.on_missing_columns || 'fail').toLowerCase() // warn|fail|ignore
  };
}

/** Mapea criticidad -> severidad por defecto (LEGACY) */
function severityFromCriticality(criticality) {
  const c = (criticality || 'low').toLowerCase();
  if (c === 'high') return 'error';
  if (c === 'medium') return 'warning';
  return 'warning';
}

/** Agrega item al reporte y actualiza contadores (LEGACY) */
function pushFinding(report, { level, row, col, val, msg, ruleId = null }) {
  const lvl = (level || 'error').toLowerCase();

  if (lvl === 'warning') report.totalWarnings++;
  else report.totalErrors++;

  report.details.push({ level: lvl, row, col, val, msg, ruleId });
}

/**
 * buildColumnsData(rows)
 * Convierte rows[] (array de objetos) a:
 * - columnsData: { colName: [v0, v1, v2, ...] }
 * - datasetColumns: lista de columnas detectadas (únicas)
 *
 * Supuesto confirmado por ti:
 * - el dataset es uniforme y conserva el orden de filas (aunque haya vacíos).
 */
function buildColumnsData(rows) {
  const columnsData = {};
  const datasetColumnsSet = new Set();

  rows.forEach((row) => {
    for (const [k, v] of Object.entries(row || {})) {
      datasetColumnsSet.add(k);
      if (!columnsData[k]) columnsData[k] = [];
      columnsData[k].push(v);
    }
  });

  return { columnsData, datasetColumns: Array.from(datasetColumnsSet) };
}


// ============================================================
// SINCRONIZACIÓN CONTRATO (texto <-> memoria <-> vistas)
// ============================================================

/**
 * syncFromText():
 * - Toma YAML del textarea
 * - Lo parsea
 * - Actualiza currentContractObj
 * - Renderiza ContractViewer y TreeViewer
 * - Renderiza RuleCatalogViewer una vez (lazy)
 *
 * Importante:
 * - En el textarea, mientras escribes, el YAML puede ser inválido.
 * - Por eso aquí atrapamos errores y no “rompemos” la UI.
 */
const syncFromText = () => {
  try {
    const text = yamlInput.value;
    currentContractObj = parser.parse(text);

    viewer.render(currentContractObj);
    treeViewer.render(currentContractObj);

    if (!catalogViewer._rendered) {
      catalogViewer.render();
      catalogViewer._rendered = true;
    }
  } catch (e) {
    // Ignorar errores mientras se escribe (YAML incompleto)
  }
};

/**
 * syncFromMemory():
 * - Toma currentContractObj (editado desde la UI)
 * - Lo serializa a YAML
 * - Actualiza textarea
 * - Re-renderiza ContractViewer
 *
 * Uso típico:
 * - Al guardar cambios del editor UI hacia el YAML.
 */
const syncFromMemory = () => {
  try {
    const newYaml = parser.stringify(currentContractObj);
    yamlInput.value = newYaml;
    viewer.render(currentContractObj);
  } catch (e) {
    console.error("Error sync memory:", e);
  }
};

// Mientras tecleo en YAML, intento reparsear y reflejar en UI
yamlInput.addEventListener('input', syncFromText);


// ============================================================
// CARGA DE ARCHIVO YAML (Contrato)
// ============================================================

if (btnLoadYaml) {
  btnLoadYaml.addEventListener('click', () => yamlFileInput.click());
}

if (yamlFileInput) {
  yamlFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      yamlInput.value = evt.target.result;
      syncFromText();
      ui.outputElement.innerHTML = `<div style="color:green; font-weight:bold">📂 Contrato "${file.name}" cargado.</div>`;
    };
    reader.readAsText(file);
  });
}


// ============================================================
// EDICIÓN DEL CONTRATO (ContractViewer)
// ============================================================

if (btnEdit) {
  btnEdit.addEventListener('click', () => {
    if (!currentContractObj) {
      alert("Primero carga un contrato válido.");
      return;
    }

    // Activar modo edición en el viewer
    viewer.toggleEdit(true);

    // Bloquear textarea para evitar conflicto de “dos fuentes editables”
    yamlInput.disabled = true;

    // Cambiar botones
    btnEdit.classList.add('hidden');
    btnSave.classList.remove('hidden');
    btnCancel.classList.remove('hidden');
  });
}

if (btnSave) {
  btnSave.addEventListener('click', () => {
    // Pasar cambios del viewer -> YAML textarea
    syncFromMemory();

    // Descargar YAML resultante (versionado básico)
    const fileName = `contract_v${currentContractObj.contract_version || '1.0'}.yaml`;
    const yamlContent = yamlInput.value;
    downloader.download(yamlContent, fileName, 'text/yaml');

    // Salir de modo edición
    viewer.toggleEdit(false);
    yamlInput.disabled = false;

    // Restaurar botones
    btnEdit.classList.remove('hidden');
    btnSave.classList.add('hidden');
    btnCancel.classList.add('hidden');
  });
}

if (btnCancel) {
  btnCancel.addEventListener('click', () => {
    // Descarta cambios volviendo a parsear desde textarea (fuente anterior)
    syncFromText();

    viewer.toggleEdit(false);
    yamlInput.disabled = false;

    btnEdit.classList.remove('hidden');
    btnSave.classList.add('hidden');
    btnCancel.classList.add('hidden');
  });
}


// ============================================================
// VALIDACIÓN (Dataset Excel/CSV)
// ============================================================

/**
 * VALIDACIÓN (UI → Core → UI)
 *
 * Este callback es invocado por UIManager cuando el usuario hace click en "Validar".
 *
 * 0) UI loading
 * 1) Leer contrato (memoria o textarea)
 * 2) Leer archivo dataset (Excel/CSV)
 * 3) Cargar dataset => rows[]
 * 4) Inicializar ReportBuilder (reporte v2)
 * 5) Normalizar rows => columnsData + datasetColumns
 * 6) Ejecutar SchemaValidator => issues schema (extra/missing)
 * 7) Ejecutar RuleEngine por columna => issues rule
 * 8) Resolver severidad con SeverityPolicy
 * 9) Finalizar reporte + renderizar + mostrar resumen (toast/banner)
 */
ui.bindValidateClick(async () => {
  try {
    // 0) UX: mostrar “cargando…”
    ui.showLoading();

    // 1) Contrato: fuente de verdad
    // - si existe en memoria (por edición UI), úsalo
    // - si no, parsea el YAML del textarea
    const contract = currentContractObj ?? parser.parse(yamlInput.value);
    if (!contract) throw new Error("Contrato inválido.");

    // 2) Dataset file: debe existir
    const file = ui.getDatasetFile();
    if (!file) throw new Error("Falta archivo de datos.");

    // 3) Cargar dataset -> rows[]
    // rows: [{colA:..., colB:...}, ...]
    const rows = await loader.load(file);

    // 4) Inicializar ReportBuilder (reporte v2)
    // Importante: "report" es el builder, NO el reporte final
    const report = reportBuilder.start(
      {
        contractId: contract?.dataset?.id || null,
        contractVersion: contract?.contract_version || null,
        datasetId: contract?.dataset?.id || null
      },
      {
        totalRows: rows.length,
        totalColumns: 0,          // se completa después
        columnsInData: [],        // se completa después
        columnsInContract: []     // se completa después
      }
    );

    // 5) Normalización: rows[] -> columnsData{} + datasetColumns[]
    const { columnsData, datasetColumns } = buildColumnsData(rows);

    // 6) Columnas declaradas por contrato
    // contractCols: lista de objetos {name, rules, criticality, ...}
    const contractCols = Array.isArray(contract?.columns) ? contract.columns : [];
    const contractColNames = contractCols.map(c => c?.name).filter(Boolean);

    // 7) Completar metadata del dataset dentro del builder
    // Nota: mientras NO implementes setDatasetInfo(), tocamos el interno _report.
    // Futuro: reemplazar por report.setDatasetInfo(...)
    report._report.dataset.totalColumns = datasetColumns.length;
    report._report.dataset.columnsInData = datasetColumns;
    report._report.dataset.columnsInContract = contractColNames;

    // 8) Validación de esquema (estructura):
    // - extra columns
    // - missing columns
    // SchemaValidator genera issues "schema". SeverityPolicy decide nivel.
    const schemaIssues = schemaValidator.validate(contract, datasetColumns);
    schemaIssues.forEach((iss) => {
      const level = severityPolicy.resolve(iss, contract);
      report.addIssue({ ...iss, level });
    });

    // 9) Validación de reglas (por columna):
    // Recorremos SOLO las columnas del contrato (fuente de verdad).
    contractCols.forEach((col) => {
      const colName = col?.name;
      if (!colName) return;

      const rulesConfig = col.rules || [];

      // 9.a) Si no existe la columna en el dataset:
      // - SchemaValidator ya la reportó como missing (según policy)
      // - aquí NO corremos reglas para evitar ruido/falsos positivos
      if (!(colName in columnsData)) {
        return;
      }

      // 9.b) Ejecutar motor por columna
      // data = vector de valores de esa columna
      const data = columnsData[colName];

      // violations: array de objetos con {column, index, value, message, ruleId}
      const violations = engine.validateColumn(colName, data, rulesConfig);

      // 9.c) Mapear violations -> issues (tipo "rule")
      // Nota clave:
      // - rowIndex interno = 0-based
      // - si una regla reporta index 'N/A', lo convertimos a null
      violations.forEach((v) => {
        const rowIndex =
          (v.index === 'N/A' || v.index === null || v.index === undefined)
            ? null
            : v.index;

        const issue = {
          type: 'rule',
          code: null,
          column: v.column || colName,
          ruleId: v.ruleId || v.rule || (v.id ?? null),
          rowIndex,
          value: (v.value === undefined ? null : v.value),
          message: v.message || v.msg || v.description || 'Violación',
          context: {}
        };

        // Resolver severidad final con SeverityPolicy (criticality, etc.)
        const level = severityPolicy.resolve(issue, contract);

        // Registrar issue en el reporte v2
        report.addIssue({ ...issue, level });
      });
    });

    // 10) Finalizar reporte:
    // - convierte Sets a arrays
    // - genera fingerprints (si faltan)
    // - deja counters/groups consistentes
    const finalReport = report.finalize();

    // 11) Render reporte v2:
    // ValidationReportViewer convierte rowIndex->fila humana (rowIndex+1) solo en UI.
    reportViewer.render(finalReport);

    // 12) Mensaje breve de estado:
    const hadErrors = (finalReport.counters?.errors || 0) > 0;
    const hadWarnings = (finalReport.counters?.warnings || 0) > 0;

    const msg =
      hadErrors
        ? `❌ Validación completada con errores: ${finalReport.counters.errors} error(es), ${finalReport.counters.warnings} warning(s).`
        : hadWarnings
        ? `⚠️ Validación completada con warnings: ${finalReport.counters.warnings} warning(s).`
        : `✅ Validación completada sin hallazgos.`;

    // Mensaje final (resumen) usando el canal existente
    // Si hay errores: rojo. Si solo warnings: naranja. Si limpio: verde.
    const color = hadErrors ? '#d32f2f' : (hadWarnings ? '#f57c00' : '#388e3c');
    ui.outputElement.innerHTML = `<div style="color:${color}; font-weight:bold">${msg}</div>`;


  } catch (err) {
    ui.showError(err.message);
  }
});
