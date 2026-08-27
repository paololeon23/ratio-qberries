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
    if (!el) return null;
    if (this.instances[id]) {
      this.instances[id].dispose();
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const chart = echarts.init(el, null, { renderer: 'canvas', devicePixelRatio: dpr });
    this.instances[id] = chart;
    return chart;
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
    Object.values(this.instances).forEach((c) => c && c.resize());
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
    const jefe = window.QB && QB.supervisors ? QB.supervisors.label(g) : '';
    return jefe ? base + ' · ' + jefe : base;
  },

  jefeDe(g) {
    return window.QB && QB.supervisors ? QB.supervisors.label(g) : '';
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
    for (const r of rows || []) {
      const g = String(r.grupo || '').trim() || '(sin grupo)';
      if (!map[g]) map[g] = { grupo: g, c: 0, workers: {} };
      map[g].c += Number(r.c) || 0;
      const ci = String(r.ci || '');
      if (ci) {
        if (!map[g].workers[ci]) map[g].workers[ci] = 0;
        map[g].workers[ci] += Number(r.c) || 0;
      }
    }
    return Object.keys(map)
      .map((k) => {
        const g = map[k];
        const n = Object.keys(g.workers).length;
        const c = Math.round(g.c * 100) / 100;
        return {
          grupo: g.grupo,
          c,
          n,
          avg: n ? Math.round((c / n) * 100) / 100 : 0
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

  /** Gauge · promedio con zonas de color */
  renderGauge(kpis) {
    const chart = this.ensure('chartGauge');
    if (!chart) return;
    const mobile = this.isMobile();
    const avg = Number((kpis && kpis.promedioCajasPorTrabajador) || 0);
    const max = Math.max(120, Math.ceil((avg * 1.6) / 10) * 10 || 120);
    const pct = max ? avg / max : 0;
    let zoneText = 'Ritmo bajo';
    let zoneColor = '#e41e26';
    if (pct >= 0.75) { zoneText = '¡Excelente!'; zoneColor = '#4ab848'; }
    else if (pct >= 0.5) { zoneText = 'Buen ritmo'; zoneColor = '#8dc63f'; }
    else if (pct >= 0.35) { zoneText = 'Ritmo regular'; zoneColor = '#f7941d'; }

    chart.setOption({
      toolbox: this.toolboxMini(),
      series: [{
        type: 'gauge',
        center: ['50%', mobile ? '54%' : '52%'],
        radius: mobile ? '86%' : '90%',
        min: 0,
        max,
        startAngle: 210,
        endAngle: -30,
        progress: { show: true, width: mobile ? 14 : 16, itemStyle: { color: zoneColor } },
        axisLine: {
          lineStyle: {
            width: mobile ? 14 : 16,
            color: [
              [0.35, '#fecaca'],
              [0.5, '#fed7aa'],
              [0.75, '#d9f99d'],
              [1, '#86efac']
            ]
          }
        },
        axisTick: { show: false },
        splitLine: { length: 10, lineStyle: { color: '#c5d4ca', width: 2 } },
        axisLabel: { distance: 16, color: '#5f7264', fontSize: 11, fontFamily: 'IBM Plex Sans' },
        pointer: { length: '60%', width: 6, itemStyle: { color: '#142019' } },
        anchor: { show: true, size: 12, itemStyle: { color: zoneColor, borderWidth: 2, borderColor: '#fff' } },
        detail: {
          valueAnimation: true,
          formatter: (v) => Number(v).toFixed(1) + '\npromedio\n' + zoneText,
          color: '#142019',
          fontSize: mobile ? 14 : 16,
          fontWeight: 700,
          fontFamily: 'Outfit',
          lineHeight: 20,
          offsetCenter: [0, '72%']
        },
        title: { show: false },
        data: [{ value: avg, name: 'Promedio' }]
      }]
    }, true);
  },

  /** Termómetro visual HTML · jarras / persona */
  renderThermoDay(kpis, rows) {
    const fill = document.getElementById('thermoFill');
    const bulb = document.getElementById('thermoBulb');
    const valEl = document.getElementById('thermoValue');
    const zoneEl = document.getElementById('thermoZone');
    if (!fill || !valEl) return;

    let avg = Number((kpis && kpis.promedioCajasPorTrabajador) || 0);
    if (!avg && rows && rows.length) {
      const vals = rows.map((r) => Number(r.c) || 0).filter((n) => n > 0);
      avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    }
    const max = Math.max(120, Math.ceil((avg * 1.55) / 10) * 10 || 120);
    const pct = Math.max(0, Math.min(100, (avg / max) * 100));

    let zone = 'Ritmo bajo';
    let color = '#e41e26';
    if (pct >= 75) { zone = '¡Excelente!'; color = '#4ab848'; }
    else if (pct >= 50) { zone = 'Buen ritmo'; color = '#8dc63f'; }
    else if (pct >= 35) { zone = 'Ritmo regular'; color = '#f7941d'; }

    fill.style.height = pct + '%';
    fill.style.background = 'linear-gradient(180deg, ' + color + ', ' + color + 'cc)';
    if (bulb) bulb.style.background = color;
    valEl.textContent = avg ? avg.toFixed(1) : '—';
    if (zoneEl) {
      zoneEl.textContent = avg ? zone : 'Sin datos';
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

  _insightDist(rows) {
    const values = (rows || []).map((r) => r.c).filter((n) => n > 0);
    if (!values.length) {
      this.setInsight('insightDist', 'Sin personas con jarras para armar rangos.');
      return;
    }
    const low = values.filter((v) => v <= 40).length;
    const high = values.filter((v) => v >= 131).length;
    this.setInsight(
      'insightDist',
      values.length + ' personas: ' + low + ' en ritmo bajo (≤40) · ' +
        high + ' en ritmo alto (≥131).'
    );
  },

  /** Histograma · rendimiento por persona (colores fáciles de leer) */
  renderDist(rows) {
    const chart = this.ensure('chartDist');
    if (!chart) return;
    const mobile = this.isMobile();
    const values = (rows || []).map((r) => r.c).filter((n) => n > 0);
    const totalPeople = values.length || 1;
    const bins = [
      { label: '0–40', hint: 'Bajo', min: 0, max: 40 },
      { label: '41–70', hint: 'Regular', min: 41, max: 70 },
      { label: '71–100', hint: 'Bueno', min: 71, max: 100 },
      { label: '101–130', hint: 'Muy bueno', min: 101, max: 130 },
      { label: '131–160', hint: 'Alto', min: 131, max: 160 },
      { label: '160+', hint: 'Excelente', min: 161, max: Infinity }
    ];
    const counts = bins.map((b) => values.filter((v) => v >= b.min && v <= b.max).length);
    chart.setOption({
      tooltip: Object.assign(this.tipBase(), {
        trigger: 'axis',
        triggerOn: mobile ? 'mousemove|click' : 'mousemove',
        formatter: (p) => {
          const i = p[0].dataIndex;
          const b = bins[i];
          const n = counts[i];
          const pct = ((n / totalPeople) * 100).toFixed(1);
          return `<b>${b.hint}</b> (${b.label} jarras)<br/>Personas: <b>${n}</b><br/>Del total: <b>${pct}%</b>`;
        }
      }),
      grid: { left: 4, right: 8, top: 28, bottom: mobile ? 48 : 40, containLabel: true },
      toolbox: this.toolboxMini(),
      xAxis: {
        type: 'category',
        data: bins.map((b) => b.label + '\n' + b.hint),
        axisLabel: this._label({ fontSize: mobile ? 9 : 10, fontWeight: 650, interval: 0 }),
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        name: mobile ? '' : 'N° personas',
        minInterval: 1,
        axisLabel: this._baseText(),
        splitLine: { lineStyle: { color: '#eef2ec' } }
      },
      series: [{
        type: 'bar',
        data: counts.map((n, i) => ({
          value: n,
          itemStyle: { borderRadius: [10, 10, 0, 0], color: this.distColor(i) }
        })),
        barMaxWidth: 48,
        label: {
          show: true,
          position: 'top',
          color: '#143525',
          fontWeight: 700,
          fontSize: 11,
          formatter: (p) => {
            const pct = ((p.value / totalPeople) * 100).toFixed(0);
            return p.value + '\n(' + pct + '%)';
          }
        }
      }],
      animationDuration: 650
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

  /** @deprecated usar renderModalDetalle */
  renderModalHoras(porHora) {
    this.renderModalDetalle(porHora);
  },

  /** —— Paneles del día · supervisores + lotes —— */

  buildSupervisorStats(porGrupo) {
    return (porGrupo || [])
      .map((g) => {
        const full =
          (window.QB && QB.supervisors && QB.supervisors.fullLabel(g.grupo)) || '';
        const short =
          (window.QB && QB.supervisors && QB.supervisors.label(g.grupo)) ||
          this.shortGrupo(g.grupo);
        return {
          grupo: g.grupo,
          nombre: full || short || 'Sin supervisor',
          short: short || this.shortGrupo(g.grupo),
          lic: this.shortGrupo(g.grupo),
          c: Number(g.c) || 0,
          n: Number(g.n) || 0,
          avg: Number(g.avg) || 0
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
    this.renderTopLotes(rows);
    this._insightTopLotes(rows);

    this.renderTopLic(porGrupo);
    this._insightTopLic(porGrupo);

    this.renderLiderazgo(supervisores);
    this._insightLiderazgo(supervisores);

    this.renderPeoresLic(porGrupo);
    this._insightPeoresLic(porGrupo);

    // Avance · termómetro + distribución
    this.renderThermoDay(kpis, merged);
    this.renderGauge(kpis);
    this._insightGauge(kpis, merged);
    this.renderDist(merged);
    this._insightDist(merged);
  },

  _barHSupervisores(chartId, items, valueKey, opts) {
    const chart = this.ensure(chartId);
    if (!chart) return;
    const list = [...(items || [])].reverse();
    const mobile = this.isMobile();
    const self = this;
    const unit = (opts && opts.unit) || 'jarras';
    if (!list.length) {
      chart.clear();
      chart.setOption({
        title: {
          text: 'Sin datos de supervisores',
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
          const s = list[p[0].dataIndex];
          if (!s) return '';
          const rank = list.length - p[0].dataIndex;
          return (
            '<b>#' +
            rank +
            ' · ' +
            s.short +
            '</b><br/>' +
            s.lic +
            '<br/>' +
            s.nombre +
            '<br/>Jarras: <b>' +
            self.fmtK(s.c) +
            '</b><br/>Personas: <b>' +
            s.n +
            '</b><br/>Promedio: <b>' +
            self.fmtK(s.avg) +
            '</b> /pers'
          );
        }
      }),
      grid: {
        left: 8,
        right: mobile ? 44 : 58,
        top: 16,
        bottom: 16,
        containLabel: true
      },
      toolbox: this.toolboxMini(),
      dataZoom: this.zoomOpts('y', list.length),
      xAxis: {
        type: 'value',
        name: unit,
        nameTextStyle: { color: '#6a7a70', fontSize: 11, padding: [8, 0, 0, 0] },
        axisLabel: this._baseText(),
        splitLine: { lineStyle: { color: '#eef2ec', type: 'dashed' } }
      },
      yAxis: {
        type: 'category',
        data: list.map((s) => {
          const label = s.short + ' · ' + s.lic;
          return label.length > 24 ? label.slice(0, 22) + '…' : label;
        }),
        axisLabel: this._label({ fontSize: mobile ? 11 : 12, fontWeight: 650, color: '#1a2420' }),
        axisTick: { show: false },
        axisLine: { show: false }
      },
      series: [{
        type: 'bar',
        data: list.map((s, i) => {
          const rankFromTop = list.length - 1 - i;
          return {
            value: s[valueKey],
            itemStyle: {
              borderRadius: [0, 14, 14, 0],
              color: self.rankColor(rankFromTop)
            }
          };
        }),
        barMaxWidth: mobile ? 26 : 30,
        barCategoryGap: '28%',
        showBackground: true,
        backgroundStyle: {
          color: 'rgba(74, 184, 72, 0.06)',
          borderRadius: [0, 14, 14, 0]
        },
        label: {
          show: true,
          position: 'right',
          color: '#143525',
          fontWeight: 750,
          fontSize: mobile ? 11 : 12,
          formatter: (p) => self.fmtK(p.value)
        }
      }],
      animationDuration: 700,
      animationEasing: 'cubicOut'
    }, true);
  },

  renderTopSupervisores(supervisores) {
    const top = [...(supervisores || [])].sort((a, b) => b.c - a.c).slice(0, 10);
    this._barHSupervisores('chartTopSupervisores', top, 'c', { unit: 'Jarras' });
  },

  renderPromedioSupervisor(supervisores) {
    const chart = this.ensure('chartPromedioSupervisor');
    if (!chart) return;
    const top = [...(supervisores || [])]
      .filter((s) => s.n > 0)
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 10);
    const self = this;
    const mobile = this.isMobile();
    if (!top.length) {
      chart.clear();
      return;
    }
    chart.setOption({
      tooltip: Object.assign(this.tipBase(), {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (p) => {
          const s = top[p[0].dataIndex];
          return (
            '<b>' +
            s.short +
            '</b><br/>' +
            s.lic +
            '<br/>' +
            self.fmtK(s.avg) +
            ' jarras/persona<br/>' +
            s.n +
            ' personas · total ' +
            self.fmtK(s.c)
          );
        }
      }),
      grid: { left: 10, right: 12, top: 28, bottom: mobile ? 56 : 48, containLabel: true },
      toolbox: this.toolboxMini(),
      xAxis: {
        type: 'category',
        data: top.map((s) => (s.short.length > 10 ? s.short.slice(0, 8) + '…' : s.short)),
        axisLabel: this._label({
          fontSize: mobile ? 9 : 10,
          fontWeight: 650,
          rotate: mobile ? 32 : 22,
          color: '#1a2420'
        }),
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        name: 'Jarras / pers',
        axisLabel: this._baseText(),
        splitLine: { lineStyle: { color: '#eef2ec', type: 'dashed' } }
      },
      series: [{
        type: 'bar',
        data: top.map((s, i) => ({
          value: s.avg,
          itemStyle: {
            borderRadius: [12, 12, 4, 4],
            color: self.barGrad(self.logoPair(i)[0], self.logoPair(i)[1], true)
          }
        })),
        barMaxWidth: mobile ? 28 : 36,
        barCategoryGap: '35%',
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

  renderRankingSupervisores(supervisores) {
    const top = [...(supervisores || [])].sort((a, b) => b.c - a.c).slice(0, 12);
    const chart = this.ensure('chartRankingSupervisores');
    if (!chart) return;
    const list = top.slice().reverse();
    const self = this;
    const mobile = this.isMobile();
    if (!list.length) {
      chart.clear();
      return;
    }
    chart.setOption({
      tooltip: Object.assign(this.tipBase(), {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (p) => {
          const s = list[p[0].dataIndex];
          const rank = list.length - p[0].dataIndex;
          return (
            '<b>#' +
            rank +
            ' · ' +
            s.nombre +
            '</b><br/>' +
            s.lic +
            '<br/>Total: <b>' +
            self.fmtK(s.c) +
            '</b> jarras<br/>' +
            s.n +
            ' personas · ' +
            self.fmtK(s.avg) +
            ' /pers'
          );
        }
      }),
      grid: { left: 8, right: mobile ? 44 : 58, top: 16, bottom: 16, containLabel: true },
      toolbox: this.toolboxMini(),
      dataZoom: this.zoomOpts('y', list.length),
      xAxis: {
        type: 'value',
        axisLabel: this._baseText(),
        splitLine: { lineStyle: { color: '#eef2ec', type: 'dashed' } }
      },
      yAxis: {
        type: 'category',
        data: list.map((s, i) => {
          const rank = list.length - i;
          const name = s.short.length > 14 ? s.short.slice(0, 12) + '…' : s.short;
          return '#' + rank + ' ' + name;
        }),
        axisLabel: this._label({ fontSize: mobile ? 11 : 12, fontWeight: 650, color: '#1a2420' }),
        axisTick: { show: false },
        axisLine: { show: false }
      },
      series: [{
        type: 'bar',
        data: list.map((s, i) => ({
          value: s.c,
          itemStyle: {
            borderRadius: [0, 14, 14, 0],
            color: self.rankColor(list.length - 1 - i)
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
          fontSize: mobile ? 10 : 11,
          formatter: (p) => {
            const s = list[p.dataIndex];
            return self.fmtK(p.value) + ' · ' + s.lic;
          }
        }
      }],
      animationDuration: 700
    }, true);
  },

  renderTopLotes(rows) {
    const chart = this.ensure('chartTopLotes');
    if (!chart) return;
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
    const items = Object.entries(by)
      .map(([lote, c]) => ({ lote, c: Math.round(c * 100) / 100 }))
      .sort((a, b) => b.c - a.c)
      .slice(0, 12);
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

  _insightTopSupervisores(list) {
    const top = [...(list || [])].sort((a, b) => b.c - a.c)[0];
    if (!top) {
      this.setInsight('insightTopSupervisores', 'Sin supervisores con producción.');
      return;
    }
    this.setInsight(
      'insightTopSupervisores',
      'Más volumen: ' + top.short + ' (' + top.lic + ') · ' + this.fmtK(top.c) + ' jarras.'
    );
  },

  _insightPromedioSupervisor(list) {
    const top = [...(list || [])].filter((s) => s.n > 0).sort((a, b) => b.avg - a.avg)[0];
    if (!top) {
      this.setInsight('insightPromedioSupervisor', 'Sin promedio aún.');
      return;
    }
    this.setInsight(
      'insightPromedioSupervisor',
      'Mejor ritmo: ' +
        top.short +
        ' · ' +
        this.fmtK(top.avg) +
        ' jarras/persona (' +
        top.n +
        ' pers).'
    );
  },

  _insightRankingSupervisores(list) {
    const sorted = [...(list || [])].sort((a, b) => b.c - a.c);
    if (!sorted.length) {
      this.setInsight('insightRankingSupervisores', 'Sin ranking.');
      return;
    }
    const hi = sorted[0];
    const lo = sorted[sorted.length - 1];
    this.setInsight(
      'insightRankingSupervisores',
      '#' +
        1 +
        ' ' +
        hi.short +
        ' · último: ' +
        lo.short +
        ' (' +
        this.fmtK(lo.c) +
        ' jarras).'
    );
  },

  _insightTopLotes(rows) {
    const by = {};
    for (const r of rows || []) {
      if (Array.isArray(r.lotes) && r.lotes.length) {
        r.lotes.forEach((l) => {
          by[l.lote] = (by[l.lote] || 0) + (l.c || 0);
        });
      } else if (r.lote) {
        by[r.lote] = (by[r.lote] || 0) + (r.c || 0);
      }
    }
    const list = Object.entries(by).sort((a, b) => b[1] - a[1]);
    if (!list.length) {
      this.setInsight('insightTopLotes', 'Sin lotes.');
      return;
    }
    this.setInsight(
      'insightTopLotes',
      'Más jarras hoy: lote ' + list[0][0] + ' · ' + this.fmtK(list[0][1]) + ' jarras.'
    );
  },

  /** LIC con más jarras (total) */
  renderTopLic(stats) {
    const chart = this.ensure('chartTopLic');
    if (!chart) return;
    const items = [...(stats || [])]
      .filter((g) => (g.c || 0) > 0)
      .sort((a, b) => (b.c || 0) - (a.c || 0))
      .slice(0, 10)
      .reverse();
    const self = this;
    const mobile = this.isMobile();
    if (!items.length) {
      chart.clear();
      chart.setOption({
        title: {
          text: 'Sin datos de LIC',
          left: 'center',
          top: 'middle',
          textStyle: { color: '#6b7280', fontSize: 14, fontWeight: 600 }
        }
      });
      return;
    }
    const total = items.reduce((s, g) => s + (g.c || 0), 0) || 1;
    chart.setOption({
      tooltip: Object.assign(this.tipBase(), {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (p) => {
          const g = items[p[0].dataIndex];
          const rank = items.length - p[0].dataIndex;
          const pct = (((g.c || 0) / total) * 100).toFixed(1);
          return (
            '<b>#' +
            rank +
            ' · ' +
            self.grupoConJefe(g.grupo) +
            '</b><br/>Jarras: <b>' +
            Number(g.c).toLocaleString('es-PE') +
            '</b><br/>Del top: <b>' +
            pct +
            '%</b>'
          );
        }
      }),
      grid: { left: 8, right: mobile ? 48 : 64, top: 16, bottom: mobile ? 28 : 24, containLabel: true },
      toolbox: this.toolboxMini(),
      xAxis: {
        type: 'value',
        splitNumber: mobile ? 3 : 4,
        axisLabel: this._numAxisLabel(),
        splitLine: { lineStyle: { color: '#eef2ec', type: 'dashed' } }
      },
      yAxis: {
        type: 'category',
        data: items.map((g) => {
          const n = self.grupoConJefe(g.grupo);
          return n.length > 24 ? n.slice(0, 22) + '…' : n;
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
          formatter: (p) => self.fmtK(p.value)
        }
      }],
      animationDuration: 700
    }, true);
  },

  _insightTopLic(stats) {
    const top = [...(stats || [])].filter((g) => g.c > 0).sort((a, b) => b.c - a.c)[0];
    if (!top) {
      this.setInsight('insightTopLic', 'Sin LIC con producción.');
      return;
    }
    this.setInsight(
      'insightTopLic',
      'Más producción: ' +
        this.grupoConJefe(top.grupo) +
        ' · ' +
        this.fmtK(top.c) +
        ' jarras.'
    );
  },

  /** Supervisor · grupo con más liderazgo (mejor avg jarras/persona) */
  renderLiderazgo(supervisores) {
    const chart = this.ensure('chartLiderazgo');
    if (!chart) return;
    const items = [...(supervisores || [])]
      .filter((s) => s.n > 0 && s.avg > 0)
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 10)
      .reverse();
    const self = this;
    const mobile = this.isMobile();
    if (!items.length) {
      chart.clear();
      chart.setOption({
        title: {
          text: 'Sin datos de liderazgo',
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
          const s = items[p[0].dataIndex];
          const rank = items.length - p[0].dataIndex;
          return (
            '<b>#' +
            rank +
            ' · ' +
            s.nombre +
            '</b><br/>LIC ' +
            s.lic +
            '<br/>' +
            self.fmtK(s.avg) +
            ' jarras/persona<br/>' +
            s.n +
            ' personas · total ' +
            self.fmtK(s.c)
          );
        }
      }),
      grid: { left: 8, right: mobile ? 48 : 64, top: 16, bottom: mobile ? 28 : 24, containLabel: true },
      toolbox: this.toolboxMini(),
      xAxis: {
        type: 'value',
        name: mobile ? '' : 'Jarras / pers',
        splitNumber: mobile ? 3 : 4,
        axisLabel: this._numAxisLabel(),
        splitLine: { lineStyle: { color: '#eef2ec', type: 'dashed' } }
      },
      yAxis: {
        type: 'category',
        data: items.map((s) => {
          const label = s.short + ' · ' + s.lic;
          return label.length > 24 ? label.slice(0, 22) + '…' : label;
        }),
        axisLabel: this._label({ fontSize: mobile ? 11 : 12, fontWeight: 650, color: '#1a2420' }),
        axisTick: { show: false },
        axisLine: { show: false }
      },
      series: [{
        type: 'bar',
        data: items.map((s, i) => {
          const rankFromTop = items.length - 1 - i;
          return {
            value: s.avg,
            itemStyle: {
              borderRadius: [0, 14, 14, 0],
              color: self.rankColor(rankFromTop)
            }
          };
        }),
        barMaxWidth: mobile ? 26 : 30,
        barCategoryGap: '28%',
        showBackground: true,
        backgroundStyle: { color: 'rgba(141, 198, 63, 0.08)', borderRadius: [0, 14, 14, 0] },
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

  _insightLiderazgo(supervisores) {
    const top = [...(supervisores || [])]
      .filter((s) => s.n > 0)
      .sort((a, b) => b.avg - a.avg)[0];
    if (!top) {
      this.setInsight('insightLiderazgo', 'Sin liderazgo para mostrar.');
      return;
    }
    this.setInsight(
      'insightLiderazgo',
      'Más liderazgo: ' +
        top.nombre +
        ' (' +
        top.lic +
        ') · ' +
        this.fmtK(top.avg) +
        ' jarras/persona.'
    );
  },

  /** Peores LIC · menos jarras totales */
  renderPeoresLic(stats) {
    const chart = this.ensure('chartPeoresLic');
    if (!chart) return;
    const sorted = [...(stats || [])]
      .filter((g) => (g.c || 0) > 0)
      .sort((a, b) => (a.c || 0) - (b.c || 0));
    const items = sorted.slice(0, 10).reverse();
    const self = this;
    const mobile = this.isMobile();
    if (!items.length) {
      chart.clear();
      chart.setOption({
        title: {
          text: 'Sin LIC para revisar',
          left: 'center',
          top: 'middle',
          textStyle: { color: '#6b7280', fontSize: 14, fontWeight: 600 }
        }
      });
      return;
    }
    const warnPairs = [
      ['#e41e26', '#f7941d'],
      ['#f7941d', '#fbbf24'],
      ['#d97706', '#fcd34d'],
      ['#b45309', '#fde68a'],
      ['#9a3412', '#fed7aa']
    ];
    chart.setOption({
      tooltip: Object.assign(this.tipBase(), {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (p) => {
          const g = items[p[0].dataIndex];
          const fromWorst = items.length - p[0].dataIndex;
          return (
            '<b>Revisar #' +
            fromWorst +
            ' · ' +
            self.grupoConJefe(g.grupo) +
            '</b><br/>Jarras: <b>' +
            Number(g.c).toLocaleString('es-PE') +
            '</b><br/>' +
            (g.n || 0) +
            ' personas · ' +
            self.fmtK(g.avg || 0) +
            ' /pers'
          );
        }
      }),
      grid: { left: 8, right: mobile ? 48 : 64, top: 16, bottom: mobile ? 28 : 24, containLabel: true },
      toolbox: this.toolboxMini(),
      xAxis: {
        type: 'value',
        splitNumber: mobile ? 3 : 4,
        axisLabel: this._numAxisLabel(),
        splitLine: { lineStyle: { color: '#eef2ec', type: 'dashed' } }
      },
      yAxis: {
        type: 'category',
        data: items.map((g) => {
          const n = self.grupoConJefe(g.grupo);
          return n.length > 24 ? n.slice(0, 22) + '…' : n;
        }),
        axisLabel: this._label({ fontSize: mobile ? 11 : 12, fontWeight: 650, color: '#1a2420' }),
        axisTick: { show: false },
        axisLine: { show: false }
      },
      series: [{
        type: 'bar',
        data: items.map((g, i) => {
          const fromWorst = items.length - 1 - i;
          const pair = warnPairs[Math.min(fromWorst, warnPairs.length - 1)];
          return {
            value: g.c,
            itemStyle: {
              borderRadius: [0, 14, 14, 0],
              color: self.barGrad(pair[0], pair[1], false)
            }
          };
        }),
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
  },

  _insightPeoresLic(stats) {
    const worst = [...(stats || [])].filter((g) => g.c > 0).sort((a, b) => a.c - b.c)[0];
    if (!worst) {
      this.setInsight('insightPeoresLic', 'Sin LIC bajos para revisar.');
      return;
    }
    this.setInsight(
      'insightPeoresLic',
      'Más bajo hoy: ' +
        this.grupoConJefe(worst.grupo) +
        ' · ' +
        this.fmtK(worst.c) +
        ' jarras · conviene apoyo.'
    );
  },

  /** Tarjetas alineadas · siempre 3 en Atención (Personal · Ritmo · Mejor) */
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

    const byPeopleAsc = [...withN].sort((a, b) => a.n - b.n || a.avg - b.avg);
    const byAvgAsc = [...withN].sort((a, b) => a.avg - b.avg || a.n - b.n);
    const byAvgDesc = [...withN].sort((a, b) => b.avg - a.avg || b.c - a.c);

    const few = byPeopleAsc[0];
    const topRhythm = byAvgDesc[0];
    /* Ritmo: peor promedio distinto de Personal y de Mejor */
    let lowRhythm = byAvgAsc.find(
      (g) => g.grupo !== few.grupo && g.grupo !== topRhythm.grupo
    );
    if (!lowRhythm) {
      lowRhythm = byAvgAsc.find((g) => g.grupo !== topRhythm.grupo) || byAvgAsc[0];
    }

    const jefe = (g) => this.jefeDe(g) || 'Sin jefe';
    const card = (kind, tag, row, action) => ({
      kind,
      tag,
      lic: this.shortGrupo(row.grupo),
      jefe: jefe(row.grupo),
      n: row.n,
      c: this.fmtK(row.c),
      avg: this.fmtK(row.avg),
      action
    });

    const cards = [
      card('warn', 'Personal', few, 'Sumar cosechadores'),
      card('warn', 'Ritmo', lowRhythm, 'Revisar lote'),
      card('ok', 'Mejor', topRhythm, 'Referencia del día')
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
          '<span class="attn-jefe">Jefe · ' +
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