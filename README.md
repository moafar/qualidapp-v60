**QualidApp v60**

Proyecto ligero para validación de datos en el navegador. Proporciona un motor de reglas que ejecuta validaciones a nivel de valor y a nivel de columna sobre datasets cargados (por ejemplo desde Excel) y un UI simple para editar contratos YAML y ver resultados.

**Rápido — Qué es**
- **Propósito**: Validar hojas de datos contra un contrato YAML usando reglas reutilizables.
- **Entrada**: Ficheros Excel (cargados en el navegador) y contratos en YAML.
- **Salida**: Violaciones por columna/valor mostradas en la UI.

**Estructura**
- **`index.html`**: Punto de entrada estático.
- **`src/main.js`**: Orquestador — carga UI, motor de reglas e infra.
- **`src/core/RuleEngine.js`**: Implementación del motor de reglas.
- **`src/core/rules/`**: Reglas disponibles (ej: `RequiredRule.js`, `RegexRule.js`, etc.).
- **`src/infrastructure/`**: Parsers y loaders (p. ej. `YamlContractParser.js`, `ExcelDatasetLoader.js`).
- **`src/ui/`**: Componentes de la interfaz.

**Cómo ejecutar (desarrollo local)**
1. Servir la carpeta con un servidor estático (no hay build):

```bash
**QualidApp v60**

Proyecto ligero de validación de datos que corre íntegramente en el navegador. Proporciona:

- Un motor de reglas (`RuleEngine`) que ejecuta validaciones a nivel de valor (`validate`) y a nivel de columna (`validateColumn`).
- Un cargador de datasets desde Excel/CSV y un parser de contratos en YAML.
- Una UI minimalista para editar contratos YAML, listar reglas y mostrar violaciones.

Características principales
- Propósito: validar hojas de datos contra contratos YAML compuestos por reglas reutilizables.
- Entrada: ficheros Excel (.xlsx) o CSV y contratos en YAML.
- Salida: lista de violaciones por fila/columna mostrada en la UI.

Estructura del proyecto
- `index.html`: punto de entrada estático.
- `src/main.js`: orquestador — inicializa `RuleEngine`, registra reglas y conecta UI e infra.
- `src/core/RuleEngine.js`: motor de reglas.
- `src/core/rules/`: implementación de reglas (ej. `RequiredRule.js`, `RegexRule.js`, `RangeRule.js`).
- `src/infrastructure/YamlContractParser.js`: parsea contratos YAML usando `window.jsyaml`.
- `src/infrastructure/ExcelDatasetLoader.js`: carga datos desde archivos Excel/CSV.
- `src/ui/`: componentes de interfaz (`ContractViewer`, `RuleCatalogViewer`, etc.).

Ejemplos incluidos
- `examples/contract-example.yml`: contrato YAML de ejemplo.
- `examples/sample.csv`: dataset de ejemplo (puedes convertirlo a Excel o generar `sample.xlsx` con el script `scripts/make_sample_xlsx.py`).

Ejecución local (desarrollo)
1. Servir la carpeta con un servidor estático (no hay build step):

```bash
cd /home/rom/prj/qualidapp/v60
python3 -m http.server 8000
# o con live reload:
npx live-server .
```

2. Abrir en el navegador: `http://localhost:8000/`

Flujo de uso
- Abre el editor de YAML (panel izquierdo) y pega o carga un contrato.
- Carga `examples/sample.csv` (o `sample.xlsx`) desde la UI.
- Haz clic en `Validate` para ejecutar las reglas y ver violaciones.

Ejemplo de contrato YAML
```yaml
# examples/contract-example.yml
columns:
	- name: id
		rules:
			- id: RequiredRule
			- id: UniqueRule

	- name: age
		rules:
			- id: RangeRule
				params:
					min: 0
					max: 120

	- name: email
		rules:
			- id: RequiredRule
			- id: RegexRule
				params:
					pattern: '^\\S+@\\S+\\.\\S+$'

	- name: country
		rules:
			- id: DomainRule
				params:
					values: ['ES','US','FR']
```

Descripción breve del YAML
- La raíz `columns` contiene una lista de definiciones por columna.
- Cada columna tiene `name` y `rules` (lista). Cada regla referencia `id` y opcionalmente `params`.

Dataset de ejemplo (CSV)
- `examples/sample.csv` contiene un pequeño conjunto de datos para probar el contrato anterior. Puedes abrirlo con Excel o generar un `.xlsx` usando el script `scripts/make_sample_xlsx.py`.

Generar un Excel de muestra (opcional)
Instala `openpyxl` y ejecuta el script incluido:

```bash
pip install openpyxl
python3 scripts/make_sample_xlsx.py --out examples/sample.xlsx
```

Contenido del script
- `scripts/make_sample_xlsx.py` crea `examples/sample.xlsx` a partir de `examples/sample.csv`.

Cómo añadir reglas a la aplicación
1. Añade un archivo en `src/core/rules/` que exporte una clase con la API esperada:

```js
export class MyRule {
	constructor() { this.id = 'MyRule' }
	validate(value, params) { /* return null or violation */ }
	validateColumn(data, params) { /* optional column-level validation */ }
	createViolation(rowIndex, colName, msg) { return { rowIndex, colName, msg } }
}
```

2. Registra la regla en `src/main.js`:

```js
import { MyRule } from './core/rules/MyRule.js'
engine.registerRule(new MyRule())
```

Notas de desarrollo
- Módulos ES pensados para cargar directamente en navegador (`<script type="module">`).
- Dependencias externas se cargan en `index.html` y quedan disponibles en `window`.

Comandos git útiles
```bash
git add examples scripts README.md
git commit -m "Add detailed README, contract example and sample dataset + script"
git push
```

Próximos pasos sugeridos
- Añadir más contratos de ejemplo en `examples/`.
- Añadir tests unitarios para reglas.

---
Si quieres, hago ahora el commit y push de los archivos añadidos (`examples/`, `scripts/` y el README actualizado). 
