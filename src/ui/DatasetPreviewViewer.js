export class DatasetPreviewViewer {
    constructor(rootId, { rowLimit = 20, columnLimit = 10 } = {}) {
        this.root = document.getElementById(rootId);
        this.rowLimit = rowLimit;
        this.columnLimit = columnLimit;
    }

    reset() {
        if (!this.root) return;
        this.root.innerHTML = '<div class="dataset-preview-empty">Carga un dataset para explorar las primeras filas.</div>';
    }

    showLoading() {
        if (!this.root) return;
        this.root.innerHTML = '<div class="dataset-preview-empty">⏳ Analizando dataset...</div>';
    }

    showError(message) {
        if (!this.root) return;
        this.root.innerHTML = `<div class="dataset-preview-empty" style="color:#b91c1c; border-color:#fecaca; background:#fef2f2;">${message}</div>`;
    }

    render(rows) {
        if (!this.root) return;
        if (!rows || rows.length === 0) {
            this.reset();
            return;
        }

        const headerSet = new Set();
        for (const row of rows) {
            Object.keys(row || {}).forEach((key) => headerSet.add(key));
            if (headerSet.size >= this.columnLimit) break;
        }

        const columns = Array.from(headerSet).slice(0, this.columnLimit);
        if (columns.length === 0) {
            this.showError('No se detectaron columnas en el archivo.');
            return;
        }

        const limitedRows = rows.slice(0, this.rowLimit);
        const headerHtml = columns.map((col) => `<th>${this._escapeHtml(col)}</th>`).join('');
        const bodyHtml = limitedRows
            .map((row, idx) => {
                const cells = columns
                    .map((col) => `<td>${this._stringifyValue(row?.[col])}</td>`)
                    .join('');
                return `<tr><td style="color:var(--text-muted); width:60px;">${idx + 1}</td>${cells}</tr>`;
            })
            .join('');

        this.root.innerHTML = `
            <div style="overflow:auto; border:1px solid var(--border-color); border-radius:10px;">
                <table class="dataset-preview-table">
                    <thead>
                        <tr><th style="width:60px;">Fila</th>${headerHtml}</tr>
                    </thead>
                    <tbody>${bodyHtml}</tbody>
                </table>
            </div>
        `;
    }

    _stringifyValue(value) {
        if (value === null || value === undefined || value === '') return '—';
        if (typeof value === 'object') {
            try {
                return this._escapeHtml(JSON.stringify(value));
            } catch (e) {
                return '[obj]';
            }
        }
        return this._escapeHtml(String(value));
    }

    _escapeHtml(text) {
        return text.replace(/[&<>"']/g, (char) => {
            switch (char) {
                case '&':
                    return '&amp;';
                case '<':
                    return '&lt;';
                case '>':
                    return '&gt;';
                case '"':
                    return '&quot;';
                case "'":
                    return '&#39;';
                default:
                    return char;
            }
        });
    }
}
