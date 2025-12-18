/**
 * src/core/RuleEngine.js
 * * Responsabilidad: Registrar, gestionar y ejecutar reglas de validación.
 */
export class RuleEngine {
    constructor() {
        // Almacena instancias de reglas mapeadas por su ID: { 'required': new RequiredRule(), ... }
        this.rules = {}; 
    }

    /**
     * Registra una instancia de una regla en el motor.
     * @param {object} ruleInstance - Una instancia de una clase de regla (ej: new RequiredRule()).
     */
    registerRule(ruleInstance) {
        if (!ruleInstance.id) {
            throw new Error('La instancia de regla debe tener una propiedad "id".');
        }
        this.rules[ruleInstance.id] = ruleInstance;
    }

    /**
     * Devuelve el mapa de todas las reglas registradas.
     * Esto es crucial para que RuleCatalogViewer pueda acceder a los metadatos estáticos (description, parameters).
     * @returns {object} Un mapa de { ruleId: ruleInstance }.
     */
    getRules() {
        return this.rules;
    }

    /**
     * Ejecuta la validación para una columna dada.
     * @param {string} columnName - Nombre de la columna.
     * @param {Array<*>} data - Los datos de esa columna.
     * @param {Array<object>} rulesConfig - La configuración de las reglas desde el contrato.
     * @returns {Array<object>} Lista de violaciones.
     */
    validateColumn(columnName, data, rulesConfig) {
        if (!rulesConfig || rulesConfig.length === 0) {
            return [];
        }

        const violations = [];

        for (const ruleConfig of rulesConfig) {
            const ruleId = ruleConfig.id;
            const ruleInstance = this.rules[ruleId];

            if (!ruleInstance) {
                console.warn(`Regla desconocida: ${ruleId} para la columna ${columnName}`);
                continue;
            }

            // --- Lógica de Manejo de Tipos de Regla ---
            
            // 1. Reglas de Columna Completa (Ej: UniqueRule)
            if (ruleInstance.validateColumn) { 
                if (!ruleInstance.validateColumn(data, ruleConfig)) {
                    const violation = ruleInstance.createViolation(ruleConfig);
                    // Las violaciones de columna no tienen índice o valor específico
                    violations.push({
                        ...violation,
                        column: columnName,
                        index: 'N/A', 
                        value: 'N/A'
                    });
                }
                continue; // Pasa a la siguiente regla
            }

            // 2. Reglas de Valor por Valor (Ej: RequiredRule, RangeRule)
            data.forEach((value, index) => {
                if (!ruleInstance.validate(value, ruleConfig)) {
                    const violation = ruleInstance.createViolation(ruleConfig);
                    violations.push({
                        ...violation,
                        column: columnName,
                        index: index,
                        value: value
                    });
                }
            });
        }

        return violations;
    }
}