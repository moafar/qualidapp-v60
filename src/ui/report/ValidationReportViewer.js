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
          <span class="badge badge-error">error: ${counters.errors ?? 0}</span>
          <span class="badge badge-warning">warning: ${counters.warnings ?? 0}</span>
          <span class="badge badge-info">info: ${counters.info ?? 0}</span>
          <span class="muted">total: ${totalIssues}</span>
          <span class="muted">mostrados: ${shownIssues}</span>
        </div>

        <div class="report-controls">
          <label class="muted">Nivel:</label>
          <select id="vr_level" class="report-select">
            <option value="all"${level === 'all' ? ' selected' : ''}>All</option>
            <option value="error"${level === 'error' ? ' selected' : ''}>Error</option>
            <option value="warning"${level === 'warning' ? ' selected' : ''}>Warning</option>
            <option value="info"${level === 'info' ? ' selected' : ''}>Info</option>
          </select>

          <label class="muted" style="margin-left:10px;">Buscar:</label>
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

    const c = group.counters;
    const badgeHtml = `
      <span class="badge badge-error">E ${c.errors}</span>
      <span class="badge badge-warning">W ${c.warnings}</span>
      <span class="badge badge-info">I ${c.info}</span>
      <span class="muted">(${group.issues.length})</span>
    `;

    const body = expanded ? this._renderIssuesTable(group.issues) : '';

    return `
      <div class="report-group">
        <button class="report-group-header" data-col="${safeCol}">
          <span class="report-group-title">${safeCol}</span>
          <span class="report-group-badges">${badgeHtml}</span>
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
      const rowHuman = (iss.rowIndex === null || iss.rowIndex === undefined) ? '—' : String(iss.rowIndex + 2);      const type = iss.type || '—';
      const col = iss.column || '—';
      const rule = iss.ruleId || '—';
      const val = (iss.value === null || iss.value === undefined) ? '—' : String(iss.value);

      return `
        <tr>
          <td><span class="badge ${badgeClass}">${this._escape(iss.level || 'info')}</span></td>
          <td>${this._escape(type)}</td>
          <td>${this._escape(rowHuman)}</td>
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
    const levelSel = this.container.querySelector('#vr_level');
    const qInput = this.container.querySelector('#vr_q');

    if (levelSel) levelSel.addEventListener('change', this._onLevelChange);
    if (qInput) qInput.addEventListener('input', this._onSearch);

    // Delegación: headers de grupos
    this.container.querySelectorAll('.report-group-header').forEach((btn) => {
      btn.addEventListener('click', this._onToggleGroup);
    });
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

    // col viene escapado en HTML; lo usamos tal cual como key:
    // como nosotros escapamos consistente, la key en expanded debe ser el texto real.
    // Para evitar discrepancias, tomamos el texto mostrado:
    const displayed = e.currentTarget.querySelector('.report-group-title')?.textContent || col;

    if (this.state.expanded.has(displayed)) this.state.expanded.delete(displayed);
    else this.state.expanded.add(displayed);

    this.render(this._report);
  }

  // ------------------------------------------------------------
  // Utils
  // ------------------------------------------------------------

  _escape(s) {
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}
