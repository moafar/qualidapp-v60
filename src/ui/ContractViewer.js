/**
 * src/ui/ContractViewer.js
 * Responsabilidad: Gestionar la visualización rica (Pestañas) y la Edición Bidireccional
 * del objeto Contrato en memoria.
 */
export class ContractViewer {
    constructor() {
        // Contenedores de las 5 pestañas
        this.containerOverview = document.getElementById('tab-overview');
        this.containerColumns = document.getElementById('tab-columns');
        this.containerTree = document.getElementById('tab-tree');
        this.containerCatalog = document.getElementById('tab-catalog');
        
        this.currentContract = null;
        this.isEditMode = false;

        // Diccionario de Metadatos para renderizar el Resumen
        this.META_LABELS = {
            'id': 'ID Dataset', 'owner': 'Propietario', 'description': 'Descripción',
            'domain': 'Dominio', 'mode': 'Modo Esquema', 'contract_version': 'Versión del Contrato'
        };

        this._initTabs();
        this._initFilters();
        
        // Escuchar eventos globales para Edición y Eliminación
        document.addEventListener('input', (e) => this._handleDynamicInput(e));
        document.addEventListener('click', (e) => this._handleDynamicClick(e));
    }

    /**
     * Activa/Desactiva modo edición y redibuja la interfaz.
     */
    toggleEdit(isActive) {
        this.isEditMode = isActive;
        if (this.currentContract) {
            this.render(this.currentContract);
        }
    }

    /**
     * Punto de entrada principal para dibujar el contrato.
     */
    render(contract) {
        this.currentContract = contract;
        if (!contract) return;

        // Renderizamos las vistas activas
        this.renderOverview(contract);
        this.renderColumns(contract);
        this.renderTree(contract); // Agregado para que sepas dónde pintar el árbol
        this.renderCatalog(contract); // Agregado para el catálogo

        // Actualizar versión en header
        const ver = contract.contract_version || '1.0';
        const badge = document.getElementById('versionBadge');
        if(badge) badge.textContent = `v${ver}`;
    }

    // ------------------------------------
    //  RENDERIZADORES DE PESTAÑAS
    // ------------------------------------

    /**
     * Renderiza la pestaña "Resumen" (Metadata Editable)
     */
    renderOverview(contract) {
        const d = contract.dataset || {};
        
        let html = '';
        
        // Renderizar Título y Descripción
        if (this.isEditMode) {
            html += `
                <div class="card">
                    <label style="font-size:0.8em; color:#888;">Título</label>
                    <input type="text" class="edit-meta" data-path="dataset.title" value="${d.title || ''}" style="width:100%; font-size:1.2em; font-weight:bold; margin-bottom:10px;">
                    
                    <label style="font-size:0.8em; color:#888;">Descripción</label>
                    <textarea class="edit-meta" data-path="dataset.description" style="width:100%; height:60px;">${d.description || ''}</textarea>
                </div>
            `;
        } else {
            html += `
                <div class="card">
                    <h2 style="margin-top:0">${d.title || 'Sin Título'}</h2>
                    <p style="color:var(--text-muted)">${d.description || '—'}</p>
                </div>
            `;
        }

        // Renderizar Metadatos Clave-Valor
        const fields = ['contract_version', 'id', 'owner', 'domain'];
        const rows = fields.map(key => {
            const label = this.META_LABELS[key] || key;
            const val = contract[key] || (d[key] || ''); // Busca en root o dataset
            
            if (this.isEditMode) {
                // Solo permitimos editar campos obvios del dataset, no la versión del contrato
                const path = (key === 'contract_version') ? `root.${key}` : `dataset.${key}`;
                
                return `<div class="kv">
                            <div class="k">${label}</div>
                            <div><input type="text" class="edit-meta" data-path="${path}" value="${val}" style="width:100%"></div>
                        </div>`;
            } else {
                return `<div class="kv"><div class="k">${label}</div><div>${val || '—'}</div></div>`;
            }
        }).join('');

        html += `<div class="card"><h3>Metadatos</h3>${rows}</div>`;
        this.containerOverview.innerHTML = html;
    }

/**
     * Renderiza la pestaña "Columns" (Tabla Editable o Leible)
     */
    renderColumns(contract, filterText = '', filterCrit = '', filterType = '') {
        if (!contract.columns) {
            this.containerColumns.innerHTML = `<div class="tab-pane" style="text-align:center; color:var(--text-muted)">Contrato vacío. Añade una columna en modo edición.</div>`;
            return;
        }
        
        let cols = contract.columns;

        // Filtros (solo en modo lectura)
        if (!this.isEditMode && (filterText || filterCrit || filterType)) {
            cols = cols.filter(c => {
                const matchText =
                    (c.name || '').toLowerCase().includes((filterText || '').toLowerCase()) ||
                    (c.description || '').toLowerCase().includes((filterText || '').toLowerCase());

                const matchCrit = filterCrit ? c.criticality === filterCrit : true;

                // NUEVO: filtro por tipo (expected_type)
                const matchType = filterType ? c.expected_type === filterType : true;

                return matchText && matchCrit && matchType;
            });
        }

        const rows = cols.map((col, index) => {
            if (this.isEditMode) {
                return this._renderRowEdit(col, index);
            } else {
                return this._renderRowRead(col);
            }
        }).join('');

        // Botón de Añadir Columna
        const addBtn = this.isEditMode 
            ? `<tr><td colspan="6" style="text-align:center; padding:10px;"><button class="btn-header" data-action="add-col">+ Añadir Columna</button></td></tr>` 
            : '';

        // --- INYECCIÓN DE TOOLTIPS EN ENCABEZADOS (TH) ---
        // Usamos el atributo data-tooltip directamente en los TH.
        this.containerColumns.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th width="20%" data-tooltip="Nombre exacto de la columna en el dataset.">Columna</th>
                        <th width="10%" data-tooltip="Tipo de dato esperado (text, numeric, date, etc.).">Tipo</th>
                        <th width="10%" data-tooltip="Importancia de la columna. Un fallo High detiene el proceso.">Criticidad</th>
                        <th width="35%" data-tooltip="Descripción funcional del campo.">Descripción</th>
                        <th width="20%" data-tooltip="Reglas de validación aplicadas a esta columna (Ej: required, range, regex).">Reglas</th>
                        ${this.isEditMode ? '<th width="50px"></th>' : ''} 
                    </tr>
                </thead>
                <tbody>${rows}${addBtn}</tbody>
            </table>
        `;
    }

    // Renderizado simple de las otras pestañas (placeholders)
    renderTree(contract) {
        console.log('Renderizando árbol...');
    }

    renderCatalog(contract) {
        console.log('Renderizando catálogo...');
    }

    // ------------------------------------
    //  HELPERS DE RENDERIZADO DE FILAS
    // ------------------------------------
    
    _renderRowRead(col) {
        const typeClass = `b-${col.expected_type || 'text'}`;
        const critColor = col.criticality === 'high' ? 'var(--crit-high-fg)' : 'var(--text-muted)';
        
        // --- Diccionario simulado de descripciones de Reglas ---
        const RULE_DESCRIPTIONS = {
            'required': 'Asegura que la columna no contenga valores nulos o vacíos.',
            'range': 'Valida que los valores numéricos se encuentren dentro de un rango [min, max] definido.',
            'regex': 'Asegura que el formato de la cadena de texto coincida con un patrón específico.',
            'default': 'Regla de validación estándar. Haz clic para más detalles.'
        };
        // --------------------------------------------------------

        // Lógica para Reglas
        const rulesHtml = (col.rules || [])
            .map(r => {
                const ruleId = r.id;
                const description = RULE_DESCRIPTIONS[ruleId] || RULE_DESCRIPTIONS['default'];

                // 1. Construir el contenido del tooltip (SOLO TEXTO)
                let tooltipContent = `<strong style="font-size:13px;">Regla: ${ruleId}</strong><br>`;
                tooltipContent += `<span style="color:#a0aec0;">Descripción:</span> ${description}<br>`;
                
                // Añadir parámetros específicos
                for (const key in r) {
                    if (key !== 'id' && typeof r[key] !== 'object') { 
                        tooltipContent += `<span style="color:#a0aec0;">${key}:</span> ${r[key]}<br>`;
                    }
                }
                
                // 2. Renderizar la etiqueta CON EL ENLACE DE ACCIÓN Y EL TOOLTIP
                return `<div 
                            class="rule-tag" 
                            style="cursor:pointer;"
                            data-tooltip="${tooltipContent.replace(/"/g, '&quot;')}"
                            data-action="show-catalog"
                            data-rule-id="${ruleId}">
                            ${ruleId}
                        </div>`;
            })
            .join('');

        // 3. Renderizar la fila
        return `
            <tr>
                <td><code style="font-weight:bold;">${col.name}</code></td>
                <td><span class="badge ${typeClass}">${col.expected_type || 'text'}</span></td>
                <td style="color:${critColor}; font-weight:600; font-size:12px;">${col.criticality || 'low'}</td>
                <td style="color:var(--text-muted)">${col.description || '—'}</td>
                <td>${rulesHtml}</td>
            </tr>
        `;
    }

    _renderRowEdit(col, index) {
        // Renderiza el modo edición (inputs para cambio bidireccional)
        return `
            <tr>
                <td><input type="text" class="edit-col" data-idx="${index}" data-field="name" value="${col.name || ''}" style="width:100%"></td>
                <td>
                    <select class="edit-col" data-idx="${index}" data-field="expected_type" style="width:100%">
                        <option value="text" ${col.expected_type==='text'?'selected':''}>text</option>
                        <option value="numeric" ${col.expected_type==='numeric'?'selected':''}>numeric</option>
                        <option value="identifier" ${col.expected_type==='identifier'?'selected':''}>identifier</option>
                        <option value="date" ${col.expected_type==='date'?'selected':''}>date</option>
                        <option value="boolean" ${col.expected_type==='boolean'?'selected':''}>boolean</option>
                    </select>
                </td>
                <td>
                     <select class="edit-col" data-idx="${index}" data-field="criticality" style="width:100%">
                        <option value="low" ${col.criticality==='low'?'selected':''}>low</option>
                        <option value="medium" ${col.criticality==='medium'?'selected':''}>medium</option>
                        <option value="high" ${col.criticality==='high'?'selected':''}>high</option>
                    </select>
                </td>
                <td><input type="text" class="edit-col" data-idx="${index}" data-field="description" value="${col.description || ''}" style="width:100%"></td>
                <td style="text-align:center;"><button class="btn-header" data-action="del-col" data-idx="${index}" style="color:red; border:none; padding:5px 8px;">×</button></td>
            </tr>
        `;
    }

    // ------------------------------------
    //  MANEJO DE EVENTOS (MODEL BINDING)
    // ------------------------------------

    /**
     * Maneja la actualización del Objeto Contrato en memoria cuando el usuario escribe.
     */
    _handleDynamicInput(e) {
        if (!this.isEditMode || !this.currentContract) return;
        
        const target = e.target;
        
        // 1. Edición de Columnas (Tabla)
        if (target.classList.contains('edit-col')) {
            const idx = target.dataset.idx;
            const field = target.dataset.field;
            if (this.currentContract.columns[idx]) {
                this.currentContract.columns[idx][field] = target.value;
            }
        }
        
        // 2. Edición de Metadatos (Resumen)
        if (target.classList.contains('edit-meta')) {
            const path = target.dataset.path.split('.'); // ej: dataset.title o root.contract_version
            const root = path[0];
            const key = path[1];
            
            if (root === 'dataset' && this.currentContract.dataset) {
                this.currentContract.dataset[key] = target.value;
            } else if (root === 'root') {
                 // Actualiza propiedades directamente en la raíz del contrato (ej. contract_version)
                 this.currentContract[key] = target.value;
            }
        }
    }

    /**
     * Maneja clics para acciones (Añadir/Eliminar columna, Navegación desde Tooltip).
     */
    _handleDynamicClick(e) {
        // La edición solo importa si está en modo edición
        if (this.isEditMode) {
            // Añadir Columna
            if (e.target.dataset.action === 'add-col') {
                if (!this.currentContract.columns) this.currentContract.columns = [];
                this.currentContract.columns.push({ name: 'nueva_columna', expected_type: 'text', criticality: 'low' });
                this.renderColumns(this.currentContract);
            }
            // Eliminar Columna
            if (e.target.dataset.action === 'del-col') {
                const idx = parseInt(e.target.dataset.idx);
                this.currentContract.columns.splice(idx, 1);
                this.renderColumns(this.currentContract);
            }
        }
        
        // --- LÓGICA DE NAVEGACIÓN (SIEMPRE ACTIVA) ---
        // Esto maneja el clic en el enlace del tooltip
        if (e.target.dataset.action === 'show-catalog') {
            const ruleId = e.target.dataset.ruleId;
            
            // 1. Encontrar y simular el clic en la pestaña "Rule catalog"
            const catalogTab = document.querySelector('.header-tabs .tab[data-target="tab-catalog"]');
            if (catalogTab) {
                 catalogTab.click(); // Activa la pestaña (reutilizando _initTabs)
                 
                 // Opcional: Desplazarse o resaltar la regla dentro del catálogo
                 // console.log(`Navegando al catálogo para ver la regla: ${ruleId}`);
            }
            // Asegurarse de que el tooltip se oculte inmediatamente
            document.getElementById('dynamic-tooltip').style.display = 'none'; 
        }
    }

    // ------------------------------------
    //  SETUP UI (Pestañas y Filtros)
    // ------------------------------------

    _initTabs() {
        // Este selector funciona para las pestañas en el header y los contenedores
        const tabs = document.querySelectorAll('.tab');
        const contentPanes = document.querySelectorAll('.tab-pane');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetId = tab.dataset.target;
                
                // 1. Alternar UI Activa (Botones)
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelector(`[data-target="${targetId}"]`).classList.add('active');
                
                // 2. Mostrar Contenido
                contentPanes.forEach(p => p.classList.add('hidden'));
                document.getElementById(targetId).classList.remove('hidden');

                // 3. Mostrar/Ocultar toolbar (Solo visible para la pestaña 'Columns')
                const toolbar = document.getElementById('filterToolbar');
                if(toolbar) toolbar.style.display = (targetId === 'tab-columns') ? 'flex' : 'none';
            });
        });
        
        // Inicializar la primera pestaña activa
        document.getElementById('tab-overview').classList.remove('hidden');
    }

    _initFilters() {
        const searchInput = document.getElementById('searchFilter');
        const critSelect = document.getElementById('critFilter');
        const typeSelect = document.getElementById('typeFilter');
        
        // La función de filtro se ejecuta y fuerza el redibujado de columnas
        const apply = () => {
            if (this.currentContract && !this.isEditMode) {
                this.renderColumns(
                    this.currentContract,
                    searchInput?.value || '',
                    critSelect?.value || '',
                    typeSelect?.value || ''      // <- PASAR EL TIPO
                );
            }
        };

        if(searchInput) searchInput.addEventListener('input', apply);
        if(critSelect) critSelect.addEventListener('change', apply);
        if(typeSelect) typeSelect.addEventListener('change', apply);
    }
}