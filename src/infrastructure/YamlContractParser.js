/**
 * src/infrastructure/YamlContractParser.js
 * * Responsabilidad: Leer Y Escribir YAML.
 */
export class YamlContractParser {
    constructor() {
        if (!window.jsyaml) {
            console.warn("⚠️ La librería js-yaml no se ha detectado.");
        }
    }

    parse(yamlText) {
        if (!yamlText || !yamlText.trim()) return null;
        try {
            return window.jsyaml.load(yamlText);
        } catch (error) {
            throw new Error(`Error de sintaxis YAML: ${error.message}`);
        }
    }

    /**
     * Convierte un objeto JS a texto YAML.
     * @param {object} object - El contrato en memoria.
     * @returns {string} - El texto YAML generado.
     */
    stringify(object) {
        try {
            // 'dump' es la función de js-yaml para exportar
            return window.jsyaml.dump(object, {
                indent: 2,
                lineWidth: -1, // Evita cortar líneas largas
                noRefs: true   // Evita usar referencias &ref
            });
        } catch (error) {
            throw new Error(`Error generando YAML: ${error.message}`);
        }
    }
}