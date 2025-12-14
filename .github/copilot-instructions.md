<!-- .github/copilot-instructions.md: Guidance for AI coding agents working on this repo -->

# Copilot Instructions — QualidApp (v60)

This file gives focused, actionable guidance so an AI coding agent can be productive immediately in this repository.

Core architecture (big picture)
- **Entry point**: `src/main.js` — orchestrates UI, rule engine and infra. Example: `engine.registerRule(new RequiredRule())`.
- **Rule engine**: `src/core/RuleEngine.js` — stores rule instances in `this.rules` keyed by `rule.id`. Rules expose either `validate` (value-by-value) or `validateColumn` (column-wide) and must provide `id` and `createViolation()`.
- **Rules implementations**: `src/core/rules/*.js` — each rule is an ES class exported using `export class` and is instantiated in `src/main.js`.
- **Contract parsing**: `src/infrastructure/YamlContractParser.js` — uses `window.jsyaml` to `load`/`dump` YAML. Agents must treat `jsyaml` as a global dependency (not an npm import).
- **Data loading**: `src/infrastructure/ExcelDatasetLoader.js` — loader returns an array of row objects consumed by validation loops in `src/main.js`.
- **UI layer**: `src/ui/*` — viewers and managers (e.g., `UIManager.js`, `ContractViewer.js`, `ContractTreeViewer.js`, `RuleCatalogViewer.js`). `RuleCatalogViewer` reads rule metadata from `RuleEngine.getRules()`.

Important patterns & conventions (project-specific)
- ES modules intended for browser import: files use `export` and expect to be loaded by `<script type="module">` (no bundler in repo).
- Globals: third-party libs are loaded into `window` (e.g., `window.jsyaml`, likely an XLSX library). Check `index.html` for external script tags before assuming availability.
- Rule types: two categories — value-level (`validate(value, ruleConfig)`) and column-level (`validateColumn(data, ruleConfig)`). The engine treats them differently (see `RuleEngine.validateColumn`).
- Registration contract: rule instances must include an `id` string. The engine stores instances by `id` and viewers rely on this map for metadata.
- UI flags: some viewers use internal flags (example: `catalogViewer._rendered` is set in `src/main.js` to avoid re-rendering).

Developer workflows & commands
- There is no build system — this is a static ES module app. To run locally, serve the folder over a static HTTP server and open `index.html`:

  - `python3 -m http.server 8000` and open `http://localhost:8000/` 
  - or `npx live-server .` for a live-reload experience.

- Debugging approach: open DevTools console and set breakpoints in `src/` files. Typical flows:
  - Edit YAML in the left pane (`#yamlInput`) and observe parsing via `YamlContractParser.parse`.
  - Click the UI "Validate" action (see `UIManager.bindValidateClick`) to exercise `ExcelDatasetLoader.load` + `RuleEngine.validateColumn`.

Integration points & external deps
- YAML: `window.jsyaml` (used in `YamlContractParser`). Ensure `index.html` includes js-yaml before module scripts.
- Excel: `ExcelDatasetLoader` likely depends on an XLSX parsing lib loaded globally. Inspect `index.html` to confirm the vendor script and global name.

Examples to reference when editing code
- Registering rules (in `src/main.js`): `engine.registerRule(new RequiredRule());`
- Engine validation (in `src/core/RuleEngine.js`): shows how column-level vs value-level rules are invoked.
- Parser usage (in `src/main.js`): `const contract = parser.parse(yamlInput.value);` then `loader.load(file)` then validating rows.

What NOT to change without asking
- Don’t replace global-library usage (e.g., `window.jsyaml`) with an import unless you update `index.html` and confirm the library is provided via a module or bundler.
- Don’t change rule instance `id` strings without updating any persisted contracts or README examples that reference them.

If you need more context
- Open `index.html` first to confirm which third-party scripts are included and their global names.
- Inspect `src/core/rules/*` to see rule parameter shapes before adding/updating rule metadata.

Next steps for the agent
- When adding features, include small runnable manual verification steps (serve + open UI + sample YAML + sample Excel) in the PR description.

If anything here is unclear, tell me which file or area you want me to expand with concrete examples.
