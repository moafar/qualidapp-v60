/**
 * src/ui/report/ValidationReportViewer.js
 * Responsabilidad: Render del reporte v2 en UI.
 *
 * Features:
 * - Summary counters
 * - Filtro por severidad (error/warning/info)
 * - Search (columna/regla/mensaje/valor)
 * - Agrupación por columna (accordion simple)
 * - rowIndex interno (0-based) -> fila humana (1-based) solo en UI
 */
export class ValidationReportViewer {
  constructor(containerId = 'reportContainer') {
    this.container = document.getElementById(containerId);

    // Estado UI local (no contaminar core)
    this.state = {
      level: 'all', // all|error|warning|info
      q: '',        // texto de búsqueda
      expanded: new Set(), // columnas expandidas
    };

    // Bind handlers para no recrearlos en cada render
    this._onLevelChange = this._onLevelChange.bind(this);
    this._onSearch = this._onSearch.bind(this);
    this._onToggleGroup = this._onToggleGroup.bind(this);
    this._onRowTooltipClick = this._onRowTooltipClick.bind(this);
    this._onDocClick = this._onDocClick.bind(this);

    this._popoverEl = null;
    this._popoverAnchor = null;
  }

  render(report) {
    if (!this.container) {
      console.warn('[ValidationReportViewer] No existe el contenedor para el reporte.');
      return;
    }
    if (!report) {
      this.container.innerHTML = '<div class="muted">No hay reporte.</div>';
      return;
    }

    // Cache del último reporte para re-render por filtros
    this._report = report;

    // Normalizar estructuras defensivamente
    const counters = report.counters || { errors: 0, warnings: 0, info: 0 };
    const issues = Array.isArray(report.issues) ? report.issues : [];

    // Aplicar filtros
    const filtered = this._applyFilters(issues);

    // Agrupar por columna (incluye schema issues sin columna => "(sin columna)")
    const groups = this._groupByColumn(filtered);

    // UI header
    const headerHtml = this._renderHeader(counters, issues.length, filtered.length);

    // UI body (groups)
    const groupsHtml = this._renderGroups(groups);

    this.container.innerHTML = headerHtml + groupsHtml;

    // Wire events (delegación simple)
    this._wireEvents();
  }

  // ------------------------------------------------------------
  // Render blocks
  // ------------------------------------------------------------

  _renderHeader(counters, totalIssues, shownIssues) {
    const level = this.state.level;
    const q = this.state.q;

    return `
      <div class="report-header">
        <div class="report-counters">
          <span class="badge badge-violations">violaciones: ${totalIssues}</span>
          ${totalIssues !== shownIssues ? `<span class="muted">mostrados: ${shownIssues}</span>` : ''}
        </div>

        <div class="report-controls">
          <label class="muted">Buscar:</label>
          <input id="vr_q" class="report-input" type="text" placeholder="columna, regla, mensaje, valor..."
                 value="${this._escape(q)}" />
        </div>
      </div>
      <hr/>
    `;
  }

  _renderGroups(groups) {
    if (groups.length === 0) {
      return `<div class="muted">No hay issues para los filtros actuales.</div>`;
    }

    // Orden: primero columnas con errores, luego warnings, luego info
    groups.sort((a, b) => {
      const aScore = (a.counters.errors * 100) + (a.counters.warnings * 10) + a.counters.info;
      const bScore = (b.counters.errors * 100) + (b.counters.warnings * 10) + b.counters.info;
      return bScore - aScore;
    });

    return `
      <div class="report-groups">
        ${groups.map(g => this._renderGroup(g)).join('')}
      </div>
    `;
  }

  _renderGroup(group) {
    const col = group.column;
    const safeCol = this._escape(col);
    const expanded = this.state.expanded.has(col);

    const body = expanded ? this._renderIssuesTable(group.issues) : '';

    return `
      <div class="report-group">
        <button class="report-group-header" data-col="${safeCol}">
          <span class="report-group-title">${safeCol} (${group.issues.length})</span>
          <span class="report-group-chevron">${expanded ? '▾' : '▸'}</span>
        </button>
        ${expanded ? `<div class="report-group-body">${body}</div>` : ''}
      </div>
    `;
  }

  _renderIssuesTable(issues) {
    // Limitar para no colgar UI si hay miles
    const LIMIT = 300;
    const slice = issues.slice(0, LIMIT);

    const rowsHtml = slice.map((iss) => {
      const badgeClass =
        iss.level === 'error' ? 'badge-error' :
        iss.level === 'warning' ? 'badge-warning' : 'badge-info';

      // +2 asumiendo: fila 1 = encabezados, fila 2 = primer registro
      const rowHuman = (iss.rowIndex === null || iss.rowIndex === undefined) ? '—' : String(iss.rowIndex + 2);
      const type = iss.type || '—';
      const col = iss.column || '—';
      const rule = iss.ruleId || '—';
      const val = (iss.value === null || iss.value === undefined) ? '—' : String(iss.value);

      // Tooltip HTML con la fila completa; usamos la copia única de rows adjunta al reporte
      const rowData = (iss.rowIndex === null || iss.rowIndex === undefined) ? null : this._report?._rows?.[iss.rowIndex];
      const rowTooltip = this._formatRowTooltip(rowData, iss.column);
      const rowTooltipAttr = this._encodeForAttr(rowTooltip);

      return `
        <tr>
          <td><span class="badge ${badgeClass}">${this._escape(iss.level || 'info')}</span></td>
          <td>${this._escape(type)}</td>
          <td class="row-tooltip-cell" data-row-tooltip="${rowTooltipAttr}">${this._escape(rowHuman)}</td>
          <td>${this._escape(col)}</td>
          <td>${this._escape(rule)}</td>
          <td>${this._escape(val)}</td>
          <td>${this._escape(iss.message || '')}</td>
        </tr>
      `;
    }).join('');

    const tail =
      issues.length > LIMIT
        ? `<div class="muted" style="margin-top:8px;">Mostrando ${LIMIT} de ${issues.length} issues en este grupo.</div>`
        : '';

    return `
      <table class="report-table">
        <thead>
          <tr>
            <th>Nivel</th>
            <th>Tipo</th>
            <th>Fila</th>
            <th>Columna</th>
            <th>Regla</th>
            <th>Valor</th>
            <th>Mensaje</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      ${tail}
    `;
  }

  // ------------------------------------------------------------
  // Filters & grouping
  // ------------------------------------------------------------

  _applyFilters(issues) {
    const level = this.state.level;
    const q = (this.state.q || '').trim().toLowerCase();

    return issues.filter((iss) => {
      if (level !== 'all' && (iss.level || 'info') !== level) return false;
      if (!q) return true;

      const haystack = [
        iss.column,
        iss.ruleId,
        iss.type,
        iss.message,
        (iss.value === null || iss.value === undefined) ? '' : String(iss.value)
      ].join(' | ').toLowerCase();

      return haystack.includes(q);
    });
  }

  _groupByColumn(issues) {
    const map = new Map();

    for (const iss of issues) {
      const col = iss.column || '(sin columna)';
      if (!map.has(col)) {
        map.set(col, {
          column: col,
          issues: [],
          counters: { errors: 0, warnings: 0, info: 0 }
        });
      }
      const g = map.get(col);
      g.issues.push(iss);

      const lvl = iss.level || 'info';
      if (lvl === 'error') g.counters.errors++;
      else if (lvl === 'warning') g.counters.warnings++;
      else g.counters.info++;
    }

    return Array.from(map.values());
  }

  // ------------------------------------------------------------
  // Events
  // ------------------------------------------------------------

  _wireEvents() {
    const qInput = this.container.querySelector('#vr_q');

    if (qInput) qInput.addEventListener('input', this._onSearch);

    // Delegación: headers de grupos
    this.container.querySelectorAll('.report-group-header').forEach((btn) => {
      btn.addEventListener('click', this._onToggleGroup);
    });

    // Delegación: popover de fila (click para fijar)
    this.container.querySelectorAll('td[data-row-tooltip]').forEach((td) => {
      td.addEventListener('click', this._onRowTooltipClick);
    });

    // Listener global para cerrar al hacer click fuera
    if (!this._docClickAttached) {
      document.addEventListener('click', this._onDocClick);
      this._docClickAttached = true;
    }
  }

  _onLevelChange(e) {
    this.state.level = e.target.value;
    this.render(this._report);
  }

  _onSearch(e) {
    this.state.q = e.target.value || '';
    this.render(this._report);
  }

  _onToggleGroup(e) {
    const col = e.currentTarget.getAttribute('data-col');
    if (!col) return;

    // col es el nombre de la columna escapado. Lo usamos directamente como clave,
    // sin depender del texto mostrado que incluye el conteo entre paréntesis.
    if (this.state.expanded.has(col)) this.state.expanded.delete(col);
    else this.state.expanded.add(col);

    this.render(this._report);
  }

  // ------------------------------------------------------------
  // Utils
  // ------------------------------------------------------------

  _formatRowTooltip(rowData, highlightCol) {
    if (!rowData) return 'Fila no disponible';

    const entries = Object.entries(rowData);
    if (entries.length === 0) return 'Fila vacía';

    const lines = entries.map(([key, value]) => {
      const safeKey = this._escape(key);
      const safeVal = this._escape(value === null ? 'null' : value === undefined ? 'undefined' : String(value));
      const highlight = highlightCol && key === highlightCol ? ' tooltip-row-highlight' : '';
      return `<div class="tooltip-row-line${highlight}"><span class="tooltip-row-key">${safeKey}</span>: <span class="tooltip-row-val">${safeVal}</span></div>`;
    });

    return `<div class="tooltip-row">${lines.join('')}</div>`;
  }

  _encodeForAttr(html) {
    // Escapa para atributo HTML sin perder markup interno
    return String(html)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  _onRowTooltipClick(e) {
    e.stopPropagation();
    const cell = e.currentTarget;
    const tooltipHtml = cell.getAttribute('data-row-tooltip');
    if (!tooltipHtml) return;

    // Toggle si clic sobre mismo ancla
    if (this._popoverAnchor === cell && this._popoverEl?.style.display === 'block') {
      this._hidePopover();
      return;
    }

    this._showPopover(tooltipHtml, cell);
  }

  _onDocClick(e) {
    if (!this._popoverEl || this._popoverEl.style.display !== 'block') return;
    const isInsidePopover = this._popoverEl.contains(e.target);
    const isAnchor = e.target.closest('td[data-row-tooltip]');
    if (!isInsidePopover && !isAnchor) {
      this._hidePopover();
    }
  }

  _showPopover(html, anchorEl) {
    if (!this._popoverEl) {
      this._popoverEl = document.createElement('div');
      this._popoverEl.className = 'row-popover';
      document.body.appendChild(this._popoverEl);
    }

    this._popoverEl.innerHTML = `<div class="row-popover-inner">${html}</div>`;
    this._popoverEl.style.display = 'block';
    this._popoverAnchor = anchorEl;

    // Posicionamiento fijo cerca de la celda
    const rect = anchorEl.getBoundingClientRect();
    const margin = 8;
    const maxWidth = 560;
    const popWidth = Math.min(maxWidth, window.innerWidth - 2 * margin);
    this._popoverEl.style.width = `${popWidth}px`;

    // Medir altura después de asignar contenido
    const popRect = this._popoverEl.getBoundingClientRect();
    let left = rect.left;
    if (left + popWidth > window.innerWidth - margin) {
      left = window.innerWidth - margin - popWidth;
    }
    if (left < margin) left = margin;

    let top = rect.bottom + margin;
    const availableBelow = window.innerHeight - rect.bottom - margin;
    if (availableBelow < popRect.height && rect.top > availableBelow) {
      // Mostrar arriba si hay más espacio
      top = Math.max(margin, rect.top - popRect.height - margin);
    }

    this._popoverEl.style.left = `${left}px`;
    this._popoverEl.style.top = `${top}px`;
    this._popoverEl.style.position = 'fixed';
  }

  _hidePopover() {
    if (this._popoverEl) this._popoverEl.style.display = 'none';
    this._popoverAnchor = null;
  }

  _escape(s) {
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}
