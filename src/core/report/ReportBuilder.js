/**
 * src/core/report/ReportBuilder.js
 * Responsabilidad: construir un reporte enriquecido (issues + counters + groups).
 * No decide severidad: asume issue.level ya resuelto.
 */
export class ReportBuilder {
  constructor() {
    this._report = null;
  }

  start(meta = {}, dataset = {}) {
    this._report = {
      meta: {
        contractId: meta.contractId || null,
        contractVersion: meta.contractVersion || null,
        datasetId: meta.datasetId || null,
        validatedAtISO: new Date().toISOString()
      },
      dataset: {
        totalRows: dataset.totalRows ?? 0,
        totalColumns: dataset.totalColumns ?? 0,
        columnsInData: dataset.columnsInData || [],
        columnsInContract: dataset.columnsInContract || []
      },
      counters: {
        errors: 0,
        warnings: 0,
        info: 0,
        byColumn: {},
        byRule: {},
        byType: { schema: { errors: 0, warnings: 0, info: 0 }, rule: { errors: 0, warnings: 0, info: 0 } }
      },
      issues: [],
      groups: {
        byColumn: {},
        byRule: {}
      }
    };
    return this;
  }

  addIssue(issue) {
    if (!this._report) throw new Error('ReportBuilder.start() debe llamarse antes de addIssue().');

    const normalized = this._normalizeIssue(issue);
    const idx = this._report.issues.length;
    this._report.issues.push(normalized);

    // counters global
    this._incCounter(this._report.counters, normalized.level);

    // counters por type
    if (normalized.type === 'schema' || normalized.type === 'rule') {
      this._incCounter(this._report.counters.byType[normalized.type], normalized.level);
    }

    // counters por columna
    const colKey = normalized.column || '__NO_COLUMN__';
    if (!this._report.counters.byColumn[colKey]) this._report.counters.byColumn[colKey] = { errors: 0, warnings: 0, info: 0 };
    this._incCounter(this._report.counters.byColumn[colKey], normalized.level);

    // counters por regla
    const ruleKey = normalized.ruleId || '__NO_RULE__';
    if (!this._report.counters.byRule[ruleKey]) this._report.counters.byRule[ruleKey] = { errors: 0, warnings: 0, info: 0 };
    this._incCounter(this._report.counters.byRule[ruleKey], normalized.level);

    // groups.byColumn
    if (!this._report.groups.byColumn[colKey]) {
      this._report.groups.byColumn[colKey] = {
        errors: 0, warnings: 0, info: 0,
        rules: {},
        sampleIssues: []
      };
    }
    this._incCounter(this._report.groups.byColumn[colKey], normalized.level);

    if (normalized.ruleId) {
      if (!this._report.groups.byColumn[colKey].rules[normalized.ruleId]) {
        this._report.groups.byColumn[colKey].rules[normalized.ruleId] = {
          errors: 0, warnings: 0, info: 0,
          sampleIssues: []
        };
      }
      this._incCounter(this._report.groups.byColumn[colKey].rules[normalized.ruleId], normalized.level);

      // sample por regla/col
      if (this._report.groups.byColumn[colKey].rules[normalized.ruleId].sampleIssues.length < 20) {
        this._report.groups.byColumn[colKey].rules[normalized.ruleId].sampleIssues.push(idx);
      }
    }

    // sample por columna
    if (this._report.groups.byColumn[colKey].sampleIssues.length < 20) {
      this._report.groups.byColumn[colKey].sampleIssues.push(idx);
    }

    // groups.byRule
    if (!this._report.groups.byRule[ruleKey]) {
      this._report.groups.byRule[ruleKey] = {
        errors: 0, warnings: 0, info: 0,
        columns: new Set(),
        sampleIssues: []
      };
    }
    this._incCounter(this._report.groups.byRule[ruleKey], normalized.level);
    if (normalized.column) this._report.groups.byRule[ruleKey].columns.add(normalized.column);
    if (this._report.groups.byRule[ruleKey].sampleIssues.length < 20) {
      this._report.groups.byRule[ruleKey].sampleIssues.push(idx);
    }

    return this;
  }

  finalize() {
    if (!this._report) throw new Error('No hay reporte para finalizar.');

    // convertir Sets a arrays (JSON friendly)
    for (const [ruleId, g] of Object.entries(this._report.groups.byRule)) {
      if (g.columns instanceof Set) g.columns = Array.from(g.columns);
    }

    // fingerprint estable (simple, sin hash)
    this._report.issues = this._report.issues.map((iss) => ({
      ...iss,
      fingerprint: iss.fingerprint || this._fingerprint(iss)
    }));

    return this._report;
  }

  _normalizeIssue(issue) {
    const level = (issue.level || 'error').toLowerCase();
    const type = issue.type || 'rule';

    return {
      type,                               // schema|rule
      code: issue.code || null,           // opcional
      level,                              // error|warning|info
      column: issue.column ?? null,
      ruleId: issue.ruleId ?? null,
      rowIndex: (issue.rowIndex === undefined ? null : issue.rowIndex),
      value: (issue.value === undefined ? null : issue.value),
      message: issue.message || 'Violación',
      context: issue.context || {},
      fingerprint: issue.fingerprint || null
    };
  }

  _incCounter(obj, level) {
    if (!obj) return;
    if (level === 'warning') obj.warnings++;
    else if (level === 'info') obj.info++;
    else obj.errors++;
  }

  _fingerprint(iss) {
    // clave estable (sin depender del texto completo)
    return [
      iss.type || '',
      iss.level || '',
      iss.column || '',
      iss.ruleId || '',
      (iss.rowIndex === null ? '' : String(iss.rowIndex)),
      iss.code || ''
    ].join('|');
  }
}
