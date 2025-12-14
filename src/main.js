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
const treeViewer = new ContractTreeViewer('tab-tree'); // Conecta al div #tab-tree
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


// --- LÓGICA DE SINCRONIZACIÓN (Texto <-> Objeto <-> Visor) ---

const syncFromText = () => {
    try {
        const text = yamlInput.value;
        currentContractObj = parser.parse(text);
        viewer.render(currentContractObj);
        
        treeViewer.render(currentContractObj); 
        
        // 3. RENDERIZAR EL CATÁLOGO (Solo se renderiza una vez al inicio)
        if (!catalogViewer._rendered) { // Usamos una bandera interna para renderizar solo una vez
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
        // 1. Guardar cambios (Objeto -> YAML)
        syncFromMemory();
        
        // --- 3. NUEVA LÓGICA DE DESCARGA ---
        const fileName = `contract_v${currentContractObj.contract_version || '1.0'}.yaml`;
        const yamlContent = yamlInput.value;
        downloader.download(yamlContent, fileName, 'text/yaml');
        // ------------------------------------

        // 4. Salir modo edición
        viewer.toggleEdit(false);
        yamlInput.disabled = false;
        
        // 5. Restaurar botones
        btnEdit.classList.remove('hidden');
        btnSave.classList.add('hidden');
        btnCancel.classList.add('hidden');
        
        // Eliminamos el alert anterior que pedía copiar
        // alert("✅ Contrato actualizado en memoria. Copia el YAML o descárgalo."); 
    });
}

if (btnCancel) {
    btnCancel.addEventListener('click', () => {
        syncFromText(); // Descartar cambios
        
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
        const contract = parser.parse(yamlInput.value);
        if (!contract) throw new Error("Contrato inválido.");

        const file = ui.getDatasetFile();
        if (!file) throw new Error("Falta archivo de datos.");
        
        const rows = await loader.load(file);
        
        // Validación
        const report = { totalRows: rows.length, totalErrors: 0, details: [] };
        const map = {};
        (contract.columns || []).forEach(c => map[c.name] = c.rules || []);
        
        rows.forEach((row, i) => {
            for (const colName in map) {
                const rules = map[colName];
                const val = row[colName];
                rules.forEach(r => {
                    const err = engine.validate(val, r);
                    if (err) {
                        report.totalErrors++;
                        report.details.push({ row: i+2, col: colName, val: val, msg: err });
                    }
                });
            }
        });
        
        ui.renderReport(report);

    } catch (err) {
        ui.showError(err.message);
    }
});