/**
 * src/ui/DatasetSummaryViewer.js
 * Responsabilidad: Renderizar métricas descriptivas y distribuciones del dataset cargado.
 */
export class DatasetSummaryViewer {
  constructor(containerId = 'datasetSummaryRoot') {
    this.container = document.getElementById(containerId);
    this.profile = null;
    this.state = {
      search: '',
      type: 'all',
      status: 'all',
      sort: 'name',
      onlyCritical: false,
      expanded: new Set(),
    };

    this._handleSearch = this._handleSearch.bind(this);
    this._handleTypeChange = this._handleTypeChange.bind(this);
    this._handleStatusChange = this._handleStatusChange.bind(this);
    this._handleSortChange = this._handleSortChange.bind(this);
    this._handleCriticalToggle = this._handleCriticalToggle.bind(this);
    this._handleToggleRow = this._handleToggleRow.bind(this);
  }

  showLoading() {
    if (!this.container) return;
    this.container.innerHTML = '<div class="dataset-summary-loading">⏳ Analizando dataset...</div>';
  }

  reset() {
    this.profile = null;
    this.state.expanded.clear();
    if (this.container) {
      this.container.innerHTML = '<div class="dataset-summary-empty">[Debe cargarse un dataset para ver su resumen estadístico]</div>';
    }
  }

  showError(message) {
    if (!this.container) return;
    this.container.innerHTML = `<div class="dataset-summary-error">⚠️ No se pudo generar el resumen del dataset: ${this._escape(message || 'error desconocido')}</div>`;
  }

  render(profile) {
    if (!this.container) return;
    if (!profile) {
      this.reset();
      return;
    }

    this.profile = profile;
    const summaryHtml = this._renderSummary(profile.summary, profile.generatedAt);
    const controlsHtml = this._renderControls();
    const tableHtml = this._renderTable(profile.columns || []);

    this.container.innerHTML = `
      <div class="dataset-summary">
        ${summaryHtml}
        ${controlsHtml}
        ${tableHtml}
      </div>
    `;

    this._attachEvents();
  }

  _renderSummary(summary = {}, generatedAt) {
    const cards = [
      {
        label: 'Filas',
        value: summary.totalRows ?? 0,
        hint: 'Registros procesados',
        accent: 'primary',
      },
      {
        label: 'Columnas cargadas',
        value: summary.totalColumns ?? 0,
        hint: `${summary.extraCount || 0} extra`,
        accent: 'secondary',
      },
      {
        label: 'Columnas contrato',
        value: summary.contractColumns ?? 0,
        hint: `${summary.missingCount || 0} faltantes`,
        accent: 'purple',
      },
      {
        label: 'Promedio nulos',
        value: this._formatPct(summary.nullAverage ?? 0),
        hint: 'Sobre columnas presentes',
        accent: 'amber',
      },
    ];

    const cardsHtml = cards
      .map(
        (card) => `
        <div class="ds-card ds-card-${card.accent}">
          <span class="ds-card-label">${card.label}</span>
          <strong>${this._formatCompact(card.value)}</strong>
          <small>${card.hint}</small>
        </div>`
      )
      .join('');

    const generatedText = generatedAt
      ? `Actualizado ${new Date(generatedAt).toLocaleString()}`
      : '';

    return `
      <div class="ds-cards">${cardsHtml}</div>
      <div class="ds-generated">${generatedText}</div>
    `;
  }

  _renderControls() {
    return `
      <div class="ds-toolbar">
        <div class="ds-toolbar-left">
          <label>Buscar</label>
          <input id="ds-search" type="text" placeholder="Nombre, tipo o flag..." value="${this._escape(this.state.search)}" />

          <label>Tipo</label>
          <select id="ds-type">
            ${this._options(
              [
                ['all', 'Todos'],
                ['numeric', 'Numérico'],
                ['datetime', 'Fecha'],
                ['categorical', 'Categórico'],
                ['text', 'Texto'],
                ['boolean', 'Booleano'],
                ['identifier', 'Identificador'],
              ],
              this.state.type
            )}
          </select>

          <label>Estado</label>
          <select id="ds-status">
            ${this._options(
              [
                ['all', 'Todos'],
                ['ok', 'En contrato'],
                ['extra', 'Extra'],
                ['missing', 'Faltante'],
              ],
              this.state.status
            )}
          </select>
        </div>
        <div class="ds-toolbar-right">
          <label>Ordenar</label>
          <select id="ds-sort">
            ${this._options(
              [
                ['name', 'Nombre'],
                ['nulls', '% Nulos'],
                ['coverage', 'Cobertura'],
                ['distinct', 'Unicidad'],
                ['criticality', 'Criticidad'],
              ],
              this.state.sort
            )}
          </select>

          <label class="ds-critical-toggle">
            <input type="checkbox" id="ds-critical" ${this.state.onlyCritical ? 'checked' : ''}>
            Solo criticidad alta
          </label>
        </div>
      </div>
    `;
  }

  _renderTable(columns) {
    const filtered = this._sortColumns(this._applyFilters(columns));
    if (!filtered.length) {
      return '<div class="dataset-summary-empty">No hay columnas que cumplan los filtros seleccionados.</div>';
    }

    const rowsHtml = filtered.map((col) => this._renderRow(col)).join('');

    return `
      <div class="ds-table-wrap">
        <table class="ds-table">
          <thead>
            <tr>
              <th style="width:28%">Columna</th>
              <th style="width:12%">Estado</th>
              <th style="width:20%">Tipos</th>
              <th style="width:15%">Cobertura</th>
              <th style="width:15%">% Nulos</th>
              <th style="width:10%">Unicidad</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  _renderRow(col) {
    const expanded = this.state.expanded.has(col.name);
    const stats = col.stats || {};
    const nullPct = stats.nullPct ?? 0;
    const coverage = stats.coveragePct ?? 0;
    const uniqueness = stats.uniqueRatio ?? 0;

    const statusBadge = this._statusBadge(col.status);
    const typeBadge = this._typeBadge(col.typeInferred, col.typeConfidence);
    const expected = col.expectedType ? `<span class="ds-pill">Esperado: ${this._escape(col.expectedType)}</span>` : '<span class="ds-pill muted">Sin especificar</span>';

    const toggleLabel = expanded ? 'Ocultar detalle' : 'Ver distribución';
    const toggleDisabled = col.status === 'missing';

    const mainRow = `
      <tr class="ds-row ${col.status}">
        <td>
          <div class="ds-colname">
            <button class="ds-row-toggle" data-action="toggle-row" data-col="${this._escape(col.name)}" ${toggleDisabled ? 'disabled' : ''}>
              ${expanded ? '▾' : '▸'}
            </button>
            <div>
              <strong>${this._escape(col.name)}</strong>
              ${this._renderColBadges(col)}
              <div class="ds-colmeta">Reglas: ${col.rulesCount || 0}${col.flags?.includes('high_nulls') ? ' • Nulos altos' : ''}</div>
            </div>
          </div>
        </td>
        <td>${statusBadge}</td>
        <td>
          ${expected}
          ${typeBadge}
        </td>
        <td>${this._progressBar(coverage)}</td>
        <td>${this._progressBar(1 - nullPct, '', true)}</td>
        <td>${this._progressBar(uniqueness)}</td>
      </tr>
    `;

    if (!expanded) {
      return mainRow;
    }

    return `
      ${mainRow}
      <tr class="ds-row-details">
        <td colspan="6">${this._renderRowDetails(col)}</td>
      </tr>
    `;
  }

  _renderRowDetails(col) {
    const stats = col.stats || {};
    const details = [
      ['Valores totales', this._formatCompact(stats.totalValues || 0)],
      ['Valores no nulos', this._formatCompact(stats.filledCount || 0)],
      ['% Nulos', this._formatPct(stats.nullPct || 0)],
      ['Valores únicos', stats.distinctIsCapped ? `${stats.distinctCount}+` : this._formatCompact(stats.distinctCount || 0)],
      ['Ejemplos', (stats.examples || []).join(', ') || '—'],
    ];

    if (stats.numeric) {
      details.push(['Min', this._formatNumber(stats.numeric.min)]);
      details.push(['Max', this._formatNumber(stats.numeric.max)]);
      details.push(['Promedio', this._formatNumber(stats.numeric.mean)]);
    }

    if (stats.text) {
      details.push(['Longitud media', this._formatNumber(stats.text.avgLength)]);
    }

    if (stats.booleanTruePct != null) {
      details.push(['% Verdadero', this._formatPct(stats.booleanTruePct)]);
    }

    const statsHtml = details
      .map((item) => `<div class="ds-stat"><span>${item[0]}</span><strong>${item[1]}</strong></div>`)
      .join('');

    const histogram = this._renderHistogram(col);
    const topValues = this._renderTopValues(stats.topValues || []);

    return `
      <div class="ds-detail">
        <div class="ds-detail-left">
          ${statsHtml}
        </div>
        <div class="ds-detail-right">
          <h4>Distribución</h4>
          ${histogram}
          <h4>Valores destacados</h4>
          ${topValues}
          <div class="ds-detail-foot">${col.flags?.includes('type_mismatch') ? '⚠️ El tipo detectado no coincide con el contrato.' : ''}</div>
        </div>
      </div>
    `;
  }

  _renderHistogram(col) {
    const hist = col.histogram;
    if (!hist) return '<div class="ds-hist-empty">No hay distribución disponible.</div>';

    if (hist.kind === 'categorical') {
      const max = Math.max(...hist.bins.map((b) => b.count), 1);
      return `
        <div class="ds-hist-categorical">
          ${hist.bins
            .map(
              (bin) => `
                <div class="ds-hist-row">
                  <span>${this._escape(bin.label)}</span>
                  <div class="ds-hist-bar">
                    <div class="ds-hist-bar-track">
                      <div style="width:${(bin.count / max) * 100}%"></div>
                    </div>
                    <em>${this._formatPct(bin.pct || 0)}</em>
                  </div>
                </div>`
            )
            .join('')}
        </div>
        ${hist.sampled ? '<small>Distribución basada en muestra.</small>' : ''}
      `;
    }

    const max = Math.max(...hist.bins.map((b) => b.count), 1);
    return `
      <div class="ds-hist-numeric">
        ${hist.bins
          .map(
            (bin) => `
              <div class="ds-hist-col" title="${this._escape(bin.label)}">
                <div class="ds-hist-col-bar" style="height:${(bin.count / max) * 100}%"></div>
                <span>${this._escape(bin.label)}</span>
              </div>`
          )
          .join('')}
      </div>
      ${hist.sampled ? '<small>Distribución basada en muestra.</small>' : ''}
    `;
  }

  _renderTopValues(values) {
    if (!values.length) return '<div class="ds-hist-empty">Sin valores destacados.</div>';
    return `
      <ul class="ds-top-values">
        ${values
          .map(
            (val) => `
              <li>
                <span>${this._escape(val.label)}</span>
                <strong>${this._formatPct(val.pct || 0)}</strong>
              </li>`
          )
          .join('')}
      </ul>
    `;
  }

  _renderColBadges(col) {
    const badges = [];
    if (col.criticality) {
      badges.push(`<span class="ds-badge crit-${col.criticality}">${col.criticality}</span>`);
    }
    if (col.sensitivity) {
      badges.push(`<span class="ds-badge sens-${col.sensitivity}">${col.sensitivity}</span>`);
    }
    return badges.join('');
  }

  _statusBadge(status) {
    const labels = {
      ok: 'En contrato',
      extra: 'Extra',
      missing: 'Faltante',
    };
    return `<span class="ds-status ds-status-${status}">${labels[status] || status}</span>`;
  }

  _typeBadge(type, confidence) {
    if (!type || type === 'empty') {
      return '<span class="ds-pill muted">Sin datos</span>';
    }
    const label = `${type} (${this._formatPct(confidence || 0)})`;
    return `<span class="ds-pill">Detectado: ${this._escape(label)}</span>`;
  }

  _progressBar(value = 0, label = '', invert = false) {
    const pct = Math.max(0, Math.min(1, value));
    const width = Math.round(pct * 100);
    const trackClass = invert ? 'ds-progress-track invert' : 'ds-progress-track';
    const text = this._formatPct(pct);
    const prefix = label ? `${label} ` : '';
    return `
      <div class="ds-progress">
        <div class="${trackClass}">
          <div style="width:${width}%"></div>
        </div>
        <span class="ds-progress-label">${prefix}${text}</span>
      </div>
    `;
  }

  _applyFilters(columns) {
    return columns.filter((col) => {
      if (!col) return false;
      if (this.state.status !== 'all' && col.status !== this.state.status) return false;
      if (this.state.onlyCritical && col.criticality !== 'high') return false;
      if (this.state.type !== 'all' && col.typeInferred !== this.state.type) return false;

      if (this.state.search) {
        const needle = this.state.search.toLowerCase();
        const haystack = [
          col.name,
          col.expectedType,
          col.typeInferred,
          ...(col.flags || []),
        ]
          .filter(Boolean)
          .join(' | ')
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }

      return true;
    });
  }

  _sortColumns(columns) {
    const collator = new Intl.Collator('es', { sensitivity: 'base' });
    const sorted = [...columns];
    switch (this.state.sort) {
      case 'nulls':
        sorted.sort((a, b) => (b.stats?.nullPct || 0) - (a.stats?.nullPct || 0));
        break;
      case 'coverage':
        sorted.sort((a, b) => (b.stats?.coveragePct || 0) - (a.stats?.coveragePct || 0));
        break;
      case 'distinct':
        sorted.sort((a, b) => (b.stats?.uniqueRatio || 0) - (a.stats?.uniqueRatio || 0));
        break;
      case 'criticality':
        sorted.sort((a, b) => this._critScore(b.criticality) - this._critScore(a.criticality));
        break;
      default:
        sorted.sort((a, b) => collator.compare(a.name, b.name));
    }
    return sorted;
  }

  _critScore(level) {
    if (level === 'high') return 3;
    if (level === 'medium') return 2;
    if (level === 'low') return 1;
    return 0;
  }

  _attachEvents() {
    const search = this.container.querySelector('#ds-search');
    const type = this.container.querySelector('#ds-type');
    const status = this.container.querySelector('#ds-status');
    const sort = this.container.querySelector('#ds-sort');
    const critical = this.container.querySelector('#ds-critical');

    if (search) search.addEventListener('input', this._handleSearch);
    if (type) type.addEventListener('change', this._handleTypeChange);
    if (status) status.addEventListener('change', this._handleStatusChange);
    if (sort) sort.addEventListener('change', this._handleSortChange);
    if (critical) critical.addEventListener('change', this._handleCriticalToggle);

    this.container.querySelectorAll('[data-action="toggle-row"]').forEach((btn) => {
      btn.addEventListener('click', this._handleToggleRow);
    });
  }

  _handleSearch(e) {
    this.state.search = e.target.value || '';
    this.render(this.profile);
  }

  _handleTypeChange(e) {
    this.state.type = e.target.value;
    this.render(this.profile);
  }

  _handleStatusChange(e) {
    this.state.status = e.target.value;
    this.render(this.profile);
  }

  _handleSortChange(e) {
    this.state.sort = e.target.value;
    this.render(this.profile);
  }

  _handleCriticalToggle(e) {
    this.state.onlyCritical = Boolean(e.target.checked);
    this.render(this.profile);
  }

  _handleToggleRow(e) {
    e.preventDefault();
    const col = e.currentTarget.getAttribute('data-col');
    if (!col) return;
    if (this.state.expanded.has(col)) this.state.expanded.delete(col);
    else this.state.expanded.add(col);
    this.render(this.profile);
  }

  _options(options, current) {
    return options
      .map(([value, label]) => `<option value="${value}" ${current === value ? 'selected' : ''}>${label}</option>`)
      .join('');
  }

  _escape(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  _formatPct(value) {
    const pct = Math.round((value || 0) * 1000) / 10;
    return `${pct}%`;
  }

  _formatCompact(value) {
    const num = Number(value) || 0;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return String(num);
  }

  _formatNumber(value) {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    return Number(value).toFixed(2);
  }
}
