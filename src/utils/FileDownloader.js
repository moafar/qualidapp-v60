/**
 * src/utils/FileDownloader.js
 * * Responsabilidad: Crear y disparar la descarga de un archivo desde el navegador.
 */
export class FileDownloader {
    /**
     * Dispara la descarga de un archivo con el contenido y nombre especificados.
     * @param {string} content El contenido del archivo (ej: texto YAML).
     * @param {string} fileName El nombre que tendrá el archivo al descargarse.
     * @param {string} mimeType El tipo MIME del contenido (ej: 'text/yaml').
     */
    download(content, fileName, mimeType = 'text/yaml') {
        try {
            // 1. Crear un objeto Blob a partir del contenido
            const blob = new Blob([content], { type: mimeType });
            
            // 2. Crear una URL de objeto temporal
            const url = URL.createObjectURL(blob);
            
            // 3. Crear un enlace <a> temporal y simular el click
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName; // Establecer el nombre del archivo
            
            // 4. Añadir, clickear y remover
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // 5. Liberar la URL del objeto
            URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error("Error al intentar descargar el archivo:", error);
            alert("No se pudo iniciar la descarga. Por favor, copia el contenido manualmente.");
        }
    }
}