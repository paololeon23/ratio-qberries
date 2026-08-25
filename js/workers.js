/* Catálogo de trabajadores activos (DNI → nombre completo) */
window.QB = window.QB || {};

QB.workers = {
  map: new Map(),
  ready: false,

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
        const dni = String(w.dni || '').replace(/\D/g, '');
        if (!dni) continue;
        map.set(dni, {
          dni,
          nombreCompleto: String(w.nombre || '').trim(),
          cargo: w.cargo || '',
          fechaIngreso: w.fechaIngreso || ''
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
    const dni = String(ci || '').replace(/\D/g, '');
    return this.map.get(dni) || null;
  },

  /** Une producción + padrón activo; prioriza nombre del listado */
  enrich(row) {
    const w = this.get(row.ci);
    let nombre = row.nombre || '';
    let apellido = row.apellido || '';
    let activo = false;
    let nombreCompleto = '';

    if (w) {
      activo = true;
      nombreCompleto = w.nombreCompleto;
      const parts = w.nombreCompleto.split(/\s+/).filter(Boolean);
      // Heurística PE: APELLIDOS NOMBRES → primeras 2 tokens apellido, resto nombres
      if (parts.length >= 3) {
        apellido = parts.slice(0, 2).join(' ');
        nombre = parts.slice(2).join(' ');
      } else if (parts.length === 2) {
        apellido = parts[0];
        nombre = parts[1];
      } else {
        nombre = w.nombreCompleto;
        apellido = '';
      }
    } else {
      if (!nombre || nombre === 'S/N') nombre = 'S/N';
      nombreCompleto = [nombre, apellido].filter(Boolean).join(' ').trim();
    }

    return {
      ...row,
      nombre,
      apellido,
      nombreCompleto,
      activo,
      cargo: w ? w.cargo : ''
    };
  }
};
