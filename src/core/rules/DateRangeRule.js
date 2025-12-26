export class DateRangeRule {

    static description =
        'Valida que una fecha esté dentro de un rango inclusivo. Formato esperado: DD/MM/YYYY (ignora hora).';
    static parameters = {
        min: { type: 'string|Date', description: 'Fecha mínima inclusiva (DD/MM/YYYY).' },
        max: { type: 'string|Date', description: 'Fecha máxima inclusiva (DD/MM/YYYY).' },
        format: { type: 'string', description: 'Formato dayjs. Default: DD/MM/YYYY.' }
    };

    get id() { return 'date-range'; }

    _toTimestamp(v, format) {
        if (v === undefined || v === null || v === '') return NaN;

        if (v instanceof Date) {
            return isNaN(v.getTime()) ? NaN : v.getTime();
        }

        if (typeof v === 'string') {
            const datePart = v.split(' ')[0]; // ignora hora
            if (typeof window !== 'undefined' && window.dayjs) {
                const d = window.dayjs(datePart, format, true); // estricto
                if (d.isValid()) return d.valueOf();
            }
            return NaN;
        }

        return NaN;
    }

    validate(value, config = {}) {
        if (value === null || value === undefined || value === '') return true;

        const fmt = config.format || 'DD/MM/YYYY';

        const ts = this._toTimestamp(value, fmt);
        if (isNaN(ts)) return true; // no aplica: formato inválido se valida en otra regla

        const minTs = this._toTimestamp(config.min, fmt);
        const maxTs = this._toTimestamp(config.max, fmt);

        if (!isNaN(minTs) && !isNaN(maxTs) && minTs > maxTs) {
            return false; // configuración inconsistente
        }

        const min = !isNaN(minTs) ? minTs : -Infinity;
        const max = !isNaN(maxTs) ? maxTs : Infinity;

        return ts >= min && ts <= max;
    }

    createViolation(config = {}, ctx = {}) {
        return {
            rule: this.id,
            severity: config.severity || 'soft',
            message: `Fecha fuera del rango permitido [${config.min || 'sin límite'}, ${config.max || 'sin límite'}].`,
            context: {
                min: config.min,
                max: config.max,
                format: config.format || 'DD/MM/YYYY',
                ...ctx
            }
        };
    }
}


