/**
 * src/core/rules/LengthRangeRule.js
 * Regla: Asegura que la longitud de la cadena de texto esté dentro de un rango [min, max] de caracteres.
 */
export class LengthRangeRule {
    
    // --- METADATOS PARA EL CATÁLOGO ---
    static description = 'Valida que la longitud de la cadena de texto (número de caracteres) se encuentre dentro de un rango inclusivo definido [min, max].';
    static parameters = {
        min: { 
            type: 'number', 
            description: 'Longitud mínima permitida (inclusivo).' 
        },
        max: { 
            type: 'number', 
            description: 'Longitud máxima permitida (inclusivo).' 
        }
    };
    // ---------------------------------

    get id() { return 'length_range'; }

    /**
     * Valida si la longitud de la cadena cumple con el rango.
     */
    validate(value, config) {
        // Ignorar valores nulos/indefinidos (RequiredRule se encarga)
        if (value === null || typeof value === 'undefined') {
            return true;
        }

        const stringValue = String(value);
        const length = stringValue.length;

        const min = config.min !== undefined ? parseFloat(config.min) : -Infinity;
        const max = config.max !== undefined ? parseFloat(config.max) : Infinity;

        return length >= min && length <= max;
    }

    /**
     * Genera un objeto de violación si la validación falla.
     */
    createViolation(config) {
        const minDisplay = config.min !== undefined ? config.min : 'sin límite inferior';
        const maxDisplay = config.max !== undefined ? config.max : 'sin límite superior';
        
        return {
            rule: this.id,
            severity: config.severity || 'soft',
            message: `La longitud de la cadena está fuera del rango permitido de caracteres [${minDisplay}, ${maxDisplay}].`,
            context: { min: config.min, max: config.max }
        };
    }
}