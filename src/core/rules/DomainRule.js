/**
 * src/core/rules/DomainRule.js
 * Regla: Asegura que el valor de una columna coincida con uno de los valores permitidos (lista de dominio).
 */
export class DomainRule {
    
    // --- METADATOS PARA EL CATÁLOGO ---
    static description = 'Valida que el valor exista dentro de un conjunto definido de valores permitidos (lista de dominio). Ideal para datos categóricos.';
    static parameters = {
        allowed_values: { 
            type: 'array', 
            description: 'Lista de valores exactos que la columna puede contener.' 
        },
        case_sensitive: {
            type: 'boolean',
            description: 'Indica si la comparación debe distinguir entre mayúsculas y minúsculas (default: false).'
        }
    };
    // ---------------------------------

    get id() { return 'domain'; }

    /**
     * Valida si el valor se encuentra dentro de la lista de allowed_values.
     * @param {*} value - El valor a validar.
     * @param {object} config - Configuración de la regla ({ allowed_values: [...] }).
     * @returns {boolean} True si el valor está en la lista.
     */
    validate(value, config) {
        const allowed = config.allowed_values;
        const caseSensitive = config.case_sensitive === true; // Por defecto false
        
        if (!Array.isArray(allowed) || allowed.length === 0) {
            console.warn(`[DomainRule] Regla configurada sin 'allowed_values'. Se considera válida.`);
            return true;
        }

        // Ignorar valores nulos o indefinidos, ya cubiertos por 'required'
        if (value === null || typeof value === 'undefined' || String(value).trim() === '') {
            return true;
        }
        
        const targetValue = String(value);

        if (caseSensitive) {
            // Comparación estricta
            return allowed.some(val => String(val) === targetValue);
        } else {
            // Comparación insensible a mayúsculas (más común en categóricos)
            const lowerTarget = targetValue.toLowerCase();
            return allowed.some(val => String(val).toLowerCase() === lowerTarget);
        }
    }

    /**
     * Genera un objeto de violación.
     */
    createViolation(config) {
        const allowedList = (config.allowed_values || []).join(', ');
        return {
            rule: this.id,
            severity: config.severity || 'soft',
            message: `El valor no está en el dominio de valores permitidos. Esperado: [${allowedList}].`,
            context: { allowed_values: config.allowed_values } 
        };
    }
}