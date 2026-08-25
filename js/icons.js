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
      cloud: () => this.cloud(size),
      wifi: () => this.wifi(size),
      info: () => this.info(size),
      chevronRight: () => this.chevronRight(size),
      chevronLeft: () => this.chevronLeft(size),
      close: () => this.close(size),
      trendUp: () => this.trendUp(size),
      trendDown: () => this.trendDown(size),
      diamond: () => this.diamond(size)
    };
    return (map[kind] || map.jar)();
  },

  /** Badge HTML para títulos de panel */
  titleBadge(kind, tone = 'green', size = 18) {
    return `<span class="title-ico tone-${tone}" aria-hidden="true">${this.raw(kind, size)}</span>`;
  }
};
