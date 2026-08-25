/* API: un GET → toda la data */
window.QB = window.QB || {};

QB.api = {
  mode: 'live',
  _dataVersion: null,
  _dataSyncedAt: '',
  _pollTimer: null,
  _lastPack: null,
  _inflight: null,

  async _get(url) {
    console.log('[QB API] GET', url);
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  },

  _enrichReport(json) {
    json.data = (json.data || []).map((r) => QB.workers.enrich(r));
    return json;
  },

  clearLocalDataCache() {
    this._lastPack = null;
    this._inflight = null;
    try {
      localStorage.removeItem('qb_last_report');
    } catch (_) {}
  },

  getLastSync() {
    return this._dataSyncedAt || '';
  },

  /** Un solo GET: ?action=todo */
  async cargarTodo() {
    if (!QB.config.apiBase) throw new Error('Sin API');
    if (this._inflight) return this._inflight;

    const url = QB.config.apiBase + '?action=todo&t=' + Date.now();
    this._inflight = (async () => {
      try {
        const json = await this._get(url);
        console.log('[QB API] respuesta →', json);
        if (!json || json.ok === false) throw new Error((json && json.error) || 'API error');
        this.mode = 'live';
        this._dataSyncedAt = json.actualizado || '';
        this._dataVersion =
          String(json.actualizado || '') + '|' + String(json.hoy || '') + '|' + String(json.count || 0);
        this._lastPack = this._enrichReport(json);
        try {
          localStorage.setItem('qb_last_report', JSON.stringify(json));
        } catch (_) {}
        return this._lastPack;
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
    this.clearLocalDataCache();
    return this.cargarTodo();
  },

  /** Poll cada 60s — no aborta nada */
  startDataWatch() {
    if (!QB.config.apiBase || this._pollTimer) return;
    this._pollTimer = setInterval(async () => {
      try {
        const pack = await this.cargarTodo();
        const ver =
          String(pack.actualizado || '') + '|' + String(pack.hoy || '') + '|' + String(pack.count || 0);
        if (this._dataVersion && ver !== this._dataVersion) {
          window.dispatchEvent(
            new CustomEvent('qb:data-updated', {
              detail: { syncedAt: pack.actualizado || '', rows: pack.count || 0, hoy: pack.hoy || '' }
            })
          );
        }
        this._dataVersion = ver;
        window.dispatchEvent(new CustomEvent('qb:data-tick', { detail: pack }));
      } catch (e) {
        console.warn('[QB API] poll', e && e.message);
      }
    }, 60000);
  }
};
