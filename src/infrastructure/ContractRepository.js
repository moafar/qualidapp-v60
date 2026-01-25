/**
 * src/infrastructure/ContractRepository.js
 * Responsabilidad: Obtener contratos embebidos en el codebase a partir de un manifiesto estático.
 */
export class ContractRepository {
  constructor({ manifestUrl = 'contracts/manifest.json', parser } = {}) {
    this.manifestUrl = manifestUrl;
    this.parser = parser;
    this._manifestPromise = null;
    this._cache = new Map();
  }

  async list() {
    if (!this._manifestPromise) {
      this._manifestPromise = this._fetchManifest();
    }
    return this._manifestPromise;
  }

  async load(id) {
    if (!id) {
      throw new Error('ID de contrato no especificado.');
    }

    if (this._cache.has(id)) {
      return this._cache.get(id);
    }

    const manifest = await this.list();
    const entry = manifest.find((item) => item.id === id);
    if (!entry) {
      throw new Error(`Contrato "${id}" no encontrado en el catálogo.`);
    }

    const response = await fetch(entry.path, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`No se pudo descargar el contrato "${entry.name || entry.id}".`);
    }

    const yamlText = await response.text();
    const contract = this.parser ? this.parser.parse(yamlText) : window?.jsyaml?.load?.(yamlText);
    if (!contract) {
      throw new Error(`El contrato "${entry.name || entry.id}" está vacío o es inválido.`);
    }

    const payload = { ...entry, contract, yaml: yamlText };
    this._cache.set(id, payload);
    return payload;
  }

  async _fetchManifest() {
    const response = await fetch(this.manifestUrl, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error('No se pudo cargar el catálogo de contratos embebidos.');
    }

    const json = await response.json();
    const contracts = Array.isArray(json?.contracts) ? json.contracts : Array.isArray(json) ? json : [];
    if (!contracts.length) {
      throw new Error('El catálogo de contratos está vacío.');
    }
    return contracts;
  }
}
