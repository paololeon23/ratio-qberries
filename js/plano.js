/* Plano de cosecha Etapa I · fuente: data/plano-cosecha.json */
window.QB = window.QB || {};

QB.plano = {
  title: 'PLANO DE COSECHA ETAPA I',
  brand: 'Q Berries',
  totalHa: 220.76,
  ready: true,
  modules: [
    { id: 1, label: 'M1', name: 'Modulo 01', ha: 36.24, fill: '#E4D0F2', badge: '#8E24AA' },
    { id: 2, label: 'M2', name: 'Modulo 02', ha: 42.55, fill: '#C6E8A8', badge: '#43A047' },
    { id: 3, label: 'M3', name: 'Modulo 03', ha: 40.93, fill: '#9FD4F5', badge: '#1E88E5' },
    { id: 4, label: 'M4', name: 'Modulo 04', ha: 42.09, fill: '#FFE566', badge: '#F9A825' },
    { id: 5, label: 'M5', name: 'Modulo 05', ha: 38.19, fill: '#FFB89A', badge: '#E64A19' },
    { id: 10, label: 'M10', name: 'Modulo 10', ha: 20.76, fill: '#80CBC4', badge: '#00695C' }
  ],
  loteToMod: {
    3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1, 11: 1, 12: 1, 13: 1, 17: 1,
    18: 1, 19: 1, 20: 1, 21: 1, 22: 1, 23: 1, 24: 1, 25: 1, 26: 1, 27: 1, 28: 1, 29: 1,
    30: 1, 31: 1, 32: 1, 33: 1, 34: 1, 35: 1, 36: 1, 37: 1, 38: 1, 39: 1, 40: 1, 41: 1,
    42: 1, 43: 1, 44: 1, 45: 1, 46: 1, 47: 2, 48: 2, 49: 2, 50: 2, 51: 2, 52: 2, 53: 2,
    54: 2, 55: 2, 56: 2, 57: 2, 58: 2, 59: 2, 60: 2, 61: 2, 62: 2, 63: 2, 64: 2, 65: 2,
    66: 2, 67: 2, 68: 2, 69: 2, 70: 2, 71: 2, 72: 2, 73: 2, 74: 2, 75: 2, 76: 2, 77: 2,
    78: 2, 79: 2, 80: 2, 81: 2, 82: 2, 83: 2, 84: 2, 85: 2, 86: 2, 87: 2, 88: 2, 89: 2,
    90: 2, 91: 2, 92: 2, 93: 2, 94: 2, 95: 3, 96: 3, 97: 3, 98: 3, 99: 3, 100: 3, 101: 3,
    102: 3, 103: 3, 104: 3, 105: 3, 106: 3, 107: 3, 108: 3, 109: 3, 110: 3, 111: 3, 112: 3, 113: 3,
    114: 3, 115: 3, 116: 3, 117: 3, 118: 3, 119: 3, 120: 3, 121: 3, 122: 3, 123: 3, 124: 3, 125: 3,
    126: 3, 127: 3, 128: 3, 129: 3, 130: 3, 131: 3, 132: 3, 133: 3, 134: 3, 135: 3, 136: 3, 137: 4,
    138: 4, 139: 4, 140: 4, 141: 4, 142: 4, 143: 4, 144: 4, 145: 4, 146: 4, 147: 4, 148: 4, 149: 4,
    150: 4, 151: 4, 152: 4, 153: 4, 154: 4, 155: 4, 156: 4, 157: 4, 158: 4, 159: 4, 160: 4, 161: 4,
    162: 4, 163: 4, 164: 4, 165: 4, 166: 4, 167: 4, 168: 4, 169: 4, 170: 4, 171: 4, 172: 4, 173: 4,
    174: 4, 175: 4, 176: 4, 177: 4, 178: 4, 179: 4, 180: 4, 181: 4, 182: 5, 183: 5, 184: 5, 185: 5,
    186: 5, 187: 5, 188: 5, 189: 5, 190: 5, 191: 5, 192: 5, 193: 5, 194: 5, 195: 5, 196: 5, 197: 5,
    198: 10, 199: 10, 200: 10, 201: 10, 202: 10, 203: 10, 204: 10, 205: 10, 206: 10, 207: 10, 208: 10, 209: 10,
    210: 10, 211: 10, 212: 10, 213: 10, 214: 10, 215: 10, 216: 10, 217: 5, 218: 5, 219: 5, 220: 5, 221: 5,
    222: 5, 223: 10, 224: 10, 225: 5, 230: 5, 231: 5, 232: 5, 233: 5, 234: 5, 235: 5, 236: 5, 237: 5,
    238: 5, 239: 5, 240: 5, 241: 5, 242: 5, 243: 5, 244: 5, 245: 5, 246: 5, 247: 5, 275: 2, 276: 2,
    277: 4, 278: 4, 279: 4
  },

  labels: function () {
    return this.modules.map(function (m) { return m.label; });
  },

  total: function () {
    return this.modules.length;
  },

  parseLoteNum: function (v) {
    const s = String(v == null ? '' : v).trim();
    if (!s) return 0;
    const m = s.match(/L\s*0*(\d+)/i);
    if (m) return Number(m[1]) || 0;
    return 0;
  },

  parseModId: function (v) {
    const s = String(v == null ? '' : v).trim();
    if (!s) return 0;
    const m = s.match(/M(?:odulo)?\s*0*(\d+)/i);
    if (m) return Number(m[1]) || 0;
    if (/^\d+$/.test(s)) return Number(s) || 0;
    return 0;
  },

  labelOf: function (id) {
    const n = Number(id) || 0;
    if (!n) return '';
    const hit = this.modules.find(function (m) { return m.id === n; });
    return hit ? hit.label : 'M' + n;
  },

  moduleOf: function (id) {
    const n = Number(id) || 0;
    return this.modules.find(function (m) { return m.id === n; }) || null;
  },

  /** L179-T10-M4 → M4 · lote oficial manda sobre el sufijo M */
  modOfLote: function (v) {
    const lote = this.parseLoteNum(v);
    if (lote && this.loteToMod[lote]) return this.labelOf(this.loteToMod[lote]);
    const mid = this.parseModId(v);
    return mid ? this.labelOf(mid) : '';
  },

  apply: function (payload) {
    if (!payload || !Array.isArray(payload.modules) || !Array.isArray(payload.lots)) return this;
    this.title = payload.title || this.title;
    this.brand = payload.brand || this.brand;
    this.totalHa = Number(payload.totalHa) || this.totalHa;
    this.modules = payload.modules.map(function (m) {
      return {
        id: Number(m.id) || 0,
        label: m.label || ('M' + (Number(m.id) || '')),
        name: m.name || '',
        ha: Number(m.ha) || 0,
        fill: m.fill || '',
        badge: m.badge || ''
      };
    }).filter(function (m) { return m.id; });
    const map = {};
    payload.lots.forEach(function (lot) {
      const n = Number(lot && lot.lote) || 0;
      const mod = Number(lot && lot.modulo) || 0;
      if (n && mod && !map[n]) map[n] = mod;
    });
    this.loteToMod = map;
    this.ready = true;
    return this;
  },

  async load() {
    if (location.protocol === 'file:') return this;
    try {
      const res = await fetch('data/plano-cosecha.json', { cache: 'force-cache' });
      if (!res.ok) throw new Error('plano HTTP ' + res.status);
      this.apply(await res.json());
    } catch (_) {}
    return this;
  }
};