/* Dashboard campo · Q Berries jarras */
(() => {
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
    comparePacks: {},
    compareLt40Q: '',
    _compareDirty: true,
    _compareLoadedSig: '',
    grupoOpts: [],
    variedadOpts: [],
    _workersDirty: true,
    _gruposDirty: true,
    _chartsTimer: 0
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
      hideLoadModal();
      document.body.classList.add('is-ready');
      showFileProtocolHelp();
      return;
    }

    /* Siempre pantalla de carga — nunca app vacía */
    document.body.classList.remove('is-ready');
    document.documentElement.classList.remove('has-cache');
    showLoadModal('Cargando', 'Espera un momento, por favor…');

    bind();
    updateConnBadge();
    await QB.workers.load();
    if (QB.supervisors && QB.supervisors.enrichFromWorkers) {
      QB.supervisors.enrichFromWorkers();
    }

    let painted = false;
    try {
      const cached = QB.api.getCachedPack && QB.api.getCachedPack();
      const hasCache = !!(cached && (cached.data || []).length);

      if (hasCache) {
        applyPack(cached);
        painted = true;
        revealApp();
        QB.export.toast('Ya lista · ' + ((cached.data && cached.data.length) || 0) + ' personas', 'ok');
        showSyncBanner(
          'Estamos conectando… aún puedes usar la app. Te avisamos cuando esté actualizada.'
        );
        const r = await QB.api.refresh();
        hideSyncBanner();
        if ((r.pack.data || []).length) {
          applyPack(r.pack);
          painted = true;
        }
        if (r.changed && !r.error) {
          flashHero();
          QB.export.toast('Se actualizó · ' + ((r.pack.data && r.pack.data.length) || 0) + ' personas', 'ok');
        }
      } else {
        const r = await QB.api.refresh();
        if ((r.pack.data || []).length) {
          applyPack(r.pack);
          painted = true;
        }
        revealApp();
        const n = (r.pack.data && r.pack.data.length) || 0;
        if (n) QB.export.toast('Ya lista · ' + n + ' personas', 'ok');
        else QB.export.toast('Sin datos del día · contacta operaciones', 'warn');
      }

      QB.api.startDataWatch();
      window.addEventListener('qb:data-updated', (e) => {
        const detail = (e && e.detail) || {};
        const p = detail.pack || QB.api.getCachedPack();
        if (!p || !(p.data || []).length) return;
        applyPack(p, { requestedFecha: state.fecha || '' });
        flashHero();
        hideSyncBanner();
        QB.export.toast('Se actualizó · ' + ((p.data && p.data.length) || 0) + ' personas', 'ok');
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
        if (!f || f !== state.fecha) return;
        const pack = detail.pack;
        if (!pack || !(pack.data || []).length) return;
        if (detail.fromCache) return;
        applyPack(pack, { skipPrefetch: true, requestedFecha: f });
        const n = (pack.data && pack.data.length) || 0;
        QB.export.toast(
          'Datos actualizados · ' + fechaLabelText(f) + ' · ' + fmt(n) + ' personas',
          'ok'
        );
      });
    } catch (err) {
      hideSyncBanner();
      const cached = QB.api.getCachedPack && QB.api.getCachedPack();
      if (cached && (cached.data || []).length) {
        applyPack(cached);
        painted = true;
        revealApp();
        QB.export.toast('Sin red · sigues con el último guardado', 'warn');
      } else {
        revealApp();
        QB.export.toast('No se pudo leer la API: ' + (err && err.message ? err.message : 'error'), 'warn');
      }
    } finally {
      if (!document.body.classList.contains('is-ready')) revealApp();
      hideLoadModal();
      if (!painted) hideSyncBanner();
    }
  }

  function revealApp() {
    document.body.classList.add('is-ready');
    hideLoadModal();
    updateConnBadge();
  }

  function showSyncBanner(text) {
    const el = $('syncBanner');
    const t = $('syncBannerText');
    if (t && text) t.textContent = text;
    if (el) el.hidden = false;
  }

  function hideSyncBanner() {
    const el = $('syncBanner');
    if (el) el.hidden = true;
  }

  function applyPack(pack, opts) {
    if (!pack) return;
    opts = opts || {};
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
        const iso = h.fechaDisplay || h.fecha;
        const info = fmtFechaClara(iso);
        return {
          value: h.fecha,
          display: iso,
          label: info.fullLong || info.full,
          sub: h.filas ? h.filas + ' filas' : '',
          filas: h.filas
        };
      });
    syncCompareFechaOpts();
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

    /* Pintar todo con el pack del día activo */
    renderHero(pack);
    renderPeople(pack);
    renderGrupoMap(pack);
    state._gruposDirty = false;
    paintActiveTabHeavy();
    if (state._chartsTimer) clearTimeout(state._chartsTimer);
    scheduleCharts(pack);
    setTab(state.tab);
    updateConnBadge();

    if (!opts.skipPrefetch && QB.api.prefetchFechas) {
      QB.api.prefetchFechas(pack.hojas, state.fecha);
    }
  }

  function closeFechaMenu() {
    const menu = document.getElementById('fechaDdMenu');
    const btn = document.getElementById('fechaDdBtn');
    const root = document.getElementById('fechaDd');
    if (menu) menu.hidden = true;
    if (btn) btn.setAttribute('aria-expanded', 'false');
    if (root) root.classList.remove('is-open');
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
    const lt40 = people.filter((p) => Number(p.c || 0) < 40).length;
    const gt40 = people.filter((p) => Number(p.c || 0) > 40).length;
    const top5G = (k.porGrupo || []).slice(0, 5);

    if (kind === 'people') {
      return {
        title: 'Cosechadores',
        sub: fecha,
        rows: [
          { label: 'Personas con jarras', value: fmt(nPeople) },
          { label: 'Promedio jarras / persona', value: fmt(avg) },
          { label: 'Total jarras del día', value: fmt(k.totalCajas) },
          { label: 'Menos de 40 jarras', value: fmt(lt40) + ' personas' },
          { label: 'Más de 40 jarras', value: fmt(gt40) + ' personas' },
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
          { label: 'Grupos activos', value: fmt(k.totalGrupos || top5G.length) },
          { label: 'Total jarras (todos)', value: fmt(k.totalCajas) }
        ],
        extra: `<div class="stat-tip-block"><p class="stat-tip-block-title">Top grupos del día</p>${listHtml}</div>`,
        action: { tab: 'grupos', label: 'Ver mapa de grupos' }
      };
    }

    if (kind === 'leader' && topG) {
      const gFull = topG.grupo || '—';
      const gShort = shortGrupo(gFull);
      const jefe = QB.supervisors ? QB.supervisors.fullLabel(gFull) || QB.supervisors.label(gFull) : '';
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
      const jefe = QB.supervisors ? QB.supervisors.fullLabel(top.grupo) || QB.supervisors.label(top.grupo) : '';
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

  function openStatTipModal(kind) {
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
      modal.classList.remove('is-sheet', 'is-warn-modal');
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

  async function changeFecha(nextFecha) {
    const want = String(nextFecha || '').trim();
    if (!want || want === state.fecha) return;
    closeFechaMenu();
    const prev = state.fecha;
    const label = fechaLabelText(want);
    const fechaRoot = document.getElementById('fechaDd');
    const fechaBtn = document.getElementById('fechaDdBtn');
    const setBusy = (on) => {
      if (fechaRoot) fechaRoot.classList.toggle('is-busy', !!on);
      if (fechaBtn) {
        fechaBtn.setAttribute('aria-busy', on ? 'true' : 'false');
        fechaBtn.disabled = !!on;
      }
    };

    setBusy(true);
    showSyncBanner('Cargando datos · ' + label + '…');

    const finishOk = (pack, fromCache, wantFecha) => {
      hideSyncBanner();
      setBusy(false);
      if (wantFecha && pack.hoy && pack.hoy !== wantFecha) {
        QB.export.toast('Aviso: datos recibidos para otra fecha; recalculando…', 'warn');
      }
      applyPack(pack, { requestedFecha: want });
      flashHero();
      const n = (pack.data && pack.data.length) || 0;
      const msg = fromCache
        ? 'Fecha lista · ' + label + ' · ' + fmt(n) + ' personas (cache)'
        : 'Fecha lista · ' + label + ' · ' + fmt(n) + ' personas';
      QB.export.toast(msg, 'ok');
    };

    const finishFail = (msg) => {
      hideSyncBanner();
      setBusy(false);
      state.fecha = prev;
      renderHero(state.report || { kpis: {} });
      QB.export.toast(msg || 'No se pudo cambiar la fecha', 'warn');
    };

    try {
      const instant = QB.api.getPackForFecha(want);
      if (instant && (instant.data || []).length) {
        finishOk(instant, true, want);
        QB.api
          .cargarTodo({ fecha: want, background: true, allowCacheFallback: true })
          .catch(function () {});
        return;
      }

      const pack = await QB.api.cargarTodo({
        fecha: want,
        allowCacheFallback: true,
        force: true
      });
      if (pack && (pack.data || []).length) {
        finishOk(pack, false, want);
      } else {
        finishFail('Sin datos para ' + label);
      }
    } catch (err) {
      finishFail('No se pudo cargar ' + label);
    }
  }

  function getCompareActiveFechas() {
    return (state.fechaOpts || [])
      .map((o) => o.value)
      .filter((f) => f && !state.compareExcluded[f]);
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
    renderCompareSheetBar();
    updateCompareMeta();
  }

  function updateCompareMeta() {
    const meta = $('compareMeta');
    if (!meta) return;
    const active = getCompareActiveFechas();
    const total = (state.fechaOpts || []).length;
    if (total < 2) {
      meta.textContent = 'Necesitas al menos 2 hojas de cosecha';
      return;
    }
    if (active.length < 2) {
      meta.textContent = `Incluye al menos 2 hojas (${active.length} de ${total})`;
      return;
    }
    const labels = active.map((f) => fechaLabelText(f));
    meta.textContent =
      active.length === total
        ? `${active.length} hojas · ${labels.join(' · ')}`
        : `${active.length} de ${total} hojas · ${labels.join(' · ')}`;
  }

  function renderCompareSheetBar() {
    const host = $('compareSheetChips');
    const exHost = $('compareExcludedChips');
    const exWrap = $('compareExcludedWrap');
    if (!host) return;
    const opts = state.fechaOpts || [];
    const active = [];
    const excluded = [];
    opts.forEach((o) => {
      if (state.compareExcluded[o.value]) excluded.push(o);
      else active.push(o);
    });

    host.innerHTML = active.length
      ? active
          .map((o) => {
            const info = fmtFechaClara(o.display || o.value);
            const short = info.line || info.short || o.label;
            return `<span class="compare-sheet-chip is-on" role="listitem" data-fecha="${escapeAttr(o.value)}" title="${escapeAttr(o.label || short)}">
              <span class="compare-sheet-chip-label">${escapeHtml(short)}</span>
              <button type="button" class="compare-sheet-x" data-action="exclude" data-fecha="${escapeAttr(o.value)}" aria-label="Quitar ${escapeAttr(short)} de la comparación" title="No comparar esta hoja">×</button>
            </span>`;
          })
          .join('')
      : '<p class="compare-sheet-empty">Ninguna hoja incluida</p>';

    if (exHost && exWrap) {
      if (excluded.length) {
        exWrap.hidden = false;
        exHost.innerHTML = excluded
          .map((o) => {
            const info = fmtFechaClara(o.display || o.value);
            const short = info.line || info.short || o.label;
            return `<button type="button" class="compare-sheet-chip is-off" role="listitem" data-action="include" data-fecha="${escapeAttr(o.value)}" title="Volver a incluir ${escapeAttr(short)}">
              <span class="compare-sheet-chip-label">${escapeHtml(short)}</span>
              <span class="compare-sheet-plus" aria-hidden="true">+</span>
            </button>`;
          })
          .join('');
      } else {
        exWrap.hidden = true;
        exHost.innerHTML = '';
      }
    }
    updateCompareMeta();
  }

  function setCompareExcluded(fecha, excluded) {
    const f = String(fecha || '').trim();
    if (!f) return;
    if (excluded) state.compareExcluded[f] = true;
    else delete state.compareExcluded[f];
    state._compareDirty = true;
    renderCompareSheetBar();
  }

  function supervisorFullLabel(grupo, fecha) {
    if (!grupo || !QB.supervisors) return '';
    const f = fecha != null ? fecha : state.fecha;
    return QB.supervisors.fullLabel(grupo, f) || QB.supervisors.label(grupo, f) || '';
  }

  function supervisorShortLabel(grupo, fecha) {
    if (!grupo || !QB.supervisors) return '';
    const f = fecha != null ? fecha : state.fecha;
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

  const COMPARE_LT40 = 40;

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

  function comparePersonCondicion(promedio) {
    return Number(promedio) < COMPARE_LT40 ? 'Bajo' : 'Regular';
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
        const sup =
          (QB.supervisors && QB.supervisors.fullLabel(grupo, fechas[0])) ||
          (QB.supervisors && QB.supervisors.label(grupo, fechas[0])) ||
          '';
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
        const condicion = comparePersonCondicion(promedio);
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
      .sort((a, b) => a.promedio - b.promedio || a.min - b.min || a.sum - b.sum);

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
        el.innerHTML =
          '<p class="compare-empty">Incluye al menos <strong>2 hojas</strong>. Toca una hoja excluida abajo para volver a incluirla.</p>';
      }
      updateCompareMeta();
      return;
    }

    const sig = compareActiveSig(active);
    const el = $('compareContent');
    if (el) {
      el.innerHTML =
        '<p class="compare-loading">Cargando y comparando ' + active.length + ' hojas…</p>';
    }

    try {
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
              if (p && (p.data || []).length) state.comparePacks[fecha] = p;
            })
          );
        }
      });
      if (jobs.length) await Promise.all(jobs);

      const packs = {};
      active.forEach((fecha) => {
        if (state.comparePacks[fecha]) packs[fecha] = state.comparePacks[fecha];
      });
      if (Object.keys(packs).length < 2) {
        if (el) {
          el.innerHTML =
            '<p class="compare-empty">No hay suficientes datos cargados. Intenta de nuevo.</p>';
        }
        return;
      }

      state._compareLoadedSig = sig;
      state._compareDirty = false;
      renderCompareContent(packs, active);
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
              `<button type="button" class="btn btn-excel btn-sm" data-export-compare="day" data-fecha="${escapeAttr(d.fecha)}" title="Menos de 40 jarras · ${escapeAttr(d.label)}"><span class="export-btn-long">Excel ${escapeHtml(d.short)}</span><span class="export-btn-short">${escapeHtml(d.short)}</span></button>`
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
      { key: 'lt40Count', label: 'Personas < 40 jarras', alert: true }
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
      const people = mergeByWorker(pack).filter((r) => Number(r.c || 0) < COMPARE_LT40);
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

  function renderComparePromedioCell(promedio) {
    const n = Number(promedio) || 0;
    const cls = n < COMPARE_LT40 ? 'num compare-day-col is-lt40' : 'num compare-day-col';
    return `<td class="${cls}">${fmt(n)}</td>`;
  }

  function renderCompareCondicionCell(condicion) {
    const c = condicion === 'Regular' ? 'Regular' : 'Bajo';
    const cls = c === 'Bajo' ? 'compare-cond compare-day-col is-bajo' : 'compare-cond compare-day-col is-regular';
    return `<td class="${cls}">${escapeHtml(c)}</td>`;
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
      .join('')}${renderComparePromedioCell(p.promedio)}${renderCompareCondicionCell(p.condicion)}</tr>`;
  }

  function renderCompareLt40MobileCards(people, q) {
    const days = state._compareLast?.model?.days || [];
    if (!people.length) {
      const msg = q
        ? `Sin resultados para “${escapeHtml(q)}”`
        : 'Ninguna persona con menos de 40 jarras en las hojas seleccionadas.';
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
        const promCls = Number(p.promedio) < COMPARE_LT40 ? 'is-lt40' : '';
        const condCls = p.condicion === 'Regular' ? 'is-regular' : 'is-bajo';
        return `<article class="compare-lt40-card">
          <header class="compare-lt40-card-head">
            <strong class="compare-lt40-card-name">${escapeHtml(p.nombre)}</strong>
            <span class="compare-lt40-card-ci">CI ${escapeHtml(p.ci)}</span>
          </header>
          <p class="compare-lt40-card-meta">${escapeHtml(p.grupo)} · ${escapeHtml(p.supervisorShort || p.supervisor)}</p>
          <div class="compare-lt40-card-dates">${dayStats}</div>
          <div class="compare-lt40-card-foot">
            <div class="compare-lt40-stat ${promCls}">
              <span class="compare-lt40-stat-label">Promedio</span>
              <strong class="compare-lt40-stat-val">${fmt(p.promedio)}</strong>
            </div>
            <div class="compare-lt40-stat compare-lt40-cond ${condCls}">
              <span class="compare-lt40-stat-label">Condición</span>
              <strong class="compare-lt40-stat-val">${escapeHtml(p.condicion)}</strong>
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
        : 'Ninguna persona con menos de 40 jarras en las hojas seleccionadas.';
      const cols = 4 + (state._compareLast?.model?.days?.length || 0) + 2;
      return `<tr><td colspan="${cols}" class="compare-empty-row">${msg}</td></tr>`;
    }
    return people.map((p) => renderCompareLt40Row(p)).join('');
  }

  function compareLt40HintText(total, shown, q) {
    const base = 'en rojo = menos de 40 jarras ese día · supervisor según su LIC';
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
    return `<article class="compare-card tone-lt40-chart" aria-label="Supervisores con más personas bajo 40 jarras">
          <h3>Supervisores con más personas &lt; 40 jarras</h3>
          <p class="compare-hint compare-lt40-chart-hint">Quién concentra más cosechadores con bajo rendimiento en las hojas comparadas</p>
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

  function renderCompareContent(packsByFecha, activeFechas) {
    const el = $('compareContent');
    if (!el) return;
    const fechas = activeFechas || getCompareActiveFechas();
    const packs = packsByFecha || {};
    fechas.forEach((f) => {
      if (!packs[f] && state.comparePacks[f]) packs[f] = state.comparePacks[f];
    });
    const model = buildMultiCompareModel(packs, fechas);
    state._compareLast = { packs, fechas, model };
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
              <th scope="row">Personas con menos de 40 jarras</th>
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
              <h3>Personas con menos de 40 jarras</h3>
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
                  <th scope="col" class="compare-day-col">Promedio</th>
                  <th scope="col" class="compare-day-col">Condición</th>
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
          <h3>Personas con menos de 40 jarras</h3>
          <p class="compare-empty">Ninguna persona con menos de 40 jarras en las hojas seleccionadas.</p>
          ${renderCompareExportBar(model.days)}
        </article>`;

    const lt40ChartHtml =
      lt40All.length && model.lt40BySupervisor && model.lt40BySupervisor.length
        ? renderCompareLt40SupervisorChartBlock()
        : '';

    const licHtml = model.licWorst
      ? `<article class="compare-card tone-lic">
          <h3>LIC (supervisor) más bajo</h3>
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
              <h3>Lote más bajo (suma de hojas)</h3>
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
              <h3>Lote más alto (suma de hojas)</h3>
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

    el.innerHTML = `<div class="compare-grid">${summaryHtml}${lt40Html}${lt40ChartHtml}${licHtml}${lotHtml}</div>`;
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
  }

  function scheduleCharts(pack) {
    if (state._chartsTimer) clearTimeout(state._chartsTimer);
    state._chartsTimer = setTimeout(() => {
      state._chartsTimer = 0;
      renderCharts(pack);
    }, 40);
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
        state._compareDirty = true;
        runCompare(true);
      });
    }
    const sheetBar = $('compareSheetBar');
    if (sheetBar && !sheetBar.dataset.bound) {
      sheetBar.dataset.bound = '1';
      sheetBar.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action][data-fecha]');
        if (!btn) return;
        const fecha = btn.getAttribute('data-fecha');
        const action = btn.getAttribute('data-action');
        if (action === 'exclude') {
          setCompareExcluded(fecha, true);
          runCompare(true);
        } else if (action === 'include') {
          setCompareExcluded(fecha, false);
          runCompare(true);
        }
      });
    }

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

    const bindExcel = (id, mode) => {
      const btn = $(id);
      if (!btn) return;
      btn.addEventListener('click', () => {
        const people = peopleOf(state.report).filter((r) => {
          const c = Number(r.c || 0);
          return mode === 'gt40' ? c > 40 : c < 40;
        });
        const fechaInfo = state.fecha ? fechaInfoFor(state.fecha) : null;
        QB.export.excelPeopleByJarras({
          mode,
          people,
          fecha: state.fecha || '',
          fechaLabel: fechaLabelText(state.fecha)
        });
      });
    };
    bindExcel('btnExcelLt40', 'lt40');
    bindExcel('btnExcelGt40', 'gt40');

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
      btnRefresh.addEventListener('click', () => openRefreshModal());
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
    const hasData = !!(state.rows && state.rows.length);

    if (btn) btn.classList.add('is-busy');
    if (text) text.textContent = '…';

    if (!hasData) {
      document.body.classList.remove('is-ready');
      showLoadModal('Cargando', 'Espera un momento, por favor…');
    } else {
      showSyncBanner(
        'Estamos conectando… aún puedes usar la app. Te avisamos cuando esté actualizada.'
      );
    }

    try {
      const r = await QB.api.refresh({ fecha: state.fecha || '' });
      if ((r.pack.data || []).length || !hasData) {
        applyPack(r.pack, { requestedFecha: state.fecha || '' });
      }
      if (r.changed && !r.error) {
        flashHero();
        QB.export.toast('Ya lista · se actualizó · ' + ((r.pack.data && r.pack.data.length) || 0) + ' personas', 'ok');
      } else if (r.error && hasData) {
        QB.export.toast('Sin red · sigues con lo último', 'warn');
      } else if (!hasData) {
        const n = (r.pack.data && r.pack.data.length) || 0;
        if (n) QB.export.toast('Ya lista · ' + n + ' personas', 'ok');
        else QB.export.toast('Sin datos del día', 'warn');
      }
    } catch (err) {
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

  /** Una fila por persona (suma jarras del día cargado). */
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

  function renderHero(report) {
    const menuWasOpen = document.getElementById('fechaDd')?.classList.contains('is-open');
    const k = (report && report.kpis) || {};
    const fechaInfo = state.fecha ? fechaInfoFor(state.fecha) : null;
    const fechaMain = fechaInfo ? fechaInfo.full : 'Sin fecha';
    const fechaPickerLabel = fechaInfo ? (fechaInfo.fullLong || fechaInfo.full) : 'Sin fecha';
    const fecha = fechaInfo ? (fechaInfo.fullLong || fechaInfo.full) : 'Sin fecha';
    const people = peopleOf(report);
    const top = people[0];
    const topG = (k.porGrupo || [])[0];
    const syncAt = shortSyncTime(state.syncedAt || (report && report.actualizado) || QB.api.getLastSync() || '');
    const nPeople = people.length || k.totalTrabajadores || 0;
    const nGrupos = k.totalGrupos || (k.porGrupo || []).length || 0;
    const avgJarras = k.promedioCajasPorTrabajador || (nPeople ? (k.totalCajas || 0) / nPeople : 0);
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
              <span class="fecha-dd-value">${escapeHtml(fechaPickerLabel)}</span>
            </span>
            <span class="fecha-dd-chev" aria-hidden="true">${QB.icons.chevronRight(12)}</span>
          </button>
          <div class="fecha-dd-menu" id="fechaDdMenu" role="listbox" aria-label="Fechas disponibles" hidden>
            <p class="fecha-dd-menu-title">Seleccionar día</p>
            ${opts
              .map((o) => {
                const displayIso = o.display || o.value;
                const info = fmtFechaClara(displayIso);
                const active = o.value === state.fecha ? ' is-active' : '';
                const filasMeta = o.filas ? fmt(o.filas) + ' registros' : '';
                const title = info.fullLong + (filasMeta ? ' · ' + filasMeta : '');
                return `<button
                  type="button"
                  class="fecha-dd-opt${active}"
                  role="option"
                  data-value="${escapeAttr(o.value)}"
                  aria-selected="${o.value === state.fecha ? 'true' : 'false'}"
                  title="${escapeAttr(title)}"
                >
                  <span class="fecha-dd-opt-main">
                    <span class="fecha-dd-opt-week">${escapeHtml(info.weekdayLong || info.weekday)}</span>
                    <span class="fecha-dd-opt-line">${escapeHtml(info.line || info.short)}</span>
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
                <div class="metric-row">
                  <p class="value">${fmt(k.totalCajas)}</p>
                  <span class="unit">jarras</span>
                </div>
                <div class="metric-subrow">
                  <span class="metric-chip" title="Cosechadores registrados">${fmt(nPeople)} personas</span>
                  <span class="metric-chip" title="Grupos LIC activos">${fmt(nGrupos)} grupos</span>
                  <span class="metric-chip" title="Promedio por cosechador">${fmt(avgJarras)} prom.</span>
                </div>
                <div class="metric-spark" aria-hidden="true" title="Tendencia al alza">
                  <svg class="spark-svg" viewBox="0 0 120 56" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#4ab848" stop-opacity="0.25"/>
                        <stop offset="100%" stop-color="#4ab848" stop-opacity="0"/>
                      </linearGradient>
                    </defs>
                    <path class="spark-area" d="M4 48 L18 44 L32 40 L46 36 L60 28 L74 24 L88 16 L104 10 L116 6 L116 52 L4 52 Z"/>
                    <path class="spark-line" d="M4 48 L18 44 L32 40 L46 36 L60 28 L74 24 L88 16 L104 10 L116 6"/>
                    <circle class="spark-dot" cx="116" cy="6" r="3.2"/>
                  </svg>
                  <span class="spark-badge">↑ sube</span>
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
              <div class="hero-side-total">
                <strong>${fmt(k.totalCajas)}</strong>
                <span>jarras</span>
              </div>
              <div class="hero-side-stats">
                <div class="hero-side-stat">
                  <strong>${fmt(nPeople)}</strong>
                  <span>Cosechadores</span>
                </div>
                <div class="hero-side-stat">
                  <strong>${fmt(nGrupos)}</strong>
                  <span>Grupos LIC</span>
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
            <span class="stat-foot">Personal activo</span>
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
    const fecha = state.fecha || '';
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
    const maxC = Math.max(...grupos.map((g) => g.c || 0), 1);
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
        const peopleN = Number(g.n) || 0;
        const jefe = QB.supervisors ? QB.supervisors.label(g.grupo, fecha) : '';
        const jefeFull = QB.supervisors ? QB.supervisors.fullLabel(g.grupo, fecha) : '';
        return `<button type="button" class="grupo-map-row" role="listitem" data-grupo="${escapeAttr(g.grupo)}" title="#${i + 1} · ${escapeAttr(shortGrupo(g.grupo))} · ${fmt(g.c)} jarras · ${peopleN} personas${jefeFull ? ` · Supervisor: ${escapeAttr(jefeFull)}` : ''} · toca para ver el equipo">
          <span class="grupo-map-rank" title="Puesto #${i + 1} en jarras">${i + 1}</span>
          <span class="grupo-map-body">
            <span class="grupo-map-top">
              <strong title="${escapeAttr(g.grupo)}">${escapeHtml(shortGrupo(g.grupo))}</strong>
              <em title="${fmt(g.c)} jarras en este grupo">${fmt(g.c)} jarras</em>
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
    const people = peopleOf(state.report);
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
      people = people.filter((r) => Number(r.c || 0) < 40);
    } else if (jarFilter === 'gte40') {
      people = people.filter((r) => Number(r.c || 0) > 40);
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

    const nLt40 = allTeam.filter((r) => Number(r.c || 0) < 40).length;
    const nGte40 = allTeam.filter((r) => Number(r.c || 0) > 40).length;
    const totalJarras = allTeam.reduce((s, r) => s + (r.c || 0), 0);
    const jefeFull = QB.supervisors ? QB.supervisors.fullLabel(grupoKey) : '';
    const jefeShort = QB.supervisors ? QB.supervisors.label(grupoKey) : '';
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
        ${filterChip('lt40', 'Menos de 40', nLt40)}
        ${filterChip('gte40', 'Más de 40', nGte40)}
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
    const rankList = peopleOf(state.report);
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

  function closeModal() {
    const root = $('modalRoot');
    if (root) {
      root.hidden = true;
      const modal = root.querySelector('.modal');
      if (modal) {
        modal.classList.remove('is-sheet');
        modal.classList.remove('is-warn-modal');
        modal.classList.remove('is-stat-tip-modal');
        modal.classList.remove('is-refresh-modal');
      }
    }
    state.grupoModal = '';
    state.grupoWorkerQ = '';
    state.grupoJarFilter = 'all';
    QB.charts.dispose('chartModal');
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

  window.QB = window.QB || {};
  QB.appFecha = function () {
    return state.fecha || '';
  };

  boot().catch(function (err) {
    if (QB.export && QB.export.toast) {
      QB.export.toast('No se pudo cargar: ' + (err && err.message ? err.message : 'error'), 'warn');
    }
  });
})();
