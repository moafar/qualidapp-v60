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
        this.renderTree(contract);
        this.renderCatalog(contract);

        // Actualizar versión en header: mostrar la versión de la aplicación si está disponible
        const badge = document.getElementById('versionBadge');
        if (badge) {
            // obtener versión de la app (cacheada)
            this.getAppVersion().then(appVer => {
                const ver = appVer || (contract.contract_version || '1.0');
                badge.textContent = `v${ver}`;
            }).catch(() => {
                const ver = contract.contract_version || '1.0';
                badge.textContent = `v${ver}`;
            });
        }
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

    renderColumns(contract, filterText = '', filterCrit = '', filterType = '') {
        // OJO: en vez de pintar sobre #tab-columns, pintamos sobre su área scrolleable
        const scrollArea = this.containerColumns.querySelector('.columns-scroll');

        if (!scrollArea) {
            console.error('No se encontró .columns-scroll dentro de #tab-columns');
            return;
        }

        if (!contract.columns) {
            scrollArea.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:20px;">
            Contrato vacío. Añade una columna en modo edición.
            </div>`;
            return;
        }

        let cols = contract.columns;

        if (!this.isEditMode && (filterText || filterCrit || filterType)) {
            cols = cols.filter(c => {
            const matchText =
                (c.name || '').toLowerCase().includes((filterText || '').toLowerCase()) ||
                (c.description || '').toLowerCase().includes((filterText || '').toLowerCase());

            const matchCrit = filterCrit ? c.criticality === filterCrit : true;
            const matchType = filterType ? c.expected_type === filterType : true;

            return matchText && matchCrit && matchType;
            });
        }

        const rows = cols.map((col, index) => (
            this.isEditMode ? this._renderRowEdit(col, index) : this._renderRowRead(col)
        )).join('');

        const addBtn = this.isEditMode
            ? `<tr><td colspan="6" style="text-align:center; padding:10px;">
                <button class="btn-header" data-action="add-col">+ Añadir Columna</button>
            </td></tr>`
            : '';

        scrollArea.innerHTML = `
            <table class="columns-table">
            <thead>
                <tr>
                <th width="15%" data-tooltip="Nombre exacto de la columna en el dataset.">Columna</th>
                <th width="15%" data-tooltip="Indica si la columna contiene datos sensibles.">Sensitive</th>
                <th width="10%" data-tooltip="Tipo de dato esperado (text, numeric, date, etc.).">Tipo</th>
                <th width="10%" data-tooltip="Importancia de la columna. Un fallo High detiene el proceso.">Criticidad</th>
                <th width="30%" data-tooltip="Descripción funcional del campo.">Descripción</th>
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
    const critColor =
        col.criticality === 'high'
        ? 'var(--crit-high-fg)'
        : col.criticality === 'medium'
        ? 'var(--crit-med-fg)'
        : 'var(--crit-low-fg)';

    // Detecta sensibilidad desde el nuevo campo escalar
    const s = (col.sensitivity || '').toLowerCase();

    const sensitiveBadge =
        s === 'pii'
            ? `<span class="badge badge-pii">PII</span>`
            : s === 'quasi_identifier'
            ? `<span class="badge badge-qid">QID</span>`
            : '—';

    const RULE_DESCRIPTIONS = {
        required: 'Asegura que la columna no contenga valores nulos o vacíos.',
        range: 'Valida que los valores numéricos se encuentren dentro de un rango [min, max] definido.',
        regex: 'Asegura que el formato de la cadena de texto coincida con un patrón específico.',
        default: 'Regla de validación estándar. Haz clic para más detalles.',
    };

    const rulesHtml = (col.rules || [])
        .map((r) => {
        const ruleId = r.id;
        const description = RULE_DESCRIPTIONS[ruleId] || RULE_DESCRIPTIONS.default;

        let tooltipContent = `<strong style="font-size:13px;">Regla: ${ruleId}</strong><br>`;
        tooltipContent += `<span style="color:#a0aec0;">Descripción:</span> ${description}<br>`;

        for (const key in r) {
            if (key !== 'id' && typeof r[key] !== 'object') {
            tooltipContent += `<span style="color:#a0aec0;">${key}:</span> ${r[key]}<br>`;
            }
        }

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

    return `
        <tr>
        <td><code style="font-weight:bold;">${col.name}</code></td>
        <td class="col-sensitive">${sensitiveBadge || ''}</td>
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
                    <select class="edit-col" data-idx="${index}" data-field="sensitivity" style="width:100%">
                        <option value="" ${(col.sensitivity || '')==='' ? 'selected' : ''}>—</option>
                        <option value="pii" ${col.sensitivity==='pii' ? 'selected' : ''}>PII</option>
                        <option value="quasi_identifier" ${col.sensitivity==='quasi_identifier' ? 'selected' : ''}>QID</option>
                    </select>
                </td>
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
                <td style="text-align:center;">
                    <div style="display:flex; gap:6px; justify-content:center; align-items:center;">
                        <button class="btn-header" data-action="del-col" data-idx="${index}" style="color:red; border:none; padding:5px 8px;">×</button>
                        <button class="btn-header" data-action="toggle-rules" data-idx="${index}" style="padding:5px 8px;">Editar Reglas</button>
                    </div>
                </td>
            </tr>
            <tr class="rules-row" data-idx="${index}" style="display:none; background:var(--bg-card);">
                <td colspan="7" style="padding:8px 12px;">
                    <label style="display:block; font-size:12px; color:var(--text-muted); margin-bottom:6px;">Reglas (JSON editable) — ej: [{ "id": "range", "min": 0, "max": 100 }]</label>
                    <textarea class="edit-rules" data-idx="${index}" style="width:100%; height:90px; font-family: monospace; font-size:12px;">${(col.rules && JSON.stringify(col.rules, null, 2)) || '[]'}</textarea>
                    <div style="margin-top:6px; color:#666; font-size:12px;">Nota: escribe JSON válido. Si el JSON no es válido, no se aplicará hasta corregirlo.</div>
                </td>
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
                if (field === 'sensitivity') {
                    const v = (target.value || '').trim();
                    if (v === '') {
                        delete this.currentContract.columns[idx].sensitivity;
                    } else {
                        this.currentContract.columns[idx].sensitivity = v;
                    }
                } else {
                    this.currentContract.columns[idx][field] = target.value;
                }
            }

        }
        
        // 1.b Edición manual de reglas (textarea JSON)
        if (target.classList.contains('edit-rules')) {
            const idx = parseInt(target.dataset.idx, 10);
            const raw = target.value || '';
            try {
                const parsed = JSON.parse(raw);
                // Aceptamos solo arrays para `rules`
                if (Array.isArray(parsed)) {
                    this.currentContract.columns[idx].rules = parsed;
                    target.style.borderColor = '';
                } else {
                    // marcar como inválido visualmente
                    target.style.borderColor = 'crimson';
                }
            } catch (err) {
                // JSON inválido — no aplicar cambios, solo marcar
                target.style.borderColor = 'crimson';
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
            // Toggle mostrar/ocultar textarea de reglas
            if (e.target.dataset.action === 'toggle-rules') {
                const idx = parseInt(e.target.dataset.idx, 10);
                // Buscar la fila .rules-row correspondiente dentro del tbody
                const tbody = e.target.closest('tbody');
                if (!tbody) return;
                const ruleRow = tbody.querySelector(`tr.rules-row[data-idx="${idx}"]`);
                if (ruleRow) {
                    ruleRow.style.display = (ruleRow.style.display === 'none' || !ruleRow.style.display) ? 'table-row' : 'none';
                }
            }
        }
        
        // --- LÓGICA DE NAVEGACIÓN (SIEMPRE ACTIVA) ---
        // Esto maneja el clic en el enlace del tooltip
        if (e.target.dataset.action === 'show-catalog') {
            const ruleId = e.target.dataset.ruleId;
            
            // 1. Garantizar que la sección Contrato esté activa
            const contractPrimaryTab = document.querySelector('.primary-tabs .tab[data-target="section-contract"]');
            contractPrimaryTab?.click();

            // 2. Activar la pestaña del catálogo dentro de Contrato
            const catalogTab = document.querySelector('.tabs[data-scope="contract"] .tab[data-target="tab-catalog"]');
            catalogTab?.click();
            // Asegurarse de que el tooltip se oculte inmediatamente
            document.getElementById('dynamic-tooltip').style.display = 'none'; 
        }
    }

    // ------------------------------------
    //  SETUP UI (Pestañas y Filtros)
    // ------------------------------------

    _initTabs() {
        const tabsContainer = document.querySelector('.tabs[data-scope="contract"]');
        if (!tabsContainer) return;

        const tabs = tabsContainer.querySelectorAll('.tab');
        const contentPanes = document.querySelectorAll('.tab-pane[data-scope="contract"]');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetId = tab.dataset.target;

                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                contentPanes.forEach(p => {
                    if (p.id === targetId) {
                        p.classList.remove('hidden');
                    } else {
                        p.classList.add('hidden');
                    }
                });

                const toolbar = document.getElementById('filterToolbar');
                if (toolbar) toolbar.style.display = (targetId === 'tab-columns') ? 'flex' : 'none';
            });
        });

        const activeTab = tabsContainer.querySelector('.tab.active') || tabs[0];
        if (activeTab) {
            activeTab.dispatchEvent(new Event('click'));
        }
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

    // Intenta resolver la versión de la aplicación.
    async getAppVersion() {
        if (this._appVersion) return this._appVersion;

        // Intento 1: parsear CHANGELOG.md en busca de "## [x.y.z]" (acepta sufijos)
        try {
            const res = await fetch('/CHANGELOG.md', { cache: 'no-cache' });
            if (res.ok) {
                const txt = await res.text();
                const m = txt.match(/##\s*\[([\d]+\.[\d]+\.[\d]+(?:[^\]]*)?)\]/);
                if (m && m[1]) {
                    this._appVersion = m[1];
                    return this._appVersion;
                }
            }
        } catch (e) {
            // continuar con fallback
        }

        // Intento 2 (fallback robusto): comprobar archivos de release por GET (HEAD puede fallar en algunos servidores)
        const candidates = ['/v1.3.0', '/v1.2.1', '/v1.2.0'];
        for (const c of candidates) {
            try {
                const r = await fetch(c, { method: 'GET', cache: 'no-cache' });
                if (r.ok) {
                    this._appVersion = c.replace('/v', '');
                    return this._appVersion;
                }
            } catch (e) {
                // ignorar y seguir
            }
        }

        return null;
    }
}