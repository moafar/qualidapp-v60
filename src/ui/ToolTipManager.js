/**
 * src/ui/TooltipManager.js
 * * Responsabilidad: Crear y gestionar un único elemento de tooltip
 * * que sigue al ratón y muestra contenido dinámico (SOLID: Single Responsibility).
 */
export class TooltipManager {
    constructor() {
        this.tooltipElement = this._createTooltipElement();
        this._initListeners();
    }

    /**
     * Crea el elemento div del tooltip y lo añade al body.
     * @returns {HTMLElement} El elemento del tooltip.
     */
    _createTooltipElement() {
        const div = document.createElement('div');
        div.id = 'dynamic-tooltip';
        div.style.cssText = `
            position: fixed;
            display: none;
            background: #2d3748; /* Color oscuro para contraste */
            color: white;
            padding: 6px 10px;
            border-radius: 4px;
            font-size: 12px;
            pointer-events: none; /* No bloquear clicks bajo el tooltip */
            z-index: 1000;
            max-width: 520px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            line-height: 1.4;
        `;
        document.body.appendChild(div);
        return div;
    }

    /**
     * Inicializa los escuchadores de eventos en el documento.
     */
    _initListeners() {
        document.addEventListener('mouseover', this._handleMouseOver.bind(this));
        document.addEventListener('mouseout', this._handleMouseOut.bind(this));
        document.addEventListener('mousemove', this._handleMouseMove.bind(this));
    }

    /**
     * Muestra el tooltip y establece su contenido.
     * @param {string} content El HTML o texto a mostrar.
     * @param {Event} e El evento original para obtener la posición.
     */
    show(content, e) {
        this.tooltipElement.innerHTML = content;
        this.tooltipElement.style.display = 'block';
        this._setPosition(e.clientX, e.clientY);
    }

    /**
     * Oculta el tooltip.
     */
    hide() {
        this.tooltipElement.style.display = 'none';
    }

    /**
     * Establece la posición del tooltip para seguir al cursor.
     */
    _setPosition(x, y) {
        // Offset pequeño para que no se superponga el cursor
        const offsetX = 15;
        const offsetY = 15;
        
        // Ajuste si se sale del borde derecho
        const rect = this.tooltipElement.getBoundingClientRect();
        let finalX = x + offsetX;
        
        if (finalX + rect.width > window.innerWidth) {
            finalX = x - rect.width - offsetX;
        }

        this.tooltipElement.style.left = `${finalX}px`;
        this.tooltipElement.style.top = `${y + offsetY}px`;
    }

    /**
     * Handler para mouseover. Verifica si el elemento tiene el atributo 'data-tooltip'.
     */
    _handleMouseOver(e) {
        const target = e.target.closest('[data-tooltip]');
        if (target) {
            this.show(target.dataset.tooltip, e);
        }
    }

    /**
     * Handler para mouseout. Oculta el tooltip.
     */
    _handleMouseOut(e) {
        if (e.target.closest('[data-tooltip]')) {
            this.hide();
        }
    }

    /**
     * Handler para mousemove. Actualiza la posición del tooltip.
     */
    _handleMouseMove(e) {
        if (this.tooltipElement.style.display === 'block') {
            this._setPosition(e.clientX, e.clientY);
        }
    }
}