/**
 * src/core/report/SeverityPolicy.js
 * Responsabilidad: decidir severidad (error|warning|info) para un issue.
 * - Para schema: depende de schema_policy.
 * - Para rule: depende de criticality de la columna (por ahora).
 */
export class SeverityPolicy {
  /**
   * @param {object} issue - {type, code, column, ruleId, rowIndex, ...}
   * @param {object} contract - contrato completo
   * @returns {'error'|'warning'|'info'}
   */
  resolve(issue, contract) {
    if (!issue || !issue.type) return 'error';

    if (issue.type === 'schema') {
      return this._schemaSeverity(issue, contract);
    }
    if (issue.type === 'rule') {
      return this._ruleSeverity(issue, contract);
    }

    return 'error';
  }

  _schemaSeverity(issue, contract) {
    const sp = contract?.schema_policy || {};
    const onExtra = (sp.on_extra_columns || 'warn').toLowerCase();
    const onMissing = (sp.on_missing_columns || 'fail').toLowerCase();

    if (issue.code === 'EXTRA_COLUMN') {
      if (onExtra === 'ignore') return 'info';
      if (onExtra === 'fail') return 'error';
      return 'warning';
    }

    if (issue.code === 'MISSING_COLUMN') {
      if (onMissing === 'ignore') return 'info';
      if (onMissing === 'fail') return 'error';
      return 'warning';
    }

    // default conservador
    return 'warning';
  }

  _ruleSeverity(issue, contract) {
    // Busca criticality de la columna en el contrato
    const colName = issue.column;
    const cols = Array.isArray(contract?.columns) ? contract.columns : [];
    const col = cols.find(c => c?.name === colName);

    const crit = (col?.criticality || 'low').toLowerCase();

    if (crit === 'high') return 'error';
    if (crit === 'medium') return 'warning';
    return 'warning';
  }
}
