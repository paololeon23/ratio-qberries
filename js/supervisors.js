/* Supervisores / jefes por grupo LIC (padrón oficial) */
window.QB = window.QB || {};

QB.supervisors = {
  /** @type {{nombre:string,dni:string,lic:string,fecha?:string}[]} */
  rows: [
    { nombre: 'PAREDES GALARRETA CRISTHIAN JEANPIER', dni: '60741145', lic: 'LIC 26', fecha: '2026-08-24' },
    { nombre: 'OLIVARES AGUILAR ELCIRA', dni: '48590607', lic: 'LIC 58', fecha: '2026-08-24' },
    { nombre: 'VERGARA DAVILA KELINDA ELIZABETH', dni: '47117035', lic: 'LIC 08', fecha: '2026-08-24' },
    { nombre: 'VEGA BENITES WILMER CHANEL', dni: '70875214', lic: 'LIC 56', fecha: '2026-08-24' },
    { nombre: 'PURIZAGA SAAVEDRA PIERRE OSNAR', dni: '70192702', lic: 'LIC 24', fecha: '2026-08-24' },
    { nombre: 'CHAVEZ ALVA CARLOS ENRIQUE', dni: '45206311', lic: 'LIC 10', fecha: '2026-08-24' },
    { nombre: 'HERRERA ALBERCA MARIELA', dni: '61512235', lic: 'LIC 55', fecha: '2026-08-24' },
    { nombre: 'DE LA CRUZ SAAVEDRA JHONATAN JOEL', dni: '73503134', lic: 'LIC 14', fecha: '2026-08-24' },
    { nombre: 'CASIANO CABRERA JAYNI PAMELA', dni: '70135405', lic: 'LIC 41', fecha: '2026-08-24' },
    { nombre: 'HERRERA ALBERCA PAMELA', dni: '77534125', lic: 'LIC 25', fecha: '2026-08-24' },
    { nombre: 'PEÑA ROJAS LAURA PATRICIA', dni: '45372928', lic: 'LIC 01', fecha: '2026-08-24' },
    { nombre: 'LLAQUE ARGOMEDO GENESIS GUILIANA KEIKO', dni: '70559269', lic: 'LIC 05', fecha: '2026-08-24' },
    { nombre: 'NAMOC NARRO BIVIANA DE LOS ANGELES', dni: '74047419', lic: 'LIC 59', fecha: '2026-08-24' },
    { nombre: 'GUARNIZ MARREROS NELIXA VIVIANA', dni: '63249902', lic: 'LIC 44', fecha: '2026-08-24' },
    { nombre: 'HUAMAN ESPARZA EDELMIRA', dni: '77160560', lic: 'NO TENGO POR AHORA', fecha: '2026-08-24' },
    { nombre: 'CHACON BERMUDEZ NADIA SARAHI', dni: '77146080', lic: 'LIC 13', fecha: '2026-08-24' },
    { nombre: 'PLASENCIA CORREA NADIA YVONNE', dni: '43583858', lic: 'LIC 02', fecha: '2026-08-24' },
    { nombre: 'NAVEZ CARBAJAL YOVER OSWALDO', dni: '76774075', lic: 'LIC 04', fecha: '2026-08-24' },
    { nombre: 'FUENTES VALIENTE DEIMAR ULISES', dni: '74942842', lic: 'LIC 60', fecha: '2026-08-24' },
    { nombre: 'REBAZA SALINAS ALEXANDER YONATHAN', dni: '60836174', lic: 'LIC 42', fecha: '2026-08-24' },
    { nombre: 'HILARIO AVALOS EVELYN', dni: '48446147', lic: 'LIC 17', fecha: '2026-08-24' },
    { nombre: 'JULCA GAMBOA DILMER ELICER', dni: '48533707', lic: 'LIC 15', fecha: '2026-08-24' },
    { nombre: 'SALAZAR AURORA INGRID JHOANA', dni: '75075892', lic: 'LIC 28', fecha: '2026-08-24' },
    { nombre: 'NORIEGA PONTE MICELY', dni: '48268173', lic: 'LIC 34', fecha: '2026-08-24' },
    { nombre: 'TIRADO VERGARA FIORELLA VERENISE', dni: '74068569', lic: 'LIC 64', fecha: '2026-08-24' },
    { nombre: 'RODRIGUEZ CABRERA KENYI JENNY', dni: '70507014', lic: 'LIC 07', fecha: '2026-08-24' },
    { nombre: 'ROJAS AREDO YERSI YEN', dni: '75141739', lic: 'LIC 27', fecha: '2026-08-24' },
    { nombre: 'MIRANDA PALACIOS ERNESTINA EVELYN', dni: '70132627', lic: 'LIC 06', fecha: '2026-08-24' },
    { nombre: 'DIAZ VARAS FANNY DEL MILAGRO', dni: '43558894', lic: 'LIC 57', fecha: '2026-08-24' },
    { nombre: 'HUARIPATA RAMIREZ PATRICK ALEJANDRO', dni: '74291763', lic: 'LIC 03', fecha: '2026-08-24' },
    { nombre: 'CUEVA GUILLERMO KENNET ANDERSON', dni: '71880419', lic: 'LIC 53', fecha: '2026-08-24' },
    { nombre: 'VILCA BRICEÑO ALEXANDRA MARIA LAURA', dni: '76986313', lic: 'LIC 38', fecha: '2026-08-24' },
    { nombre: 'UCEDA ARIAS JOEL ALEXANDER', dni: '70657242', lic: 'LIC 39', fecha: '2026-08-24' },
    { nombre: 'TRONCOSO SANCHEZ HENRY BRAULIO', dni: '73634792', lic: 'LIC 35', fecha: '2026-08-24' },
    { nombre: 'MEZA HUAMAN ELIAS ELISEO', dni: '78011755', lic: 'LIC 63', fecha: '2026-08-24' },
    { nombre: 'TORRES GONZALEZ DE AQUINO MARTHA KARINA', dni: '72961122', lic: 'LIC 52', fecha: '2026-08-24' }
  ],

  _byLic: null,

  /** Normaliza "LIC 8", "Grupo LIC 08", "lic08" → "LIC 08" */
  licKey(grupo) {
    const s = String(grupo || '').trim();
    const m = s.match(/LIC\s*0*(\d{1,2})/i);
    if (m) return 'LIC ' + String(m[1]).padStart(2, '0');
    return s.toUpperCase();
  },

  rebuild() {
    const map = {};
    this.rows.forEach((r) => {
      const key = this.licKey(r.lic);
      if (!key || /NO TENGO/i.test(r.lic)) return;
      map[key] = {
        nombre: r.nombre,
        dni: r.dni,
        lic: key,
        fecha: r.fecha || ''
      };
    });
    this._byLic = map;
    return map;
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
