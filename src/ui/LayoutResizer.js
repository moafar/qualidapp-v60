/**
 * src/ui/LayoutResizer.js
 * Responsabilidad: Manejar el redimensionado de paneles (Drag & Drop de la barra lateral).
 */
export class LayoutResizer {
    constructor(containerId, gutterId) {
        this.container = document.getElementById(containerId);
        this.gutter = document.getElementById(gutterId);
        this.isDragging = false;

        if (this.gutter && this.container) {
            this._initEvents();
        }
    }

    _initEvents() {
        // 1. Empezar a arrastrar
        this.gutter.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            document.body.style.cursor = 'col-resize'; // Cursor global
            this.gutter.classList.add('dragging');     // Estilo visual
            e.preventDefault(); // Evitar selección de texto
        });

        // 2. Mover ratón
        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            
            const newWidth = e.clientX;
            
            // Definimos un nuevo límite mínimo muy bajo (ej. 1px)
            const MIN_EDITOR_WIDTH = 1; 
            
            // Mantenemos el límite máximo (para no invadir totalmente el visor)
            const MAX_EDITOR_WIDTH = window.innerWidth - 200; 

            if (newWidth >= MIN_EDITOR_WIDTH && newWidth <= MAX_EDITOR_WIDTH) {
                this.container.style.setProperty('--editor-width', `${newWidth}px`);
            } 
            // Si arrastramos más allá del límite mínimo (e.clientX < 1), 
            // establecemos el ancho a 0 para asegurar el colapso visual completo.
            else if (newWidth < MIN_EDITOR_WIDTH) {
                this.container.style.setProperty('--editor-width', `0px`);
            }
        });

        // 3. Soltar ratón
        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                document.body.style.cursor = '';
                this.gutter.classList.remove('dragging');
            }
        });
    }
}