/* Catálogo de trabajadores activos (DNI → nombre completo) */
window.QB = window.QB || {};

QB.workers = {
  map: new Map(),
  ready: false,

  /**
   * Limpia CI/DNI a dígitos; DNI PE = 8 (rellena ceros a la izquierda si Sheets los perdió).
   * "S/N (70.845.004-E)" → "70845004"
   * 814579 (number) → "00814579"
   */
  cleanCi(v) {
    if (v == null || v === '') return '';
    let digits = '';
    if (typeof v === 'number' && isFinite(v)) {
      digits = String(Math.round(v));
    } else {
      const s = String(v).trim();
      if (!s) return '';
      const paren = s.match(/\(([^)]+)\)/);
      const target = paren ? paren[1] : s;
      digits = String(target).replace(/\D/g, '');
    }
    if (!digits) return '';
    if (digits.length < 8) digits = digits.padStart(8, '0');
    return digits.slice(0, 9);
  },

  /** Basura de hoja: S/N, CI formateado, vacío */
  isJunkName(s) {
    const t = String(s == null ? '' : s).trim();
    if (!t) return true;
    if (/^S\/N\b/i.test(t)) return true;
    if (t.charAt(0) === '(') return true;
    if (/^\d{1,2}([.\s]\d{3}){2}([-\s]?\w)?$/i.test(t)) return true;
    return false;
  },

  async load() {
    if (location.protocol === 'file:') {
      return this.map;
    }
    try {
      const res = await fetch('data/trabajadores.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('trabajadores HTTP ' + res.status);
      const list = await res.json();
      const map = new Map();
      for (const w of list) {
        const dni = this.cleanCi(w.dni);
        if (!dni) continue;
        if (map.has(dni)) continue;
        const nom = String(w.nombre || '').trim();
        map.set(dni, {
          dni,
          nombreCompleto: this.isJunkName(nom) ? '' : nom,
          cargo: w.cargo || '',
          fechaIngreso: w.fechaIngreso || '',
          /* false = baja / no activo en padrón */
          activo: w.activo !== false
        });
      }
      this.map = map;
      this.ready = true;
      return map;
    } catch (err) {
      this.ready = false;
      return this.map;
    }
  },

  get(ci) {
    const dni = this.cleanCi(ci);
    if (!dni) return null;
    return this.map.get(dni) || null;
  },

  /**
   * Une producción + padrón (O(1) por fila).
   * Si hay nombre en trabajadores.json → lo pone; si no → vacío (nunca S/N).
   */
  enrich(row) {
    const ciClean =
      this.cleanCi(row.ci) ||
      this.cleanCi(row.apellido) ||
      this.cleanCi(row.nombre) ||
      this.cleanCi(row.nombreCompleto);

    const w = ciClean ? this.map.get(ciClean) : null;
    let nombre = '';
    let apellido = '';
    let nombreCompleto = '';
    let activo = false;

    if (w && w.nombreCompleto) {
      activo = w.activo !== false;
      nombreCompleto = w.nombreCompleto;
      const parts = nombreCompleto.split(/\s+/).filter(Boolean);
      if (parts.length >= 3) {
        apellido = parts.slice(0, 2).join(' ');
        nombre = parts.slice(2).join(' ');
      } else if (parts.length === 2) {
        apellido = parts[0];
        nombre = parts[1];
      } else {
        nombre = nombreCompleto;
      }
    }

    return {
      fecha: row.fecha,
      ci: ciClean || '',
      nombre,
      apellido,
      nombreCompleto,
      grupo: row.grupo || '',
      variedad: row.variedad || '',
      huerto: row.huerto || '',
      c: row.c,
      filas: row.filas,
      lotes: row.lotes,
      modulos: row.modulos,
      turnos: row.turnos,
      modulo: row.modulo,
      turno: row.turno,
      activo,
      cargo: w ? w.cargo : ''
    };
  }
};
