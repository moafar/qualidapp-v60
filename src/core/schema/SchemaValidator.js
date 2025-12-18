/**
 * src/core/schema/SchemaValidator.js
 * Responsabilidad: Validar estructura del dataset vs contrato (schema_policy).
 * Devuelve issues tipo "schema" (sin severidad; eso lo decide SeverityPolicy).
 */

export class SchemaValidator {
  /**
   * @param {object} contract - contrato parseado (JS object)
   * @param {string[]} datasetColumns - columnas detectadas en el dataset
   * @returns {Array<object>} issues[]
   */
  validate(contract, datasetColumns) {
    const issues = [];

    const policy = this._getSchemaPolicy(contract);

    const contractCols = Array.isArray(contract?.columns) ? contract.columns : [];
    const contractColNames = contractCols.map(c => c?.name).filter(Boolean);

    const contractSet = new Set(contractColNames);
    const datasetSet = new Set(datasetColumns || []);

    // Extra columns: presentes en dataset pero no en contrato
    const extraColumns = (datasetColumns || []).filter(c => !contractSet.has(c));
    if (extraColumns.length > 0 && policy.on_extra_columns !== 'ignore') {
      extraColumns.forEach((colName) => {
        issues.push({
          type: 'schema',
          code: 'EXTRA_COLUMN',
          column: colName,
          ruleId: null,
          rowIndex: null,
          value: null,
          message: 'Columna presente en dataset pero no definida en el contrato (extra column).',
          context: { policy: policy.on_extra_columns }
        });
      });
    }

    // Missing columns: definidas en contrato pero ausentes en dataset
    const missingColumns = contractColNames.filter(c => !datasetSet.has(c));
    if (missingColumns.length > 0 && policy.on_missing_columns !== 'ignore') {
      missingColumns.forEach((colName) => {
        issues.push({
          type: 'schema',
          code: 'MISSING_COLUMN',
          column: colName,
          ruleId: null,
          rowIndex: null,
          value: null,
          message: 'Columna definida en el contrato pero ausente en el dataset (missing column).',
          context: { policy: policy.on_missing_columns }
        });
      });
    }

    return issues;
  }

  _getSchemaPolicy(contract) {
    const sp = contract?.schema_policy || {};
    return {
      mode: (sp.mode || 'strict').toLowerCase(),
      on_extra_columns: (sp.on_extra_columns || 'warn').toLowerCase(),     // warn|fail|ignore
      on_missing_columns: (sp.on_missing_columns || 'fail').toLowerCase() // warn|fail|ignore
    };
  }
}
