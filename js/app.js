/* Dashboard campo · Q Berries jarras */
(() => {
  const state = {
    hojas: [],
    report: null,
    sortKey: 'c',
    sortDir: -1,
    rows: [],
    workerQ: '',
    grupoQ: '',
    grupoModal: '',
    grupoWorkerQ: '',
    tab: 'resumen',
    fecha: '',
    syncedAt: '',
    grupo: '',
    variedad: '',
    q: '',
    allGrupos: [],
    allVariedades: [],
    fechaOpts: [],
    grupoOpts: [],
    variedadOpts: []
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

  /** Fecha legible: "lun · 10/08/2026" */
  function fmtFechaClara(iso) {
    const s = String(iso || '').trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return { short: fmtFecha(s), weekday: '', full: fmtFecha(s) };
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0));
    const weekday = d.toLocaleDateString('es-PE', { weekday: 'short', timeZone: 'UTC' }).replace('.', '');
    const short = `${m[3]}/${m[2]}/${m[1]}`;
    return { short, weekday, full: `${weekday} · ${short}` };
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

  async function boot() {
    if (location.protocol === 'file:') {
      showFileProtocolHelp();
      return;
    }

    bind();
    updateConnBadge();
    await QB.workers.load();

    /* Pintar cache de inmediato para nunca quedar vacío */
    const cached = QB.api.getCachedPack && QB.api.getCachedPack();
    if (cached && (cached.data || []).length) {
      applyPack(cached);
      updateConnBadge();
    }

    try {
      const r = await QB.api.refresh();
      applyPack(r.pack);
      QB.api.startDataWatch();
      window.addEventListener('qb:data-updated', (e) => {
        const detail = (e && e.detail) || {};
        const p = detail.pack || QB.api.getCachedPack();
        if (!p) return;
        applyPack(p);
        flashHero();
        QB.export.toast('Datos nuevos · ' + ((p.data && p.data.length) || 0) + ' personas', 'ok');
      });
      window.addEventListener('qb:data-tick', (e) => {
        const detail = (e && e.detail) || {};
        if (detail.actualizado) state.syncedAt = detail.actualizado;
        updateLiveBadge();
      });
      const n = (r.pack.data && r.pack.data.length) || 0;
      if (r.fromCache && r.error) {
        QB.export.toast('Sin red · mostrando último guardado · ' + n + ' personas', 'warn');
      } else if (n) {
        QB.export.toast('Listo · ' + n + ' personas', 'ok');
      } else {
        QB.export.toast('Sheet sin filas · pega data en Google Sheets', 'warn');
      }
    } catch (err) {
      if (cached && (cached.data || []).length) {
        QB.export.toast('Sin red · usando cache local', 'warn');
      } else {
        QB.export.toast('No se pudo leer la API: ' + (err && err.message ? err.message : 'error'), 'warn');
      }
    }
  }

  function applyPack(pack) {
    if (!pack) return;
    state.syncedAt = pack.actualizado || '';
    state.hojas = pack.hojas || [];
    state.fecha = pack.hoy || (state.hojas[0] && state.hojas[0].fecha) || '';
    state.fechaOpts = (pack.hojas || [])
      .filter((h) => h.fecha)
      .map((h) => ({ value: h.fecha, label: fmtFechaClara(h.fecha).full, filas: h.filas }));
    state.report = pack;
    state.rows = pack.data || [];
    state.allGrupos = [...new Set(state.rows.map((r) => r.grupo).filter(Boolean))].sort();
    state.allVariedades = [...new Set(state.rows.map((r) => r.variedad).filter(Boolean))].sort();
    state.grupoOpts = state.allGrupos;
    state.variedadOpts = state.allVariedades;
    sortRows();
    renderHero(pack);
    renderPeople(pack);
    renderGrupoMap(pack);
    renderWorkersList();
    renderCharts(pack);
    setTab(state.tab);
    updateConnBadge();
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
      if (text) text.textContent = 'EN VIVO';
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
    const closeBtn = $('modalCloseBtn');
    if (closeBtn && !closeBtn.dataset.iconReady) {
      closeBtn.innerHTML = QB.icons.close(16);
      closeBtn.dataset.iconReady = '1';
    }
    const alarmIco = document.querySelector('#btnDataWarn .attn-alarm-ico');
    if (alarmIco && QB.icons.alarm) alarmIco.innerHTML = QB.icons.alarm(22);
    const refreshIco = $('icoRefresh');
    if (refreshIco && QB.icons.refresh) refreshIco.innerHTML = QB.icons.refresh(12);
    const workersIco = $('workersSearchIco');
    if (workersIco) workersIco.innerHTML = QB.icons.search(18);
    const gruposIco = $('gruposSearchIco');
    if (gruposIco) gruposIco.innerHTML = QB.icons.search(18);
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

    if (!isMobileLike()) return;

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
      if (action) action.hidden = true;
      banner.hidden = false;
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
      if (action) {
        action.hidden = false;
        if (actionText) actionText.textContent = 'Instalar app';
        if (actionIco && QB.icons.download) actionIco.innerHTML = QB.icons.download(16);
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
    requestAnimationFrame(() => {
      if (QB.charts && QB.charts.resizeAll) QB.charts.resizeAll();
    });
  }

  function bind() {
    hydrateUiIcons();
    setupInstallPrompt();

    document.querySelectorAll('.report-tab').forEach((btn) => {
      btn.addEventListener('click', () => setTab(btn.dataset.tab));
    });

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

    document.querySelectorAll('[data-img]').forEach((btn) => {
      btn.addEventListener('click', () => QB.export.chartImage(btn.dataset.img, `${btn.dataset.img}.png`));
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
      btnRefresh.addEventListener('click', () => manualRefresh());
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
        if (QB.select && QB.select._close) QB.select._close();
      }
    });

    setTab(state.tab);
  }

  async function manualRefresh() {
    const btn = $('btnRefresh');
    const text = btn && btn.querySelector('.status-text');
    if (btn) btn.classList.add('is-busy');
    if (text) text.textContent = '…';
    try {
      const r = await QB.api.refresh();
      applyPack(r.pack);
      flashHero();
      const n = (r.pack.data && r.pack.data.length) || 0;
      if (r.fromCache && r.error) {
        QB.export.toast('Sin cambios de red · cache · ' + n + ' personas', 'warn');
      } else if (r.changed) {
        QB.export.toast('Datos nuevos · ' + n + ' personas', 'ok');
      } else {
        QB.export.toast('Sin cambios · ' + n + ' personas', 'ok');
      }
    } catch (err) {
      const cached = QB.api.getCachedPack && QB.api.getCachedPack();
      if (cached) {
        applyPack(cached);
        QB.export.toast('Error de red · mostrando cache', 'warn');
      } else {
        QB.export.toast('Error API: ' + (err && err.message ? err.message : 'error'), 'warn');
      }
    } finally {
      if (btn) btn.classList.remove('is-busy');
      if (text) text.textContent = 'Actualizar';
      updateConnBadge();
    }
  }

  async function refreshMeta(forceLatestDay) {
    const r = await QB.api.refresh();
    applyPack(r.pack);
  }

  async function reload(bust) {
    const r = await QB.api.refresh();
    applyPack(r.pack);
  }

  /** Una fila por persona (suma jarras del periodo). No valida día por día. */
  function mergeByWorker(report) {
    const byCi = new Map();
    for (const r of report.data || []) {
      const key = String(r.ci || '');
      if (!key) continue;
      const cur = byCi.get(key);
      if (!cur) {
        byCi.set(key, Object.assign({}, r, { c: r.c || 0, fechas: r.fecha ? [r.fecha] : [] }));
      } else {
        cur.c += r.c || 0;
        if (r.fecha && cur.fechas.indexOf(r.fecha) < 0) cur.fechas.push(r.fecha);
        if ((r.c || 0) > (cur._bestC || 0)) {
          cur._bestC = r.c || 0;
          cur.grupo = r.grupo || cur.grupo;
          cur.variedad = r.variedad || cur.variedad;
          cur.modulo = r.modulo || cur.modulo;
          cur.turno = r.turno || cur.turno;
        }
        if (r.nombreCompleto && (!cur.nombreCompleto || cur.nombre === 'S/N')) {
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

  function shortSyncTime(s) {
    const raw = String(s || '').trim();
    if (!raw) return '';
    const m = raw.match(/(\d{1,2}:\d{2}(?::\d{2})?\s*(?:a\.?\s*m\.?|p\.?\s*m\.?)?)/i);
    if (m) return m[1].replace(/\s+/g, ' ');
    return raw.length > 12 ? raw.slice(-11) : raw;
  }

  function renderHero(report) {
    const k = report.kpis || {};
    const fecha = state.fecha ? fmtFechaClara(state.fecha).full : 'Sin fecha';
    const people = mergeByWorker(report);
    const top = people[0];
    const topG = (k.porGrupo || [])[0];
    const syncAt = shortSyncTime(state.syncedAt || report.actualizado || QB.api.getLastSync() || '');

    $('heroSummary').innerHTML = `
      <article class="hero-card report-hero" title="Informe de avance de cosecha">
        <p class="report-kicker">Fecha de cosecha · ${escapeHtml(fecha)}${
          syncAt ? ` · Act. ${escapeHtml(syncAt)}` : ''
        }</p>
        <h2 class="hero-title">Avance de cosecha</h2>
        <p class="hero-copy">Informe operativo · jarras por grupo LIC y cosechador</p>

        <div class="hero-metric" title="Total de jarras del día">
          <div class="metric-main">
            <span class="metric-label">Total del día</span>
            <div class="metric-row">
              <p class="value">${fmt(k.totalCajas)}</p>
              <span class="unit">jarras</span>
            </div>
          </div>
          <div class="metric-spark" aria-hidden="true" title="Tendencia al alza">
            <svg class="spark-svg" viewBox="0 0 120 56" preserveAspectRatio="none">
              <defs>
                <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#ffffff" stop-opacity="0.35"/>
                  <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
                </linearGradient>
              </defs>
              <path class="spark-area" d="M4 48 L18 44 L32 40 L46 36 L60 28 L74 24 L88 16 L104 10 L116 6 L116 52 L4 52 Z"/>
              <path class="spark-line" d="M4 48 L18 44 L32 40 L46 36 L60 28 L74 24 L88 16 L104 10 L116 6"/>
              <circle class="spark-dot" cx="116" cy="6" r="3.2"/>
            </svg>
            <span class="spark-badge">↑ sube</span>
          </div>
        </div>

        <div class="report-stats" aria-label="Indicadores del día">
          <div class="report-stat tone-people" title="Personas que cosecharon hoy">
            <span class="stat-label">Cosechadores</span>
            <strong>${fmt(people.length || k.totalTrabajadores)}</strong>
          </div>
          <div class="report-stat tone-groups" title="Grupos LIC activos">
            <span class="stat-label">Grupos LIC</span>
            <strong>${fmt(k.totalGrupos || (k.porGrupo || []).length)}</strong>
          </div>
          <div class="report-stat tone-leader" title="Grupo con más jarras">
            <span class="stat-label">Grupo líder</span>
            <strong>${escapeHtml(topG ? shortGrupo(topG.grupo) : '—')}</strong>
          </div>
          <div class="report-stat tone-top" title="Persona con más jarras">
            <span class="stat-label">Mejor cosechador</span>
            <strong>${escapeHtml(top ? QB.avatars.shortName(top) : '—')}</strong>
          </div>
        </div>
        <p class="hero-confidential">Solo autorizado para la empresa</p>
      </article>
    `;
  }

  function shortGrupo(g) {
    return String(g || '—').replace(/^Grupo\s+/i, '') || '—';
  }

  function renderGrupoMap(report) {
    const el = $('grupoMap');
    const meta = $('gruposMeta');
    if (!el) return;
    const k = (report && report.kpis) || {};
    let grupos = [...(k.porGrupo || [])].sort((a, b) => (b.c || 0) - (a.c || 0));
    const q = String(state.grupoQ || '').trim().toLowerCase();
    if (q) {
      grupos = grupos.filter((g) => {
        const full = String(g.grupo || '').toLowerCase();
        const short = shortGrupo(g.grupo).toLowerCase();
        const jefe = QB.supervisors
          ? (
              QB.supervisors.label(g.grupo) +
              ' ' +
              QB.supervisors.fullLabel(g.grupo)
            ).toLowerCase()
          : '';
        return full.indexOf(q) >= 0 || short.indexOf(q) >= 0 || jefe.indexOf(q) >= 0;
      });
    }
    const maxC = Math.max(...grupos.map((g) => g.c || 0), 1);
    const peopleByGrupo = new Map();
    for (const r of mergeByWorker(report)) {
      const key = String(r.grupo || '');
      peopleByGrupo.set(key, (peopleByGrupo.get(key) || 0) + 1);
    }
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
        const pct = Math.max(4, Math.round(((g.c || 0) / maxC) * 100));
        const peopleN = peopleByGrupo.get(String(g.grupo || '')) || 0;
        const jefe = QB.supervisors ? QB.supervisors.label(g.grupo) : '';
        const jefeFull = QB.supervisors ? QB.supervisors.fullLabel(g.grupo) : '';
        return `<button type="button" class="grupo-map-row" role="listitem" data-grupo="${escapeAttr(g.grupo)}" title="${escapeAttr(jefeFull || g.grupo)}">
          <span class="grupo-map-rank">${i + 1}</span>
          <span class="grupo-map-body">
            <span class="grupo-map-top">
              <strong>${escapeHtml(shortGrupo(g.grupo))}</strong>
              <em>${fmt(g.c)} jarras</em>
            </span>
            <span class="grupo-map-bar" aria-hidden="true"><span style="width:${pct}%"></span></span>
            <span class="grupo-map-sub">${
              jefe
                ? `<span class="grupo-jefe">Jefe: ${escapeHtml(jefe)}</span> · `
                : ''
            }${peopleN} pers. · ${escapeHtml(g.grupo)}</span>
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
    const people = mergeByWorker(state.report || { data: state.rows || [] });
    const g = String(grupoKey || '');
    return people.filter((r) => String(r.grupo || '') === g);
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
        const jefe = QB.supervisors ? QB.supervisors.label(g.grupo) : '';
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
    renderGrupoWorkersModal();
  }

  function renderGrupoWorkersModal(openExact) {
    const grupoKey = state.grupoModal || '';
    const q = String(state.grupoWorkerQ || '').trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    let people = workersOfGrupo(grupoKey);
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
    const totalJarras = workersOfGrupo(grupoKey).reduce((s, r) => s + (r.c || 0), 0);
    const jefeFull = QB.supervisors ? QB.supervisors.fullLabel(grupoKey) : '';
    const jefeShort = QB.supervisors ? QB.supervisors.label(grupoKey) : '';

    $('modalBody').innerHTML = `
      <header class="sheet-head">
        <p class="sheet-eyebrow">Trabajadores del grupo</p>
        <h3 id="modalTitle">${escapeHtml(shortGrupo(grupoKey))}</h3>
        <p class="sheet-sub">${
          jefeFull
            ? `Jefe: <strong>${escapeHtml(jefeShort || jefeFull)}</strong> · `
            : ''
        }${fmt(workersOfGrupo(grupoKey).length)} personas · ${fmt(totalJarras)} jarras</p>
      </header>
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
                .map(
                  (r, i) => `<button type="button" class="worker-row" role="listitem" data-ci="${escapeAttr(r.ci)}">
              ${QB.avatars.img(r, 40)}
              <span class="worker-main">
                <strong>${escapeHtml(QB.avatars.shortName(r))}</strong>
                <span>CI ${escapeHtml(r.ci)} · #${i + 1}</span>
              </span>
              <span class="worker-jarras">
                <em>${fmt(r.c)}</em>
                <small>jarras</small>
              </span>
            </button>`
                )
                .join('')
            : `<p class="workers-empty">${
                q ? `Sin resultados para “${escapeHtml(q)}”` : 'Sin trabajadores en este grupo'
              }</p>`
        }
      </div>
      <div class="sheet-foot sheet-foot-row">
        <button type="button" class="btn btn-ghost" id="btnBackGrupos">Volver a grupos</button>
        <button type="button" class="btn btn-primary" id="btnPdfGrupo" title="Compartir PDF por WhatsApp">WhatsApp PDF</button>
      </div>
    `;

    const root = $('modalRoot');
    const modal = root && root.querySelector('.modal');
    if (modal) modal.classList.add('is-sheet');
    root.hidden = false;

    const ico = $('grupoSearchIco');
    if (ico) ico.innerHTML = QB.icons.search(18);

    const input = $('buscaGrupoWorker');
    if (input) {
      setTimeout(() => {
        input.focus();
        const len = input.value.length;
        input.setSelectionRange(len, len);
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
        const fechaInfo = state.fecha ? fmtFechaClara(state.fecha) : null;
        QB.export.grupoTeamPdf({
          grupo: grupoKey,
          grupoShort: shortGrupo(grupoKey),
          jefe: jefeFull || jefeShort || '',
          fecha: state.fecha || '',
          fechaLabel: fechaInfo ? fechaInfo.full : 'Sin fecha',
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
    const merged = mergeByWorker(report).slice(0, 12);
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
    const people = mergeByWorker(state.report || { data: state.rows || [] });
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
      .map(
        (r, i) => `<button type="button" class="worker-row" role="listitem" data-ci="${escapeAttr(r.ci)}">
          ${QB.avatars.img(r, 40)}
          <span class="worker-main">
            <strong>${escapeHtml(QB.avatars.shortName(r))}</strong>
            <span>CI ${escapeHtml(r.ci)} · ${escapeHtml(shortGrupo(r.grupo))} · #${i + 1}</span>
          </span>
          <span class="worker-jarras">
            <em>${fmt(r.c)}</em>
            <small>jarras</small>
          </span>
        </button>`
      )
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
    const merged = mergeByWorker(report);
    charts.onWorkerClick = function (row) {
      openWorkerModal(row);
    };
    charts.renderDayPack(report, merged);
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
    const rankList = mergeByWorker(state.report || { data: state.rows });
    const rank = rankList.findIndex((r) => String(r.ci) === String(row.ci)) + 1;
    const fromGrupo = !!state.grupoModal;
    const chartItems = breakdown.map((b) => ({
      slot: shortLote(b.lote),
      full: b.lote,
      c: Math.round((b.c || 0) * 100) / 100
    }));

    const jefe = QB.supervisors ? QB.supervisors.label(row.grupo) : '';
    const jefeFull = QB.supervisors ? QB.supervisors.fullLabel(row.grupo) : '';

    $('modalBody').innerHTML = `
      <div style="display:flex;gap:0.85rem;align-items:center;margin-bottom:0.85rem">
        ${QB.avatars.img(row, 72)}
        <div>
          <h3 id="modalTitle" style="margin:0">${escapeHtml(row.nombreCompleto || QB.avatars.shortName(row) || 'Trabajador')}</h3>
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

  function closeModal() {
    const root = $('modalRoot');
    if (root) {
      root.hidden = true;
      const modal = root.querySelector('.modal');
      if (modal) {
        modal.classList.remove('is-sheet');
        modal.classList.remove('is-warn-modal');
      }
    }
    state.grupoModal = '';
    state.grupoWorkerQ = '';
    QB.charts.dispose('chartModal');
  }

  function openDataWarnModal() {
    const syncAt =
      shortSyncTime(state.syncedAt || (state.report && state.report.actualizado) || QB.api.getLastSync() || '') ||
      'última sincronización disponible';
    const fecha = state.fecha ? fmtFechaClara(state.fecha).full : 'día seleccionado';

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
        chartGauge: 'Termómetro jarras / persona',
        chartDist: 'Distribución por persona',
        chartTopLotes: 'Lotes con más jarras',
        chartTopLic: 'LIC con más producción',
        chartLiderazgo: 'Supervisor · más liderazgo',
        chartPeoresLic: 'Peores LIC en producción'
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

  boot().catch(function (err) {
    if (QB.export && QB.export.toast) {
      QB.export.toast('No se pudo cargar: ' + (err && err.message ? err.message : 'error'), 'warn');
    }
  });
})();
