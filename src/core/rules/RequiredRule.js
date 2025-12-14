/**
 * src/core/rules/RequiredRule.js
 * Regla de ejemplo: Asegura que un valor no sea nulo o vacío.
 * Implementa la interfaz básica de una regla de RuleEngine.
 */
export class RequiredRule {
    
    // --- METADATOS PARA EL CATÁLOGO ---
    static description = 'Asegura que una columna no contenga valores nulos, indefinidos o cadenas de texto vacías.';
    static parameters = {
        severity: { 
            type: 'string', 
            description: 'Define la criticidad de la violación (soft, hard). Default: soft.' 
        }
    };
    // ---------------------------------

    get id() { return 'required'; }

    /**
     * Valida si el valor cumple con la regla de ser requerido.
     * @param {*} value - El valor a validar.
     * @param {object} config - Configuración de la regla (ej: { severity: 'hard' }).
     * @returns {boolean} True si es válido (no nulo/vacío), False en caso contrario.
     */
    validate(value, config) {
        // Un valor es requerido si no es null, undefined, o una cadena de texto vacía.
        if (value === null || typeof value === 'undefined') {
            return false;
        }
        if (typeof value === 'string' && value.trim() === '') {
            return false;
        }
        return true;
    }

    /**
     * Genera un objeto de violación si la validación falla.
     */
    createViolation(config) {
        return {
            rule: this.id,
            severity: config.severity || 'soft',
            message: `El valor es requerido y no puede ser nulo o vacío.`,
            context: null 
        };
    }
}