/* Historial semanal · snapshot fijo del Excel (js/historial.json).
   LIC y jefe de cada día no se recalculan si cambia el padrón. */
window.QB = window.QB || {};

QB.historial = {
  anio: 2026,
  semanaActual: 39,
  ultimaSemanaCargada: 0,
  /** Fechas ISO ordenadas (antigua → actual) */
  dias: [],
  /**
   * @type {Record<string,{dni:string,nombre:string,dias:Record<string,{estado:string,supervisor:string,lic:string,jarras:number}>}>}
   */
  byDni: Object.create(null),

  normDni(s) {
    return String(s || '').replace(/\D/g, '');
  },

  esNombreBasura(s) {
    const t = String(s == null ? '' : s).trim();
    if (!t) return true;
    if (/^S\/N\b/i.test(t)) return true;
    if (t.charAt(0) === '(') return true;
    if (/S\/N/i.test(t) && /\d/.test(t)) return true;
    return false;
  },

  nombreDePadron(dni) {
    const map = (window.QB && QB.historialNombres) || {};
    const d = this.normDni(dni);
    if (!d) return '';
    const keys = [d, d.padStart(8, '0'), d.replace(/^0+/, '')];
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (k && map[k]) return map[k];
    }
    if (window.QB && QB.workers && QB.workers.get) {
      const w = QB.workers.get(d);
      if (w && w.nombreCompleto) return w.nombreCompleto;
    }
    return '';
  },

  /** Vuelve a poner el nombre del padrón en los CI que la hoja guardó como S/N. */
  refrescarNombres() {
    const by = this.byDni || {};
    Object.keys(by).forEach((dni) => {
      const p = by[dni];
      if (!p) return;
      p.nombre = this.nombreLimpio(p.nombre, p.dni || dni);
    });
  },

  nombreLimpio(nombre, dni) {
    const d = this.normDni(dni);
    const n = String(nombre || '').trim();
    const vacio = this.esNombreBasura(n) || !n || this.normDni(n) === d;
    if (vacio) return this.nombreDePadron(d) || d || '';
    return n;
  },

  tendenciaBajada(serie) {
    const pts = (serie || []).filter((d) => d.estado === 'ok');
    if (pts.length < 2) {
      return { bajando: false, label: '—', desde: 0, hasta: 0 };
    }
    const first = Number(pts[0].jarras) || 0;
    const last = Number(pts[pts.length - 1].jarras) || 0;
    const n = pts.length;
    const h1 = pts.slice(0, Math.ceil(n / 2));
    const h2 = pts.slice(Math.floor(n / 2));
    const avg = (arr) => arr.reduce((s, d) => s + (Number(d.jarras) || 0), 0) / arr.length;
    const a1 = avg(h1);
    const a2 = avg(h2);
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    pts.forEach((d, i) => {
      const y = Number(d.jarras) || 0;
      sumX += i;
      sumY += y;
      sumXY += i * y;
      sumX2 += i * i;
    });
    const den = n * sumX2 - sumX * sumX;
    const slope = den ? (n * sumXY - sumX * sumY) / den : 0;
    const bajando = slope < 0 && a2 + 3 < a1 && last < first;
    const flecha = Math.round(first) + '→' + Math.round(last);
    const label = bajando ? 'Por acompañar · ' + flecha : slope > 0 && last > first ? 'En alza · ' + flecha : 'Estable · ' + flecha;
    return { bajando: bajando, label: label, desde: first, hasta: last };
  },

  isoWeek(iso) {
    const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return 0;
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  },

  fmtFecha(iso) {
    const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[3] + '/' + m[2];
    return String(iso || '—');
  },

  boot() {
    const pack = window.QB && QB.historialData;
    if (!pack || !pack.p) return;
    this.dias = Array.isArray(pack.dias) ? pack.dias.slice() : [];
    this.semanaActual = pack.semanaActual || 39;
    const by = Object.create(null);
    Object.keys(pack.p).forEach((dni) => {
      const src = pack.p[dni] || {};
      const dias = Object.create(null);
      Object.keys(src.x || {}).forEach((f) => {
        const rec = src.x[f] || [];
        dias[f] = {
          estado: 'ok',
          supervisor: rec[2] || '',
          lic: rec[1] || '',
          jarras: Number(rec[0]) || 0,
          huerto: rec[3] || '',
          variedad: rec[4] || '',
          bloque: rec[5] || ''
        };
      });
      by[dni] = { dni: dni, nombre: this.nombreLimpio(src.n, dni), dias: dias };
    });
    this.byDni = by;
    let maxW = 0;
    this.dias.forEach((f) => {
      const w = this.isoWeek(f);
      if (w > maxW) maxW = w;
    });
    this.ultimaSemanaCargada = maxW;
    if (!this.bloqueActivo) this.bloqueActivo = 'i';
  },

  /** Licapa I incluye Licapa III si es Sekoya Pop. Licapa II incluye Licapa III si es Magica. */
  bloqueDe(huerto, variedad) {
    const h = String(huerto || '').trim().toLowerCase();
    const v = String(variedad || '').trim().toLowerCase();
    const iii = /licapa\s*(iii|3)\b/.test(h);
    const ii = /licapa\s*(ii|2)\b/.test(h);
    const uno = h === 'licapa' || /licapa\s*(i|1)\b/.test(h);
    const sekoya = v.indexOf('sekoya') >= 0;
    const magica = v.indexOf('magic') >= 0;
    if (ii && !iii) return 'ii';
    if (iii) return magica ? 'ii' : 'i';
    if (uno) return magica && !sekoya ? 'ii' : 'i';
    if (sekoya) return 'i';
    if (magica) return 'ii';
    return '';
  },

  diaEnBloque(rec) {
    const want = this.bloqueActivo;
    if (!want) return true;
    const explicit = rec && rec.bloque;
    if (explicit === 'i' || explicit === 'ii') return explicit === want;
    const guessed = this.bloqueDe(rec && rec.huerto, rec && rec.variedad);
    if (guessed) return guessed === want;
    const pack = (window.QB && QB.historialData && QB.historialData.bloque) || 'i';
    return pack === want;
  },

  fechasActivas() {
    if (!this.bloqueActivo) return this.dias.slice();
    const set = Object.create(null);
    Object.keys(this.byDni || {}).forEach((dni) => {
      const dias = (this.byDni[dni] && this.byDni[dni].dias) || {};
      Object.keys(dias).forEach((f) => {
        if (this.diaEnBloque(dias[f])) set[f] = 1;
      });
    });
    const fechas = Object.keys(set).sort();
    if (fechas.length) return fechas;
    const pack = (window.QB && QB.historialData && QB.historialData.bloque) || '';
    if (pack === this.bloqueActivo) return this.dias.slice();
    return [];
  },

  jefeDe(lic, fecha) {
    if (!window.QB || !QB.supervisors) return '';
    return QB.supervisors.fullLabel(lic, fecha) || QB.supervisors.label(lic, fecha) || '';
  },

  list(q) {
    const raw = String(q || '').trim();
    const rows = Object.keys(this.byDni || {}).map((d) => this.byDni[d]);
    rows.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es') || a.dni.localeCompare(b.dni));
    const enBloque = rows.filter((p) => {
      if (!this.bloqueActivo) return true;
      const dias = p.dias || {};
      return Object.keys(dias).some((f) => this.diaEnBloque(dias[f]));
    });
    if (!raw) return enBloque;
    const parts = raw.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
    const dnis = [];
    const names = [];
    parts.forEach((p) => {
      const d = this.normDni(p);
      const letters = p.replace(/[\d\s.\-/]/g, '');
      if (d.length >= 6 && !letters) dnis.push(d);
      else if (p) names.push(p.toUpperCase());
    });
    if (!dnis.length && !names.length) return enBloque;
    return enBloque.filter((p) => {
      const dni = String(p.dni || '');
      if (dnis.some((d) => dni === d || dni.indexOf(d) >= 0 || d.indexOf(dni) >= 0)) return true;
      const nom = String(p.nombre || '').toUpperCase();
      if (names.some((n) => nom.indexOf(n) >= 0)) return true;
      return false;
    });
  },

  find(q) {
    const d = this.normDni(q);
    if (!d) return null;
    if (this.byDni[d]) return this.byDni[d];
    const keys = Object.keys(this.byDni);
    const hits = keys.filter((k) => k === d || k.endsWith(d) || k.indexOf(d) === 0);
    if (hits.length === 1) return this.byDni[hits[0]];
    return null;
  },

  stats(person) {
    const fechas = this.fechasActivas();
    const serie = [];
    const jefes = [];
    const seenJefe = Object.create(null);
    let ok = 0;
    let falta = 0;
    let permiso = 0;
    fechas.forEach((fecha) => {
      const rec = (person && person.dias && person.dias[fecha]) || null;
      const estado = rec ? rec.estado : person ? 'falta' : 'sin-data';
      if (estado === 'ok') ok += 1;
      else if (estado === 'falta') falta += 1;
      else if (estado === 'permiso') permiso += 1;
      const lic = rec && rec.lic ? rec.lic : '';
      const sup = rec && rec.supervisor ? rec.supervisor : '';
      if (sup && !seenJefe[sup]) {
        seenJefe[sup] = 1;
        jefes.push({ nombre: sup, lic: (rec && rec.lic) || '', desde: fecha });
      }
      serie.push({
        fecha: fecha,
        label: this.fmtFecha(fecha),
        estado: estado,
        supervisor: sup,
        lic: (rec && rec.lic) || '',
        jarras: rec ? Number(rec.jarras) || 0 : 0,
        valor: estado === 'ok' ? (Number(rec && rec.jarras) || 1) : 0
      });
    });
    const worked = serie.filter((d) => d.estado === 'ok');
    const jarrasTotal = worked.reduce((s, d) => s + (Number(d.jarras) || 0), 0);
    const promedio = worked.length ? jarrasTotal / worked.length : 0;
    const tend = this.tendenciaBajada(serie);
    return {
      dni: person ? person.dni : '',
      nombre: person ? this.nombreLimpio(person.nombre, person.dni) : '',
      diasCargados: fechas.length,
      diasTrabajados: ok,
      diasFalto: falta,
      diasPermiso: permiso,
      jarrasTotal: jarrasTotal,
      promedio: promedio,
      bajando: tend.bajando,
      bajada: tend.label,
      supervisores: jefes,
      serie: serie
    };
  },

  umbralApto: 30,

  dnisFromText(text) {
    const seen = Object.create(null);
    const out = [];
    String(text || '')
      .split(/[\s,;|]+/)
      .forEach((tok) => {
        const d = this.normDni(tok);
        if (d.length < 6 || d.length > 12) return;
        if (/^(19|20)\d{2}$/.test(d)) return;
        if (seen[d]) return;
        seen[d] = 1;
        out.push(d);
      });
    return out;
  },

  async inflateRaw(bytes) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('Este navegador no puede leer el Excel. Usa Chrome o Edge.');
    }
    const ds = new DecompressionStream('deflate-raw');
    const stream = new Blob([bytes]).stream().pipeThrough(ds);
    return new Uint8Array(await new Response(stream).arrayBuffer());
  },

  async unzipXlsx(buf) {
    const u = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    const ab = u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength);
    const dv = new DataView(ab);
    let eocd = -1;
    const min = Math.max(0, u.length - 65557);
    for (let i = u.length - 22; i >= min; i--) {
      if (dv.getUint32(i, true) === 0x06054b50) {
        eocd = i;
        break;
      }
    }
    if (eocd < 0) throw new Error('El archivo no es un Excel .xlsx');
    const nFiles = dv.getUint16(eocd + 10, true);
    let p = dv.getUint32(eocd + 16, true);
    const files = Object.create(null);
    const dec = new TextDecoder();
    for (let n = 0; n < nFiles; n++) {
      if (p + 46 > u.length || dv.getUint32(p, true) !== 0x02014b50) break;
      const method = dv.getUint16(p + 10, true);
      const comp = dv.getUint32(p + 20, true);
      const nameLen = dv.getUint16(p + 28, true);
      const extraLen = dv.getUint16(p + 30, true);
      const commentLen = dv.getUint16(p + 32, true);
      const localOff = dv.getUint32(p + 42, true);
      const name = dec.decode(u.subarray(p + 46, p + 46 + nameLen));
      const localNameLen = dv.getUint16(localOff + 26, true);
      const localExtra = dv.getUint16(localOff + 28, true);
      const dataStart = localOff + 30 + localNameLen + localExtra;
      const slice = u.subarray(dataStart, dataStart + comp);
      let data = slice;
      if (method === 8) data = await this.inflateRaw(slice);
      else if (method !== 0) {
        p += 46 + nameLen + extraLen + commentLen;
        continue;
      }
      files[name] = dec.decode(data);
      p += 46 + nameLen + extraLen + commentLen;
    }
    return files;
  },

  xmlUnesc(s) {
    return String(s || '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
      .replace(/&amp;/g, '&');
  },

  sharedStringsFromXml(xml) {
    const out = [];
    const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
    let m;
    while ((m = siRe.exec(xml))) {
      const texts = [];
      const tRe = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
      let t;
      while ((t = tRe.exec(m[1]))) texts.push(this.xmlUnesc(t[1]));
      out.push(texts.join(''));
    }
    return out;
  },

  cellValuesFromSheet(xml, sst) {
    const values = [];
    const cRe = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
    let m;
    while ((m = cRe.exec(xml))) {
      const attrs = m[1];
      const body = m[2];
      const tm = /(?:\s|^)t="([^"]+)"/.exec(attrs);
      const typ = tm ? tm[1] : 'n';
      let val = '';
      if (typ === 's') {
        const v = /<v>([\s\S]*?)<\/v>/.exec(body);
        val = sst[Number(v && v[1])] || '';
      } else if (typ === 'inlineStr' || typ === 'str') {
        const t2 = /<t\b[^>]*>([\s\S]*?)<\/t>/.exec(body) || /<v>([\s\S]*?)<\/v>/.exec(body);
        val = t2 ? this.xmlUnesc(t2[1]) : '';
      } else {
        const v = /<v>([\s\S]*?)<\/v>/.exec(body);
        val = v ? v[1] : '';
      }
      if (val !== '' && val != null) values.push(val);
    }
    return values;
  },

  async dnisFromXlsx(buf) {
    const files = await this.unzipXlsx(buf);
    const sst = this.sharedStringsFromXml(files['xl/sharedStrings.xml'] || '');
    const values = [];
    Object.keys(files).forEach((name) => {
      if (!/^xl\/worksheets\/sheet\d+\.xml$/i.test(name)) return;
      this.cellValuesFromSheet(files[name], sst).forEach((v) => values.push(v));
    });
    return this.dnisFromText(values.join('\n'));
  },

  dnisFromLooseBytes(u8) {
    const latin = new TextDecoder('latin1').decode(u8);
    let utf16 = '';
    for (let i = 0; i + 1 < u8.length; i += 2) {
      const c = u8[i] | (u8[i + 1] << 8);
      utf16 += c >= 32 && c < 127 ? String.fromCharCode(c) : ' ';
    }
    return this.dnisFromText(latin + '\n' + utf16);
  },

  async readListaDni(file) {
    if (!file) return [];
    const name = String(file.name || '').toLowerCase();
    const buf = await file.arrayBuffer();
    const u8 = new Uint8Array(buf);
    if (name.endsWith('.csv') || name.endsWith('.txt')) {
      return this.dnisFromText(new TextDecoder().decode(u8));
    }
    const isZip = u8.length > 4 && u8[0] === 0x50 && u8[1] === 0x4b;
    if (name.endsWith('.xlsx') || isZip) {
      return this.dnisFromXlsx(buf);
    }
    return this.dnisFromLooseBytes(u8);
  },

  jefePreferido(serie, preferIso) {
    const days = Array.isArray(serie) ? serie : [];
    const want = preferIso || '2026-09-21';
    const label = (d) => {
      if (!d || !d.supervisor) return '';
      return d.supervisor + (d.lic ? ' · ' + d.lic : '');
    };
    const exact = days.find((d) => d.fecha === want);
    if (exact && exact.supervisor) {
      return { label: label(exact), nombre: exact.supervisor, lic: exact.lic || '', fecha: want };
    }
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i] && days[i].supervisor) {
        return {
          label: label(days[i]),
          nombre: days[i].supervisor,
          lic: days[i].lic || '',
          fecha: days[i].fecha
        };
      }
    }
    return { label: '—', nombre: '', lic: '', fecha: '' };
  },

  evaluarApto(dniRaw) {
    const umbral = this.umbralApto;
    const dniIn = this.normDni(dniRaw);
    let person = this.find(dniIn);
    if (!person && dniIn && dniIn.length < 8) person = this.find(dniIn.padStart(8, '0'));
    if (!person) {
      return {
        dni: dniIn,
        nombre: dniIn,
        sinData: true,
        apto: false,
        decision: 'SIN DATA',
        motivo: 'No aparece en el historial fijo',
        promedio: 0,
        bajando: false,
        bajada: '—',
        diasOk: 0,
        diasBajo: 0,
        diasFalto: 0,
        serie: (this.dias || []).map((fecha) => ({
          fecha: fecha,
          label: this.fmtFecha(fecha),
          estado: 'sin-data',
          jarras: 0
        })),
        jefe: '—'
      };
    }
    const st = this.stats(person);
    const worked = (st.serie || []).filter((d) => d.estado === 'ok');
    const diasOk = worked.length;
    const promedio = st.promedio || 0;
    const diasBajo = worked.filter((d) => (Number(d.jarras) || 0) < umbral).length;
    const tend = { bajando: !!st.bajando, label: st.bajada || '—' };
    let decision = 'APTO';
    let apto = true;
    let motivo = tend.label + ' · puede seguir';
    if (!diasOk) {
      decision = 'SIN DATA';
      apto = false;
      motivo = 'Sin días trabajados en el historial';
    } else if (tend.bajando) {
      decision = 'NO APTO';
      apto = false;
      motivo = 'La tendencia baja desde el 7/09 · conviene acompañar';
    }
    return {
      dni: st.dni,
      nombre: this.nombreLimpio(st.nombre, st.dni),
      sinData: decision === 'SIN DATA',
      apto: apto,
      decision: decision,
      motivo: motivo,
      promedio: promedio,
      bajando: tend.bajando,
      bajada: tend.label,
      diasOk: diasOk,
      diasBajo: diasBajo,
      diasFalto: st.diasFalto,
      serie: st.serie,
      jefe: this.jefePreferido(st.serie).label
    };
  },

  evaluarLista(dnis) {
    const seen = Object.create(null);
    const rows = [];
    (dnis || []).forEach((raw) => {
      const d = this.normDni(raw);
      if (!d || seen[d]) return;
      seen[d] = 1;
      rows.push(this.evaluarApto(d));
    });
    return rows;
  },

  /** Filas sueltas del Excel → índice por DNI */
  ingest(rows) {
    const by = Object.create(null);
    const daySet = {};
    (rows || []).forEach((r) => {
      const dni = this.normDni(r.dni || r.ci);
      const fecha = String(r.fecha || '').trim();
      if (!dni || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return;
      daySet[fecha] = 1;
      if (!by[dni]) {
        by[dni] = {
          dni: dni,
          nombre: String(r.nombre || '').trim(),
          dias: Object.create(null)
        };
      }
      if (r.nombre && !by[dni].nombre) by[dni].nombre = String(r.nombre).trim();
      const estado = String(r.estado || 'ok').toLowerCase();
      by[dni].dias[fecha] = {
        estado: estado === 'f' || estado === 'falta' ? 'falta' : estado === 'p' || estado === 'permiso' ? 'permiso' : 'ok',
        supervisor: String(r.supervisor || r.jefe || '').trim(),
        lic: String(r.lic || r.grupo || '').trim(),
        jarras: Number(r.jarras || r.c || 0) || 0
      };
    });
    this.byDni = by;
    this.dias = Object.keys(daySet).sort();
    let maxW = 0;
    this.dias.forEach((f) => {
      const w = this.isoWeek(f);
      if (w > maxW) maxW = w;
    });
    this.ultimaSemanaCargada = maxW;
  }
};

if (QB.historial.boot) QB.historial.boot();
