/**
 * src/ui/ContractTreeViewer.js
 * * Responsabilidad: Renderizar el objeto Contrato como una vista de árbol jerárquica
 * * con funcionalidad de colapsar/expandir.
 */
export class ContractTreeViewer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        
        if (this.container) {
            // Inicializar el manejador de clics para los toggles
            this.container.addEventListener('click', this._handleToggleClick.bind(this));
        }
    }

    render(contractObj) {
        if (!this.container) return;

        if (!contractObj) {
            this.container.innerHTML = '<div style="padding:20px; color:var(--text-muted);">No hay un contrato válido para visualizar el árbol.</div>';
            return;
        }

        const html = this._buildTree(contractObj, 0);
        
        // Aplicamos el estilo de la lista de árbol
        this.container.innerHTML = `<ul class="contract-tree">${html}</ul>`;

        // Expandir por defecto solo el nodo raíz
        const rootLabel = this.container.querySelector('.tree-label');
        if (rootLabel) {
            rootLabel.classList.add('expanded');
        }
    }

    /**
     * Función que maneja el clic en los iconos de expansión/colapso.
     */
    _handleToggleClick(e) {
        // Solo nos interesa el clic en el span.tree-toggle
        const toggle = e.target.closest('.tree-toggle');
        if (!toggle) return;

        // El .tree-label es el hermano que lleva la clase 'expanded'
        const label = toggle.nextElementSibling; 
        
        if (label && label.classList.contains('tree-label')) {
            label.classList.toggle('expanded');
            // Cambiar el icono visualmente (el CSS se encarga del display)
            toggle.textContent = label.classList.contains('expanded') ? '▼' : '►';
        }
    }

    /**
     * Función recursiva para construir la estructura de árbol.
     */
    _buildTree(node, depth, key = 'Contrato') {
        let html = '';
        
        const isArray = Array.isArray(node);
        const isObject = typeof node === 'object' && node !== null && !isArray;
        const isPrimitive = !isObject && !isArray;

        if (isObject || isArray) {
            let nodeLabel = isArray ? `${key} [${node.length}]` : key;
            if (depth === 0) {
                 nodeLabel = `Root Contract (v${node.contract_version || '1.0'})`;
            }
            
            // Recorrer hijos para ver si hay contenido (necesario para la visibilidad del toggle)
            const children = Object.keys(node).filter(subKey => Object.prototype.hasOwnProperty.call(node, subKey));
            const hasChildren = children.length > 0;

            // Determinar icono inicial: '►' (derecha/colapsado) o nada si no hay hijos
            const toggleIcon = hasChildren ? '►' : '';

            html += `<li class="${isArray ? 'tree-array' : 'tree-object'}">`;
            
            // 1. Botón de TOGGLE
            html += `<span class="tree-toggle">${toggleIcon}</span>`;
            
            // 2. Etiqueta del nodo
            html += `<span class="tree-label">${nodeLabel}</span>`;
            
            // 3. Recorrer y anidar hijos
            let innerHtml = '';
            children.forEach(subKey => {
                 innerHtml += this._buildTree(node[subKey], depth + 1, subKey);
            });
            
            if (innerHtml) {
                html += `<ul class="nested-list">${innerHtml}</ul>`;
            }
            
            html += `</li>`;
            
        } else if (isPrimitive) {
            let valueType = typeof node;
            if (valueType === 'string' && node.length > 50) {
                 node = node.substring(0, 50) + '...';
            }

            html += `<li class="tree-primitive">`;
            // Agregamos un toggle vacío para mantener la alineación horizontal
            html += `<span class="tree-toggle"></span>`; 
            html += `<span class="tree-key">${key}:</span> `;
            html += `<span class="tree-value tree-type-${valueType}">${node === null ? 'null' : node.toString()}</span>`;
            html += `</li>`;
        }
        
        return html;
    }
}