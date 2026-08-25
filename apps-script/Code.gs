/**
 * Q Berries · Rendimientos Licapa — API rápida
 *
 * GET ?action=todo     → todo el día (KPIs + data por CI)
 * GET ?action=ping     → health
 * GET ?action=dashboard → alias de todo
 *
 * Identidad = columna CI (nunca DNI).
 * Cache servidor ~90s (si el JSON cabe).
 * Deploy: Web App → Anyone / Execute as Me — SIN token.
 */

var TZ = 'America/Lima';
var CACHE_TTL = 90;

function doGet(e) {
  return responder_(procesar_(e, 'GET'));
}
function doPost(e) {
  return responder_(procesar_(e, 'POST'));
}

function procesar_(e, metodo) {
  try {
    e = e || {};
    var p = Object.assign({}, e.parameter || {}, parseBody_(e));
    var action = String(p.action || 'todo').toLowerCase();

    if (action === 'ping' || action === 'health') {
      return {
        ok: true,
        message: 'pong',
        api: 'produccion',
        hoy: hoy_(),
        tz: TZ,
        now: Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss')
      };
    }

    if (action === 'todo' || action === 'dashboard' || action === 'snapshot' || action === '') {
      return todo_(p);
    }

    // compat mínima
    if (action === 'listarhojas') {
      var pack = todo_(p);
      return {
        ok: true,
        action: 'listarHojas',
        hojas: pack.hojas || [],
        hoy: pack.hoy || '',
        ayer: pack.ayer || '',
        actualizado: pack.actualizado || '',
        count: (pack.hojas && pack.hojas.length) || 0
      };
    }

    return todo_(p);
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  }
}

/**
 * GET único y rápido — una lectura + agrega por CI.
 * Cache ~90s por fecha.
 */
function todo_(p) {
  p = p || {};
  var fechaWant = String(p.fecha || '').trim();
  var cacheKey = 'todo_v1_' + (fechaWant || 'auto');

  var cache = CacheService.getScriptCache();
  try {
    var hit = cache.get(cacheKey);
    if (hit) {
      var parsed = JSON.parse(hit);
      if (parsed && parsed.ok) {
        parsed.fromCache = true;
        return parsed;
      }
    }
  } catch (e) { /* sin cache */ }

  var sh = pickSheet_();
  if (!sh) return empty_('SIN_HOJA');

  var values = sh.getDataRange().getValues();
  if (!values || values.length < 2) return empty_('SIN_FILAS');

  var headers = values[0];
  var iCI = col_(headers, 'CI');
  var iC = col_(headers, 'C');
  var iFP = col_(headers, 'FP');
  var iF = col_(headers, 'F');
  var iNom = col_(headers, 'Nombre');
  var iApe = col_(headers, 'Apellido');
  var iGrupo = col_(headers, 'Grupo');
  var iVar = col_(headers, 'Variedad');
  var iFecha = col_(headers, 'Fecha');
  var iLote = col_(headers, 'Lote');
  var iHuerto = col_(headers, 'Huerto');

  if (iCI < 0) return empty_('FALTA_COLUMNA_CI');
  if (iC < 0 && iFP < 0) return empty_('FALTAN_COLUMNAS_C_O_FP');

  var sheetFecha = parseSheetFecha_(sh.getName());
  var fechaCounts = {};
  var r, iso;

  if (sheetFecha) {
    fechaCounts[sheetFecha] = values.length - 1;
  } else if (iFecha >= 0) {
    for (r = 1; r < values.length; r++) {
      iso = fechaIso_(values[r][iFecha]);
      if (iso) fechaCounts[iso] = (fechaCounts[iso] || 0) + 1;
    }
  } else {
    fechaCounts[hoy_()] = values.length - 1;
  }

  var fechasOrd = Object.keys(fechaCounts).sort().reverse();
  var fechaHoy = fechaWant || fechasOrd[0] || hoy_();
  var fechaAyer = fechasOrd[1] || ayer_();

  var byWorker = {};
  var byGrupo = {};
  var byVariedad = {};
  var byFecha = {};
  var byModulo = {};
  var byTurno = {};
  var totalC = 0;
  var totalFilas = 0;
  var workersSet = {};

  for (r = 1; r < values.length; r++) {
    var row = values[r];
    var rowFecha = sheetFecha ? sheetFecha : iFecha >= 0 ? fechaIso_(row[iFecha]) : fechaHoy;
    if (rowFecha !== fechaHoy) continue;

    var ci = cellCi_(row[iCI]);
    if (!ci) continue;

    var c = cellCajas_(row, iC, iFP, iF);
    var grupo = iGrupo >= 0 ? String(row[iGrupo] || '').trim() : '';
    var variedad = iVar >= 0 ? String(row[iVar] || '').trim() : '';
    var nombre = iNom >= 0 ? String(row[iNom] || '').trim() : '';
    var apellido = iApe >= 0 ? String(row[iApe] || '').trim() : '';

    if (!byWorker[ci]) {
      byWorker[ci] = {
        fecha: rowFecha,
        ci: ci,
        nombre: nombre,
        apellido: apellido,
        grupo: grupo,
        variedad: variedad,
        huerto: iHuerto >= 0 ? String(row[iHuerto] || '') : '',
        c: 0,
        filas: 0,
        lotes: {},
        modulos: {},
        turnos: {}
      };
    }
    var w = byWorker[ci];
    w.c += c;
    w.filas += 1;
    if ((!w.nombre || w.nombre === 'S/N') && nombre && nombre !== 'S/N') w.nombre = nombre;
    if ((!w.apellido || w.apellido === 'S/N') && apellido && apellido !== 'S/N') w.apellido = apellido;
    if (!w.grupo && grupo) w.grupo = grupo;
    if (!w.variedad && variedad) w.variedad = variedad;

    if (iLote >= 0) {
      var lote = String(row[iLote] || '').trim();
      if (lote) {
        w.lotes[lote] = (w.lotes[lote] || 0) + c;
        var parts = parseLote_(lote);
        if (parts.modulo) {
          w.modulos[parts.modulo] = (w.modulos[parts.modulo] || 0) + c;
          byModulo[parts.modulo] = (byModulo[parts.modulo] || 0) + c;
        }
        if (parts.turno) {
          w.turnos[parts.turno] = (w.turnos[parts.turno] || 0) + c;
          byTurno[parts.turno] = (byTurno[parts.turno] || 0) + c;
        }
      }
    }

    byGrupo[grupo] = (byGrupo[grupo] || 0) + c;
    byVariedad[variedad] = (byVariedad[variedad] || 0) + c;
    byFecha[rowFecha] = (byFecha[rowFecha] || 0) + c;
    totalC += c;
    totalFilas += 1;
    workersSet[ci] = true;
  }

  var data = Object.keys(byWorker).map(function (k) {
    var w = byWorker[k];
    var lotesArr = Object.keys(w.lotes)
      .map(function (l) {
        return { lote: l, c: w.lotes[l] };
      })
      .sort(function (a, b) {
        return b.c - a.c;
      })
      .slice(0, 8);
    var topMod =
      Object.keys(w.modulos).sort(function (a, b) {
        return w.modulos[b] - w.modulos[a];
      })[0] || '';
    var topTur =
      Object.keys(w.turnos).sort(function (a, b) {
        return w.turnos[b] - w.turnos[a];
      })[0] || '';
    return {
      fecha: w.fecha,
      ci: w.ci,
      nombre: w.nombre,
      apellido: w.apellido,
      grupo: w.grupo,
      variedad: w.variedad,
      huerto: w.huerto,
      modulo: topMod,
      turno: topTur,
      c: Math.round(w.c * 100) / 100,
      filas: w.filas,
      lotes: lotesArr
    };
  }).sort(function (a, b) {
    return b.c - a.c;
  });

  var nWorkers = Object.keys(workersSet).length;
  var grupos = Object.keys(byGrupo)
    .map(function (g) {
      return { grupo: g || '(sin grupo)', c: Math.round(byGrupo[g] * 100) / 100 };
    })
    .sort(function (a, b) {
      return b.c - a.c;
    });
  var variedades = Object.keys(byVariedad)
    .map(function (v) {
      return { variedad: v || '(sin variedad)', c: Math.round(byVariedad[v] * 100) / 100 };
    })
    .sort(function (a, b) {
      return b.c - a.c;
    });

  var result = {
    ok: true,
    api: 'produccion',
    action: 'todo',
    hoy: fechaHoy,
    ayer: fechaAyer,
    hojas: fechasOrd.map(function (f) {
      return { nombre: f, fecha: f, filas: fechaCounts[f] || 0, esFecha: true };
    }),
    filtros: { fechas: [fechaHoy], grupo: '', variedad: '', q: '', ci: '' },
    kpis: {
      totalCajas: Math.round(totalC * 100) / 100,
      totalFilas: totalFilas,
      totalTrabajadores: nWorkers,
      totalGrupos: Object.keys(byGrupo).length,
      promedioCajasPorTrabajador: nWorkers ? Math.round((totalC / nWorkers) * 100) / 100 : 0,
      porFecha: Object.keys(byFecha)
        .sort()
        .map(function (f) {
          return { fecha: f, c: Math.round(byFecha[f] * 100) / 100 };
        }),
      porGrupo: grupos.slice(0, 40),
      porVariedad: variedades,
      porModulo: Object.keys(byModulo)
        .sort()
        .map(function (m) {
          return { modulo: m, c: Math.round(byModulo[m] * 100) / 100 };
        }),
      porTurno: Object.keys(byTurno)
        .sort()
        .map(function (t) {
          return { turno: t, c: Math.round(byTurno[t] * 100) / 100 };
        }),
      porModuloTurno: []
    },
    count: data.length,
    data: data,
    actualizado: Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy hh:mm:ss a'),
    tz: TZ,
    fromCache: false
  };

  try {
    cache.put(cacheKey, JSON.stringify(result), CACHE_TTL);
  } catch (e2) { /* payload grande — ok sin cache */ }

  return result;
}

function empty_(reason) {
  return {
    ok: true,
    api: 'produccion',
    action: 'todo',
    hoy: hoy_(),
    ayer: ayer_(),
    hojas: [],
    filtros: { fechas: [hoy_()], grupo: '', variedad: '', q: '', ci: '' },
    kpis: {
      totalCajas: 0,
      totalFilas: 0,
      totalTrabajadores: 0,
      totalGrupos: 0,
      promedioCajasPorTrabajador: 0,
      porFecha: [],
      porGrupo: [],
      porVariedad: [],
      porModulo: [],
      porTurno: [],
      porModuloTurno: []
    },
    count: 0,
    data: [],
    actualizado: Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy hh:mm:ss a'),
    tz: TZ,
    hint: reason || '',
    fromCache: false
  };
}

/* ── helpers ─────────────────────────────────────────── */

function pickSheet_() {
  var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  var best = null;
  var bestRows = -1;
  for (var i = 0; i < sheets.length; i++) {
    var sh = sheets[i];
    var last = sh.getLastRow();
    if (last < 2) continue;
    var headers = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0];
    if (col_(headers, 'CI') < 0) continue;
    if (col_(headers, 'C') < 0 && col_(headers, 'FP') < 0) continue;
    if (last > bestRows) {
      best = sh;
      bestRows = last;
    }
  }
  return best || sheets[0] || null;
}

function col_(headers, name) {
  var want = String(name).toLowerCase();
  for (var i = 0; i < headers.length; i++) {
    if (String(headers[i]).trim().toLowerCase() === want) return i;
  }
  return -1;
}

function cellCi_(v) {
  if (v == null || v === '') return '';
  if (typeof v === 'number') return String(Math.round(v));
  var s = String(v).replace(/\.0$/, '').trim();
  var m = s.match(/(\d{6,})/);
  return m ? m[1] : s.replace(/\D/g, '') || s;
}

function cellNum_(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  var n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

/** C → FP → 1 si F=Caja */
function cellCajas_(row, iC, iFP, iF) {
  var c = iC >= 0 ? cellNum_(row[iC]) : 0;
  if (c > 0) return c;
  var fp = iFP >= 0 ? cellNum_(row[iFP]) : 0;
  if (fp > 0) return fp;
  var f = iF >= 0 ? String(row[iF] || '').toLowerCase() : '';
  if (f.indexOf('caja') >= 0 || f.indexOf('jarra') >= 0) return 1;
  return 0;
}

function fechaIso_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) {
    return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  }
  if (typeof v === 'number' && v > 20000) {
    var epoch = new Date(Date.UTC(1899, 11, 30));
    var d = new Date(epoch.getTime() + v * 86400000);
    return Utilities.formatDate(d, TZ, 'yyyy-MM-dd');
  }
  var s = String(v || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  var m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (m) {
    return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  }
  return '';
}

function parseSheetFecha_(name) {
  name = String(name || '').trim();
  var m = name.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return m[0];
  m = name.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  }
  return null;
}

function parseLote_(lote) {
  lote = String(lote || '').trim();
  var m = lote.match(/L(\d+)\s*-\s*T(\d+)\s*-\s*M(\d+)/i);
  if (m) return { turno: 'T' + m[2], modulo: 'M' + m[3] };
  m = lote.match(/T(\d+).*M(\d+)/i);
  if (m) return { turno: 'T' + m[1], modulo: 'M' + m[2] };
  return { turno: '', modulo: '' };
}

function hoy_() {
  return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
}
function ayer_() {
  var d = new Date();
  d.setDate(d.getDate() - 1);
  return Utilities.formatDate(d, TZ, 'yyyy-MM-dd');
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  try {
    return JSON.parse(e.postData.contents) || {};
  } catch (err) {
    return {};
  }
}

function responder_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
