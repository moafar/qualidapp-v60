---
applyTo: '**'
---
Provide project context and coding guidelines that AI should follow when generating code, answering questions, or reviewing changes.

Responde en español.<!-- .github/instructions/instructiones.instructions.md: Guía para agentes de IA trabajando en este repositorio -->

# Instrucciones para Agentes — QualidApp (v60)
Este archivo ofrece una guía enfocada y accionable para que un agente de IA pueda ser productivo inmediatamente en este repositorio.
Arquitectura principal (visión general)
- **Punto de entrada**: `src/main.js` — orquesta la UI, el motor de reglas y la infraestructura. Ejemplo: `engine.registerRule(new RequiredRule())`.
- **Motor de reglas**: `src/core/RuleEngine.js` — almacena instancias de reglas en `this.rules` indexadas por `rule.id`. Las reglas exponen ya sea `validate` (valor por valor) o `validateColumn` (columna completa) y deben proporcionar `id` y `createViolation()`.
- **Implementaciones de reglas**: `src/core/rules/*.js` — cada regla es una clase ES exportada usando `export class` y se instancia en `src/main.js`.
- **Análisis de contratos**: `src/infrastructure/YamlContractParser.js` — usa `window.jsyaml` para `load`/`dump` YAML. Los agentes deben tratar `jsyaml` como una dependencia global (no una importación npm).
- **Carga de datos**: `src/infrastructure/ExcelDatasetLoader.js` — el cargador devuelve un array de objetos fila consumidos por los bucles de validación en `src/main.js`.
- **Capa de UI**: `src/ui/*` — visores y gestores (por ejemplo, `UIManager.js`, `ContractViewer.js`, `ContractTreeViewer.js`, `RuleCatalogViewer.js`). `RuleCatalogViewer` lee los metadatos de las reglas desde `RuleEngine.getRules()`.
Patrones y convenciones importantes (específicos del proyecto)
- Módulos ES destinados a la importación en el navegador: los archivos usan `export` y esperan ser cargados por `<script type="module">` (no hay empaquetador en el repositorio).
- Globales: las librerías de terceros se cargan en `window` (por ejemplo, `window.jsyaml`, probablemente una librería XLSX). Revisa `index.html` para etiquetas de script externas antes de asumir su disponibilidad.
- Tipos de reglas: dos categorías — a nivel de valor (`validate(value, ruleConfig)`) y a nivel de columna (`validateColumn(data, ruleConfig)`). El motor las trata de manera diferente (ver `RuleEngine.validateColumn`).
- Contrato de registro: las instancias de reglas deben incluir una cadena `id`. El motor almacena las instancias por `id` y los visores dependen de este mapa para los metadatos.
- Banderas de UI: algunos visores usan banderas internas (ejemplo: `catalogViewer._rendered` se establece en `src/main.js` para evitar volver a renderizar).
Flujos de trabajo y comandos para desarrolladores
- No hay sistema de construcción — esta es una aplicación estática de módulos ES. Para ejecutarla localmente, sirve la carpeta a través de un servidor HTTP estático y abre `index.html`:
  - `python3 -m http.server 8000` y abre `http://localhost:8000/` 
  - o `npx live-server .` para una experiencia de recarga en vivo.
- Enfoque de depuración: abre la consola de DevTools y establece puntos de interrupción en los archivos de `src/`. Flujos típicos:
  - Edita el YAML en el panel izquierdo (`#yamlInput`) y observa el análisis a través de `YamlContractParser.parse`.
  - Haz clic en la acción de UI "Validate" (ver `UIManager.bindValidateClick`) para ejercitar `ExcelDatasetLoader.load` + `RuleEngine.validateColumn`.
Puntos de integración y dependencias externas
- YAML: `window.jsyaml` (usado en `YamlContractParser`). Asegúrate de que `index.html` incluya js-yaml antes de los scripts de módulos.
- Excel: `ExcelDatasetLoader` probablemente depende de una librería de análisis XLSX cargada globalmente. Inspecciona `index.html` para confirmar la secuencia de comandos del proveedor y el nombre global.
Ejemplos para referencia al editar código
- Registro de reglas (en `src/main.js`): `engine.registerRule(new RequiredRule());`
- Validación del motor (en `src/core/RuleEngine.js`): muestra cómo se invocan las reglas a nivel de columna vs a nivel de valor.
- Uso del analizador (en `src/main.js`): `const contract = parser.parse(yamlInput.value);` luego `loader.load(file)` y luego validando filas.
Qué NO cambiar sin preguntar
- No reemplaces el uso de librerías globales (por ejemplo, `window.jsyaml`) con una importación a menos que actualices `index.html` y confirmes que la librería se proporciona a través de un módulo o empaquetador.
- No cambies las cadenas `id` de las instancias de reglas sin actualizar los contratos persistidos o los ejemplos del README que las referencian.
Si necesitas más contexto
- Abre `index.html` primero para confirmar qué scripts de terceros están incluidos y sus nombres globales.
- Inspecciona `src/core/rules/*` para ver las formas de los parámetros de las reglas antes de agregar/actualizar los metadatos de las reglas.
Próximos pasos para el agente
- Al agregar funciones, incluye pequeños pasos de verificación manual ejecutables (servir + abrir UI + YAML de muestra + Excel de muestra) en la descripción del PR.
Si algo aquí no está claro, dime qué archivo o área quieres que amplíe con ejemplos concretos.