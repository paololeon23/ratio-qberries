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

  _junk(s) {
    return QB.workers && QB.workers.isJunkName ? QB.workers.isJunkName(s) : !String(s || '').trim();
  },

  /** Nombre limpio: padrón o vacío (nunca S/N). */
  realName(row) {
    const full = (row.nombreCompleto || '').trim();
    if (full && !this._junk(full)) return full;
    const ape = (row.apellido || '').trim();
    const nom = (row.nombre || '').trim();
    if (ape && !this._junk(ape)) {
      if (nom && !this._junk(nom)) return (ape + ' ' + nom).trim();
      return ape;
    }
    if (nom && !this._junk(nom)) return nom;
    return '';
  },

  initials(row) {
    const full = this.realName(row);
    if (full) {
      const p = full.split(/\s+/).filter(Boolean);
      const a = (p[0] && p[0][0]) || '';
      const b = (p[1] && p[1][0]) || (p[0] && p[0][1]) || '';
      return (a + b).toUpperCase();
    }
    const ci = String(row.ci || '').replace(/\D/g, '');
    return ci ? ci.slice(-2) : '—';
  },

  /** Apellidos cortos si hay nombre; si no, vacío (CI va en la línea de abajo). */
  shortName(row) {
    const full = this.realName(row);
    if (!full) return '';
    return full.split(/\s+/).slice(0, 2).join(' ');
  },

  /** Badge de iniciales (fácil de reconocer en campo) */
  img(row, size = 56) {
    const ini = this.initials(row);
    const col = this.colorOf(row.ci || 'x');
    const fs = Math.max(11, Math.round(size * 0.34));
    const tipName = this.realName(row) || this.shortName(row) || ini;
    return `<span class="avatar avatar-initials" style="width:${size}px;height:${size}px;background:${col.bg};color:${col.fg};font-size:${fs}px" title="${String(tipName).replace(/"/g, '&quot;')} · CI ${String(row.ci || '—')}">${ini}</span>`;
  },

  /**
   * Chip de equipo top
   * rank: 1-based · no usa fecha (persona única en el periodo)
   */
  chip(row, { rank = null } = {}) {
    const name = this.shortName(row);
    const label = name || (row.ci ? 'CI ' + row.ci : '—');
    const full = this.realName(row) || label;
    const grupo = (row.grupo || '').replace(/^Grupo\s+/i, '');
    const jarras = Number(row.c || 0).toLocaleString('es-PE');
    const tip = [
      rank != null ? `#${rank}` : '',
      full,
      row.ci ? `CI ${row.ci}` : '',
      grupo || '',
      `${jarras} jarras`,
      'Toca para ver detalle'
    ]
      .filter(Boolean)
      .join(' · ')
      .replace(/"/g, '&quot;');
    const rankHtml =
      rank == null
        ? ''
        : `<span class="person-rank ${rank <= 3 ? 'is-top' : ''}" title="Puesto #${rank} del día">#${rank}</span>`;
    const shown = label.length > 18 ? label.slice(0, 17) + '…' : label;
    return `<button type="button" class="person-chip" data-ci="${row.ci}" title="${tip}">
      <div class="person-chip-top">
        ${rankHtml}
        ${this.img(row, 48)}
      </div>
      <span class="person-meta">
        <strong title="${full.replace(/"/g, '&quot;')}">${shown}</strong>
        <em title="${jarras} jarras cosechadas">${jarras} jarras</em>
        ${grupo ? `<span class="person-grupo" title="Grupo ${grupo}">${grupo.length > 16 ? grupo.slice(0, 15) + '…' : grupo}</span>` : ''}
      </span>
    </button>`;
  }
};
