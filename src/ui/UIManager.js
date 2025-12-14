/**
 * src/ui/UIManager.js
 * * Responsabilidad: Manejar la interacción con el usuario (DOM).
 */
export class UIManager {
    constructor() {
        this.yamlInput = document.getElementById('yamlInput');
        this.fileInput = document.getElementById('fileInput');
        this.btnValidate = document.getElementById('btnValidate');
        this.outputElement = document.getElementById('output');

        // Habilitar el botón solo si hay archivo seleccionado
        if (this.fileInput) {
            this.fileInput.addEventListener('change', () => {
                this.btnValidate.disabled = !this.fileInput.files.length;
            });
        }
    }

    getContractText() {
        return this.yamlInput.value;
    }

    getDatasetFile() {
        return this.fileInput.files[0];
    }

    bindValidateClick(callback) {
        if (this.btnValidate) {
            this.btnValidate.addEventListener('click', () => callback());
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
}