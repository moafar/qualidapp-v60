/**
 * src/ui/UIManager.js
 * * Responsabilidad: Manejar la interacción con el usuario (DOM).
 */
export class UIManager {
    constructor() {
        this.yamlInput = document.getElementById('yamlInput');
        this.fileInput = document.getElementById('fileInput');
        this.contractSelect = document.getElementById('contractSelect');
        this.contractSelectDataset = document.getElementById('contractSelectDataset');
        this.contractSelectStatus = document.getElementById('contractSelectStatus');
        this.contractSelectStatusDataset = document.getElementById('contractSelectStatusDataset');
        this.btnValidate = document.getElementById('btnValidate');
        this.btnValidateDataset = document.getElementById('btnValidateDataset');
        this.validateButtons = [this.btnValidate, this.btnValidateDataset].filter(Boolean);
        this.outputElement = document.getElementById('output');
        this.datasetFileLabel = document.getElementById('datasetFileLabel');
        this.validationContext = document.getElementById('validationContext');
        this.globalSpinner = document.getElementById('globalSpinner');

        this._datasetSelected = false;
        this._contractSelected = false;
        this._contractChangeHandler = null;

        // Habilitar el botón solo si hay archivo seleccionado
        if (this.fileInput) {
            this.fileInput.addEventListener('change', () => {
                this.setDatasetSelected(false);
                this.setDatasetFileName(this.fileInput.files[0]?.name || null);
                this.updateValidationContext(null);
            });
        }

        const handleContractChange = (value, source) => {
            this._contractSelected = false;
            this._updateValidateEnabled();

            if (source === 'contract' && this.contractSelectDataset) {
                this.contractSelectDataset.value = value;
            } else if (source === 'dataset' && this.contractSelect) {
                this.contractSelect.value = value;
            }

            if (typeof this._contractChangeHandler === 'function') {
                this._contractChangeHandler(value);
            }
        };

        if (this.contractSelect) {
            this.contractSelect.addEventListener('change', () => {
                handleContractChange(this.contractSelect.value, 'contract');
            });
        }

        if (this.contractSelectDataset) {
            this.contractSelectDataset.addEventListener('change', () => {
                handleContractChange(this.contractSelectDataset.value, 'dataset');
            });
        }

        this.setDatasetFileName(null);
        this.updateValidationContext(null);
        this._updateValidateEnabled();
    }

    getContractText() {
        return this.yamlInput.value;
    }

    getDatasetFile() {
        return this.fileInput.files[0];
    }

    bindValidateClick(callback) {
        this.validateButtons.forEach((btn) => {
            btn.addEventListener('click', () => callback());
        });
    }

    bindContractChange(callback) {
        this._contractChangeHandler = callback;
    }

    /**
     * Muestra el spinner de carga global.
     */
    showSpinner() {
        if (this.globalSpinner) {
            this.globalSpinner.classList.remove('hidden');
            // Fuerza reflow para asegurar que se renderiza antes de cambios rápidos
            this.globalSpinner.offsetHeight;
        }
    }

    /**
     * Oculta el spinner de carga global.
     */
    hideSpinner() {
        if (this.globalSpinner) {
            this.globalSpinner.classList.add('hidden');
        }
    }

    /**
     * Muestra el estado de "Cargando..."
     */
    showLoading() {
        this.outputElement.innerHTML = '<div style="color:blue">⏳ Procesando archivo...</div>';
    }

    /**
     * Muestra el reporte final de validación.
     * @param {object} report - Objeto con totalRows, totalErrors y lista de detalles.
     */
    renderReport(report) {
        if (!report) return;

        let html = '';

        // 1. Resumen
        const color = report.totalErrors > 0 ? '#d32f2f' : '#388e3c';
        const status = report.totalErrors > 0 ? 'CON ERRORES' : 'VÁLIDO';
        
        html += `<h3 style="color:${color}; text-align:center">${status}</h3>`;
        html += `<p style="text-align:center">
                    Filas procesadas: <strong>${report.totalRows}</strong> | 
                    Errores encontrados: <strong>${report.totalErrors}</strong>
                 </p>`;

        // 2. Lista de Errores (Limitada a 50 para no colgar el navegador)
        if (report.details.length > 0) {
            html += `<div style="border-top:1px solid #ccc; margin-top:10px; padding-top:10px;">`;
            
            // Renderizamos cada error
            report.details.slice(0, 50).forEach(err => {
                html += `
                    <div class="error-item">
                        <strong>Fila ${err.row}</strong> [${err.col}]: 
                        <span style="color:#d32f2f">${err.msg}</span> 
                        <span style="color:#888; font-size:0.85em">(Valor: "${err.val}")</span>
                    </div>
                `;
            });

            if (report.details.length > 50) {
                html += `<div style="text-align:center; color:#666; margin-top:10px;">
                            ... y ${report.details.length - 50} errores más ocultos.
                         </div>`;
            }
            html += `</div>`;
        } else {
            html += `<div class="success-msg">✨ ¡El dataset cumple con todas las reglas! ✨</div>`;
        }

        this.outputElement.innerHTML = html;
    }

    showError(message) {
        this.outputElement.innerHTML = `<div style="color:red; font-weight:bold">⚠️ Error del Sistema: ${message}</div>`;
    }

    setDatasetFileName(name) {
        if (!this.datasetFileLabel) return;
        this.datasetFileLabel.textContent = name
            ? `Seleccionado: ${name}`
            : 'Ningún archivo seleccionado.';
    }

    updateValidationContext(context) {
        if (!this.validationContext) return;
        if (!context) {
            this.validationContext.innerHTML = '<div class="validation-context-empty">Carga un dataset y ejecuta la validación para ver el contexto.</div>';
            return;
        }

        const cards = [
            {
                label: 'Archivo dataset',
                value: context.datasetFileName || '—',
                hint: 'Fuente cargada',
            },
            {
                label: 'Filas procesadas',
                value: this._formatNumber(context.datasetRows),
                hint: 'Registros leídos',
            },
            {
                label: 'Columnas detectadas',
                value: this._formatNumber(context.datasetColumns),
                hint: 'Según dataset',
            },
            {
                label: 'Contrato',
                value: context.contractLabel || '—',
                hint: context.contractVersion ? `Versión ${context.contractVersion}` : 'Sin versión',
            },
        ];

        const cardsHtml = cards
            .map(
                (card) => `
                <div class="validation-context-card">
                    <span>${card.label}</span>
                    <strong>${card.value}</strong>
                    <span>${card.hint}</span>
                </div>`
            )
            .join('');

        this.validationContext.innerHTML = `
            <div class="validation-context-cards">${cardsHtml}</div>
        `;
    }

    setValidateEnabled(enabled) {
        this.validateButtons.forEach((btn) => {
            btn.disabled = !enabled;
        });
    }

    setContractOptions(contracts) {
        const defaultOptionContract = '<option value="">Selecciona un contrato para visualizar</option>';
        const defaultOptionDataset = '<option value="">Selecciona un contrato para validar</option>';
        const options = (contracts || [])
            .map((c) => `<option value="${c.id}">${c.name || c.id}${c.version ? ` (v${c.version})` : ''}</option>`)
            .join('');

        if (this.contractSelect) {
            this.contractSelect.innerHTML = `${defaultOptionContract}${options}`;
        }
        if (this.contractSelectDataset) {
            this.contractSelectDataset.innerHTML = `${defaultOptionDataset}${options}`;
        }
    }

    setContractStatus(_message) {}

    setContractSelected(isReady) {
        this._contractSelected = Boolean(isReady);
        this._updateValidateEnabled();
    }

    setDatasetSelected(isReady) {
        this._datasetSelected = Boolean(isReady);
        this._updateValidateEnabled();
    }

    setContractValue(contractId) {
        const value = contractId || '';
        if (this.contractSelect) this.contractSelect.value = value;
        if (this.contractSelectDataset) this.contractSelectDataset.value = value;
    }

    _updateValidateEnabled() {
        this.setValidateEnabled(this._datasetSelected && this._contractSelected);
    }

    _formatNumber(value) {
        if (value === null || value === undefined || Number.isNaN(value)) return '—';
        const num = Number(value);
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return String(num);
    }
}