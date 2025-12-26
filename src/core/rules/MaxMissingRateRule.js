/**
 * src/core/rules/MaxMissingRateRule.js
 * Regla: Asegura que el porcentaje de valores nulos/vacíos en la columna no exceda un umbral (rate) definido.
 */
export class MaxMissingRateRule {
    
    // --- METADATOS PARA EL CATÁLOGO ---
    static description = 'Valida la integridad de la columna: El porcentaje de valores nulos o vacíos no debe superar el umbral definido (rate).';
    static parameters = {
        rate: { 
            type: 'number', 
            description: 'Tasa máxima de valores nulos permitida (ej: 0.05 para 5%).' 
        }
    };
    // ---------------------------------

    get id() { return 'max_missing_rate'; }

    /**
     * NOTA: Esta regla valida la columna completa.
     * @param {Array<*>} columnData - Todos los valores de la columna a validar.
     */
    validateColumn(columnData, config) {
        if (!Array.isArray(columnData) || columnData.length === 0) {
            return true;
        }

        const totalCount = columnData.length;
        if (totalCount === 0) return true;

        let missingCount = 0;
        
        columnData.forEach(value => {
            if (value === null || typeof value === 'undefined' || (typeof value === 'string' && value.trim() === '')) {
                missingCount++;
            }
        });

        const missingRate = missingCount / totalCount;
        const maxRate = config.rate !== undefined ? parseFloat(config.rate) : 0;

        return missingRate <= maxRate;
    }

    /**
     * Genera un objeto de violación.
     */
    createViolation(config, missingRate) {
        return {
            rule: this.id,
            severity: config.severity || 'hard',
            message: `La tasa de valores ausentes (${(missingRate * 100).toFixed(2)}%) excede el límite máximo permitido (${(config.rate * 100).toFixed(2)}%).`,
            context: { max_rate: config.rate, actual_rate: missingRate }
        };
    }
}