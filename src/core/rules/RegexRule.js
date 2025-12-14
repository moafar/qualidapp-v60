/**
 * src/core/rules/RegexRule.js
 * Regla: Asegura que el valor de una cadena de texto coincide con un patrón Regex.
 */
export class RegexRule {
    
    // --- METADATOS PARA EL CATÁLOGO ---
    static description = 'Valida que el valor de la columna, tratado como cadena de texto, coincida completamente con una expresión regular (Regex) definida.';
    static parameters = {
        pattern: { 
            type: 'string', 
            description: 'La expresión regular que el valor debe coincidir. Debe ser una expresión válida sin las barras delimitadoras.' 
        },
        severity: { 
            type: 'string', 
            description: 'Define la criticidad de la violación (soft, hard). Default: soft.'
        }
    };
    // ---------------------------------

    get id() { return 'regex'; }

    /**
     * Valida si el valor, convertido a cadena, coincide con el patrón configurado.
     * @param {*} value - El valor a validar.
     * @param {object} config - Configuración de la regla ({ pattern: '...' }).
     * @returns {boolean} True si coincide o si no hay patrón definido.
     */
    validate(value, config) {
        if (!config.pattern) {
            console.warn(`[RegexRule] Regla configurada sin 'pattern'. Se considera válida.`);
            return true;
        }

        // Ignorar valores nulos o indefinidos, ya cubiertos por 'required'
        if (value === null || typeof value === 'undefined') {
            return true;
        }
        
        // Convertir el valor a string para la validación Regex
        const textValue = String(value);

        try {
            // Utilizamos el modo 'g' (global) y 'i' (insensible a mayúsculas) si fuera necesario, 
            // pero para validación de formato completo, se usa el patrón tal cual, 
            // asumiendo que el usuario usa ^ y $ para anclar.
            // NOTA: El patrón debe ser creado cada vez para evitar problemas de state en regex global.
            const regex = new RegExp(config.pattern);
            
            // La función .test() devuelve true si encuentra UNA coincidencia. 
            // Para asegurar la COINCIDENCIA COMPLETA del string, es vital que el patrón use anclas (^ y $).
            return regex.test(textValue);

        } catch (e) {
            console.error(`[RegexRule] Error al procesar el patrón '${config.pattern}': ${e.message}`);
            return false; // Si el patrón es inválido, falla la validación por seguridad
        }
    }

    /**
     * Genera un objeto de violación.
     */
    createViolation(config) {
        return {
            rule: this.id,
            severity: config.severity || 'soft',
            message: `El valor no coincide con el patrón de expresión regular requerido: /${config.pattern}/.`,
            context: { pattern: config.pattern } 
        };
    }
}