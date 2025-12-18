/**
 * src/main.js
 * Responsabilidad: Orquestador Principal
 */

// --- IMPORTACIONES ---

// Reglas
import { DomainRule } from './core/rules/DomainRule.js';
import { LengthRangeRule } from './core/rules/LengthRangeRule.js';
import { MaxMissingRateRule } from './core/rules/MaxMissingRateRule.js';
import { RangeRule } from './core/rules/RangeRule.js';
import { RegexRule } from './core/rules/RegexRule.js';
import { RequiredRule } from './core/rules/RequiredRule.js';
import { UniqueRule } from './core/rules/UniqueRule.js';

// Motor de reglas
import { RuleEngine } from './core/RuleEngine.js';

// Infraestructura
import { YamlContractParser } from './infrastructure/YamlContractParser.js';
import { ExcelDatasetLoader } from './infrastructure/ExcelDatasetLoader.js';
import { UIManager } from './ui/UIManager.js';
import { ContractViewer } from './ui/ContractViewer.js';
import { TooltipManager } from './ui/ToolTipManager.js';
import { FileDownloader } from './utils/FileDownloader.js';
import { ContractTreeViewer } from './ui/ContractTreeViewer.js';
import { RuleCatalogViewer } from './ui/RuleCatalogViewer.js';

// UI
import { LayoutResizer } from './ui/LayoutResizer.js';

// --- SETUP E INICIALIZACIÓN ---
const engine = new RuleEngine();
engine.registerRule(new RequiredRule());
engine.registerRule(new RangeRule());
engine.registerRule(new LengthRangeRule());
engine.registerRule(new MaxMissingRateRule());
engine.registerRule(new DomainRule());
engine.registerRule(new RegexRule());
engine.registerRule(new UniqueRule());

// Infraestructura
const parser = new YamlContractParser();
const loader = new ExcelDatasetLoader();
const ui = new UIManager();
const viewer = new ContractViewer();
const tooltipManager = new TooltipManager();
const downloader = new FileDownloader();
const treeViewer = new ContractTreeViewer('tab-tree');
const catalogViewer = new RuleCatalogViewer('tab-catalog', engine);

// Activar el redimensionamiento
new LayoutResizer('mainLayout', 'resizeGutter');

// --- VARIABLES GLOBALES ---
let currentContractObj = null;

// --- REFERENCIAS DOM ---
const yamlInput = document.getElementById('yamlInput');
const btnLoadYaml = document.getElementById('btnLoadYaml');
const yamlFileInput = document.getElementById('yamlFileInput');

const btnEdit = document.getElementById('btnEdit');
const btnSave = document.getElementById('btnSave');
const btnCancel = document.getElementById('btnCancel');

// --- HELPERS (Paso 5: severidad y políticas) ---

/** Normaliza schema_policy con defaults seguros */
function getSchemaPolicy(contract) {
  const sp = contract?.schema_policy || {};
  return {
    mode: sp.mode || 'strict',
    on_extra_columns: (sp.on_extra_columns || 'warn').toLowerCase(),   // warn|fail|ignore
    on_missing_columns: (sp.on_missing_columns || 'fail').toLowerCase() // warn|fail|ignore
  };
}

/** Mapea criticidad -> severidad por defecto */
function severityFromCriticality(criticality) {
  const c = (criticality || 'low').toLowerCase();
  if (c === 'high') return 'error';
  if (c === 'medium') return 'warning';
  return 'warning';
}

/** Agrega item al reporte y actualiza contadores */
function pushFinding(report, { level, row, col, val, msg, ruleId = null }) {
  const lvl = (level || 'error').toLowerCase();

  if (lvl === 'warning') report.totalWarnings++;
  else report.totalErrors++;

  report.details.push({ level: lvl, row, col, val, msg, ruleId });
}

/** Construye “columnsData” y además lista de columnas detectadas */
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

// --- LÓGICA DE SINCRONIZACIÓN (Texto <-> Objeto <-> Visor) ---

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
    // Ignorar errores mientras se escribe
  }
};

const syncFromMemory = () => {
  try {
    const newYaml = parser.stringify(currentContractObj);
    yamlInput.value = newYaml;
    viewer.render(currentContractObj);
  } catch (e) {
    console.error("Error sync memory:", e);
  }
};

yamlInput.addEventListener('input', syncFromText);

// --- LÓGICA DE CARGA DE ARCHIVOS ---
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
      ui.showResult(`📂 Contrato "${file.name}" cargado.`, false);
    };
    reader.readAsText(file);
  });
}

// --- LÓGICA DE EDICIÓN ---
if (btnEdit) {
  btnEdit.addEventListener('click', () => {
    if (!currentContractObj) {
      alert("Primero carga un contrato válido.");
      return;
    }
    viewer.toggleEdit(true);
    yamlInput.disabled = true;

    btnEdit.classList.add('hidden');
    btnSave.classList.remove('hidden');
    btnCancel.classList.remove('hidden');
  });
}

if (btnSave) {
  btnSave.addEventListener('click', () => {
    syncFromMemory();

    const fileName = `contract_v${currentContractObj.contract_version || '1.0'}.yaml`;
    const yamlContent = yamlInput.value;
    downloader.download(yamlContent, fileName, 'text/yaml');

    viewer.toggleEdit(false);
    yamlInput.disabled = false;

    btnEdit.classList.remove('hidden');
    btnSave.classList.add('hidden');
    btnCancel.classList.add('hidden');
  });
}

if (btnCancel) {
  btnCancel.addEventListener('click', () => {
    syncFromText(); // descartar cambios

    viewer.toggleEdit(false);
    yamlInput.disabled = false;

    btnEdit.classList.remove('hidden');
    btnSave.classList.add('hidden');
    btnCancel.classList.add('hidden');
  });
}

// --- LÓGICA DE VALIDACIÓN (Excel) ---
ui.bindValidateClick(async () => {
  try {
    ui.showLoading();

    // Fuente de verdad: contrato en memoria (o texto si aún no existe)
    const contract = currentContractObj ?? parser.parse(yamlInput.value);
    if (!contract) throw new Error("Contrato inválido.");

    const file = ui.getDatasetFile();
    if (!file) throw new Error("Falta archivo de datos.");

    const rows = await loader.load(file);

    const report = {
      totalRows: rows.length,
      totalErrors: 0,
      totalWarnings: 0,
      details: [],
      summary: {}
    };

    const policy = getSchemaPolicy(contract);

    // 1) Normalizar dataset a columnas (vectors)
    const { columnsData, datasetColumns } = buildColumnsData(rows);

    // 2) Columnas del contrato
    const contractCols = contract.columns || [];
    const contractColNames = contractCols.map(c => c?.name).filter(Boolean);
    const contractColSet = new Set(contractColNames);

    // 3) Detectar columnas extra en el dataset (según policy)
    const extraColumns = datasetColumns.filter(c => !contractColSet.has(c));
    if (extraColumns.length > 0 && policy.on_extra_columns !== 'ignore') {
      const level = (policy.on_extra_columns === 'fail') ? 'error' : 'warning';
      extraColumns.forEach(colName => {
        pushFinding(report, {
          level,
          row: 'N/A',
          col: colName,
          val: '—',
          msg: `Columna presente en dataset pero no definida en el contrato (extra column).`
        });
      });
    }

    // 4) Validar columnas del contrato
    contractCols.forEach(col => {
      const colName = col?.name;
      if (!colName) return;

      const rulesConfig = col.rules || [];
      const colCrit = col.criticality || 'low';

      // 4.a) Missing column (según policy)
      if (!(colName in columnsData)) {
        if (policy.on_missing_columns !== 'ignore') {
          const level = (policy.on_missing_columns === 'fail') ? 'error' : 'warning';
          pushFinding(report, {
            level,
            row: 'N/A',
            col: colName,
            val: '—',
            msg: `Columna definida en el contrato pero ausente en el dataset (missing column).`
          });
        }
        return; // no correr reglas si no existe
      }

      // 4.b) Ejecutar motor por columna
      const data = columnsData[colName];

      const violations = engine.validateColumn(colName, data, rulesConfig);

      // 4.c) Clasificar severidad de violaciones usando criticality (Paso 5)
      const defaultLevel = severityFromCriticality(colCrit);

      violations.forEach(v => {
        const excelRow = (v.index === 'N/A') ? 'N/A' : (v.index + 2);

        pushFinding(report, {
          level: defaultLevel,
          row: excelRow,
          col: v.column,
          val: v.value,
          msg: v.message || v.msg || v.description || 'Violación',
          ruleId: v.ruleId || v.rule || (v.id ?? null)
        });
      });
    });

    // 5) Summary final (útil para UI)
    report.summary = {
      on_missing_columns: policy.on_missing_columns,
      on_extra_columns: policy.on_extra_columns,
      extra_columns_count: extraColumns.length,
      contract_columns_count: contractColNames.length,
      dataset_columns_count: datasetColumns.length
    };

    ui.renderReport(report);

    const hadErrors = report.totalErrors > 0;
    const hadWarnings = report.totalWarnings > 0;

    const msg =
      hadErrors
        ? `❌ Validación completada con errores: ${report.totalErrors} error(es), ${report.totalWarnings} warning(s).`
        : hadWarnings
        ? `⚠️ Validación completada con warnings: ${report.totalWarnings} warning(s).`
        : `✅ Validación completada sin hallazgos.`;

    // En tu UI, el 2do parámetro parece ser "isError"
    ui.showResult(msg, hadErrors);

  } catch (err) {
    ui.showError(err.message);
  }
});
