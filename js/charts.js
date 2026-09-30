/* Apache ECharts 5 — pan / zoom táctil, 4+ vistas 2026 */
window.QB = window.QB || {};

QB.charts = {
  instances: {},
  onWorkerClick: null,

  /* Colores vivos del logo Q Berries */
  palette: [
    '#e41e26', '#f7941d', '#8dc63f', '#4ab848',
    '#2f9e44', '#ffb347', '#c41e3a', '#6bbf3a',
    '#ff8a3d', '#58c26a'
  ],

  logoPair(i) {
    const pairs = [
      ['#e41e26', '#ff6b6b'],
      ['#f7941d', '#ffd08a'],
      ['#8dc63f', '#c5e88a'],
      ['#4ab848', '#86efac'],
      ['#2f9e44', '#6ee7a8'],
      ['#ff8a3d', '#ffc48a'],
      ['#c41e3a', '#fb7185'],
      ['#6bbf3a', '#b7e36a']
    ];
    return pairs[i % pairs.length];
  },

  rankColor(i) {
    const pair = this.logoPair(i);
    return this.barGrad(pair[0], pair[1], false);
  },

  shareColor(i, n) {
    return this.palette[i % this.palette.length];
  },

  _baseText() {
    return {
      color: '#5f7264',
      fontFamily: 'IBM Plex Sans, Segoe UI, sans-serif'
    };
  },

  /** Eje numérico · etiquetas cortas y sin amontonar */
  _numAxisLabel(extra) {
    const self = this;
    const mobile = this.isMobile();
    return this._label(
      Object.assign(
        {
          fontSize: mobile ? 10 : 11,
          hideOverlap: true,
          margin: 12,
          formatter: (v) => self.fmtK(v)
        },
        extra || {}
      )
    );
  },

  _label(extra) {
    var base = this._baseText();
    if (!extra) return base;
    var out = {};
    for (var k in base) if (Object.prototype.hasOwnProperty.call(base, k)) out[k] = base[k];
    for (var j in extra) if (Object.prototype.hasOwnProperty.call(extra, j)) out[j] = extra[j];
    return out;
  },

  barGrad(from, to, vertical) {
    if (vertical === false) {
      return new echarts.graphic.LinearGradient(0, 0, 1, 0, [
        { offset: 0, color: from },
        { offset: 1, color: to }
      ]);
    }
    return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: from },
      { offset: 1, color: to }
    ]);
  },

  softOf(tip) {
    if (tip === '#d4a017' || tip === '#c49210' || tip === '#e0b83a') return '#f6e8b8';
    if (tip === '#6b2d5b' || tip === '#8f4e7a') return '#e8c9dc';
    return '#c8ebd4';
  },

  fmtFecha(iso) {
    const s = String(iso || '').trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[3] + '/' + m[2] + '/' + m[1];
    return s || '—';
  },

  ensure(id) {
    const el = document.getElementById(id);
    if (!el || typeof echarts === 'undefined') return null;
    if (this.instances[id]) {
      this.instances[id].dispose();
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const chart = echarts.init(el, null, { renderer: 'canvas', devicePixelRatio: dpr });
    this.instances[id] = chart;
    return chart;
  },

  /** Reutiliza instancia (no dispose) — ideal cuando el panel acaba de hacerse visible */
  getOrCreate(id) {
    const el = document.getElementById(id);
    if (!el || typeof echarts === 'undefined') return null;
    let chart = typeof echarts.getInstanceByDom === 'function' ? echarts.getInstanceByDom(el) : null;
    if (!chart || chart.isDisposed()) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      chart = echarts.init(el, null, { renderer: 'canvas', devicePixelRatio: dpr });
    }
    this.instances[id] = chart;
    return chart;
  },

  resetCompareLt40Zoom(chart, start, end, useZoom) {
    if (!chart || chart.isDisposed()) return;
    chart.resize();
    if (!useZoom) return;
    [0, 1].forEach((dataZoomIndex) => {
      chart.dispatchAction({ type: 'dataZoom', dataZoomIndex, start, end });
    });
  },

  isMobile() {
    return window.innerWidth < 900 || ('ontouchstart' in window && window.innerWidth < 1100);
  },

  /**
   * Zoom + pan reales para celular:
   * - pellizcar / rueda = zoom
   * - deslizar = mover
   * - barra = scrub fácil con el dedo
   * axis: 'x' (línea/columnas) | 'y' (barras horizontales)
   */
  zoomOpts(axis, count) {
    const mobile = this.isMobile();
    const isY = axis === 'y';
    const start = 0;
    const end = 100;

    const axisKey = isY ? 'yAxisIndex' : 'xAxisIndex';
    const inside = {
      type: 'inside',
      [axisKey]: 0,
      start,
      end,
      zoomOnMouseWheel: true,
      moveOnMouseMove: true,
      moveOnMouseWheel: false,
      preventDefaultMouseMove: true,
      throttle: 40,
      zoomLock: false
    };
    const slider = {
      type: 'slider',
      [axisKey]: 0,
      start,
      end,
      showDetail: false,
      brushSelect: false,
      borderColor: '#d5ddd8',
      fillerColor: 'rgba(31, 138, 62, 0.22)',
      backgroundColor: 'rgba(15, 40, 25, 0.04)',
      handleIcon: 'path://M-9,0 a9,9 0 1,0 18,0 a9,9 0 1,0 -18,0',
      handleSize: mobile ? 18 : 16,
      handleStyle: { color: '#2f7d4a', borderColor: '#fff', borderWidth: 2 },
      dataBackground: {
        lineStyle: { color: '#9cb5a4', width: 1 },
        areaStyle: { color: 'rgba(31,138,62,0.1)' }
      },
      selectedDataBackground: {
        lineStyle: { color: '#2f7d4a' },
        areaStyle: { color: 'rgba(31,138,62,0.18)' }
      },
      textStyle: { color: '#5f7264', fontSize: 9 },
      showDataShadow: false
    };
    if (isY) {
      slider.width = mobile ? 16 : 14;
      slider.right = 0;
      slider.top = '12%';
      slider.bottom = '12%';
    } else {
      slider.height = mobile ? 18 : 16;
      slider.bottom = 0;
      slider.left = '8%';
      slider.right = '8%';
    }
    return [inside, slider];
  },

  toolboxMini() {
    const mobile = this.isMobile();
    return {
      show: true,
      right: 0,
      top: 0,
      itemSize: mobile ? 15 : 14,
      itemGap: 8,
      feature: { restore: { title: 'Reset' } },
      iconStyle: { borderColor: '#6b7a72' }
    };
  },

  tipBase() {
    return {
      backgroundColor: '#fff',
      borderColor: '#e4ebe0',
      borderWidth: 1,
      padding: [8, 10],
      textStyle: { color: '#142019', fontSize: this.isMobile() ? 12 : 13 },
      confine: true,
      extraCssText: 'max-width:min(86vw,280px);box-shadow:0 8px 24px rgba(20,32,24,.12);border-radius:10px;'
    };
  },

  resizeAll() {
    const lic = document.getElementById('chartTopLic');
    if (lic && this._topLicCount) this._fitTopLicWidth(lic, this._topLicCount);
    Object.values(this.instances).forEach((c) => c && !c.isDisposed() && c.resize());
  },

  /** Ancho real del panel. Si hay muchos LIC, el gráfico crece y el panel se desplaza. */
  _fitTopLicWidth(el, n) {
    const panel = el.closest('.chart-panel') || el.parentElement;
    const avail = Math.max(0, (panel && panel.clientWidth) || 0);
    const mobile = this.isMobile();
    const barSlot = mobile ? 54 : 72;
    const pad = 28;
    const inner = Math.max(280, avail - pad);
    const count = Math.max(1, n || 1);
    const need = Math.max(inner, count * barSlot);
    el.style.boxSizing = 'border-box';
    el.style.width = need + 'px';
    el.style.minWidth = need + 'px';
    el.style.maxWidth = 'none';
    el.style.height = (mobile ? 440 : 500) + 'px';
    el.style.minHeight = el.style.height;
    return { avail, need };
  },

  dispose(id) {
    if (this.instances[id]) {
      this.instances[id].dispose();
      delete this.instances[id];
    }
  },

  shortName(row) {
    if (window.QB && QB.avatars && QB.avatars.shortName) {
      const n = QB.avatars.shortName(row);
      if (n) return n.length > 16 ? n.slice(0, 14) + '…' : n;
    }
    const ci = String((row && row.ci) || '');
    return ci || '—';
  },

  shortGrupo(g) {
    return String(g || '—').replace(/^Grupo\s+/i, '') || '—';
  },

  grupoConJefe(g) {
    const base = this.shortGrupo(g);
    const fecha =
      (window.QB && QB.appFechaIso && QB.appFechaIso()) ||
      (window.QB && QB.appFecha ? QB.appFecha() : '');
    const jefe = window.QB && QB.supervisors ? QB.supervisors.label(g, fecha) : '';
    return jefe ? base + ' · ' + jefe : base;
  },

  jefeDe(g) {
    const fecha =
      (window.QB && QB.appFechaIso && QB.appFechaIso()) ||
      (window.QB && QB.appFecha ? QB.appFecha() : '');
    return window.QB && QB.supervisors ? QB.supervisors.label(g, fecha) : '';
  },

  fmtK(n) {
    const v = Number(n) || 0;
    if (v >= 1000) return (v / 1000).toFixed(v >= 10000 ? 0 : 1).replace('.0', '') + 'k';
    return v.toLocaleString('es-PE', { maximumFractionDigits: 0 });
  },

  setInsight(id, text) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text || '';
    el.hidden = !text;
  },

  /** Estadísticas por grupo: jarras, personas, promedio */
  buildGrupoStats(rows) {
    const map = {};
    const hidden = window.QB && QB.supervisors && QB.supervisors.isHiddenLic;
    const isJefe = (ci) =>
      window.QB && QB.supervisors && QB.supervisors.isSupervisorDni && QB.supervisors.isSupervisorDni(ci);
    for (const r of rows || []) {
      if (hidden && QB.supervisors.isHiddenLic(r.grupo)) continue;
      const g = String(r.grupo || '').trim() || '(sin grupo)';
      if (!map[g]) map[g] = { grupo: g, c: 0, workers: {}, pickers: {} };
      map[g].c += Number(r.c) || 0;
      const ciRaw = String(r.ci || '');
      const ci =
        (window.QB && QB.workers && QB.workers.cleanCi && QB.workers.cleanCi(ciRaw)) || ciRaw;
      if (ci) {
        if (!map[g].workers[ci]) map[g].workers[ci] = 0;
        map[g].workers[ci] += Number(r.c) || 0;
        if (!isJefe(ci) && !isJefe(ciRaw)) {
          if (!map[g].pickers[ci]) {
            map[g].pickers[ci] = {
              c: 0,
              ci,
              nombre: r.nombre || '',
              apellido: r.apellido || '',
              nombreCompleto: r.nombreCompleto || ''
            };
          }
          map[g].pickers[ci].c += Number(r.c) || 0;
          if (!map[g].pickers[ci].nombreCompleto && r.nombreCompleto) {
            map[g].pickers[ci].nombreCompleto = r.nombreCompleto;
            map[g].pickers[ci].nombre = r.nombre || map[g].pickers[ci].nombre;
            map[g].pickers[ci].apellido = r.apellido || map[g].pickers[ci].apellido;
          }
        }
      }
    }
    return Object.keys(map)
      .map((k) => {
        const g = map[k];
        const n = Object.keys(g.workers).length;
        const c = Math.round(g.c * 100) / 100;
        let best = null;
        Object.keys(g.pickers).forEach((ci) => {
          const p = g.pickers[ci];
          if (!best || p.c > best.c) best = p;
        });
        return {
          grupo: g.grupo,
          c,
          n,
          avg: n ? Math.round((c / n) * 100) / 100 : 0,
          bestCi: best ? best.ci : '',
          bestC: best ? Math.round(best.c * 100) / 100 : 0,
          bestNombre: best ? best.nombre || '' : '',
          bestApellido: best ? best.apellido || '' : '',
          bestNombreCompleto: best ? best.nombreCompleto || '' : ''
        };
      })
      .sort((a, b) => b.c - a.c);
  },

  distColor(i) {
    const cols = [
      ['#9ca3af', '#d1d5db'],
      ['#6b7280', '#9ca3af'],
      ['#5a7a66', '#a3c0ad'],
      ['#3d8f5a', '#8fb89a'],
      ['#2f7d4a', '#6bb07f'],
      ['#1f5f38', '#5a8f6c']
    ];
    const pair = cols[i] || cols[3];
    return this.barGrad(pair[0], pair[1], true);
  },

  /** Top personas · línea + circular (grandes) */
  renderTop(rows) {
    this.renderTopLine(rows);
    this.renderTopPie(rows);
  },

  renderTopLine(rows) {
    const chart = this.ensure('chartTopLine');
    if (!chart) return;
    const top = (rows || []).slice(0, 12);
    const mobile = this.isMobile();
    const labels = top.map((r, i) =>
      mobile ? '#' + (i + 1) : '#' + (i + 1) + ' ' + this.shortName(r)
    );
    const self = this;

    chart.setOption({
      tooltip: Object.assign(this.tipBase(), {
        trigger: 'axis',
        triggerOn: mobile ? 'mousemove|click' : 'mousemove',
        formatter: (params) => {
          const p = params[0];
          const row = top[p.dataIndex];
          if (!row) return '';
          const full =
            (window.QB && QB.avatars && (QB.avatars.realName(row) || QB.avatars.shortName(row))) ||
            row.ci;
          return `<b>#${p.dataIndex + 1} · ${full}</b><br/>CI ${row.ci}<br/>Jarras: <b>${Number(row.c).toLocaleString('es-PE')}</b>`;
        }
      }),
      grid: {
        left: mobile ? 2 : 8,
        right: mobile ? 8 : 16,
        top: 28,
        bottom: mobile ? 56 : 58,
        containLabel: true
      },
      dataZoom: this.zoomOpts('x', top.length),
      toolbox: this.toolboxMini(),
      xAxis: {
        type: 'category',
        data: labels,
        boundaryGap: true,
        axisLabel: this._label({
          rotate: mobile ? 0 : 32,
          fontSize: mobile ? 10 : 10,
          fontWeight: 650,
          color: '#1a2420',
          interval: 0,
          hideOverlap: true
        }),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#dfe5ea' } }
      },
      yAxis: {
        type: 'value',
        name: mobile ? '' : 'Jarras',
        scale: true,
        axisLabel: this._baseText(),
        splitLine: { lineStyle: { color: '#eef2ec', type: 'dashed' } },
        splitNumber: mobile ? 4 : 5
      },
      series: [{
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: mobile ? 11 : 12,
        data: top.map((r, i) => ({
          value: r.c,
          itemStyle: {
            color: i === 0 ? '#2f7d4a' : i === 1 ? '#6b7280' : i === 2 ? '#4b5563' : '#3d8f5a',
            borderColor: '#fff',
            borderWidth: 2
          }
        })),
        lineStyle: {
          width: mobile ? 3.5 : 4,
          color: self.barGrad('#2f7d4a', '#6bb07f', false)
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(47, 125, 74, 0.22)' },
            { offset: 1, color: 'rgba(47, 125, 74, 0.02)' }
          ])
        },
        label: {
          show: !mobile || top.length <= 8,
          position: 'top',
          color: '#143525',
          fontWeight: 700,
          fontSize: 10,
          formatter: (p) => Number(p.value).toLocaleString('es-PE', { maximumFractionDigits: 0 })
        },
        emphasis: {
          focus: 'series',
          itemStyle: { borderWidth: 3, shadowBlur: 10, shadowColor: 'rgba(20,32,24,0.25)' }
        }
      }],
      animationDuration: 650
    }, true);

    chart.off('click');
    chart.on('click', (params) => {
      const row = top[params.dataIndex];
      if (row && this.onWorkerClick) this.onWorkerClick(row);
    });
  },

  /** Top personas · circular radial (barras en anillo, no torta) */
  renderTopPie(rows) {
    const chart = this.ensure('chartTopPie');
    if (!chart) return;
    const top = (rows || []).slice(0, 12);
    const max = Math.max(...top.map((r) => r.c || 0), 1);
    const self = this;
    const mobile = this.isMobile();
    const labels = top.map((r, i) => (mobile ? '#' + (i + 1) : '#' + (i + 1) + ' ' + self.shortName(r)));

    chart.setOption({
      tooltip: Object.assign(this.tipBase(), {
        trigger: 'item',
        triggerOn: mobile ? 'mousemove|click' : 'mousemove',
        formatter: (p) => {
          const row = top[p.dataIndex];
          if (!row) return '';
          const full =
            (window.QB && QB.avatars && (QB.avatars.realName(row) || QB.avatars.shortName(row))) ||
            self.shortName(row);
          const pct = ((row.c / max) * 100).toFixed(0);
          return `<b>#${p.dataIndex + 1} · ${full}</b><br/>Jarras: <b>${Number(row.c).toLocaleString('es-PE')}</b><br/>Vs #1: <b>${pct}%</b>`;
        }
      }),
      toolbox: this.toolboxMini(),
      angleAxis: {
        type: 'category',
        data: labels,
        startAngle: 90,
        clockwise: true,
        axisLabel: {
          color: '#1a2420',
          fontSize: mobile ? 10 : 10,
          fontWeight: 650,
          fontFamily: 'IBM Plex Sans',
          interval: 0,
          margin: mobile ? 4 : 8
        },
        axisTick: { show: false },
        axisLine: { show: false },
        splitLine: { show: false }
      },
      radiusAxis: {
        type: 'value',
        min: 0,
        max: Math.ceil(max * 1.12),
        axisLabel: { show: false },
        axisTick: { show: false },
        axisLine: { show: false },
        splitLine: {
          show: true,
          lineStyle: { color: '#eef2ec', type: 'dashed' }
        }
      },
      polar: {
        center: ['50%', '52%'],
        radius: mobile ? ['16%', '68%'] : ['18%', '74%']
      },
      series: [{
        type: 'bar',
        coordinateSystem: 'polar',
        roundCap: true,
        barWidth: mobile ? '62%' : '58%',
        data: top.map((r, i) => ({
          value: r.c,
          itemStyle: {
            color:
              i === 0
                ? self.barGrad('#2f7d4a', '#6bb07f', false)
                : i === 1
                  ? self.barGrad('#6b7280', '#9ca3af', false)
                  : i === 2
                    ? self.barGrad('#4b5563', '#9ca3af', false)
                    : self.barGrad('#3d8f5a', '#8fb89a', false)
          }
        })),
        label: {
          show: !mobile,
          position: 'middle',
          color: '#fff',
          fontWeight: 700,
          fontSize: 10,
          formatter: (p) =>
            Number(p.value).toLocaleString('es-PE', { maximumFractionDigits: 0 })
        },
        emphasis: {
          itemStyle: { shadowBlur: 12, shadowColor: 'rgba(20,32,24,0.28)' }
        },
        animationDuration: 700
      }],
      animationDuration: 700
    }, true);

    chart.off('click');
    chart.on('click', (params) => {
      const row = top[params.dataIndex];
      if (row && this.onWorkerClick) this.onWorkerClick(row);
    });
  },

  /** Grupos · ranking horizontal (más claro que donut) */
  renderGrupos(porGrupo) {
    const chart = this.ensure('chartGrupos');
    if (!chart) return;
    const items = [...(porGrupo || [])].sort((a, b) => (b.c || 0) - (a.c || 0)).slice(0, 12).reverse();
    const total = items.reduce((s, g) => s + (g.c || 0), 0) || 1;
    const self = this;
    const mobile = this.isMobile();

    chart.setOption({
      tooltip: Object.assign(this.tipBase(), {
        trigger: 'axis',
        triggerOn: mobile ? 'mousemove|click' : 'mousemove',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const p = params[0];
          const g = items[p.dataIndex];
          if (!g) return '';
          const pct = (((g.c || 0) / total) * 100).toFixed(1);
          const rank = items.length - p.dataIndex;
          return `<b>#${rank} · ${self.grupoConJefe(g.grupo)}</b><br/>Jarras: <b>${Number(g.c).toLocaleString('es-PE')}</b><br/>Del total: <b>${pct}%</b>`;
        }
      }),
      grid: { left: 8, right: mobile ? 40 : 56, top: 16, bottom: 16, containLabel: true },
      dataZoom: this.zoomOpts('y', items.length),
      toolbox: this.toolboxMini(),
      xAxis: {
        type: 'value',
        axisLabel: this._baseText(),
        splitLine: { lineStyle: { color: '#eef2ec', type: 'dashed' } }
      },
      yAxis: {
        type: 'category',
        data: items.map((g) => {
          const n = self.grupoConJefe(g.grupo);
          return n.length > 22 ? n.slice(0, 20) + '…' : n;
        }),
        axisLabel: this._label({ fontSize: mobile ? 11 : 12, fontWeight: 650, color: '#1a2420' }),
        axisTick: { show: false },
        axisLine: { show: false }
      },
      series: [{
        type: 'bar',
        data: items.map((g, i) => {
          const rankFromTop = items.length - 1 - i;
          return {
            value: g.c,
            itemStyle: {
              borderRadius: [0, 14, 14, 0],
              color: self.rankColor(rankFromTop)
            }
          };
        }),
        barMaxWidth: mobile ? 26 : 30,
        barCategoryGap: '28%',
        showBackground: true,
        backgroundStyle: { color: 'rgba(74, 184, 72, 0.06)', borderRadius: [0, 14, 14, 0] },
        label: {
          show: true,
          position: 'right',
          color: '#143525',
          fontWeight: 750,
          fontSize: mobile ? 11 : 12,
          fontFamily: 'IBM Plex Sans',
          formatter: (p) => {
            const g = items[p.dataIndex];
            const pct = (((g && g.c) || 0) / total) * 100;
            return pct >= 10 ? pct.toFixed(0) + '%' : Number(p.value).toLocaleString('es-PE', { maximumFractionDigits: 0 });
          }
        },
        emphasis: { focus: 'self' }
      }],
      animationDuration: 700
    }, true);
  },

  /** Comparación de días — barras lado a lado */
  renderFechas(porFecha) {
    const chart = this.ensure('chartFechas');
    if (!chart) return;
    const items = (porFecha || []).slice().sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
    const dayPairs = [
      ['#2f7d4a', '#dce8e0'],
      ['#4b5563', '#e5e7eb'],
      ['#3d8f5a', '#dde8e1'],
      ['#6b7280', '#eef0f2']
    ];
    const self = this;
    chart.setOption({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: function (params) {
          const p = params[0];
          const idx = p.dataIndex;
          const cur = items[idx];
          const prev = items[idx - 1];
          let html = '<b>' + self.fmtFecha(cur.fecha) + '</b><br/>Total jarras: <b>' + cur.c + '</b>';
          if (prev) {
            const d = prev.c ? ((cur.c - prev.c) / prev.c) * 100 : 0;
            const sign = d > 0 ? '+' : '';
            html += '<br/>vs ' + self.fmtFecha(prev.fecha) + ': <b>' + sign + d.toFixed(1) + '%</b>';
          }
          return html;
        }
      },
      grid: { left: 8, right: 12, top: 28, bottom: 36, containLabel: true },
      xAxis: {
        type: 'category',
        data: items.map((f) => self.fmtFecha(f.fecha)),
        axisLabel: self._label({ fontWeight: 600 })
      },
      yAxis: {
        type: 'value',
        name: 'Jarras',
        axisLabel: self._baseText(),
        splitLine: { lineStyle: { color: '#eef2ec' } }
      },
      series: [{
        name: 'Jarras',
        type: 'bar',
        barMaxWidth: 56,
        data: items.map((f, i) => {
          const pair = dayPairs[i % dayPairs.length];
          return {
            value: f.c,
            itemStyle: {
              borderRadius: [10, 10, 0, 0],
              color: self.barGrad(pair[0], pair[1], true)
            }
          };
        }),
        label: {
          show: true,
          position: 'top',
          color: '#3d4a43',
          fontWeight: 700,
          fontFamily: 'IBM Plex Sans',
          formatter: function (p) {
            return Number(p.value).toLocaleString('es-PE');
          }
        }
      }],
      animationDuration: 600
    }, true);
  },

  /** Barra horizontal · promedio del día en rangos de jarras */
  renderGauge(kpis) {
    const chart = this.ensure('chartGauge');
    if (!chart) return;
    const mobile = this.isMobile();
    const avg = Number((kpis && kpis.promedioCajasPorTrabajador) || 0);
    const max = 160;
    const pct = max ? avg / max : 0;
    let zoneText = 'Ritmo bajo';
    let zoneColor = '#e41e26';
    if (pct >= 0.82) { zoneText = '¡Excelente!'; zoneColor = '#4ab848'; }
    else if (pct >= 0.63) { zoneText = 'Buen ritmo'; zoneColor = '#8dc63f'; }
    else if (pct >= 0.44) { zoneText = 'Ritmo regular'; zoneColor = '#f7941d'; }

    if (!avg) {
      chart.clear();
      chart.setOption({
        title: {
          text: 'Sin promedio aún',
          left: 'center',
          top: 'middle',
          textStyle: { color: '#6b7280', fontSize: 14, fontWeight: 600 }
        }
      });
      return;
    }

    chart.setOption({
      toolbox: this.toolboxMini(),
      grid: { left: 4, right: mobile ? 56 : 72, top: 12, bottom: 8, containLabel: true },
      xAxis: {
        type: 'value',
        min: 0,
        max,
        axisLabel: this._numAxisLabel({ fontSize: mobile ? 10 : 11 }),
        splitLine: { show: false },
        axisLine: { lineStyle: { color: '#dce5df' } }
      },
      yAxis: {
        type: 'category',
        data: ['Promedio'],
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: this._label({ fontSize: mobile ? 11 : 12, fontWeight: 700, color: '#1f2a30' })
      },
      series: [
        {
          type: 'bar',
          data: [max],
          barWidth: mobile ? 26 : 32,
          barGap: '-100%',
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: '#fecaca' },
                { offset: 0.25, color: '#fed7aa' },
                { offset: 0.44, color: '#fef08a' },
                { offset: 0.63, color: '#d9f99d' },
                { offset: 0.82, color: '#86efac' },
                { offset: 1, color: '#4ade80' }
              ]
            },
            borderRadius: 16,
            opacity: 0.55
          },
          silent: true,
          z: 1
        },
        {
          type: 'bar',
          data: [avg],
          barWidth: mobile ? 26 : 32,
          itemStyle: { color: zoneColor, borderRadius: 16 },
          label: {
            show: true,
            position: 'right',
            distance: 8,
            formatter: () => avg.toFixed(1),
            color: '#143525',
            fontWeight: 800,
            fontSize: mobile ? 12 : 13
          },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#912018', type: 'dashed', width: 2 },
            label: {
              formatter: '40',
              color: '#912018',
              fontWeight: 700,
              fontSize: 10
            },
            data: [{ xAxis: 40 }]
          },
          z: 2
        }
      ],
      animationDuration: 650
    }, true);
  },

  /** KPIs del ritmo del día */
  renderThermoDay(kpis, rows) {
    const avgEl = document.getElementById('ritmoAvg');
    const peopleEl = document.getElementById('ritmoPeople');
    const zoneEl = document.getElementById('ritmoZone');
    if (!avgEl) return;

    let avg = Number((kpis && kpis.promedioCajasPorTrabajador) || 0);
    if (!avg && rows && rows.length) {
      const vals = rows.map((r) => Number(r.c) || 0).filter((n) => n > 0);
      avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    }
    const nPeople = Number((kpis && kpis.trabajadores) || 0) || (rows || []).length || 0;
    const max = 160;
    const pct = max ? avg / max : 0;

    let zone = 'Ritmo bajo';
    let color = '#e41e26';
    if (pct >= 0.82) { zone = '¡Excelente!'; color = '#4ab848'; }
    else if (pct >= 0.63) { zone = 'Buen ritmo'; color = '#8dc63f'; }
    else if (pct >= 0.44) { zone = 'Ritmo regular'; color = '#f7941d'; }

    avgEl.textContent = avg ? avg.toFixed(1) : '—';
    if (peopleEl) peopleEl.textContent = nPeople ? String(nPeople) : '—';
    if (zoneEl) {
      zoneEl.textContent = avg ? zone : 'Sin datos';
      zoneEl.style.background = avg ? color + '22' : '';
      zoneEl.style.borderColor = avg ? color + '55' : '';
      zoneEl.style.color = avg ? color : '#6b7280';
    }
  },

  _insightGauge(kpis, rows) {
    const avg = Number((kpis && kpis.promedioCajasPorTrabajador) || 0);
    const n = (rows || []).length || Number((kpis && kpis.trabajadores) || 0);
    if (!avg) {
      this.setInsight('insightGauge', 'Sin promedio aún · espera datos del día.');
      return;
    }
    this.setInsight(
      'insightGauge',
      'Hoy el promedio es ' + avg.toFixed(1) + ' jarras por persona' +
        (n ? ' · ' + n + ' personas' : '') + '.'
    );
  },

  _insightDist(rows, opts) {
    const values = (rows || []).map((r) => Number(r.c) || 0).filter((n) => n > 0);
    if (!values.length) {
      this.setInsight('insightDist', 'Sin personas en los rangos de ratio.');
      return;
    }
    const bins = this._ratioBins();
    const counts = bins.map((b) => values.filter((v) => v >= b.min && v <= b.max).length);
    const total = counts.reduce((a, n) => a + n, 0);
    const topIdx = counts.reduce((best, n, i) => (n > counts[best] ? i : best), 0);
    const nFechas = opts && opts.nFechas ? Number(opts.nFechas) : 0;
    const multi = nFechas > 1;
    const unit = multi ? 'registros' : 'personas';
    const head = multi
      ? 'TOTAL ' + total + ' ' + unit + ' · ' + nFechas + ' fechas'
      : 'TOTAL ' + total + ' personas';
    const rango = bins[topIdx].label;
    this.setInsight(
      'insightDist',
      head +
        ' · más concentradas en ' +
        rango +
        ' (' +
        counts[topIdx] +
        ' ' +
        unit +
        ').'
    );
  },

  _ratioBins() {
    return [
      { label: '≤30 JARRAS', min: 1, max: 30 },
      { label: '31-40 JARRAS', min: 31, max: 40 },
      { label: '41-50 JARRAS', min: 41, max: 50 },
      { label: '51-60 JARRAS', min: 51, max: 60 },
      { label: '61-70 JARRAS', min: 61, max: 70 },
      { label: '>70 JARRAS', min: 71, max: Infinity }
    ];
  },

  /** Opción ECharts · mismo estilo Ratios Cosecha / Diario */
  buildDistOption(rows, opts) {
    opts = opts || {};
    const mobile = opts.mobile != null ? !!opts.mobile : this.isMobile();
    const animate = !(opts.animate === false);
    const values = (rows || []).map((r) => Number(r.c) || 0).filter((n) => n > 0);
    const bins = this._ratioBins();
    const counts = bins.map((b) => values.filter((v) => v >= b.min && v <= b.max).length);
    const totalPeople = counts.reduce((a, n) => a + n, 0) || 1;
    const barColors = ['#e41e26', '#f7941d', '#8dc63f', '#4ab848', '#2f7d4a', '#1f5f38'];
    const titleText = opts.title || 'Ratios Cosecha / Diario';
    const self = this;

    if (!values.length) {
      return {
        animation: false,
        title: {
          text: 'Sin personas con jarras aún',
          left: 'center',
          top: 'middle',
          textStyle: { color: '#6b7280', fontSize: 14, fontWeight: 600 }
        }
      };
    }

    return {
      animation: animate,
      animationDuration: animate ? 650 : 0,
      animationDurationUpdate: animate ? 400 : 0,
      title: {
        text: titleText,
        left: 'center',
        top: 4,
        textStyle: {
          color: '#143525',
          fontSize: mobile ? 14 : 16,
          fontWeight: 800,
          fontFamily: 'inherit'
        }
      },
      tooltip: Object.assign(this.tipBase(), {
        trigger: 'axis',
        triggerOn: mobile ? 'mousemove|click' : 'mousemove',
        axisPointer: { type: 'shadow' },
        formatter: (p) => {
          const i = p[0].dataIndex;
          const b = bins[i];
          const n = counts[i];
          const pct = ((n / totalPeople) * 100).toFixed(1);
          return (
            '<b>' +
            b.label +
            '</b><br/>Personas: <b>' +
            n +
            '</b><br/>Del total: <b>' +
            pct +
            '%</b>'
          );
        }
      }),
      grid: {
        left: 8,
        right: 12,
        top: mobile ? 48 : 52,
        bottom: mobile ? 52 : 42,
        containLabel: true
      },
      toolbox: opts.hideToolbox ? { show: false } : this.toolboxMini(),
      xAxis: {
        type: 'category',
        data: bins.map((b) => b.label),
        name: mobile ? '' : 'Ratio de cosecha/día',
        nameLocation: 'middle',
        nameGap: mobile ? 36 : 34,
        nameTextStyle: { color: '#5b6b63', fontWeight: 650, fontSize: 11 },
        axisLabel: this._label({
          fontSize: mobile ? 9 : 11,
          fontWeight: 750,
          color: '#1f2a30',
          interval: 0,
          rotate: mobile ? 28 : 0
        }),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#c5d2c9', width: 2 } }
      },
      yAxis: {
        type: 'value',
        name: mobile ? '' : 'Personas',
        nameTextStyle: { color: '#5b6b63', fontWeight: 650, fontSize: 11 },
        minInterval: 1,
        axisLabel: this._baseText(),
        splitLine: { lineStyle: { color: '#e8efe9', type: 'dashed' } },
        axisLine: { show: false }
      },
      series: [
        {
          type: 'bar',
          name: 'Personas',
          data: counts.map((n, i) => ({
            value: n,
            itemStyle: {
              borderRadius: [8, 8, 0, 0],
              color: self.barGrad(barColors[i % barColors.length], '#f4faf5', true)
            }
          })),
          barMaxWidth: mobile ? 44 : 64,
          label: {
            show: true,
            position: 'top',
            distance: 6,
            color: '#143525',
            fontWeight: 800,
            fontSize: mobile ? 11 : 12,
            formatter: (p) => {
              const n = Number(p.value) || 0;
              return n + ' personas';
            }
          }
        }
      ]
    };
  },

  /**
   * PNG offscreen del histograma de ratios (mismo look que chartDist)
   * opts: { title, width, height }
   */
  async captureDistPng(rows, opts) {
    opts = opts || {};
    if (typeof echarts === 'undefined' || !echarts.init) return null;
    const W = opts.width || 920;
    const H = opts.height || 440;
    const host = document.createElement('div');
    host.style.cssText =
      'position:fixed;left:-99999px;top:0;width:' + W + 'px;height:' + H + 'px;background:#fff;';
    document.body.appendChild(host);
    let chart = null;
    try {
      chart = echarts.init(host, null, { renderer: 'canvas', devicePixelRatio: 2 });
      const option = this.buildDistOption(
        rows,
        Object.assign({}, opts, { animate: false, mobile: false, hideToolbox: true })
      );
      chart.setOption(option, true);
      chart.resize();
      await new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setTimeout(resolve, 90));
        });
      });
      return chart.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });
    } catch (_) {
      return null;
    } finally {
      try {
        if (chart) chart.dispose();
      } catch (_) {}
      if (host.parentNode) host.parentNode.removeChild(host);
    }
  },

  /**
   * Opción · ratios juntos por módulo (barras agrupadas · misma clasificación)
   * modulos: [{ label: 'Módulo 5', people: [...] }, ...]
   */
  buildDistModulosGroupedOption(modulos, opts) {
    opts = opts || {};
    const bins = this._ratioBins();
    const list = (modulos || []).filter((m) => m && (m.people || []).length);
    /* Colores fijos por nº de módulo · bien distintos entre sí */
    const colorByNum = {
      1: '#7c3aed',
      2: '#2563eb',
      3: '#e41e26',
      4: '#f7941d',
      5: '#2f9e44',
      6: '#0891b2',
      7: '#db2777',
      8: '#ca8a04'
    };
    const fallback = ['#2f9e44', '#f7941d', '#2563eb', '#e41e26', '#7c3aed', '#0891b2'];
    const lightByNum = {
      1: '#ede9fe',
      2: '#dbeafe',
      3: '#fee2e2',
      4: '#ffedd5',
      5: '#dcfce7',
      6: '#cffafe',
      7: '#fce7f3',
      8: '#fef9c3'
    };
    const series = list.map((m, mi) => {
      const values = (m.people || []).map((r) => Number(r.c) || 0).filter((n) => n > 0);
      const counts = bins.map((b) => values.filter((v) => v >= b.min && v <= b.max).length);
      const nMatch = String(m.label || '').match(/(\d+)/);
      const num = nMatch ? Number(nMatch[1]) : 0;
      const color = colorByNum[num] || fallback[mi % fallback.length];
      const light = lightByNum[num] || '#f4faf5';
      return {
        type: 'bar',
        name: m.label || 'Módulo',
        data: counts,
        barMaxWidth: list.length >= 3 ? 28 : 44,
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: this.barGrad(color, light, true)
        },
        label: {
          show: true,
          position: 'top',
          distance: 4,
          color: '#143525',
          fontWeight: 750,
          fontSize: 11,
          formatter: (p) => {
            const n = Number(p.value) || 0;
            return n ? String(n) : '';
          }
        }
      };
    });

    return {
      animation: false,
      title: {
        text: opts.title || 'Ratios Cosecha / Diario · por módulo',
        left: 'center',
        top: 4,
        textStyle: {
          color: '#143525',
          fontSize: 16,
          fontWeight: 800,
          fontFamily: 'inherit'
        }
      },
      legend: {
        top: 36,
        left: 'center',
        itemWidth: 14,
        itemHeight: 10,
        textStyle: { color: '#143525', fontWeight: 700, fontSize: 12 }
      },
      tooltip: Object.assign(this.tipBase(), {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      }),
      grid: {
        left: 12,
        right: 16,
        top: 78,
        bottom: 48,
        containLabel: true
      },
      toolbox: { show: false },
      xAxis: {
        type: 'category',
        data: bins.map((b) => b.label),
        name: 'Ratio de cosecha/día',
        nameLocation: 'middle',
        nameGap: 34,
        nameTextStyle: { color: '#5b6b63', fontWeight: 650, fontSize: 11 },
        axisLabel: this._label({
          fontSize: 11,
          fontWeight: 750,
          color: '#1f2a30',
          interval: 0
        }),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#c5d2c9', width: 2 } }
      },
      yAxis: {
        type: 'value',
        name: 'Personas',
        nameTextStyle: { color: '#5b6b63', fontWeight: 650, fontSize: 11 },
        minInterval: 1,
        axisLabel: this._baseText(),
        splitLine: { lineStyle: { color: '#e8efe9', type: 'dashed' } },
        axisLine: { show: false }
      },
      series
    };
  },

  /** Una sola PNG · todos los módulos juntos en la misma clasificación */
  async captureDistModulosGroupedPng(modulos, opts) {
    opts = opts || {};
    if (typeof echarts === 'undefined' || !echarts.init) return null;
    const list = (modulos || []).filter((m) => m && (m.people || []).length);
    if (!list.length) return null;
    const W = opts.width || 1100;
    const H = opts.height || 520;
    const host = document.createElement('div');
    host.style.cssText =
      'position:fixed;left:-99999px;top:0;width:' + W + 'px;height:' + H + 'px;background:#fff;';
    document.body.appendChild(host);
    let chart = null;
    try {
      chart = echarts.init(host, null, { renderer: 'canvas', devicePixelRatio: 2 });
      chart.setOption(this.buildDistModulosGroupedOption(list, opts), true);
      chart.resize();
      await new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setTimeout(resolve, 100));
        });
      });
      return chart.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });
    } catch (_) {
      return null;
    } finally {
      try {
        if (chart) chart.dispose();
      } catch (_) {}
      if (host.parentNode) host.parentNode.removeChild(host);
    }
  },

  /** Histograma · Ratios Cosecha / Diario · rangos oficiales + >70 */
  renderDist(rows, opts) {
    const chart = this.ensure('chartDist');
    if (!chart) return;
    chart.setOption(this.buildDistOption(rows, opts), true);
  },

  _ratioBinsGt70() {
    return [
      { label: '71-80 JARRAS', min: 71, max: 80 },
      { label: '81-90 JARRAS', min: 81, max: 90 },
      { label: '91-100 JARRAS', min: 91, max: 100 },
      { label: '>100 JARRAS', min: 101, max: Infinity }
    ];
  },

  _insightDistGt70(rows, opts) {
    const values = (rows || []).map((r) => Number(r.c) || 0).filter((n) => n > 70);
    if (!values.length) {
      this.setInsight('insightDistGt70', 'Sin personas con más de 70 jarras en las fechas filtradas.');
      return;
    }
    const bins = this._ratioBinsGt70();
    const counts = bins.map((b) => values.filter((v) => v >= b.min && v <= b.max).length);
    const total = values.length;
    const topIdx = counts.reduce((best, n, i) => (n > counts[best] ? i : best), 0);
    const nFechas = opts && opts.nFechas ? Number(opts.nFechas) : 0;
    const multi = nFechas > 1;
    const unit = multi ? 'registros' : 'personas';
    const head = multi
      ? 'TOTAL ' + total + ' ' + unit + ' · ' + nFechas + ' fechas'
      : 'TOTAL ' + total + ' personas';
    this.setInsight(
      'insightDistGt70',
      head +
        ' con más de 70 jarras · más concentradas en ' +
        bins[topIdx].label +
        ' (' +
        counts[topIdx] +
        ' ' +
        unit +
        ').'
    );
  },

  /** Histograma · más de 70 jarras */
  renderDistGt70(rows, opts) {
    const chart = this.ensure('chartDistGt70');
    if (!chart) return;
    const mobile = this.isMobile();
    const animate = !(opts && opts.animate === false);
    const values = (rows || []).map((r) => Number(r.c) || 0).filter((n) => n > 70);
    const bins = this._ratioBinsGt70();
    const counts = bins.map((b) => values.filter((v) => v >= b.min && v <= b.max).length);
    const totalPeople = counts.reduce((a, n) => a + n, 0) || 1;
    const barColors = ['#f7941d', '#e85d04', '#e41e26', '#9b1c1c'];

    if (!values.length) {
      chart.clear();
      chart.setOption({
        title: {
          text: 'Sin personas con más de 70 jarras',
          left: 'center',
          top: 'middle',
          textStyle: { color: '#6b7280', fontSize: 14, fontWeight: 600 }
        }
      });
      return;
    }

    chart.setOption({
      animation: animate,
      animationDuration: animate ? 650 : 0,
      animationDurationUpdate: animate ? 400 : 0,
      title: {
        text: 'Más de 70 jarras',
        left: 'center',
        top: 4,
        textStyle: {
          color: '#143525',
          fontSize: mobile ? 14 : 16,
          fontWeight: 800,
          fontFamily: 'inherit'
        }
      },
      tooltip: Object.assign(this.tipBase(), {
        trigger: 'axis',
        triggerOn: mobile ? 'mousemove|click' : 'mousemove',
        axisPointer: { type: 'shadow' },
        formatter: (p) => {
          const i = p[0].dataIndex;
          const b = bins[i];
          const n = counts[i];
          const pct = ((n / totalPeople) * 100).toFixed(1);
          return (
            '<b>' +
            b.label +
            '</b><br/>Personas: <b>' +
            n +
            '</b><br/>Del total &gt;70: <b>' +
            pct +
            '%</b>'
          );
        }
      }),
      grid: {
        left: 8,
        right: 12,
        top: mobile ? 48 : 52,
        bottom: mobile ? 52 : 42,
        containLabel: true
      },
      toolbox: this.toolboxMini(),
      xAxis: {
        type: 'category',
        data: bins.map((b) => b.label),
        name: mobile ? '' : 'Jarras',
        nameLocation: 'middle',
        nameGap: mobile ? 36 : 34,
        nameTextStyle: { color: '#5b6b63', fontWeight: 650, fontSize: 11 },
        axisLabel: this._label({
          fontSize: mobile ? 9 : 11,
          fontWeight: 750,
          color: '#1f2a30',
          interval: 0,
          rotate: mobile ? 28 : 0
        }),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#c5d2c9', width: 2 } }
      },
      yAxis: {
        type: 'value',
        name: mobile ? '' : 'Personas',
        nameTextStyle: { color: '#5b6b63', fontWeight: 650, fontSize: 11 },
        minInterval: 1,
        axisLabel: this._baseText(),
        splitLine: { lineStyle: { color: '#e8efe9', type: 'dashed' } },
        axisLine: { show: false }
      },
      series: [
        {
          type: 'bar',
          name: 'Personas',
          data: counts.map((n, i) => ({
            value: n,
            itemStyle: {
              borderRadius: [8, 8, 0, 0],
              color: this.barGrad(barColors[i % barColors.length], '#fff5f5', true)
            }
          })),
          barMaxWidth: mobile ? 52 : 80,
          label: {
            show: true,
            position: 'top',
            distance: 6,
            color: '#143525',
            fontWeight: 800,
            fontSize: mobile ? 11 : 12,
            formatter: (p) => {
              const n = Number(p.value) || 0;
              return n + ' personas';
            }
          }
        }
      ]
    }, true);
  },

  /** Jarras por turno del día */
  renderTurnos(porTurno) {
    const chart = this.ensure('chartTurnos');
    if (!chart) return;
    const items = [...(porTurno || [])].sort(
      (a, b) => parseInt(String(a.turno || '').replace(/\D/g, ''), 10) - parseInt(String(b.turno || '').replace(/\D/g, ''), 10)
    );
    const total = items.reduce((s, t) => s + (t.c || 0), 0) || 1;
    const mobile = this.isMobile();
    const turnColors = ['#2f7d4a', '#4b5563', '#6b7280', '#3d8f5a', '#64748b', '#1f5f38', '#52525b', '#5a7a66'];

    chart.setOption({
      tooltip: Object.assign(this.tipBase(), {
        trigger: 'axis',
        triggerOn: mobile ? 'mousemove|click' : 'mousemove',
        axisPointer: { type: 'shadow' },
        formatter: (p) => {
          const t = items[p[0].dataIndex];
          if (!t) return '';
          const pct = (((t.c || 0) / total) * 100).toFixed(1);
          return `<b>Turno ${t.turno}</b><br/>Jarras: <b>${Number(t.c).toLocaleString('es-PE')}</b><br/>Del día: <b>${pct}%</b>`;
        }
      }),
      grid: { left: 4, right: 8, top: 28, bottom: mobile ? 40 : 36, containLabel: true },
      toolbox: this.toolboxMini(),
      xAxis: {
        type: 'category',
        data: items.map((t) => String(t.turno || '—')),
        axisLabel: this._label({ fontSize: 12, fontWeight: 700, interval: 0 }),
        axisTick: { show: false },
        name: mobile ? '' : 'Turno',
        nameGap: 24
      },
      yAxis: {
        type: 'value',
        name: mobile ? '' : 'Jarras',
        axisLabel: this._baseText(),
        splitLine: { lineStyle: { color: '#eef2ec', type: 'dashed' } }
      },
      series: [{
        type: 'bar',
        data: items.map((t, i) => ({
          value: t.c,
          itemStyle: {
            borderRadius: [12, 12, 0, 0],
            color: this.barGrad(turnColors[i % turnColors.length], '#d7eedf', true)
          }
        })),
        barMaxWidth: 52,
        label: {
          show: true,
          position: 'top',
          color: '#143525',
          fontWeight: 800,
          fontSize: 11,
          formatter: (p) => {
            const pct = (((items[p.dataIndex].c || 0) / total) * 100).toFixed(0);
            return this.fmtK(p.value) + '\n(' + pct + '%)';
          }
        }
      }],
      animationDuration: 650
    }, true);
  },

  /** Grupos LIC · barras horizontales con % (más claro que treemap) */
  renderGruposVisual(porGrupo) {
    const chart = this.ensure('chartTreemap');
    if (!chart) return;
    const items = [...(porGrupo || [])].sort((a, b) => (b.c || 0) - (a.c || 0)).slice(0, 10).reverse();
    const total = items.reduce((s, g) => s + (g.c || 0), 0) || 1;
    const mobile = this.isMobile();
    const self = this;

    chart.setOption({
      tooltip: Object.assign(this.tipBase(), {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (p) => {
          const g = items[p[0].dataIndex];
          if (!g) return '';
          const pct = (((g.c || 0) / total) * 100).toFixed(1);
          const rank = items.length - p[0].dataIndex;
          return `<b>#${rank} · ${self.shortGrupo(g.grupo)}</b><br/>Jarras: <b>${Number(g.c).toLocaleString('es-PE')}</b><br/>Del día: <b>${pct}%</b>`;
        }
      }),
      grid: { left: 4, right: mobile ? 36 : 48, top: 8, bottom: 8, containLabel: true },
      toolbox: this.toolboxMini(),
      xAxis: {
        type: 'value',
        axisLabel: this._baseText(),
        splitLine: { lineStyle: { color: '#eef2ec', type: 'dashed' } }
      },
      yAxis: {
        type: 'category',
        data: items.map((g) => self.grupoConJefe(g.grupo)),
        axisLabel: this._label({ fontSize: 11, fontWeight: 650, color: '#1a2420' }),
        axisTick: { show: false },
        axisLine: { show: false }
      },
      series: [{
        type: 'bar',
        data: items.map((g, i) => {
          const rankFromTop = items.length - 1 - i;
          return {
            value: g.c,
            itemStyle: {
              borderRadius: [0, 12, 12, 0],
              color: self.rankColor(rankFromTop)
            }
          };
        }),
        barMaxWidth: 22,
        showBackground: true,
        backgroundStyle: { color: 'rgba(15,40,25,0.05)', borderRadius: [0, 12, 12, 0] },
        label: {
          show: true,
          position: 'right',
          color: '#143525',
          fontWeight: 700,
          fontSize: 11,
          formatter: (p) => {
            const pct = (((items[p.dataIndex].c || 0) / total) * 100).toFixed(0);
            return pct + '% · ' + self.fmtK(p.value);
          }
        }
      }],
      animationDuration: 650
    }, true);
  },

  /** Top 5 del día · barras horizontales grandes */
  renderTop5(rows) {
    const chart = this.ensure('chartTop5');
    if (!chart) return;
    const top = (rows || []).slice().sort((a, b) => (b.c || 0) - (a.c || 0)).slice(0, 5).reverse();
    const max = Math.max(...top.map((r) => r.c || 0), 1);
    const mobile = this.isMobile();
    const self = this;
    const medals = ['🥇', '🥈', '🥉', '4°', '5°'];

    chart.setOption({
      tooltip: Object.assign(this.tipBase(), {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (p) => {
          const row = top[p[0].dataIndex];
          if (!row) return '';
          const rank = top.length - p[0].dataIndex;
          const full =
            (window.QB && QB.avatars && (QB.avatars.realName(row) || QB.avatars.shortName(row))) ||
            self.shortName(row);
          return `<b>${medals[rank - 1] || '#' + rank} · ${full}</b><br/>CI ${row.ci}<br/>Jarras: <b>${Number(row.c).toLocaleString('es-PE')}</b>`;
        }
      }),
      grid: { left: 4, right: mobile ? 12 : 16, top: 8, bottom: 8, containLabel: true },
      toolbox: this.toolboxMini(),
      xAxis: {
        type: 'value',
        max: Math.ceil(max * 1.08),
        axisLabel: this._baseText(),
        splitLine: { lineStyle: { color: '#eef2ec', type: 'dashed' } }
      },
      yAxis: {
        type: 'category',
        data: top.map((r, i) => {
          const rank = top.length - i;
          return (medals[rank - 1] || rank) + ' ' + self.shortName(r);
        }),
        axisLabel: this._label({ fontSize: mobile ? 10 : 11, fontWeight: 700, color: '#1a2420' }),
        axisTick: { show: false },
        axisLine: { show: false }
      },
      series: [{
        type: 'bar',
        data: top.map((r, i) => {
          const rankFromTop = top.length - 1 - i;
          return {
            value: r.c,
            itemStyle: {
              borderRadius: [0, 14, 14, 0],
              color: self.rankColor(rankFromTop),
              shadowBlur: rankFromTop < 3 ? 8 : 0,
              shadowColor: 'rgba(20,32,24,0.15)'
            }
          };
        }),
        barMaxWidth: 28,
        showBackground: true,
        backgroundStyle: { color: 'rgba(15,40,25,0.04)', borderRadius: [0, 14, 14, 0] },
        label: {
          show: true,
          position: 'right',
          color: '#143525',
          fontWeight: 800,
          fontSize: 12,
          formatter: (p) => Number(p.value).toLocaleString('es-PE', { maximumFractionDigits: 0 })
        }
      }],
      animationDuration: 700
    }, true);

    chart.off('click');
    chart.on('click', (params) => {
      const row = top[params.dataIndex];
      if (row && this.onWorkerClick) this.onWorkerClick(row);
    });
  },

  /** Ranking de lotes · barras horizontales (más fácil de leer) */
  renderLotes(rows) {
    const chart = this.ensure('chartLotes');
    if (!chart) return;

    const byLote = {};
    for (const r of rows || []) {
      if (Array.isArray(r.lotes) && r.lotes.length) {
        r.lotes.forEach((l) => {
          const name = l.lote || '';
          if (!name) return;
          byLote[name] = (byLote[name] || 0) + (l.c || 0);
        });
      } else if (r.lote) {
        byLote[r.lote] = (byLote[r.lote] || 0) + (r.c || 0);
      }
    }

    const sorted = Object.entries(byLote)
      .map(([lote, c]) => ({ lote, c: Math.round(c * 100) / 100 }))
      .sort((a, b) => a.c - b.c)
      .slice(-14);

    const n = sorted.length;
    const self = this;
    const mobile = this.isMobile();

    chart.setOption({
      tooltip: Object.assign(this.tipBase(), {
        trigger: 'axis',
        triggerOn: mobile ? 'mousemove|click' : 'mousemove',
        axisPointer: { type: 'shadow' },
        formatter: (p) => {
          const row = sorted[p[0].dataIndex];
          if (!row) return '';
          const rank = n - p[0].dataIndex;
          return `<b>#${rank} · ${row.lote}</b><br/>Jarras: <b>${row.c.toLocaleString('es-PE')}</b>`;
        }
      }),
      grid: { left: 8, right: mobile ? 48 : 64, top: 16, bottom: mobile ? 28 : 24, containLabel: true },
      dataZoom: this.zoomOpts('y', n),
      toolbox: this.toolboxMini(),
      xAxis: {
        type: 'value',
        splitNumber: mobile ? 3 : 4,
        minInterval: 1,
        axisLabel: this._numAxisLabel(),
        splitLine: { lineStyle: { color: '#eef2ec', type: 'dashed' } }
      },
      yAxis: {
        type: 'category',
        data: sorted.map((r) => (r.lote.length > 16 ? r.lote.slice(0, 14) + '…' : r.lote)),
        axisLabel: this._label({ fontSize: mobile ? 11 : 12, fontWeight: 650, color: '#1a2420' }),
        axisTick: { show: false },
        axisLine: { show: false }
      },
      series: [{
        type: 'bar',
        data: sorted.map((r, i) => {
          const rankFromTop = n - 1 - i;
          return {
            value: r.c,
            itemStyle: {
              borderRadius: [0, 14, 14, 0],
              color: self.rankColor(rankFromTop)
            }
          };
        }),
        barMaxWidth: mobile ? 26 : 30,
        barCategoryGap: '28%',
        showBackground: true,
        backgroundStyle: { color: 'rgba(247, 148, 29, 0.06)', borderRadius: [0, 14, 14, 0] },
        label: {
          show: true,
          position: 'right',
          color: '#143525',
          fontWeight: 750,
          fontSize: mobile ? 11 : 12,
          formatter: (p) => Number(p.value).toLocaleString('es-PE', { maximumFractionDigits: 0 })
        }
      }],
      animationDuration: 700,
      animationEasing: 'cubicOut'
    }, true);
  },

  /** Altos vs bajos — lotes con más / menos jarras (C) */
  renderTopBottomLotes(rows) {
    const chart = this.ensure('chartTopBottom');
    if (!chart) return;

    const byLote = {};
    for (const r of rows || []) {
      if (Array.isArray(r.lotes) && r.lotes.length) {
        r.lotes.forEach((l) => {
          const name = l.lote || '';
          if (!name) return;
          byLote[name] = (byLote[name] || 0) + (l.c || 0);
        });
      } else if (r.lote) {
        byLote[r.lote] = (byLote[r.lote] || 0) + (r.c || 0);
      }
    }

    const sorted = Object.entries(byLote)
      .map(([lote, c]) => ({ lote, c: Math.round(c * 100) / 100 }))
      .sort((a, b) => b.c - a.c);

    const top = sorted.slice(0, 8);
    const bottom = sorted.length > 8 ? sorted.slice(-8).reverse() : [];
    const n = Math.max(top.length, bottom.length, 1);
    const cats = Array.from({ length: n }, (_, i) => `#${i + 1}`);

    chart.setOption({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          let html = '';
          params.forEach((p) => {
            const list = p.seriesName === 'Altos' ? top : bottom;
            const row = list[p.dataIndex];
            if (!row) return;
            html += `${p.marker}<b>${row.lote}</b><br/>Jarras: <b>${row.c}</b><br/>`;
          });
          return html || '—';
        }
      },
      legend: { data: ['Altos', 'Bajos'], textStyle: this._baseText() },
      grid: { left: 8, right: 12, top: 40, bottom: 48, containLabel: true },
      xAxis: {
        type: 'category',
        data: cats,
        axisLabel: this._baseText()
      },
      yAxis: {
        type: 'value',
        name: 'Jarras',
        axisLabel: this._baseText(),
        splitLine: { lineStyle: { color: '#eef2ec' } }
      },
      series: [
        {
          name: 'Altos',
          type: 'bar',
          barMaxWidth: 28,
          data: cats.map((_, i) => (top[i] ? top[i].c : null)),
          itemStyle: { color: '#1f7a45', borderRadius: [8, 8, 0, 0] },
          label: {
            show: true,
            position: 'top',
            fontSize: 9,
            color: '#3d4a43',
            formatter: (p) => {
              const row = top[p.dataIndex];
              if (!row) return '';
              return row.lote.length > 12 ? row.lote.slice(0, 11) + '…' : row.lote;
            }
          }
        },
        {
          name: 'Bajos',
          type: 'bar',
          barMaxWidth: 28,
          data: cats.map((_, i) => (bottom[i] ? bottom[i].c : null)),
          itemStyle: { color: '#c23b2e', borderRadius: [8, 8, 0, 0] },
          label: {
            show: true,
            position: 'top',
            fontSize: 9,
            color: '#3d4a43',
            formatter: (p) => {
              const row = bottom[p.dataIndex];
              if (!row) return '';
              return row.lote.length > 12 ? row.lote.slice(0, 11) + '…' : row.lote;
            }
          }
        }
      ],
      animationDuration: 550
    }, true);
  },

  /** Mapa de calor · módulo × turno (fácil de leer) */
  renderHeatmapModuloTurno(rows, kpis) {
    const chart = this.ensure('chartModuloTurno');
    if (!chart) return;

    let matrix = (kpis && kpis.porModuloTurno) || [];
    if (!matrix.length) {
      const map = {};
      for (const r of rows || []) {
        if (!r.modulo || !r.turno) continue;
        const k = r.modulo + '|' + r.turno;
        map[k] = (map[k] || 0) + r.c;
      }
      matrix = Object.entries(map).map(([k, c]) => {
        const [modulo, turno] = k.split('|');
        return { modulo, turno, c };
      });
    }

    const turnos = [...new Set(matrix.map((x) => x.turno))].sort(
      (a, b) => parseInt(a.replace(/\D/g, ''), 10) - parseInt(b.replace(/\D/g, ''), 10)
    );
    const modulos = [...new Set(matrix.map((x) => x.modulo))].sort();
    const lookup = {};
    let maxVal = 0;
    matrix.forEach((x) => {
      lookup[x.modulo + '|' + x.turno] = x.c;
      if (x.c > maxVal) maxVal = x.c;
    });

    const heatData = [];
    modulos.forEach((m, yi) => {
      turnos.forEach((t, xi) => {
        const v = Math.round((lookup[m + '|' + t] || 0) * 10) / 10;
        heatData.push([xi, yi, v]);
      });
    });

    chart.setOption({
      tooltip: Object.assign(this.tipBase(), {
        position: 'top',
        formatter: (p) => {
          const v = p.data[2];
          if (!v || v <= 0) return '';
          return `<b>${modulos[p.data[1]]} · ${turnos[p.data[0]]}</b><br/>Jarras: <b>${Number(v).toLocaleString('es-PE')}</b>`;
        }
      }),
      toolbox: this.toolboxMini(),
      grid: { left: 4, right: 48, top: 8, bottom: 28, containLabel: true },
      xAxis: {
        type: 'category',
        data: turnos,
        splitArea: { show: true },
        axisLabel: this._label({ fontWeight: 700, fontSize: 11 })
      },
      yAxis: {
        type: 'category',
        data: modulos,
        splitArea: { show: true },
        axisLabel: this._label({ fontWeight: 650, fontSize: 11 })
      },
      visualMap: {
        min: 0,
        max: maxVal || 1,
        calculable: true,
        orient: 'vertical',
        right: 0,
        top: 'center',
        itemWidth: 12,
        itemHeight: 80,
        text: ['Alto', 'Bajo'],
        textStyle: { fontSize: 10, color: '#5f7264' },
        inRange: {
          color: ['#f3f4f6', '#c5d6cb', '#6bb07f', '#2f7d4a', '#1f5f38']
        }
      },
      series: [{
        type: 'heatmap',
        data: heatData,
        label: {
          show: true,
          fontSize: 10,
          fontWeight: 700,
          color: '#142019',
          formatter: (p) => (p.data[2] > 0 ? this.fmtK(p.data[2]) : '')
        },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(20,32,24,0.25)' }
        },
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 }
      }],
      animationDuration: 650
    }, true);
  },

  /** @deprecated usar renderHeatmapModuloTurno */
  renderModuloTurno(rows, kpis) {
    this.renderHeatmapModuloTurno(rows, kpis);
  },

  /** Barras agrupadas — rendimiento por grupo en cada fecha */
  renderGrupoFechas(rows) {
    const chart = this.ensure('chartGrupoFechas');
    if (!chart) return;
    const fechas = [...new Set((rows || []).map((r) => r.fecha))].sort();
    const byGrupoFecha = {};
    for (const r of rows || []) {
      if (!byGrupoFecha[r.grupo]) byGrupoFecha[r.grupo] = {};
      byGrupoFecha[r.grupo][r.fecha] = (byGrupoFecha[r.grupo][r.fecha] || 0) + r.c;
    }
    const grupos = Object.keys(byGrupoFecha)
      .map((g) => ({
        grupo: g || '(sin)',
        total: Object.values(byGrupoFecha[g]).reduce((a, b) => a + b, 0)
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 12)
      .map((x) => x.grupo);

    chart.setOption({
      color: this.palette,
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: {
        data: fechas,
        top: 0,
        textStyle: this._baseText()
      },
      grid: { left: 8, right: 12, top: 40, bottom: 56, containLabel: true },
      dataZoom: [
        { type: 'inside', start: 0, end: 100 },
        { type: 'slider', height: 16, bottom: 8 }
      ],
      xAxis: {
        type: 'category',
        data: grupos.map((g) => (g.length > 14 ? g.slice(0, 12) + '…' : g)),
        axisLabel: this._label({ rotate: window.innerWidth < 760 ? 40 : 25, fontSize: 10 })
      },
      yAxis: {
        type: 'value',
        name: 'Jarras',
        axisLabel: this._baseText(),
        splitLine: { lineStyle: { color: '#eef2ec' } }
      },
      series: fechas.map((f) => ({
        name: f,
        type: 'bar',
        barMaxWidth: 22,
        emphasis: { focus: 'series' },
        data: grupos.map((g) => Math.round(((byGrupoFecha[g] && byGrupoFecha[g][f]) || 0) * 10) / 10)
      })),
      animationDuration: 600
    }, true);
  },

  /** Pareto 80/20 de rendimientos */
  renderPareto(rows) {
    const chart = this.ensure('chartPareto');
    if (!chart) return;
    const sorted = [...(rows || [])].sort((a, b) => b.c - a.c).slice(0, 30);
    const total = sorted.reduce((s, r) => s + r.c, 0) || 1;
    let acc = 0;
    const labels = sorted.map((r, i) => String(i + 1));
    const bars = sorted.map((r) => r.c);
    const line = sorted.map((r) => {
      acc += r.c;
      return Math.round((acc / total) * 1000) / 10;
    });
    chart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['Jarras', '% acumulado'], textStyle: this._baseText() },
      grid: { left: 8, right: 18, top: 36, bottom: 28, containLabel: true },
      xAxis: {
        type: 'category',
        data: labels,
        name: 'Ranking',
        axisLabel: this._baseText()
      },
      yAxis: [
        {
          type: 'value',
          name: 'Jarras',
          axisLabel: this._baseText(),
          splitLine: { lineStyle: { color: '#eef2ec' } }
        },
        {
          type: 'value',
          name: '%',
          min: 0,
          max: 100,
          axisLabel: this._label({ formatter: '{value}%' })
        }
      ],
      series: [
        {
          name: 'Jarras',
          type: 'bar',
          data: bars,
          barMaxWidth: 16,
          itemStyle: { color: '#2f7d4a', borderRadius: [4, 4, 0, 0] }
        },
        {
          name: '% acumulado',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          data: line,
          symbolSize: 6,
          lineStyle: { width: 3, color: '#6b7280' },
          itemStyle: { color: '#6b7280' },
          markLine: {
            symbol: 'none',
            data: [{ yAxis: 80, name: '80%' }],
            lineStyle: { type: 'dashed', color: '#9ca3af' },
            label: { formatter: '80%', color: '#6b7280' }
          }
        }
      ],
      animationDuration: 600
    }, true);
  },

  /** Top 8 vs Bottom 8 */
  renderTopBottom(rows) {
    const chart = this.ensure('chartTopBottom');
    if (!chart) return;
    const sorted = [...(rows || [])].sort((a, b) => b.c - a.c);
    const top = sorted.slice(0, 8);
    const bottom = sorted.slice(-8).reverse();
    const labelOf = (r) => {
      const n = window.QB && QB.avatars ? QB.avatars.shortName(r) : '';
      return n || r.ci || '—';
    };
    chart.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: ['Altos', 'Bajos'], textStyle: this._baseText() },
      grid: { left: 8, right: 12, top: 36, bottom: 48, containLabel: true },
      xAxis: {
        type: 'category',
        data: top.map((_, i) => `#${i + 1}`),
        axisLabel: this._baseText()
      },
      yAxis: {
        type: 'value',
        name: 'Jarras',
        axisLabel: this._baseText(),
        splitLine: { lineStyle: { color: '#eef2ec' } }
      },
      series: [
        {
          name: 'Altos',
          type: 'bar',
          data: top.map((r) => ({ value: r.c, name: labelOf(r) })),
          barMaxWidth: 20,
          itemStyle: { color: '#1f7a45', borderRadius: [6, 6, 0, 0] }
        },
        {
          name: 'Bajos',
          type: 'bar',
          data: bottom.map((r) => ({ value: r.c, name: labelOf(r) })),
          barMaxWidth: 20,
          itemStyle: { color: '#dc2626', borderRadius: [6, 6, 0, 0] }
        }
      ],
      animationDuration: 550
    }, true);

    chart.off('click');
    chart.on('click', (params) => {
      const list = params.seriesName === 'Altos' ? top : bottom;
      const row = list[params.dataIndex];
      if (row && this.onWorkerClick) this.onWorkerClick(row);
    });
  },

  /** Modal persona — solo jarras reales por lote (sin horas inventadas) */
  renderModalDetalle(items) {
    const chart = this.ensure('chartModal');
    if (!chart) return;
    const rows = items || [];
    if (!rows.length) {
      chart.clear();
      chart.setOption({
        title: {
          text: 'Sin desglose por lote',
          left: 'center',
          top: 'middle',
          textStyle: { color: '#6b7a72', fontSize: 13, fontWeight: 500 }
        }
      }, true);
      return;
    }
    chart.setOption({
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#fff',
        borderColor: '#e4ebe0',
        textStyle: { color: '#142019' },
        formatter: (p) => {
          const row = rows[p[0].dataIndex];
          if (!row) return '';
          const name = row.full || row.slot;
          return `<b>${name}</b><br/>Jarras: <b>${Number(row.c).toLocaleString('es-PE')}</b>`;
        }
      },
      grid: { left: 8, right: 12, top: 28, bottom: 52, containLabel: true },
      dataZoom: this.zoomOpts('x', rows.length),
      toolbox: {
        show: true,
        right: 2,
        top: 0,
        itemSize: 15,
        feature: { restore: { title: 'Reset' } },
        iconStyle: { borderColor: '#5f7264' }
      },
      xAxis: {
        type: 'category',
        data: rows.map((h) => h.slot),
        axisLabel: this._label({ fontSize: 10, rotate: rows.length > 4 ? 28 : 0 }),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#dfe5ea' } }
      },
      yAxis: {
        type: 'value',
        name: 'Jarras',
        axisLabel: this._baseText(),
        splitLine: { lineStyle: { color: '#eef2ec' } }
      },
      series: [{
        type: 'bar',
        data: rows.map((h) => h.c),
        barMaxWidth: 36,
        itemStyle: {
          borderRadius: [8, 8, 0, 0],
          color: this.barGrad('#2f7d4a', '#6bb07f', true)
        },
        label: {
          show: true,
          position: 'top',
          color: '#143525',
          fontWeight: 700,
          fontSize: 11,
          formatter: (p) => Number(p.value).toLocaleString('es-PE', { maximumFractionDigits: 1 })
        }
      }],
      animationDuration: 450
    }, true);
    requestAnimationFrame(() => chart.resize());
  },

  /** —— Paneles del día · supervisores + lotes —— */

  buildSupervisorStats(porGrupo) {
    const fecha =
      (window.QB && QB.appFechaIso && QB.appFechaIso()) ||
      (window.QB && QB.appFecha ? QB.appFecha() : '');
    return (porGrupo || [])
      .map((g) => {
        const full =
          (window.QB && QB.supervisors && QB.supervisors.fullLabel(g.grupo, fecha)) || '';
        const short =
          (window.QB && QB.supervisors && QB.supervisors.label(g.grupo, fecha)) ||
          this.shortGrupo(g.grupo);
        const bestCi = String(g.bestCi || '');
        let bestNombre = '';
        if (bestCi) {
          const row = {
            ci: bestCi,
            nombre: g.bestNombre || '',
            apellido: g.bestApellido || '',
            nombreCompleto: g.bestNombreCompleto || ''
          };
          /* Completar desde padrón trabajadores.json si la fila no trae nombre */
          if (
            (!row.nombreCompleto || (QB.avatars && QB.avatars._junk && QB.avatars._junk(row.nombreCompleto))) &&
            window.QB &&
            QB.workers &&
            typeof QB.workers.get === 'function'
          ) {
            const w = QB.workers.get(bestCi);
            if (w && w.nombreCompleto) {
              row.nombreCompleto = w.nombreCompleto;
              if (typeof QB.workers.enrich === 'function') {
                const en = QB.workers.enrich({ ci: bestCi, c: 0 });
                row.nombre = en.nombre || row.nombre;
                row.apellido = en.apellido || row.apellido;
                row.nombreCompleto = en.nombreCompleto || row.nombreCompleto;
              }
            }
          }
          if (window.QB && QB.avatars) {
            bestNombre = QB.avatars.realName(row) || QB.avatars.shortName(row) || '';
          }
          if (!bestNombre) {
            bestNombre =
              String(row.nombreCompleto || '').trim() ||
              (String(row.apellido || '').trim() + ' ' + String(row.nombre || '').trim()).trim();
          }
        }
        if (!bestNombre && bestCi) bestNombre = 'CI ' + bestCi;
        return {
          grupo: g.grupo,
          nombre: full || short || 'Sin supervisor',
          short: short || this.shortGrupo(g.grupo),
          lic: this.shortGrupo(g.grupo),
          c: Number(g.c) || 0,
          n: Number(g.n) || 0,
          avg: Number(g.avg) || 0,
          bestCi,
          bestC: Number(g.bestC) || 0,
          bestNombre: bestNombre || '—'
        };
      })
      .filter((s) => s.c > 0);
  },

  renderDayPack(report, merged) {
    const rows = (report && report.data) || [];
    const stats = this.buildGrupoStats(rows);
    const kpis = (report && report.kpis) || {};
    const porGrupo = stats.length
      ? stats
      : (kpis.porGrupo || []).map((g) => ({ grupo: g.grupo, c: g.c, n: 0, avg: 0 }));
    const supervisores = this.buildSupervisorStats(porGrupo);

    this.renderSupervisorAlerts(porGrupo, merged);

    // Resumen · orden fijo
    this.renderTopLotes(rows, kpis);
    this._insightTopLotes(rows, kpis);

    this.renderTopLic(porGrupo);
    this._insightTopLic(porGrupo);

    this.renderLiderazgo(supervisores);
    this._insightLiderazgo(supervisores);
  },

  /** Comparación · supervisores con más personas < 30 jarras */
  renderCompareLt40Supervisores(items) {
    if (typeof echarts === 'undefined') return;
    const host = document.getElementById('chartCompareLt40Sup');
    if (!host) return;
    const self = this;
    const mobile = this.isMobile();
    const list = [...(items || [])].filter((s) => Number(s.n) > 0).sort((a, b) => b.n - a.n);
    const top = list;
    const wrap = host.parentElement;
    const parentW = (wrap && wrap.clientWidth) || host.clientWidth || 320;
    const barSlot = mobile ? 76 : 88;
    const needScroll = top.length > (mobile ? 4 : 6);
    const chartW = needScroll
      ? Math.max(parentW, top.length * barSlot + 56)
      : parentW;
    const chartH = mobile ? 260 : 320;

    if (wrap) {
      wrap.classList.toggle('is-scrollable', needScroll);
    }
    host.style.width = chartW + 'px';
    host.style.maxWidth = 'none';
    host.style.minWidth = chartW + 'px';
    host.style.minHeight = chartH + 'px';
    host.style.height = chartH + 'px';

    const chart = this.getOrCreate('chartCompareLt40Sup');
    if (!chart) return;

    if (!top.length) {
      chart.clear();
      chart.setOption({
        title: {
          text: 'Sin personas bajo 34 jarras',
          left: 'center',
          top: 'middle',
          textStyle: { color: '#6b7280', fontSize: 14, fontWeight: 600 }
        }
      });
      chart.resize();
      return;
    }

    chart.setOption({
      title: { show: false },
      tooltip: Object.assign(this.tipBase(), {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        confine: true,
        formatter: (p) => {
          const s = top[p[0].dataIndex];
          if (!s) return '';
          return (
            '<b>' +
            s.nombre +
            '</b><br/>' +
            (s.lic ? 'LIC: ' + s.lic + '<br/>' : '') +
            'Personas &lt; 34: <b>' +
            s.n +
            '</b>'
          );
        }
      }),
      grid: {
        left: mobile ? 8 : 14,
        right: mobile ? 14 : 20,
        top: mobile ? 42 : 48,
        bottom: mobile ? 68 : 64,
        containLabel: true
      },
      toolbox: { show: false },
      dataZoom: needScroll
        ? [
            {
              type: 'inside',
              xAxisIndex: 0,
              zoomOnMouseWheel: false,
              moveOnMouseMove: true,
              moveOnMouseWheel: true,
              filterMode: 'none'
            }
          ]
        : [],
      xAxis: {
        type: 'category',
        data: top.map((s) => s.short || s.nombre),
        axisLabel: this._label({
          fontSize: mobile ? 10 : 11,
          fontWeight: 650,
          color: '#1f2a30',
          interval: 0,
          rotate: mobile ? 32 : 22,
          margin: 12
        }),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#eef1f3' } }
      },
      yAxis: {
        type: 'value',
        name: 'Personas',
        min: 0,
        max: Math.max(5, Math.ceil((Math.max(...top.map((s) => Number(s.n) || 0)) * 1.22) / 5) * 5),
        minInterval: 1,
        nameTextStyle: { color: '#912018', fontSize: 11, fontWeight: 700, padding: [0, 0, 6, 0] },
        nameGap: 14,
        axisLabel: this._numAxisLabel({ fontSize: mobile ? 10 : 11 }),
        splitLine: { lineStyle: { color: '#fce8e6', type: 'dashed' } }
      },
      series: [
        {
          type: 'bar',
          data: top.map((s, i) => ({
            value: s.n,
            itemStyle: {
              borderRadius: [10, 10, 0, 0],
              color: self.barGrad(i === 0 ? '#e41e26' : '#f7941d', i === 0 ? '#ff8a80' : '#ffd08a', true)
            }
          })),
          barMaxWidth: mobile ? 44 : 52,
          barCategoryGap: '30%',
          label: {
            show: true,
            position: 'top',
            distance: 8,
            overflow: 'none',
            color: '#912018',
            fontWeight: 800,
            fontSize: mobile ? 11 : 12,
            formatter: (p) => String(p.value)
          }
        }
      ],
      animationDuration: 750,
      animationEasing: 'cubicOut'
    }, true);
    chart.resize({ width: chartW, height: chartH });
    setTimeout(() => chart.resize({ width: chartW, height: chartH }), 80);
  },

  /** Agrega jarras por lote desde filas o kpis.porLote (respaldo) */
  _loteItems(rows, kpis, limit) {
    const by = {};
    for (const r of rows || []) {
      if (Array.isArray(r.lotes) && r.lotes.length) {
        r.lotes.forEach((l) => {
          const name = String(l.lote || '').trim() || '(sin lote)';
          by[name] = (by[name] || 0) + (Number(l.c) || 0);
        });
      } else if (r.lote) {
        by[r.lote] = (by[r.lote] || 0) + (Number(r.c) || 0);
      }
    }
    if (!Object.keys(by).length && kpis && kpis.porLote && kpis.porLote.length) {
      kpis.porLote.forEach((l) => {
        const name = String(l.lote || '').trim() || '(sin lote)';
        by[name] = (by[name] || 0) + (Number(l.c) || 0);
      });
    }
    return Object.entries(by)
      .map(([lote, c]) => ({ lote, c: Math.round(c * 100) / 100 }))
      .sort((a, b) => b.c - a.c)
      .slice(0, limit || 12);
  },

  renderTopLotes(rows, kpis) {
    const chart = this.ensure('chartTopLotes');
    if (!chart) return;
    const items = this._loteItems(rows, kpis, 12);
    const self = this;
    const mobile = this.isMobile();
    if (!items.length) {
      chart.clear();
      chart.setOption({
        title: {
          text: 'Sin datos de lote',
          left: 'center',
          top: 'middle',
          textStyle: { color: '#6b7280', fontSize: 14, fontWeight: 600 }
        }
      });
      return;
    }
    chart.setOption({
      tooltip: Object.assign(this.tipBase(), {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (p) => {
          const row = items[p[0].dataIndex];
          return (
            '<b>#' +
            (p[0].dataIndex + 1) +
            ' · ' +
            row.lote +
            '</b><br/>Jarras: <b>' +
            row.c.toLocaleString('es-PE') +
            '</b>'
          );
        }
      }),
      grid: { left: 10, right: 12, top: 28, bottom: mobile ? 56 : 48, containLabel: true },
      toolbox: this.toolboxMini(),
      xAxis: {
        type: 'category',
        data: items.map((r) => self.shortLoteLabel(r.lote)),
        axisLabel: this._label({
          fontSize: mobile ? 9 : 10,
          fontWeight: 650,
          rotate: 28,
          color: '#1a2420'
        }),
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        name: 'Jarras',
        splitNumber: mobile ? 3 : 4,
        minInterval: 1,
        axisLabel: this._numAxisLabel(),
        splitLine: { lineStyle: { color: '#eef2ec', type: 'dashed' } }
      },
      series: [{
        type: 'bar',
        data: items.map((r, i) => ({
          value: r.c,
          itemStyle: {
            borderRadius: [12, 12, 4, 4],
            color: self.barGrad(self.logoPair(i)[0], self.logoPair(i)[1], true)
          }
        })),
        barMaxWidth: mobile ? 28 : 36,
        barCategoryGap: '32%',
        label: {
          show: true,
          position: 'top',
          color: '#143525',
          fontWeight: 750,
          fontSize: 11,
          formatter: (p) => self.fmtK(p.value)
        }
      }],
      animationDuration: 700
    }, true);
  },

  _insightTopLotes(rows, kpis) {
    const list = this._loteItems(rows, kpis, 50).map((r) => [r.lote, r.c]);
    if (!list.length) {
      this.setInsight('insightTopLotes', 'Sin lotes · confirma columna Lote en el registro.');
      return;
    }
    this.setInsight(
      'insightTopLotes',
      'Más jarras hoy: lote ' + list[0][0] + ' · ' + this.fmtK(list[0][1]) + ' jarras.'
    );
  },

  licPlaceColor(place, vertical) {
    const v = !!vertical;
    if (place === 1) return this.barGrad('#9a7208', '#e3c04a', v);
    if (place === 2) return this.barGrad('#5c6772', '#c4ccd4', v);
    if (place === 3) return this.barGrad('#7a4518', '#d4a06a', v);
    const greens = [
      ['#1e6b34', '#4ab848'],
      ['#246f3a', '#5cbf68'],
      ['#2a7540', '#6bc676']
    ];
    const pair = greens[(place - 4) % greens.length];
    return this.barGrad(pair[0], pair[1], v);
  },

  apellidoDe(grupo) {
    const jefe = this.jefeDe(grupo);
    if (!jefe) return this.shortGrupo(grupo);
    return jefe;
  },

  renderLicCups(ranked) {
    const host = document.getElementById('chartTopLicCups');
    if (!host) return;
    if (!ranked || !ranked.length) {
      host.innerHTML = '';
      host.hidden = true;
      return;
    }
    host.hidden = false;
    const esc = (s) =>
      String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    const ico = QB.icons || {};
    const cup = ico.trophy ? ico.trophy(16) : '';
    const star = ico.star ? ico.star(14) : '';
    host.innerHTML = ranked
      .map((g, i) => {
        const place = i + 1;
        const cls = place === 1 ? 'is-gold' : place === 2 ? 'is-silver' : place === 3 ? 'is-bronze' : 'is-rest';
        const mark = place === 1 ? cup : place <= 3 ? star : String(place);
        return (
          '<span class="lic-cup ' +
          cls +
          '" title="' +
          place +
          '.º · ' +
          esc(this.grupoConJefe(g.grupo)) +
          '">' +
          '<span class="lic-cup-mark" aria-hidden="true">' +
          mark +
          '</span>' +
          '<b>' +
          place +
          '.º</b>' +
          '<em>' +
          esc(this.shortGrupo(g.grupo)) +
          '</em>' +
          '</span>'
        );
      })
      .join('');
  },

  /** LIC · barras hacia arriba · apellido · copa formal encima */
  renderTopLic(stats) {
    const el = document.getElementById('chartTopLic');
    const cups = document.getElementById('chartTopLicCups');
    if (cups) {
      cups.innerHTML = '';
      cups.hidden = true;
    }
    const items = [...(stats || [])]
      .filter((g) => (g.c || 0) > 0)
      .sort((a, b) => (b.c || 0) - (a.c || 0) || (b.avg || 0) - (a.avg || 0));

    if (!el) return;
    const n = items.length;
    this._topLicCount = n;
    const mobile = this.isMobile();
    const fit = this._fitTopLicWidth(el, n);
    if (fit.avail < 40) {
      const tries = Number(el.dataset.fitTries || 0);
      if (tries < 8) {
        el.dataset.fitTries = String(tries + 1);
        const self = this;
        setTimeout(function () {
          self.renderTopLic(stats);
        }, 140);
      }
    } else {
      el.dataset.fitTries = '0';
    }

    const chart = this.ensure('chartTopLic');
    if (!chart) return;
    const self = this;
    if (!items.length) {
      chart.clear();
      chart.setOption({
        title: {
          text: 'Sin producción para ranking',
          left: 'center',
          top: 'middle',
          textStyle: { color: '#5a6b60', fontSize: 14, fontWeight: 600 }
        }
      });
      return;
    }
    const total = items.reduce((s, g) => s + (g.c || 0), 0) || 1;
    const fmtN = (v) => Number(v || 0).toLocaleString('es-PE', { maximumFractionDigits: 0 });
    chart.setOption({
      tooltip: Object.assign(this.tipBase(), {
        trigger: 'axis',
        axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(20, 53, 37, 0.06)' } },
        formatter: (p) => {
          const g = items[p[0].dataIndex];
          const rank = p[0].dataIndex + 1;
          const pct = (((g.c || 0) / total) * 100).toFixed(1);
          const puesto =
            rank === 1 ? 'Primer puesto' : rank === 2 ? 'Segundo puesto' : rank === 3 ? 'Tercer puesto' : rank + '.º puesto';
          return (
            '<div style="min-width:168px">' +
            '<div style="font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#6b7c72;margin-bottom:4px">' +
            puesto +
            '</div>' +
            '<b style="font-size:14px">' +
            self.apellidoDe(g.grupo) +
            '</b><br/>' +
            '<span style="color:#4a5c52">' +
            self.shortGrupo(g.grupo) +
            '</span><br/>' +
            '<span style="display:block;margin-top:6px">Jarras <b>' +
            fmtN(g.c) +
            '</b> · ' +
            pct +
            '% del día</span>' +
            '<span style="display:block">Ratio <b>' +
            self.fmtK(g.avg) +
            '</b></span></div>'
          );
        }
      }),
      grid: { left: 44, right: 16, top: 62, bottom: mobile ? 78 : 86, containLabel: false },
      toolbox: { show: false },
      xAxis: {
        type: 'category',
        data: items.map((g) => self.apellidoDe(g.grupo)),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#dfe6e0' } },
        axisLabel: this._label({
          fontSize: mobile ? 10 : 11,
          fontWeight: 700,
          color: '#143525',
          interval: 0,
          hideOverlap: false,
          lineHeight: 14,
          formatter: (v) => {
            const parts = String(v || '').trim().split(/\s+/);
            if (parts.length >= 2) return parts[0] + '\n' + parts.slice(1).join(' ');
            return v;
          }
        })
      },
      yAxis: {
        type: 'value',
        splitNumber: mobile ? 3 : 4,
        axisLabel: this._numAxisLabel(),
        splitLine: { lineStyle: { color: '#eef3ee', type: 'solid' } },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      series: [{
        type: 'bar',
        data: items.map((g, i) => ({
          value: g.c,
          itemStyle: {
            borderRadius: [10, 10, 3, 3],
            color: self.licPlaceColor(i + 1, true)
          }
        })),
        barMaxWidth: n <= 8 ? (mobile ? 48 : 64) : mobile ? 36 : 48,
        barCategoryGap: n <= 6 ? '22%' : '32%',
        showBackground: true,
        backgroundStyle: { color: 'rgba(20, 53, 37, 0.045)', borderRadius: [10, 10, 3, 3] },
        label: {
          show: true,
          position: 'top',
          distance: 6,
          formatter: (p) => {
            const place = p.dataIndex + 1;
            const tag = place === 1 ? 'gold' : place === 2 ? 'silv' : place === 3 ? 'bron' : 'rank';
            const mark = place <= 3 ? place + '.º' : String(place);
            return '{' + tag + '|' + mark + '}\n{val|' + self.fmtK(p.value) + '}';
          },
          rich: {
            gold: {
              backgroundColor: '#c9a227',
              color: '#fffdf4',
              fontWeight: 800,
              fontSize: mobile ? 10 : 11,
              borderRadius: 10,
              padding: [3, 8],
              align: 'center'
            },
            silv: {
              backgroundColor: '#7d8794',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: mobile ? 10 : 11,
              borderRadius: 10,
              padding: [3, 8],
              align: 'center'
            },
            bron: {
              backgroundColor: '#a06732',
              color: '#fff8f0',
              fontWeight: 800,
              fontSize: mobile ? 10 : 11,
              borderRadius: 10,
              padding: [3, 8],
              align: 'center'
            },
            rank: {
              backgroundColor: '#e8eee9',
              color: '#143525',
              fontWeight: 750,
              fontSize: mobile ? 10 : 11,
              borderRadius: 10,
              padding: [3, 7],
              align: 'center'
            },
            val: {
              fontSize: mobile ? 10 : 11,
              fontWeight: 750,
              color: '#143525',
              lineHeight: 18,
              align: 'center',
              padding: [4, 0, 0, 0]
            }
          }
        }
      }],
      animationDuration: 720,
      animationEasing: 'cubicOut'
    }, true);
    requestAnimationFrame(function () {
      if (!chart.isDisposed()) chart.resize();
    });
  },

  _insightTopLic(stats) {
    const top = [...(stats || [])].filter((g) => g.c > 0).sort((a, b) => (b.c || 0) - (a.c || 0) || (b.avg || 0) - (a.avg || 0))[0];
    if (!top) {
      this.setInsight('insightTopLic', 'Sin LIC con producción.');
      return;
    }
    const n = [...(stats || [])].filter((g) => g.c > 0).length;
    this.setInsight(
      'insightTopLic',
      '1.º por jarras: ' +
        this.apellidoDe(top.grupo) +
        ' · ' +
        Number(top.c).toLocaleString('es-PE', { maximumFractionDigits: 0 }) +
        ' jarras · ratio ' +
        this.fmtK(top.avg) +
        ' · ' +
        n +
        ' grupos.'
    );
  },

  /** Todos los supervisores · ranking completo */
  renderLiderazgo(supervisores) {
    const el = document.getElementById('chartLiderazgo');
    if (!el) return;
    this.dispose('chartLiderazgo');
    const KG = 1.15;
    const items = [...(supervisores || [])]
      .filter((s) => (s.c || 0) > 0)
      .sort((a, b) => (b.avg || 0) - (a.avg || 0) || (b.c || 0) - (a.c || 0));
    if (!items.length) {
      el.innerHTML = '<p class="sup-rank-empty">Sin supervisores con producción.</p>';
      return;
    }
    const esc = (s) =>
      String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    const num = (n) => Number(n || 0).toLocaleString('es-PE', { maximumFractionDigits: 1 });
    const ico = QB.icons || {};
    const cups = [
      ico.cupGold ? ico.cupGold(36) : '',
      ico.cupSilver ? ico.cupSilver(32) : '',
      ico.cupBronze ? ico.cupBronze(32) : ''
    ];
    const placeMeta = [
      { cls: 'is-gold', tag: 'Primer puesto', cup: cups[0] },
      { cls: 'is-silver', tag: 'Segundo puesto', cup: cups[1] },
      { cls: 'is-bronze', tag: 'Tercer puesto', cup: cups[2] }
    ];
    const medalHtml = (place) => {
      const meta = placeMeta[place - 1];
      if (meta) {
        return (
          '<span class="sup-medal ' +
          meta.cls +
          '" title="' +
          place +
          '.º ' +
          meta.tag +
          '">' +
          meta.cup +
          '</span>'
        );
      }
      return '<span class="sup-medal is-rest">' + place + '</span>';
    };
    const rows = items
      .map((s, i) => {
        const place = i + 1;
        const kg = (Number(s.c) || 0) * KG;
        const rowCls = place === 1 ? 'is-gold' : place === 2 ? 'is-silver' : place === 3 ? 'is-bronze' : '';
        const best =
          s.bestNombre && s.bestNombre !== '—'
            ? '<span class="sup-best-pick">' +
              (ico.crown ? ico.crown(12) : '') +
              '<span class="sup-best-name">' +
              esc(s.bestNombre) +
              '</span></span>'
            : '<span class="sup-best-empty">—</span>';
        return (
          '<tr class="' +
          rowCls +
          '">' +
          '<td class="num sup-rank-place">' +
          medalHtml(place) +
          '</td>' +
          '<td><strong>' +
          esc(s.nombre) +
          '</strong><span class="sup-rank-lic">' +
          esc(s.lic) +
          '</span></td>' +
          '<td class="sup-rank-best">' +
          best +
          '</td>' +
          '<td class="num">' +
          num(s.c) +
          '</td>' +
          '<td class="num">' +
          num(kg) +
          '</td>' +
          '<td class="num">' +
          num(s.avg) +
          '</td>' +
          '</tr>'
        );
      })
      .join('');
    el.innerHTML =
      '<div class="sup-rank-board">' +
      '<div class="sup-rank-scroll">' +
      '<table class="sup-rank-table">' +
      '<thead><tr>' +
      '<th class="num">Copa</th>' +
      '<th>Supervisor</th>' +
      '<th><span class="th-with-ico">' +
      (ico.crown ? ico.crown(13) : '') +
      '<span>Mejor cosechador</span></span></th>' +
      '<th class="num">Jarras</th>' +
      '<th class="num"><span class="th-with-ico">' +
      (ico.blueberrySoft ? ico.blueberrySoft(13) : '') +
      '<span>kg</span></span></th>' +
      '<th class="num"><span class="th-with-ico">' +
      (ico.personSoft ? ico.personSoft(13) : '') +
      '<span>Ratio</span></span></th>' +
      '</tr></thead>' +
      '<tbody>' +
      rows +
      '</tbody></table></div></div>';
  },

  _insightLiderazgo(supervisores) {
    const list = [...(supervisores || [])]
      .filter((s) => (s.c || 0) > 0)
      .sort((a, b) => (b.avg || 0) - (a.avg || 0) || (b.c || 0) - (a.c || 0));
    if (!list.length) {
      this.setInsight('insightLiderazgo', 'Sin supervisores para mostrar.');
      return;
    }
    const top = list[0];
    const host = document.getElementById('chartLiderazgo');
    const variedad = host ? String(host.getAttribute('data-variedad') || '').trim() : '';
    this.setInsight(
      'insightLiderazgo',
      (variedad ? variedad + ' · ' : '') +
        list.length +
        ' supervisores · 1.º ' +
        top.nombre +
        ' · ' +
        this.fmtK(top.c) +
        ' jarras · ' +
        this.fmtK(top.c * 1.15) +
        ' kg · ratio ' +
        this.fmtK(top.avg) +
        '.'
    );
  },

  /** Tarjetas alineadas · siempre 3 en Atención (Mejor · Peor · Menos personal) · por jarras totales */
  renderSupervisorAlerts(stats, merged) {
    const host = document.getElementById('attnList');
    if (!host) return;
    const withN = (stats || []).filter((g) => g.n > 0);

    if (!withN.length) {
      host.innerHTML =
        '<article class="attn-card is-ok">' +
        '<div class="attn-top"><span class="attn-tag">Info</span>' +
        '<div class="attn-who"><strong class="attn-lic">—</strong><span class="attn-jefe">Sin datos</span></div></div>' +
        '<div class="attn-metrics"><span><b>—</b> cosech.</span><span><b>—</b> jarras</span><span><b>—</b> promedio</span></div>' +
        '<span class="attn-action">Sin alertas por ahora</span></article>';
      return;
    }

    const byPeopleAsc = [...withN].sort((a, b) => a.n - b.n || a.c - b.c);
    const byJarrasAsc = [...withN].sort((a, b) => a.c - b.c || a.n - b.n);
    const byJarrasDesc = [...withN].sort((a, b) => b.c - a.c || b.n - a.n);

    const best = byJarrasDesc[0];
    let worst = byJarrasAsc[0];
    if (worst && best && worst.grupo === best.grupo && byJarrasAsc.length > 1) {
      worst = byJarrasAsc[1];
    }
    let few =
      byPeopleAsc.find((g) => g.grupo !== best.grupo && g.grupo !== worst.grupo) ||
      byPeopleAsc.find((g) => g.grupo !== best.grupo) ||
      byPeopleAsc[0];

    const fecha =
      (window.QB && QB.appFechaIso && QB.appFechaIso()) ||
      (window.QB && QB.appFecha ? QB.appFecha() : '');
    const jefe = (g) => {
      if (!window.QB || !QB.supervisors) return 'Sin jefe';
      return QB.supervisors.label(g, fecha) || 'Sin jefe';
    };
    const jefeFull = (g) => {
      if (!window.QB || !QB.supervisors) return '';
      return QB.supervisors.fullLabel(g, fecha) || '';
    };
    const card = (kind, tag, row, action) => ({
      kind,
      tag,
      lic: this.shortGrupo(row.grupo),
      jefe: jefe(row.grupo),
      jefeTitle: jefeFull(row.grupo),
      n: row.n,
      c: this.fmtK(row.c),
      avg: this.fmtK(row.avg),
      action
    });

    const cards = [
      card('ok', 'Mejor LIC', best, 'Referencia del día'),
      card('warn', 'Peor LIC', worst, 'Revisar lote'),
      card('warn', 'Menos personal', few, 'Sumar cosechadores')
    ];

    host.innerHTML = cards
      .map((c) => {
        return (
          '<article class="attn-card is-' +
          c.kind +
          '">' +
          '<div class="attn-top">' +
          '<span class="attn-tag">' +
          c.tag +
          '</span>' +
          '<div class="attn-who">' +
          '<strong class="attn-lic">' +
          c.lic +
          '</strong>' +
          '<span class="attn-jefe" title="' +
          (c.jefeTitle || c.jefe).replace(/"/g, '&quot;') +
          '">Jefe · ' +
          c.jefe +
          '</span>' +
          '</div>' +
          '</div>' +
          '<div class="attn-metrics">' +
          '<span><b>' +
          c.n +
          '</b> cosech.</span>' +
          '<span><b>' +
          c.c +
          '</b> jarras</span>' +
          '<span><b>' +
          c.avg +
          '</b> promedio</span>' +
          '</div>' +
          '<span class="attn-action">' +
          c.action +
          '</span>' +
          '</article>'
        );
      })
      .join('');
  },

  _insightGrupos(stats) {
    if (!stats.length) {
      this.setInsight('insightGrupos', 'Sin datos de grupos hoy.');
      return;
    }
    const top = stats[0];
    const low = stats[stats.length - 1];
    this.setInsight(
      'insightGrupos',
      'Hoy lidera ' +
        this.grupoConJefe(top.grupo) +
        ' con ' +
        this.fmtK(top.c) +
        ' jarras' +
        (top.n ? ' (' + top.n + ' personas)' : '') +
        '. El más bajo es ' +
        this.grupoConJefe(low.grupo) +
        ' con ' +
        this.fmtK(low.c) +
        '.'
    );
  },

  _insightTrabajadores(rows) {
    const list = [...(rows || [])].sort((a, b) => (b.c || 0) - (a.c || 0));
    if (!list.length) {
      this.setInsight('insightTrabajadores', 'Sin trabajadores en el día.');
      return;
    }
    const top = list[0];
    const med = list[Math.floor(list.length / 2)];
    this.setInsight(
      'insightTrabajadores',
      'Mejor: ' +
        this.shortName(top) +
        ' (' +
        this.fmtK(top.c) +
        ' jarras). Mediana del día ≈ ' +
        this.fmtK(med.c) +
        '. Revisa a quienes están muy por debajo.'
    );
  },

  _insightLotes(rows) {
    const by = {};
    for (const r of rows || []) {
      if (Array.isArray(r.lotes) && r.lotes.length) {
        r.lotes.forEach((l) => {
          const name = l.lote || '(sin lote)';
          by[name] = (by[name] || 0) + (l.c || 0);
        });
      } else if (r.lote) {
        by[r.lote] = (by[r.lote] || 0) + (r.c || 0);
      }
    }
    const list = Object.entries(by)
      .map(([lote, c]) => ({ lote, c }))
      .sort((a, b) => b.c - a.c);
    if (!list.length) {
      this.setInsight('insightLotes', 'Sin desglose por lote.');
      return;
    }
    const hi = list[0];
    const lo = list[list.length - 1];
    this.setInsight(
      'insightLotes',
      'Lote fuerte: ' +
        hi.lote +
        ' (' +
        this.fmtK(hi.c) +
        '). Lote flojo: ' +
        lo.lote +
        ' (' +
        this.fmtK(lo.c) +
        '). Prioriza refuerzo donde hay menos avance.'
    );
  },

  _insightGrupoPersona(stats) {
    const withN = (stats || []).filter((g) => g.n > 0);
    if (!withN.length) {
      this.setInsight('insightGrupoPersona', 'Falta conteo de personas por grupo.');
      return;
    }
    const byAvg = [...withN].sort((a, b) => b.avg - a.avg);
    const best = byAvg[0];
    const worst = byAvg[byAvg.length - 1];
    this.setInsight(
      'insightGrupoPersona',
      'Mejor ritmo: ' +
        this.shortGrupo(best.grupo) +
        ' ≈ ' +
        this.fmtK(best.avg) +
        ' jarras/persona. Más bajo: ' +
        this.shortGrupo(worst.grupo) +
        ' ≈ ' +
        this.fmtK(worst.avg) +
        '. Así comparas justo aunque un grupo sea más chico.'
    );
  },

  _insightRankingGrupos(stats) {
    const withN = (stats || []).filter((g) => g.n > 0).sort((a, b) => b.avg - a.avg);
    if (!withN.length) {
      this.setInsight('insightRankingGrupos', 'Sin ranking aún.');
      return;
    }
    const top = withN.slice(0, 2).map((g) => this.shortGrupo(g.grupo)).join(', ');
    const bottom = withN.slice(-2).map((g) => this.shortGrupo(g.grupo)).join(', ');
    this.setInsight(
      'insightRankingGrupos',
      'Top ritmo: ' + top + '. Revisar: ' + bottom + '. El ranking usa jarras por persona, no solo el total.'
    );
  },

  _insightLoteGrupo(rows) {
    const map = {};
    for (const r of rows || []) {
      const g = String(r.grupo || '').trim();
      if (!g) continue;
      if (Array.isArray(r.lotes) && r.lotes.length) {
        r.lotes.forEach((l) => {
          const lote = String(l.lote || '').trim();
          if (!lote) return;
          const k = g + '|' + lote;
          map[k] = (map[k] || 0) + (Number(l.c) || 0);
        });
      } else if (r.lote) {
        const k = g + '|' + String(r.lote).trim();
        map[k] = (map[k] || 0) + (Number(r.c) || 0);
      }
    }
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
    if (!entries.length) {
      this.setInsight('insightLoteGrupo', 'Sin datos de lote para armar el mapa.');
      return;
    }
    const hi = entries[0][0].split('|');
    const lo = entries[entries.length - 1][0].split('|');
    const hiLote = hi.slice(1).join('|');
    const loLote = lo.slice(1).join('|');
    this.setInsight(
      'insightLoteGrupo',
      'Más jarras: ' +
        this.shortGrupo(hi[0]) +
        ' en lote ' +
        hiLote +
        '. Más flojo: ' +
        this.shortGrupo(lo[0]) +
        ' en lote ' +
        loLote +
        '. Ahí conviene mirar si faltó gente o bajó el ritmo.'
    );
  },

  _insightJarrasVs(stats) {
    const withN = (stats || []).filter((g) => g.n > 0);
    if (!withN.length) {
      this.setInsight('insightJarrasVs', 'Sin datos para comparar personal vs jarras.');
      return;
    }
    const avgPeople = withN.reduce((s, g) => s + g.n, 0) / withN.length;
    const avgPer = withN.reduce((s, g) => s + g.avg, 0) / withN.length;
    const fewPeople = [...withN].sort((a, b) => a.n - b.n)[0];
    const lowRhythm = [...withN].sort((a, b) => a.avg - b.avg)[0];

    let msg = '';
    if (fewPeople.n < avgPeople * 0.7) {
      msg =
        this.shortGrupo(fewPeople.grupo) +
        ' tiene solo ' +
        fewPeople.n +
        ' personas y ' +
        this.fmtK(fewPeople.c) +
        ' jarras. Idea: aumentar cosechadores en ese grupo.';
    }
    if (lowRhythm.avg < avgPer * 0.75 && lowRhythm.n >= avgPeople * 0.8) {
      const part =
        this.shortGrupo(lowRhythm.grupo) +
        ' ya tiene ' +
        lowRhythm.n +
        ' personas pero solo ' +
        this.fmtK(lowRhythm.avg) +
        ' jarras/persona. Idea: revisar ritmo/lote, no solo sumar gente.';
      msg = msg ? msg + ' · ' + part : part;
    }
    if (!msg) {
      msg =
        'Los grupos están alineados: más gente ≈ más jarras. Si un punto queda abajo de la línea, el ritmo es bajo; si queda a la izquierda, faltan personas.';
    }
    this.setInsight('insightJarrasVs', msg);
  },

  renderTrabajadores(rows) {
    const chart = this.ensure('chartTrabajadores');
    if (!chart) return;
    const top = [...(rows || [])].sort((a, b) => (b.c || 0) - (a.c || 0)).slice(0, 12).reverse();
    const mobile = this.isMobile();
    const self = this;
    chart.setOption({
      tooltip: Object.assign(this.tipBase(), {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (p) => {
          const r = top[p[0].dataIndex];
          if (!r) return '';
          const rank = top.length - p[0].dataIndex;
          return (
            '<b>#' +
            rank +
            ' · ' +
            self.shortName(r) +
            '</b><br/>Grupo: ' +
            self.shortGrupo(r.grupo) +
            '<br/>Jarras: <b>' +
            Number(r.c).toLocaleString('es-PE') +
            '</b>'
          );
        }
      }),
      grid: { left: 8, right: mobile ? 40 : 56, top: 16, bottom: 16, containLabel: true },
      toolbox: this.toolboxMini(),
      dataZoom: this.zoomOpts('y', top.length),
      xAxis: {
        type: 'value',
        axisLabel: this._baseText(),
        splitLine: { lineStyle: { color: '#eef2ec', type: 'dashed' } }
      },
      yAxis: {
        type: 'category',
        data: top.map((r) => self.shortName(r)),
        axisLabel: this._label({ fontSize: mobile ? 11 : 12, fontWeight: 650, color: '#1a2420' }),
        axisTick: { show: false },
        axisLine: { show: false }
      },
      series: [{
        type: 'bar',
        data: top.map((r, i) => ({
          value: r.c,
          itemStyle: {
            borderRadius: [0, 14, 14, 0],
            color: self.rankColor(top.length - 1 - i)
          }
        })),
        barMaxWidth: mobile ? 26 : 30,
        barCategoryGap: '28%',
        showBackground: true,
        backgroundStyle: { color: 'rgba(228, 30, 38, 0.05)', borderRadius: [0, 14, 14, 0] },
        label: {
          show: true,
          position: 'right',
          color: '#143525',
          fontWeight: 750,
          fontSize: mobile ? 11 : 12,
          formatter: (p) => self.fmtK(p.value)
        }
      }],
      animationDuration: 700
    }, true);
    chart.off('click');
    chart.on('click', (params) => {
      const row = top[params.dataIndex];
      if (row && self.onWorkerClick) self.onWorkerClick(row);
    });
  },

  renderGrupoPorPersona(stats) {
    const chart = this.ensure('chartGrupoPersona');
    if (!chart) return;
    const items = [...(stats || [])].filter((g) => g.n > 0).sort((a, b) => a.avg - b.avg);
    const mobile = this.isMobile();
    const self = this;
    if (!items.length) {
      chart.clear();
      chart.setOption({
        title: {
          text: 'Sin datos de personas por grupo',
          left: 'center',
          top: 'middle',
          textStyle: { color: '#6b7280', fontSize: 14, fontWeight: 600 }
        }
      });
      return;
    }
    chart.setOption({
      tooltip: Object.assign(this.tipBase(), {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (p) => {
          const g = items[p[0].dataIndex];
          if (!g) return '';
          return (
            '<b>' +
            self.shortGrupo(g.grupo) +
            '</b><br/>Jarras/persona: <b>' +
            g.avg.toLocaleString('es-PE') +
            '</b><br/>Personas: ' +
            g.n +
            '<br/>Total jarras: ' +
            self.fmtK(g.c)
          );
        }
      }),
      grid: { left: 8, right: mobile ? 44 : 58, top: 16, bottom: 16, containLabel: true },
      toolbox: this.toolboxMini(),
      xAxis: {
        type: 'value',
        name: 'Jarras / persona',
        axisLabel: this._baseText(),
        splitLine: { lineStyle: { color: '#eef2ec', type: 'dashed' } }
      },
      yAxis: {
        type: 'category',
        data: items.map((g) => self.grupoConJefe(g.grupo)),
        axisLabel: this._label({ fontSize: mobile ? 11 : 12, fontWeight: 650, color: '#1a2420' }),
        axisTick: { show: false },
        axisLine: { show: false }
      },
      series: [{
        type: 'bar',
        data: items.map((g, i) => {
          const rank = items.length - 1 - i;
          return {
            value: g.avg,
            itemStyle: {
              borderRadius: [0, 14, 14, 0],
              color: self.rankColor(rank)
            }
          };
        }),
        barMaxWidth: mobile ? 26 : 30,
        barCategoryGap: '28%',
        showBackground: true,
        backgroundStyle: { color: 'rgba(141, 198, 63, 0.07)', borderRadius: [0, 14, 14, 0] },
        label: {
          show: true,
          position: 'right',
          color: '#143525',
          fontWeight: 750,
          fontSize: mobile ? 11 : 12,
          formatter: (p) => {
            const g = items[p.dataIndex];
            return self.fmtK(p.value) + ' · ' + g.n + ' pers.';
          }
        }
      }],
      animationDuration: 700
    }, true);
  },

  renderRankingGrupos(stats) {
    const chart = this.ensure('chartRankingGrupos');
    if (!chart) return;
    const items = [...(stats || [])].filter((g) => g.n > 0).sort((a, b) => a.avg - b.avg);
    const self = this;
    const mobile = this.isMobile();
    if (!items.length) {
      chart.clear();
      return;
    }
    chart.setOption({
      tooltip: Object.assign(this.tipBase(), {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (p) => {
          const g = items[p[0].dataIndex];
          const rank = items.length - p[0].dataIndex;
          return (
            '<b>#' +
            rank +
            ' · ' +
            self.grupoConJefe(g.grupo) +
            '</b><br/>' +
            g.avg.toLocaleString('es-PE') +
            ' jarras/persona<br/>' +
            g.n +
            ' personas · total ' +
            self.fmtK(g.c)
          );
        }
      }),
      grid: { left: 8, right: mobile ? 40 : 56, top: 16, bottom: 16, containLabel: true },
      toolbox: this.toolboxMini(),
      xAxis: {
        type: 'value',
        axisLabel: this._baseText(),
        splitLine: { lineStyle: { color: '#eef2ec', type: 'dashed' } }
      },
      yAxis: {
        type: 'category',
        data: items.map((g, i) => {
          const rank = items.length - i;
          const label = '#' + rank + ' ' + self.grupoConJefe(g.grupo);
          return label.length > 26 ? label.slice(0, 24) + '…' : label;
        }),
        axisLabel: this._label({ fontSize: mobile ? 11 : 12, fontWeight: 650, color: '#1a2420' }),
        axisTick: { show: false },
        axisLine: { show: false }
      },
      series: [{
        type: 'bar',
        data: items.map((g, i) => {
          const fromTop = items.length - 1 - i;
          return {
            value: g.avg,
            itemStyle: {
              borderRadius: [0, 14, 14, 0],
              color: self.rankColor(fromTop)
            }
          };
        }),
        barMaxWidth: mobile ? 26 : 30,
        barCategoryGap: '28%',
        showBackground: true,
        backgroundStyle: { color: 'rgba(247, 148, 29, 0.06)', borderRadius: [0, 14, 14, 0] },
        label: {
          show: true,
          position: 'right',
          color: '#143525',
          fontWeight: 750,
          fontSize: mobile ? 11 : 12,
          formatter: (p) => self.fmtK(p.value)
        }
      }],
      animationDuration: 700
    }, true);
  },

  shortLoteLabel(lote) {
    const s = String(lote || '').trim();
    if (!s) return '—';
    return s.length > 14 ? s.slice(0, 12) + '…' : s;
  },

  renderHeatLoteGrupo(rows) {
    const chart = this.ensure('chartLoteGrupo');
    if (!chart) return;
    const map = {};
    const loteTot = {};
    for (const r of rows || []) {
      const g = String(r.grupo || '').trim();
      if (!g) continue;
      const add = (lote, c) => {
        const lot = String(lote || '').trim();
        if (!lot) return;
        const k = g + '||' + lot;
        map[k] = (map[k] || 0) + (Number(c) || 0);
        loteTot[lot] = (loteTot[lot] || 0) + (Number(c) || 0);
      };
      if (Array.isArray(r.lotes) && r.lotes.length) {
        r.lotes.forEach((l) => add(l.lote, l.c));
      } else if (r.lote) {
        add(r.lote, r.c);
      }
    }
    const lotes = Object.keys(loteTot)
      .sort((a, b) => loteTot[b] - loteTot[a])
      .slice(0, 10);
    const grupos = [...new Set(Object.keys(map).map((k) => k.split('||')[0]))].sort();
    if (!grupos.length || !lotes.length) {
      chart.clear();
      chart.setOption({
        title: {
          text: 'Sin datos lote × grupo',
          left: 'center',
          top: 'middle',
          textStyle: { color: '#6b7280', fontSize: 14, fontWeight: 600 }
        }
      });
      return;
    }
    let maxVal = 0;
    const heatData = [];
    grupos.forEach((g, yi) => {
      lotes.forEach((lot, xi) => {
        const v = Math.round((map[g + '||' + lot] || 0) * 10) / 10;
        if (v > maxVal) maxVal = v;
        heatData.push([xi, yi, v]);
      });
    });
    const self = this;
    const mobile = this.isMobile();
    chart.setOption({
      tooltip: Object.assign(this.tipBase(), {
        position: 'top',
        formatter: (p) => {
          const v = p.data[2];
          if (!v) return '';
          return (
            '<b>' +
            self.grupoConJefe(grupos[p.data[1]]) +
            '</b><br/>Lote: <b>' +
            lotes[p.data[0]] +
            '</b><br/>Jarras: <b>' +
            Number(v).toLocaleString('es-PE') +
            '</b>'
          );
        }
      }),
      toolbox: this.toolboxMini(),
      grid: { left: 4, right: 48, top: 8, bottom: mobile ? 48 : 36, containLabel: true },
      xAxis: {
        type: 'category',
        data: lotes.map((l) => self.shortLoteLabel(l)),
        splitArea: { show: true },
        axisLabel: this._label({
          fontWeight: 650,
          fontSize: mobile ? 9 : 10,
          rotate: mobile ? 35 : 25
        })
      },
      yAxis: {
        type: 'category',
        data: grupos.map((g) => self.shortGrupo(g)),
        splitArea: { show: true },
        axisLabel: this._label({ fontWeight: 650, fontSize: 11 })
      },
      visualMap: {
        min: 0,
        max: maxVal || 1,
        calculable: true,
        orient: 'vertical',
        right: 0,
        top: 'center',
        itemWidth: 12,
        itemHeight: 80,
        text: ['Alto', 'Bajo'],
        textStyle: { fontSize: 10, color: '#5f7264' },
        inRange: { color: ['#f3f9e9', '#c5e88a', '#8dc63f', '#4ab848', '#2f9e44'] }
      },
      series: [{
        type: 'heatmap',
        data: heatData,
        label: {
          show: !mobile || lotes.length <= 6,
          fontSize: 9,
          fontWeight: 700,
          color: '#142019',
          formatter: (p) => (p.data[2] > 0 ? self.fmtK(p.data[2]) : '')
        },
        emphasis: { itemStyle: { shadowBlur: 6, shadowColor: 'rgba(0,0,0,0.15)' } }
      }]
    }, true);
  },

  /** @deprecated */
  renderHeatTurnoGrupo(rows) {
    this.renderHeatLoteGrupo(rows);
  },

  renderJarrasVsPersonas(stats) {
    const chart = this.ensure('chartJarrasVs');
    if (!chart) return;
    const items = [...(stats || [])].filter((g) => g.n > 0);
    const self = this;
    if (!items.length) {
      chart.clear();
      return;
    }
    const avgPer =
      items.reduce((s, g) => s + g.avg, 0) / items.length || 1;
    const maxN = Math.max.apply(
      null,
      items.map((g) => g.n)
    );
    const linePts = [
      [0, 0],
      [maxN * 1.05, avgPer * maxN * 1.05]
    ];
    chart.setOption({
      tooltip: Object.assign(this.tipBase(), {
        formatter: (p) => {
          if (p.seriesType !== 'scatter') return '';
          const g = items[p.dataIndex];
          if (!g) return '';
          const vs = g.avg >= avgPer * 0.9 ? 'ritmo OK' : 'ritmo bajo';
          const people =
            g.n < maxN * 0.5 ? 'pocas personas' : 'personal suficiente';
          return (
            '<b>' +
            self.grupoConJefe(g.grupo) +
            '</b><br/>Personas: <b>' +
            g.n +
            '</b><br/>Jarras: <b>' +
            self.fmtK(g.c) +
            '</b><br/>' +
            g.avg.toLocaleString('es-PE') +
            ' / persona<br/><i>' +
            people +
            ' · ' +
            vs +
            '</i>'
          );
        }
      }),
      toolbox: this.toolboxMini(),
      grid: { left: 8, right: 16, top: 28, bottom: 40, containLabel: true },
      xAxis: {
        type: 'value',
        name: 'Personas',
        nameLocation: 'middle',
        nameGap: 28,
        min: 0,
        axisLabel: this._baseText(),
        splitLine: { lineStyle: { color: '#eef2ec', type: 'dashed' } }
      },
      yAxis: {
        type: 'value',
        name: 'Jarras',
        axisLabel: this._baseText(),
        splitLine: { lineStyle: { color: '#eef2ec', type: 'dashed' } }
      },
      series: [
        {
          name: 'Esperado',
          type: 'line',
          data: linePts,
          symbol: 'none',
          lineStyle: { type: 'dashed', color: '#9ca3af', width: 2 },
          tooltip: { show: false },
          silent: true
        },
        {
          name: 'Grupos',
          type: 'scatter',
          symbolSize: (val, p) => {
            const g = items[p.dataIndex];
            return Math.max(14, Math.min(34, 10 + (g && g.n ? g.n : 8)));
          },
          data: items.map((g) => ({
            value: [g.n, g.c],
            itemStyle: {
              color: g.avg >= avgPer * 0.9 ? '#2f7d4a' : '#6b7280',
              borderColor: '#fff',
              borderWidth: 2
            },
            label: {
              show: true,
              formatter: self.grupoConJefe(g.grupo),
              position: 'top',
              fontSize: 10,
              fontWeight: 650,
              color: '#374151'
            }
          }))
        }
      ],
      animationDuration: 550
    }, true);
  },

  renderHistorialBarras(serie) {
    const chart = this.ensure('chartHistorial');
    if (!chart) return;
    const rows = serie || [];
    if (!rows.length) {
      chart.clear();
      chart.setOption({
        title: {
          text: 'Sin fechas cargadas',
          left: 'center',
          top: 'middle',
          textStyle: { color: '#6b7280', fontSize: 13, fontWeight: 600 }
        }
      });
      return;
    }
    const self = this;
    const mobile = this.isMobile();
    chart.setOption({
      tooltip: Object.assign(this.tipBase(), {
        trigger: 'axis',
        formatter: function (items) {
          const i = items && items[0] ? items[0].dataIndex : 0;
          const r = rows[i] || {};
          const est =
            r.estado === 'ok' ? 'Asistió' : r.estado === 'falta' ? 'Faltó' : r.estado === 'permiso' ? 'Permiso' : 'Sin data';
          return (
            '<b>' +
            self.fmtFecha(r.fecha) +
            '</b><br/>' +
            est +
            (r.supervisor ? '<br/>Jefe: ' + r.supervisor : '') +
            (r.lic ? '<br/>' + r.lic : '') +
            (r.jarras ? '<br/>Jarras: ' + r.jarras : '')
          );
        }
      }),
      grid: { left: 8, right: 8, top: 18, bottom: mobile ? 28 : 36, containLabel: true },
      xAxis: {
        type: 'category',
        data: rows.map((r) => r.label),
        axisLabel: this._label({ fontSize: mobile ? 10 : 11, color: '#4b5563' }),
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: this._baseText(),
        splitLine: { lineStyle: { color: '#eef2ec', type: 'dashed' } }
      },
      series: [
        {
          type: 'bar',
          data: rows.map((r) => ({
            value: r.estado === 'falta' ? Math.max(r.valor || 0, 1) : r.valor,
            itemStyle: {
              borderRadius: [6, 6, 0, 0],
              color:
                r.estado === 'ok'
                  ? self.barGrad('#4ab848', '#8dc63f', true)
                  : r.estado === 'falta'
                  ? self.barGrad('#e41e26', '#fb7185', true)
                  : '#d1d5db'
            }
          })),
          barMaxWidth: 28,
          label: {
            show: true,
            position: 'top',
            formatter: function (p) {
              const r = rows[p.dataIndex] || {};
              return r.estado === 'falta' ? 'F' : r.jarras ? String(r.jarras) : '';
            },
            fontSize: mobile ? 9 : 10,
            fontWeight: 700,
            color: '#374151'
          }
        }
      ],
      animationDuration: 500
    }, true);
  }
};

window.addEventListener('resize', () => {
  clearTimeout(window.__qbChartResize);
  window.__qbChartResize = setTimeout(() => QB.charts.resizeAll(), 120);
});

document.addEventListener('DOMContentLoaded', () => {
  const row = document.querySelector('.charts-row');
  if (!row) return;
  let t;
  row.addEventListener(
    'scroll',
    () => {
      clearTimeout(t);
      t = setTimeout(() => QB.charts.resizeAll(), 80);
    },
    { passive: true }
  );
});