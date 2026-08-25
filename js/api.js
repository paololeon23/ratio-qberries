/* API: GET todo + cache local de respaldo (nunca vacío) */
window.QB = window.QB || {};

QB.api = {
  mode: 'live',
  _dataVersion: null,
  _dataSyncedAt: '',
  _pollTimer: null,
  _lastPack: null,
  _inflight: null,
  _LS_KEY: 'qb_last_report_v1',

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

  _saveCache(json) {
    if (!json || !json.ok) return;
    try {
      /* sin enrich: más liviano y estable */
      const slim = Object.assign({}, json);
      localStorage.setItem(this._LS_KEY, JSON.stringify(slim));
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

  /** Último pack bueno en memoria o localStorage */
  getCachedPack() {
    if (this._lastPack && (this._lastPack.data || []).length) return this._lastPack;
    const cached = this._readCache();
    if (cached) {
      this._lastPack = cached;
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

  /** No borra el respaldo local — solo memoria/inflight */
  clearLocalDataCache() {
    this._inflight = null;
  },

  getLastSync() {
    return this._dataSyncedAt || '';
  },

  /**
   * Carga desde red. Si falla y hay cache → devuelve cache (nunca vacío).
   * @returns {{ pack, changed, fromCache, error? }}
   */
  async refresh() {
    const prevVer = this._dataVersion || this._versionOf(this._lastPack);
    const fallback = this.getCachedPack();

    try {
      const pack = await this.cargarTodo({ allowCacheFallback: false });
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

  async cargarTodo(opts) {
    opts = opts || {};
    if (!QB.config.apiBase) {
      const cached = this.getCachedPack();
      if (cached) return cached;
      throw new Error('Sin API');
    }
    if (this._inflight) return this._inflight;

    const url = QB.config.apiBase + '?action=todo&t=' + Date.now();
    this._inflight = (async () => {
      try {
        const json = await this._get(url);
        if (!json || json.ok === false) throw new Error((json && json.error) || 'API error');

        /* Si llega vacío pero teníamos data → conservar respaldo */
        const n = (json.data && json.data.length) || 0;
        if (n === 0) {
          const prev = this.getCachedPack();
          if (prev && (prev.data || []).length) {
            prev._keptCache = true;
            return prev;
          }
        }

        this.mode = json.fromCache ? 'cache' : 'live';
        this._dataSyncedAt = json.actualizado || '';
        this._dataVersion = this._versionOf(json);
        this._lastPack = this._enrichReport(json);
        this._saveCache(json);
        return this._lastPack;
      } catch (err) {
        if (opts.allowCacheFallback !== false) {
          const cached = this.getCachedPack();
          if (cached) return cached;
        }
        throw err;
      } finally {
        this._inflight = null;
      }
    })();

    return this._inflight;
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
    if (this._lastPack && !opts.force) {
      const want = (opts.fechas && opts.fechas[0]) || this._lastPack.hoy;
      if (!want || want === this._lastPack.hoy) return this._lastPack;
    }
    return this.cargarTodo();
  },

  async syncNow() {
    const r = await this.refresh();
    return r.pack;
  },

  startDataWatch() {
    if (!QB.config.apiBase || this._pollTimer) return;
    this._pollTimer = setInterval(async () => {
      try {
        const r = await this.refresh();
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
