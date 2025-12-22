/**
 * Temporary ESM copy for syntax check
 */
export class ExcelDatasetLoader {
    constructor() {
        if (!globalThis.window) globalThis.window = {};
        if (!window.XLSX) {
            console.warn("⚠️ SheetJS no detectado. Asegúrate de incluir el CDN en index.html");
        }
    }

    /**
     * Lee un archivo File (del input HTML) y devuelve una Promesa con los datos.
     * @param {File} file - El archivo subido por el usuario.
     * @param {Object} [options]
     * @param {boolean} [options.parseDates=true] - Si true, intenta interpretar celdas de fecha.
     * @param {boolean} [options.dateAsISOString=true] - Si true, normaliza fechas a 'YYYY-MM-DDTHH:mm:ssZ'.
     * @returns {Promise<Array>} - Array de objetos (filas del excel).
     */
    load(file, { parseDates = true, dateAsISOString = true } = {}) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = window.XLSX.read(data, { type: 'array', ...(parseDates ? { cellDates: true } : {}) });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const json = window.XLSX.utils.sheet_to_json(worksheet, { defval: null, raw: true });

                    const toIsoDateTime = (date) => {
                        const iso = date.toISOString();
                        return `${iso.slice(0, 19)}Z`;
                    };

                    const normalized = (parseDates && dateAsISOString)
                        ? json.map((row) => {
                            const normalizedRow = {};
                            for (const [key, value] of Object.entries(row)) {
                                normalizedRow[key] = value instanceof Date ? toIsoDateTime(value) : value;
                            }
                            return normalizedRow;
                        })
                        : json;

                    console.log(`[Loader] Cargadas ${normalized.length} filas desde Excel.`);
                    resolve(normalized);
                } catch (err) {
                    reject(new Error(`Error procesando Excel: ${err.message}`));
                }
            };

            reader.onerror = () => reject(new Error("Error de lectura de archivo."));
            reader.readAsArrayBuffer(file);
        });
    }
}
