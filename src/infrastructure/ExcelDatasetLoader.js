/**
 * src/infrastructure/ExcelDatasetLoader.js
 * Responsabilidad: Leer archivos Excel/CSV y convertirlos a JSON.
 * Dependencia: Librería 'SheetJS' (XLSX).
 */
export class ExcelDatasetLoader {
  constructor() {
    if (!window.XLSX) {
      console.warn("⚠️ SheetJS no detectado. Asegúrate de incluir el CDN en index.html");
    }
  }

  /**
   * Lee un archivo File (del input HTML) y devuelve una Promesa con los datos.
   * @param {File} file - El archivo subido por el usuario.
   * @param {Object} [options]
   * @param {boolean} [options.parseDates=true] - Si true, intenta interpretar celdas de fecha.
   * @param {boolean} [options.dateAsISOString=true] - Si true, normaliza fechas (en este loader: DD/MM/YYYY).
   * @returns {Promise<Array>} - Array de objetos (filas del excel).
   */
  load(file, { parseDates = true, dateAsISOString = true } = {}) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);

          // cellDates habilita que SheetJS trate celdas fecha como Date en vez de números seriales.
          const workbook = window.XLSX.read(data, {
            type: "array",
            ...(parseDates ? { cellDates: true } : {}),
          });

          // Tomamos la primera hoja
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // Convertimos a JSON (defval: null asegura que las celdas vacías no desaparezcan)
          const json = window.XLSX.utils.sheet_to_json(worksheet, { defval: null, raw: true });

          // Normaliza Date -> "DD/MM/YYYY" (sin hora)
          const toDDMMYYYY = (date) => {
            const dd = String(date.getDate()).padStart(2, "0");
            const mm = String(date.getMonth() + 1).padStart(2, "0");
            const yyyy = date.getFullYear();
            return `${dd}/${mm}/${yyyy}`;
          };

          const normalized = (parseDates && dateAsISOString)
            ? json.map((row) => {
                const normalizedRow = {};
                for (const [key, value] of Object.entries(row)) {
                  normalizedRow[key] = value instanceof Date ? toDDMMYYYY(value) : value;
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

      // Leemos el archivo como ArrayBuffer
      reader.readAsArrayBuffer(file);
    });
  }
}
