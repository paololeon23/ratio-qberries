/* Select personalizado estilo modal/pills — uso en campo */
window.QB = window.QB || {};

QB.select = {
  open({ title, options, value = '', searchPlaceholder = 'Buscar…', allLabel = null, onPick }) {
    const root = document.getElementById('selectModal');
    const body = document.getElementById('selectModalBody');
    if (!root || !body) return;

    body.innerHTML = `
      <div class="modal-head">
        <h3>${escapeHtml(title)}</h3>
        <button type="button" class="modal-close" data-close-select="1" aria-label="Cerrar">×</button>
      </div>
      <input class="search-input" id="selectSearch" type="search" placeholder="${escapeHtml(searchPlaceholder)}" autocomplete="off" />
      <div class="pick-list" id="selectPickList"></div>
      ${allLabel != null ? `<button type="button" class="pick-all" data-all="1">${escapeHtml(allLabel)}</button>` : ''}
    `;

    const list = body.querySelector('#selectPickList');
    const search = body.querySelector('#selectSearch');

    const render = (q = '') => {
      const qq = q.trim().toLowerCase();
      const filtered = options.filter((o) => {
        const blob = `${o.value} ${o.label} ${o.sub || ''}`.toLowerCase();
        return !qq || blob.includes(qq);
      });
      list.innerHTML = filtered
        .map((o) => {
          const active = String(o.value) === String(value) ? ' is-active' : '';
          return `<button type="button" class="pick-item${active}" data-value="${escapeAttr(o.value)}">
            <span class="primary">${escapeHtml(o.label)}</span>
            ${o.sub ? `<span class="secondary">— ${escapeHtml(o.sub)}</span>` : ''}
          </button>`;
        })
        .join('') || `<p class="muted" style="padding:0.5rem">Sin resultados</p>`;
    };

    render();
    search.addEventListener('input', () => render(search.value));
    list.addEventListener('click', (e) => {
      const btn = e.target.closest('.pick-item');
      if (!btn) return;
      onPick && onPick(btn.dataset.value);
      close();
    });
    const allBtn = body.querySelector('[data-all]');
    if (allBtn) {
      allBtn.addEventListener('click', () => {
        onPick && onPick('');
        close();
      });
    }

    root.hidden = false;
    setTimeout(() => search.focus(), 50);

    function onDoc(e) {
      if (e.target.closest('[data-close-select]')) {
        close();
        return;
      }
      if (e.target === root || e.target.classList.contains('modal-backdrop')) close();
    }
    root.addEventListener('click', onDoc);
    function close() {
      root.hidden = true;
      root.removeEventListener('click', onDoc);
      body.innerHTML = '';
    }
    QB.select._close = close;
  }
};

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, '&#39;');
}
