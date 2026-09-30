/* Iconos SVG · trazo limpio, estilo Q Berries */
window.QB = window.QB || {};

QB.icons = {
  wrap(svg, cls = '') {
    return `<span class="ico ${cls}" aria-hidden="true">${svg}</span>`;
  },

  svg(paths, size = 22, sw = 1.75) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  },

  building(size) {
    return this.svg(
      `<path d="M4 21h16"/><path d="M6 21V7l6-3 6 3v14"/><path d="M10 21v-5h4v5"/><path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M9 14h.01"/><path d="M15 14h.01"/>`,
      size
    );
  },

  users(size) {
    return this.svg(
      `<path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="3.5"/><path d="M20.5 21v-2a3.5 3.5 0 0 0-2.6-3.35"/><path d="M16 3.7a3.5 3.5 0 0 1 0 6.6"/>`,
      size
    );
  },

  user(size) {
    return this.svg(
      `<circle cx="12" cy="8" r="3.5"/><path d="M5.5 20.5v-1.2A4.8 4.8 0 0 1 10.3 14.5h3.4a4.8 4.8 0 0 1 4.8 4.8v1.2"/>`,
      size
    );
  },

  lock(size) {
    return this.svg(
      `<rect x="6" y="11" width="12" height="10" rx="2"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/>`,
      size
    );
  },

  activity(size) {
    return this.svg(`<path d="M3 12h3.2l2.3-7 3.5 14 2.5-7H21"/>`, size);
  },

  clock(size) {
    return this.svg(`<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/>`, size);
  },

  map(size) {
    return this.svg(
      `<path d="M9 4.5 3.5 6.5v13L9 17.5l6 2 5.5-2v-13L15 6.5 9 4.5z"/><path d="M9 4.5v13"/><path d="M15 6.5v13"/>`,
      size
    );
  },

  /** Persona suave · headers (ratio) */
  personSoft(size) {
    const s = size || 14;
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true" class="ico-person-soft">` +
      `<circle cx="12" cy="8" r="3.2" fill="#8a9a90" stroke="none"/>` +
      `<path fill="#8a9a90" d="M5.8 19.2c.4-3.1 2.9-4.9 6.2-4.9s5.8 1.8 6.2 4.9c.05.4-.25.8-.7.8H6.5c-.45 0-.75-.4-.7-.8z"/>` +
      `</svg>`
    );
  },

  /** Arándano suave · headers (kg) */
  blueberrySoft(size) {
    const s = size || 14;
    const id = 'bb' + s;
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true" class="ico-blueberry-soft">` +
      `<defs>` +
      `<radialGradient id="${id}" cx="38%" cy="32%" r="70%">` +
      `<stop offset="0%" stop-color="#a8b4c4"/>` +
      `<stop offset="70%" stop-color="#7a889c"/>` +
      `<stop offset="100%" stop-color="#667484"/>` +
      `</radialGradient>` +
      `</defs>` +
      `<circle cx="12" cy="13" r="7.2" fill="url(#${id})"/>` +
      `<circle cx="9.8" cy="10.8" r="1.4" fill="#d0d6de" opacity=".5"/>` +
      `<path fill="#7a8578" d="M10.2 5.2c.6-.8 1.5-1.2 2.5-.9.3.1.4.4.3.7-.4.8-1.1 1.1-2 1.2-.4 0-.7-.4-.8-1z"/>` +
      `<path fill="none" stroke="#6a7568" stroke-width="1.1" stroke-linecap="round" d="M12.4 4.6c.9.1 1.6.6 2 1.3"/>` +
      `</svg>`
    );
  },

  jar(size) {
    return this.svg(
      `<path d="M8 3.5h8"/><path d="M9 3.5v2a2 2 0 0 0 .35 1.12L10.8 8.5H9.2A2.2 2.2 0 0 0 7 10.7V18a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3v-7.3a2.2 2.2 0 0 0-2.2-2.2h-1.6l1.45-1.88A2 2 0 0 0 15 5.5v-2"/><path d="M9.5 13.5h5"/>`,
      size
    );
  },

  star(size) {
    return this.svg(
      `<path d="M12 3.4l2.1 5.1 5.5.5-4.2 3.7 1.3 5.4L12 15.6 7.3 18.1l1.3-5.4-4.2-3.7 5.5-.5L12 3.4z"/>`,
      size
    );
  },

  trophy(size) {
    return this.svg(
      `<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M7 6H5.5A2.5 2.5 0 0 0 5.5 11H7"/><path d="M17 6h1.5A2.5 2.5 0 0 1 18.5 11H17"/>`,
      size
    );
  },

  /** Copa campeonato · oro / plata / bronce (relleno metálico) */
  cupChamp(tone, size) {
    const s = size || 28;
    const tones = {
      gold: { cup: '#f5c542', cup2: '#c9970d', shine: '#fff3c4', stem: '#b8860b', base: '#9a7208' },
      silver: { cup: '#d4dae2', cup2: '#8e99a6', shine: '#ffffff', stem: '#6f7b88', base: '#5a6570' },
      bronze: { cup: '#e0a06a', cup2: '#a85a22', shine: '#ffe3c4', stem: '#8a4b18', base: '#6a3010' }
    };
    const t = tones[tone] || tones.gold;
    const id = 'cup' + tone + s;
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 48 48" aria-hidden="true" class="cup-champ cup-${tone}">` +
      `<defs>` +
      `<linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0%" stop-color="${t.shine}"/>` +
      `<stop offset="45%" stop-color="${t.cup}"/>` +
      `<stop offset="100%" stop-color="${t.cup2}"/>` +
      `</linearGradient>` +
      `</defs>` +
      `<path fill="url(#${id}g)" d="M14 6h20v9c0 6.6-5.4 12-12 12S10 21.6 10 15V6h4z"/>` +
      `<path fill="${t.cup2}" opacity=".35" d="M14 6h5v20.6c-3-1.2-5-4.2-5-7.6V6z"/>` +
      `<path fill="none" stroke="${t.cup2}" stroke-width="2.4" stroke-linecap="round" d="M14 9H9.5A5.5 5.5 0 0 0 9.5 20H14"/>` +
      `<path fill="none" stroke="${t.cup2}" stroke-width="2.4" stroke-linecap="round" d="M34 9h4.5A5.5 5.5 0 0 1 38.5 20H34"/>` +
      `<rect x="21.5" y="27" width="5" height="8" rx="1.2" fill="${t.stem}"/>` +
      `<path fill="${t.base}" d="M16 41h16l-2.5-4H18.5L16 41z"/>` +
      `<ellipse cx="24" cy="41.5" rx="10" ry="2.2" fill="${t.cup2}"/>` +
      (tone === 'gold'
        ? `<path fill="${t.shine}" opacity=".85" d="M22 8.5 24.2 13l4.8.4-3.7 3.2 1.1 4.7L24.2 19l-4.2 2.3 1.1-4.7-3.7-3.2 4.8-.4z"/>`
        : '') +
      `</svg>`
    );
  },

  cupGold(size) {
    return this.cupChamp('gold', size);
  },
  cupSilver(size) {
    return this.cupChamp('silver', size);
  },
  cupBronze(size) {
    return this.cupChamp('bronze', size);
  },

  crown(size) {
    return this.svg(
      `<path d="M3.5 16.5 5.5 7l3.8 4.2L12 5.5l2.7 5.7L18.5 7l2 9.5H3.5z"/><path d="M4.5 19.5h15"/>`,
      size
    );
  },

  bars(size) {
    return this.svg(
      `<path d="M5 19.5V11"/><path d="M12 19.5V5"/><path d="M19 19.5v-7"/><path d="M3.5 19.5h17"/>`,
      size
    );
  },

  leaf(size) {
    return this.svg(
      `<path d="M5 18.5c6.5 1.5 12-3.5 13.5-10.5C11.5 6.5 6.5 12 5 18.5z"/><path d="M8.5 15.5c2.2-1.6 4.2-4 5.5-7"/>`,
      size
    );
  },

  alarm(size) {
    return this.svg(
      `<path d="M12 3.5 21 19.5H3L12 3.5z"/><path d="M12 10v4.5"/><circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none"/>`,
      size
    );
  },

  bell(size) {
    return this.svg(
      `<path d="M7.5 17.5h9"/><path d="M6 17.5a6.5 6.5 0 0 1 6.5-6.5A6.5 6.5 0 0 1 19 17.5"/><path d="M12 4.5v1.2"/><path d="M10.2 19.5a1.8 1.8 0 0 0 3.6 0"/>`,
      size
    );
  },

  sparkles(size) {
    return this.svg(
      `<path d="M12 3.5v3"/><path d="M12 17.5v3"/><path d="M3.5 12h3"/><path d="M17.5 12h3"/><path d="M6.2 6.2l2.1 2.1"/><path d="M15.7 15.7l2.1 2.1"/><path d="M17.8 6.2l-2.1 2.1"/><path d="M8.3 15.7l-2.1 2.1"/><circle cx="12" cy="12" r="2.2"/>`,
      size
    );
  },

  target(size) {
    return this.svg(
      `<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.5"/>`,
      size
    );
  },

  layers(size) {
    return this.svg(
      `<path d="M12 3.5 20 8l-8 4.5L4 8l8-4.5z"/><path d="M4 12.5 12 17l8-4.5"/><path d="M4 16.5 12 21l8-4.5"/>`,
      size
    );
  },

  clipboard(size) {
    return this.svg(
      `<rect x="6" y="5" width="12" height="15" rx="2"/><path d="M9 5.2V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5v.7"/><path d="M9 11h6"/><path d="M9 14.5h4"/>`,
      size
    );
  },

  gauge(size) {
    return this.svg(
      `<path d="M5.5 16.5a7.5 7.5 0 1 1 13 0"/><path d="M12 14.5 16 9"/><circle cx="12" cy="14.5" r="1.2"/>`,
      size
    );
  },

  trendUp(size) {
    return this.svg(
      `<path d="M4 17.5 10.2 11l3.3 3.3L20 7.5"/><path d="M14.5 7.5H20v5.5"/>`,
      size
    );
  },

  trendDown(size) {
    return this.svg(
      `<path d="M4 7.5 10.2 14l3.3-3.3L20 17.5"/><path d="M14.5 17.5H20v-5.5"/>`,
      size
    );
  },

  diamond(size) {
    return this.svg(
      `<path d="M12 3.5 20.5 12 12 20.5 3.5 12 12 3.5z"/><path d="M12 8.2 15.8 12 12 15.8 8.2 12 12 8.2z"/>`,
      size
    );
  },

  search(size) {
    return this.svg(`<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-3.5-3.5"/>`, size);
  },

  phone(size) {
    return this.svg(
      `<rect x="7" y="3.5" width="10" height="17" rx="2"/><path d="M11 17.5h2"/>`,
      size
    );
  },

  download(size) {
    return this.svg(
      `<path d="M12 4v11"/><path d="M8 11.5 12 15.5l4-4"/><path d="M5 19.5h14"/>`,
      size
    );
  },

  share(size) {
    return this.svg(
      `<circle cx="18" cy="5.5" r="2.2"/><circle cx="6" cy="12" r="2.2"/><circle cx="18" cy="18.5" r="2.2"/><path d="M8 10.9 16 6.7"/><path d="M8 13.1 16 17.3"/>`,
      size
    );
  },

  refresh(size) {
    return this.svg(`<path d="M20 12a8 8 0 1 1-2.2-5.5"/><path d="M20 4.5v5h-5"/>`, size);
  },

  file(size) {
    return this.svg(
      `<path d="M14 3.5H8.5A2.5 2.5 0 0 0 6 6v12a2.5 2.5 0 0 0 2.5 2.5h7A2.5 2.5 0 0 0 18 18V8.5L14 3.5z"/><path d="M14 3.5V8.5h4.5"/><path d="M9 13h6"/><path d="M9 16.5h4"/>`,
      size
    );
  },

  pdf(size) {
    return this.svg(
      `<path d="M14 3.5H8.5A2.5 2.5 0 0 0 6 6v12a2.5 2.5 0 0 0 2.5 2.5h7A2.5 2.5 0 0 0 18 18V8.5L14 3.5z"/><path d="M14 3.5V8.5h4.5"/><path d="M8.3 13.1h1.7l.8 2.1.8-2.1h1.7"/><path d="M8.3 16.1h5.4"/>`,
      size
    );
  },

  image(size) {
    return this.svg(
      `<rect x="4.5" y="6" width="15" height="12" rx="2"/><circle cx="9.5" cy="10.5" r="1.7"/><path d="M6 16.5 9.5 13l2.5 2.5L13.5 11l4.5 5.5"/>`,
      size
    );
  },

  bolt(size) {
    return this.svg(`<path d="M13 2.5 4.5 14h6.2l-1.2 7.5L19.5 10H13.2l-.2-7.5z"/>`, size);
  },

  cloud(size) {
    return this.svg(
      `<path d="M7.5 18.5h9.2a3.8 3.8 0 0 0 .4-7.58 5.2 5.2 0 0 0-10-1.5A3.6 3.6 0 0 0 7.5 18.5z"/>`,
      size
    );
  },

  wifi(size) {
    return this.svg(
      `<path d="M5 12.2a9.5 9.5 0 0 1 14 0"/><path d="M8.2 15a5.2 5.2 0 0 1 7.6 0"/><circle cx="12" cy="18.2" r="1.1"/>`,
      size
    );
  },

  info(size) {
    return this.svg(
      `<circle cx="12" cy="12" r="8.5"/><path d="M12 10.5v6"/><path d="M12 7.5h.01"/>`,
      size
    );
  },

  checkCircle(size) {
    return this.svg(`<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.5 11 15l5.5-6"/>`, size);
  },

  chevronRight(size) {
    return this.svg(`<path d="M9 6.5 15 12l-6 5.5"/>`, size, 2);
  },

  chevronLeft(size) {
    return this.svg(`<path d="M15 6.5 9 12l6 5.5"/>`, size, 2);
  },

  close(size) {
    return this.svg(`<path d="M7 7l10 10"/><path d="M17 7 7 17"/>`, size, 1.9);
  },

  raw(kind, size = 22) {
    const map = {
      building: () => this.building(size),
      users: () => this.users(size),
      user: () => this.user(size),
      lock: () => this.lock(size),
      activity: () => this.activity(size),
      clock: () => this.clock(size),
      lot: () => this.map(size),
      map: () => this.map(size),
      jar: () => this.jar(size),
      star: () => this.star(size),
      trophy: () => this.trophy(size),
      crown: () => this.crown(size),
      bars: () => this.bars(size),
      leaf: () => this.leaf(size),
      bell: () => this.bell(size),
      sparkles: () => this.sparkles(size),
      target: () => this.target(size),
      layers: () => this.layers(size),
      clipboard: () => this.clipboard(size),
      gauge: () => this.gauge(size),
      alarm: () => this.alarm(size),
      phone: () => this.phone(size),
      search: () => this.search(size),
      download: () => this.download(size),
      share: () => this.share(size),
      refresh: () => this.refresh(size),
      file: () => this.file(size),
      pdf: () => this.pdf(size),
      image: () => this.image(size),
      bolt: () => this.bolt(size),
      cloud: () => this.cloud(size),
      wifi: () => this.wifi(size),
      info: () => this.info(size),
      checkCircle: () => this.checkCircle(size),
      chevronRight: () => this.chevronRight(size),
      chevronLeft: () => this.chevronLeft(size),
      close: () => this.close(size),
      trendUp: () => this.trendUp(size),
      trendDown: () => this.trendDown(size),
      diamond: () => this.diamond(size)
    };
    return (map[kind] || map.jar)();
  }
};
