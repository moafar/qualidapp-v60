/**
 * src/ui/RuleCatalogViewer.js
 * * Responsabilidad: Renderizar la lista de todas las reglas disponibles en el RuleEngine,
 * * incluyendo una Tabla de Contenidos (TOC) para navegación.
 */
export class RuleCatalogViewer {
    constructor(containerId, ruleEngine) {
        this.container = document.getElementById(containerId);
        this.engine = ruleEngine;
        
        if (this.container) {
            // Añadir el listener para la navegación de la TOC
            this.container.addEventListener('click', this._handleTocClick.bind(this));
        }
    }

    render() {
        if (!this.container) return;

        const rulesMap = this.engine.getRules();
        const ruleIds = Object.keys(rulesMap).sort(); // Ordenar alfabéticamente

        if (ruleIds.length === 0) {
            this.container.innerHTML = `<div style="padding:20px; color:var(--text-muted);">No hay reglas registradas en el RuleEngine.</div>`;
            return;
        }
        
        // --- 1. Generar la Tabla de Contenidos (TOC) y las tarjetas ---
        let tocHtml = '';
        const ruleCards = ruleIds.map(id => {
            const ruleInstance = rulesMap[id];
            
            const description = ruleInstance.constructor.description || 'Descripción no disponible.';
            const parameters = ruleInstance.constructor.parameters || {};

            // Añadir el enlace a la TOC
            tocHtml += `<a href="#rule-${id}" class="toc-link">${id}</a>`;

            const paramList = Object.keys(parameters).map(paramKey => {
                const param = parameters[paramKey];
                return `
                    <div class="kv rule-param">
                        <div class="k">${paramKey} (${param.type})</div>
                        <div>${param.description}</div>
                    </div>
                `;
            }).join('');

            // Asegurarse de que la tarjeta de la regla tenga un ID para el ancla
            return `
                <div class="card rule-card" id="rule-${id}"> 
                    <h3 class="rule-title">${id}</h3>
                    <p class="rule-description">${description}</p>
                    ${Object.keys(parameters).length > 0 ? '<h4>Parámetros de Configuración</h4>' : ''}
                    <div class="rule-params-list">${paramList}</div>
                </div>
            `;
        }).join('');
        
        // --- 2. Montar la estructura final con la TOC lateral ---
        this.container.innerHTML = `
            <div class="rule-catalog-layout">
                <div class="rule-toc-sidebar">
                    <h4>Catálogo de Reglas (${ruleIds.length})</h4>
                    <nav class="toc-nav">${tocHtml}</nav>
                </div>
                <div class="rule-content-area">
                    ${ruleCards}
                </div>
            </div>
        `;
    }

    /**
     * Maneja el clic en los enlaces de la TOC para un desplazamiento suave.
     */
    _handleTocClick(e) {
        const link = e.target.closest('.toc-link');
        if (link) {
            e.preventDefault(); // Detener el salto abrupto de HTML por defecto
            
            const targetId = link.getAttribute('href').substring(1); // Obtiene 'rule-ID'
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start' // Alinea el inicio del elemento con el inicio del área visible
                });
            }
        }
    }
}