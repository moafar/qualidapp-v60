/**
 * src/core/rules/UniqueRule.js
 * Regla: Asegura que todos los valores en una columna sean únicos (sin duplicados).
 */
export class UniqueRule {
    
    // --- METADATOS PARA EL CATÁLOGO ---
    static description = 'Garantiza que todos los valores en la columna son distintos. Se usa para claves primarias o identificadores.';
    static parameters = {
        severity: { 
            type: 'string', 
            description: 'Define la criticidad de la violación (soft, hard). Default: hard.' // Unicidad suele ser crítica
        }
    };
    // ---------------------------------

    get id() { return 'unique'; }

    /**
     * NOTA: Esta regla no valida un valor individual, sino la columna completa.
     * La RuleEngine debe llamar a esta regla una vez por columna.
     * * @param {Array<*>} columnData - Todos los valores de la columna a validar.
     * @param {object} config - Configuración de la regla.
     * @returns {boolean} True si no hay duplicados.
     */
    validateColumn(columnData, config) {
        if (!Array.isArray(columnData) || columnData.length === 0) {
            return true;
        }

        // Usamos un Set para detectar duplicados rápidamente
        const seen = new Set();
        let isValid = true;

        columnData.forEach(value => {
            // Ignorar valores nulos o indefinidos, ya cubiertos por 'required'
            if (value === null || typeof value === 'undefined') {
                return;
            }

            // Convertir a string para manejar números y otros tipos de forma consistente en el Set
            const stringValue = String(value).trim();

            if (seen.has(stringValue)) {
                isValid = false;
            } else {
                seen.add(stringValue);
            }
        });

        return isValid;
    }

    /**
     * Genera un objeto de violación.
     */
    createViolation(config) {
        return {
            rule: this.id,
            severity: config.severity || 'hard',
            message: `La columna contiene valores duplicados, violando la restricción de unicidad.`,
            context: null // El contexto requiere análisis de todos los duplicados, lo simplificamos aquí
        };
    }
}