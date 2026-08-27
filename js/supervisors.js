/* Supervisores / jefes por grupo LIC (padrón oficial) */
window.QB = window.QB || {};

QB.supervisors = {
  /** @type {{nombre:string,dni:string,lic:string,fecha?:string}[]} */
  rows: [
    { nombre: 'DIAZ VARAS FANNY DEL MILAGRO', dni: '43558894', lic: 'LIC 57', fecha: '2026-08-26' },
    { nombre: 'PEÑA ROJAS LAURA PATRICIA', dni: '45372928', lic: 'LIC 11', fecha: '2026-08-26' },
    { nombre: 'HUARIPATA RAMIREZ PATRICK ALEJANDRO', dni: '74291763', lic: 'LIC 03', fecha: '2026-08-26' },
    { nombre: 'HERRERA ALBERCA PAMELA', dni: '77534125', lic: 'LIC 25', fecha: '2026-08-26' },
    { nombre: 'HUAMAN ESPARZA EDELMIRA', dni: '77160560', lic: 'LIC 43', fecha: '2026-08-26' },
    { nombre: 'LLAQUE ARGOMEDO GENESIS GUILIANA KEIKO', dni: '70559269', lic: 'LIC 05', fecha: '2026-08-26' },
    { nombre: 'JULCA GAMBOA DILMER ELICER', dni: '48533707', lic: 'LIC 15', fecha: '2026-08-26' },
    { nombre: 'LUCANO MALCA MOISES', dni: '76261283', lic: 'LIC 58', fecha: '2026-08-26' },
    { nombre: 'MEZA HUAMAN ELIAS ELISEO', dni: '78011755', lic: 'LIC 63', fecha: '2026-08-26' },
    { nombre: 'GUARNIZ MARREROS NELIXA VIVIANA', dni: '63249902', lic: 'LIC 44', fecha: '2026-08-26' },
    { nombre: 'VERGARA DAVILA KELINDA ELIZABETH', dni: '47117035', lic: 'LIC 08', fecha: '2026-08-26' },
    { nombre: 'PLASENCIA CORREA NADIA YVONNE', dni: '43583858', lic: 'LIC 02', fecha: '2026-08-26' },
    { nombre: 'CHACON BERMUDEZ NADIA SARAHI', dni: '77146080', lic: 'LIC 13', fecha: '2026-08-26' },
    { nombre: 'REBAZA SALINAS ALEXANDER YONATHAN', dni: '60836174', lic: 'LIC 42', fecha: '2026-08-26' },
    { nombre: 'HERRERA ALBERCA MARIELA', dni: '61512235', lic: 'LIC 55', fecha: '2026-08-26' },
    { nombre: 'VEGA BENITES WILMER CHANEL', dni: '70875214', lic: 'LIC 56', fecha: '2026-08-26' },
    { nombre: 'NORIEGA PONTE MICELY', dni: '48268173', lic: 'LIC 34', fecha: '2026-08-26' },
    { nombre: 'PAREDES GALARRETA CRISTHIAN JEANPIER', dni: '60741145', lic: 'LIC 26', fecha: '2026-08-26' },
    { nombre: 'NAMOC NARRO BIVIANA DE LOS ANGELES', dni: '74047419', lic: 'LIC 59', fecha: '2026-08-26' },
    { nombre: 'TIRADO VERGARA FIORELLA VERENISE', dni: '74068569', lic: 'LIC 64', fecha: '2026-08-26' },
    { nombre: 'CASIANO CABRERA JAYNI PAMELA', dni: '70135405', lic: 'LIC 41', fecha: '2026-08-26' },
    { nombre: 'VILCA BRICEÑO ALEXANDRA MARIA LAURA', dni: '76986313', lic: 'LIC 38', fecha: '2026-08-26' },
    { nombre: 'ROJAS AREDO YERSI YEN', dni: '75141739', lic: 'LIC 27', fecha: '2026-08-26' },
    { nombre: 'NAVEZ CARBAJAL YOVER OSWALDO', dni: '76774075', lic: 'LIC 04', fecha: '2026-08-26' },
    { nombre: 'CUEVA GUILLERMO KENNET ANDERSON', dni: '71880419', lic: 'LIC 53', fecha: '2026-08-26' },
    { nombre: 'UCEDA ARIAS JOEL ALEXANDER', dni: '70657242', lic: 'LIC 39', fecha: '2026-08-26' },
    { nombre: 'CHAVEZ ALVA CARLOS ENRIQUE', dni: '45206311', lic: 'LIC 10', fecha: '2026-08-26' },
    { nombre: 'TORRES GONZALEZ DE AQUINO MARTHA KARINA', dni: '72961122', lic: 'LIC 52', fecha: '2026-08-26' },
    { nombre: 'SALAZAR AURORA INGRID JHOANA', dni: '75075892', lic: 'LIC 18', fecha: '2026-08-26' },
    { nombre: 'LEON TRIGOSO JHONY ANDRONICO', dni: '71806261', lic: 'LIC 12', fecha: '2026-08-26' },
    { nombre: 'FUENTES VALIENTE DEIMAR ULISES', dni: '74942842', lic: 'LIC 60', fecha: '2026-08-26' },
    { nombre: 'RODRIGUEZ CABRERA KENYI JENNY', dni: '70507014', lic: 'LIC 07', fecha: '2026-08-26' }
  ],

  _byLic: null,

  /** DNI PE: siempre 8 dígitos (string), sin perder ceros a la izquierda */
  normDni(dni) {
    const d = String(dni == null ? '' : dni).replace(/\D/g, '');
    if (!d) return '';
    if (d.length < 8) return d.padStart(8, '0');
    return d.slice(0, 9);
  },

  /** Normaliza "LIC 8", "Grupo LIC 08", "lic08" → "LIC 08" */
  licKey(grupo) {
    const s = String(grupo || '').trim();
    const m = s.match(/LIC\s*0*(\d{1,2})/i);
    if (m) return 'LIC ' + String(m[1]).padStart(2, '0');
    return s.toUpperCase();
  },

  rebuild() {
    const map = {};
    const byDni = {};
    this.rows.forEach((r) => {
      const key = this.licKey(r.lic);
      if (!key || /NO TENGO/i.test(r.lic)) return;
      const dni = this.normDni(r.dni);
      r.dni = dni;
      if (dni && byDni[dni] && byDni[dni] !== key) {
        console.warn('[supervisors] DNI duplicado', dni, byDni[dni], 'vs', key);
      }
      if (dni) byDni[dni] = key;
      map[key] = {
        nombre: r.nombre,
        dni,
        lic: key,
        fecha: r.fecha || ''
      };
    });
    this._byLic = map;
    return map;
  },

  /**
   * Completa DNI desde trabajadores.json (por DNI o nombre exacto).
   * Solo rellena ceros / misma identidad — no cambia a otro documento.
   */
  enrichFromWorkers() {
    if (!window.QB || !QB.workers || !QB.workers.ready) return;
    let changed = false;
    this.rows.forEach((r) => {
      const dni = this.normDni(r.dni);
      let hit = dni ? QB.workers.get(dni) : null;
      if (!hit && r.nombre) {
        const want = String(r.nombre).trim().toUpperCase();
        const matches = [];
        for (const w of QB.workers.map.values()) {
          if (String(w.nombreCompleto || '').trim().toUpperCase() === want) {
            matches.push(w);
          }
        }
        if (matches.length === 1) hit = matches[0];
      }
      if (!hit || !hit.dni) return;
      const next = this.normDni(hit.dni);
      if (!next || next === r.dni) return;
      const bareA = String(r.dni || '').replace(/^0+/, '') || '0';
      const bareB = next.replace(/^0+/, '') || '0';
      if (!r.dni || bareA === bareB) {
        r.dni = next;
        changed = true;
      }
    });
    if (changed) this.rebuild();
  },

  byLic(grupo) {
    if (!this._byLic) this.rebuild();
    return this._byLic[this.licKey(grupo)] || null;
  },

  /** Apellidos cortos para UI */
  shortName(nombre) {
    const p = String(nombre || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!p.length) return '—';
    if (p.length === 1) return p[0];
    const a = p[0].toUpperCase();
    if (a === 'DE' || a === 'DEL' || a === 'LA' || a === 'LOS' || a === 'LAS') {
      return p.slice(0, Math.min(3, p.length)).join(' ');
    }
    if (p.length >= 3 && p[1].toUpperCase() === 'LA' && a === 'DE') {
      return p.slice(0, 3).join(' ');
    }
    return p[0] + ' ' + p[1];
  },

  label(grupo) {
    const s = this.byLic(grupo);
    return s ? this.shortName(s.nombre) : '';
  },

  fullLabel(grupo) {
    const s = this.byLic(grupo);
    if (!s) return '';
    return s.nombre;
  }
};

QB.supervisors.rebuild();
