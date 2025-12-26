/**
 * src/core/rules/RangeRule.js
 * Regla de ejemplo: Asegura que un valor numérico esté dentro de un rango.
 * Implementa la interfaz básica de una regla de RuleEngine.
 */
export class RangeRule {
    
    // --- METADATOS PARA EL CATÁLOGO ---
    static description = 'Valida que los valores numéricos se encuentren dentro de un rango inclusivo definido [min, max].';
    static parameters = {
        min: { 
            type: 'number', 
            description: 'Valor mínimo permitido (inclusivo).' 
        },
        max: { 
            type: 'number', 
            description: 'Valor máximo permitido (inclusivo).' 
        }
    };
    // ---------------------------------

    get id() { return 'range'; }

    /**
     * Valida si el valor numérico cumple con el rango.
     * @param {*} value - El valor a validar.
     * @param {object} config - Configuración de la regla (ej: { min: 0, max: 100 }).
     * @returns {boolean} True si está dentro del rango, False en caso contrario.
     */
    validate(value, config) {
        // Solo valida si el valor es un número
        if (typeof value !== 'number') {
            // Se asume que la validación de tipo se hace en otro sitio, aquí devolvemos true o manejamos error.
            // Para este ejemplo, solo nos interesa validar el rango si es un número.
            return true; 
        }

        const min = config.min !== undefined ? parseFloat(config.min) : -Infinity;
        const max = config.max !== undefined ? parseFloat(config.max) : Infinity;

        return value >= min && value <= max;
    }

    /**
     * Genera un objeto de violación si la validación falla.
     */
    createViolation(config) {
        const minDisplay = config.min !== undefined ? config.min : 'no límite inferior';
        const maxDisplay = config.max !== undefined ? config.max : 'no límite superior';
        
        return {
            rule: this.id,
            severity: config.severity || 'soft',
            message: `El valor está fuera del rango permitido [${minDisplay}, ${maxDisplay}].`,
            context: { min: config.min, max: config.max }
        };
    }
}