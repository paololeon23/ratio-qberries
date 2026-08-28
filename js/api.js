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
      for (let i = 0; i < idx.length; i++) {
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
        if (idx.length > 8) idx = idx.slice(-8);
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
    const hit = this._packByFecha[k];
    if (!hit || !(hit.data || []).length) return null;
    if (hit.hoy && hit.hoy !== k) return null;
    return hit;
  },

  prefetchFechas(hojas, skipFecha) {
    const skip = String(skipFecha || '').trim();
    (hojas || []).forEach((h) => {
      const f = h && h.fecha;
      if (!f || f === skip) return;
      if (this.getPackForFecha(f)) return;
      this.cargarTodo({ fecha: f, background: true, allowCacheFallback: true });
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

  async _get(url) {
    const res = await fetch(url, { cache: 'no-store', redirect: 'follow' });
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

  async refresh(opts) {
    opts = opts || {};
    const prevVer = this._dataVersion || this._versionOf(this._lastPack);
    const fallback = this.getCachedPack();
    const fecha = String(opts.fecha || '').trim();

    try {
      const pack = await this.cargarTodo({
        allowCacheFallback: false,
        fecha: fecha,
        force: true
      });
      const ver = this._versionOf(pack);
      const changed = !prevVer || ver !== prevVer;
      return { pack: pack, changed: changed, fromCache: !!pack.fromCache, error: null };
    } catch (err) {
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
        const json = await this._get(url);
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
        if (opts.allowCacheFallback !== false) {
          const cached = this.getPackForFecha(fecha) || this.getCachedPack();
          if (cached) return cached;
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

  startDataWatch() {
    if (!QB.config.apiBase || this._pollTimer) return;
    this._pollTimer = setInterval(async () => {
      try {
        const fecha =
          (window.QB && QB.appFecha && QB.appFecha()) ||
          (this._lastPack && this._lastPack.hoy) ||
          '';
        const r = await this.refresh({ fecha: fecha });
        if (r.changed && !r.fromCache) {
          window.dispatchEvent(
            new CustomEvent('qb:data-updated', {
              detail: {
                syncedAt: r.pack.actualizado || '',
                rows: r.pack.count || 0,
                hoy: r.pack.hoy || '',
                pack: r.pack
              }
            })
          );
        }
        window.dispatchEvent(new CustomEvent('qb:data-tick', { detail: r.pack }));
      } catch (_) {}
    }, 60000);
  }
};
