/**
 * Q Berries · Rendimientos Licapa — API rápida
 *
 * GET ?action=todo              → día más reciente (+ índice de hojas/fechas)
 * GET ?action=todo&fecha=KEY    → un día/hoja concreto (KEY = ISO o __hoja__N)
 * GET ?action=meta              → solo índice de hojas (ultra rápido, sin data)
 * GET ?action=ping              → health
 *
 * Lee TODAS las hojas con datos (Hoja 1, Hoja 2, Hoja 3…).
 * Identidad: CI (fallback DNI). Jarras: C → FP → F=Caja.
 * Cache ~120s: índice + un día por KEY (no arma todos los días en cada GET).
 */

var TZ = 'America/Lima';
var CACHE_TTL = 120;

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

    if (action === 'meta' || action === 'listarhojas') {
      return meta_(p);
    }

    if (action === 'todo' || action === 'dashboard' || action === 'snapshot' || action === '') {
      return todo_(p);
    }

    return todo_(p);
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  }
}

/** Solo índice de hojas/fechas — sin filas de trabajadores */
function meta_(p) {
  p = p || {};
  var cache = CacheService.getScriptCache();
  var stamp = bookStamp_();
  try {
    var hit = cache.get('todo_v3_meta_' + stamp);
    if (hit) {
      var parsed = JSON.parse(hit);
      if (parsed && parsed.ok) {
        parsed.fromCache = true;
        return parsed;
      }
    }
  } catch (e0) { /* rebuild */ }

  var loaded = loadAllSheets_();
  if (!loaded || !loaded.ok) {
    return {
      ok: true,
      action: 'meta',
      hoy: hoy_(),
      ayer: ayer_(),
      hojas: [],
      count: 0,
      actualizado: nowStr_(),
      tz: TZ,
      hint: loaded && loaded.hint ? loaded.hint : 'SIN_HOJA',
      fromCache: false
    };
  }

  var pack = buildMeta_(loaded);
  try {
    cache.put('todo_v3_meta_' + stamp, JSON.stringify(pack), CACHE_TTL);
    cache.put('todo_v3_stamp', stamp, CACHE_TTL);
    cache.put(
      'todo_v3_agg_' + stamp,
      JSON.stringify({
        fechaCounts: loaded.fechaCounts,
        sheetNames: loaded.sheetNames,
        sheetDisplayFechas: loaded.sheetDisplayFechas,
        byWorkerAll: loaded.agg
      }),
      CACHE_TTL
    );
  } catch (e1) { /* payload grande */ }

  delete pack._fechasOrd;
  return pack;
}

/**
 * GET principal — devuelve UN día. Cambio de fecha = otra KEY en cache.
 */
function todo_(p) {
  p = p || {};
  var fechaWant = String(p.fecha || '').trim();
  var cache = CacheService.getScriptCache();
  var stamp = bookStamp_();

  if (fechaWant) {
    try {
      var hitDay = cache.get('todo_v3_day_' + stamp + '_' + fechaWant);
      if (hitDay) {
        var parsedD = JSON.parse(hitDay);
        if (parsedD && parsedD.ok) {
          parsedD.fromCache = true;
          mergeMetaInto_(parsedD, cache, stamp);
          return parsedD;
        }
      }
    } catch (e1) { /* rebuild */ }
  } else {
    try {
      var metaHit = cache.get('todo_v3_meta_' + stamp);
      if (metaHit) {
        var metaParsed = JSON.parse(metaHit);
        if (metaParsed && metaParsed.ok && metaParsed.hoy) {
          var hitAuto = cache.get('todo_v3_day_' + stamp + '_' + metaParsed.hoy);
          if (hitAuto) {
            var parsedA = JSON.parse(hitAuto);
            if (parsedA && parsedA.ok) {
              parsedA.fromCache = true;
              parsedA.hojas = metaParsed.hojas || parsedA.hojas;
              parsedA.ayer = metaParsed.ayer || parsedA.ayer;
              return parsedA;
            }
          }
        }
      }
    } catch (e2) { /* rebuild */ }
  }

  var loaded = loadAllSheetsCached_(cache, stamp);
  if (!loaded || !loaded.ok) return empty_(loaded && loaded.hint ? loaded.hint : 'SIN_HOJA');

  var meta = buildMeta_(loaded);
  var fechasOrd = meta._fechasOrd || [];
  if (!fechasOrd.length) return empty_('SIN_FILAS');

  var fechaHoy = fechaWant || fechasOrd[0];
  if (loaded.fechaCounts[fechaHoy] == null) fechaHoy = fechasOrd[0];

  var fechaAyer = '';
  for (var i = 0; i < fechasOrd.length; i++) {
    if (fechasOrd[i] !== fechaHoy) {
      fechaAyer = fechasOrd[i];
      break;
    }
  }
  if (!fechaAyer) fechaAyer = ayer_();

  var hojas = meta.hojas;
  var built = buildDayResult_(loaded.agg, loaded.fechaCounts, fechasOrd, fechaHoy, hojas, fechaAyer);

  try {
    cache.put('todo_v3_meta_' + stamp, JSON.stringify(meta), CACHE_TTL);
    for (var fi = 0; fi < fechasOrd.length; fi++) {
      var fBuild = fechasOrd[fi];
      var ayerBuild = '';
      for (var aj = 0; aj < fechasOrd.length; aj++) {
        if (fechasOrd[aj] !== fBuild) {
          ayerBuild = fechasOrd[aj];
          break;
        }
      }
      if (!ayerBuild) ayerBuild = ayer_();
      var builtDay =
        fBuild === fechaHoy
          ? built
          : buildDayResult_(loaded.agg, loaded.fechaCounts, fechasOrd, fBuild, hojas, ayerBuild);
      try {
        cache.put('todo_v3_day_' + stamp + '_' + fBuild, JSON.stringify(builtDay), CACHE_TTL);
      } catch (e4) { /* día muy grande para cache */ }
    }
    cache.put('todo_v3_stamp', stamp, CACHE_TTL);
  } catch (e3) { /* ok */ }

  return built;
}

function loadAllSheetsCached_(cache, stamp) {
  try {
    var oldStamp = cache.get('todo_v3_stamp');
    if (oldStamp === stamp) {
      var aggHit = cache.get('todo_v3_agg_' + stamp);
      if (aggHit) {
        var agg = JSON.parse(aggHit);
        if (agg && agg.fechaCounts && agg.byWorkerAll) {
          return {
            ok: true,
            fechaCounts: agg.fechaCounts,
            sheetNames: agg.sheetNames,
            sheetDisplayFechas: agg.sheetDisplayFechas,
            agg: agg.byWorkerAll
          };
        }
      }
    }
  } catch (e0) { /* reload */ }

  var loaded = loadAllSheets_();
  if (!loaded || !loaded.ok) return loaded;

  try {
    cache.put(
      'todo_v3_agg_' + stamp,
      JSON.stringify({
        fechaCounts: loaded.fechaCounts,
        sheetNames: loaded.sheetNames,
        sheetDisplayFechas: loaded.sheetDisplayFechas,
        byWorkerAll: loaded.agg
      }),
      CACHE_TTL
    );
    cache.put('todo_v3_stamp', stamp, CACHE_TTL);
  } catch (e1) { /* ok */ }

  return loaded;
}

function buildMeta_(loaded) {
  var fechasOrd = Object.keys(loaded.fechaCounts);
  fechasOrd.sort(function (a, b) {
    var da = (loaded.sheetDisplayFechas && loaded.sheetDisplayFechas[a]) || a;
    var db = (loaded.sheetDisplayFechas && loaded.sheetDisplayFechas[b]) || b;
    if (da !== db) return db.localeCompare(da);
    return String(b).localeCompare(String(a));
  });

  var hojas = fechasOrd.map(function (f) {
    return {
      nombre: (loaded.sheetNames && loaded.sheetNames[f]) || f,
      fecha: f,
      fechaDisplay: (loaded.sheetDisplayFechas && loaded.sheetDisplayFechas[f]) || f,
      filas: loaded.fechaCounts[f] || 0,
      esFecha: String(f).indexOf('__hoja__') < 0
    };
  });

  return {
    ok: true,
    action: 'meta',
    hoy: fechasOrd[0] || hoy_(),
    ayer: fechasOrd[1] || ayer_(),
    hojas: hojas,
    count: hojas.length,
    actualizado: nowStr_(),
    tz: TZ,
    fromCache: false,
    _fechasOrd: fechasOrd
  };
}

function mergeMetaInto_(dayPack, cache, stamp) {
  try {
    var metaHit = cache.get('todo_v3_meta_' + stamp);
    if (metaHit) {
      var meta = JSON.parse(metaHit);
      if (meta && meta.hojas) {
        dayPack.hojas = meta.hojas;
        dayPack.ayer = meta.ayer || dayPack.ayer;
      }
    }
  } catch (e) { /* ok */ }
}

/** Una lectura getDataRange() por hoja · todas las hojas de producción */
function loadAllSheets_() {
  var sheets = listProdSheets_();
  if (!sheets.length) return { ok: false, hint: 'SIN_HOJA' };

  var fechaCounts = {};
  var agg = {};
  var sheetNames = {};
  var sheetDisplayFechas = {};
  var anyRows = false;

  for (var s = 0; s < sheets.length; s++) {
    var sh = sheets[s];
    var grid = sh.getDataRange().getValues();
    if (!grid || grid.length < 2) continue;

    var headers = grid[0];
    var iCI = colIdentity_(headers);
    var iC = col_(headers, 'C');
    var iFP = col_(headers, 'FP');
    var iF = col_(headers, 'F');
    var iNom = col_(headers, 'Nombre');
    var iApe = col_(headers, 'Apellido');
    var iGrupo = col_(headers, 'Grupo');
    var iVar = col_(headers, 'Variedad');
    var iFecha = col_(headers, 'Fecha');
    var iLote = colLote_(headers);
    var iHuerto = col_(headers, 'Huerto');
    if (iCI < 0) continue;

    var sheetFecha = parseSheetFecha_(sh.getName());
    var dominant = dominantFecha_(grid, iFecha);
    var displayFecha = sheetFecha || dominant || hoy_();
    var sheetKey = sheetFecha || ('__hoja__' + s);
    sheetNames[sheetKey] = sh.getName();
    sheetDisplayFechas[sheetKey] = displayFecha;

    for (var r = 1; r < grid.length; r++) {
      var row = grid[r];
      var rowFecha = sheetFecha ? sheetFecha : sheetKey;
      if (!rowFecha) continue;

      var ci = cellCi_(row[iCI]);
      if (!ci) continue;
      anyRows = true;

      fechaCounts[rowFecha] = (fechaCounts[rowFecha] || 0) + 1;

      var c = cellCajas_(row, iC, iFP, iF);
      var grupo = iGrupo >= 0 ? String(row[iGrupo] || '').trim() : '';
      var variedad = iVar >= 0 ? String(row[iVar] || '').trim() : '';
      var nombre = iNom >= 0 ? String(row[iNom] || '').trim() : '';
      var apellido = iApe >= 0 ? String(row[iApe] || '').trim() : '';
      if (isJunkName_(nombre)) nombre = '';
      if (isJunkName_(apellido)) apellido = '';
      var key = rowFecha + '|' + ci;

      if (!agg[key]) {
        agg[key] = {
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
      var w = agg[key];
      w.c += c;
      w.filas += 1;
      if (!w.nombre && nombre) w.nombre = nombre;
      if (!w.apellido && apellido) w.apellido = apellido;
      if (!w.grupo && grupo) w.grupo = grupo;
      if (!w.variedad && variedad) w.variedad = variedad;

      if (iLote >= 0) {
        var lote = String(row[iLote] || '').trim();
        if (lote) {
          w.lotes[lote] = (w.lotes[lote] || 0) + c;
          var parts = parseLote_(lote);
          if (parts.modulo) w.modulos[parts.modulo] = (w.modulos[parts.modulo] || 0) + c;
          if (parts.turno) w.turnos[parts.turno] = (w.turnos[parts.turno] || 0) + c;
        }
      }
    }
  }

  if (!anyRows) return { ok: false, hint: 'SIN_FILAS' };
  return {
    ok: true,
    fechaCounts: fechaCounts,
    agg: agg,
    sheetNames: sheetNames,
    sheetDisplayFechas: sheetDisplayFechas
  };
}

function buildDayResult_(byWorkerAll, fechaCounts, fechasOrd, fechaHoy, hojas, fechaAyer) {
  var byGrupo = {};
  var byVariedad = {};
  var byModulo = {};
  var byTurno = {};
  var totalC = 0;
  var totalFilas = 0;
  var workersSet = {};
  var data = [];
  var keys = Object.keys(byWorkerAll);

  for (var ki = 0; ki < keys.length; ki++) {
    var w = byWorkerAll[keys[ki]];
    if (w.fecha !== fechaHoy) continue;

    var lotesArr = Object.keys(w.lotes)
      .map(function (l) {
        return { lote: l, c: w.lotes[l] };
      })
      .sort(function (a, b) {
        return b.c - a.c;
      })
      .slice(0, 5);

    var modKeys = Object.keys(w.modulos);
    var topMod = '';
    if (modKeys.length) {
      topMod = modKeys.sort(function (a, b) {
        return w.modulos[b] - w.modulos[a];
      })[0];
    }
    var turKeys = Object.keys(w.turnos);
    var topTur = '';
    if (turKeys.length) {
      topTur = turKeys.sort(function (a, b) {
        return w.turnos[b] - w.turnos[a];
      })[0];
    }

    data.push({
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
    });

    byGrupo[w.grupo] = (byGrupo[w.grupo] || 0) + w.c;
    byVariedad[w.variedad] = (byVariedad[w.variedad] || 0) + w.c;
    if (topMod) byModulo[topMod] = (byModulo[topMod] || 0) + w.c;
    if (topTur) byTurno[topTur] = (byTurno[topTur] || 0) + w.c;
    totalC += w.c;
    totalFilas += w.filas;
    workersSet[w.ci] = true;
  }

  data.sort(function (a, b) {
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

  var porFechaAll = [];
  for (var fi = fechasOrd.length - 1; fi >= 0; fi--) {
    var fk = fechasOrd[fi];
    var sumC = 0;
    for (var pj = 0; pj < keys.length; pj++) {
      var ww = byWorkerAll[keys[pj]];
      if (ww.fecha === fk) sumC += ww.c;
    }
    porFechaAll.push({
      fecha: fechaLabel_(fk, hojas),
      c: Math.round(sumC * 100) / 100
    });
  }

  var porLoteMap = {};
  for (var lk = 0; lk < keys.length; lk++) {
    var wl = byWorkerAll[keys[lk]];
    if (wl.fecha !== fechaHoy) continue;
    var lotKeys = Object.keys(wl.lotes || {});
    for (var li = 0; li < lotKeys.length; li++) {
      var lt = lotKeys[li];
      porLoteMap[lt] = (porLoteMap[lt] || 0) + wl.lotes[lt];
    }
  }
  var porLote = Object.keys(porLoteMap)
    .map(function (l) {
      return { lote: l, c: Math.round(porLoteMap[l] * 100) / 100 };
    })
    .sort(function (a, b) {
      return b.c - a.c;
    })
    .slice(0, 50);

  return {
    ok: true,
    api: 'produccion',
    action: 'todo',
    hoy: fechaHoy,
    ayer: fechaAyer || (fechasOrd[1] || ayer_()),
    hojas: hojas,
    filtros: { fechas: [fechaHoy], grupo: '', variedad: '', q: '', ci: '' },
    kpis: {
      totalCajas: Math.round(totalC * 100) / 100,
      totalFilas: totalFilas,
      totalTrabajadores: nWorkers,
      totalGrupos: Object.keys(byGrupo).length,
      promedioCajasPorTrabajador: nWorkers ? Math.round((totalC / nWorkers) * 100) / 100 : 0,
      porFecha: porFechaAll,
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
      porModuloTurno: [],
      porLote: porLote
    },
    count: data.length,
    data: data,
    actualizado: nowStr_(),
    tz: TZ,
    fromCache: false
  };
}

function fechaLabel_(key, hojas) {
  for (var i = 0; i < (hojas || []).length; i++) {
    if (hojas[i].fecha === key) {
      return hojas[i].fechaDisplay || hojas[i].nombre || key;
    }
  }
  return key;
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
      porModuloTurno: [],
      porLote: []
    },
    count: 0,
    data: [],
    actualizado: nowStr_(),
    tz: TZ,
    hint: reason || '',
    fromCache: false
  };
}

/* ── helpers ─────────────────────────────────────────── */

function bookStamp_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var parts = [];
  for (var i = 0; i < sheets.length; i++) {
    var sh = sheets[i];
    parts.push(sh.getName() + ':' + sh.getLastRow() + 'x' + sh.getLastColumn());
  }
  return parts.join('|');
}

function nowStr_() {
  return Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy hh:mm:ss a');
}

/** Hoja 1, Hoja 2, Hoja 3… + cualquier hoja con CI/DNI y C/FP/F */
function listProdSheets_() {
  var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  var out = [];
  for (var i = 0; i < sheets.length; i++) {
    var sh = sheets[i];
    if (sh.getLastRow() < 2) continue;
    var headers = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0];
    if (!hasProdCols_(headers)) continue;
    out.push(sh);
  }
  return out;
}

function hasProdCols_(headers) {
  if (colIdentity_(headers) < 0) return false;
  return col_(headers, 'C') >= 0 || col_(headers, 'FP') >= 0 || col_(headers, 'F') >= 0;
}

function colIdentity_(headers) {
  var i = col_(headers, 'CI');
  if (i >= 0) return i;
  return col_(headers, 'DNI');
}

function dominantFecha_(grid, iFecha) {
  if (iFecha < 0 || !grid || grid.length < 2) return null;
  var counts = {};
  var lim = Math.min(grid.length, 500);
  for (var r = 1; r < lim; r++) {
    var f = fechaIso_(grid[r][iFecha]);
    if (!f) continue;
    counts[f] = (counts[f] || 0) + 1;
  }
  var best = null;
  var bestN = 0;
  var keys = Object.keys(counts);
  for (var i = 0; i < keys.length; i++) {
    if (counts[keys[i]] > bestN) {
      bestN = counts[keys[i]];
      best = keys[i];
    }
  }
  return best;
}

function col_(headers, name) {
  var want = String(name).toLowerCase();
  for (var i = 0; i < headers.length; i++) {
    if (String(headers[i]).trim().toLowerCase() === want) return i;
  }
  return -1;
}

function colLote_(headers) {
  var tries = ['Lote', 'LOT', 'Lote cosecha', 'LOTE', 'Codigo Lote', 'Código Lote', 'Cod Lote'];
  for (var t = 0; t < tries.length; t++) {
    var idx = col_(headers, tries[t]);
    if (idx >= 0) return idx;
  }
  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i] || '').trim().toLowerCase();
    if (h === 'lote' || h.indexOf('lote') >= 0) return i;
  }
  return -1;
}

function cellCi_(v) {
  if (v == null || v === '') return '';
  var digits = '';
  if (typeof v === 'number') {
    digits = String(Math.round(v));
  } else {
    var s = String(v).replace(/\.0$/, '').trim();
    var paren = s.match(/\(([^)]+)\)/);
    if (paren) s = paren[1];
    digits = String(s).replace(/\D/g, '');
    if (!digits) {
      var m = String(v).match(/(\d{6,})/);
      digits = m ? m[1] : '';
    }
  }
  if (!digits) return '';
  while (digits.length < 8) digits = '0' + digits;
  return digits.substring(0, 9);
}

function isJunkName_(s) {
  if (s == null) return true;
  s = String(s).trim();
  if (!s) return true;
  if (/^S\/N\b/i.test(s)) return true;
  if (s.charAt(0) === '(') return true;
  if (/^\d{1,2}([.\s]\d{3}){2}([-\s]?\w)?$/i.test(s)) return true;
  return false;
}

function cellNum_(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  var n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

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
