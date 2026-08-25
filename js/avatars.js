/* Identidad de trabajadores · iniciales + ranking (sin caritas SVG) */
window.QB = window.QB || {};

QB.avatars = {
  /* Colores del logo Q Berries — mismo DNI = mismo color siempre */
  colors: [
    { bg: '#fde8e9', fg: '#e41e26' },
    { bg: '#fff4e5', fg: '#c2410c' },
    { bg: '#f3f9e9', fg: '#4a7c1a' },
    { bg: '#eaf7ea', fg: '#2f9e44' },
    { bg: '#ffe8d6', fg: '#ea580c' },
    { bg: '#eef8e0', fg: '#65a30d' },
    { bg: '#fce7eb', fg: '#be123c' },
    { bg: '#ecfdf3', fg: '#15803d' }
  ],

  hash(str) {
    let h = 0;
    const s = String(str || '0');
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  },

  colorOf(seed) {
    return this.colors[this.hash(seed) % this.colors.length];
  },

  initials(row) {
    const ape = (row.apellido || '').trim();
    const nom = (row.nombre || '').trim();
    const full = (row.nombreCompleto || '').trim();
    if (ape && !ape.startsWith('(')) {
      const parts = ape.split(/\s+/);
      const a = (parts[0] && parts[0][0]) || '';
      const b = (parts[1] && parts[1][0]) || (parts[0] && parts[0][1]) || '';
      return (a + b).toUpperCase();
    }
    if (nom && nom !== 'S/N') return nom.slice(0, 2).toUpperCase();
    if (full) {
      const p = full.split(/\s+/);
      return (((p[0] && p[0][0]) || '') + ((p[1] && p[1][0]) || '')).toUpperCase();
    }
    return String(row.ci || 'QB').slice(-2);
  },

  shortName(row) {
    const ape = (row.apellido || '').trim();
    if (ape && !ape.startsWith('(')) return ape.split(/\s+/).slice(0, 2).join(' ');
    const nom = (row.nombre || '').trim();
    if (nom && nom !== 'S/N') return nom.split(/\s+/)[0];
    const full = (row.nombreCompleto || '').trim();
    if (full) return full.split(/\s+/).slice(0, 2).join(' ');
    return row.ci || '—';
  },

  /** Badge de iniciales (fácil de reconocer en campo) */
  img(row, size = 56) {
    const ini = this.initials(row);
    const col = this.colorOf(row.ci || row.nombreCompleto || 'x');
    const fs = Math.max(11, Math.round(size * 0.34));
    return `<span class="avatar avatar-initials" style="width:${size}px;height:${size}px;background:${col.bg};color:${col.fg};font-size:${fs}px" title="${ini}">${ini}</span>`;
  },

  /**
   * Chip de equipo top
   * rank: 1-based · no usa fecha (persona única en el periodo)
   */
  chip(row, { rank = null } = {}) {
    const name = this.shortName(row);
    const rankHtml =
      rank == null
        ? ''
        : `<span class="person-rank ${rank <= 3 ? 'is-top' : ''}">#${rank}</span>`;
    const grupo = (row.grupo || '').replace(/^Grupo\s+/i, '');
    return `<button type="button" class="person-chip" data-ci="${row.ci}">
      <div class="person-chip-top">
        ${rankHtml}
        ${this.img(row, 48)}
      </div>
      <span class="person-meta">
        <strong>${name.length > 18 ? name.slice(0, 17) + '…' : name}</strong>
        <em>${Number(row.c || 0).toLocaleString('es-PE')} jarras</em>
        ${grupo ? `<span class="person-grupo">${grupo.length > 16 ? grupo.slice(0, 15) + '…' : grupo}</span>` : ''}
      </span>
    </button>`;
  }
};
