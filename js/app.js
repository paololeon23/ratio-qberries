/* Dashboard campo · Q Berries jarras */
(() => {
  /** Umbral “bajo rendimiento”: menos de N jarras */
  const COMPARE_LT40 = 30;
  /** Umbral alto: 58 jarras o más */
  const COMPARE_GTE58 = 58;
  /** Sekoya y el resto: 1 jarra = 1.15 kg. Magica: kg netos ÷ jarras del día (52,409.6 / 47,190). */
  const JARRA_A_KG = 1.15;
  const KG_MAGICA = 52409.6 / 47190;
  const KG_FACTORS = [1.1, 1.12, 1.14];
  let kgFactor = JARRA_A_KG;
  /** SHA-256 del acceso autorizado · nunca la clave en texto */
  const AUTH_GATE_HASH = '1bf35246e1bd473ef190016d4f5ba2ef85eb6b76d07db45134d9987a132acdca';

  const state = {
    hojas: [],
    report: null,
    merged: [],
    mergedByCi: new Map(),
    _mergedKey: '',
    sortKey: 'c',
    sortDir: -1,
    rows: [],
    workerQ: '',
    grupoQ: '',
    grupoModal: '',
    grupoWorkerQ: '',
    grupoJarFilter: 'all',
    tab: 'resumen',
    fecha: '',
    syncedAt: '',
    grupo: '',
    variedad: '',
    q: '',
    allGrupos: [],
    allVariedades: [],
    fechaOpts: [],
    compareExcluded: {},
    compareFechaCustom: false,
    comparePacks: {},
    compareLt40Q: '',
    _compareDirty: true,
    _compareLoadedSig: '',
    /** Ratios Avance: 'solo' | 'custom' | 'todas' */
    ratioMode: 'solo',
    ratioSelected: {},
    _ratioChartToken: 0,
    grupoOpts: [],
    variedadOpts: [],
    _workersDirty: true,
    _gruposDirty: true,
    _chartsTimer: 0,
    _paintKey: '',
    historialOk: false,
    historialDni: '',
    historialBloque: 'i'
  };

  const $ = (id) => document.getElementById(id);

  function fmt(n) {
    return Number(n || 0).toLocaleString('es-PE', { maximumFractionDigits: 1 });
  }

  /** YYYY-MM-DD → DD/MM/YYYY (Perú) */
  function fmtFecha(iso) {
    const s = String(iso || '').trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) return s;
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Lima' });
    }
    return s || '—';
  }

  /** Fecha legible: corta + larga para UI */
  function fmtFechaClara(iso) {
    const s = String(iso || '').trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return { short: fmtFecha(s), weekday: '', full: fmtFecha(s), line: fmtFecha(s), fullLong: fmtFecha(s) };
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0));
    const weekday = d.toLocaleDateString('es-PE', { weekday: 'short', timeZone: 'UTC' }).replace('.', '');
    const weekdayLong = d
      .toLocaleDateString('es-PE', { weekday: 'long', timeZone: 'UTC' })
      .replace('.', '');
    const monthLong = d.toLocaleDateString('es-PE', { month: 'long', timeZone: 'UTC' });
    const short = `${m[3]}/${m[2]}/${m[1]}`;
    const line = `${m[3]} de ${monthLong} de ${m[1]}`;
    const fullLong = `${weekdayLong} ${line}`;
    return {
      short,
      weekday,
      weekdayLong,
      monthLong,
      line,
      fullLong,
      full: `${weekday} · ${short}`
    };
  }

  function fechaInfoFor(key) {
    const k = String(key || '').trim();
    if (!k) return null;
    const h = (state.hojas || []).find((x) => x.fecha === k);
    const opt = (state.fechaOpts || []).find((o) => o.value === k);
    const iso = (h && h.fechaDisplay) || (opt && opt.display) || k;
    return fmtFechaClara(iso);
  }

  function fechaLabelText(key) {
    const info = fechaInfoFor(key);
    if (!info) return fmtFechaClara(key).fullLong || fmtFechaClara(key).full;
    return info.fullLong || info.full;
  }

  /** DD-MM-YYYY para leyenda de imágenes exportadas */
  function fechaLegendDdMmYyyy(key) {
    const info = fechaInfoFor(key);
    const short = (info && info.short) || fmtFecha(key);
    return String(short || '').replace(/\//g, '-') || String(key || '');
  }

  function fechaLegendSortKey(key) {
    const k = String(key || '').trim();
    const h = (state.hojas || []).find((x) => x.fecha === k);
    const opt = (state.fechaOpts || []).find((o) => o.value === k);
    const iso = (h && (h.fechaDisplay || h.fecha)) || (opt && opt.display) || k;
    const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[1] + m[2] + m[3];
    const dmy = String(iso).match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmy) {
      return dmy[3] + String(dmy[2]).padStart(2, '0') + String(dmy[1]).padStart(2, '0');
    }
    return k;
  }

  function uniqueFechas(list) {
    const seen = new Set();
    const out = [];
    for (const f of list || []) {
      const v = String(f || '').trim();
      if (!v || seen.has(v)) continue;
      seen.add(v);
      out.push(v);
    }
    return out.sort((a, b) => a.localeCompare(b));
  }

  function deltaPct(a, b) {
    if (!b) return null;
    return ((a - b) / b) * 100;
  }

  function showFileProtocolHelp() {
    var gate = document.getElementById('fileProtocolGate');
    if (gate) gate.hidden = false;
    document.body.classList.add('is-file-protocol');
  }

  function hojaNumNombre(nombre) {
    const m = String(nombre || '').match(/hoja\s*(\d+)/i);
    return m ? Number(m[1]) : -1;
  }

  function hojaNumDeFecha(key) {
    const h = (state.hojas || []).find((x) => x.fecha === key);
    if (h) return hojaNumNombre(h.nombre);
    return hojaNumNombre(key);
  }

  function hojaTope(hojas) {
    let best = null;
    let n = -1;
    (hojas || []).forEach((h) => {
      const num = hojaNumNombre(h && h.nombre);
      if (num > n) {
        n = num;
        best = h;
      }
    });
    return best;
  }

  async function boot() {
    if (location.protocol === 'file:') {
      hideLoadModal();
      document.body.classList.add('is-ready');
      showFileProtocolHelp();
      return;
    }

    bind();
    updateConnBadge();

    /* Padrón y día ya guardados. Sin red la pantalla no espera al JSON ni a Google. */
    if (QB.workers && QB.workers.hydrate) QB.workers.hydrate();

    /* Caché al toque (ya la tenemos). Última hoja se pide atrás, sin bloquear. */
    const cached = QB.api.getCachedPack ? QB.api.getCachedPack() : null;
    const cachedHoy = String((cached && cached.hoy) || '').trim();
    let painted = false;

    const extrasP = Promise.all([
      QB.workers.load(),
      QB.descartes && QB.descartes.load ? QB.descartes.load() : Promise.resolve(),
      QB.plano && QB.plano.load ? QB.plano.load() : Promise.resolve()
    ]).then(function () {
      if (QB.supervisors && QB.supervisors.enrichFromWorkers) {
        QB.supervisors.enrichFromWorkers();
      }
      if (QB.historial && QB.historial.refrescarNombres) QB.historial.refrescarNombres();
      if (state.tab === 'historial') {
        const filtro = $('historialFiltro');
        paintHistorialList(filtro ? filtro.value : '');
        if (state.historialDni) renderHistorialResult(state.historialDni);
      }
      const p = state.report || (QB.api.getCachedPack && QB.api.getCachedPack());
      if (p && (p.data || []).length) {
        applyPack(p, {
          skipPrefetch: true,
          requestedFecha: state.fecha || p.hoy || cachedHoy,
          force: true
        });
      }
    });

    if (cached && (cached.data || []).length && typeof navigator !== 'undefined' && navigator.onLine === false) {
      extrasP.catch(function () {});
      applyPack(cached, { skipPrefetch: true, requestedFecha: cachedHoy, force: true });
      painted = true;
      revealApp();
      hideSyncBanner();
    } else if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      revealApp();
      hideSyncBanner();
      QB.export.toast('Sin red · abre la app una vez con internet para guardar el día', 'warn');
    } else {
      document.body.classList.remove('is-ready');
      showLoadModal(
        'Bienvenido al programa de rendimiento de Q Berries',
        'Espera un momento, por favor.'
      );
    }

    function attachLiveWatchers() {
      if (attachLiveWatchers._done) return;
      attachLiveWatchers._done = true;
      QB.api.startDataWatch();
      window.addEventListener('qb:data-updated', (e) => {
        const detail = (e && e.detail) || {};
        const p = detail.pack || QB.api.getCachedPack();
        if (!p || !(p.data || []).length) return;
        if (detail.promote === false) {
          if (p.hojas && p.hojas.length) {
            state.hojas = p.hojas;
            state.fechaOpts = (p.hojas || [])
              .filter((h) => h.fecha)
              .map((h) => {
                const iso = toIsoDate(h.fechaDisplay) || toIsoDate(h.fecha);
                const info = iso ? fmtFechaClara(iso) : null;
                const nombre = String(h.nombre || '').trim();
                return {
                  value: h.fecha,
                  display: iso,
                  nombre: nombre,
                  label: info ? info.fullLong || info.full : nombre || h.fecha,
                  sub: h.filas ? h.filas + ' filas' : '',
                  filas: h.filas
                };
              });
            syncCompareFechaOpts();
            syncRatioFechaOpts();
          }
          QB.export.toast('Hay una hoja nueva · ábrela en la fecha', 'ok');
          return;
        }
        const numIn = hojaNumNombre(p.ultimaHoja);
        const numNow = hojaNumDeFecha(state.fecha);
        const misma = String(p.hoy || '') === String(state.fecha || '');
        if (numIn >= 0 && numNow >= 0 && numIn < numNow) return;
        if (misma && !detail.hojaNueva) return;
        applyPack(p, { requestedFecha: String(p.hoy || '').trim(), force: true });
        flashHero();
        hideSyncBanner();
        const n = (p.data && p.data.length) || 0;
        QB.export.toast(
          detail.hojaNueva ? 'Hoja nueva · ' + n + ' personas' : 'Se actualizó · ' + n + ' personas',
          'ok'
        );
      });
      window.addEventListener('qb:data-tick', (e) => {
        const detail = (e && e.detail) || {};
        if (detail.actualizado) state.syncedAt = detail.actualizado;
        updateLiveBadge();
        pulseHeroGauge();
      });
      window.addEventListener('qb:fecha-refreshed', (e) => {
        const detail = (e && e.detail) || {};
        const f = String(detail.fecha || '').trim();
        const packIn = detail.pack;
        if (!f || f !== state.fecha) return;
        paintFechaVariedad(f, packIn);
        refreshVarietyWall();
      });
    }

    attachLiveWatchers();

    try {
      const r = await QB.api.refresh({ fecha: '' });
      extrasP.catch(function () {});
      const pack = r.pack;
      const latest = String((pack && pack.hoy) || '').trim();
      if (pack && (pack.data || []).length) {
        const sameDay = painted && cachedHoy && cachedHoy === latest;
        const sameVer =
          sameDay &&
          QB.api._versionOf &&
          QB.api._versionOf(cached) === QB.api._versionOf(pack);
        const cacheNamed = (cached && cached.data || []).some(function (row) {
          return row && row.nombreCompleto;
        });
        if (!sameVer || !cacheNamed) {
          applyPack(pack, { skipPrefetch: true, requestedFecha: latest, force: true });
        }
        painted = true;
        const tope = hojaTope(pack.hojas);
        const numPack = hojaNumNombre(pack.ultimaHoja);
        const numTope = tope ? hojaNumNombre(tope.nombre) : -1;
        if (tope && numTope > numPack && tope.fecha && tope.fecha !== latest) {
          try {
            const got = await QB.api.cargarTodo({
              fecha: tope.fecha,
              allowCacheFallback: true,
              forzarRed: true
            });
            if (got && (got.data || []).length) {
              applyPack(got, { skipPrefetch: true, requestedFecha: tope.fecha, force: true });
            }
          } catch (eTop) { /* se queda la hoja que respondió el GET */ }
        }
      }
      const mostrada = String(state.fecha || latest || '').trim();
      if (painted && pack && pack.hojas && !r.error && QB.api.prefetchFechas) {
        QB.api.prefetchFechas(pack.hojas, mostrada);
      }
      revealApp();
      hideSyncBanner();
      const n = (pack && pack.data && pack.data.length) || 0;
      if (r.error === 'offline' && painted) {
        QB.export.toast('Sin red · última hoja en caché', 'warn');
      } else if (n && (!cachedHoy || cachedHoy !== latest)) {
        var hojaNom = pack.ultimaHoja || ((pack.hojas || []).find(function (h) { return h.fecha === latest; }) || {}).nombre || '';
        QB.export.toast('Última hoja' + (hojaNom ? ' · ' + hojaNom : '') + ' · ' + n + ' personas', 'ok');
      } else if (!n && !painted) {
        showHojaTardia();
        QB.export.toast('La hoja tardó demasiado · toca actualizar', 'warn');
      }
    } catch (err) {
      if (cachedHoy && painted) {
        hideSyncBanner();
        QB.export.toast('Sin red · sigues con el último guardado', 'warn');
      } else {
        hideSyncBanner();
        const fallback = QB.api.getCachedPack && QB.api.getCachedPack();
        if (fallback && (fallback.data || []).length) {
          applyPack(fallback);
          painted = true;
          revealApp();
          QB.export.toast('Sin red · sigues con el último guardado', 'warn');
        } else {
          revealApp();
          showHojaTardia();
          QB.export.toast('La hoja tardó demasiado · toca actualizar', 'warn');
        }
      }
    } finally {
      if (!document.body.classList.contains('is-ready')) revealApp();
      hideLoadModal();
      hideSyncBanner();
    }
  }

  function revealApp() {
    document.body.classList.add('is-ready');
    hideLoadModal();
    updateConnBadge();
  }

  function showHojaTardia() {
    const host = $('heroSummary');
    if (!host || (state.report && (state.report.data || []).length)) return;
    host.innerHTML =
      '<article class="hero-card hero-card--fecha-only" style="padding:1rem 1.05rem">' +
      '<p class="report-kicker" style="margin:0 0 0.35rem">La hoja no alcanzó a llegar</p>' +
      '<p class="muted" style="margin:0">Toca la flecha de actualizar. La segunda vez ya trae el día.</p>' +
      '</article>';
  }

  function showSyncBanner(text) {
    const el = $('syncBanner');
    const t = $('syncBannerText');
    if (t && text) t.textContent = text;
    if (el) {
      el.hidden = false;
      el.setAttribute('aria-busy', 'true');
    }
  }

  function hideSyncBanner() {
    stopSyncProgress(true);
    const el = $('syncBanner');
    if (el) {
      el.hidden = true;
      el.classList.remove('is-progress');
      el.setAttribute('aria-busy', 'false');
    }
  }

  const SYNC_PROGRESS_MSGS = [
    'Conectando…',
    'Descargando última fecha…',
    'Procesando registros…',
    'Armando informe…',
    'Casi listo…'
  ];

  let _syncProg = {
    timer: 0,
    msgTimer: 0,
    pct: 0,
    msgIdx: 0,
    active: false,
    hideTimer: 0
  };

  function setSyncProgressUi(pct, text) {
    const fill = $('syncProgressFill');
    const pctEl = $('syncProgressPct');
    const t = $('syncBannerText');
    const p = Math.max(0, Math.min(100, Math.round(pct)));
    if (fill) fill.style.width = p + '%';
    if (pctEl) pctEl.textContent = p + '%';
    if (t && text) t.textContent = text;
  }

  function startSyncProgress(opts) {
    opts = opts || {};
    stopSyncProgress(true);
    const el = $('syncBanner');
    const bar = $('syncProgress');
    if (!el) return;
    el.hidden = false;
    el.classList.add('is-progress');
    el.setAttribute('aria-busy', 'true');
    if (bar) bar.hidden = false;

    const msgs = opts.msgs || SYNC_PROGRESS_MSGS;
    const fast = !!opts.fast;
    _syncProg.active = true;
    _syncProg.pct = fast ? 12 : 3;
    _syncProg.msgIdx = 0;
    setSyncProgressUi(fast ? 12 : 3, opts.startText || msgs[0] + ' Aún puedes usar la app.');

    const tick = () => {
      if (!_syncProg.active) return;
      const cur = _syncProg.pct;
      let step;
      if (fast) {
        if (cur < 40) step = 14;
        else if (cur < 70) step = 8;
        else step = 2;
      } else if (cur < 25) step = 6 + Math.random() * 5;
      else if (cur < 55) step = 3.5 + Math.random() * 3;
      else if (cur < 78) step = 1.6 + Math.random() * 1.4;
      else step = 0.35 + Math.random() * 0.4;
      _syncProg.pct = Math.min(fast ? 92 : 90, cur + step);
      const msg = msgs[Math.min(_syncProg.msgIdx, msgs.length - 1)];
      setSyncProgressUi(_syncProg.pct, msg);
      const delay = fast ? 70 : cur < 40 ? 90 : cur < 70 ? 140 : 200;
      _syncProg.timer = window.setTimeout(tick, delay);
    };

    _syncProg.msgTimer = window.setInterval(() => {
      if (!_syncProg.active) return;
      if (_syncProg.msgIdx < msgs.length - 1) _syncProg.msgIdx += 1;
    }, fast ? 280 : 700);

    _syncProg.timer = window.setTimeout(tick, fast ? 30 : 50);
  }

  function finishSyncProgress(doneText) {
    if (_syncProg.hideTimer) {
      clearTimeout(_syncProg.hideTimer);
      _syncProg.hideTimer = 0;
    }
    _syncProg.active = false;
    if (_syncProg.timer) clearTimeout(_syncProg.timer);
    if (_syncProg.msgTimer) clearInterval(_syncProg.msgTimer);
    _syncProg.timer = 0;
    _syncProg.msgTimer = 0;
    _syncProg.pct = 100;

    const el = $('syncBanner');
    const bar = $('syncProgress');
    if (el) {
      el.hidden = false;
      el.classList.add('is-progress');
      el.setAttribute('aria-busy', 'false');
    }
    if (bar) bar.hidden = false;
    setSyncProgressUi(100, doneText || '100% · datos de la última fecha listos.');

    _syncProg.hideTimer = window.setTimeout(() => {
      const fill = $('syncProgressFill');
      const pctEl = $('syncProgressPct');
      if (bar) bar.hidden = true;
      if (fill) fill.style.width = '0%';
      if (pctEl) pctEl.textContent = '0%';
      if (el) {
        el.hidden = true;
        el.classList.remove('is-progress');
      }
      _syncProg.pct = 0;
      _syncProg.hideTimer = 0;
    }, 320);
  }

  function stopSyncProgress(silent) {
    _syncProg.active = false;
    if (_syncProg.timer) clearTimeout(_syncProg.timer);
    if (_syncProg.msgTimer) clearInterval(_syncProg.msgTimer);
    if (_syncProg.hideTimer) clearTimeout(_syncProg.hideTimer);
    _syncProg.timer = 0;
    _syncProg.msgTimer = 0;
    _syncProg.hideTimer = 0;
    _syncProg.pct = 0;
    const bar = $('syncProgress');
    const fill = $('syncProgressFill');
    const pctEl = $('syncProgressPct');
    const el = $('syncBanner');
    if (bar) bar.hidden = true;
    if (fill) fill.style.width = '0%';
    if (pctEl) pctEl.textContent = '0%';
    if (el) el.classList.remove('is-progress');
    if (!silent) hideSyncBanner();
  }

  function stripHiddenLicPack(pack) {
    if (!pack) return pack;
    if (!QB.supervisors || !QB.supervisors.isHiddenLic) return pack;
    const src = pack.data || [];
    const data = src.filter((r) => !QB.supervisors.isHiddenLic(r.grupo));
    const kpisIn = pack.kpis || {};
    const porGrupo = Array.isArray(kpisIn.porGrupo)
      ? kpisIn.porGrupo.filter((g) => !QB.supervisors.isHiddenLic(g.grupo))
      : kpisIn.porGrupo;
    if (data.length === src.length && porGrupo === kpisIn.porGrupo) return pack;
    const merged = mergeByWorker({ data });
    const totalCajas = merged.reduce((s, p) => s + (Number(p.c) || 0), 0);
    const kpis = Object.assign({}, kpisIn, {
      porGrupo,
      totalGrupos: Array.isArray(porGrupo) ? porGrupo.length : kpisIn.totalGrupos,
      totalTrabajadores: merged.length,
      totalCajas,
      promedioCajasPorTrabajador: merged.length ? totalCajas / merged.length : 0
    });
    return Object.assign({}, pack, { data, kpis });
  }

  function applyPack(pack, opts) {
    if (!pack) return;
    opts = opts || {};
    const requestedEarly = opts.requestedFecha ? String(opts.requestedFecha).trim() : '';
    const packFechaEarly = String(pack.hoy || '').trim();
    if (requestedEarly && packFechaEarly && requestedEarly !== packFechaEarly) return;
    if (QB.workers && QB.workers.map && QB.workers.map.size && QB.api && QB.api._enrichReport) {
      pack = QB.api._enrichReport(pack);
    }
    const counted = countUniqueWorkers(pack);
    const stamped = Number(pack.cosechadoresTotal) || 0;
    const cosechadoresTotal = Math.max(counted, stamped);
    const countedGroups = countUniqueGroups(pack);
    const stampedGroups = Number(pack.gruposTotal) || 0;
    const gruposTotal = Math.max(countedGroups, stampedGroups);
    pack = stripHiddenLicPack(pack);
    pack.cosechadoresTotal = cosechadoresTotal;
    state.cosechadoresTotal = cosechadoresTotal;
    pack.gruposTotal = gruposTotal;
    state.gruposTotal = gruposTotal;
    opts = opts || {};
    const paintKey =
      String(pack.actualizado || '') +
      '|' +
      String(pack.hoy || '') +
      '|' +
      String(pack.count || (pack.data || []).length) +
      '|' +
      String((pack.kpis && pack.kpis.totalCajas) || 0) +
      '|' +
      String(opts.requestedFecha || state.fecha || pack.hoy || '');
    if (!opts.force && state._paintKey === paintKey && state.report) return;
    state._paintKey = paintKey;
    state.syncedAt = pack.actualizado || '';
    state.hojas = pack.hojas || [];
    const fechasDisp = (pack.hojas || []).map((h) => h.fecha).filter(Boolean);
    const requested = opts.requestedFecha ? String(opts.requestedFecha).trim() : '';
    const packFecha = String(pack.hoy || '').trim();
    if (requested) {
      state.fecha = requested;
    } else {
      state.fecha = packFecha || (fechasDisp[0] || '') || state.fecha || '';
    }
    if (requested && packFecha && requested !== packFecha) {
      console.warn('[QB] Pack distinto a la fecha pedida:', requested, packFecha);
    }
    state.fechaOpts = (pack.hojas || [])
      .filter((h) => h.fecha)
      .map((h) => {
        const iso = toIsoDate(h.fechaDisplay) || toIsoDate(h.fecha);
        const info = iso ? fmtFechaClara(iso) : null;
        const nombre = String(h.nombre || '').trim();
        return {
          value: h.fecha,
          display: iso,
          nombre: nombre,
          label: info ? info.fullLong || info.full : nombre || h.fecha,
          sub: h.filas ? h.filas + ' filas' : '',
          filas: h.filas
        };
      });
    syncCompareFechaOpts();
    syncRatioFechaOpts();
    state._compareDirty = true;
    state.rows = (pack.data || []).slice();
    state.merged = mergeByWorker(pack);
    state._mergedKey = packDataKey(pack);
    state.report = pack;
    state.mergedByCi = new Map(state.merged.map((r) => [String(r.ci), r]));
    state.allGrupos = [...new Set(state.rows.map((r) => r.grupo).filter(Boolean))].sort();
    state.allVariedades = [...new Set(state.rows.map((r) => r.variedad).filter(Boolean))].sort();
    state.grupoOpts = state.allGrupos;
    state.variedadOpts = state.allVariedades;
    state._workersDirty = true;
    state._gruposDirty = true;
    if (state.fecha && pack) state.comparePacks[state.fecha] = pack;
    sortRows();

    /* Pintar todo con el pack del día activo · el historial modal no se toca */
    const histOpen = isHistorialModalOpen();
    renderHero(pack);
    const paintRest = () => {
      renderPeople(pack);
      renderGrupoMap(pack);
      state._gruposDirty = false;
      paintActiveTabHeavy();
      if (state._chartsTimer) clearTimeout(state._chartsTimer);
      scheduleCharts(pack);
      if (!histOpen) setTab(state.tab);
    };
    if (opts.fastFecha) {
      if (state._fechaPaintTimer) clearTimeout(state._fechaPaintTimer);
      state._fechaPaintTimer = setTimeout(paintRest, 0);
    } else {
      paintRest();
    }
    updateConnBadge();
    notifyHistorialFechasNuevas();
    if (histOpen) refreshHistorialFechaAlert();

    if (!opts.skipPrefetch && QB.api.prefetchFechas) {
      QB.api.prefetchFechas(pack.hojas, state.fecha);
    }
  }

  function positionFechaMenu() {
    const menu = document.getElementById('fechaDdMenu');
    const btn = document.getElementById('fechaDdBtn');
    if (!menu || !btn || menu.hidden) return;
    const narrow = window.matchMedia && window.matchMedia('(max-width: 699px)').matches;
    if (narrow) {
      clearFechaMenuPos();
      return;
    }
    const r = btn.getBoundingClientRect();
    const gap = 8;
    const vw = window.innerWidth || document.documentElement.clientWidth || 360;
    const vh = window.innerHeight || document.documentElement.clientHeight || 640;
    /* Mismo ancho que el trigger (hasta Actualizado), sin tope chico */
    const width = Math.min(Math.max(r.width, 260), vw - 16);
    let left = r.left;
    if (left + width > vw - 8) left = Math.max(8, vw - width - 8);
    if (left < 8) left = 8;

    menu.style.position = 'fixed';
    menu.style.left = Math.round(left) + 'px';
    menu.style.width = Math.round(width) + 'px';
    menu.style.right = 'auto';
    menu.style.maxWidth = Math.round(width) + 'px';
    menu.style.minWidth = '0';
    menu.style.zIndex = '5000';
    menu.style.maxHeight = '';

    menu.style.top = '0px';
    menu.style.bottom = 'auto';
    const mh = Math.min(menu.scrollHeight + 4, Math.min(vh * 0.7, 420));
    const spaceBelow = vh - r.bottom - gap - 8;
    const spaceAbove = r.top - gap - 8;
    const openUp = spaceBelow < mh && spaceAbove > spaceBelow;

    if (openUp) {
      const h = Math.min(mh, Math.max(140, spaceAbove));
      menu.style.top = 'auto';
      menu.style.bottom = Math.round(vh - r.top + gap) + 'px';
      menu.style.maxHeight = Math.round(h) + 'px';
    } else {
      const h = Math.min(mh, Math.max(140, spaceBelow));
      menu.style.top = Math.round(r.bottom + gap) + 'px';
      menu.style.bottom = 'auto';
      menu.style.maxHeight = Math.round(h) + 'px';
    }
  }

  function clearFechaMenuPos() {
    const menu = document.getElementById('fechaDdMenu');
    if (!menu) return;
    menu.style.position = '';
    menu.style.left = '';
    menu.style.right = '';
    menu.style.top = '';
    menu.style.bottom = '';
    menu.style.width = '';
    menu.style.minWidth = '';
    menu.style.maxWidth = '';
    menu.style.maxHeight = '';
    menu.style.zIndex = '';
  }

  function closeFechaMenu() {
    const menu = document.getElementById('fechaDdMenu');
    const btn = document.getElementById('fechaDdBtn');
    const root = document.getElementById('fechaDd');
    if (menu) menu.hidden = true;
    if (btn) btn.setAttribute('aria-expanded', 'false');
    if (root) root.classList.remove('is-open');
    clearFechaMenuPos();
  }

  function openFechaMenu() {
    const menu = document.getElementById('fechaDdMenu');
    const btn = document.getElementById('fechaDdBtn');
    const root = document.getElementById('fechaDd');
    if (!menu || !btn) return;
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    if (root) root.classList.add('is-open');
    menu.scrollTop = 0;
    positionFechaMenu();
    requestAnimationFrame(positionFechaMenu);
  }

  function toggleFechaMenu() {
    const menu = document.getElementById('fechaDdMenu');
    if (!menu) return;
    if (menu.hidden) openFechaMenu();
    else closeFechaMenu();
  }

  function bindHeroInteractions() {
    const heroHost = $('heroSummary');
    if (!heroHost || heroHost.dataset.heroBound) return;
    heroHost.dataset.heroBound = '1';

    heroHost.addEventListener('click', (e) => {
      const stat = e.target.closest('[data-stat-tip]');
      if (stat) {
        e.preventDefault();
        e.stopPropagation();
        openStatTipModal(stat.getAttribute('data-stat-tip'));
        return;
      }
      const kgBtn = e.target.closest('[data-kg-factor]');
      if (kgBtn) {
        e.preventDefault();
        e.stopPropagation();
        const next = Number(kgBtn.getAttribute('data-kg-factor'));
        if (!next) return;
        kgFactor = esDiaMagica() ? KG_MAGICA : next;
        const jarras = Number(kgBtn.getAttribute('data-jarras')) || 0;
        const kgEl = document.getElementById('heroKgValue');
        const kgMobile = document.querySelector('.hero-banner-mobile-only .value-kg');
        const kgTxt = fmt(jarras * kgFactor);
        if (kgEl) kgEl.textContent = kgTxt;
        if (kgMobile) kgMobile.textContent = kgTxt;
        const kgNoteFactor = document.querySelector('.hero-banner-mobile-only .metric-kg-factor');
        if (kgNoteFactor) kgNoteFactor.textContent = '× ' + fmtFactorKg(factorKgDia());
        kgBtn
          .closest('.hero-kg-factors')
          ?.querySelectorAll('[data-kg-factor]')
          .forEach((b) => {
            const on = Number(b.getAttribute('data-kg-factor')) === kgFactor;
            b.classList.toggle('is-on', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
          });
        const wrap = kgBtn.closest('.hero-side-total-item');
        if (wrap) {
          wrap.title = fmt(jarras) + ' jarras · ' + kgTxt + ' kg (× ' + kgFactor + ')';
        }
        return;
      }
      if (e.target.closest('#fechaDdBtn')) {
        e.preventDefault();
        e.stopPropagation();
        toggleFechaMenu();
        return;
      }
      const opt = e.target.closest('.fecha-dd-opt');
      if (opt && opt.dataset.value) {
        e.preventDefault();
        e.stopPropagation();
        closeFechaMenu();
        changeFecha(opt.dataset.value);
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#fechaDd')) closeFechaMenu();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeFechaMenu();
    });

    window.addEventListener(
      'resize',
      () => {
        if (document.getElementById('fechaDd')?.classList.contains('is-open')) positionFechaMenu();
      },
      { passive: true }
    );
    window.addEventListener(
      'scroll',
      () => {
        if (document.getElementById('fechaDd')?.classList.contains('is-open')) positionFechaMenu();
      },
      { passive: true, capture: true }
    );
  }

  function statTipRows(rows) {
    return (rows || [])
      .filter((r) => r && r.label)
      .map(
        (r) =>
          `<div class="stat-tip-row"><span class="stat-tip-k">${escapeHtml(r.label)}</span><strong class="stat-tip-v">${r.html != null ? r.html : escapeHtml(r.value)}</strong></div>`
      )
      .join('');
  }

  function buildStatTipModal(kind) {
    const report = state.report || {};
    const k = report.kpis || {};
    const people = peopleOf(report);
    const fecha = state.fecha ? fechaLabelText(state.fecha) : 'Sin fecha';
    const topG = (k.porGrupo || [])[0];
    const top = people[0];
    const second = people[1];
    const nPeople = people.length || k.totalTrabajadores || 0;
    const avg = k.promedioCajasPorTrabajador || (nPeople ? (k.totalCajas || 0) / nPeople : 0);
    const lt40 = people.filter((p) => {
      const c = Number(p.c || 0);
      return c > 0 && c <= COMPARE_LT40;
    }).length;
    const gt40 = people.filter((p) => Number(p.c || 0) >= COMPARE_GTE58).length;
    const top5G = (k.porGrupo || []).slice(0, 5);

    if (kind === 'people') {
      return {
        title: 'Cosechadores',
        sub: fecha,
        rows: [
          { label: 'Personas con jarras', value: fmt(state.cosechadoresTotal || nPeople) },
          { label: 'Promedio jarras / persona', value: fmt(avg) },
          { label: 'Total jarras del día', value: fmt(k.totalCajas) },
          { label: 'Hasta ' + COMPARE_LT40 + ' jarras', value: fmt(lt40) + ' personas' },
          { label: COMPARE_GTE58 + ' o más jarras', value: fmt(gt40) + ' personas' },
          { label: 'Filas registradas', value: fmt(k.totalFilas) }
        ],
        action: { tab: 'personas', label: 'Ver listado de personas' }
      };
    }

    if (kind === 'groups') {
      const listHtml =
        top5G.length
          ? `<ul class="stat-tip-list">${top5G
              .map(
                (g) =>
                  `<li><span>${escapeHtml(shortGrupo(g.grupo))}</span><strong>${fmt(g.c)} jarras</strong></li>`
              )
              .join('')}</ul>`
          : '<p class="muted">Sin grupos en este día.</p>';
      return {
        title: 'Grupos LIC',
        sub: fecha,
        rows: [
          { label: 'Grupos activos', value: fmt(state.gruposTotal || k.totalGrupos || top5G.length) },
          { label: 'Total jarras (todos)', value: fmt(k.totalCajas) }
        ],
        extra: `<div class="stat-tip-block"><p class="stat-tip-block-title">Top grupos del día</p>${listHtml}</div>`,
        action: { tab: 'grupos', label: 'Ver mapa de grupos' }
      };
    }

    if (kind === 'leader' && topG) {
      const gFull = topG.grupo || '—';
      const gShort = shortGrupo(gFull);
      const jefe = supervisorFullLabel(gFull);
      const inGrupo = people.filter((p) => String(p.grupo || '') === String(gFull)).length;
      const avgG = inGrupo ? topG.c / inGrupo : 0;
      return {
        title: 'Grupo líder',
        sub: gShort + ' · ' + fecha,
        rows: [
          { label: 'Grupo', value: gFull },
          { label: 'Supervisor', value: jefe || 'Sin supervisor en padrón' },
          { label: 'Jarras del grupo', value: fmt(topG.c) },
          { label: 'Personas en el grupo', value: fmt(inGrupo) },
          { label: 'Promedio del grupo', value: fmt(avgG) + ' jarras/persona' }
        ],
        action: { tab: 'grupos', label: 'Ver detalle del grupo' }
      };
    }

    if (kind === 'top' && top) {
      const nombre = QB.avatars.realName(top) || QB.avatars.shortName(top) || top.ci;
      const jefe = supervisorFullLabel(top.grupo);
      const diff =
        second && second.c
          ? fmt(top.c - second.c) + ' jarras sobre el 2.º (' + (QB.avatars.shortName(second) || second.ci) + ')'
          : '—';
      return {
        title: 'Mejor cosechador',
        sub: fecha,
        rows: [
          { label: 'Nombre', value: nombre },
          { label: 'CI', value: top.ci || '—' },
          { label: 'Grupo LIC', value: shortGrupo(top.grupo) },
          { label: 'Supervisor', value: jefe || '—' },
          { label: 'Jarras del día', value: fmt(top.c) },
          { label: 'Ventaja vs 2.º', value: diff },
          { label: 'Filas registradas', value: fmt(top.filas || 1) }
        ],
        action: { tab: 'personas', label: 'Ver ranking completo' }
      };
    }

    return {
      title: 'Indicador',
      sub: fecha,
      rows: [{ label: 'Sin datos', value: '—' }],
      action: null
    };
  }

  /** Encargados Magica · solo Licapa II. El nombre amarillo manda el equipo. */
  const ENCARGADOS_LICAPA_II = [
    {
      nombre: 'JHON TINEO',
      equipo: [
        'PONCE RUIZ',
        'LOPEZ ALFARO',
        'VERGARA DAVILA',
        'VALVERDE REYES',
        'NAVARRO MANTILLA',
        'SIFUENTES VIDAL',
        'NORIEGA PONTE',
        'LLAQUE ARGOMEDO',
        'VASQUEZ VALQUI'
      ]
    },
    {
      nombre: 'JAVIER PONCE',
      equipo: [
        'HUARIPATA RAMIREZ',
        'MIRANDA CULQUE',
        'ABANTO CUEVA',
        'VILLANUEVA FLORES',
        'YAHUARCANI MANIHUARI',
        'VEGA ULLOA',
        'TRUJILLO MENDOZA',
        'MALCA VALERIANO',
        'VARGAS DIAZ'
      ]
    }
  ];

  function normEncargadoNombre(s) {
    return String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function factorKgDia() {
    if (esDiaMagica()) return KG_MAGICA;
    if (!KG_FACTORS.includes(kgFactor)) return JARRA_A_KG;
    return kgFactor;
  }

  function fmtFactorKg(f) {
    const n = Number(f);
    if (!Number.isFinite(n)) return '—';
    const dec = Math.abs(n - KG_MAGICA) < 0.0001 ? 4 : 2;
    return n.toLocaleString('es-PE', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }

  function esDiaMagica() {
    const label = variedadKey(variedadLabelForFecha(state.fecha));
    if (label.indexOf('magic') >= 0) return true;
    return ((state.report && state.report.data) || []).some((r) =>
      /magic/i.test(String((r && r.variedad) || ''))
    );
  }

  function filasLicapaII(report) {
    return ((report && report.data) || []).filter((r) => {
      const h = String((r && r.huerto) || '').toLowerCase();
      const v = String((r && r.variedad) || '').toLowerCase();
      if (v && v.indexOf('magic') < 0) return false;
      return /licapa\s*(ii|2)\b/.test(h) && !/licapa\s*(iii|3)\b/.test(h);
    });
  }

  function encargadoDeSupervisor(nombre) {
    const n = normEncargadoNombre(nombre);
    if (!n) return '';
    for (let i = 0; i < ENCARGADOS_LICAPA_II.length; i++) {
      const enc = ENCARGADOS_LICAPA_II[i];
      for (let j = 0; j < enc.equipo.length; j++) {
        if (n.indexOf(enc.equipo[j]) >= 0) return enc.nombre;
      }
    }
    return '';
  }

  function buildEncargadosLicapaII() {
    const rows = filasLicapaII(state.report);
    const stats =
      QB.charts && QB.charts.buildGrupoStats ? QB.charts.buildGrupoStats(rows) : [];
    const supervisores =
      QB.charts && QB.charts.buildSupervisorStats
        ? QB.charts.buildSupervisorStats(stats)
        : [];
    const byName = {};
    ENCARGADOS_LICAPA_II.forEach((enc) => {
      byName[enc.nombre] = {
        nombre: enc.nombre,
        jarras: 0,
        personas: 0,
        equipo: []
      };
    });
    const sueltos = [];
    supervisores.forEach((s) => {
      const kg = (Number(s.c) || 0) * factorKgDia();
      const item = {
        nombre: s.nombre,
        lic: s.lic,
        jarras: Number(s.c) || 0,
        kg,
        ratio: Number(s.avg) || 0,
        personas: Number(s.n) || 0
      };
      const jefe = encargadoDeSupervisor(s.nombre);
      if (jefe && byName[jefe]) byName[jefe].equipo.push(item);
      else sueltos.push(item);
    });
    const list = ENCARGADOS_LICAPA_II.map((enc) => byName[enc.nombre]);
    if (sueltos.length) {
      list.push({ nombre: 'SIN ENCARGADO', jarras: 0, personas: 0, equipo: sueltos });
    }
    list.forEach((enc) => {
      enc.equipo.sort((a, b) => b.kg - a.kg || b.jarras - a.jarras);
      enc.jarras = enc.equipo.reduce((sum, s) => sum + s.jarras, 0);
      enc.personas = enc.equipo.reduce((sum, s) => sum + s.personas, 0);
      enc.kg = enc.jarras * factorKgDia();
      enc.ratio = enc.personas ? Math.round((enc.jarras / enc.personas) * 100) / 100 : 0;
    });
    list.sort((a, b) => b.kg - a.kg || b.jarras - a.jarras);
    return list;
  }

  function fmtKgEnc(n) {
    return Number(n || 0).toLocaleString('es-PE', { maximumFractionDigits: 1 });
  }

  function openEncargadosModal() {
    const fecha = state.fecha ? fechaLabelText(state.fecha) : 'Sin fecha';
    const list = buildEncargadosLicapaII();
    const totalKg = list.reduce((sum, enc) => sum + enc.kg, 0);
    const cards = list
      .map((enc, i) => {
        const share = totalKg > 0 ? Math.round((enc.kg / totalKg) * 1000) / 10 : 0;
        const personIco = QB.icons && QB.icons.personSoft ? QB.icons.personSoft(13) : '';
        const rows = enc.equipo.length
          ? enc.equipo
              .map((s, idx) => {
                return (
                  '<tr>' +
                  '<td>' + (idx + 1) + '</td>' +
                  '<td class="enc-name"><strong>' + escapeHtml(s.nombre) + '</strong>' +
                  '<span class="enc-lic">' + escapeHtml(s.lic || '') + '</span></td>' +
                  '<td>' + fmt(s.jarras) + '</td>' +
                  '<td class="enc-kg-cell">' + fmtKgEnc(s.kg) + '</td>' +
                  '<td class="enc-ratio">' + fmtKgEnc(s.ratio) + '</td>' +
                  '<td class="enc-pers">' + personIco + '<span>' + fmt(s.personas) + ' pers.</span></td>' +
                  '</tr>'
                );
              })
              .join('')
          : '<tr><td colspan="6" class="enc-empty">Sin producción en Licapa II</td></tr>';
        return (
          '<article class="enc-card' + (i === 0 ? ' is-lead' : '') + '">' +
          '<header class="enc-card-head">' +
          '<span class="enc-place">' + (i + 1) + '</span>' +
          '<div class="enc-id">' +
          '<h4>' + escapeHtml(enc.nombre) + '</h4>' +
          '<p>' + enc.equipo.length + ' supervisores · ' + fmt(enc.personas) + ' cosechadores</p>' +
          '</div>' +
          '<div class="enc-total">' +
          '<strong>' + fmtKgEnc(enc.kg) + '</strong>' +
          '<span>kg</span>' +
          '</div>' +
          '</header>' +
          '<div class="enc-meta">' +
          '<span>' + fmt(enc.jarras) + ' jarras</span>' +
          '<span>Ratio ' + fmtKgEnc(enc.ratio) + '</span>' +
          '<span>' + fmtKgEnc(share) + '% del kg</span>' +
          '</div>' +
          '<div class="enc-bar" aria-hidden="true"><span style="width:' + Math.max(0, Math.min(100, share)) + '%"></span></div>' +
          '<div class="enc-table-wrap">' +
          '<table class="enc-table">' +
          '<thead><tr>' +
          '<th>#</th>' +
          '<th>Supervisor</th>' +
          '<th>Jarras</th>' +
          '<th>kg</th>' +
          '<th>Ratio</th>' +
          '<th class="enc-pers-h" title="Cosechadores">' +
          (QB.icons && QB.icons.personSoft ? QB.icons.personSoft(14) : '') +
          '</th>' +
          '</tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
          '</table></div></article>'
        );
      })
      .join('');

    closeFechaMenu();
    $('modalBody').innerHTML =
      '<header class="sheet-head enc-head">' +
      '<div class="enc-head-top">' +
      '<div class="enc-head-copy">' +
      '<p class="sheet-eyebrow">Magica · Licapa II</p>' +
      '<h3 id="modalTitle">Rendimiento por encargado</h3>' +
      '</div>' +
      '<button type="button" class="enc-pdf-btn" id="btnPdfEncargados" title="Descargar PDF de encargados">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h7.2L19 8.2V20a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5H7z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M14 3.8V8h4.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8.2 13.2h7.6M8.2 16.2h5.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' +
      '<span>Exportar PDF</span>' +
      '</button>' +
      '</div>' +
      '<p class="sheet-sub">' + escapeHtml(fecha) + ' · ' + fmtKgEnc(totalKg) + ' kg en total</p>' +
      '</header>' +
      '<div class="enc-board">' + cards + '</div>' +
      '<div class="sheet-foot sheet-foot-row">' +
      '<button type="button" class="btn btn-ghost" data-close="1">Cerrar</button>' +
      '</div>';

    const root = $('modalRoot');
    const modal = root && root.querySelector('.modal');
    if (modal) {
      modal.classList.remove('is-sheet', 'is-warn-modal', 'is-stat-tip-modal');
      modal.classList.add('is-encargado-modal');
    }
    root.hidden = false;

    const pdfBtn = $('btnPdfEncargados');
    if (pdfBtn) {
      pdfBtn.addEventListener('click', () => {
        if (!QB.export || !QB.export.encargadosPdf) return;
        QB.export.encargadosPdf({
          fecha: state.fecha || '',
          fechaLabel: fecha,
          totalKg: totalKg,
          encargados: list
        });
      });
    }
  }

  function openStatTipModal(kind) {
    if (kind === 'people' && esDiaMagica()) {
      openEncargadosModal();
      return;
    }
    const tip = buildStatTipModal(kind);
    if (!tip) return;
    closeFechaMenu();

    $('modalBody').innerHTML = `
      <header class="sheet-head stat-tip-head tone-${kind || 'people'}">
        <p class="sheet-eyebrow">Detalle del indicador</p>
        <h3 id="modalTitle">${escapeHtml(tip.title)}</h3>
        <p class="sheet-sub">${escapeHtml(tip.sub || '')}</p>
      </header>
      <div class="stat-tip-body">
        <div class="stat-tip-grid">${statTipRows(tip.rows)}</div>
        ${tip.extra || ''}
      </div>
      <div class="sheet-foot sheet-foot-row">
        ${tip.action ? `<button type="button" class="btn btn-primary" id="btnStatTipGo">${escapeHtml(tip.action.label)}</button>` : ''}
        <button type="button" class="btn btn-ghost" data-close="1">Cerrar</button>
      </div>
    `;

    const root = $('modalRoot');
    const modal = root && root.querySelector('.modal');
    if (modal) {
      modal.classList.remove('is-sheet', 'is-warn-modal', 'is-encargado-modal');
      modal.classList.add('is-stat-tip-modal');
    }
    root.hidden = false;

    const go = $('btnStatTipGo');
    if (go && tip.action && tip.action.tab) {
      go.addEventListener('click', () => {
        closeModal();
        setTab(tip.action.tab);
      });
    }
  }

  let _fechaReq = 0;

  function paintFechaChoice(want) {
    const info = fechaInfoFor(want) || fmtFechaClara(want);
    const longEl = document.querySelector('#fechaDd .fecha-dd-value-long');
    const shortEl = document.querySelector('#fechaDd .fecha-dd-value-short');
    if (longEl) longEl.textContent = info.fullLong || info.full || '';
    if (shortEl) shortEl.textContent = info.full || info.short || '';
    document.querySelectorAll('.fecha-dd-opt').forEach((btn) => {
      const on = btn.getAttribute('data-value') === want;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    document.querySelectorAll('.hero-banner-eyebrow, .hero-side-kicker').forEach((el) => {
      el.textContent = (info.full || info.short || '') + ' · LICAPA';
    });
  }

  function markFechaWait(on) {
    document.querySelectorAll('.metric-panel-main, .hero-side-total').forEach((el) => {
      el.classList.toggle('is-fecha-wait', !!on);
    });
  }

  async function changeFecha(nextFecha) {
    const want = String(nextFecha || '').trim();
    if (!want || want === state.fecha) return;
    closeFechaMenu();
    const prev = state.fecha;
    const label = fechaLabelText(want);
    const mine = ++_fechaReq;

    const showReady = (pack) => {
      if (mine !== _fechaReq) return;
      hideSyncBanner();
      applyPack(pack, { requestedFecha: want, fastFecha: true, skipPrefetch: true });
      flashHero();
    };

    const instant = QB.api.getPackForFecha(want);
    if (instant && (instant.data || []).length) {
      paintFechaChoice(want);
      markFechaWait(false);
      showReady(instant);
      return;
    }

    /* El día en pantalla no cambia hasta que llegue. El aviso avisa y sigue. */
    QB.export.toast('Te avisamos cuando cargue ' + label + '. Un momento.', 'ok');

    try {
      const pack = await QB.api.cargarTodo({
        fecha: want,
        allowCacheFallback: true,
        forzarRed: true
      });
      if (mine !== _fechaReq) return;
      if (pack && (pack.data || []).length) {
        paintFechaChoice(want);
        showReady(pack);
        QB.export.toast('Ya está ' + label, 'ok');
      } else {
        QB.export.toast('Sin datos para ' + label, 'warn');
      }
    } catch (err) {
      if (mine !== _fechaReq) return;
      paintFechaChoice(prev);
      QB.export.toast('No se pudo abrir ' + label, 'warn');
    }
  }

  function variedadKey(label) {
    return String(label || '').trim().toLowerCase();
  }

  /** Magica y Sekoya Pop no entran en la misma comparación ni en el mismo ratio. */
  function mismaVariedadQueActiva(fechaKey) {
    const key = String(fechaKey || '').trim();
    if (!key || key === state.fecha) return true;
    const active = variedadKey(variedadLabelForFecha(state.fecha));
    if (!active) return true;
    const other = variedadKey(variedadLabelForFecha(key));
    if (!other) return true;
    return other === active;
  }

  function fechasMismaVariedad(list) {
    return (list || []).filter((f) => mismaVariedadQueActiva(f));
  }

  function getCompareActiveFechas() {
    return fechasMismaVariedad(
      (state.fechaOpts || [])
        .map((o) => o.value)
        .filter((f) => f && !state.compareExcluded[f])
    );
  }

  function compareActiveSig(fechas) {
    return (fechas || []).join('|');
  }

  function syncCompareFechaOpts() {
    const opts = state.fechaOpts || [];
    const known = {};
    opts.forEach((o) => {
      known[o.value] = true;
    });
    Object.keys(state.compareExcluded).forEach((f) => {
      if (!known[f]) delete state.compareExcluded[f];
    });
    Object.keys(state.comparePacks).forEach((f) => {
      if (!known[f]) delete state.comparePacks[f];
    });
    capCompareFechas();
    renderCompareSheetBar();
    updateCompareMeta();
  }

  function syncRatioFechaOpts() {
    const known = {};
    (state.fechaOpts || []).forEach((o) => {
      known[o.value] = true;
    });
    Object.keys(state.ratioSelected || {}).forEach((f) => {
      if (!known[f]) delete state.ratioSelected[f];
    });
    if (state.ratioMode === 'custom') {
      const left = Object.keys(state.ratioSelected).filter((f) => state.ratioSelected[f]);
      if (!left.length) {
        state.ratioMode = 'solo';
        state.ratioSelected = {};
      }
    }
    renderRatioSheetBar();
  }

  function getRatioFechas() {
    const opts = fechasMismaVariedad((state.fechaOpts || []).map((o) => o.value).filter(Boolean));
    if (state.ratioMode === 'todas') return opts.slice();
    if (state.ratioMode === 'custom') {
      const sel = opts.filter((f) => state.ratioSelected[f]);
      if (sel.length) return sel;
    }
    return state.fecha ? [state.fecha] : [];
  }

  function updateRatioSheetMeta() {
    const meta = $('ratioSheetMeta');
    if (!meta) return;
    const fechas = getRatioFechas();
    const total = fechasMismaVariedad((state.fechaOpts || []).map((o) => o.value).filter(Boolean)).length;
    const varLabel = variedadLabelForFecha(state.fecha);
    if (!fechas.length) {
      meta.textContent = 'Elige al menos una fecha';
      return;
    }
    const labels = fechas.map((f) => {
      const info = fechaInfoFor(f);
      return (info && info.short) || fechaLabelText(f);
    });
    if (state.ratioMode === 'solo' || fechas.length === 1) {
      meta.textContent = 'Solo ' + (labels[0] || fechas[0]) + (varLabel ? ' · ' + varLabel : '');
      return;
    }
    if (state.ratioMode === 'todas' || fechas.length === total) {
      meta.textContent =
        (varLabel ? varLabel + ' · ' : '') + 'Todas · ' + fechas.length + ' fechas unidas';
      return;
    }
    meta.textContent = fechas.length + ' de ' + total + ' · ' + labels.join(' · ');
  }

  function placeFechaMenu(root) {
    if (!root) return;
    const btn = root.querySelector('.ratio-fecha-trigger');
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 88;
    root.classList.toggle('is-up', below < 160);
  }

  function closeRatioFechaMenu() {
    const root = $('ratioFechaDd');
    const btn = $('ratioFechaBtn');
    const menu = $('ratioSheetChips');
    if (root) root.classList.remove('is-open');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    if (menu) menu.hidden = true;
  }

  function renderRatioSheetBar() {
    const host = $('ratioSheetChips');
    if (!host) return;
    const opts = (state.fechaOpts || []).filter((o) => mismaVariedadQueActiva(o.value));
    const active = new Set(getRatioFechas());
    const btnSolo = $('btnRatioSolo');
    const btnTodas = $('btnRatioTodas');
    if (btnSolo) btnSolo.classList.toggle('is-active', state.ratioMode === 'solo');
    if (btnTodas) btnTodas.classList.toggle('is-active', state.ratioMode === 'todas');

    const fechasOn = getRatioFechas();
    const valueEl = $('ratioFechaValue');
    if (valueEl) {
      if (!opts.length) valueEl.textContent = 'Sin fechas';
      else if (state.ratioMode === 'todas') valueEl.textContent = 'Todas · ' + opts.length + ' fechas';
      else if (fechasOn.length <= 1) {
        const one = opts.find((o) => o.value === fechasOn[0]) || opts[0];
        const info = one ? fmtFechaClara(one.display || one.value) : null;
        valueEl.textContent = (info && (info.short || info.full)) || 'Elige fechas';
      } else valueEl.textContent = fechasOn.length + ' fechas';
    }
    const root = $('ratioFechaDd');
    const open = !!(root && root.classList.contains('is-open'));
    const btnFecha = $('ratioFechaBtn');
    if (btnFecha) btnFecha.setAttribute('aria-expanded', open ? 'true' : 'false');

    host.hidden = !open;
    host.innerHTML = opts.length
      ? opts
          .map((o) => {
            const info = fmtFechaClara(o.display || o.value);
            const short = info.short || o.label;
            const on = active.has(o.value);
            const vari = variedadLabelForFecha(o.value);
            const sub = [info.fullLong || o.label || '', vari].filter(Boolean).join(' · ');
            return (
              '<button type="button" class="ratio-fecha-opt' +
              (on ? ' is-on' : '') +
              '" role="option" data-ratio-fecha="' +
              escapeAttr(o.value) +
              '" aria-selected="' +
              (on ? 'true' : 'false') +
              '">' +
              '<span class="ratio-fecha-mark" aria-hidden="true"></span>' +
              '<span class="ratio-fecha-opt-text">' +
              '<b>' +
              escapeHtml(short) +
              '</b>' +
              (sub ? '<small>' + escapeHtml(sub) + '</small>' : '') +
              '</span></button>'
            );
          })
          .join('')
      : '<p class="ratio-sheet-empty">Sin fechas disponibles</p>';
    updateRatioSheetMeta();
  }

  function setRatioMode(mode) {
    const m = mode === 'todas' ? 'todas' : 'solo';
    state.ratioMode = m;
    state.ratioSelected = {};
    renderRatioSheetBar();
    renderRatioChart();
  }

  function toggleRatioFecha(fecha) {
    const f = String(fecha || '').trim();
    if (!f) return;
    const opts = (state.fechaOpts || []).map((o) => o.value).filter(Boolean);
    if (!opts.includes(f)) return;

    if (state.ratioMode === 'solo') {
      if (f === state.fecha) return;
      state.ratioMode = 'custom';
      state.ratioSelected = {};
      if (state.fecha) state.ratioSelected[state.fecha] = true;
      state.ratioSelected[f] = true;
    } else if (state.ratioMode === 'todas') {
      state.ratioMode = 'custom';
      state.ratioSelected = {};
      opts.forEach((x) => {
        if (x !== f) state.ratioSelected[x] = true;
      });
    } else if (state.ratioSelected[f]) {
      delete state.ratioSelected[f];
      const left = opts.filter((x) => state.ratioSelected[x]);
      if (!left.length) {
        state.ratioMode = 'solo';
        state.ratioSelected = {};
      } else if (left.length === 1 && left[0] === state.fecha) {
        state.ratioMode = 'solo';
        state.ratioSelected = {};
      }
    } else {
      state.ratioSelected[f] = true;
      if (opts.every((x) => state.ratioSelected[x])) {
        state.ratioMode = 'todas';
        state.ratioSelected = {};
      }
    }
    renderRatioSheetBar();
    renderRatioChart();
  }

  async function ensureRatioPacks(fechas) {
    const jobs = [];
    (fechas || []).forEach((fecha) => {
      if (fecha === state.fecha && state.report && (state.report.data || []).length) {
        state.comparePacks[fecha] = state.report;
        return;
      }
      const cached = state.comparePacks[fecha];
      const cachedOk =
        cached &&
        (cached.data || []).length &&
        (!cached.hoy || String(cached.hoy) === String(fecha));
      if (cachedOk) return;
      jobs.push(
        QB.api.cargarTodo({ fecha: fecha, allowCacheFallback: true }).then((p) => {
          storeComparePack(fecha, p);
        })
      );
    });
    if (jobs.length) await Promise.all(jobs);
  }

  function storeComparePack(fecha, pack) {
    if (!pack || !(pack.data || []).length) return;
    const key = String(fecha || '').trim();
    const hoy = String(pack.hoy || '').trim();
    if (hoy && key && hoy !== key) {
      state.comparePacks[hoy] = pack;
      if (state.comparePacks[key] && String(state.comparePacks[key].hoy || '') === key) return;
      delete state.comparePacks[key];
      return;
    }
    if (key) state.comparePacks[key] = pack;
  }

  function packCoincideFecha(pack, key) {
    if (!pack || !(pack.data || []).length) return false;
    const hoy = String(pack.hoy || '').trim();
    return !hoy || hoy === String(key || '').trim();
  }

  function packForRatioFecha(f) {
    if (f === state.fecha && state.report && (state.report.data || []).length) {
      return state.report;
    }
    const pack = state.comparePacks[f];
    if (!pack || !(pack.data || []).length) return null;
    if (pack.hoy && String(pack.hoy) !== String(f)) {
      /* Pack cacheado con otra hoja: no usar para no mezclar días */
      return null;
    }
    return pack;
  }

  function buildRatioRows(fechas) {
    const out = [];
    (fechas || []).forEach((f) => {
      const pack = packForRatioFecha(f);
      if (!pack) return;
      peopleOf(pack).forEach((r) => {
        if (Number(r.c) > 0) out.push(r);
      });
    });
    return out;
  }

  async function renderRatioChart(opts) {
    const charts = QB.charts;
    if (!charts || typeof charts.renderDist !== 'function') return;
    const fechas = getRatioFechas();
    const token = ++state._ratioChartToken;
    const meta = $('ratioSheetMeta');
    if (meta && fechas.length > 1) {
      meta.textContent = 'Cargando ' + fechas.length + ' fechas…';
    }
    try {
      await ensureRatioPacks(fechas);
    } catch (_) {
      /* ignore; chart shows what we have */
    }
    if (token !== state._ratioChartToken) return;
    const fechasOk = getRatioFechas();
    const rows = buildRatioRows(fechasOk);
    charts.renderDist(rows, opts);
    charts._insightDist(rows, { nFechas: fechasOk.length });
    if (typeof charts.renderDistGt70 === 'function') {
      charts.renderDistGt70(rows, opts);
      charts._insightDistGt70(rows, { nFechas: fechasOk.length });
    }
    updateRatioSheetMeta();
    requestAnimationFrame(() => {
      if (charts.resizeAll) charts.resizeAll();
    });
  }

  function collectRatioPeople(fechas, pred) {
    const people = [];
    const byFecha = {};
    (fechas || []).forEach((f) => {
      const pack = packForRatioFecha(f);
      if (!pack) {
        byFecha[f] = 0;
        return;
      }
      let n = 0;
      peopleOf(pack).forEach((r) => {
        const c = Number(r.c || 0);
        if (!pred(c, r)) return;
        n += 1;
        people.push({
          ci: r.ci,
          nombre: r.nombre,
          apellido: r.apellido,
          nombreCompleto: r.nombreCompleto,
          grupo: r.grupo,
          c,
          fecha: f,
          fechaSort: fechaLegendSortKey(f),
          fechaLabel: fechaLegendDdMmYyyy(f)
        });
      });
      byFecha[f] = n;
    });
    people.sort((a, b) => {
      const ka = String(a.fechaSort || '');
      const kb = String(b.fechaSort || '');
      if (ka !== kb) return ka.localeCompare(kb);
      return (Number(b.c) || 0) - (Number(a.c) || 0);
    });
    return { people, byFecha };
  }

  async function exportRatioExcel(btn) {
    if (!QB.export || typeof QB.export.excelRatioDist !== 'function') {
      if (QB.export && QB.export.toast) QB.export.toast('Exportación no lista', 'warn');
      return;
    }
    const fechas = getRatioFechas();
    if (!fechas.length) {
      QB.export.toast('Elige al menos una fecha', 'warn');
      return;
    }
    if (btn) {
      btn.disabled = true;
      btn.classList.add('is-busy');
    }
    try {
      await ensureRatioPacks(fechas);
      const missing = fechas.filter((f) => !packForRatioFecha(f));
      if (missing.length) {
        QB.export.toast(
          'Faltan datos de ' + missing.length + ' fecha(s). Reintenta.',
          'warn'
        );
      }
      const { people } = collectRatioPeople(fechas, (c) => c > 0);
      QB.export.excelRatioDist({ people, fechas });
    } catch (_) {
      QB.export.toast('No se pudo armar el Excel', 'warn');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('is-busy');
      }
    }
  }

  function limaHoyIso() {
    try {
      return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
    } catch (_) {
      const d = new Date();
      return (
        d.getFullYear() +
        '-' +
        String(d.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(d.getDate()).padStart(2, '0')
      );
    }
  }

  function toIsoDate(s) {
    const str = String(s || '').trim();
    let m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[1] + '-' + m[2] + '-' + m[3];
    m = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
    if (m) {
      return m[3] + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[1]).padStart(2, '0');
    }
    return '';
  }

  function fechaIsoKey(key) {
    const k = String(key || '').trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(k)) return k.slice(0, 10);
    const h = (state.hojas || []).find((x) => x.fecha === k);
    const opt = (state.fechaOpts || []).find((o) => o.value === k);
    const pack =
      (state.report && String(state.fecha) === k && state.report) ||
      (state.comparePacks && state.comparePacks[k]) ||
      null;
    const fromRow = pack && pack.data && pack.data[0] && pack.data[0].fecha;
    const candidates = [
      h && h.fechaDisplay,
      opt && opt.display,
      pack && pack.hoy,
      fromRow,
      h && h.fecha,
      k
    ];
    for (let i = 0; i < candidates.length; i++) {
      const iso = toIsoDate(candidates[i]);
      if (iso) return iso;
    }
    return fechaIsoFromLabel(fechaLabelText(k)) || '';
  }

  /**
   * Solo el 16/09/2026 (hoy Lima): quita M3 · equipo de Paredes Galarreta → M5.
   * Desde mañana no aplica.
   */
  function esEquipoParedesHoy(row, iso) {
    if (!QB.supervisors) return false;
    const s = QB.supervisors.byLic(row.grupo, iso);
    if (s && QB.supervisors.normDni(s.dni) === '60741145') return true;
    const lab =
      (s && s.nombre) ||
      QB.supervisors.fullLabel(row.grupo, iso) ||
      QB.supervisors.label(row.grupo, iso) ||
      '';
    return /PAREDES\s+GALARRETA|CRISTHIAN\s+JEANPIER/i.test(lab);
  }

  function applyModuloFixTemporal(mods, row, iso) {
    if (limaHoyIso() !== '2026-09-16') return mods || [];
    let out = (mods || []).filter((m) => String(m).toUpperCase() !== 'M3');
    if (esEquipoParedesHoy(row, iso)) out = ['M5'];
    return out;
  }

  /** Mapa módulo → jarras · con fix temporal del día */
  function personModulosJarras(row, iso) {
    const byMod = new Map();
    (row && row.lotes ? row.lotes : []).forEach((l) => {
      const c = Number(l && l.c) || 0;
      if (c <= 0) return;
      const mod = shortModulo(l && (l.lote || l));
      if (!mod) return;
      byMod.set(mod, (byMod.get(mod) || 0) + c);
    });
    if (!byMod.size && row && Number(row.c) > 0) {
      const top = shortModulo(row.modulo);
      if (top) byMod.set(top, Number(row.c) || 0);
    }
    if (limaHoyIso() !== '2026-09-16') return byMod;
    if (esEquipoParedesHoy(row, iso)) {
      let total = 0;
      byMod.forEach((c) => {
        total += c;
      });
      const out = new Map();
      if (total > 0) out.set('M5', total);
      return out;
    }
    const out = new Map();
    byMod.forEach((c, m) => {
      if (String(m).toUpperCase() === 'M3') return;
      out.set(m, c);
    });
    return out;
  }

  async function exportRatioModulosImage(btn) {
    if (!QB.export || typeof QB.export.modulosRatioPngZip !== 'function') {
      if (QB.export && QB.export.toast) QB.export.toast('Exportación no lista', 'warn');
      return;
    }
    const fechas = getRatioFechas();
    if (!fechas.length) {
      QB.export.toast('Elige al menos una fecha', 'warn');
      return;
    }
    if (btn) {
      btn.disabled = true;
      btn.classList.add('is-busy');
    }
    try {
      await ensureRatioPacks(fechas);
      const byModulo = new Map();
      fechas.forEach((f) => {
        const pack = packForRatioFecha(f) || state.comparePacks[f];
        if (!pack) return;
        const iso = fechaIsoKey(f);
        mergeByWorker(pack).forEach((r) => {
          if (!(Number(r.c) > 0)) return;
          const mods = personModulosJarras(r, iso);
          mods.forEach((jarras, mod) => {
            if (!(jarras > 0) || !mod) return;
            if (!byModulo.has(mod)) byModulo.set(mod, []);
            byModulo.get(mod).push(Object.assign({}, r, { c: jarras }));
          });
        });
      });
      const modNum = (m) => {
        const x = String(m || '').match(/M\s*0*(\d+)/i);
        return x ? Number(x[1]) : 0;
      };
      const fechaLabels = [...fechas]
        .sort((a, b) => fechaLegendSortKey(a).localeCompare(fechaLegendSortKey(b)))
        .map((f) => fechaLegendDdMmYyyy(f));
      const metas = [...byModulo.entries()]
        .sort((a, b) => modNum(b[0]) - modNum(a[0]) || a[0].localeCompare(b[0]))
        .map(([mod, people]) => {
          const n = modNum(mod);
          return {
            people,
            moduloLabel: n ? 'Módulo ' + n : mod,
            fecha: fechas.length === 1 ? fechas[0] : 'modulos',
            fechaLabels
          };
        })
        .filter((m) => m.people && m.people.length);
      if (!metas.length) {
        QB.export.toast('Sin personas con jarras por módulo', 'warn');
        return;
      }
      await QB.export.modulosRatioPngZip(metas);
    } catch (_) {
      QB.export.toast('No se pudo generar ratios por módulo', 'warn');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('is-busy');
      }
    }
  }

  async function exportRatioImage(btn, chartId) {
    if (!QB.export || typeof QB.export.ratioChartImage !== 'function') {
      if (QB.export && QB.export.toast) QB.export.toast('Exportación no lista', 'warn');
      return;
    }
    const id = chartId || 'chartDist';
    const fechas = getRatioFechas();
    if (!fechas.length) {
      QB.export.toast('Elige al menos una fecha', 'warn');
      return;
    }
    if (btn) {
      btn.disabled = true;
      btn.classList.add('is-busy');
    }
    try {
      await ensureRatioPacks(fechas);
      await renderRatioChart({ animate: false });
      await new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setTimeout(resolve, 60));
        });
      });
      const labels = [...fechas]
        .sort((a, b) => fechaLegendSortKey(a).localeCompare(fechaLegendSortKey(b)))
        .map((f) => fechaLegendDdMmYyyy(f));
      await QB.export.ratioChartImage({
        chartId: id,
        fechaLabels: labels,
        title:
          id === 'chartDistGt70'
            ? 'Q Berries · Más de 70 jarras'
            : 'Q Berries · Ratios Cosecha / Diario',
        fileTag: id === 'chartDistGt70' ? 'mas_de_70' : 'ratios_cosecha'
      });
    } catch (_) {
      QB.export.toast('No se pudo generar la imagen', 'warn');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('is-busy');
      }
    }
  }

  async function exportRatioExcelGt70(btn) {
    if (!QB.export || typeof QB.export.excelRatioGt70 !== 'function') {
      if (QB.export && QB.export.toast) QB.export.toast('Exportación no lista', 'warn');
      return;
    }
    const fechas = getRatioFechas();
    if (!fechas.length) {
      QB.export.toast('Elige al menos una fecha', 'warn');
      return;
    }
    if (btn) {
      btn.disabled = true;
      btn.classList.add('is-busy');
    }
    try {
      await ensureRatioPacks(fechas);
      const missing = fechas.filter((f) => !packForRatioFecha(f));
      if (missing.length) {
        QB.export.toast(
          'Faltan datos de ' +
            missing.map((f) => fechaLegendDdMmYyyy(f)).join(' / ') +
            '. Reintenta.',
          'warn'
        );
      }
      const { people, byFecha } = collectRatioPeople(fechas, (c) => c > 70);
      const detail = fechas
        .slice()
        .sort((a, b) => fechaLegendSortKey(a).localeCompare(fechaLegendSortKey(b)))
        .map((f) => fechaLegendDdMmYyyy(f) + ': ' + (byFecha[f] || 0))
        .join(' · ');
      QB.export.excelRatioGt70({ people, fechas, detail: detail });
    } catch (_) {
      QB.export.toast('No se pudo armar el Excel', 'warn');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('is-busy');
      }
    }
  }

  function updateCompareMeta() {
    const meta = $('compareMeta');
    if (!meta) return;
    const active = getCompareActiveFechas();
    const pool = fechasMismaVariedad((state.fechaOpts || []).map((o) => o.value).filter(Boolean));
    const total = pool.length;
    const varLabel = variedadLabelForFecha(state.fecha);
    if (total < 2) {
      meta.textContent = varLabel
        ? varLabel + ' · una sola hoja, no se junta con otra variedad'
        : 'Necesitas al menos 2 hojas de cosecha';
      return;
    }
    if (active.length < 2) {
      meta.textContent = varLabel
        ? `${varLabel} · incluye al menos 2 hojas (${active.length} de ${total})`
        : `Incluye al menos 2 hojas (${active.length} de ${total})`;
      return;
    }
    const head = varLabel ? varLabel + ' · ' : '';
    meta.textContent = head + active.length + ' fechas';
  }

  const COMPARE_MAX_FECHAS = 3;

  function compareOptsSorted() {
    return (state.fechaOpts || [])
      .filter((o) => mismaVariedadQueActiva(o.value))
      .sort((a, b) => compareFechaSortKey(b.value).localeCompare(compareFechaSortKey(a.value)));
  }

  function capCompareFechas() {
    const sorted = compareOptsSorted();
    if (!sorted.length) return;
    const active = sorted.filter((o) => !state.compareExcluded[o.value]);
    let keep;
    if (state.compareFechaCustom && active.length > 0 && active.length <= COMPARE_MAX_FECHAS) {
      keep = new Set(active.map((o) => o.value));
    } else if (state.compareFechaCustom && active.length > COMPARE_MAX_FECHAS) {
      keep = new Set(active.slice(0, COMPARE_MAX_FECHAS).map((o) => o.value));
    } else {
      keep = new Set(sorted.slice(0, COMPARE_MAX_FECHAS).map((o) => o.value));
    }
    sorted.forEach((o) => {
      if (keep.has(o.value)) delete state.compareExcluded[o.value];
      else state.compareExcluded[o.value] = true;
    });
  }

  function renderCompareSheetBar() {
    const opts = compareOptsSorted();
    const active = opts.filter((o) => !state.compareExcluded[o.value]);
    const valueEl = $('compareFechaValue');
    if (valueEl) {
      if (!opts.length) valueEl.textContent = 'Sin fechas';
      else if (!active.length) valueEl.textContent = 'Ninguna';
      else {
        valueEl.textContent = active
          .map((o) => {
            const info = fmtFechaClara(o.display || o.value);
            return (info.short || o.label || '').slice(0, 5);
          })
          .join(' · ');
      }
    }
    updateCompareMeta();
    const modal = $('compareFechaModal');
    if (modal && !modal.hidden) renderCompareFechaList();
  }

  function renderCompareFechaList() {
    const host = $('compareFechaList');
    const countEl = $('compareFechaCount');
    if (!host) return;
    const draft = state._compareDraft || [];
    const full = draft.length >= COMPARE_MAX_FECHAS;
    if (countEl) countEl.textContent = draft.length + ' de ' + COMPARE_MAX_FECHAS;
    const opts = compareOptsSorted();
    host.innerHTML = opts.length
      ? opts
          .map((o) => {
            const info = fmtFechaClara(o.display || o.value);
            const short = info.short || o.label;
            const on = draft.indexOf(o.value) >= 0;
            const locked = full && !on;
            const vari = variedadLabelForFecha(o.value);
            const sub = [info.fullLong || o.label || '', vari].filter(Boolean).join(' · ');
            return (
              '<button type="button" class="compare-fecha-opt' +
              (on ? ' is-on' : '') +
              (locked ? ' is-locked' : '') +
              '" data-compare-fecha="' +
              escapeAttr(o.value) +
              '" aria-pressed="' +
              (on ? 'true' : 'false') +
              '">' +
              '<span class="ratio-fecha-mark" aria-hidden="true"></span>' +
              '<span class="ratio-fecha-opt-text"><b>' +
              escapeHtml(short) +
              '</b>' +
              (sub ? '<small>' + escapeHtml(sub) + '</small>' : '') +
              '</span></button>'
            );
          })
          .join('')
      : '<p class="ratio-sheet-empty">Sin fechas</p>';
  }

  function openCompareFechaModal() {
    capCompareFechas();
    state._compareDraft = getCompareActiveFechas().slice();
    renderCompareFechaList();
    const root = $('compareFechaModal');
    if (root) root.hidden = false;
  }

  function closeCompareFechaModal() {
    const root = $('compareFechaModal');
    if (root) root.hidden = true;
  }

  function toggleCompareDraft(fecha) {
    const f = String(fecha || '').trim();
    if (!f) return;
    const draft = state._compareDraft || (state._compareDraft = []);
    const i = draft.indexOf(f);
    if (i >= 0) {
      draft.splice(i, 1);
    } else if (draft.length >= COMPARE_MAX_FECHAS) {
      QB.export.toast('Máximo 3 fechas', 'warn');
      return;
    } else {
      draft.push(f);
    }
    renderCompareFechaList();
  }

  function applyCompareFechaDraft() {
    const draft = (state._compareDraft || []).slice();
    if (draft.length < 2) {
      QB.export.toast('Elige al menos 2 fechas', 'warn');
      return;
    }
    if (draft.length > COMPARE_MAX_FECHAS) {
      QB.export.toast('Máximo 3 fechas', 'warn');
      return;
    }
    const keep = {};
    draft.forEach((f) => {
      keep[f] = true;
    });
    compareOptsSorted().forEach((o) => {
      if (keep[o.value]) delete state.compareExcluded[o.value];
      else state.compareExcluded[o.value] = true;
    });
    state.compareFechaCustom = true;
    state._compareDirty = true;
    closeCompareFechaModal();
    renderCompareSheetBar();
    runCompare(true);
  }

  function setCompareExcluded(fecha, excluded) {
    const f = String(fecha || '').trim();
    if (!f) return;
    if (excluded) state.compareExcluded[f] = true;
    else delete state.compareExcluded[f];
    state._compareDirty = true;
    renderCompareSheetBar();
  }

  function supervisorFechaIso(fecha) {
    const raw =
      fecha != null && String(fecha).trim() !== ''
        ? String(fecha).trim()
        : String(state.fecha || '').trim();
    return fechaIsoKey(raw);
  }

  function supervisorFullLabel(grupo, fecha) {
    if (!grupo || !QB.supervisors) return '';
    const f = supervisorFechaIso(fecha);
    return QB.supervisors.fullLabel(grupo, f) || QB.supervisors.label(grupo, f) || '';
  }

  function supervisorShortLabel(grupo, fecha) {
    if (!grupo || !QB.supervisors) return '';
    const f = supervisorFechaIso(fecha);
    return QB.supervisors.label(grupo, f) || supervisorFullLabel(grupo, f) || '';
  }

  function compareDayLabels(fecha) {
    const info = fechaInfoFor(fecha);
    const h = (state.hojas || []).find((x) => x.fecha === fecha);
    const opt = (state.fechaOpts || []).find((o) => o.value === fecha);
    const sheetName = (h && h.nombre) || '';
    if (!info) {
      return {
        label: String(fecha || ''),
        short: String(fecha || ''),
        line: String(fecha || ''),
        sheetName
      };
    }
    return {
      label: info.fullLong || info.full || info.line,
      short: info.short || info.line,
      line: info.line || info.short,
      sheetName
    };
  }

  function loteTotals(pack) {
    const by = {};
    const rows = (pack && pack.data) || [];
    const kpis = (pack && pack.kpis) || {};
    rows.forEach((r) => {
      if (Array.isArray(r.lotes) && r.lotes.length) {
        r.lotes.forEach((l) => {
          const name = String(l.lote || '').trim() || '(sin lote)';
          by[name] = (by[name] || 0) + (Number(l.c) || 0);
        });
      } else if (r.lote) {
        const name = String(r.lote).trim();
        by[name] = (by[name] || 0) + (Number(r.c) || 0);
      }
    });
    if (!Object.keys(by).length && kpis.porLote) {
      kpis.porLote.forEach((l) => {
        const name = String(l.lote || '').trim() || '(sin lote)';
        by[name] = (by[name] || 0) + (Number(l.c) || 0);
      });
    }
    return by;
  }

  function compareFechaSortKey(fecha) {
    const h = (state.hojas || []).find((x) => x.fecha === fecha);
    const opt = (state.fechaOpts || []).find((o) => o.value === fecha);
    const iso = (h && h.fechaDisplay) || (opt && opt.display) || fecha;
    if (/^\d{4}-\d{2}-\d{2}/.test(String(iso))) return String(iso).slice(0, 10);
    return String(fecha || '');
  }

  function sortCompareFechas(fechas) {
    return [...(fechas || [])].sort((a, b) => compareFechaSortKey(a).localeCompare(compareFechaSortKey(b)));
  }

  function comparePersonPromedio(values) {
    const worked = (values || []).filter((v) => v != null);
    if (!worked.length) return 0;
    const sum = worked.reduce((s, v) => s + (Number(v) || 0), 0);
    return Math.round((sum / worked.length) * 10) / 10;
  }

  function comparePersonCondicion(ltDays) {
    return Number(ltDays) > 0 ? 'Bajo (día)' : 'Regular';
  }

  function buildMultiCompareModel(packsByFecha, fechas) {
    fechas = sortCompareFechas(fechas);
    const days = fechas.map((fecha) => {
      const pack = packsByFecha[fecha];
      const k = (pack && pack.kpis) || {};
      const mergedDay = mergeByWorker(pack || { data: [] });
      const nPeople = k.totalTrabajadores || mergedDay.length || 0;
      const total = k.totalCajas || 0;
      const labels = compareDayLabels(fecha);
      const lt40Count = mergedDay.filter((r) => Number(r.c || 0) < COMPARE_LT40).length;
      return {
        fecha,
        label: labels.label,
        short: labels.short,
        line: labels.line,
        sheetName: labels.sheetName,
        kpis: k,
        stats: QB.charts.buildGrupoStats((pack && pack.data) || []),
        lotes: loteTotals(pack),
        mergedDay,
        nPeople,
        nGrupos: k.totalGrupos || (k.porGrupo || []).length || 0,
        total,
        avg: nPeople ? Math.round((total / nPeople) * 10) / 10 : 0,
        lt40Count
      };
    });

    const grupoKeys = new Set();
    days.forEach((d) => d.stats.forEach((s) => grupoKeys.add(s.grupo)));
    const licRows = [...grupoKeys]
      .map((grupo) => {
        const sup = supervisorFullLabel(grupo, fechas[0]);
        const values = days.map((d) => {
          const hit = d.stats.find((s) => s.grupo === grupo);
          return hit
            ? { avg: hit.avg, c: hit.c, n: hit.n }
            : { avg: 0, c: 0, n: 0 };
        });
        const minAvg = Math.min(...values.map((v) => v.avg || 0));
        return {
          lic: shortGrupo(grupo),
          supervisor: sup || 'Sin supervisor',
          grupo,
          values,
          minAvg
        };
      })
      .sort((a, b) => a.minAvg - b.minAvg);

    const licWorst = licRows[0] || null;

    const lotKeys = new Set();
    days.forEach((d) => Object.keys(d.lotes).forEach((k) => lotKeys.add(k)));
    const lotRows = [...lotKeys].map((lote) => {
      const values = days.map((d) => Number(d.lotes[lote]) || 0);
      const total = values.reduce((s, v) => s + v, 0);
      return { lote, values, total };
    });
    const lotLow = lotRows.length ? lotRows.slice().sort((a, b) => a.total - b.total)[0] : null;
    const lotHigh = lotRows.length ? lotRows.slice().sort((a, b) => b.total - a.total)[0] : null;

    const ciMap = new Map();
    days.forEach((d, di) => {
      d.mergedDay.forEach((r) => {
        const ci = String(r.ci || '');
        if (!ci) return;
        if (!ciMap.has(ci)) {
          ciMap.set(ci, {
            ci,
            nombre: QB.avatars.realName(r) || QB.avatars.shortName(r) || ci,
            grupoRaw: r.grupo || '',
            grupo: shortGrupo(r.grupo),
            gruposByDay: days.map(() => ''),
            supervisorsByDay: days.map(() => '—'),
            bestC: 0,
            values: days.map(() => null)
          });
        }
        const row = ciMap.get(ci);
        const jars = Math.round((Number(r.c) || 0) * 100) / 100;
        row.values[di] = jars;
        row.gruposByDay[di] = r.grupo || '';
        row.supervisorsByDay[di] = supervisorFullLabel(r.grupo, d.fecha) || '—';
        if (!row.nombre || row.nombre === ci) {
          row.nombre = QB.avatars.realName(r) || QB.avatars.shortName(r) || ci;
        }
        if (r.grupo && jars >= row.bestC) {
          row.bestC = jars;
          row.grupoRaw = r.grupo;
          row.grupo = shortGrupo(r.grupo);
        }
      });
    });

    const lt40People = [...ciMap.values()]
      .map((p) => {
        const ltDays = p.values.filter((v) => v != null && Number(v) < COMPARE_LT40).length;
        const min = Math.min(...p.values.map((v) => (v == null ? Infinity : Number(v))));
        const sum = p.values.reduce((s, v) => s + (Number(v) || 0), 0);
        const ltIdx = p.values.findIndex((v) => v != null && Number(v) < COMPARE_LT40);
        const refIdx = ltIdx >= 0 ? ltIdx : 0;
        const refGrupo = p.gruposByDay[refIdx] || p.grupoRaw;
        const refFecha = days[refIdx] ? days[refIdx].fecha : state.fecha;
        const supervisor = p.supervisorsByDay[refIdx] || supervisorFullLabel(refGrupo, refFecha) || '—';
        const supervisorShort = supervisorShortLabel(refGrupo, refFecha) || supervisor;
        const promedio = comparePersonPromedio(p.values);
        /* Bajo = tuvo al menos un día < 30 jarras (no se usa el promedio) */
        const condicion = comparePersonCondicion(ltDays);
        return {
          ...p,
          ltDays,
          min: min === Infinity ? 0 : min,
          sum,
          supervisor,
          supervisorShort,
          refGrupo,
          refFecha,
          promedio,
          condicion
        };
      })
      .filter((p) => p.ltDays > 0)
      .filter((p) => !(QB.supervisors && QB.supervisors.isSupervisorDni && QB.supervisors.isSupervisorDni(p.ci)))
      .sort((a, b) => b.ltDays - a.ltDays || a.min - b.min || a.sum - b.sum);

    const lt40BySupervisor = buildCompareLt40SupervisorStats(lt40People);

    return { days, licWorst, licRows, lt40People, lt40BySupervisor, lotLow, lotHigh };
  }

  function supervisorChartShort(name) {
    const s = String(name || '').trim();
    if (!s || s === '—') return 'Sin supervisor';
    const parts = s.split(/\s+/).filter(Boolean);
    if (parts.length <= 2) return s;
    return parts[0] + ' ' + parts[1];
  }

  function buildCompareLt40SupervisorStats(people) {
    const map = new Map();
    (people || []).forEach((p) => {
      const nombre = p.supervisor && p.supervisor !== '—' ? p.supervisor : p.supervisorShort || 'Sin supervisor';
      const short = supervisorChartShort(p.supervisorShort || nombre);
      if (!map.has(nombre)) {
        map.set(nombre, { nombre, short, n: 0, lics: new Set() });
      }
      const row = map.get(nombre);
      row.n += 1;
      if (p.grupo) row.lics.add(p.grupo);
    });
    return [...map.values()]
      .map((r) => ({
        nombre: r.nombre,
        short: r.short,
        n: r.n,
        lic: [...r.lics].join(' · ')
      }))
      .sort((a, b) => b.n - a.n || a.nombre.localeCompare(b.nombre));
  }

  async function runCompare(loadRemote) {
    const opts = state.fechaOpts || [];
    if (opts.length < 2) {
      const el = $('compareContent');
      if (el) {
        el.innerHTML =
          '<p class="compare-empty">Necesitas al menos <strong>2 hojas</strong> de cosecha para comparar.</p>';
      }
      return;
    }

    const active = getCompareActiveFechas();
    if (active.length < 2) {
      const el = $('compareContent');
      if (el) {
        const varLabel = variedadLabelForFecha(state.fecha);
        el.innerHTML = varLabel
          ? '<p class="compare-empty"><strong>' +
            escapeHtml(varLabel) +
            '</strong> se compara solo con hojas de la misma variedad.</p>'
          : '<p class="compare-empty">Incluye al menos <strong>2 hojas</strong>. Toca una hoja excluida abajo para volver a incluirla.</p>';
      }
      updateCompareMeta();
      renderCompareSheetBar();
      return;
    }

    const sig = compareActiveSig(active);
    const el = $('compareContent');
    if (el) {
      el.innerHTML =
        '<p class="compare-loading">Cargando y comparando ' + active.length + ' hojas…</p>';
    }

    try {
      if (QB.descartes && QB.descartes.load) {
        await QB.descartes.load(true);
      }
      const jobs = [];
      active.forEach((fecha) => {
        const cached = state.comparePacks[fecha];
        const need =
          loadRemote ||
          state._compareDirty ||
          !cached ||
          !(cached.data || []).length ||
          state._compareLoadedSig !== sig;
        if (need) {
          jobs.push(
            QB.api.cargarTodo({ fecha: fecha, allowCacheFallback: true }).then((p) => {
              storeComparePack(fecha, p);
            })
          );
        }
      });
      if (jobs.length) await Promise.all(jobs);

      const activeNow = getCompareActiveFechas();
      const packs = {};
      activeNow.forEach((fecha) => {
        if (state.comparePacks[fecha]) packs[fecha] = state.comparePacks[fecha];
      });
      renderCompareSheetBar();
      updateCompareMeta();
      if (Object.keys(packs).length < 2) {
        if (el) {
          const varLabel = variedadLabelForFecha(state.fecha);
          el.innerHTML = varLabel
            ? '<p class="compare-empty"><strong>' +
              escapeHtml(varLabel) +
              '</strong> se compara solo con hojas de la misma variedad.</p>'
            : '<p class="compare-empty">No hay suficientes datos cargados. Intenta de nuevo.</p>';
        }
        return;
      }

      state._compareLoadedSig = compareActiveSig(activeNow);
      state._compareDirty = false;
      renderCompareContent(packs, activeNow);
    } catch (err) {
      if (el) {
        el.innerHTML =
          '<p class="compare-empty">No se pudo comparar: ' +
          escapeHtml(err && err.message ? err.message : 'error') +
          '</p>';
      }
    }
  }

  function renderCompareDayHeads(days) {
    return days
      .map((d) => {
        const head = d.line || d.short || d.label;
        const short = d.short || head;
        const sub = d.sheetName ? ` · ${d.sheetName}` : '';
        return `<th scope="col" class="compare-day-col" title="${escapeAttr(d.label + sub)}"><span class="compare-day-head-short">${escapeHtml(short)}</span><span class="compare-day-head-long">${escapeHtml(head)}</span></th>`;
      })
      .join('');
  }

  function renderCompareExportBar(days) {
    if (!days || !days.length) return '';
    return `<div class="compare-export-row">
      <span class="compare-export-label">Exportar Excel</span>
      <div class="compare-export-btns">
        ${days
          .map(
            (d) =>
              `<button type="button" class="btn btn-excel btn-sm" data-export-compare="day" data-fecha="${escapeAttr(d.fecha)}" title="menos de 30 jarras · ${escapeAttr(d.label)}"><span class="export-btn-long">Excel ${escapeHtml(d.short)}</span><span class="export-btn-short">${escapeHtml(d.short)}</span></button>`
          )
          .join('')}
        <button type="button" class="btn btn-excel btn-sm is-high" data-export-compare="all" title="Excel con todas las hojas y supervisores">
          <span class="export-btn-long">Excel comparación completa</span>
          <span class="export-btn-short">Excel completo</span>
        </button>
      </div>
    </div>`;
  }

  function renderCompareSummaryMobile(days) {
    const metrics = [
      { key: 'total', label: 'Total jarras' },
      { key: 'nPeople', label: 'Cosechadores' },
      { key: 'nGrupos', label: 'Grupos LIC' },
      { key: 'avg', label: 'Prom. jarras/persona' },
      { key: 'lt40Count', label: 'Personas < 30 jarras', alert: true }
    ];
    return `<div class="compare-summary-mobile">${(days || [])
      .map(
        (d) =>
          `<article class="compare-day-card">
            <header class="compare-day-card-head">${escapeHtml(d.short || d.line || d.label)}</header>
            <div class="compare-day-card-metrics">
              ${metrics
                .map((m) => {
                  const cls = m.alert ? ' compare-day-metric is-alert' : ' compare-day-metric';
                  return `<div class="${cls.trim()}"><span>${escapeHtml(m.label)}</span><strong>${fmt(d[m.key])}</strong></div>`;
                })
                .join('')}
            </div>
          </article>`
      )
      .join('')}</div>`;
  }

  function renderCompareLicMobile(licRows, days) {
    return `<div class="compare-lic-mobile">${(licRows || [])
      .map(
        (row) =>
          `<article class="compare-lic-card">
            <header class="compare-lic-card-head">
              <strong>${escapeHtml(row.lic)}</strong>
              <span>${escapeHtml(row.supervisor)}</span>
            </header>
            <div class="compare-lic-card-days">
              ${(days || [])
                .map((d, i) => {
                  const v = row.values[i] || { avg: 0 };
                  return `<div class="compare-lic-day"><span>${escapeHtml(d.short || d.line)}</span><strong>${fmt(v.avg)}</strong></div>`;
                })
                .join('')}
            </div>
          </article>`
      )
      .join('')}</div>`;
  }

  function exportCompareExcel(kind, fecha) {
    const last = state._compareLast;
    if (!last || !QB.export) return;
    if (kind === 'day' && fecha) {
      const pack = last.packs[fecha] || state.comparePacks[fecha];
      if (!pack) {
        QB.export.toast('Sin datos para esa hoja', 'warn');
        return;
      }
      const people = mergeByWorker(pack).filter((r) => {
        if (Number(r.c || 0) >= COMPARE_LT40) return false;
        if (QB.supervisors && QB.supervisors.isSupervisorDni && QB.supervisors.isSupervisorDni(r.ci)) {
          return false;
        }
        return true;
      });
      QB.export.excelPeopleByJarras({
        mode: 'lt40',
        people,
        fecha,
        fechaLabel: fechaLabelText(fecha)
      });
      return;
    }
    if (kind === 'all') {
      QB.export.excelCompareLt40Matrix({
        days: last.model.days,
        people: last.model.lt40People,
        fechas: last.fechas
      });
    }
  }

  function renderCompareLtDaysCell(ltDays) {
    const n = Number(ltDays) || 0;
    const cls = n > 0 ? 'num compare-day-col is-lt40' : 'num compare-day-col';
    return `<td class="${cls}">${fmt(n)}</td>`;
  }

  function renderCompareJarCell(v) {
    if (v == null) return '<td class="num compare-day-col is-empty">—</td>';
    const n = Number(v) || 0;
    const cls = n < COMPARE_LT40 ? 'num compare-day-col is-lt40' : 'num compare-day-col';
    return `<td class="${cls}">${fmt(n)}</td>`;
  }

  function filterCompareLt40People(people, q) {
    const ql = String(q || '').trim().toLowerCase();
    if (!ql) return people || [];
    const digits = ql.replace(/\D/g, '');
    return (people || []).filter((p) => {
      const ci = String(p.ci || '').toLowerCase();
      const nom = String(p.nombre || '').toLowerCase();
      if (digits.length >= 2 && ci.indexOf(digits) >= 0) return true;
      if (nom.indexOf(ql) >= 0) return true;
      return false;
    });
  }

  function renderCompareLt40Row(p) {
    return `<tr><td>${escapeHtml(p.nombre)}</td><td>${escapeHtml(p.ci)}</td><td>${escapeHtml(p.grupo)}</td><td title="${escapeAttr(p.supervisor)}">${escapeHtml(p.supervisorShort || p.supervisor)}</td>${p.values
      .map((v) => renderCompareJarCell(v))
      .join('')}${renderCompareLtDaysCell(p.ltDays)}</tr>`;
  }

  function renderCompareLt40MobileCards(people, q) {
    const days = state._compareLast?.model?.days || [];
    if (!people.length) {
      const msg = q
        ? `Sin resultados para “${escapeHtml(q)}”`
        : 'Ninguna persona con menos de 30 jarras en las hojas seleccionadas.';
      return `<p class="compare-empty compare-lt40-mobile-empty">${msg}</p>`;
    }
    return people
      .map((p) => {
        const dayStats = days
          .map((d, i) => {
            const v = p.values[i];
            const n = v == null ? null : Number(v) || 0;
            const cls =
              v == null ? 'is-empty' : n < COMPARE_LT40 ? 'is-lt40' : '';
            return `<div class="compare-lt40-stat ${cls}">
              <span class="compare-lt40-stat-label">${escapeHtml(d.short || d.line || d.label)}</span>
              <strong class="compare-lt40-stat-val">${v == null ? '—' : fmt(n)}</strong>
            </div>`;
          })
          .join('');
        const promCls = Number(p.ltDays) > 0 ? 'is-lt40' : '';
        return `<article class="compare-lt40-card">
          <header class="compare-lt40-card-head">
            <strong class="compare-lt40-card-name">${escapeHtml(p.nombre)}</strong>
            <span class="compare-lt40-card-ci">CI ${escapeHtml(p.ci)}</span>
          </header>
          <p class="compare-lt40-card-meta">${escapeHtml(p.grupo)} · ${escapeHtml(p.supervisorShort || p.supervisor)}</p>
          <div class="compare-lt40-card-dates">${dayStats}</div>
          <div class="compare-lt40-card-foot">
            <div class="compare-lt40-stat ${promCls}">
              <span class="compare-lt40-stat-label">Días &lt;30</span>
              <strong class="compare-lt40-stat-val">${fmt(p.ltDays)}</strong>
            </div>
          </div>
        </article>`;
      })
      .join('');
  }

  function renderCompareLt40TableBody(people, q) {
    if (!people.length) {
      const msg = q
        ? `Sin resultados para “${escapeHtml(q)}”`
        : 'Ninguna persona con menos de 30 jarras en las hojas seleccionadas.';
      const cols = 4 + (state._compareLast?.model?.days?.length || 0) + 1;
      return `<tr><td colspan="${cols}" class="compare-empty-row">${msg}</td></tr>`;
    }
    return people.map((p) => renderCompareLt40Row(p)).join('');
  }

  function compareLt40HintText(total, shown, q) {
    const base = 'en rojo = menos de 30 jarras ese día · supervisor según su LIC';
    if (q && shown !== total) {
      return `${fmt(shown)} de ${fmt(total)} personas · ${base}`;
    }
    return `${fmt(total)} personas · ${base}`;
  }

  function applyCompareLt40Search() {
    const searchInput = $('compareLt40Search');
    const q = searchInput ? searchInput.value.trim() : String(state.compareLt40Q || '').trim();
    state.compareLt40Q = q;
    const all = state._compareLast?.model?.lt40People || [];
    const filtered = filterCompareLt40People(all, q);
    const tbody = $('compareLt40Tbody');
    const mobile = $('compareLt40Mobile');
    const meta = $('compareLt40SearchMeta');
    const hint = $('compareLt40Hint');
    if (tbody) tbody.innerHTML = renderCompareLt40TableBody(filtered, q);
    if (mobile) mobile.innerHTML = renderCompareLt40MobileCards(filtered, q);
    if (meta) {
      meta.textContent = q ? `${filtered.length} coincidencia${filtered.length === 1 ? '' : 's'}` : '';
    }
    if (hint && all.length) {
      hint.textContent = compareLt40HintText(all.length, filtered.length, q);
    }
  }

  function bindCompareLt40Search() {
    const compareContent = $('compareContent');
    if (!compareContent || compareContent.dataset.lt40SearchBound) return;
    compareContent.dataset.lt40SearchBound = '1';
    let tCompareLt40;
    compareContent.addEventListener('input', (e) => {
      if (e.target.id !== 'compareLt40Search') return;
      clearTimeout(tCompareLt40);
      tCompareLt40 = setTimeout(applyCompareLt40Search, 140);
    });
    compareContent.addEventListener('keydown', (e) => {
      if (e.target.id !== 'compareLt40Search' || e.key !== 'Enter') return;
      e.preventDefault();
      clearTimeout(tCompareLt40);
      applyCompareLt40Search();
      const first =
        $('compareLt40Mobile')?.querySelector('.compare-lt40-card') ||
        $('compareLt40Tbody')?.querySelector('tr td:not(.compare-empty-row)')?.closest('tr');
      if (first) first.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }

  function renderCompareLt40SupervisorChartBlock() {
    return `<article class="compare-card tone-lt40-chart" aria-label="Supervisores con más personas bajo 30 jarras">
          <h3>Supervisores con más personas &lt; 34 jarras</h3>
          <p class="compare-hint compare-lt40-chart-hint">Quién reúne más cosechadores con menos de 30 jarras en las hojas comparadas</p>
          <div class="compare-chart-wrap compare-chart-wrap--full">
            <div id="chartCompareLt40Sup" class="compare-chart compare-chart--full" role="img" aria-label="Gráfico de barras por supervisor"></div>
          </div>
        </article>`;
  }

  function paintCompareLt40SupervisorChart(items) {
    const run = () => {
      if (typeof echarts === 'undefined') return false;
      const host = $('chartCompareLt40Sup');
      const panel = $('panelComparacion');
      if (!host || (panel && panel.hidden)) return false;
      if (host.offsetWidth < 48 || host.offsetHeight < 48) return false;
      if (!QB.charts || typeof QB.charts.renderCompareLt40Supervisores !== 'function') return false;
      try {
        QB.charts.renderCompareLt40Supervisores(items || []);
        return true;
      } catch (err) {
        console.warn('compare lt40 chart', err);
        return false;
      }
    };
    [0, 80, 200, 450, 750].forEach((ms) => {
      setTimeout(() => run(), ms);
    });
  }

  function buildCompareDescarteModel(fechas) {
    const list = sortCompareFechas(fechas || []);
    if (!QB.descartes || !list.length) return null;
    const cmp = QB.descartes.compareRows(list);
    if (!cmp.rows.length) return null;
    const dayLabels = list.map((f) => {
      const labels = compareDayLabels(f);
      return { fecha: f, short: labels.short || f, label: labels.label || f };
    });
    return {
      days: dayLabels,
      rows: cmp.rows,
      totals: cmp.totals
    };
  }

  function renderCompareDescarteHtml(descarteModel) {
    if (!descarteModel || !descarteModel.rows.length) {
      return `<article class="compare-card tone-descarte">
        <h3>Jarras de descarte por supervisor</h3>
        <p class="compare-empty">Sin datos de descarte para las hojas seleccionadas.</p>
      </article>`;
    }
    const { days, rows, totals } = descarteModel;
    const showDelta = days.length === 2;
    return `<article class="compare-card tone-descarte">
      <h3>Jarras de descarte por supervisor</h3>
      <p class="compare-hint">Quién tuvo descarte en cada hoja · suma al pie</p>
      <div class="compare-table-wrap compare-table-wrap--wide">
        <table class="compare-table compare-table--multi compare-table--descarte">
          <thead>
            <tr>
              <th scope="col">LIC</th>
              <th scope="col">Supervisor</th>
              ${renderCompareDayHeads(days)}
              ${showDelta ? '<th scope="col" class="compare-day-col">Δ</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map((row) => {
                const delta = showDelta ? (Number(row.values[1]) || 0) - (Number(row.values[0]) || 0) : 0;
                const deltaCls =
                  delta > 0 ? 'num compare-day-col is-up' : delta < 0 ? 'num compare-day-col is-down' : 'num compare-day-col';
                const deltaTxt =
                  delta > 0 ? '+' + fmt(delta) : delta < 0 ? fmt(delta) : '0';
                return `<tr>
                  <td>${escapeHtml(row.lic)}</td>
                  <td>${escapeHtml(row.nombre)}</td>
                  ${row.values
                    .map((v) => {
                      const n = Number(v) || 0;
                      const cls = n > 0 ? 'num compare-day-col is-descarte' : 'num compare-day-col';
                      return `<td class="${cls}">${fmt(n)}</td>`;
                    })
                    .join('')}
                  ${showDelta ? `<td class="${deltaCls}">${deltaTxt}</td>` : ''}
                </tr>`;
              })
              .join('')}
            <tr class="compare-row-total">
              <th scope="row">TOTAL</th>
              <td>Suma · ${rows.length} supervisores</td>
              ${totals
                .map((t) => `<td class="num compare-day-col is-descarte"><strong>${fmt(t)}</strong></td>`)
                .join('')}
              ${
                showDelta
                  ? (() => {
                      const d = (Number(totals[1]) || 0) - (Number(totals[0]) || 0);
                      const cls =
                        d > 0 ? 'num compare-day-col is-up' : d < 0 ? 'num compare-day-col is-down' : 'num compare-day-col';
                      const txt = d > 0 ? '+' + fmt(d) : fmt(d);
                      return `<td class="${cls}"><strong>${txt}</strong></td>`;
                    })()
                  : ''
              }
            </tr>
          </tbody>
        </table>
      </div>
    </article>`;
  }

  function renderCompareContent(packsByFecha, activeFechas) {
    const el = $('compareContent');
    if (!el) return;
    const fechas = activeFechas || getCompareActiveFechas();
    const packs = packsByFecha || {};
    fechas.forEach((f) => {
      if (!packs[f] && state.comparePacks[f]) packs[f] = state.comparePacks[f];
    });
    const model = buildMultiCompareModel(packs, fechas);
    const descarteModel = buildCompareDescarteModel(fechas);
    state._compareLast = { packs, fechas, model, descarteModel };
    updateCompareMeta();

    const summaryHtml = `<article class="compare-card tone-summary">
      <h3>Resumen por hoja</h3>
      <div class="compare-table-wrap compare-table-wrap--wide compare-summary-desktop">
        <table class="compare-table compare-table--multi compare-table--summary">
          <thead>
            <tr>
              <th scope="col">Métrica</th>
              ${renderCompareDayHeads(model.days)}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Total jarras</th>
              ${model.days.map((d) => `<td class="num compare-day-col">${fmt(d.total)}</td>`).join('')}
            </tr>
            <tr>
              <th scope="row">Cosechadores</th>
              ${model.days.map((d) => `<td class="num compare-day-col">${fmt(d.nPeople)}</td>`).join('')}
            </tr>
            <tr>
              <th scope="row">Grupos LIC</th>
              ${model.days.map((d) => `<td class="num compare-day-col">${fmt(d.nGrupos)}</td>`).join('')}
            </tr>
            <tr>
              <th scope="row">Prom. jarras/persona</th>
              ${model.days.map((d) => `<td class="num compare-day-col">${fmt(d.avg)}</td>`).join('')}
            </tr>
            <tr class="compare-row-alert">
              <th scope="row">Personas con menos de 30 jarras</th>
              ${model.days.map((d) => `<td class="num compare-day-col is-lt40">${fmt(d.lt40Count)}</td>`).join('')}
            </tr>
          </tbody>
        </table>
      </div>
      ${renderCompareSummaryMobile(model.days)}
    </article>`;

    const lt40All = model.lt40People;
    const lt40Shown = filterCompareLt40People(lt40All, state.compareLt40Q);
    const lt40Html = lt40All.length
      ? `<article class="compare-card tone-people-lt40">
          <div class="compare-card-head-row">
            <div>
              <h3>Personas con menos de 30 jarras</h3>
              <p class="compare-hint" id="compareLt40Hint">${compareLt40HintText(lt40All.length, lt40Shown.length, state.compareLt40Q)}</p>
            </div>
          </div>
          ${renderCompareExportBar(model.days)}
          <div class="compare-lt40-search">
            <span class="compare-lt40-search-ico" id="compareLt40SearchIco" aria-hidden="true"></span>
            <input
              id="compareLt40Search"
              class="search-input"
              type="search"
              placeholder="Buscar DNI o nombre…"
              aria-label="Buscar por DNI o nombre"
              title="Buscar por DNI o nombre"
              autocomplete="off"
              value="${escapeAttr(state.compareLt40Q || '')}"
            />
            <span class="compare-lt40-search-meta" id="compareLt40SearchMeta" aria-live="polite">${state.compareLt40Q ? `${lt40Shown.length} coincidencia${lt40Shown.length === 1 ? '' : 's'}` : ''}</span>
          </div>
          <div class="compare-table-wrap compare-table-wrap--wide compare-lt40-desktop">
            <table class="compare-table compare-table--multi compare-table--people">
              <thead>
                <tr>
                  <th scope="col">Persona</th>
                  <th scope="col">CI</th>
                  <th scope="col">LIC</th>
                  <th scope="col">Supervisor</th>
                  ${renderCompareDayHeads(model.days)}
                  <th scope="col" class="compare-day-col">Días &lt;30</th>
                </tr>
              </thead>
              <tbody id="compareLt40Tbody">
                ${renderCompareLt40TableBody(lt40Shown, state.compareLt40Q)}
              </tbody>
            </table>
          </div>
          <div class="compare-lt40-mobile" id="compareLt40Mobile" aria-live="polite">
            ${renderCompareLt40MobileCards(lt40Shown, state.compareLt40Q)}
          </div>
        </article>`
      : `<article class="compare-card tone-people-lt40">
          <h3>Personas con menos de 30 jarras</h3>
          <p class="compare-empty">Ninguna persona con menos de 30 jarras en las hojas seleccionadas.</p>
          ${renderCompareExportBar(model.days)}
        </article>`;

    const lt40ChartHtml =
      lt40All.length && model.lt40BySupervisor && model.lt40BySupervisor.length
        ? renderCompareLt40SupervisorChartBlock()
        : '';

    const licHtml = model.licWorst
      ? `<article class="compare-card tone-lic">
          <h3>LIC con menos jarras por persona</h3>
          <p class="compare-lead"><strong>${escapeHtml(model.licWorst.lic)}</strong> · ${escapeHtml(model.licWorst.supervisor)}</p>
          <div class="compare-cols compare-cols--multi" style="--compare-cols:${model.days.length}">
            ${model.days
              .map((d, i) => {
                const v = model.licWorst.values[i] || { avg: 0, c: 0, n: 0 };
                return `<div><span class="compare-col-label">${escapeHtml(d.short)}</span><strong>${fmt(v.avg)}</strong><small>jarras/persona · ${fmt(v.c)} total</small></div>`;
              })
              .join('')}
          </div>
        </article>
        <article class="compare-card tone-lic-table">
          <h3>Todos los LIC por hoja</h3>
          <p class="compare-hint">Promedio jarras/persona en cada hoja</p>
          <div class="compare-table-wrap compare-table-wrap--wide compare-lic-desktop">
            <table class="compare-table compare-table--multi">
              <thead>
                <tr>
                  <th scope="col">LIC</th>
                  <th scope="col">Supervisor</th>
                  ${renderCompareDayHeads(model.days)}
                </tr>
              </thead>
              <tbody>
                ${model.licRows
                  .map(
                    (row) =>
                      `<tr><td>${escapeHtml(row.lic)}</td><td>${escapeHtml(row.supervisor)}</td>${row.values
                        .map((v) => `<td class="num compare-day-col">${fmt(v.avg)}</td>`)
                        .join('')}</tr>`
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
          ${renderCompareLicMobile(model.licRows, model.days)}
        </article>`
      : '<p class="compare-empty">Sin datos de LIC para comparar.</p>';

    const lotHtml =
      model.lotLow && model.lotHigh
        ? `<div class="compare-lotes">
            <article class="compare-card tone-lot-low">
              <h3>Lote con menos jarras (suma de hojas)</h3>
              <p class="compare-lead">${escapeHtml(QB.charts.shortLoteLabel(model.lotLow.lote))}</p>
              <div class="compare-cols compare-cols--multi" style="--compare-cols:${model.days.length}">
                ${model.days
                  .map(
                    (d, i) =>
                      `<div><span class="compare-col-label">${escapeHtml(d.short)}</span><strong>${fmt(model.lotLow.values[i] || 0)}</strong></div>`
                  )
                  .join('')}
              </div>
              <small>Total todas las hojas: ${fmt(model.lotLow.total)} jarras</small>
            </article>
            <article class="compare-card tone-lot-high">
              <h3>Lote con más jarras (suma de hojas)</h3>
              <p class="compare-lead">${escapeHtml(QB.charts.shortLoteLabel(model.lotHigh.lote))}</p>
              <div class="compare-cols compare-cols--multi" style="--compare-cols:${model.days.length}">
                ${model.days
                  .map(
                    (d, i) =>
                      `<div><span class="compare-col-label">${escapeHtml(d.short)}</span><strong>${fmt(model.lotHigh.values[i] || 0)}</strong></div>`
                  )
                  .join('')}
              </div>
              <small>Total todas las hojas: ${fmt(model.lotHigh.total)} jarras</small>
            </article>
          </div>`
        : '';

    const descarteHtml = renderCompareDescarteHtml(descarteModel);

    el.innerHTML = `<div class="compare-grid">${summaryHtml}${descarteHtml}${lt40Html}${lt40ChartHtml}${licHtml}${lotHtml}</div>`;
    bindCompareLt40Search();
    const compareLt40Ico = $('compareLt40SearchIco');
    if (compareLt40Ico && QB.icons) compareLt40Ico.innerHTML = QB.icons.search(18);
    applyCompareLt40Search();
    paintCompareLt40SupervisorChart(model.lt40BySupervisor);
  }

  function renderComparePanel(loadRemote) {
    syncCompareFechaOpts();
    runCompare(loadRemote || state._compareDirty);
  }

  function paintActiveTabHeavy() {
    if (state.tab === 'grupos') {
      renderGrupoMap(state.report);
      state._gruposDirty = false;
    }
    if (state.tab === 'personas') {
      renderWorkersList();
      state._workersDirty = false;
    }
    if (state.tab === 'comparacion' && state._compareDirty) {
      renderComparePanel(true);
    }
    if (state.tab === 'avance') {
      renderRatioSheetBar();
    }
  }

  function scheduleCharts(pack) {
    if (state._chartsTimer) clearTimeout(state._chartsTimer);
    state._chartsTimer = setTimeout(() => {
      state._chartsTimer = 0;
      renderCharts(pack);
    }, 16);
  }

  function updateLiveBadge() {
    updateConnBadge();
  }

  function updateConnBadge() {
    const el = $('netPill');
    const online = typeof navigator !== 'undefined' ? navigator.onLine !== false : true;
    if (!el) return;
    const text = el.querySelector('.status-text');
    if (online) {
      el.className = 'status-chip is-live';
      el.title = 'Datos en vivo · reportes actualizados';
      if (text) {
        text.innerHTML =
          '<span class="status-live-desk">EN VIVO</span><span class="status-live-mob">En línea</span>';
      }
    } else {
      el.className = 'status-chip is-offline';
      el.title = 'Sin internet · datos en caché';
      if (text) text.textContent = 'Sin red';
    }
  }

  function flashHero() {
    const card = document.querySelector('.hero-card.report-hero');
    if (!card) return;
    card.classList.remove('is-fresh');
    void card.offsetWidth;
    card.classList.add('is-fresh');
    setTimeout(() => card.classList.remove('is-fresh'), 1200);
  }

  function hydrateUiIcons() {
    document.querySelectorAll('[data-img].btn-icon').forEach((btn) => {
      if (!btn.dataset.iconReady) {
        btn.innerHTML = QB.icons.download(18);
        btn.dataset.iconReady = '1';
      }
    });
    document.querySelectorAll('[data-share].btn-icon').forEach((btn) => {
      if (!btn.dataset.iconReady) {
        btn.innerHTML = QB.icons.share(18);
        btn.dataset.iconReady = '1';
      }
    });
    document.querySelectorAll('[data-title-ico]').forEach((el) => {
      const kind = el.getAttribute('data-title-ico');
      if (kind && QB.icons.raw) el.innerHTML = QB.icons.raw(kind, 18);
    });
    document.querySelectorAll('[data-tip-ico]').forEach((el) => {
      const kind = el.getAttribute('data-tip-ico');
      if (kind && QB.icons.raw) el.innerHTML = QB.icons.raw(kind, 16);
    });
    document.querySelectorAll('[data-tab-ico]').forEach((el) => {
      const kind = el.getAttribute('data-tab-ico');
      if (kind && QB.icons.raw) el.innerHTML = QB.icons.raw(kind, 16);
    });
    const closeBtn = $('modalCloseBtn');
    if (closeBtn && !closeBtn.dataset.iconReady) {
      closeBtn.innerHTML = QB.icons.close(16);
      closeBtn.dataset.iconReady = '1';
    }
    const alarmIco = document.querySelector('#btnDataWarn .attn-alarm-ico');
    if (alarmIco && QB.icons.alarm) alarmIco.innerHTML = QB.icons.alarm(22);
    const refreshIco = $('icoRefresh');
    if (refreshIco && QB.icons.refresh) refreshIco.innerHTML = QB.icons.refresh(12);
    const authIco = $('icoAuthGate');
    if (authIco && QB.icons.user) authIco.innerHTML = QB.icons.user(13);
    const workersIco = $('workersSearchIco');
    if (workersIco) workersIco.innerHTML = QB.icons.search(18);
    const gruposIco = $('gruposSearchIco');
    if (gruposIco) gruposIco.innerHTML = QB.icons.search(18);
    const pdfExportBtn = $('btnExportReportesPdf');
    if (pdfExportBtn && QB.icons) pdfExportBtn.innerHTML = QB.icons.pdf(18);
    const imgExportBtn = $('btnExportReportesImg');
    if (imgExportBtn && QB.icons) imgExportBtn.innerHTML = QB.icons.image(18);
    const cuadroExportBtn = $('btnExportCuadrosLic');
    if (cuadroExportBtn && QB.icons) cuadroExportBtn.innerHTML = QB.icons.bolt(18);
  }

  function isAppInstalled() {
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
    if (window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches) return true;
    if (navigator.standalone === true) return true;
    return false;
  }

  function isIosDevice() {
    const ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/i.test(ua)) return true;
    if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true;
    return false;
  }

  function isMobileLike() {
    if (isIosDevice()) return true;
    if (/Android|Mobile/i.test(navigator.userAgent || '')) return true;
    if (window.matchMedia && window.matchMedia('(max-width: 900px) and (pointer: coarse)').matches) {
      return true;
    }
    return false;
  }

  function setupInstallPrompt() {
    const banner = $('installBanner');
    if (!banner) return;
    if (location.protocol === 'file:') return;
    if (isAppInstalled()) return;

    const DISMISS_KEY = 'qb-install-dismissed';
    try {
      const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
      const days14 = 14 * 24 * 60 * 60 * 1000;
      if (dismissedAt && Date.now() - dismissedAt < days14) return;
    } catch (_) {}

    const kicker = $('installKicker');
    const title = $('installTitle');
    const copy = $('installCopy');
    const steps = $('installSteps');
    const action = $('installAction');
    const actionText = $('installActionText');
    const actionIco = $('installActionIco');
    const ico = $('installIco');
    const closeBtn = $('installClose');
    const ios = isIosDevice();

    if (ico && QB.icons.phone) ico.innerHTML = QB.icons.phone(20);

    function hideBanner() {
      banner.hidden = true;
    }

    function dismiss() {
      try {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
      } catch (_) {}
      hideBanner();
    }

    if (closeBtn) closeBtn.addEventListener('click', dismiss);

    if (ios) {
      banner.classList.add('is-ios');
      if (kicker) kicker.textContent = 'iPhone / iPad';
      if (title) title.textContent = 'Instalar en iPhone';
      if (copy) {
        copy.textContent =
          'En iPhone no aparece “Instalar” automático. Agrégala así desde Safari:';
      }
      if (steps) {
        steps.hidden = false;
        steps.innerHTML =
          '<li>Toca el botón <b>Compartir</b> (□↑) abajo en Safari</li>' +
          '<li>Elige <b>Agregar a pantalla de inicio</b></li>' +
          '<li>Confirma con <b>Agregar</b></li>';
      }
      if (kicker) kicker.textContent = '¿Se puede descargar?';
      if (title) title.textContent = 'Sí, en el iPhone';
      return;
    }

    if (kicker) kicker.textContent = 'Instalar en el celular';
    if (title) title.textContent = 'Q Berries Reportes';
    if (copy) {
      copy.textContent =
        'Instala la app para abrirla desde tu pantalla de inicio, sin buscar el enlace.';
    }
    if (steps) steps.hidden = true;

    let deferredPrompt = null;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (kicker) kicker.textContent = '¿Se puede descargar?';
      if (title) title.textContent = 'Sí, en el celular';
      if (copy) {
        copy.textContent =
          'Agrégala a la pantalla de inicio y ábrela como app, sin buscar el enlace.';
      }
      banner.hidden = false;
    });

    window.addEventListener('appinstalled', () => {
      try {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
      } catch (_) {}
      hideBanner();
    });

    if (action) {
      action.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        try {
          const choice = await deferredPrompt.userChoice;
          deferredPrompt = null;
          if (choice && choice.outcome === 'accepted') dismiss();
        } catch (_) {
          deferredPrompt = null;
        }
      });
    }

    setTimeout(() => {
      if (!banner.hidden) return;
      if (isAppInstalled()) return;
      if (deferredPrompt) return;
      if (action) action.hidden = true;
      if (copy) {
        copy.textContent =
          'En Chrome: menú ⋮ → “Instalar app” o “Agregar a la pantalla de inicio”.';
      }
      if (steps) {
        steps.hidden = false;
        steps.innerHTML =
          '<li>Abre el menú <b>⋮</b> del navegador</li>' +
          '<li>Toca <b>Instalar app</b> o <b>Agregar a pantalla de inicio</b></li>';
      }
      banner.hidden = false;
    }, 1800);
  }

  function setTab(tab) {
    state.tab = tab || 'resumen';
    document.querySelectorAll('.report-tab').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.tab === state.tab);
    });
    document.querySelectorAll('.report-panel').forEach((panel) => {
      const on = panel.dataset.panel === state.tab;
      panel.hidden = !on;
      panel.classList.toggle('is-active', on);
    });
    if (state.tab === 'personas' && state._workersDirty) {
      renderWorkersList();
      state._workersDirty = false;
    }
    if (state.tab === 'grupos' && state._gruposDirty) {
      renderGrupoMap(state.report);
      state._gruposDirty = false;
    }
    if (state.tab === 'comparacion') {
      renderComparePanel(state._compareDirty);
      if (!state._compareDirty && state._compareLast?.model?.lt40BySupervisor) {
        paintCompareLt40SupervisorChart(state._compareLast.model.lt40BySupervisor);
      }
    }
    if (state.tab === 'avance') {
      renderRatioSheetBar();
      renderRatioChart();
    }
    if (state.tab === 'historial') {
      renderHistorialPage();
    }
    requestAnimationFrame(() => {
      if (QB.charts && QB.charts.resizeAll) QB.charts.resizeAll();
      if (state.tab === 'comparacion' && state._compareLast?.model?.lt40BySupervisor) {
        paintCompareLt40SupervisorChart(state._compareLast.model.lt40BySupervisor);
      }
    });
  }

  function bind() {
    hydrateUiIcons();
    setupInstallPrompt();

    document.querySelectorAll('.report-tab').forEach((btn) => {
      btn.addEventListener('click', () => setTab(btn.dataset.tab));
    });

    const btnCompare = $('btnCompareRun');
    if (btnCompare) {
      btnCompare.addEventListener('click', () => {
        if (btnCompare.classList.contains('is-busy')) return;
        btnCompare.classList.add('is-busy');
        state._compareDirty = true;
        Promise.resolve(runCompare(true)).finally(() => btnCompare.classList.remove('is-busy'));
      });
    }
    const sheetBar = $('compareSheetBar');
    if (sheetBar && !sheetBar.dataset.bound) {
      sheetBar.dataset.bound = '1';
      sheetBar.addEventListener('click', (e) => {
        if (e.target.closest('#compareFechaBtn')) openCompareFechaModal();
      });
    }
    const compareFechaModal = $('compareFechaModal');
    if (compareFechaModal && !compareFechaModal.dataset.bound) {
      compareFechaModal.dataset.bound = '1';
      compareFechaModal.addEventListener('click', (e) => {
        if (e.target.closest('[data-close-compare-fechas]')) {
          closeCompareFechaModal();
          return;
        }
        if (e.target.closest('#compareFechaUltimas')) {
          state._compareDraft = compareOptsSorted()
            .slice(0, COMPARE_MAX_FECHAS)
            .map((o) => o.value);
          renderCompareFechaList();
          return;
        }
        if (e.target.closest('#compareFechaApply')) {
          applyCompareFechaDraft();
          return;
        }
        const opt = e.target.closest('[data-compare-fecha]');
        if (opt) toggleCompareDraft(opt.getAttribute('data-compare-fecha'));
      });
    }

    const ratioBar = $('ratioSheetBar');
    if (ratioBar && !ratioBar.dataset.bound) {
      ratioBar.dataset.bound = '1';
      const btnSolo = $('btnRatioSolo');
      const btnTodas = $('btnRatioTodas');
      const btnExcelRatio = $('btnExcelRatio');
      const btnExcelRatioGt70 = $('btnExcelRatioGt70');
      const btnImgRatio = $('btnImgRatio');
      if (btnSolo) btnSolo.addEventListener('click', () => setRatioMode('solo'));
      if (btnTodas) btnTodas.addEventListener('click', () => setRatioMode('todas'));
      if (btnExcelRatio) {
        btnExcelRatio.addEventListener('click', () => exportRatioExcel(btnExcelRatio));
      }
      const btnImgRatioModulos = $('btnImgRatioModulos');
      if (btnImgRatioModulos) {
        btnImgRatioModulos.addEventListener('click', () =>
          exportRatioModulosImage(btnImgRatioModulos)
        );
      }
      if (btnExcelRatioGt70) {
        btnExcelRatioGt70.addEventListener('click', () => exportRatioExcelGt70(btnExcelRatioGt70));
      }
      if (btnImgRatio) {
        btnImgRatio.addEventListener('click', () => exportRatioImage(btnImgRatio, 'chartDist'));
      }
      const btnImgRatioGt70 = $('btnImgRatioGt70');
      if (btnImgRatioGt70) {
        btnImgRatioGt70.addEventListener('click', () => exportRatioImage(btnImgRatioGt70, 'chartDistGt70'));
      }
      ratioBar.addEventListener('click', (e) => {
        const trigger = e.target.closest('#ratioFechaBtn');
        if (trigger) {
          const root = $('ratioFechaDd');
          const menu = $('ratioSheetChips');
          const open = !(root && root.classList.contains('is-open'));
          if (root) root.classList.toggle('is-open', open);
          if (menu) menu.hidden = !open;
          if (open) placeFechaMenu(root);
          trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
          return;
        }
        const chip = e.target.closest('[data-ratio-fecha]');
        if (!chip) return;
        toggleRatioFecha(chip.getAttribute('data-ratio-fecha'));
      });
    }

    document.addEventListener('click', (e) => {
      const t = e.target;
      if (t && t.closest && (t.closest('#ratioFechaDd') || t.closest('#compareFechaDd') || t.closest('[data-ratio-fecha]') || t.closest('[data-action][data-fecha]'))) return;
      closeRatioFechaMenu();
    });

    bindHeroInteractions();

    let tWorker;
    const busca = $('buscaTrabajador');
    if (busca) {
      busca.addEventListener('input', () => {
        clearTimeout(tWorker);
        tWorker = setTimeout(() => {
          state.workerQ = busca.value.trim();
          renderWorkersList();
        }, 140);
      });
      busca.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          clearTimeout(tWorker);
          state.workerQ = busca.value.trim();
          renderWorkersList(true);
        }
      });
    }

    let tGrupo;
    const buscaG = $('buscaGrupoMap');
    if (buscaG) {
      buscaG.addEventListener('input', () => {
        clearTimeout(tGrupo);
        tGrupo = setTimeout(() => {
          state.grupoQ = buscaG.value.trim();
          renderGrupoMap(state.report);
        }, 140);
      });
    }

    const bindExcel = (id, mode, cut) => {
      const btn = $(id);
      if (!btn) return;
      btn.addEventListener('click', () => {
        const all = peopleOf(state.report);
        const n = Number(cut) > 0 ? Number(cut) : 30;
        /* Mismo corte que las barras: ≤N incluye N; el otro archivo empieza en N+1. */
        const withJarras = all.filter((r) => Number(r.c || 0) > 0);
        const people = withJarras.filter((r) => {
          const c = Number(r.c || 0);
          return mode === 'gt' ? c > n : c <= n;
        });
        const iso = activeFechaIso();
        QB.export.excelPeopleByJarras({
          mode: mode === 'gt' ? 'gt40' : 'lt40',
          cut: n,
          people,
          totalPeople: withJarras.length,
          fecha: iso || '',
          fechaLabel: fechaLabelText(state.fecha)
        });
      });
    };
    bindExcel('btnExcelLt40', 'lt', 30);
    bindExcel('btnExcelGt40', 'gt', 30);
    bindExcel('btnExcelPersonasLt40', 'lt', 40);
    bindExcel('btnExcelPersonasGt40', 'gt', 40);
    const btnExcelRatioGrupos = $('btnExcelRatioGrupos');
    if (btnExcelRatioGrupos) {
      btnExcelRatioGrupos.addEventListener('click', () => exportGruposRatioExcel(btnExcelRatioGrupos));
    }
    const btnExcelPersonasDia = $('btnExcelPersonasDia');
    if (btnExcelPersonasDia) {
      btnExcelPersonasDia.addEventListener('click', () => exportPersonasDiaExcel(btnExcelPersonasDia));
    }

    const btnExportReportes = $('btnExportReportesPdf');
    if (btnExportReportes) {
      btnExportReportes.disabled = false;
      btnExportReportes.classList.remove('is-busy');
      btnExportReportes.addEventListener('click', () => exportAllGrupoReportesPdf(btnExportReportes));
    }
    const btnExportImgs = $('btnExportReportesImg');
    if (btnExportImgs) {
      btnExportImgs.addEventListener('click', () => exportAllGrupoReportesImg(btnExportImgs));
    }
    const btnExportCuadros = $('btnExportCuadrosLic');
    if (btnExportCuadros) {
      btnExportCuadros.addEventListener('click', () => exportAllGrupoCuadrosLic(btnExportCuadros));
    }

    const compareContent = $('compareContent');
    if (compareContent && !compareContent.dataset.exportBound) {
      compareContent.dataset.exportBound = '1';
      compareContent.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-export-compare]');
        if (!btn) return;
        e.preventDefault();
        exportCompareExcel(btn.getAttribute('data-export-compare'), btn.getAttribute('data-fecha'));
      });
    }

    document.querySelectorAll('[data-img]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('is-busy')) return;
        const id = btn.dataset.img;
        if (id === 'chartDist' || id === 'chartDistGt70') {
          exportRatioImage(btn, id);
          return;
        }
        btn.classList.add('is-busy');
        Promise.resolve(QB.export.chartImage(id, id + '.png')).finally(() => btn.classList.remove('is-busy'));
      });
    });
    window.addEventListener('online', () => updateConnBadge());
    window.addEventListener('offline', () => updateConnBadge());
    document.querySelectorAll('[data-share]').forEach((btn) => {
      btn.addEventListener('click', () => QB.export.shareChart(btn.dataset.share, btn.dataset.share));
    });

    const btnWarn = $('btnDataWarn');
    if (btnWarn) {
      btnWarn.addEventListener('click', () => openDataWarnModal());
    }

    const btnRefresh = $('btnRefresh');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => openRefreshModal());
    }
    const btnAuthGate = $('btnAuthGate');
    if (btnAuthGate) {
      btnAuthGate.addEventListener('click', () => openAuthHistorialModal());
    }

    $('modalRoot').addEventListener('click', (e) => {
      const root = $('modalRoot');
      if (!root || root.hidden) return;
      if (e.target.closest('[data-close]')) {
        closeModal();
        return;
      }
      /* Clic fuera del contenido (fondo) */
      if (e.target === root || e.target.classList.contains('modal-backdrop')) {
        closeModal();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal();
        closeRatioFechaMenu();
        closeCompareFechaModal();
        if (QB.select && QB.select._close) QB.select._close();
      }
    });

    setTab(state.tab);
  }

  async function manualRefresh() {
    const btn = $('btnRefresh');
    if (btn && btn.classList.contains('is-busy')) return;
    const text = btn && btn.querySelector('.status-text');
    const hasData = !!(state.rows && state.rows.length);
    const fechaRoot = document.getElementById('fechaDd');
    const fechaBtn = document.getElementById('fechaDdBtn');

    if (btn) btn.classList.add('is-busy');
    if (text) text.textContent = '…';
    if (fechaRoot) fechaRoot.classList.add('is-busy');
    if (fechaBtn) fechaBtn.setAttribute('aria-busy', 'true');

    if (!hasData) {
      document.body.classList.remove('is-ready');
      showLoadModal('Cargando', 'Espera un momento, por favor…');
    }

    try {
      /* Sin fecha = GET del día más reciente (última hoja) */
      const r = await QB.api.refresh({ fecha: '' });
      const pack = r.pack;
      const latest = String((pack && pack.hoy) || '').trim();
      hideSyncBanner();
      if ((pack && pack.data && pack.data.length) || !hasData) {
        applyPack(pack, { requestedFecha: latest || '' });
      }
      if (r.changed && !r.error) {
        flashHero();
        const n = (pack.data && pack.data.length) || 0;
        const label = latest ? fechaLabelText(latest) : 'día actual';
        QB.export.toast('Ya lista · ' + label + ' · ' + n + ' personas', 'ok');
      } else if (!r.error) {
        const hoy = limaHoyIso();
        const diaHoja = fechaIsoKey(latest);
        const pendiente = hoy && diaHoja && diaHoja < hoy ? hoy : diaHoja || hoy;
        const nombre = fmtFechaClara(pendiente).fullLong || fechaLabelText(latest) || 'ese día';
        QB.export.toast('Aún no se tiene data del ' + nombre, 'warn');
      } else if (r.error && hasData) {
        QB.export.toast(
          r.error === 'offline' ? 'Sin red · sigues con lo último' : 'La hoja no respondió · sigues con lo último',
          'warn'
        );
      } else if (!hasData) {
        const n = (pack.data && pack.data.length) || 0;
        if (n) QB.export.toast('Ya lista · ' + n + ' personas', 'ok');
        else QB.export.toast('Sin datos del día', 'warn');
      }
    } catch (err) {
      hideSyncBanner();
      const cached = QB.api.getCachedPack && QB.api.getCachedPack();
      if (cached && (cached.data || []).length) {
        applyPack(cached);
        QB.export.toast('Error de red · mostrando cache', 'warn');
      } else {
        QB.export.toast('Error API: ' + (err && err.message ? err.message : 'error'), 'warn');
      }
    } finally {
      hideLoadModal();
      hideSyncBanner();
      document.body.classList.add('is-ready');
      if (btn) btn.classList.remove('is-busy');
      if (text) text.textContent = 'Actualizar';
      if (fechaRoot) fechaRoot.classList.remove('is-busy');
      if (fechaBtn) fechaBtn.setAttribute('aria-busy', 'false');
      updateConnBadge();
    }
  }

  function showLoadModal(title, copy) {
    const root = $('loadOverlay');
    if (!root) return;
    const t = $('loadTitle');
    const c = $('loadCopy');
    if (t && title) t.textContent = title;
    if (c && copy) c.textContent = copy;
    root.hidden = false;
    root.setAttribute('aria-busy', 'true');
  }

  function hideLoadModal() {
    const root = $('loadOverlay');
    if (!root) return;
    root.hidden = true;
    root.setAttribute('aria-busy', 'false');
  }

  async function refreshMeta(forceLatestDay) {
    const r = await QB.api.refresh({ fecha: forceLatestDay ? '' : state.fecha || '' });
    applyPack(r.pack);
  }

  async function reload(bust) {
    const r = await QB.api.refresh({ fecha: state.fecha || '' });
    applyPack(r.pack);
  }

  /** Huella del pack — evita reutilizar ranking de otro día por error. */
  function packDataKey(pack) {
    if (!pack) return '';
    const k = pack.kpis || {};
    return [
      String(pack.hoy || ''),
      String((pack.data || []).length),
      String(k.totalCajas || 0),
      String(k.totalTrabajadores || 0),
      String(pack.actualizado || '')
    ].join('|');
  }

  /** LIC distintos del día, también los que el mapa no lista. */
  function countUniqueGroups(report) {
    const seen = new Set();
    const add = (g) => {
      const raw = String(g || '').trim();
      if (!raw) return;
      const key = QB.supervisors && QB.supervisors.licKey ? QB.supervisors.licKey(raw) : raw.toUpperCase();
      if (key) seen.add(key);
    };
    for (const r of (report && report.data) || []) add(r.grupo);
    const por = report && report.kpis && report.kpis.porGrupo;
    if (Array.isArray(por)) por.forEach((g) => add(g && g.grupo));
    return seen.size;
  }

  /** Variedad del día y los huertos de esa variedad. No junta Magica con Sekoya Pop. */
  function dayOrigen(report) {
    const byVar = new Map();
    for (const r of (report && report.data) || []) {
      const variedad = String((r && r.variedad) || '').trim();
      if (!variedad) continue;
      const vk = variedad.toLowerCase();
      if (!byVar.has(vk)) byVar.set(vk, { label: variedad, huertos: new Map(), people: new Set() });
      const bucket = byVar.get(vk);
      const huerto = String((r && r.huerto) || '').trim();
      if (huerto) bucket.huertos.set(huerto.toLowerCase(), huerto);
      const ci = String((r && r.ci) || '').replace(/\D/g, '');
      if (ci) bucket.people.add(ci);
    }
    return [...byVar.values()]
      .map((v) => ({
        label: v.label,
        n: v.people.size,
        huertos: [...v.huertos.values()].sort((a, b) => a.localeCompare(b, 'es'))
      }))
      .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label, 'es'));
  }

  function variedadLabelForFecha(fechaKey) {
    const key = String(fechaKey || '').trim();
    let pack = null;
    if (key && String(state.fecha || '') === key && packCoincideFecha(state.report, key)) pack = state.report;
    else if (key && state.comparePacks && packCoincideFecha(state.comparePacks[key], key)) pack = state.comparePacks[key];
    else if (key && QB.api && QB.api.getPackForFecha) pack = QB.api.getPackForFecha(key);
    if (!pack) return '';
    return dayOrigen(pack).map((v) => v.label).join(' · ');
  }

  function paintFechaVariedad(fechaKey, pack) {
    if (pack && pack.hoy && String(pack.hoy) !== String(fechaKey)) return;
    const label = dayOrigen(pack).map((v) => v.label).join(' · ');
    if (!label) return;
    document.querySelectorAll('.fecha-dd-opt[data-value]').forEach((btn) => {
      if (btn.getAttribute('data-value') !== String(fechaKey)) return;
      const el = btn.querySelector('.fecha-dd-opt-var');
      if (el) el.textContent = label;
    });
  }

  function refreshVarietyWall() {
    renderRatioSheetBar();
    renderCompareSheetBar();
    updateCompareMeta();
  }

  /** Huertos del día, con personas distintas en cada uno. */
  function dayHuertos(report) {
    const people = new Map();
    const labels = new Map();
    for (const r of (report && report.data) || []) {
      const raw = String((r && r.huerto) || '').trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      if (!labels.has(key)) labels.set(key, raw);
      const ci = String((r && r.ci) || '').replace(/\D/g, '');
      if (!ci) continue;
      if (!people.has(key)) people.set(key, new Set());
      people.get(key).add(ci);
    }
    return [...labels.entries()]
      .map(([key, label]) => ({ label, n: (people.get(key) && people.get(key).size) || 0 }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }

  /** Personas distintas del día. Licapa II y Licapa III no se suman aparte. */
  function countUniqueWorkers(report) {
    const seen = new Set();
    for (const r of (report && report.data) || []) {
      const key = String(r.ci || '').replace(/\D/g, '');
      if (!key) continue;
      seen.add(key);
    }
    return seen.size;
  }

  /** Una fila por persona (suma jarras del día cargado). */
  function mergeByWorker(report) {
    const byCi = new Map();
    for (const r of report.data || []) {
      if (QB.supervisors && QB.supervisors.isHiddenLic && QB.supervisors.isHiddenLic(r.grupo)) continue;
      const key = String(r.ci || '');
      if (!key) continue;
      const cur = byCi.get(key);
      if (!cur) {
        byCi.set(key, Object.assign({}, r, {
          c: r.c || 0,
          fechas: r.fecha ? [r.fecha] : [],
          lotes: (r.lotes || []).map((l) => ({ lote: l.lote || l, c: Number(l.c) || 0 }))
        }));
      } else {
        cur.c += r.c || 0;
        if (r.fecha && cur.fechas.indexOf(r.fecha) < 0) cur.fechas.push(r.fecha);
        if (r.lotes && r.lotes.length) {
          const map = new Map();
          (cur.lotes || []).forEach((l) => {
            const lk = String(l.lote || '');
            if (!lk) return;
            map.set(lk, (map.get(lk) || 0) + (Number(l.c) || 0));
          });
          r.lotes.forEach((l) => {
            const lk = String(l.lote || l || '');
            if (!lk) return;
            map.set(lk, (map.get(lk) || 0) + (Number(l.c) || 0));
          });
          cur.lotes = [...map.entries()]
            .map(([lote, c]) => ({ lote, c }))
            .sort((a, b) => b.c - a.c)
            .slice(0, 12);
        }
        if ((r.c || 0) > (cur._bestC || 0)) {
          cur._bestC = r.c || 0;
          cur.grupo = r.grupo || cur.grupo;
          cur.variedad = r.variedad || cur.variedad;
          cur.modulo = r.modulo || cur.modulo;
          cur.turno = r.turno || cur.turno;
        }
        if (r.nombreCompleto && (!cur.nombreCompleto || QB.workers.isJunkName(cur.nombre) || QB.workers.isJunkName(cur.apellido))) {
          cur.nombreCompleto = r.nombreCompleto;
          cur.nombre = r.nombre || cur.nombre;
          cur.apellido = r.apellido || cur.apellido;
          cur.activo = r.activo;
        }
      }
    }
    return [...byCi.values()]
      .map((x) => {
        delete x._bestC;
        return x;
      })
      .sort((a, b) => b.c - a.c);
  }

  function peopleOf(report) {
    const src = report || state.report;
    if (!src) return mergeByWorker({ data: [] });
    if (
      src === state.report &&
      state.merged &&
      state.merged.length &&
      state._mergedKey &&
      state._mergedKey === packDataKey(src)
    ) {
      return state.merged;
    }
    return mergeByWorker(src);
  }

  function shortSyncTime(s) {
    const raw = String(s || '').trim();
    if (!raw) return '';
    const m = raw.match(/(\d{1,2}:\d{2}(?::\d{2})?\s*(?:a\.?\s*m\.?|p\.?\s*m\.?)?)/i);
    if (m) return m[1].replace(/\s+/g, ' ');
    return raw.length > 12 ? raw.slice(-11) : raw;
  }

  function heroGaugeRingHtml() {
    const r = 52;
    const c = (2 * Math.PI * r).toFixed(2);
    const arcLen = (parseFloat(c) * 0.82).toFixed(2);
    const gapLen = (parseFloat(c) - parseFloat(arcLen)).toFixed(2);
    return `<svg class="hero-gauge-svg" viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <linearGradient id="heroGaugeGrad" x1="18%" y1="82%" x2="82%" y2="18%">
          <stop offset="0%" stop-color="#2f9e44"/>
          <stop offset="42%" stop-color="#40c057"/>
          <stop offset="100%" stop-color="#22b8cf"/>
        </linearGradient>
      </defs>
      <circle class="hero-gauge-track" cx="60" cy="60" r="${r}" />
      <g class="hero-gauge-spin">
        <circle
          class="hero-gauge-fill"
          cx="60"
          cy="60"
          r="${r}"
          stroke="url(#heroGaugeGrad)"
          stroke-dasharray="${arcLen} ${gapLen}"
          stroke-dashoffset="0"
          data-gauge-c="${c}"
          transform="rotate(-90 60 60)"
        />
      </g>
    </svg>`;
  }

  function animateGaugeNumber(el, target, duration) {
    if (!el) return;
    const to = Math.round(Number(target) || 0);
    const start = performance.now();
    const dur = duration || 980;
    function tick(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = String(Math.round(to * eased));
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = String(to);
    }
    el.textContent = '0';
    requestAnimationFrame(tick);
  }

  function animateHeroGauge() {
    const banner = document.querySelector('.hero-metric-banner');
    const num = banner && banner.querySelector('.hero-gauge-num');
    if (!banner) return;

    const pctVal = Math.min(100, Math.max(0, parseFloat(banner.getAttribute('data-gauge-pct') || '0')));
    banner.classList.remove('is-gauge-live', 'is-gauge-pulse');
    if (num) {
      num.style.animation = 'none';
      num.textContent = '0';
    }
    void banner.offsetWidth;
    banner.classList.add('is-gauge-live');
    if (num) animateGaugeNumber(num, pctVal, 920);
  }

  function pulseHeroGauge() {
    const banner = document.querySelector('.hero-metric-banner');
    if (!banner || !banner.classList.contains('is-gauge-live')) return;
    banner.classList.add('is-gauge-pulse');
    window.setTimeout(function () {
      banner.classList.remove('is-gauge-pulse');
    }, 680);
  }

  /** Módulos oficiales del plano (M1–M5, M10) con jarras + primer turno. */
  function dayModulosYInicio(report) {
    const iso = fechaIsoKey(state.fecha || '') || limaHoyIso();
    const official = (QB.plano && QB.plano.labels && QB.plano.labels()) || ['M1', 'M2', 'M3', 'M4', 'M5', 'M10'];
    const total = official.length;
    const mods = new Set();
    const turnos = [];
    peopleOf(report).forEach((r) => {
      const map = personModulosJarras(r, iso);
      map.forEach((c, m) => {
        if (c > 0 && m) mods.add(String(m).toUpperCase());
      });
      (r.lotes || []).forEach((l) => {
        if ((Number(l && l.c) || 0) <= 0) return;
        const tm = String((l && l.lote) || '').match(/T\s*0*(\d+)/i);
        if (tm) turnos.push(Number(tm[1]));
      });
      if ((Number(r.c) || 0) > 0) {
        const tm2 = String(r.turno || '').match(/T\s*0*(\d+)/i);
        if (tm2) turnos.push(Number(tm2[1]));
      }
    });
    const list = official.filter((m) => mods.has(m));
    const extra = [...mods]
      .filter((m) => official.indexOf(m) < 0)
      .sort((a, b) => (parseInt(a.replace(/\D/g, ''), 10) || 0) - (parseInt(b.replace(/\D/g, ''), 10) || 0));
    const inicio = turnos.length ? 'T' + Math.min.apply(null, turnos) : '';
    return { list: list.concat(extra), inicio, worked: list.length, total };
  }

  function renderHero(report) {
    const menuWasOpen = document.getElementById('fechaDd')?.classList.contains('is-open');
    const k = (report && report.kpis) || {};
    const fechaInfo = state.fecha ? fechaInfoFor(state.fecha) : null;
    const fechaMain = fechaInfo ? fechaInfo.full : 'Sin fecha';
    const fechaShort = fechaInfo ? (fechaInfo.full || fechaInfo.short) : 'Sin fecha';
    const fechaLong = fechaInfo ? (fechaInfo.fullLong || fechaInfo.full) : 'Sin fecha';
    const fecha = fechaLong;
    const people = peopleOf(report);
    const top = people[0];
    const topG = (k.porGrupo || [])[0];
    const syncAt = shortSyncTime(state.syncedAt || (report && report.actualizado) || QB.api.getLastSync() || '');
    const nListed = people.length || k.totalTrabajadores || 0;
    const nPeople = state.cosechadoresTotal || nListed;
    const origen = dayOrigen(report);
    const origenUna = origen.length === 1 ? origen[0] : null;
    const origenNombre = origenUna
      ? origenUna.label
      : origen.map((v) => v.label + ' · ' + fmt(v.n)).join(' · ');
    const origenHuertos = origenUna ? origenUna.huertos.join(' y ') : '';
    const origenTitle = origenUna
      ? fmt(nPeople) + ' cosechadores · ' + origenNombre + (origenHuertos ? ' · ' + origenHuertos : '')
      : origen.map((v) => fmt(v.n) + ' ' + v.label).join(' · ');
    const nGrupos = state.gruposTotal || k.totalGrupos || (k.porGrupo || []).length || 0;
    const dayMods = dayModulosYInicio(report);
    const modsLabel = dayMods.list.length ? dayMods.list.join(' · ') : '—';
    const modsChips = dayMods.list.length
      ? dayMods.list
          .map((m) => {
            const info = QB.plano && QB.plano.moduleOf ? QB.plano.moduleOf(QB.plano.parseModId(m)) : null;
            const badge = info && info.badge ? ` style="--mod-badge:${escapeAttr(info.badge)};--mod-fill:${escapeAttr(info.fill || info.badge)}"` : '';
            return `<b class="hero-mod-chip" data-mod="${escapeAttr(m)}"${badge}>${escapeHtml(m)}</b>`;
          })
          .join('')
      : '—';
    const inicioLabel = dayMods.inicio ? 'Inicio ' + dayMods.inicio : 'Sin hora de inicio';
    const modsFoot = (dayMods.list.length ? 'Módulos del día' : 'Sin módulos') +
      (dayMods.inicio ? ' · ' + inicioLabel : '');
    const totalJarras = Number(k.totalCajas) || 0;
    const factor = factorKgDia();
    const totalKg = totalJarras * factor;
    const factorTxt = fmtFactorKg(factor);
    const avgJarras = k.promedioCajasPorTrabajador || (nListed ? totalJarras / nListed : 0);
    const topJarras = top ? top.c || 0 : 0;
    const leaderJarras = topG ? topG.c || 0 : 0;
    const gaugePct = report && k.totalCajas > 0 && nPeople > 0 ? 100 : report ? 72 : 0;
    const gaugeLabel = gaugePct >= 100 ? 'VALIDADO' : gaugePct > 0 ? 'PARCIAL' : 'SIN DATOS';
    const icons = QB.icons || {};
    const opts = state.fechaOpts || [];
    const hasFechaSelect = opts.length > 0;

    const fechaSelectHtml = hasFechaSelect
      ? `<div class="fecha-dd" id="fechaDd">
          <button
            type="button"
            class="fecha-dd-trigger"
            id="fechaDdBtn"
            aria-haspopup="listbox"
            aria-expanded="false"
            aria-label="Fecha de cosecha"
            title="Elige la fecha de cosecha"
          >
            <span class="fecha-dd-ico" aria-hidden="true">${QB.icons.clock(16)}</span>
            <span class="fecha-dd-text">
              <span class="fecha-dd-kicker">Fecha de cosecha</span>
              <span class="fecha-dd-value fecha-dd-value-long">${escapeHtml(fechaLong)}</span>
              <span class="fecha-dd-value fecha-dd-value-short">${escapeHtml(fechaShort)}</span>
            </span>
            <span class="fecha-dd-chev" aria-hidden="true">${QB.icons.chevronRight(12)}</span>
          </button>
          <div class="fecha-dd-menu" id="fechaDdMenu" role="listbox" aria-label="Fechas disponibles" hidden>
            <p class="fecha-dd-menu-title">Seleccionar día</p>
            ${opts
              .map((o) => {
                const info = o.display ? fmtFechaClara(o.display) : null;
                const active = o.value === state.fecha ? ' is-active' : '';
                const filasMeta = o.filas ? fmt(o.filas) + ' registros' : '';
                const varLabel = variedadLabelForFecha(o.value);
                const hojaNom = o.nombre || '';
                const extra = [hojaNom, varLabel].filter(Boolean).join(' · ');
                const title = (info ? info.fullLong : hojaNom) + (extra ? ' · ' + extra : '') + (filasMeta ? ' · ' + filasMeta : '');
                return `<button
                  type="button"
                  class="fecha-dd-opt${active}"
                  role="option"
                  data-value="${escapeAttr(o.value)}"
                  aria-selected="${o.value === state.fecha ? 'true' : 'false'}"
                  title="${escapeAttr(title)}"
                >
                  <span class="fecha-dd-opt-main">
                    <span class="fecha-dd-opt-week">${escapeHtml(info ? info.weekdayLong || info.weekday : hojaNom)}</span>
                    <span class="fecha-dd-opt-line">${escapeHtml(info ? info.line || info.short : hojaNom)}</span>
                    <span class="fecha-dd-opt-var">${escapeHtml(extra)}</span>
                  </span>
                  ${filasMeta ? `<span class="fecha-dd-opt-meta">${escapeHtml(filasMeta)}</span>` : ''}
                  <span class="fecha-dd-opt-check" aria-hidden="true"></span>
                </button>`;
              })
              .join('')}
          </div>
        </div>`
      : `<span class="fecha-picker-static" title="Fecha de cosecha">${escapeHtml(fecha)}</span>`;

    $('heroSummary').innerHTML = `
      <article class="hero-card report-hero hero-card--fecha-only" title="Fecha de cosecha · ${escapeAttr(fecha)}${syncAt ? ` · actualizado ${escapeAttr(syncAt)}` : ''}">
        <div class="report-kicker" title="Fecha de cosecha y última sincronización">
          ${fechaSelectHtml}
          ${syncAt ? `<span class="fecha-sync" title="Última actualización de datos"><span class="fecha-sync-label">Actualizado</span><span class="fecha-sync-time">${escapeHtml(syncAt)}</span></span>` : ''}
        </div>
      </article>

        <div class="hero-metric hero-metric-banner hero-metric-exec hero-banner-section" data-gauge-pct="${gaugePct}" title="Total del día: ${fmt(k.totalCajas)} jarras cosechadas · ${escapeAttr(fecha)}">
          <div class="hero-metric-inner hero-metric-split">
            <div class="hero-banner-main">
              <img
                class="hero-metric-bg-img"
                src="./assets/FONDO.jpg"
                alt=""
                decoding="async"
                loading="eager"
              />
              <div class="hero-metric-bg-fill hero-banner-mobile-only" aria-hidden="true"></div>
              <div class="hero-metric-overlay-left" aria-hidden="true"></div>
              <div class="hero-banner-glass hero-desk-only">
                <p class="hero-banner-eyebrow">${escapeHtml(fechaMain)} · LICAPA</p>
                <h3 class="hero-banner-title">Avance de cosecha</h3>
                <p class="hero-banner-sub">Informe operativo del día</p>
                <p class="hero-banner-desc">Jarras por grupo LIC y cosechador (CI) en una sola plataforma.</p>
                <div class="hero-banner-foot">
                  <span class="hero-banner-loc">${icons.map ? icons.map(14) : ''} Licapa · Q Berries</span>
                  <span class="hero-banner-live"><span class="hero-live-dot" aria-hidden="true"></span> Datos en vivo</span>
                </div>
              </div>
              <div class="metric-panel metric-panel-main hero-banner-mobile-only">
                <span class="metric-label">Total del día</span>
                <div class="metric-figures">
                  <div class="metric-figure">
                    <p class="value">${fmt(totalJarras)}</p>
                    <span class="unit">Jarras</span>
                  </div>
                  <div class="metric-figure-rule" aria-hidden="true"></div>
                  <div class="metric-figure">
                    <p class="value value-kg">${fmt(totalKg)}</p>
                    <span class="unit">Kg netos</span>
                  </div>
                </div>
                <p class="metric-kg-note" id="metricKgNote" title="El peso es aproximado según lo que llega en QPack. Se multiplica las jarras por el factor del día.">
                  Peso aproximado según QPack · <b class="metric-kg-factor">× ${escapeHtml(factorTxt)}</b>
                </p>
                <div class="metric-subrow">
                  <span class="metric-chip" title="Cosechadores registrados"><b>${fmt(nPeople)}</b><em>Personas</em></span>
                  <span class="metric-chip" title="Grupos LIC activos"><b>${fmt(nGrupos)}</b><em>Grupos</em></span>
                  <span class="metric-chip" title="Promedio por cosechador"><b>${fmt(avgJarras)}</b><em>Promedio</em></span>
                </div>
              </div>
            </div>
            <aside class="hero-banner-side hero-desk-only" aria-label="Validación y totales del día">
              <header class="hero-side-head">
                <span class="hero-side-ico" aria-hidden="true">${icons.checkCircle ? icons.checkCircle(18) : ''}</span>
                <span>Validación del reporte</span>
              </header>
              <div class="hero-gauge-wrap" role="img" aria-label="${gaugePct}% ${gaugeLabel}">
                ${heroGaugeRingHtml()}
                <div class="hero-gauge-center">
                  <strong class="hero-gauge-num" data-gauge-target="${gaugePct}">0</strong>
                  <span class="hero-gauge-lbl">${escapeHtml(gaugeLabel)}</span>
                </div>
              </div>
              <p class="hero-side-kicker">Total cosechado · ${escapeHtml(fechaMain)}</p>
              <div class="hero-side-total" title="${fmt(totalJarras)} jarras · ${fmt(totalKg)} kg (× ${factor})">
                <div class="hero-side-total-item">
                  <strong>${fmt(totalJarras)}</strong>
                  <span>jarras</span>
                </div>
                <div class="hero-side-total-item">
                  <p class="hero-kg-line">
                    <strong id="heroKgValue">${fmt(totalKg)}</strong>
                    <span>kg</span>
                  </p>
                  <div class="hero-kg-factors" role="group" aria-label="Factor jarra a kg">
                    ${(esDiaMagica() ? [KG_MAGICA, 1.12, 1.14] : KG_FACTORS).map(
                      (f) =>
                        `<button type="button" class="hero-kg-factor${f === factor ? ' is-on' : ''}" data-kg-factor="${f}" data-jarras="${totalJarras}" aria-pressed="${f === factor ? 'true' : 'false'}" title="kg = jarras × ${f}">${Number(f).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 4 })}</button>`
                    ).join('')}
                  </div>
                </div>
              </div>
              <div class="hero-side-stats">
                <div class="hero-side-stat" title="${escapeAttr(origenTitle || 'Cosechadores del día')}">
                  <strong>${fmt(nPeople)}</strong>
                  <span>Cosechadores</span>
                  ${origenNombre ? `<span class="hero-side-huertos">${escapeHtml(origenNombre)}</span>` : ''}
                  ${origenHuertos ? `<span class="hero-side-huertos-sub">${escapeHtml(origenHuertos)}</span>` : ''}
                </div>
                <div class="hero-side-stat hero-side-stat--mods" title="${escapeAttr(modsLabel)}${dayMods.inicio ? ' · ' + inicioLabel : ''}">
                  <strong class="hero-mod-list">${modsChips}</strong>
                  <span>${escapeHtml(modsFoot)}</span>
                </div>
              </div>
              <div class="hero-side-note">
                <span class="hero-side-note-ico" aria-hidden="true">${icons.info ? icons.info(15) : ''}</span>
                <span>Información actualizada automáticamente${syncAt ? ` · ${escapeHtml(syncAt)}` : ''}</span>
              </div>
            </aside>
          </div>
        </div>

      <div class="report-stats" aria-label="Indicadores del día">
          <button type="button" class="report-stat tone-people is-tappable" data-stat-tip="people" aria-label="Cosechadores · ver detalle">
            <span class="stat-label">Cosechadores</span>
            <div class="stat-main">
              <strong>${fmt(nPeople)}</strong>
              ${statSparkSvg('people')}
            </div>
            <span class="stat-foot">${escapeHtml(origenNombre ? origenNombre + (origenHuertos ? ' · ' + origenHuertos : '') : 'Personal activo')}</span>
          </button>
          <button type="button" class="report-stat tone-groups is-tappable" data-stat-tip="groups" aria-label="Grupos LIC · ver detalle">
            <span class="stat-label">Grupos LIC</span>
            <div class="stat-main">
              <strong>${fmt(nGrupos)}</strong>
              ${statSparkSvg('groups')}
            </div>
            <span class="stat-foot">Equipos en campo</span>
          </button>
          <button type="button" class="report-stat tone-leader is-tappable" data-stat-tip="leader" aria-label="Grupo líder · ver detalle">
            <span class="stat-label">Grupo líder</span>
            <div class="stat-main">
              <strong title="${escapeAttr(topG ? (topG.grupo || shortGrupo(topG.grupo)) : '')}">${escapeHtml(topG ? shortGrupo(topG.grupo) : '—')}</strong>
              ${statSparkSvg('leader')}
            </div>
            <span class="stat-foot">${fmt(leaderJarras)} jarras</span>
          </button>
          <button type="button" class="report-stat tone-top is-tappable" data-stat-tip="top" aria-label="Mejor cosechador · ver detalle">
            <span class="stat-label">Mejor cosechador</span>
            <div class="stat-main">
              <strong title="${escapeAttr(top ? (QB.avatars.realName(top) || ('CI ' + top.ci)) : '')}">${escapeHtml(top ? (QB.avatars.shortName(top) || ('CI ' + top.ci)) : '—')}</strong>
              ${statSparkSvg('top')}
            </div>
            <span class="stat-foot">${fmt(topJarras)} jarras</span>
          </button>
        </div>
    `;
    animateHeroGauge();
    if (menuWasOpen) {
      requestAnimationFrame(() => openFechaMenu());
    }
    window.setTimeout(function () {
      const stats = document.querySelector('.report-stats');
      if (stats) {
        stats.classList.remove('is-spark-live');
        void stats.offsetWidth;
        stats.classList.add('is-spark-live');
      }
    }, 950);
  }

  function statSparkSvg(variant) {
    const sets = {
      people: [
        [11, 19],
        [4, 26],
        [13, 17],
        [26, 4]
      ],
      groups: [
        [4, 26],
        [9, 21],
        [12, 18],
        [25, 5]
      ],
      leader: [
        [14, 16],
        [6, 24],
        [18, 12],
        [24, 6]
      ],
      top: [
        [27, 3],
        [4, 26],
        [18, 12],
        [28, 2]
      ]
    };
    const bars = sets[variant] || sets.people;
    const xs = [1, 13, 25, 37];
    const rects = bars
      .map(function (bar, i) {
        return `<rect class="stat-spark-bar stat-spark-bar--${i + 1}" x="${xs[i]}" y="${bar[0]}" width="7" height="${bar[1]}" rx="2"/>`;
      })
      .join('');
    return `<svg class="stat-spark" viewBox="0 0 48 32" aria-hidden="true">${rects}</svg>`;
  }

  function shortGrupo(g) {
    return String(g || '—').replace(/^Grupo\s+/i, '') || '—';
  }

  function renderGrupoMap(report) {
    const el = $('grupoMap');
    const meta = $('gruposMeta');
    if (!el) return;
    const fecha = fechaIsoKey(state.fecha || '');
    let grupos = QB.charts.buildGrupoStats((report && report.data) || []);
    if (!grupos.length) {
      const k = (report && report.kpis) || {};
      grupos = (k.porGrupo || []).map((g) => ({
        grupo: g.grupo,
        c: Number(g.c) || 0,
        n: 0,
        avg: 0
      }));
    }
    const q = String(state.grupoQ || '').trim().toLowerCase();
    if (q) {
      grupos = grupos.filter((g) => {
        const full = String(g.grupo || '').toLowerCase();
        const short = shortGrupo(g.grupo).toLowerCase();
        const jefe = QB.supervisors
          ? (
              QB.supervisors.label(g.grupo, fecha) +
              ' ' +
              QB.supervisors.fullLabel(g.grupo, fecha)
            ).toLowerCase()
          : '';
        return full.indexOf(q) >= 0 || short.indexOf(q) >= 0 || jefe.indexOf(q) >= 0;
      });
    }
    grupos.sort((a, b) => {
      const ra = (Number(a.n) || 0) > 0 ? (Number(a.c) || 0) / Number(a.n) : 0;
      const rb = (Number(b.n) || 0) > 0 ? (Number(b.c) || 0) / Number(b.n) : 0;
      return rb - ra || (Number(b.c) || 0) - (Number(a.c) || 0);
    });
    const maxR = Math.max(
      ...grupos.map((g) => ((Number(g.n) || 0) > 0 ? (Number(g.c) || 0) / Number(g.n) : 0)),
      1
    );
    if (meta) {
      meta.textContent = state.grupoQ
        ? `${grupos.length} coincidencia${grupos.length === 1 ? '' : 's'}`
        : `${grupos.length} grupos · toca para ver personas`;
    }
    if (!grupos.length) {
      el.innerHTML = `<p class="workers-empty">${
        state.grupoQ ? `Sin grupos para “${escapeHtml(state.grupoQ)}”` : 'Sin grupos en este día'
      }</p>`;
      return;
    }
    el.innerHTML = grupos
      .map((g, i) => {
        const peopleN = Number(g.n) || 0;
        const jefe = QB.supervisors ? QB.supervisors.label(g.grupo, fecha) : '';
        const jefeFull = QB.supervisors ? QB.supervisors.fullLabel(g.grupo, fecha) : '';
        const ratio = peopleN > 0 ? Number(g.c || 0) / peopleN : 0;
        const ratioTxt = peopleN > 0 ? fmt(ratio) : '—';
        const pct = Math.max(4, Math.round((ratio / maxR) * 100));
        const ratioFormula =
          peopleN > 0
            ? `${fmt(g.c)} jarras ÷ ${peopleN} cosech. = ratio ${ratioTxt}`
            : `${fmt(g.c)} jarras`;
        return `<button type="button" class="grupo-map-row" role="listitem" data-grupo="${escapeAttr(g.grupo)}" title="#${i + 1} · ${escapeAttr(shortGrupo(g.grupo))} · ${ratioFormula}${jefeFull ? ` · Supervisor: ${escapeAttr(jefeFull)}` : ''} · toca para ver el equipo">
          <span class="grupo-map-rank" title="Puesto #${i + 1} por ratio">${i + 1}</span>
          <span class="grupo-map-body">
            <span class="grupo-map-top">
              <strong title="${escapeAttr(g.grupo)}">${escapeHtml(shortGrupo(g.grupo))}</strong>
              <em title="${escapeAttr(ratioFormula)}">${
                peopleN > 0
                  ? `${fmt(g.c)} jarras - <span class="grupo-ratio">Ratio: ${ratioTxt}</span>`
                  : `${fmt(g.c)} jarras`
              }</em>
            </span>
            <span class="grupo-map-bar" aria-hidden="true"><span style="width:${pct}%"></span></span>
            <span class="grupo-map-sub">${
              jefeFull
                ? `<span class="grupo-jefe">Jefe: ${escapeHtml(jefeFull)}</span> · `
                : jefe
                ? `<span class="grupo-jefe">Jefe: ${escapeHtml(jefe)}</span> · `
                : ''
            }${peopleN} pers. · <span class="grupo-ratio" title="${escapeAttr(ratioFormula)}">ratio ${ratioTxt}</span> · ${escapeHtml(g.grupo)}</span>
          </span>
          <span class="vista-go" aria-hidden="true">${QB.icons.chevronRight(16)}</span>
        </button>`;
      })
      .join('');
    el.querySelectorAll('.grupo-map-row').forEach((btn) => {
      btn.addEventListener('click', () => openGrupoWorkersModal(btn.dataset.grupo));
    });
  }

  function scrollToId(id) {
    const n = document.getElementById(id);
    if (n) n.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function workersOfGrupo(grupoKey) {
    const people = peopleOf(state.report);
    const g = String(grupoKey || '');
    return people.filter((r) => String(r.grupo || '') === g);
  }

  function exportGruposRatioExcel(btn) {
    if (!QB.export || typeof QB.export.excelGruposRatio !== 'function') {
      if (QB.export && QB.export.toast) QB.export.toast('Exportación no lista', 'warn');
      return;
    }
    const report = state.report;
    if (!report) {
      QB.export.toast('Sin datos del día', 'warn');
      return;
    }
    const stats = QB.charts.buildGrupoStats((report && report.data) || []);
    if (!stats.length) {
      QB.export.toast('Sin grupos para exportar', 'warn');
      return;
    }
    if (btn) {
      btn.disabled = true;
      btn.classList.add('is-busy');
    }
    try {
      const fecha = activeFechaIso();
      const rows = stats.map((g) => {
        const people = workersOfGrupo(g.grupo);
        let lt30 = 0;
        let gte30 = 0;
        people.forEach((r) => {
          const c = Number(r.c || 0);
          if (c > 0 && c <= 30) lt30 += 1;
          else if (c >= 31) gte30 += 1;
        });
        const cosechadores = Number(g.n) || people.length || 0;
        const jarras = Number(g.c) || 0;
        const ratio = cosechadores > 0 ? Math.round((jarras / cosechadores) * 100) / 100 : 0;
        const formula =
          cosechadores > 0
            ? `${fmt(jarras)} jarras - Ratio: ${fmt(ratio)}`
            : '';
        const jefe =
          (QB.supervisors &&
            (QB.supervisors.fullLabel(g.grupo, fecha) || QB.supervisors.label(g.grupo, fecha))) ||
          '';
        return {
          grupo: shortGrupo(g.grupo),
          grupoFull: g.grupo,
          supervisor: jefe,
          ratio,
          formula,
          jarras,
          cosechadores,
          lt30,
          gte30
        };
      });
      QB.export.excelGruposRatio({
        rows,
        fecha: state.fecha || fecha,
        fechaLabel: fechaLabelText(state.fecha) || fecha
      });
    } catch (_) {
      QB.export.toast('No se pudo armar el Ratio Excel', 'warn');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('is-busy');
      }
    }
  }

  function buildGrupoExportMetas() {
    const report = state.report;
    if (!report) return [];
    const stats = QB.charts.buildGrupoStats(report.data || []);
    const grupos = (stats.length ? stats : (report.kpis && report.kpis.porGrupo) || [])
      .slice()
      .sort((a, b) => (b.c || 0) - (a.c || 0));
    const fecha = activeFechaIso();
    return grupos
      .map((g) => {
        const people = workersOfGrupo(g.grupo);
        if (!people.length) return null;
        const jefe =
          (QB.supervisors &&
            (QB.supervisors.fullLabel(g.grupo, fecha) || QB.supervisors.label(g.grupo, fecha))) ||
          '';
        return {
          grupo: g.grupo,
          grupoShort: shortGrupo(g.grupo),
          jefe,
          fecha,
          fechaLabel: fecha ? fechaLabelText(fecha) : 'Sin fecha',
          people,
          syncedAt: state.syncedAt || ''
        };
      })
      .filter(Boolean);
  }

  function lotesListForGrupo(people) {
    const set = new Set();
    (people || []).forEach((r) => {
      if (Array.isArray(r.lotes) && r.lotes.length) {
        r.lotes.forEach((l) => {
          const lot = String(l.lote || '').trim();
          if (lot) set.add(shortLote(lot));
        });
      } else if (r.lote) {
        const lot = String(r.lote).trim();
        if (lot) set.add(shortLote(lot));
      }
    });
    return [...set].filter(Boolean).sort();
  }

  /** Lotes del LIC · filas reales del reporte del día (sin perder lotes al fusionar por CI). */
  function lotesListForGrupoFromReport(grupoKey, report) {
    const g = String(grupoKey || '');
    const set = new Set();
    const rows = (report && report.data) || state.rows || [];
    rows.forEach((r) => {
      if (String(r.grupo || '') !== g) return;
      if (Array.isArray(r.lotes) && r.lotes.length) {
        r.lotes.forEach((l) => {
          const lot = String(l.lote || '').trim();
          if (lot) set.add(shortLote(lot));
        });
      } else if (r.lote) {
        const lot = String(r.lote).trim();
        if (lot) set.add(shortLote(lot));
      }
    });
    return [...set].filter(Boolean).sort();
  }

  function activeFechaIso() {
    return fechaIsoKey(state.fecha || '');
  }

  function lotesLabelForGrupo(people) {
    const list = lotesListForGrupo(people);
    return list.length ? list.join(' · ') : '—';
  }

  function fechaIsoFromLabel(label) {
    const meses = {
      enero: '01',
      febrero: '02',
      marzo: '03',
      abril: '04',
      mayo: '05',
      junio: '06',
      julio: '07',
      agosto: '08',
      septiembre: '09',
      setiembre: '09',
      octubre: '10',
      noviembre: '11',
      diciembre: '12'
    };
    const m = String(label || '').match(/(\d{1,2})\s+de\s+([A-Za-zÁÉÍÓÚáéíóúñ]+)\s+de\s+(\d{4})/i);
    if (!m) return '';
    const mes = meses[
      m[2]
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
    ];
    if (!mes) return '';
    return m[3] + '-' + mes + '-' + String(m[1]).padStart(2, '0');
  }

  function fechaCortaFromIso(iso) {
    const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return '—';
    return m[3] + '/' + m[2] + '/' + m[1].slice(2);
  }

  function buildGrupoCuadroMetas() {
    const report = state.report;
    const fechaIso = activeFechaIso();
    return buildGrupoExportMetas().map((meta) => {
      const people = workersOfGrupo(meta.grupo);
      const totalJr = people.length;
      const totalKgExportables = people.reduce((s, r) => s + (Number(r.c) || 0), 0);
      const descarte = QB.descartes ? QB.descartes.forLic(meta.grupo, fechaIso) : 0;
      const totalJarras = totalKgExportables + descarte;
      const fechaCorta = fechaCortaFromIso(fechaIso);
      const supervisor =
        (QB.supervisors && QB.supervisors.licSupervisorBlock(meta.grupo, fechaIso)) ||
        meta.jefe ||
        'Sin supervisor';
      const supervisorGeneral =
        (QB.supervisors && QB.supervisors.generalSupervisorBlock(meta.grupo, fechaIso)) || '—';
      const lotesList = lotesListForGrupoFromReport(meta.grupo, report);
      return {
        ...meta,
        people,
        fecha: fechaIso,
        fechaLabel: fechaIso ? fechaLabelText(fechaIso) : meta.fechaLabel,
        fechaCorta,
        supervisor,
        supervisorGeneral,
        totalJr,
        totalKgExportables,
        deshidratado: descarte,
        descarte,
        totalJarras,
        ratio: totalJr ? totalJarras / totalJr : 0,
        lotesList,
        lotes: lotesList.length ? lotesList.join(' · ') : '—'
      };
    });
  }

  function setExportIconBtnBusy(btn, busy) {
    if (!btn) return;
    btn.disabled = busy;
    btn.classList.toggle('is-busy', busy);
  }

  async function exportAllGrupoReportesPdf(btn) {
    if (btn) setExportIconBtnBusy(btn, true);
    try {
      if (QB.descartes && QB.descartes.load) {
        await QB.descartes.load(true);
      }

      const fechas = pickFechasComparacionPdf();
      if (fechas.length < 2) {
        QB.export.toast('Se necesitan 2 fechas de descarte para comparar (ej. 31/08 y 01/09)', 'warn');
        return;
      }

      const packs = {};
      await Promise.all(
        fechas.map(async (f) => {
          try {
            let pack = state.comparePacks[f];
            if (f === state.fecha && state.report && (state.report.data || []).length) {
              pack = state.report;
            }
            if (!pack || !(pack.data || []).length) {
              const fetchPromise = QB.api.cargarTodo({ fecha: f, allowCacheFallback: true });
              const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 12000));
              pack = await Promise.race([fetchPromise, timeoutPromise]);
              if (pack && (pack.data || []).length) state.comparePacks[f] = pack;
            }
            if (pack) packs[f] = pack;
          } catch (e) {
            /* sin pack de producción · igual se compara descarte */
          }
        })
      );

      const model = buildComparacionFechasPdfModel(fechas, packs);
      if (!model || !model.rows.length) {
        QB.export.toast('Sin datos de descarte para comparar esas fechas', 'warn');
        return;
      }
      await QB.export.comparacionFechasPdf(model);
    } catch (err) {
      QB.export.toast(
        'Error al exportar PDF: ' + (err && err.message ? err.message : 'falló'),
        'warn'
      );
    } finally {
      if (btn) setExportIconBtnBusy(btn, false);
    }
  }

  function pickFechasComparacionPdf() {
    const descFechas = QB.descartes && QB.descartes.fechas ? QB.descartes.fechas() : [];
    if (descFechas.length >= 2) {
      const active = activeFechaIso();
      if (active && descFechas.indexOf(active) >= 0) {
        const idx = descFechas.indexOf(active);
        const other = descFechas[idx - 1] || descFechas[idx + 1];
        if (other) return sortCompareFechas([other, active]);
      }
      return sortCompareFechas(descFechas).slice(-2);
    }
    const opts = (state.fechaOpts || []).map((o) => o.value).filter(Boolean);
    return sortCompareFechas(opts).slice(-2);
  }

  function buildLicStatsFromPack(pack, fecha) {
    const people = mergeByWorker(pack || { data: [] });
    const byLic = {};
    people.forEach((r) => {
      const grupo = String(r.grupo || '');
      if (!grupo) return;
      const lic = QB.supervisors ? QB.supervisors.licKey(grupo) : shortGrupo(grupo);
      if (!byLic[lic]) {
        byLic[lic] = { lic, grupo, kg: 0, jr: 0 };
      }
      byLic[lic].kg += Number(r.c) || 0;
      byLic[lic].jr += 1;
    });
    Object.keys(byLic).forEach((lic) => {
      const row = byLic[lic];
      const desc = QB.descartes ? QB.descartes.forLic(row.grupo || lic, fecha) : 0;
      row.desc = desc;
      row.tot = row.kg + desc;
      row.ratio = row.jr ? row.tot / row.jr : 0;
      const fromDesc =
        QB.descartes && QB.descartes.rowsForFecha
          ? (QB.descartes.rowsForFecha(fecha).find((x) => x.lic === lic) || {}).nombre
          : '';
      row.nombre =
        (QB.supervisors && QB.supervisors.label(row.grupo || lic, fecha)) || fromDesc || '—';
    });
    if (QB.descartes && QB.descartes.rowsForFecha) {
      (QB.descartes.rowsForFecha(fecha) || []).forEach((drow) => {
        const lic = drow.lic;
        if (!lic || byLic[lic]) return;
        const desc = Number(drow.jarras_de_descarte) || 0;
        byLic[lic] = {
          lic,
          grupo: lic,
          kg: 0,
          jr: 0,
          desc,
          tot: desc,
          ratio: 0,
          nombre: drow.nombre || '—'
        };
      });
    }
    return byLic;
  }

  function buildComparacionFechasPdfModel(fechas, packsByFecha) {
    const list = (fechas || []).slice(0, 2);
    if (list.length < 2) return null;
    const f0 = list[0];
    const f1 = list[1];
    const map0 = buildLicStatsFromPack(packsByFecha[f0], f0);
    const map1 = buildLicStatsFromPack(packsByFecha[f1], f1);
    const licSet = new Set([...Object.keys(map0), ...Object.keys(map1)]);
    const licNum = (lic) => {
      const m = String(lic || '').match(/\d+/);
      return m ? parseInt(m[0], 10) : 9999;
    };
    const rows = [...licSet]
      .sort((a, b) => licNum(a) - licNum(b))
      .map((lic) => {
        const a = map0[lic] || { kg: 0, desc: 0, tot: 0, ratio: 0, jr: 0, nombre: '' };
        const b = map1[lic] || { kg: 0, desc: 0, tot: 0, ratio: 0, jr: 0, nombre: '' };
        return {
          lic,
          nombre: b.nombre || a.nombre || '—',
          kg0: a.kg || 0,
          desc0: a.desc || 0,
          tot0: a.tot || 0,
          ratio0: a.ratio || 0,
          kg1: b.kg || 0,
          desc1: b.desc || 0,
          tot1: b.tot || 0,
          ratio1: b.ratio || 0,
          deltaDesc: (b.desc || 0) - (a.desc || 0)
        };
      })
      .filter((r) => r.desc0 > 0 || r.desc1 > 0 || r.kg0 > 0 || r.kg1 > 0);

    const totals = rows.reduce(
      (acc, r) => {
        acc.kg0 += r.kg0;
        acc.desc0 += r.desc0;
        acc.tot0 += r.tot0;
        acc.kg1 += r.kg1;
        acc.desc1 += r.desc1;
        acc.tot1 += r.tot1;
        acc.deltaDesc += r.deltaDesc;
        return acc;
      },
      { kg0: 0, desc0: 0, tot0: 0, kg1: 0, desc1: 0, tot1: 0, deltaDesc: 0 }
    );

    return {
      days: [
        { fecha: f0, corta: fechaCortaFromIso(f0), label: fechaLabelText(f0) },
        { fecha: f1, corta: fechaCortaFromIso(f1), label: fechaLabelText(f1) }
      ],
      rows,
      totals
    };
  }

  async function exportAllGrupoReportesImg(btn) {
    const metas = buildGrupoExportMetas();
    if (!metas.length) {
      QB.export.toast('Sin grupos para exportar', 'warn');
      return;
    }

    if (btn) setExportIconBtnBusy(btn, true);
    try {
      await QB.export.allGrupoTeamPngsZip(metas);
    } catch (err) {
      QB.export.toast(
        'Error al exportar imágenes: ' + (err && err.message ? err.message : 'falló'),
        'warn'
      );
    } finally {
      if (btn) setExportIconBtnBusy(btn, false);
    }
  }

  async function exportAllGrupoCuadrosLic(btn) {
    if (!activeFechaIso()) {
      QB.export.toast('Elige la fecha de cosecha en el selector', 'warn');
      return;
    }
    if (QB.descartes && QB.descartes.load) {
      await QB.descartes.load(true);
    }
    const metas = buildGrupoCuadroMetas();
    if (!metas.length) {
      QB.export.toast('Sin grupos para exportar', 'warn');
      return;
    }

    if (btn) setExportIconBtnBusy(btn, true);
    try {
      await QB.export.allGrupoCuadrosPngsZip(metas);
    } catch (err) {
      QB.export.toast(
        'Error al exportar cuadros: ' + (err && err.message ? err.message : 'falló'),
        'warn'
      );
    } finally {
      if (btn) setExportIconBtnBusy(btn, false);
    }
  }

  function openGruposModal(report) {
    const k = (report && report.kpis) || {};
    openSheetModal({
      title: 'Grupos LIC',
      eyebrow: 'Rendimiento por grupo',
      subtitle: 'Seleccione un grupo para ver a sus trabajadores',
      clearLabel: 'Cerrar',
      colMid: 'Grupo',
      rows: (k.porGrupo || []).slice(0, 40).map((g, i) => {
        const jefe = supervisorShortLabel(g.grupo, state.fecha);
        return {
          key: g.grupo,
          rank: i + 1,
          title: shortGrupo(g.grupo),
          sub: jefe ? 'Jefe: ' + jefe : g.grupo,
          value: fmt(g.c),
          unit: 'jarras'
        };
      }),
      onPick: (key) => openGrupoWorkersModal(key),
      onClear: () => closeModal()
    });
  }

  function openGrupoWorkersModal(grupoKey) {
    state.grupoModal = grupoKey;
    state.grupoWorkerQ = '';
    state.grupoJarFilter = 'all';
    renderGrupoWorkersModal();
  }

  function renderGrupoWorkersModal(openExact) {
    const grupoKey = state.grupoModal || '';
    const q = String(state.grupoWorkerQ || '').trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    const jarFilter = state.grupoJarFilter || 'all';
    const allTeam = workersOfGrupo(grupoKey);
    let people = allTeam;

    if (jarFilter === 'lt40') {
      people = people.filter((r) => {
        const c = Number(r.c || 0);
        return c > 0 && c <= COMPARE_LT40;
      });
    } else if (jarFilter === 'gte40') {
      people = people.filter((r) => Number(r.c || 0) >= COMPARE_GTE58);
    }

    if (q) {
      people = people.filter((r) => {
        const ci = String(r.ci || '').toLowerCase();
        const ape = String(r.apellido || '').toLowerCase();
        const nom = String(r.nombreCompleto || r.nombre || '').toLowerCase();
        if (digits.length >= 2 && ci.indexOf(digits) >= 0) return true;
        if (ape.indexOf(q) >= 0 || nom.indexOf(q) >= 0) return true;
        return false;
      });
    }

    const nLt40 = allTeam.filter((r) => {
      const c = Number(r.c || 0);
      return c > 0 && c <= COMPARE_LT40;
    }).length;
    const nGte40 = allTeam.filter((r) => Number(r.c || 0) >= COMPARE_GTE58).length;
    const totalJarras = allTeam.reduce((s, r) => s + (r.c || 0), 0);
    const jefeFull = supervisorFullLabel(grupoKey);
    const jefeShort = supervisorShortLabel(grupoKey);
    const filterChip = (id, label, count) => {
      const on = jarFilter === id ? ' is-active' : '';
      return `<button type="button" class="jar-filter-btn${on}" data-jar-filter="${id}" title="${escapeAttr(label)}">
        ${escapeHtml(label)} <em>${fmt(count)}</em>
      </button>`;
    };

    $('modalBody').innerHTML = `
      <header class="sheet-head">
        <p class="sheet-eyebrow">Trabajadores del grupo</p>
        <h3 id="modalTitle">${escapeHtml(shortGrupo(grupoKey))}</h3>
        <p class="sheet-sub">${
          jefeFull
            ? `Jefe: <strong>${escapeHtml(jefeShort || jefeFull)}</strong> · `
            : ''
        }${fmt(allTeam.length)} personas · ${fmt(totalJarras)} jarras</p>
      </header>
      <div class="jar-filters" role="group" aria-label="Filtrar por jarras">
        ${filterChip('lt40', '≤ ' + COMPARE_LT40, nLt40)}
        ${filterChip('gte40', COMPARE_GTE58 + ' o más', nGte40)}
        ${filterChip('all', 'Todos', allTeam.length)}
      </div>
      <div class="grupo-search">
        <span class="grupo-search-ico" id="grupoSearchIco" aria-hidden="true"></span>
        <input
          id="buscaGrupoWorker"
          class="search-input"
          type="search"
          autocomplete="off"
          placeholder="Buscar CI o nombre en este grupo…"
          value="${escapeAttr(state.grupoWorkerQ || '')}"
        />
      </div>
      <div class="grupo-workers" id="grupoWorkersList" role="list">
        ${
          people.length
            ? people
                .map((r, i) => {
                  const name = QB.avatars.shortName(r);
                  const label = name || (r.ci ? 'CI ' + r.ci : '—');
                  const full = QB.avatars.realName(r) || label;
                  return `<button type="button" class="worker-row" role="listitem" data-ci="${escapeAttr(r.ci)}" title="#${i + 1} · ${escapeAttr(full)} · CI ${escapeAttr(r.ci)} · ${fmt(r.c)} jarras · toca para detalle">
              ${QB.avatars.img(r, 40)}
              <span class="worker-main">
                <strong title="${escapeAttr(full)}">${escapeHtml(label)}</strong>
                <span title="CI ${escapeAttr(r.ci)}">CI ${escapeHtml(r.ci)} · #${i + 1}</span>
              </span>
              <span class="worker-jarras" title="${fmt(r.c)} jarras">
                <em>${fmt(r.c)}</em>
                <small>jarras</small>
              </span>
            </button>`;
                })
                .join('')
            : `<p class="workers-empty">${
                q || jarFilter !== 'all'
                  ? 'Sin personas en este filtro'
                  : 'Sin trabajadores en este grupo'
              }</p>`
        }
      </div>
      <div class="sheet-foot sheet-foot-row">
        <button type="button" class="btn btn-ghost" id="btnBackGrupos">Volver a grupos</button>
        <button type="button" class="btn btn-primary" id="btnPdfGrupo" title="Descargar PDF del equipo">Descargar PDF</button>
      </div>
    `;

    const root = $('modalRoot');
    const modal = root && root.querySelector('.modal');
    if (modal) modal.classList.add('is-sheet');
    root.hidden = false;

    const ico = $('grupoSearchIco');
    if (ico) ico.innerHTML = QB.icons.search(18);

    document.querySelectorAll('[data-jar-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.grupoJarFilter = btn.getAttribute('data-jar-filter') || 'all';
        renderGrupoWorkersModal();
      });
    });

    const input = $('buscaGrupoWorker');
    if (input) {
      setTimeout(() => {
        if (document.activeElement !== input) {
          /* no forzar focus al cambiar filtro */
        }
      }, 40);
      let t;
      input.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          state.grupoWorkerQ = input.value.trim();
          renderGrupoWorkersModal();
        }, 120);
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          clearTimeout(t);
          state.grupoWorkerQ = input.value.trim();
          renderGrupoWorkersModal(true);
        }
      });
    }

    $('grupoWorkersList').querySelectorAll('.worker-row').forEach((btn) => {
      btn.addEventListener('click', () => {
        const row = people.find((r) => String(r.ci) === String(btn.dataset.ci));
        if (row) openWorkerModal(row);
      });
    });

    const back = $('btnBackGrupos');
    if (back) {
      back.addEventListener('click', () => {
        closeModal();
        setTab('grupos');
      });
    }

    const btnPdf = $('btnPdfGrupo');
    if (btnPdf) {
      btnPdf.addEventListener('click', () => {
        const team = workersOfGrupo(grupoKey);
        if (!team.length) {
          QB.export.toast('Sin trabajadores para el PDF', 'warn');
          return;
        }
        const fechaInfo = state.fecha ? fechaInfoFor(state.fecha) : null;
        QB.export.grupoTeamPdf({
          grupo: grupoKey,
          grupoShort: shortGrupo(grupoKey),
          jefe: jefeFull || jefeShort || '',
          fecha: state.fecha || '',
          fechaLabel: fechaLabelText(state.fecha),
          people: team,
          syncedAt: state.syncedAt || ''
        });
      });
    }

    if (openExact) {
      const exactDigits = String(state.grupoWorkerQ || '').replace(/\D/g, '');
      const exact = people.filter((r) => String(r.ci) === exactDigits);
      if (exact.length === 1) openWorkerModal(exact[0]);
      else if (people.length === 1) openWorkerModal(people[0]);
    }
  }

  function openSheetModal({ title, eyebrow, subtitle, rows, onPick, clearLabel, onClear, colMid }) {
    $('modalBody').innerHTML = `
      <header class="sheet-head">
        ${eyebrow ? `<p class="sheet-eyebrow">${escapeHtml(eyebrow)}</p>` : ''}
        <h3 id="modalTitle">${escapeHtml(title)}</h3>
        <p class="sheet-sub">${escapeHtml(subtitle || '')}</p>
      </header>
      <div class="sheet-list" role="list">
        <div class="sheet-list-head" aria-hidden="true">
          <span>#</span>
          <span>${escapeHtml(colMid || 'Grupo')}</span>
          <span>Jarras</span>
        </div>
        ${(rows || [])
          .map(
            (r) => `<button type="button" class="sheet-row" role="listitem" data-key="${escapeAttr(r.key)}">
              <span class="sheet-rank">${r.rank != null ? r.rank : '·'}</span>
              <span class="sheet-main">
                <strong>${escapeHtml(r.title)}</strong>
                <span>${escapeHtml(r.sub || '')}</span>
              </span>
              <span class="sheet-value">
                <em>${escapeHtml(r.value)}</em>
                <small>${escapeHtml(r.unit || 'jarras')}</small>
              </span>
            </button>`
          )
          .join('')}
      </div>
      <div class="sheet-foot">
        <button type="button" class="btn btn-ghost" id="btnClearGrupo">${escapeHtml(clearLabel || 'Cerrar')}</button>
      </div>
    `;
    const root = $('modalRoot');
    const modal = root && root.querySelector('.modal');
    if (modal) modal.classList.add('is-sheet');
    root.hidden = false;
    $('modalBody').querySelectorAll('.sheet-row').forEach((btn) => {
      btn.addEventListener('click', () => onPick && onPick(btn.dataset.key));
    });
    const clear = $('btnClearGrupo');
    if (clear) {
      clear.addEventListener('click', () => {
        if (onClear) onClear();
        else closeModal();
      });
    }
  }

  function escapeAttr(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;');
  }

  function renderPeople(report) {
    const merged = peopleOf(report).slice(0, 12);
    const rail = $('peopleRail');
    if (!rail) return;
    if (!merged.length) {
      rail.innerHTML = '<p class="muted">Sin trabajadores en este filtro</p>';
      return;
    }
    rail.innerHTML = merged
      .map((r, i) => QB.avatars.chip(r, { rank: i + 1 }))
      .join('');
    rail.querySelectorAll('.person-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const row = merged.find((r) => String(r.ci) === String(btn.dataset.ci));
        if (row) openWorkerModal(row);
      });
    });
  }

  function filteredWorkers() {
    const people = peopleOf(state.report);
    const q = String(state.workerQ || '').trim().toLowerCase();
    if (!q) return people;
    const digits = q.replace(/\D/g, '');
    return people.filter((r) => {
      const ci = String(r.ci || '').toLowerCase();
      const ape = String(r.apellido || '').toLowerCase();
      const nom = String(r.nombreCompleto || r.nombre || '').toLowerCase();
      if (digits.length >= 2 && ci.indexOf(digits) >= 0) return true;
      if (ape.indexOf(q) >= 0 || nom.indexOf(q) >= 0) return true;
      return false;
    });
  }

  function renderWorkersList(openExact) {
    const list = $('workersList');
    const meta = $('workersMeta');
    if (!list) return;
    const people = filteredWorkers();
    if (meta) {
      meta.textContent = state.workerQ
        ? `${people.length} coincidencia${people.length === 1 ? '' : 's'}`
        : `${people.length} trabajadores · toca para ver jarras`;
    }
    if (!people.length) {
      list.innerHTML = `<p class="workers-empty">${
        state.workerQ
          ? `Sin resultados para “${escapeHtml(state.workerQ)}”`
          : 'Sin trabajadores en este día'
      }</p>`;
      return;
    }
    list.innerHTML = people
      .map((r, i) => {
        const name = QB.avatars.shortName(r);
        const label = name || (r.ci ? 'CI ' + r.ci : '—');
        const full = QB.avatars.realName(r) || label;
        return `<button type="button" class="worker-row" role="listitem" data-ci="${escapeAttr(r.ci)}" title="#${i + 1} · ${escapeAttr(full)} · CI ${escapeAttr(r.ci)} · ${escapeAttr(shortGrupo(r.grupo))} · ${fmt(r.c)} jarras · toca para ver detalle">
          ${QB.avatars.img(r, 40)}
          <span class="worker-main">
            <strong title="${escapeAttr(full)}">${escapeHtml(label)}</strong>
            <span title="CI ${escapeAttr(r.ci)} · ${escapeAttr(shortGrupo(r.grupo))}">CI ${escapeHtml(r.ci)} · ${escapeHtml(shortGrupo(r.grupo))} · #${i + 1}</span>
          </span>
          <span class="worker-jarras" title="${fmt(r.c)} jarras cosechadas">
            <em>${fmt(r.c)}</em>
            <small>jarras</small>
          </span>
        </button>`;
      })
      .join('');
    list.querySelectorAll('.worker-row').forEach((btn) => {
      btn.addEventListener('click', () => {
        const row = people.find((r) => String(r.ci) === String(btn.dataset.ci));
        if (row) openWorkerModal(row);
      });
    });
    if (openExact) {
      const digits = String(state.workerQ || '').replace(/\D/g, '');
      const exact = people.filter((r) => String(r.ci) === digits);
      if (exact.length === 1) openWorkerModal(exact[0]);
      else if (people.length === 1) openWorkerModal(people[0]);
    }
  }

  function renderCharts(report) {
    const charts = QB.charts;
    if (!charts || typeof charts.renderDayPack !== 'function') {
      if (QB.export && QB.export.toast) {
        QB.export.toast('Gráficos no cargaron. Recarga la página (Ctrl+Shift+R).', 'warn');
      }
      return;
    }
    const merged = peopleOf(report);
    charts.onWorkerClick = function (row) {
      openWorkerModal(row);
    };
    const varLabel = dayOrigen(report).map((v) => v.label).join(' · ');
    const board = $('chartLiderazgo');
    if (board) board.setAttribute('data-variedad', varLabel);
    const rankMeta = $('supRankMeta');
    if (rankMeta) {
      rankMeta.textContent =
        (varLabel ? varLabel + ' · ' : '') + 'Puestos por ratio · 1.º el más alto · jarras · kg';
    }
    charts.renderDayPack(report, merged);
    renderRatioSheetBar();
    renderRatioChart();
    requestAnimationFrame(function () {
      charts.resizeAll();
    });
  }

  function sortRows() {
    const k = state.sortKey;
    const d = state.sortDir;
    state.rows.sort((a, b) => {
      const av = a[k];
      const bv = b[k];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * d;
      return String(av || '').localeCompare(String(bv || ''), 'es') * d;
    });
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function openWorkerModal(row) {
    const w = QB.workers.get(row.ci);
    const peers = state.rows.filter((r) => String(r.ci) === String(row.ci));
    const breakdown = buildPersonBreakdown(peers, row);
    const total =
      breakdown.reduce((s, r) => s + (r.c || 0), 0) ||
      peers.reduce((s, r) => s + (r.c || 0), 0) ||
      row.c ||
      0;
    const rankList = peopleOf(state.report);
    const rank = rankList.findIndex((r) => String(r.ci) === String(row.ci)) + 1;
    const fromGrupo = !!state.grupoModal;
    const chartItems = breakdown.map((b) => ({
      slot: shortLote(b.lote),
      full: b.lote,
      c: Math.round((b.c || 0) * 100) / 100
    }));

    const jefe = supervisorShortLabel(row.grupo);
    const jefeFull = supervisorFullLabel(row.grupo);

    $('modalBody').innerHTML = `
      <div style="display:flex;gap:0.85rem;align-items:center;margin-bottom:0.85rem">
        ${QB.avatars.img(row, 72)}
        <div>
          <h3 id="modalTitle" style="margin:0">${escapeHtml(QB.avatars.realName(row) || QB.avatars.shortName(row) || (row.ci ? 'CI ' + row.ci : 'Trabajador'))}</h3>
          <p class="meta" style="margin:0.25rem 0 0">CI ${row.ci}${rank ? ` · #${rank} en ranking` : ''} · ${escapeHtml(row.grupo || '—')}
            ${w ? ` · <strong style="color:var(--accent)">Activo padrón</strong>` : ''}
          </p>
        </div>
      </div>
      <div class="modal-grid">
        <div class="modal-stat">
          <span>Total jarras</span>
          <strong>${fmt(total)}</strong>
          ${rank ? `<em>Puesto #${rank} del día</em>` : ''}
        </div>
        <div class="modal-stat">
          <span>Grupo</span>
          <strong>${escapeHtml(shortGrupo(row.grupo) || '—')}</strong>
          ${jefe ? `<em>Jefe: ${escapeHtml(jefeFull || jefe)}</em>` : ''}
        </div>
      </div>
      <aside class="tip-banner tip-banner-modal" role="note">
        <p><b>Transferir datos</b> para mapear tu mapa.</p>
      </aside>
      <p class="muted">Jarras por lote · suma = total de la persona</p>
      <div class="modal-chart" id="chartModal"></div>
      <div style="margin-top:1rem;overflow:auto">
        <table class="data-table">
          <thead><tr><th>Lote</th><th class="num">Jarras</th></tr></thead>
          <tbody>
            ${
              breakdown.length
                ? breakdown
                    .map(
                      (p) =>
                        `<tr><td>${escapeHtml(p.lote)}</td><td class="num">${fmt(p.c)}</td></tr>`
                    )
                    .join('')
                : `<tr><td colspan="2" class="muted">Sin detalle de lote para esta persona</td></tr>`
            }
          </tbody>
        </table>
      </div>
      ${
        fromGrupo
          ? `<div class="sheet-foot" style="margin-top:1rem">
              <button type="button" class="btn btn-ghost" id="btnBackGrupoWorkers">Volver a ${escapeHtml(shortGrupo(state.grupoModal))}</button>
            </div>`
          : ''
      }
    `;
    const root = $('modalRoot');
    if (root) {
      const modal = root.querySelector('.modal');
      if (modal) {
        if (fromGrupo) modal.classList.add('is-sheet');
        else modal.classList.remove('is-sheet');
      }
      root.hidden = false;
    }
    const back = $('btnBackGrupoWorkers');
    if (back) {
      back.addEventListener('click', () => {
        QB.charts.dispose('chartModal');
        renderGrupoWorkersModal();
      });
    }
    requestAnimationFrame(() => {
      QB.charts.renderModalDetalle(chartItems);
      QB.charts.resizeAll();
    });
  }

  /** Solo datos reales de la persona por lote. */
  function buildPersonBreakdown(peers, row) {
    const byKey = new Map();

    function add(lote, c) {
      const lot = String(lote || '').trim() || '(sin lote)';
      const cur = byKey.get(lot) || { lote: lot, c: 0 };
      cur.c += Number(c) || 0;
      byKey.set(lot, cur);
    }

    const list = peers && peers.length ? peers : row ? [row] : [];
    for (const p of list) {
      if (Array.isArray(p.lotes) && p.lotes.length) {
        for (const l of p.lotes) add(l.lote, l.c);
      } else if (p.lote) {
        add(p.lote, p.c);
      } else if (p.c) {
        add('(sin lote)', p.c);
      }
    }

    return [...byKey.values()]
      .map((x) => ({ ...x, c: Math.round(x.c * 100) / 100 }))
      .sort((a, b) => b.c - a.c);
  }

  function shortLote(lote) {
    const s = String(lote || '').trim();
    if (!s || s === '(sin lote)') return s || '—';
    const m = s.match(/L(\d+)\s*-\s*T(\d+)\s*-\s*M(\d+)/i);
    if (m) return `L${m[1]}·T${m[2]}·M${m[3]}`;
    return s.length > 14 ? s.slice(0, 13) + '…' : s;
  }

  /** L220-T9-M5 → M5 · lote del plano oficial manda sobre el sufijo */
  function shortModulo(v) {
    if (QB.plano && typeof QB.plano.modOfLote === 'function') {
      const fromPlano = QB.plano.modOfLote(v);
      if (fromPlano) return fromPlano;
    }
    const s = String(v || '').trim();
    if (!s) return '';
    const m = s.match(/M\s*0*(\d+)/i);
    if (m) return 'M' + Number(m[1]);
    return '';
  }

  /** Módulos con jarras de la persona · L220-T9-M5 → M5 (solo si c > 0) */
  function personModulos(row) {
    const byMod = new Map();
    (row && row.lotes ? row.lotes : []).forEach((l) => {
      const c = Number(l && l.c) || 0;
      if (c <= 0) return;
      const mod = shortModulo(l && (l.lote || l));
      if (!mod) return;
      byMod.set(mod, (byMod.get(mod) || 0) + c);
    });
    /* Si no hay detalle de lotes, usa el módulo top solo si hay jarras */
    if (!byMod.size && row && Number(row.c) > 0) {
      const top = shortModulo(row.modulo);
      if (top) byMod.set(top, Number(row.c) || 0);
    }
    return [...byMod.entries()]
      .filter((e) => e[1] > 0)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map((e) => e[0]);
  }

  function exportPersonasDiaExcel(btn) {
    if (!QB.export || typeof QB.export.excelPersonasDia !== 'function') {
      if (QB.export && QB.export.toast) QB.export.toast('Exportación no lista', 'warn');
      return;
    }
    const people = peopleOf(state.report);
    if (!people.length) {
      QB.export.toast('Sin personas para exportar', 'warn');
      return;
    }
    if (btn) {
      btn.disabled = true;
      btn.classList.add('is-busy');
    }
    try {
      const enriched = people.map((r) => {
        const iso = fechaIsoKey(state.fecha) || limaHoyIso();
        return Object.assign({}, r, {
          modulos: applyModuloFixTemporal(personModulos(r), r, iso)
        });
      });
      QB.export.excelPersonasDia({
        people: enriched,
        fecha: state.fecha,
        fechaLabel: fechaLabelText(state.fecha)
      });
    } catch (_) {
      QB.export.toast('No se pudo armar el Excel', 'warn');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('is-busy');
      }
    }
  }

  /** Imagen de ratios (barras) · una por módulo · día seleccionado */
  async function exportPersonasModulosImage(btn) {
    if (!QB.export || typeof QB.export.modulosRatioPngZip !== 'function') {
      if (QB.export && QB.export.toast) QB.export.toast('Exportación no lista', 'warn');
      return;
    }
    const people = peopleOf(state.report);
    if (!people.length) {
      QB.export.toast('Sin personas con jarras', 'warn');
      return;
    }
    if (btn) {
      btn.disabled = true;
      btn.classList.add('is-busy');
    }
    try {
      const iso = fechaIsoKey(state.fecha) || limaHoyIso();
      const byModulo = new Map();
      people.forEach((r) => {
        if (!(Number(r.c) > 0)) return;
        const mods = personModulosJarras(r, iso);
        mods.forEach((jarras, mod) => {
          if (!(jarras > 0) || !mod) return;
          if (!byModulo.has(mod)) byModulo.set(mod, []);
          byModulo.get(mod).push(Object.assign({}, r, { c: jarras }));
        });
      });
      const modNum = (m) => {
        const x = String(m || '').match(/M\s*0*(\d+)/i);
        return x ? Number(x[1]) : 0;
      };
      const fechaLabels = [fechaLegendDdMmYyyy(state.fecha) || fmtFecha(iso) || 'día'];
      const metas = [...byModulo.entries()]
        .sort((a, b) => modNum(b[0]) - modNum(a[0]) || a[0].localeCompare(b[0]))
        .map(([mod, list]) => {
          const n = modNum(mod);
          return {
            people: list,
            moduloLabel: n ? 'Módulo ' + n : mod,
            fecha: state.fecha || iso || 'dia',
            fechaLabels
          };
        })
        .filter((m) => m.people && m.people.length);
      if (!metas.length) {
        QB.export.toast('Sin personas con jarras por módulo', 'warn');
        return;
      }
      await QB.export.modulosRatioPngZip(metas);
    } catch (_) {
      QB.export.toast('No se pudo generar ratios por módulo', 'warn');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('is-busy');
      }
    }
  }

  function isHistorialModalOpen() {
    const root = $('modalRoot');
    if (!root || root.hidden) return false;
    const modal = root.querySelector('.modal');
    return !!(
      modal &&
      (modal.classList.contains('is-auth-modal') || modal.classList.contains('is-historial-modal'))
    );
  }

  function historialFechasNuevas() {
    const have = Object.create(null);
    ((QB.historial && QB.historial.dias) || []).forEach((f) => {
      have[String(f)] = 1;
    });
    const out = [];
    (state.fechaOpts || []).forEach((o) => {
      const iso = fechaIsoKey((o && (o.display || o.value)) || '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || have[iso]) return;
      if (out.indexOf(iso) < 0) out.push(iso);
    });
    return out.sort();
  }

  function historialFechaAlertHtml() {
    const nuevas = historialFechasNuevas();
    if (!nuevas.length) return '';
    const ico = QB.icons && QB.icons.bell ? QB.icons.bell(18) : '';
    const labels = nuevas.map((f) => fmtFecha(f)).join(' · ');
    const titulo = nuevas.length === 1 ? 'Ingresó fecha' : 'Ingresaron fechas';
    return (
      '<div class="historial-swal" id="historialFechaAlert" role="status">' +
      '<span class="historial-swal-ico" aria-hidden="true">' +
      ico +
      '</span>' +
      '<div><strong>' +
      titulo +
      '</strong><p>' +
      escapeHtml(labels) +
      ' · aún no está en el historial fijo. Pasa el Excel de esa semana.</p></div></div>'
    );
  }

  function refreshHistorialFechaAlert() {
    const host = $('authGateForm') || $('historialFiltro') || $('historialSearchForm');
    if (!host) return;
    let box = $('historialFechaAlert');
    const html = historialFechaAlertHtml();
    if (!html) {
      if (box) box.remove();
      return;
    }
    if (box) {
      box.outerHTML = html;
      return;
    }
    host.insertAdjacentHTML('afterend', html);
  }

  function notifyHistorialFechasNuevas() {
    const nuevas = historialFechasNuevas();
    if (!nuevas.length) return;
    let seen = [];
    try {
      seen = JSON.parse(localStorage.getItem('qb-hist-seen-fechas') || '[]');
    } catch (_) {
      seen = [];
    }
    if (!Array.isArray(seen)) seen = [];
    const fresh = nuevas.filter((f) => seen.indexOf(f) < 0);
    if (!fresh.length) return;
    const labels = fresh.map((f) => fmtFecha(f)).join(' · ');
    if (QB.export && QB.export.toast) {
      QB.export.toast((fresh.length === 1 ? 'Ingresó fecha · ' : 'Ingresaron fechas · ') + labels, 'warn');
    }
    try {
      localStorage.setItem('qb-hist-seen-fechas', JSON.stringify(seen.concat(fresh)));
    } catch (_) {}
  }

  function closeModal() {
    const root = $('modalRoot');
    const wasHist = isHistorialModalOpen();
    if (root) {
      root.hidden = true;
      const modal = root.querySelector('.modal');
      if (modal) {
        modal.classList.remove('is-sheet');
        modal.classList.remove('is-warn-modal');
        modal.classList.remove('is-stat-tip-modal');
        modal.classList.remove('is-encargado-modal');
        modal.classList.remove('is-refresh-modal');
        modal.classList.remove('is-auth-modal');
        modal.classList.remove('is-historial-modal');
      }
    }
    state.grupoModal = '';
    state.grupoWorkerQ = '';
    state.grupoJarFilter = 'all';
    QB.charts.dispose('chartModal');
    if (wasHist && QB.charts && QB.charts.dispose) QB.charts.dispose('chartHistorial');
  }

  async function sha256Hex(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text || '')));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function showAuthModalShell(kind) {
    const root = $('modalRoot');
    const modal = root && root.querySelector('.modal');
    if (modal) {
      modal.classList.add('is-sheet');
      modal.classList.toggle('is-auth-modal', kind === 'gate');
      modal.classList.toggle('is-historial-modal', kind === 'search');
    }
    if (root) root.hidden = false;
  }

  function enterHistorialTab() {
    closeModal();
    setTab('historial');
    const panel = $('panelHistorial');
    if (panel && panel.scrollIntoView) {
      requestAnimationFrame(() => panel.scrollIntoView({ block: 'start', behavior: 'smooth' }));
    }
  }

  function openAuthHistorialModal() {
    if (state.historialOk) {
      enterHistorialTab();
      return;
    }
    const lockIco = QB.icons && QB.icons.lock ? QB.icons.lock(22) : '';
    $('modalBody').innerHTML = `
      <header class="sheet-head auth-gate-head">
        <span class="auth-gate-lock" aria-hidden="true">${lockIco}</span>
        <p class="sheet-eyebrow">Acceso restringido</p>
        <h3 id="modalTitle">Historial autorizado</h3>
        <p class="sheet-sub">Ingrese la contraseña para ver el historial autorizado.</p>
      </header>
      <form id="authGateForm" class="auth-gate-form" autocomplete="off">
        <label class="auth-gate-label" for="authGatePass">Contraseña</label>
        <input
          id="authGatePass"
          class="auth-gate-input"
          type="password"
          name="auth-pass"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          required
        />
        <p class="auth-gate-err" id="authGateErr" hidden>Contraseña incorrecta.</p>
        <button type="submit" class="btn btn-primary auth-gate-submit">Entrar</button>
      </form>
      ${historialFechaAlertHtml()}
    `;
    showAuthModalShell('gate');
    const form = $('authGateForm');
    const input = $('authGatePass');
    const err = $('authGateErr');
    const modal = $('modalRoot') && $('modalRoot').querySelector('.modal');
    if (input) setTimeout(() => input.focus(), 40);
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('.auth-gate-submit');
      if (btn) btn.disabled = true;
      if (err) err.hidden = true;
      try {
        const hex = await sha256Hex(input ? input.value : '');
        if (input) input.value = '';
        if (hex !== AUTH_GATE_HASH) {
          if (err) err.hidden = false;
          if (modal) {
            modal.classList.remove('is-auth-shake');
            void modal.offsetWidth;
            modal.classList.add('is-auth-shake');
          }
          if (input) input.focus();
          return;
        }
        state.historialOk = true;
        enterHistorialTab();
      } catch (_) {
        if (err) {
          err.textContent = 'No se pudo validar el acceso.';
          err.hidden = false;
        }
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }

  function historialSemanaMeta() {
    const H = QB.historial;
    if (!H) return 'Sin módulo de historial';
    const cargada = H.ultimaSemanaCargada || 0;
    const actual = H.semanaActual || 39;
    if (!cargada) return 'Semana actual ' + actual + ' · aún no hay Excel cargado';
    const falta = actual > cargada ? ' · faltan semanas ' + (cargada + 1) + ' a ' + actual : '';
    return 'Semanas cargadas hasta la ' + cargada + ' · estamos en la ' + actual + falta;
  }

  function renderHistorialPage() {
    const page = $('historialPage');
    const meta = $('historialPageMeta');
    if (meta) meta.textContent = historialSemanaMeta();
    if (!page) return;
    if (!state.historialOk) {
      setTab('resumen');
      openAuthHistorialModal();
      return;
    }
    if (page.querySelector('#historialExcel') && page.querySelector('#historialList')) {
      refreshHistorialFechaAlert();
      return;
    }
    page.innerHTML =
      historialFechaAlertHtml() +
      '<div class="historial-licapas" id="historialLicapas" role="group" aria-label="Elegir Licapa">' +
      '<button type="button" class="historial-licapa is-on" data-bloque="i">' +
      '<strong>Licapa I</strong><span>Sekoya Pop · incluye Licapa III</span></button>' +
      '<button type="button" class="historial-licapa" data-bloque="ii">' +
      '<strong>Licapa II</strong><span>Magica · incluye Licapa III</span></button>' +
      '</div>' +
      '<p class="historial-filtro-hint">Licapa I también muestra Licapa III cuando es Sekoya Pop. Licapa II también muestra Licapa III cuando es Magica. Son Excels distintos: déjalos en historial-in\\Licapa I o historial-in\\Licapa II.</p>' +
      '<div class="historial-excel" id="historialExcel">' +
      '<label class="auth-gate-label" for="historialExcelFile">Excel de DNI</label>' +
      '<div class="historial-excel-drop" id="historialExcelDrop" role="button" tabindex="0">' +
      '<input id="historialExcelFile" type="file" accept=".xlsx,.xls,.csv,.txt" hidden />' +
      '<strong>Sube el Excel</strong>' +
      '<span>Columna DNI como en tu planilla. Te saco todos los días, el promedio y si está apto para seguir.</span>' +
      '<em>Elegir archivo</em>' +
      '</div>' +
      '<p class="historial-filtro-hint" id="historialExcelName"></p>' +
      '</div>' +
      '<div id="historialLote" class="historial-lote" hidden></div>' +
      '<label class="auth-gate-label" for="historialFiltro">O filtra a mano · varios DNI con coma</label>' +
      '<input id="historialFiltro" class="auth-gate-input historial-filtro" type="search" placeholder="42500653, 76325611, 78148623" autocomplete="off" />' +
      '<p class="historial-filtro-hint">También puedes pegar un nombre.</p>' +
      '<div class="historial-directorio">' +
      '<div class="historial-directorio-bar">' +
      '<span>Directorio</span>' +
      '<span class="historial-filtro-count" id="historialFiltroCount"></span>' +
      '</div>' +
      '<div class="historial-list-wrap">' +
      '<div class="historial-directorio-cols"><span>Nombre</span><span>DNI</span></div>' +
      '<div id="historialList" class="historial-list"></div>' +
      '</div></div>' +
      '<div id="historialResult" class="historial-result"></div>';
    if (QB.historial) QB.historial.bloqueActivo = state.historialBloque || 'i';
    paintHistorialList('');
    bindHistorialLicapas();
    bindHistorialExcel();
    const filtro = $('historialFiltro');
    if (filtro) {
      filtro.addEventListener('input', () => paintHistorialList(filtro.value));
    }
  }

  function bindHistorialLicapas() {
    const host = $('historialLicapas');
    if (!host) return;
    const paint = (bloque) => {
      state.historialBloque = bloque === 'ii' ? 'ii' : 'i';
      if (QB.historial) QB.historial.bloqueActivo = state.historialBloque;
      host.querySelectorAll('[data-bloque]').forEach((btn) => {
        btn.classList.toggle('is-on', btn.getAttribute('data-bloque') === state.historialBloque);
      });
      const filtro = $('historialFiltro');
      const q = filtro ? filtro.value : '';
      paintHistorialList(q);
      const visible =
        QB.historial &&
        state.historialDni &&
        QB.historial.list(q).some((p) => p.dni === state.historialDni);
      if (!visible) state.historialDni = '';
      renderHistorialResult(state.historialDni);
    };
    host.querySelectorAll('[data-bloque]').forEach((btn) => {
      btn.addEventListener('click', () => paint(btn.getAttribute('data-bloque') || 'i'));
    });
    paint(state.historialBloque || 'i');
  }

  function bindHistorialExcel() {
    const input = $('historialExcelFile');
    const drop = $('historialExcelDrop');
    if (!input || !drop) return;
    const take = async (file) => {
      if (!file || !QB.historial || !QB.historial.readListaDni) return;
      try {
        drop.classList.add('is-busy');
        const dnis = await QB.historial.readListaDni(file);
        const name = $('historialExcelName');
        if (name) name.textContent = file.name + ' · ' + dnis.length + ' DNI';
        if (!dnis.length) {
          if (QB.export && QB.export.toast) QB.export.toast('No leí DNI en ese archivo', 'warn');
          paintHistorialLote([]);
          return;
        }
        const rows = QB.historial.evaluarLista(dnis);
        state.historialLote = rows;
        paintHistorialLote(rows);
        if (QB.export && QB.export.toast) {
          QB.export.toast('Lista leída · ' + rows.length + ' personas', 'ok');
        }
      } catch (err) {
        if (QB.export && QB.export.toast) {
          QB.export.toast(err && err.message ? err.message : 'No se pudo leer el Excel', 'warn');
        }
      } finally {
        drop.classList.remove('is-busy');
        input.value = '';
      }
    };
    input.addEventListener('change', () => {
      if (input.files && input.files[0]) take(input.files[0]);
    });
    drop.addEventListener('click', (e) => {
      if (e.target === input) return;
      input.click();
    });
    drop.addEventListener('dragover', (e) => {
      e.preventDefault();
      drop.classList.add('is-over');
    });
    drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
    drop.addEventListener('drop', (e) => {
      e.preventDefault();
      drop.classList.remove('is-over');
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) take(file);
    });
  }

  function historialFmtNum(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return '—';
    return x.toLocaleString('es-PE', { maximumFractionDigits: 1 });
  }

  function historialDecisionLabel(decision) {
    if (decision === 'NO APTO') return 'En seguimiento';
    if (decision === 'APTO') return 'Puede continuar';
    if (decision === 'SIN DATA') return 'Sin historial';
    return decision || '—';
  }

  function paintHistorialLote(rows) {
    const box = $('historialLote');
    const list = $('historialList');
    if (!box) return;
    if (!rows || !rows.length) {
      box.hidden = true;
      box.innerHTML = '';
      if (list) list.hidden = false;
      return;
    }
    if (list) list.hidden = true;
    const nApto = rows.filter((r) => r.decision === 'APTO').length;
    const nNo = rows.filter((r) => r.decision === 'NO APTO').length;
    const nSin = rows.filter((r) => r.decision === 'SIN DATA').length;
    const dias = ((QB.historial && QB.historial.dias) || []).slice().reverse();
    const dayHeads = dias.map((f) => '<th>' + escapeHtml(QB.historial.fmtFecha(f)) + '</th>').join('');
    box.hidden = false;
    box.innerHTML =
      '<div class="historial-lote-sum">' +
      '<span><b>' +
      rows.length +
      '</b> en la lista</span>' +
      '<span class="is-apto"><b>' +
      nApto +
      '</b> pueden continuar</span>' +
      '<span class="is-no"><b>' +
      nNo +
      '</b> en seguimiento</span>' +
      '<span class="is-sin"><b>' +
      nSin +
      '</b> sin historial</span>' +
      '</div>' +
      '<p class="historial-filtro-hint">En seguimiento = la tendencia baja desde el 7/09. Los días sin asistencia no entran en esa lectura.</p>' +
      '<div class="historial-lote-actions">' +
      '<button type="button" class="btn btn-primary" id="historialLoteXls">Descargar resultado</button>' +
      '</div>' +
      '<div class="historial-lote-wrap"><table class="historial-lote-table"><thead><tr>' +
      '<th>Decisión</th><th>Nombre</th><th>DNI</th><th>Tendencia</th><th>Días</th><th>Sin asistencia</th>' +
      dayHeads +
      '<th>Supervisor</th></tr></thead><tbody>' +
      rows
        .map((r) => {
          const cls =
            r.decision === 'APTO' ? 'is-apto' : r.decision === 'NO APTO' ? 'is-no' : 'is-sin';
          const days = dias
            .map((f) => {
              const d = (r.serie || []).find((x) => x.fecha === f);
              if (d && d.estado === 'ok') return '<td>' + (d.jarras || 0) + '</td>';
              if (d && d.estado === 'falta') return '<td class="is-falta">F</td>';
              return '<td>—</td>';
            })
            .join('');
          return (
            '<tr class="' +
            cls +
            '" data-hist-dni="' +
            escapeHtml(r.dni) +
            '"><td><strong>' +
            escapeHtml(historialDecisionLabel(r.decision)) +
            '</strong></td><td>' +
            escapeHtml(r.nombre || '—') +
            '</td><td>' +
            escapeHtml(r.dni) +
            '</td><td><b>' +
            escapeHtml(r.bajada || '—') +
            '</b></td><td>' +
            r.diasOk +
            '</td><td>' +
            r.diasFalto +
            '</td>' +
            days +
            '<td>' +
            escapeHtml(r.jefe || '—') +
            '</td></tr>'
          );
        })
        .join('') +
      '</tbody></table></div>';
    const xls = $('historialLoteXls');
    if (xls) xls.addEventListener('click', () => exportHistorialLote(rows));
    box.querySelectorAll('[data-hist-dni]').forEach((tr) => {
      tr.addEventListener('click', () => {
        state.historialDni = tr.getAttribute('data-hist-dni') || '';
        renderHistorialResult(state.historialDni);
        const res = $('historialResult');
        if (res && res.scrollIntoView) res.scrollIntoView({ block: 'start', behavior: 'smooth' });
      });
    });
  }

  function exportHistorialLote(rows) {
    if (!QB.export || !QB.export._xlsxFromRows || !rows || !rows.length) {
      if (QB.export && QB.export.toast) QB.export.toast('Nada para descargar', 'warn');
      return;
    }
    const dias = ((QB.historial && QB.historial.dias) || []).slice().reverse();
    const header = ['Decision', 'Nombre', 'DNI', 'Tendencia', 'Dias trabajo', 'Sin asistencia']
      .concat(dias.map((f) => QB.historial.fmtFecha(f)))
      .concat(['Supervisor']);
    const body = rows.map((r) => {
      const dayVals = dias.map((f) => {
        const d = (r.serie || []).find((x) => x.fecha === f);
        if (!d) return '';
        if (d.estado === 'ok') return Number(d.jarras) || 0;
        if (d.estado === 'falta') return 'F';
        return '';
      });
      return [historialDecisionLabel(r.decision), r.nombre || '', r.dni, r.bajada || '', r.diasOk, r.diasFalto]
        .concat(dayVals)
        .concat([r.jefe || '']);
    });
    const bytes = QB.export._xlsxFromRows([header].concat(body), 'Apto historial');
    const blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    QB.export._downloadBlob(blob, 'QBerries_apto_historial.xlsx');
    if (QB.export.toast) QB.export.toast('Excel listo', 'ok');
  }

  function paintHistorialList(q) {
    const box = $('historialList');
    if (!box || !QB.historial) return;
    if (QB.workers && QB.workers.ready && QB.historial.refrescarNombres) QB.historial.refrescarNombres();
    const rows = QB.historial.list ? QB.historial.list(q) : [];
    if (q) box.hidden = false;
    const count = $('historialFiltroCount');
    if (count) {
      const n = rows.length.toLocaleString('es-PE');
      count.textContent = q
        ? n + (rows.length === 1 ? ' coincidencia' : ' coincidencias')
        : n + ' personas';
    }
    if (!rows.length) {
      const bloque = state.historialBloque === 'ii' ? 'Licapa II · Magica' : 'Licapa I · Sekoya Pop';
      box.innerHTML = q
        ? '<p class="historial-empty">Nadie coincide en ' + escapeHtml(bloque) + '. Separa los DNI con coma: 42500653, 76325611</p>'
        : '<p class="historial-empty">Sin personas en ' +
          escapeHtml(bloque) +
          '. Deja el Excel en historial-in\\' +
          (state.historialBloque === 'ii' ? 'Licapa II' : 'Licapa I') +
          '.</p>';
      return;
    }
    const selected = state.historialDni || '';
    box.innerHTML = rows
      .map((p) => {
        const on = p.dni === selected ? ' is-on' : '';
        return (
          '<button type="button" class="historial-row' +
          on +
          '" data-hist-dni="' +
          escapeHtml(p.dni) +
          '"><span class="historial-row-name">' +
          escapeHtml(p.nombre || 'Sin nombre') +
          '</span><span class="historial-row-dni">' +
          escapeHtml(p.dni) +
          '</span></button>'
        );
      })
      .join('');
    box.querySelectorAll('[data-hist-dni]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.historialDni = btn.getAttribute('data-hist-dni') || '';
        box.querySelectorAll('.historial-row').forEach((el) => {
          el.classList.toggle('is-on', el === btn);
        });
        renderHistorialResult(state.historialDni);
      });
    });
  }

  function renderHistorialResult(q) {
    const box = $('historialResult');
    if (!box || !QB.historial) return;
    const dni = QB.historial.normDni(q);
    if (!dni) {
      box.innerHTML = '';
      if (QB.charts) QB.charts.dispose('chartHistorial');
      return;
    }
    const person = QB.historial.find(dni);
    if (!person) {
      box.innerHTML =
        '<p class="historial-empty">Sin historial para <strong>' +
        escapeHtml(dni) +
        '</strong>. ' +
        escapeHtml(historialSemanaMeta()) +
        '.</p>';
      if (QB.charts) QB.charts.dispose('chartHistorial');
      return;
    }
    const st = QB.historial.stats(person);
    const jefes = (st.supervisores || [])
      .map((j) => {
        return (
          '<li><strong>' +
          escapeHtml(j.nombre) +
          '</strong>' +
          (j.lic ? ' · ' + escapeHtml(j.lic) : '') +
          '</li>'
        );
      })
      .join('');
    box.innerHTML =
      '<div class="historial-person">' +
      '<p class="historial-name">' +
      escapeHtml(st.nombre || 'Sin nombre') +
      '</p>' +
      '<p class="historial-dni">DNI ' +
      escapeHtml(st.dni) +
      '</p>' +
      '<div class="historial-kpis">' +
      '<span><b>' +
      escapeHtml(st.bajada || '—') +
      '</b> tendencia</span>' +
      '<span><b>' +
      st.diasTrabajados +
      '</b> días trabajó</span>' +
      '<span><b>' +
      st.diasFalto +
      '</b> días faltó</span>' +
      '<span><b>' +
      (st.supervisores.length || 0) +
      '</b> supervisores</span>' +
      '</div>' +
      (jefes
        ? '<div class="historial-jefes"><p>Supervisores que lo han tenido</p><ul>' + jefes + '</ul></div>'
        : '<p class="muted">Sin supervisor registrado en las semanas cargadas.</p>') +
      '<div class="chart-wrap historial-chart" id="chartHistorial"></div>' +
      '<div class="historial-dias"><table><thead><tr><th>Fecha</th><th>Estado</th><th>Jarras</th><th>Jefe</th></tr></thead><tbody>' +
      (st.serie || [])
        .slice()
        .reverse()
        .map((d) => {
          const est =
            d.estado === 'ok' ? 'Asistió' : d.estado === 'falta' ? 'Faltó' : d.estado === 'permiso' ? 'Permiso' : '—';
          return (
            '<tr class="is-' +
            escapeHtml(d.estado) +
            '"><td>' +
            escapeHtml(d.label) +
            '</td><td>' +
            est +
            '</td><td>' +
            (d.jarras || (d.estado === 'ok' ? 0 : '—')) +
            '</td><td>' +
            escapeHtml(d.supervisor || '—') +
            (d.lic ? ' · ' + escapeHtml(d.lic) : '') +
            '</td></tr>'
          );
        })
        .join('') +
      '</tbody></table></div>' +
      '</div>';
    requestAnimationFrame(() => {
      if (QB.charts && QB.charts.renderHistorialBarras) QB.charts.renderHistorialBarras(st.serie);
    });
  }

  function openRefreshModal() {
    const ver = (QB.config && QB.config.appVersion) || 'm181';
    const syncAt =
      shortSyncTime(state.syncedAt || (state.report && state.report.actualizado) || QB.api.getLastSync() || '') ||
      'sin datos';
    const refreshIco = QB.icons && QB.icons.refresh ? QB.icons.refresh(18) : '';
    const cloudIco = QB.icons && QB.icons.cloud ? QB.icons.cloud(18) : '';

    $('modalBody').innerHTML = `
      <header class="sheet-head">
        <p class="sheet-eyebrow">Actualización</p>
        <h3 id="modalTitle">¿Qué quieres actualizar?</h3>
        <p class="sheet-sub">Última sync de datos: ${escapeHtml(syncAt)}</p>
      </header>
      <div class="refresh-modal-options">
        <button type="button" class="refresh-option-btn" id="btnRefreshData">
          <span class="refresh-option-ico" aria-hidden="true">${refreshIco}</span>
          <span class="refresh-option-text">
            <strong>Actualizar información</strong>
            <span>Buscar los datos más recientes del día · sin internet usa lo guardado</span>
          </span>
        </button>
        <button type="button" class="refresh-option-btn" id="btnRefreshApp">
          <span class="refresh-option-ico" aria-hidden="true">${cloudIco}</span>
          <span class="refresh-option-text">
            <strong>Actualizar app</strong>
            <span>Descargar la versión más reciente con mejoras y correcciones</span>
          </span>
        </button>
      </div>
      <p class="modal-version-foot">Versión ${escapeHtml(ver)}</p>
    `;

    const root = $('modalRoot');
    const modal = root && root.querySelector('.modal');
    if (modal) {
      modal.classList.add('is-sheet');
      modal.classList.add('is-refresh-modal');
    }
    root.hidden = false;

    const btnData = $('btnRefreshData');
    if (btnData) {
      btnData.addEventListener('click', () => {
        closeModal();
        manualRefresh();
      });
    }
    const btnApp = $('btnRefreshApp');
    if (btnApp) {
      btnApp.addEventListener('click', () => updateApp());
    }
  }

  async function updateApp() {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      closeModal();
      QB.export.toast('Sin red · sigues con lo guardado en el celular', 'warn');
      return;
    }
    closeModal();
    showLoadModal('Actualizando app', 'Descargando la versión más reciente…');
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (let i = 0; i < regs.length; i++) {
          await regs[i].unregister();
        }
      }
    } catch (_) {}
    const u = new URL(location.href);
    u.searchParams.set('_v', String(Date.now()));
    location.replace(u.toString());
  }

  function openDataWarnModal() {
    const syncAt =
      shortSyncTime(state.syncedAt || (state.report && state.report.actualizado) || QB.api.getLastSync() || '') ||
      'última sincronización disponible';
    const fecha = state.fecha ? fechaLabelText(state.fecha) : 'día seleccionado';

    $('modalBody').innerHTML = `
      <header class="sheet-head warn-sheet-head">
        <p class="sheet-eyebrow">Aviso operativo</p>
        <h3 id="modalTitle">Datos e internet inestable</h3>
        <p class="sheet-sub">Lea con atención antes de decidir en campo</p>
      </header>
      <div class="warn-modal-body">
        <p class="warn-lead">
          Todo lo que ve aquí es la <strong>última actualización</strong>
          (${escapeHtml(fecha)} · Act. ${escapeHtml(syncAt)}).
        </p>
        <ul class="warn-points">
          <li>
            <strong>Si no ve la data estable:</strong>
            transfiera / suba la información lo más rápido posible y,
            sobre todo, busque una <strong>red estable</strong>.
          </li>
          <li>
            <strong>Siempre se avisará</strong> la actualización o subida de data.
            Motivo: el internet en campo <strong>no es estable</strong> durante la transferencia.
          </li>
          <li>
            <strong>Tenga cuidado con los escaneos.</strong>
            Si hay problemas al escanear, revise conexión, reintente y confirme que el conteo quedó guardado.
          </li>
          <li>
            <strong>Si el LIC no le pertenece a su nombre:</strong>
            es porque está de <strong>apoyo o reemplazo</strong> con el móvil del LIC anterior.
            Avise a <strong>Paolo León</strong> su cambio.
          </li>
        </ul>
        <p class="warn-foot">Solo autorizado para la empresa · Q Berries</p>
      </div>
      <div class="sheet-foot">
        <button type="button" class="btn btn-primary" id="btnCloseDataWarn">Entendido</button>
      </div>
    `;

    const root = $('modalRoot');
    const modal = root && root.querySelector('.modal');
    if (modal) {
      modal.classList.add('is-sheet');
      modal.classList.add('is-warn-modal');
    }
    root.hidden = false;

    const closeBtn = $('btnCloseDataWarn');
    if (closeBtn) closeBtn.addEventListener('click', () => closeModal());
  }

  function exportPdf() {
    const k = (state.report && state.report.kpis) || {};
    const fecha = state.fecha || '';
    const fechas = fecha ? fmtFecha(fecha) : '';
    QB.export.reportPdf({
      fechas,
      actualizado: (state.report && state.report.actualizado) || '',
      kpis: [
        `Total jarras: ${fmt(k.totalCajas)}`,
        `Trabajadores: ${fmt(k.totalTrabajadores)}`,
        `Grupos: ${fmt(k.totalGrupos)}`,
        `Promedio jarras/persona: ${fmt(k.promedioCajasPorTrabajador)}`
      ],
      titles: {
        chartDist: 'Ratios Cosecha / Diario',
        chartDistGt70: 'Más de 70 jarras',
        chartTopLotes: 'Lotes con más jarras',
        chartTopLic: 'LIC con más producción',
        chartLiderazgo: 'Todos los supervisores'
      }
    });
  }

  if ('serviceWorker' in navigator) {
    var host = location.hostname || '';
    var isFile = location.protocol === 'file:';
    if (!isFile) {
      navigator.serviceWorker.register('service-worker.js').catch(function () {});
    }
  }

  window.QB = window.QB || {};
  QB.appFecha = function () {
    return state.fecha || '';
  };
  QB.appFechaIso = function (key) {
    const k = String(key || '').trim();
    return fechaIsoKey(k || state.fecha || '');
  };

  boot().catch(function (err) {
    if (QB.export && QB.export.toast) {
      QB.export.toast('No se pudo cargar: ' + (err && err.message ? err.message : 'error'), 'warn');
    }
  });
})();
