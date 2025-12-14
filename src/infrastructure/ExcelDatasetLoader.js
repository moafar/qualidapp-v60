/**
 * src/infrastructure/ExcelDatasetLoader.js
 * * Responsabilidad: Leer archivos Excel/CSV y convertirlos a JSON.
 * * Dependencia: Librería 'SheetJS' (XLSX).
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
     * @returns {Promise<Array>} - Array de objetos (filas del excel).
     */
    load(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = window.XLSX.read(data, { type: 'array' });
                    
                    // Tomamos la primera hoja
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    // Convertimos a JSON (defval: null asegura que las celdas vacías no desaparezcan)
                    const json = window.XLSX.utils.sheet_to_json(worksheet, { defval: null });
                    
                    console.log(`[Loader] Cargadas ${json.length} filas desde Excel.`);
                    resolve(json);
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