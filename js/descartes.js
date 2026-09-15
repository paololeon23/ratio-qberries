/* Jarras de descarte por LIC · por fecha de cosecha */
window.QB = window.QB || {};

QB.descartes = {
  _byLicFecha: null,
  _byFecha: null,
  _ready: false,

  /** Respaldo embebido · 31/08 y 01/09/2026 */
  defaultPayload: {
    dias: [
      {
        fecha: '2026-08-31',
        TOTAL_JARRAS_DESCARTE: [
          { nombre: 'NORIEGA PONTE MICELY', lic: 'LIC 34', jarras_de_descarte: 118 },
          { nombre: 'HERRERA ALBERCA MARIELA', lic: 'LIC 55', jarras_de_descarte: 113 },
          { nombre: 'JULCA GAMBOA DILMER ELICER', lic: 'LIC 15', jarras_de_descarte: 235 },
          { nombre: 'PAREDES GALARRETA CRISTHIAN JEANPIER', lic: 'LIC 26', jarras_de_descarte: 12 },
          { nombre: 'CASIANO CABRERA JAYNI PAMELA', lic: 'LIC 41', jarras_de_descarte: 32 },
          { nombre: 'CHACON BERMUDEZ NADIA SARAHI', lic: 'LIC 13', jarras_de_descarte: 125 },
          { nombre: 'VILCA BRICEÑO ALEXANDRA MARIA LAURA', lic: 'LIC 38', jarras_de_descarte: 121 },
          { nombre: 'PURIZAGA SAAVEDRA PIERRE OSNAR', lic: 'LIC 24', jarras_de_descarte: 104 },
          { nombre: 'HILARIO AVALOS EVELYN', lic: 'LIC 17', jarras_de_descarte: 168 },
          { nombre: 'CHAVEZ ALVA CARLOS ENRIQUE', lic: 'LIC 10', jarras_de_descarte: 164 },
          { nombre: 'RIOS MEDINA DAHIRA MICAELA', lic: 'LIC 62', jarras_de_descarte: 93 },
          { nombre: 'DIAZ VARAS FANNY DEL MILAGRO', lic: 'LIC 57', jarras_de_descarte: 96 },
          { nombre: 'VEGA BENITES WILMER CHANEL', lic: 'LIC 56', jarras_de_descarte: 111 },
          { nombre: 'VERGARA DAVILA KELINDA ELIZABETH', lic: 'LIC 08', jarras_de_descarte: 175 },
          { nombre: 'ALEXANDER REBAZA', lic: 'LIC 42', jarras_de_descarte: 171 },
          { nombre: 'MOISES LUCANO', lic: 'LIC 43', jarras_de_descarte: 94 },
          { nombre: 'LLAQUE ARGOMEDO GENESIS GUILIANA KEIKO', lic: 'LIC 05', jarras_de_descarte: 253 },
          { nombre: 'HERRERA ALBERCA PAMELA', lic: 'LIC 25', jarras_de_descarte: 182 },
          { nombre: 'LEON TRIGOSO JHONY ANDRONICO', lic: 'LIC 18', jarras_de_descarte: 36 },
          { nombre: 'HUARIPATA RAMIREZ PATRICK ALEJANDRO', lic: 'LIC 03', jarras_de_descarte: 250 },
          { nombre: 'RODRIGUEZ CABRERA KENYI', lic: 'LIC 07', jarras_de_descarte: 234 },
          { nombre: 'ROJAS AREDO YERSI YEN', lic: 'LIC 27', jarras_de_descarte: 80 },
          { nombre: 'NADIA PLASENCIA', lic: 'LIC 02', jarras_de_descarte: 54 },
          { nombre: 'ARMAS DIAZ CRISTIAN DANIEL', lic: 'LIC 36', jarras_de_descarte: 153 },
          { nombre: 'FUENTES VALIENTE DEIMAR ULISES', lic: 'LIC 60', jarras_de_descarte: 204 },
          { nombre: 'CUEVA GUILLERMO KENNET ANDERSON', lic: 'LIC 53', jarras_de_descarte: 14 },
          { nombre: 'PEÑA ROJAS LAURA PATRICIA', lic: 'LIC 11', jarras_de_descarte: 173 },
          { nombre: 'NAVEZ CARBAJAL YOVER OSWALDO', lic: 'LIC 04', jarras_de_descarte: 115 }
        ]
      },
      {
        fecha: '2026-09-01',
        TOTAL_JARRAS_DESCARTE: [
          { nombre: 'HERRERA ALBERCA MARIELA', lic: 'LIC 55', jarras_de_descarte: 277 },
          { nombre: 'LLAQUE ARGOMEDO GENESIS GUILIANA KEIKO', lic: 'LIC 05', jarras_de_descarte: 453 },
          { nombre: 'JULCA GAMBOA DILMER ELICER', lic: 'LIC 15', jarras_de_descarte: 291 },
          { nombre: 'FUENTES VALIENTE DEIMAR ULISES', lic: 'LIC 60', jarras_de_descarte: 437 },
          { nombre: 'TRONCOSO SANCHEZ HENRY BRAULIO', lic: 'LIC 35', jarras_de_descarte: 276 },
          { nombre: 'HERRERA ALBERCA PAMELA', lic: 'LIC 25', jarras_de_descarte: 403 },
          { nombre: 'CHAVEZ ALVA CARLOS ENRIQUE', lic: 'LIC 10', jarras_de_descarte: 315 },
          { nombre: 'ANTICONA SOTO CRISTHIAN ALEXANDER', lic: 'LIC 62', jarras_de_descarte: 117 },
          { nombre: 'HILARIO AVALOS EVELYN', lic: 'LIC 17', jarras_de_descarte: 215 },
          { nombre: 'DIAZ VARAS FANNY DEL MILAGRO', lic: 'LIC 57', jarras_de_descarte: 210 },
          { nombre: 'PAREDES GALARRETA CRISTHIAN JEANPIER', lic: 'LIC 26', jarras_de_descarte: 168 },
          { nombre: 'NORIEGA PONTE MICELY', lic: 'LIC 34', jarras_de_descarte: 296 },
          { nombre: 'VILCA BRICEÑO ALEXANDRA MARIA LAURA', lic: 'LIC 38', jarras_de_descarte: 329 },
          { nombre: 'HUARIPATA RAMIREZ PATRICK ALEJANDRO', lic: 'LIC 03', jarras_de_descarte: 180 },
          { nombre: 'CHACON BERMUDEZ NADIA SARAHI', lic: 'LIC 06', jarras_de_descarte: 300 },
          { nombre: 'PLASENCIA CORREA NADIA YVONNE', lic: 'LIC 02', jarras_de_descarte: 318 },
          { nombre: 'EDELMIRA HUAMÁN', lic: 'LIC 43', jarras_de_descarte: 168 },
          { nombre: 'LEON TRIGOSO JHONY ANDRONICO', lic: 'LIC 18', jarras_de_descarte: 248 },
          { nombre: 'LUCANO MALCA MOISES', lic: 'LIC 58', jarras_de_descarte: 259 },
          { nombre: 'ARMAS DIAZ CRISTIAN DANIEL', lic: 'LIC 36', jarras_de_descarte: 266 },
          { nombre: 'CUEVA GUILLERMO KENNET ANDERSON', lic: 'LIC 53', jarras_de_descarte: 296 },
          { nombre: 'RODRIGUEZ CABRERA KENYI JENNY', lic: 'LIC 07', jarras_de_descarte: 329 },
          { nombre: 'VEGA BENITES WILMER CHANEL', lic: 'LIC 56', jarras_de_descarte: 179 },
          { nombre: 'NAVEZ CARBAJAL YOVER OSWALDO', lic: 'LIC 04', jarras_de_descarte: 276 },
          { nombre: 'PEÑA ROJAS LAURA PATRICIA', lic: 'LIC 11', jarras_de_descarte: 266 },
          { nombre: 'VERGARA DAVILA KELINDA ELIZABETH', lic: 'LIC 08', jarras_de_descarte: 357 },
          { nombre: 'PURIZAGA SAAVEDRA PIERRE OSNAR', lic: 'LIC 12', jarras_de_descarte: 205 },
          { nombre: 'CASIANO CABRERA JAYNI PAMELA', lic: 'LIC 41', jarras_de_descarte: 64 }
        ]
      },
      {
        fecha: '2026-09-02',
        TOTAL_JARRAS_DESCARTE: [
          { nombre: 'ANTICONA SOTO CRISTHIAN ALEXANDER', lic: 'LIC 40', jarras_de_descarte: 247 },
          { nombre: 'ARMAS DIAZ CRISTIAN DANIEL', lic: 'LIC 36', jarras_de_descarte: 356 },
          { nombre: 'CHACON BERMUDEZ NADIA SARAHI', lic: 'LIC 06', jarras_de_descarte: 165 },
          { nombre: 'CUEVA GUILLERMO KENNET ANDERSON', lic: 'LIC 53', jarras_de_descarte: 283 },
          { nombre: 'DIAZ VARAS FANNY DEL MILAGRO', lic: 'LIC 57', jarras_de_descarte: 192 },
          { nombre: 'FUENTES VALIENTE DEIMAR ULISES', lic: 'LIC 60', jarras_de_descarte: 354 },
          { nombre: 'HERRERA ALBERCA MARIELA', lic: 'LIC 55', jarras_de_descarte: 192 },
          { nombre: 'HERRERA ALBERCA PAMELA', lic: 'LIC 25', jarras_de_descarte: 222 },
          { nombre: 'HILARIO AVALOS EVELYN', lic: 'LIC 17', jarras_de_descarte: 168 },
          { nombre: 'HUAMAN ESPARZA EDELMIRA', lic: 'LIC 43', jarras_de_descarte: 252 },
          { nombre: 'HUARIPATA RAMIREZ PATRICK ALEJANDRO', lic: 'LIC 03', jarras_de_descarte: 144 },
          { nombre: 'JULCA GAMBOA DILMER ELICER', lic: 'LIC 15', jarras_de_descarte: 286 },
          { nombre: 'LEON TRIGOSO JHONY ANDRONICO', lic: 'LIC 18', jarras_de_descarte: 174 },
          { nombre: 'LLAQUE ARGOMEDO GENESIS GUILIANA KEIKO', lic: 'LIC 05', jarras_de_descarte: 258 },
          { nombre: 'LUCANO MALCA MOISES', lic: 'LIC 58', jarras_de_descarte: 61 },
          { nombre: 'NAVEZ CARBAJAL YOVER OSWALDO', lic: 'LIC 04', jarras_de_descarte: 235 },
          { nombre: 'NORIEGA PONTE MICELY', lic: 'LIC 34', jarras_de_descarte: 151 },
          { nombre: 'PAREDES GALARRETA CRISTHIAN JEANPIER', lic: 'LIC 26', jarras_de_descarte: 312 },
          { nombre: 'PEÑA ROJAS LAURA PATRICIA', lic: 'LIC 11', jarras_de_descarte: 187 },
          { nombre: 'PLASENCIA CORREA NADIA YVONNE', lic: 'LIC 02', jarras_de_descarte: 231 },
          { nombre: 'PURIZAGA SAAVEDRA PIERRE OSNAR', lic: 'LIC 24', jarras_de_descarte: 177 },
          { nombre: 'RODRIGUEZ CABRERA KENYI JENNY', lic: 'LIC 07', jarras_de_descarte: 253 },
          { nombre: 'ROJAS AREDO YERSI YEN', lic: 'LIC 27', jarras_de_descarte: 242 },
          { nombre: 'TRONCOSO SANCHEZ HENRY BRAULIO', lic: 'LIC 35', jarras_de_descarte: 183 },
          { nombre: 'VEGA BENITES WILMER CHANEL', lic: 'LIC 56', jarras_de_descarte: 153 },
          { nombre: 'VERGARA DAVILA KELINDA ELIZABETH', lic: 'LIC 08', jarras_de_descarte: 36 },
          { nombre: 'VILCA BRICEÑO ALEXANDRA MARIA LAURA', lic: 'LIC 38', jarras_de_descarte: 253 }
        ]
      }
    ]
  },

  normName(n) {
    return String(n || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  },

  nameMatches(a, b) {
    const na = this.normName(a);
    const nb = this.normName(b);
    if (!na || !nb) return false;
    if (na === nb) return true;
    if (na.includes(nb) || nb.includes(na)) return true;
    const ta = na.split(' ').filter((t) => t.length > 2);
    const tb = new Set(nb.split(' ').filter((t) => t.length > 2));
    let common = 0;
    ta.forEach((t) => {
      if (tb.has(t)) common++;
    });
    return common >= 2;
  },

  licForNombre(nombre, fecha) {
    const sup = window.QB && QB.supervisors;
    if (!sup) return '';
    const padron = (sup.rows || []).filter(
      (r) => r.fecha === fecha && sup.isActive(r) && r.lic
    );
    for (let i = 0; i < padron.length; i++) {
      if (this.nameMatches(nombre, padron[i].nombre)) {
        return sup.licKey(padron[i].lic);
      }
    }
    return '';
  },

  _normalizeDay(rawDay) {
    if (!rawDay || !Array.isArray(rawDay.TOTAL_JARRAS_DESCARTE)) return null;
    const fecha = String(rawDay.fecha || '').slice(0, 10);
    if (!fecha) return null;
    const rows = rawDay.TOTAL_JARRAS_DESCARTE.map((row) => {
      const sup = window.QB && QB.supervisors;
      const lic = row.lic
        ? sup
          ? sup.licKey(row.lic)
          : String(row.lic).trim()
        : this.licForNombre(row.nombre, fecha);
      return {
        nombre: row.nombre,
        lic,
        jarras_de_descarte: Number(row.jarras_de_descarte) || 0
      };
    });
    return { fecha, rows };
  },

  normalizePayload(raw) {
    if (!raw) return {};
    const out = {};

    if (Array.isArray(raw.dias)) {
      raw.dias.forEach((day) => {
        const n = this._normalizeDay(day);
        if (n) out[n.fecha] = n.rows;
      });
      return out;
    }

    if (Array.isArray(raw.TOTAL_JARRAS_DESCARTE)) {
      const n = this._normalizeDay(raw);
      if (n) out[n.fecha] = n.rows;
      return out;
    }

    /* Ya viene como { "2026-08-31": [...], ... } */
    Object.keys(raw).forEach((k) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(k) && Array.isArray(raw[k])) {
        out[k] = raw[k].map((row) => ({
          nombre: row.nombre,
          lic: row.lic || '',
          jarras_de_descarte: Number(row.jarras_de_descarte) || 0
        }));
      }
    });
    return out;
  },

  async load(force) {
    if (this._ready && !force) return this._byFecha;
    let remote = null;
    try {
      const res = await fetch('data/descartes.json', { cache: 'no-cache' });
      if (res.ok) remote = await res.json();
    } catch (e) {
      remote = null;
    }
    const fromRemote = this.normalizePayload(remote);
    const fromDefault = this.normalizePayload(this.defaultPayload);
    this._byFecha = Object.assign({}, fromDefault, fromRemote);
    if (!Object.keys(this._byFecha).length) {
      this._byFecha = fromDefault;
    }
    this.rebuild();
    this._ready = true;
    return this._byFecha;
  },

  rebuild() {
    const map = {};
    const src = this._byFecha || {};
    const sup = window.QB && QB.supervisors;

    Object.keys(src).forEach((fecha) => {
      map[fecha] = {};
      (src[fecha] || []).forEach((row) => {
        const jarras = Number(row.jarras_de_descarte) || 0;
        let lic = row.lic ? (sup ? sup.licKey(row.lic) : String(row.lic).trim()) : '';
        if (!lic) lic = this.licForNombre(row.nombre, fecha);
        if (lic) map[fecha][lic] = jarras;
      });
    });

    this._byLicFecha = map;
    return map;
  },

  forLic(grupo, fecha) {
    if (!this._byLicFecha) this.rebuild();
    const sup = window.QB && QB.supervisors;
    const lic = sup ? sup.licKey(grupo) : String(grupo || '');
    const f = String(fecha || '').trim();
    if (!lic || !f) return 0;
    const bucket = this._byLicFecha[f];
    if (!bucket || bucket[lic] == null) return 0;
    return Number(bucket[lic]) || 0;
  },

  fechas() {
    if (!this._byFecha) return [];
    return Object.keys(this._byFecha).sort();
  },

  rowsForFecha(fecha) {
    if (!this._byFecha) return [];
    return this._byFecha[String(fecha || '').slice(0, 10)] || [];
  },

  /** Filas unidas por LIC para comparar varias fechas */
  compareRows(fechas) {
    const list = (fechas || []).map((f) => String(f || '').slice(0, 10)).filter(Boolean);
    if (!list.length) return { fechas: list, rows: [], totals: [] };
    if (!this._byLicFecha) this.rebuild();
    const licNum = (lic) => {
      const m = String(lic || '').match(/\d+/);
      return m ? parseInt(m[0], 10) : 9999;
    };
    const byLic = {};
    list.forEach((fecha, di) => {
      (this._byFecha[fecha] || []).forEach((row) => {
        const lic = row.lic || this.licForNombre(row.nombre, fecha) || '';
        if (!lic) return;
        if (!byLic[lic]) {
          byLic[lic] = {
            lic,
            nombre: row.nombre || '',
            values: list.map(() => 0)
          };
        }
        byLic[lic].values[di] = Number(row.jarras_de_descarte) || 0;
        if (row.nombre) byLic[lic].nombre = row.nombre;
      });
    });
    const rows = Object.values(byLic).sort((a, b) => licNum(a.lic) - licNum(b.lic));
    const totals = list.map((_, di) => rows.reduce((s, r) => s + (Number(r.values[di]) || 0), 0));
    return { fechas: list, rows, totals };
  }
};
