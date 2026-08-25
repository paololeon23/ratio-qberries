/**
 * Q Berries · Rendimientos Licapa — Apps Script API
 * Spreadsheet: una hoja por fecha (nombre preferido YYYY-MM-DD o DD-MM-YYYY).
 * Columnas (fila 1), mismo layout que Produccion_Licapa:
 * Etiqueta | Huerto | Lote | H | Variedad | Grupo | DNI | CI | Apellido | Nombre | Fecha | Hora | P | T | Q | F | C | FP
 * Identidad de producción = columna CI (nunca DNI).
 *
 * Deploy: Web App → Anyone / Execute as Me
 * Secret: Script Property API_TOKEN
 */

var TZ = 'America/Lima';
var HEADER = [
  'Etiqueta','Huerto','Lote','H','Variedad','Grupo','DNI','CI','Apellido','Nombre',
  'Fecha','Hora','P','T','Q','F','C','FP'
];

function doGet(e) {
  return handle_(e);
}
function doPost(e) {
  return handle_(e);
}

function handle_(e) {
  try {
    e = e || {};
    var p = Object.assign({}, e.parameter || {}, parseBody_(e));
    if (!authOk_(p.token)) {
      return json_({ ok: false, error: 'UNAUTHORIZED' }, 401);
    }
    var action = String(p.action || 'todo');
    switch (action) {
      case 'todo':
      case 'snapshot':
        return json_(snapshotTodo_(p));
      case 'reporteProduccion':
        return json_(reporteProduccion_(p));
      case 'listarHojas':
        return json_(listarHojas_());
      case 'detalleTrabajador':
        return json_(detalleTrabajador_(p));
      case 'health':
        return json_({ ok: true, api: 'produccion', tz: TZ, now: Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss') });
      default:
        return json_(snapshotTodo_(p));
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function authOk_(token) {
  var expected = PropertiesService.getScriptProperties().getProperty('API_TOKEN') || '';
  if (!expected) return true; // allow bootstrapping; set API_TOKEN in production
  return String(token || '') === expected;
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  try {
    return JSON.parse(e.postData.contents) || {};
  } catch (err) {
    return {};
  }
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function ss_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function hoyLima_() {
  return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
}

function ayerLima_() {
  var d = new Date();
  d.setDate(d.getDate() - 1);
  return Utilities.formatDate(d, TZ, 'yyyy-MM-dd');
}

/** Normaliza nombre de hoja → yyyy-MM-dd si es fecha reconocible */
function parseSheetFecha_(name) {
  name = String(name || '').trim();
  var m = name.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return m[0];
  m = name.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    var dd = ('0' + m[1]).slice(-2);
    var mm = ('0' + m[2]).slice(-2);
    return m[3] + '-' + mm + '-' + dd;
  }
  m = name.match(/^(\d{4})[\/\.](\d{1,2})[\/\.](\d{1,2})$/);
  if (m) {
    return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  }
  return null;
}

function listarHojas_() {
  var sheets = ss_().getSheets();
  var out = [];
  var fechasFromData = {};
  sheets.forEach(function (sh) {
    var nombre = sh.getName();
    var fecha = parseSheetFecha_(nombre);
    var last = sh.getLastRow();
    out.push({
      nombre: nombre,
      fecha: fecha,
      filas: Math.max(0, last - 1),
      esFecha: !!fecha
    });
    if (!fecha && last > 1) {
      collectFechasFromSheet_(sh, fechasFromData);
    }
  });

  // Hojas virtuales por fechas halladas en columna Fecha (ej. "Hoja 1")
  Object.keys(fechasFromData).forEach(function (f) {
    out.push({
      nombre: f,
      fecha: f,
      filas: fechasFromData[f],
      esFecha: true,
      desdeColumna: true
    });
  });

  out.sort(function (a, b) {
    if (a.fecha && b.fecha) return a.fecha < b.fecha ? 1 : -1;
    if (a.fecha) return -1;
    if (b.fecha) return 1;
    return a.nombre.localeCompare(b.nombre);
  });
  var dated = out.filter(function (h) { return h.fecha; });
  return {
    ok: true,
    action: 'listarHojas',
    count: out.length,
    hojas: out,
    hoy: (dated[0] && dated[0].fecha) || hoyLima_(),
    ayer: (dated[1] && dated[1].fecha) || ayerLima_(),
    actualizado: Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy hh:mm:ss a')
  };
}

/** Escanea columna Fecha de una hoja sin nombre-fecha */
function collectFechasFromSheet_(sh, bag) {
  var values = sh.getDataRange().getValues();
  if (!values || values.length < 2) return;
  var iFecha = colIndex_(values[0], 'Fecha');
  if (iFecha < 0) return;
  for (var r = 1; r < values.length; r++) {
    var iso = cellDateIso_(values[r][iFecha]);
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) continue;
    bag[iso] = (bag[iso] || 0) + 1;
  }
}

function resolveFechas_(p) {
  var fechas = [];
  if (String(p.todas || '') === '1') {
    listarHojas_().hojas.forEach(function (h) {
      if (h.fecha) fechas.push(h.fecha);
    });
    if (!fechas.length) {
      // Sin hojas fechadas: usa todas las fechas de datos en hojas planas
      var bag = {};
      ss_().getSheets().forEach(function (sh) {
        if (!parseSheetFecha_(sh.getName())) collectFechasFromSheet_(sh, bag);
      });
      fechas = Object.keys(bag).sort().reverse();
    }
    return unique_(fechas);
  }
  if (p.fechas) {
    String(p.fechas).split(',').forEach(function (f) {
      f = String(f).trim();
      if (f) fechas.push(normalizeFecha_(f));
    });
    return unique_(fechas.filter(Boolean));
  }
  if (String(p.comparar || '') === '1') {
    var lh = listarHojas_();
    return unique_([lh.hoy, lh.ayer].filter(Boolean));
  }
  if (p.fecha) return [normalizeFecha_(p.fecha)];
  if (String(p.ayer || '') === '1') return [ayerLima_()];
  // Default: última fecha con data, no solo “hoy calendario”
  var latest = listarHojas_();
  return [latest.hoy || hoyLima_()];
}

function normalizeFecha_(f) {
  f = String(f || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(f)) return f;
  var parsed = parseSheetFecha_(f);
  return parsed || f;
}

function findSheetForFecha_(fecha) {
  var sheets = ss_().getSheets();
  var i, sh, nombre, f;
  for (i = 0; i < sheets.length; i++) {
    sh = sheets[i];
    nombre = sh.getName();
    f = parseSheetFecha_(nombre);
    if (f === fecha) return sh;
  }
  for (i = 0; i < sheets.length; i++) {
    sh = sheets[i];
    if (/licapa|produccion|cosecha/i.test(sh.getName())) return sh;
  }
  // Cualquier hoja con columna Fecha (incluye "Hoja 1")
  for (i = 0; i < sheets.length; i++) {
    sh = sheets[i];
    if (sh.getLastRow() < 2) continue;
    var headers = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0];
    if (colIndex_(headers, 'Fecha') >= 0 && colIndex_(headers, 'CI') >= 0) return sh;
  }
  return sheets[0] || null;
}

function colIndex_(headers, name) {
  var i;
  for (i = 0; i < headers.length; i++) {
    if (String(headers[i]).trim().toLowerCase() === String(name).toLowerCase()) return i;
  }
  return -1;
}

function cellDateIso_(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  }
  if (typeof v === 'number' && v > 20000) {
    var epoch = new Date(Date.UTC(1899, 11, 30));
    var d = new Date(epoch.getTime() + v * 86400000);
    return Utilities.formatDate(d, TZ, 'yyyy-MM-dd');
  }
  var s = String(v || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  var m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return s;
}

function cellCi_(v) {
  if (v == null || v === '') return '';
  if (typeof v === 'number') return String(Math.round(v));
  var s = String(v).replace(/\.0$/, '').trim();
  // "45780570 (45.780.570-E) S/N" → 45780570
  var m = s.match(/(\d{6,})/);
  if (m) return m[1];
  var digits = s.replace(/\D/g, '');
  return digits || s;
}

function cellNum_(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  var n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

/** Cajas/jarras por fila: C → FP → 1 si F=Caja */
function cellCajas_(row, iC, iFP, iF) {
  var c = iC >= 0 ? cellNum_(row[iC]) : 0;
  if (c > 0) return c;
  var fp = iFP >= 0 ? cellNum_(row[iFP]) : 0;
  if (fp > 0) return fp;
  var f = iF >= 0 ? String(row[iF] || '').toLowerCase() : '';
  if (f.indexOf('caja') >= 0 || f.indexOf('jarra') >= 0) return 1;
  return 0;
}

function parseLoteParts_(lote) {
  lote = String(lote || '').trim();
  var m = lote.match(/L(\d+)\s*-\s*T(\d+)\s*-\s*M(\d+)/i);
  if (m) {
    return { loteNum: m[1], turno: 'T' + m[2], modulo: 'M' + m[3], raw: lote };
  }
  m = lote.match(/T(\d+).*M(\d+)/i);
  if (m) {
    return { loteNum: '', turno: 'T' + m[1], modulo: 'M' + m[2], raw: lote };
  }
  return { loteNum: '', turno: '', modulo: '', raw: lote };
}

/**
 * GET único y rápido: lee el Sheet una vez y devuelve todo el día más reciente.
 * ?action=todo  (default)
 */
function snapshotTodo_(p) {
  p = p || {};
  var sh = pickBestSheet_();
  if (!sh) {
    return emptySnapshot_('SIN_HOJA');
  }

  var values = sh.getDataRange().getValues();
  if (!values || values.length < 2) {
    return emptySnapshot_('SIN_FILAS');
  }

  var headers = values[0];
  var iCI = colIndex_(headers, 'CI'); // solo CI — nunca DNI
  var iC = colIndex_(headers, 'C');
  var iNom = colIndex_(headers, 'Nombre');
  var iApe = colIndex_(headers, 'Apellido');
  var iGrupo = colIndex_(headers, 'Grupo');
  var iVar = colIndex_(headers, 'Variedad');
  var iFecha = colIndex_(headers, 'Fecha');
  var iLote = colIndex_(headers, 'Lote');
  var iHuerto = colIndex_(headers, 'Huerto');
  var iFP = colIndex_(headers, 'FP');
  var iF = colIndex_(headers, 'F');
  if (iCI < 0) {
    return emptySnapshot_('FALTA_COLUMNA_CI');
  }
  if (iC < 0 && iFP < 0) {
    return emptySnapshot_('FALTAN_COLUMNAS_C_O_FP');
  }

  var sheetFecha = parseSheetFecha_(sh.getName());
  var fechaCounts = {};
  var r, row, iso;

  // 1) descubrir fecha más reciente en los datos
  if (sheetFecha) {
    fechaCounts[sheetFecha] = values.length - 1;
  } else if (iFecha >= 0) {
    for (r = 1; r < values.length; r++) {
      iso = cellDateIso_(values[r][iFecha]);
      if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
        fechaCounts[iso] = (fechaCounts[iso] || 0) + 1;
      }
    }
  } else {
    iso = hoyLima_();
    fechaCounts[iso] = values.length - 1;
  }

  var fechasOrd = Object.keys(fechaCounts).sort().reverse();
  var fechaHoy = String(p.fecha || '').trim() || fechasOrd[0] || hoyLima_();
  var fechaAyer = fechasOrd[1] || ayerLima_();

  // 2) agregar solo esa fecha (una pasada)
  var byWorker = {};
  var byGrupo = {};
  var byVariedad = {};
  var byFecha = {};
  var byModulo = {};
  var byTurno = {};
  var byModuloTurno = {};
  var totalC = 0;
  var totalFilas = 0;
  var workersSet = {};

  for (r = 1; r < values.length; r++) {
    row = values[r];
    var rowFecha = sheetFecha
      ? sheetFecha
      : iFecha >= 0
        ? cellDateIso_(row[iFecha])
        : fechaHoy;
    if (rowFecha !== fechaHoy) continue;

    var ci = cellCi_(row[iCI]);
    if (!ci) continue;
    var grupo = iGrupo >= 0 ? String(row[iGrupo] || '').trim() : '';
    var variedad = iVar >= 0 ? String(row[iVar] || '').trim() : '';
    var nombre = iNom >= 0 ? String(row[iNom] || '').trim() : '';
    var apellido = iApe >= 0 ? String(row[iApe] || '').trim() : '';
    var c = cellCajas_(row, iC, iFP, iF);

    var key = ci;
    if (!byWorker[key]) {
      byWorker[key] = {
        fecha: rowFecha,
        ci: ci,
        nombre: nombre,
        apellido: apellido,
        grupo: grupo,
        variedad: variedad,
        c: 0,
        filas: 0,
        lotes: {},
        modulos: {},
        turnos: {},
        huerto: iHuerto >= 0 ? String(row[iHuerto] || '') : ''
      };
    }
    var w = byWorker[key];
    w.c += c;
    w.filas += 1;
    if ((!w.nombre || w.nombre === 'S/N') && nombre && nombre !== 'S/N') w.nombre = nombre;
    if ((!w.apellido || w.apellido.charAt(0) === '(') && apellido && apellido.charAt(0) !== '(') {
      w.apellido = apellido;
    }
    if (!w.grupo && grupo) w.grupo = grupo;
    if (!w.variedad && variedad) w.variedad = variedad;

    if (iLote >= 0) {
      var lote = String(row[iLote] || '');
      if (lote) {
        w.lotes[lote] = (w.lotes[lote] || 0) + c;
        var parts = parseLoteParts_(lote);
        if (parts.modulo) {
          w.modulos[parts.modulo] = (w.modulos[parts.modulo] || 0) + c;
          byModulo[parts.modulo] = (byModulo[parts.modulo] || 0) + c;
        }
        if (parts.turno) {
          w.turnos[parts.turno] = (w.turnos[parts.turno] || 0) + c;
          byTurno[parts.turno] = (byTurno[parts.turno] || 0) + c;
        }
        if (parts.modulo && parts.turno) {
          var mt = parts.modulo + '|' + parts.turno;
          byModuloTurno[mt] = (byModuloTurno[mt] || 0) + c;
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

  var data = Object.keys(byWorker)
    .map(function (k) {
      var w = byWorker[k];
      var lotesArr = Object.keys(w.lotes)
        .map(function (l) {
          return { lote: l, c: w.lotes[l] };
        })
        .sort(function (a, b) {
          return b.c - a.c;
        });
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
        lotes: lotesArr.slice(0, 12)
      };
    })
    .sort(function (a, b) {
      return b.c - a.c;
    });

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

  var actualizado = Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy hh:mm:ss a');
  var hojas = fechasOrd.map(function (f) {
    return { nombre: f, fecha: f, filas: fechaCounts[f] || 0, esFecha: true };
  });

  return {
    ok: true,
    api: 'produccion',
    action: 'todo',
    hoy: fechaHoy,
    ayer: fechaAyer,
    hojas: hojas,
    filtros: { fechas: [fechaHoy], grupo: '', variedad: '', q: '', ci: '' },
    kpis: {
      totalCajas: Math.round(totalC * 100) / 100,
      totalFilas: totalFilas,
      totalTrabajadores: Object.keys(workersSet).length,
      totalGrupos: Object.keys(byGrupo).length,
      promedioCajasPorTrabajador: Object.keys(workersSet).length
        ? Math.round((totalC / Object.keys(workersSet).length) * 100) / 100
        : 0,
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
        .sort(function (a, b) {
          return parseInt(a.replace(/\D/g, ''), 10) - parseInt(b.replace(/\D/g, ''), 10);
        })
        .map(function (t) {
          return { turno: t, c: Math.round(byTurno[t] * 100) / 100 };
        }),
      porModuloTurno: Object.keys(byModuloTurno).map(function (k) {
        var bits = k.split('|');
        return { modulo: bits[0], turno: bits[1], c: Math.round(byModuloTurno[k] * 100) / 100 };
      })
    },
    count: data.length,
    data: data,
    actualizado: actualizado,
    tz: TZ
  };
}

function pickBestSheet_() {
  var sheets = ss_().getSheets();
  var i, sh, headers, last, best = null, bestRows = -1;
  for (i = 0; i < sheets.length; i++) {
    sh = sheets[i];
    last = sh.getLastRow();
    if (last < 2) continue;
    headers = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0];
    var hasCi = colIndex_(headers, 'CI') >= 0; // CI ≠ DNI
    var hasC = colIndex_(headers, 'C') >= 0 || colIndex_(headers, 'FP') >= 0;
    if (hasCi && hasC && last > bestRows) {
      best = sh;
      bestRows = last;
    }
  }
  return best || sheets[0] || null;
}

function emptySnapshot_(reason) {
  return {
    ok: true,
    api: 'produccion',
    action: 'todo',
    hoy: hoyLima_(),
    ayer: ayerLima_(),
    hojas: [],
    filtros: { fechas: [hoyLima_()], grupo: '', variedad: '', q: '', ci: '' },
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
    hint: reason || ''
  };
}

/**
 * GET preciso: agrega Suma de C por trabajador (CI) + filtros.
 * Params:
 *   fecha | fechas=YYYY-MM-DD,YYYY-MM-DD | comparar=1 | ayer=1 | todas=1
 *   grupo, variedad, q, ci
 *   limit, offset, soloKpis=1, porGrupo=1, top=N
 */
function reporteProduccion_(p) {
  var fechas = resolveFechas_(p);
  var filtroGrupo = String(p.grupo || '').trim();
  var filtroVar = String(p.variedad || '').trim();
  var filtroQ = String(p.q || '').trim().toLowerCase();
  var filtroCi = cellCi_(p.ci);
  var limit = p.limit != null ? parseInt(p.limit, 10) : 500;
  var offset = p.offset != null ? parseInt(p.offset, 10) : 0;
  var soloKpis = String(p.soloKpis || '') === '1';
  var top = p.top != null ? parseInt(p.top, 10) : 0;

  var byWorker = {}; // key fecha|ci
  var byGrupo = {};
  var byVariedad = {};
  var byFecha = {};
  var byModulo = {};
  var byTurno = {};
  var byModuloTurno = {}; // modulo|turno
  var totalC = 0;
  var totalFilas = 0;
  var workersSet = {};

  fechas.forEach(function (fecha) {
    var sh = findSheetForFecha_(fecha);
    if (!sh) return;
    var values = sh.getDataRange().getValues();
    if (!values || values.length < 2) return;
    var headers = values[0];
    var iCI = colIndex_(headers, 'CI');
    var iNom = colIndex_(headers, 'Nombre');
    var iApe = colIndex_(headers, 'Apellido');
    var iGrupo = colIndex_(headers, 'Grupo');
    var iVar = colIndex_(headers, 'Variedad');
    var iFecha = colIndex_(headers, 'Fecha');
    var iC = colIndex_(headers, 'C');
    var iFP = colIndex_(headers, 'FP');
    var iF = colIndex_(headers, 'F');
    var iLote = colIndex_(headers, 'Lote');
    var iHuerto = colIndex_(headers, 'Huerto');
    if (iCI < 0) return;
    if (iC < 0 && iFP < 0) return;

    var sheetIsDated = !!parseSheetFecha_(sh.getName());

    for (var r = 1; r < values.length; r++) {
      var row = values[r];
      var rowFecha = sheetIsDated ? fecha : cellDateIso_(row[iFecha]);
      if (fechas.indexOf(rowFecha) < 0 && !sheetIsDated) continue;
      if (sheetIsDated) rowFecha = fecha;

      var ci = cellCi_(row[iCI]);
      if (!ci) continue;
      var grupo = iGrupo >= 0 ? String(row[iGrupo] || '').trim() : '';
      var variedad = iVar >= 0 ? String(row[iVar] || '').trim() : '';
      var nombre = iNom >= 0 ? String(row[iNom] || '').trim() : '';
      var apellido = iApe >= 0 ? String(row[iApe] || '').trim() : '';
      var c = cellCajas_(row, iC, iFP, iF);

      if (filtroGrupo && grupo !== filtroGrupo) continue;
      if (filtroVar && variedad !== filtroVar) continue;
      if (filtroCi && ci !== filtroCi) continue;
      if (filtroQ) {
        var blob = (ci + ' ' + nombre + ' ' + apellido + ' ' + grupo + ' ' + variedad).toLowerCase();
        if (blob.indexOf(filtroQ) < 0) continue;
      }

      var key = rowFecha + '|' + ci;
      if (!byWorker[key]) {
        byWorker[key] = {
          fecha: rowFecha,
          ci: ci,
          nombre: nombre,
          apellido: apellido,
          grupo: grupo,
          variedad: variedad,
          c: 0,
          filas: 0,
          lotes: {},
          modulos: {},
          turnos: {},
          huerto: iHuerto >= 0 ? String(row[iHuerto] || '') : ''
        };
      }
      var w = byWorker[key];
      w.c += c;
      w.filas += 1;
      if ((!w.nombre || w.nombre === 'S/N') && nombre && nombre !== 'S/N') w.nombre = nombre;
      if ((!w.apellido || w.apellido.charAt(0) === '(') && apellido && apellido.charAt(0) !== '(') w.apellido = apellido;
      if (!w.grupo && grupo) w.grupo = grupo;
      if (!w.variedad && variedad) w.variedad = variedad;
      if (iLote >= 0) {
        var lote = String(row[iLote] || '');
        if (lote) {
          w.lotes[lote] = (w.lotes[lote] || 0) + c;
          var parts = parseLoteParts_(lote);
          if (parts.modulo) {
            w.modulos[parts.modulo] = (w.modulos[parts.modulo] || 0) + c;
            byModulo[parts.modulo] = (byModulo[parts.modulo] || 0) + c;
          }
          if (parts.turno) {
            w.turnos[parts.turno] = (w.turnos[parts.turno] || 0) + c;
            byTurno[parts.turno] = (byTurno[parts.turno] || 0) + c;
          }
          if (parts.modulo && parts.turno) {
            var mt = parts.modulo + '|' + parts.turno;
            byModuloTurno[mt] = (byModuloTurno[mt] || 0) + c;
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
  });

  var data = Object.keys(byWorker).map(function (k) {
    var w = byWorker[k];
    var lotesArr = Object.keys(w.lotes).map(function (l) {
      return { lote: l, c: w.lotes[l] };
    }).sort(function (a, b) { return b.c - a.c; });
    var topMod = Object.keys(w.modulos).sort(function (a, b) { return w.modulos[b] - w.modulos[a]; })[0] || '';
    var topTur = Object.keys(w.turnos).sort(function (a, b) { return w.turnos[b] - w.turnos[a]; })[0] || '';
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
      lotes: lotesArr.slice(0, 12)
    };
  }).sort(function (a, b) { return b.c - a.c; });

  if (top > 0) data = data.slice(0, top);

  var count = data.length;
  var page = soloKpis ? [] : data.slice(offset, offset + (limit > 0 ? limit : data.length));

  var grupos = Object.keys(byGrupo).map(function (g) {
    return { grupo: g || '(sin grupo)', c: Math.round(byGrupo[g] * 100) / 100 };
  }).sort(function (a, b) { return b.c - a.c; });

  var variedades = Object.keys(byVariedad).map(function (v) {
    return { variedad: v || '(sin variedad)', c: Math.round(byVariedad[v] * 100) / 100 };
  }).sort(function (a, b) { return b.c - a.c; });

  var serieFechas = Object.keys(byFecha).sort().map(function (f) {
    return { fecha: f, c: Math.round(byFecha[f] * 100) / 100 };
  });

  var modulos = Object.keys(byModulo).sort().map(function (m) {
    return { modulo: m, c: Math.round(byModulo[m] * 100) / 100 };
  });
  var turnos = Object.keys(byTurno).sort(function (a, b) {
    return parseInt(a.replace(/\D/g, ''), 10) - parseInt(b.replace(/\D/g, ''), 10);
  }).map(function (t) {
    return { turno: t, c: Math.round(byTurno[t] * 100) / 100 };
  });
  var moduloTurno = Object.keys(byModuloTurno).map(function (k) {
    var bits = k.split('|');
    return { modulo: bits[0], turno: bits[1], c: Math.round(byModuloTurno[k] * 100) / 100 };
  });

  return {
    ok: true,
    api: 'produccion',
    action: 'reporteProduccion',
    filtros: {
      fechas: fechas,
      grupo: filtroGrupo,
      variedad: filtroVar,
      q: filtroQ,
      ci: filtroCi
    },
    kpis: {
      totalCajas: Math.round(totalC * 100) / 100,
      totalFilas: totalFilas,
      totalTrabajadores: Object.keys(workersSet).length,
      totalGrupos: Object.keys(byGrupo).length,
      promedioCajasPorTrabajador: Object.keys(workersSet).length
        ? Math.round((totalC / Object.keys(workersSet).length) * 100) / 100
        : 0,
      porFecha: serieFechas,
      porGrupo: grupos.slice(0, 40),
      porVariedad: variedades,
      porModulo: modulos,
      porTurno: turnos,
      porModuloTurno: moduloTurno
    },
    count: count,
    offset: offset,
    limit: limit,
    returned: page.length,
    hasMore: offset + page.length < count,
    data: page,
    actualizado: Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy hh:mm:ss a'),
    tz: TZ
  };
}

function detalleTrabajador_(p) {
  var ci = cellCi_(p.ci);
  if (!ci) return { ok: false, error: 'CI_REQUIRED' };
  var fechas = resolveFechas_(p);
  var horas = {};
  var lotes = {};
  var total = 0;
  var meta = { nombre: '', apellido: '', grupo: '', variedad: '' };

  fechas.forEach(function (fecha) {
    var sh = findSheetForFecha_(fecha);
    if (!sh) return;
    var values = sh.getDataRange().getValues();
    if (!values || values.length < 2) return;
    var headers = values[0];
    var iCI = colIndex_(headers, 'CI');
    var iNom = colIndex_(headers, 'Nombre');
    var iApe = colIndex_(headers, 'Apellido');
    var iGrupo = colIndex_(headers, 'Grupo');
    var iVar = colIndex_(headers, 'Variedad');
    var iHora = colIndex_(headers, 'Hora');
    var iC = colIndex_(headers, 'C');
    var iLote = colIndex_(headers, 'Lote');
    var sheetIsDated = !!parseSheetFecha_(sh.getName());
    var iFecha = colIndex_(headers, 'Fecha');

    for (var r = 1; r < values.length; r++) {
      var row = values[r];
      if (cellCi_(row[iCI]) !== ci) continue;
      var rowFecha = sheetIsDated ? fecha : cellDateIso_(row[iFecha]);
      if (fechas.indexOf(rowFecha) < 0 && !sheetIsDated) continue;

      var c = cellNum_(row[iC]);
      total += c;
      var hora = '';
      if (iHora >= 0) {
        var hv = row[iHora];
        if (hv instanceof Date) hora = Utilities.formatDate(hv, TZ, 'HH:00');
        else if (typeof hv === 'number' && hv < 1) {
          var mins = Math.round(hv * 24 * 60);
          var hh = Math.floor(mins / 60);
          hora = ('0' + hh).slice(-2) + ':00';
        } else {
          hora = String(hv || '').slice(0, 2) + ':00';
        }
      }
      var hk = rowFecha + ' ' + hora;
      horas[hk] = (horas[hk] || 0) + c;
      if (iLote >= 0) {
        var lote = String(row[iLote] || '');
        if (lote) lotes[lote] = (lotes[lote] || 0) + c;
      }
      if (iNom >= 0 && row[iNom]) meta.nombre = String(row[iNom]);
      if (iApe >= 0 && row[iApe]) meta.apellido = String(row[iApe]);
      if (iGrupo >= 0 && row[iGrupo]) meta.grupo = String(row[iGrupo]);
      if (iVar >= 0 && row[iVar]) meta.variedad = String(row[iVar]);
    }
  });

  return {
    ok: true,
    action: 'detalleTrabajador',
    ci: ci,
    fechas: fechas,
    meta: meta,
    totalC: Math.round(total * 100) / 100,
    porHora: Object.keys(horas).sort().map(function (k) {
      return { slot: k, c: Math.round(horas[k] * 100) / 100 };
    }),
    porLote: Object.keys(lotes).map(function (l) {
      return { lote: l, c: Math.round(lotes[l] * 100) / 100 };
    }).sort(function (a, b) { return b.c - a.c; }),
    actualizado: Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy hh:mm:ss a')
  };
}

function unique_(arr) {
  var seen = {};
  var out = [];
  arr.forEach(function (x) {
    if (!x || seen[x]) return;
    seen[x] = true;
    out.push(x);
  });
  return out;
}
