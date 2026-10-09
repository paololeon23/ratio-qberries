/* API: GET todo + cache por fecha (cambio de día instantáneo) */
window.QB = window.QB || {};

QB.api = {
  mode: 'live',
  _dataVersion: null,
  _dataSyncedAt: '',
  _pollTimer: null,
  _lastPack: null,
  _packByFecha: {},
  _inflightMap: {},
  _dayCachesLoaded: false,
  _LS_KEY: 'qb_last_report_v2',
  _LS_INDEX: 'qb_day_index_v3',
  _LS_DAY_PREFIX: 'qb_day_v3_',

  _versionOf(json) {
    if (!json) return '';
    return (
      String(json.actualizado || '') +
      '|' +
      String(json.hoy || '') +
      '|' +
      String(json.count || 0) +
      '|' +
      String((json.kpis && json.kpis.totalCajas) || 0)
    );
  },

  _slimPack(json) {
    const slimData = (json.data || []).map(function (r) {
      return {
        fecha: r.fecha,
        ci: r.ci,
        nombre: r.nombre,
        apellido: r.apellido,
        nombreCompleto: r.nombreCompleto,
        grupo: r.grupo,
        variedad: r.variedad,
        huerto: r.huerto,
        modulo: r.modulo,
        turno: r.turno,
        c: r.c,
        filas: r.filas,
        lotes: (r.lotes || []).slice(0, 5)
      };
    });
    return {
      ok: json.ok,
      api: json.api,
      action: json.action,
      hoy: json.hoy,
      ayer: json.ayer,
      hojas: json.hojas,
      filtros: json.filtros,
      kpis: json.kpis,
      count: json.count,
      data: slimData,
      actualizado: json.actualizado,
      tz: json.tz,
      fromCache: true
    };
  },

  _storePack(fechaKey, pack) {
    if (!pack || pack.ok === false) return;
    const key = String(fechaKey || pack.hoy || '').trim();
    if (!key) return;
    this._packByFecha[key] = pack;
    if (pack.hoy && pack.hoy !== key) this._packByFecha[pack.hoy] = pack;
  },

  _initDayCaches() {
    if (this._dayCachesLoaded) return;
    this._dayCachesLoaded = true;
    try {
      const idx = JSON.parse(localStorage.getItem(this._LS_INDEX) || '[]');
      const start = Math.max(0, idx.length - 8);
      for (let i = start; i < idx.length; i++) {
        const k = String(idx[i] || '').trim();
        if (!k) continue;
        const raw = localStorage.getItem(this._LS_DAY_PREFIX + k);
        if (!raw) continue;
        const json = JSON.parse(raw);
        if (!json || json.ok === false) continue;
        this._storePack(k, this._enrichReport(json));
      }
    } catch (_) {}
  },

  _saveCache(json, opts) {
    opts = opts || {};
    if (!json || !json.ok) return;
    try {
      const slim = this._slimPack(json);
      const key = String(slim.hoy || '').trim();
      const enriched = this._enrichReport(slim);
      if (key) {
        localStorage.setItem(this._LS_DAY_PREFIX + key, JSON.stringify(slim));
        let idx = JSON.parse(localStorage.getItem(this._LS_INDEX) || '[]');
        if (idx.indexOf(key) < 0) idx.push(key);
        if (idx.length > 40) idx = idx.slice(-40);
        localStorage.setItem(this._LS_INDEX, JSON.stringify(idx));
        this._storePack(key, enriched);
      }
      const active = this._activeFecha();
      const isActiveDay = !key || !active || key === active;
      if (!opts.background || isActiveDay) {
        localStorage.setItem(this._LS_KEY, JSON.stringify(slim));
        this._lastPack = enriched;
      }
    } catch (_) {}
  },

  _readCache() {
    try {
      const raw = localStorage.getItem(this._LS_KEY);
      if (!raw) return null;
      const json = JSON.parse(raw);
      if (!json || json.ok === false) return null;
      return this._enrichReport(json);
    } catch (_) {
      return null;
    }
  },

  getPackForFecha(fecha) {
    this._initDayCaches();
    const k = String(fecha || '').trim();
    if (!k) return null;
    let hit = this._packByFecha[k];
    if (!hit || !(hit.data || []).length) {
      try {
        const raw = localStorage.getItem(this._LS_DAY_PREFIX + k);
        if (raw) {
          const json = JSON.parse(raw);
          if (json && json.ok !== false && (json.data || []).length) {
            hit = this._enrichReport(json);
            this._storePack(k, hit);
          }
        }
      } catch (_) {}
    }
    if (!hit || !(hit.data || []).length) return null;
    if (hit.hoy && hit.hoy !== k) return null;
    return hit;
  },

  _pausarRed() {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    this._redPausaHasta = Date.now() + (offline ? 20000 : 10 * 60 * 1000);
  },

  _redPausada() {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
    return !!(this._redPausaHasta && Date.now() < this._redPausaHasta);
  },

  prefetchFechas(hojas, skipFecha) {
    if (this._redPausada()) return;
    const skip = String(skipFecha || '').trim();
    const pending = [];
    (hojas || []).forEach((h) => {
      const f = h && h.fecha;
      if (!f || f === skip) return;
      if (this.getPackForFecha(f)) return;
      pending.push(f);
    });
    if (!pending.length) return;
    /* Una fecha a la vez · Apps Script se ahoga si pedimos todas juntas */
    this._prefetchQueue = this._prefetchQueue || Promise.resolve();
    const self = this;
    pending.forEach((f) => {
      this._prefetchQueue = this._prefetchQueue
        .then(function () {
          if (self._redPausada()) return;
          return self.cargarTodo({ fecha: f, background: true, allowCacheFallback: true });
        })
        .catch(function () {});
    });
  },

  getCachedPack() {
    this._initDayCaches();
    const active = this._activeFecha();
    if (active) {
      const day = this.getPackForFecha(active);
      if (day && (day.data || []).length) return day;
    }
    if (this._lastPack && (this._lastPack.data || []).length) return this._lastPack;
    const cached = this._readCache();
    if (cached) {
      this._lastPack = cached;
      this._storePack(cached.hoy, cached);
      this._dataSyncedAt = cached.actualizado || '';
      this._dataVersion = this._versionOf(cached);
      this.mode = 'cache';
    }
    return this._lastPack;
  },

  async _get(url, opts) {
    opts = opts || {};
    if (!opts.forzar && this._redPausada()) throw new Error('Sin red');
    const ms = Number(opts.timeoutMs) || 20000;
    const ctrl = typeof AbortSignal !== 'undefined' && AbortSignal.timeout
      ? { signal: AbortSignal.timeout(ms) }
      : {};
    let res;
    try {
      res = await fetch(url, Object.assign({ cache: 'no-store', redirect: 'follow' }, ctrl));
    } catch (err) {
      this._pausarRed();
      throw err;
    }
    const text = await res.text();
    if (!res.ok) throw new Error('HTTP ' + res.status);
    try {
      return JSON.parse(text);
    } catch (_) {
      throw new Error('Respuesta no JSON');
    }
  },

  _enrichReport(json) {
    const copy = Object.assign({}, json);
    copy.data = (json.data || []).map((r) => QB.workers.enrich(r));
    return copy;
  },

  clearLocalDataCache() {
    this._inflightMap = {};
  },

  _activeFecha() {
    return window.QB && QB.appFecha ? String(QB.appFecha() || '').trim() : '';
  },

  _shouldPromotePack(pack, fecha, opts) {
    opts = opts || {};
    const packFecha = String((pack && pack.hoy) || fecha || '').trim();
    const active = this._activeFecha();
    if (!opts.background) return true;
    if (!active) return !packFecha;
    return packFecha === active;
  },

  getLastSync() {
    return this._dataSyncedAt || '';
  },

  async _refreshOnce(fecha) {
    return this.cargarTodo({
      allowCacheFallback: false,
      fecha: fecha,
      force: true
    });
  },

  async refresh(opts) {
    opts = opts || {};
    const prevVer = this._dataVersion || this._versionOf(this._lastPack);
    const fallback = this.getCachedPack();
    const fecha = String(opts.fecha || '').trim();
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      if (fallback && (fallback.data || []).length) {
        return { pack: fallback, changed: false, fromCache: true, error: 'offline' };
      }
      throw new Error('Sin red');
    }
    this._redPausaHasta = 0;

    try {
      const pack = await this._refreshOnce(fecha);
      const ver = this._versionOf(pack);
      const changed = !prevVer || ver !== prevVer;
      return { pack: pack, changed: changed, fromCache: !!pack.fromCache, error: null };
    } catch (err) {
      /* La primera lectura a veces se corta; el servidor igual guarda y la segunda ya llega. */
      try {
        this._redPausaHasta = 0;
        const pack = await this._refreshOnce(fecha);
        const ver = this._versionOf(pack);
        const changed = !prevVer || ver !== prevVer;
        return { pack: pack, changed: changed, fromCache: !!pack.fromCache, error: null };
      } catch (err2) {
        err = err2;
      }
      if (fallback) {
        return {
          pack: fallback,
          changed: false,
          fromCache: true,
          error: err && err.message ? err.message : 'error'
        };
      }
      throw err;
    }
  },

  async _fetchTodo(fecha, opts) {
    opts = opts || {};
    const key = fecha || 'auto';
    if (this._inflightMap[key]) return this._inflightMap[key];

    let url = QB.config.apiBase + '?action=todo';
    if (fecha) url += '&fecha=' + encodeURIComponent(fecha);
    if (opts.force) url += '&t=' + Date.now();

    this._inflightMap[key] = (async () => {
      try {
        const json = await this._get(url, {
          forzar: !!(opts.force || opts.forzarRed),
          timeoutMs: opts.forzarRed || opts.force ? 50000 : 20000
        });
        if (!json || json.ok === false) throw new Error((json && json.error) || 'API error');

        const n = (json.data && json.data.length) || 0;
        if (n === 0) {
          const prev = this.getPackForFecha(fecha) || this.getCachedPack();
          if (prev && (prev.data || []).length) {
            prev._keptCache = true;
            return prev;
          }
        }

        this.mode = json.fromCache ? 'cache' : 'live';
        const pack = this._enrichReport(json);
        const packFecha = String(pack.hoy || fecha || '').trim();
        if (fecha) this._storePack(fecha, pack);
        if (packFecha && packFecha !== fecha) this._storePack(packFecha, pack);
        if (this._shouldPromotePack(pack, fecha, opts)) {
          this._dataSyncedAt = json.actualizado || '';
          this._dataVersion = this._versionOf(json);
          this._lastPack = pack;
        }
        this._saveCache(json, opts);

        if (opts.background) {
          window.dispatchEvent(
            new CustomEvent('qb:fecha-refreshed', {
              detail: { fecha: pack.hoy || fecha, pack: pack, fromCache: !!json.fromCache }
            })
          );
        }

        return pack;
      } catch (err) {
        this._pausarRed();
        if (opts.allowCacheFallback !== false) {
          const exact = fecha ? this.getPackForFecha(fecha) : null;
          if (exact) return exact;
          if (!fecha) {
            const cached = this.getCachedPack();
            if (cached) return cached;
          }
        }
        throw err;
      } finally {
        delete this._inflightMap[key];
      }
    })();

    return this._inflightMap[key];
  },

  async cargarTodo(opts) {
    opts = opts || {};
    if (!QB.config.apiBase) {
      const cached = this.getCachedPack();
      if (cached) return cached;
      throw new Error('Sin API');
    }

    const fecha = String(opts.fecha || '').trim();
    this._initDayCaches();
    if (opts.forzarRed || opts.force) this._redPausaHasta = 0;

    const instant = !opts.force && this.getPackForFecha(fecha);
    if (instant && (instant.data || []).length) {
      this._lastPack = instant;
      this._dataSyncedAt = instant.actualizado || '';
      this._dataVersion = this._versionOf(instant);
      if (opts.background) {
        this._fetchTodo(fecha, opts);
        return instant;
      }
      if (!opts.noBackgroundRefresh) {
        this._fetchTodo(fecha, { ...opts, background: true });
      }
      return instant;
    }

    if (opts.background && instant) return instant;

    return this._fetchTodo(fecha, opts);
  },

  async listarHojas() {
    const pack = this._lastPack || (await this.cargarTodo());
    return {
      ok: true,
      action: 'listarHojas',
      hojas: pack.hojas || [],
      hoy: pack.hoy || '',
      ayer: pack.ayer || '',
      actualizado: pack.actualizado || '',
      count: (pack.hojas && pack.hojas.length) || 0
    };
  },

  async reporte(opts) {
    opts = opts || {};
    const want = (opts.fechas && opts.fechas[0]) || opts.fecha || '';
    if (this._lastPack && !opts.force) {
      if (!want || want === this._lastPack.hoy) return this._lastPack;
    }
    return this.cargarTodo({ fecha: want });
  },

  async syncNow() {
    const r = await this.refresh();
    return r.pack;
  },

  _hojaConDatos(h) {
    return Number(h && h.filas) > 0 && !!(h && h.fecha);
  },

  _localHojaKeys() {
    this._initDayCaches();
    const keys = {};
    const hojas = (this._lastPack && this._lastPack.hojas) || [];
    hojas.forEach((h) => {
      if (h && h.fecha) keys[h.fecha] = 1;
    });
    try {
      const idx = JSON.parse(localStorage.getItem(this._LS_INDEX) || '[]');
      idx.forEach((k) => {
        if (k) keys[k] = 1;
      });
    } catch (_) {}
    return keys;
  },

  async _meta() {
    const url = QB.config.apiBase + '?action=meta&t=' + Date.now();
    const json = await this._get(url);
    if (!json || json.ok === false) throw new Error((json && json.error) || 'meta');
    return json;
  },

  /** Hojas del API que no están en local, de la más nueva hacia atrás, solo con filas. */
  _hojasNuevas(remote) {
    const local = this._localHojaKeys();
    const nuevas = [];
    for (let i = 0; i < remote.length; i++) {
      const f = remote[i] && remote[i].fecha;
      if (!f) continue;
      if (local[f]) break;
      nuevas.push(remote[i]);
    }
    return nuevas;
  },

  startDataWatch() {
    if (!QB.config.apiBase || this._pollTimer) return;
    if (!this._onlineBound && typeof window !== 'undefined') {
      this._onlineBound = true;
      window.addEventListener('online', () => {
        this._redPausaHasta = 0;
      });
    }
    const tick = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (this._redPausada()) return;
      try {
        const active = (window.QB && QB.appFecha && String(QB.appFecha() || '')) || '';
        const latestBefore = (this._lastPack && this._lastPack.hoy) || '';
        const meta = await this._meta();
        const remote = ((meta && meta.hojas) || []).filter((h) => this._hojaConDatos(h));
        if (!remote.length) {
          window.dispatchEvent(new CustomEvent('qb:data-tick', { detail: this._lastPack || {} }));
          return;
        }
        const nuevas = this._hojasNuevas(remote);
        const latestKey = String(remote[0].fecha || '').trim();
        let pack = null;
        const traer = nuevas.slice().reverse();
        for (let i = 0; i < traer.length; i++) {
          const got = await this._fetchTodo(traer[i].fecha, { force: true, background: true });
          const gotHoy = String((got && got.hoy) || '').trim();
          if (got && !got._keptCache && gotHoy === traer[i].fecha && (got.data || []).length) pack = got;
        }
        let changedLatest = false;
        if (!nuevas.length && latestKey) {
          const r = await this.refresh({ fecha: latestKey });
          if (r && r.pack && (r.pack.data || []).length && !r.error) {
            pack = r.pack;
            changedLatest = !!r.changed;
          }
        }
        if (pack) pack.hojas = remote;
        else if (this._lastPack) this._lastPack.hojas = remote;
        const shown = pack || this._lastPack;
        const newHoy = String((pack && pack.hoy) || latestKey || '').trim();
        const wasOnLatest = !active || active === latestBefore || active === newHoy;
        const hojaNueva = nuevas.length > 0 && !!(pack && (pack.data || []).length);
        if (shown && (hojaNueva || (changedLatest && wasOnLatest))) {
          window.dispatchEvent(
            new CustomEvent('qb:data-updated', {
              detail: {
                syncedAt: (shown && shown.actualizado) || '',
                rows: (pack && (pack.data || []).length) || 0,
                hoy: newHoy,
                pack: pack || shown,
                promote: wasOnLatest && !!(pack && (pack.data || []).length),
                hojaNueva: hojaNueva
              }
            })
          );
        }
        window.dispatchEvent(new CustomEvent('qb:data-tick', { detail: shown || {} }));
      } catch (_) {}
    };
    this._pollTimer = setInterval(tick, 20000);
    setTimeout(tick, 4000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) tick();
    });
  }
};
