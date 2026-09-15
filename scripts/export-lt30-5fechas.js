const fs = require('fs');
const path = require('path');
const https = require('https');

const root = path.join(__dirname, '..');
const API =
  'https://script.google.com/macros/s/AKfycbyZdvK2-8VuA6NOd1sNcnSg2F4B3mYjC-kstZIZMZdtUK-buhpcB7BTx68OVmnjZjEdqg/exec';

const FECHA_KEYS = ['__hoja__0', '__hoja__1', '__hoja__2', '__hoja__4', '__hoja__3', '__hoja__5'];
/* orden cronológico: 07, 08, 09, 10, 11, 14 sep */

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getOnce(u, redirects) {
  redirects = redirects || 0;
  return new Promise((resolve, reject) => {
    const req = https.get(
      u,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 QBerriesExport/1.0',
          Accept: 'application/json'
        }
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects < 8) {
          return resolve(getOnce(res.headers.location, redirects + 1));
        }
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => {
          const t = (d || '').trim();
          if (!t || t.startsWith('<')) {
            return reject(new Error('HTML/empty (' + (res.statusCode || '?') + '): ' + t.slice(0, 120)));
          }
          try {
            resolve(JSON.parse(t));
          } catch (e) {
            reject(new Error('JSON: ' + t.slice(0, 180)));
          }
        });
      }
    );
    req.setTimeout(600000, () => {
      req.destroy();
      reject(new Error('timeout 600s'));
    });
    req.on('error', reject);
  });
}

async function get(u, retries) {
  retries = retries == null ? 4 : retries;
  let last;
  for (let i = 0; i <= retries; i++) {
    try {
      return await getOnce(u);
    } catch (e) {
      last = e;
      console.warn('retry', i + 1, e.message);
      await sleep(3000 + i * 4000);
    }
  }
  throw last;
}

function displayLabel(key, hojas) {
  const h = (hojas || []).find((x) => x.fecha === key);
  const iso = (h && (h.fechaDisplay || h.fecha)) || key;
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[3] + '-' + m[2] + '-' + m[1];
  return String(iso);
}

function loadSupervisorDnis() {
  const src = fs.readFileSync(path.join(root, 'js', 'supervisors.js'), 'utf8');
  const set = new Set();
  const re = /dni:\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(src))) {
    let d = String(m[1] || '').replace(/\D/g, '');
    if (!d) continue;
    if (d.length < 8) d = d.padStart(8, '0');
    set.add(d.slice(0, 9));
  }
  const re2 = /'(\d{7,9})'/g;
  /* también DNIs en arrays supervisores: */
  const block = src.match(/generales:\s*\[[\s\S]*?\],\s*\n\s*_byLicByFecha/);
  if (block) {
    while ((m = re2.exec(block[0]))) {
      let d = m[1];
      if (d.length < 8) d = d.padStart(8, '0');
      set.add(d.slice(0, 9));
    }
  }
  return set;
}

function loadSupervisorsByFecha() {
  const src = fs.readFileSync(path.join(root, 'js', 'supervisors.js'), 'utf8');
  const byFecha = {};
  const re =
    /\{\s*nombre:\s*'([^']*)',\s*dni:\s*'([^']*)',\s*lic:\s*'([^']*)',\s*fecha:\s*'([^']*)'\s*\}/g;
  let m;
  while ((m = re.exec(src))) {
    const fecha = m[4];
    const lic = String(m[3] || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' ');
    if (!byFecha[fecha]) byFecha[fecha] = {};
    byFecha[fecha][lic] = m[1];
  }
  return byFecha;
}

function normLic(g) {
  return String(g || '')
    .trim()
    .toUpperCase()
    .replace(/^GRUPO\s+/i, '')
    .replace(/\s+/g, ' ');
}

function mergePeople(data) {
  const byCi = new Map();
  for (const r of data || []) {
    const ci = String(r.ci || '').replace(/\D/g, '');
    if (!ci) continue;
    const c = Number(r.c) || 0;
    const cur = byCi.get(ci);
    if (!cur) {
      byCi.set(ci, {
        ci,
        nombre: [r.apellido, r.nombre].filter(Boolean).join(' ').trim(),
        grupo: r.grupo || '',
        c
      });
    } else {
      cur.c += c;
      if (!cur.nombre && (r.apellido || r.nombre)) {
        cur.nombre = [r.apellido, r.nombre].filter(Boolean).join(' ').trim();
      }
      if (!cur.grupo && r.grupo) cur.grupo = r.grupo;
    }
  }
  return byCi;
}

function xmlEsc(s) {
  return String(s == null ? '' : s)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function xlsxCol(n) {
  let s = '';
  let x = n + 1;
  while (x > 0) {
    const m = (x - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[i] = c >>> 0;
    }
    crc32.table = table;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(n) {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n, 0);
  return b;
}
function u32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0, 0);
  return b;
}

function zipStore(files) {
  const parts = [];
  const central = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, 'utf8');
    const data = Buffer.from(f.data, 'utf8');
    const crc = crc32(data);
    const local = Buffer.concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      name,
      data
    ]);
    parts.push(local);
    central.push(
      Buffer.concat([
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(crc),
        u32(data.length),
        u32(data.length),
        u16(name.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        name
      ])
    );
    offset += local.length;
  }
  const centralBuf = Buffer.concat(central);
  const end = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralBuf.length),
    u32(offset),
    u16(0)
  ]);
  return Buffer.concat(parts.concat([centralBuf, end]));
}

function isoForKey(key, hojas) {
  const h = (hojas || []).find((x) => x.fecha === key);
  const iso = (h && (h.fechaDisplay || h.fecha)) || '';
  const m = String(iso).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : '';
}

(async () => {
  const cacheDir = path.join(root, '.tmp-packs');
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

  const packs = [];
  let hojas = [];
  for (const key of FECHA_KEYS) {
    const cacheFile = path.join(cacheDir, key.replace(/[^\w]/g, '_') + '.json');
    let pack;
    if (fs.existsSync(cacheFile)) {
      pack = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      console.log('cache', key, (pack.data || []).length);
    } else {
      console.log('fetch', key, '…');
      pack = await get(API + '?action=todo&fecha=' + encodeURIComponent(key));
      fs.writeFileSync(
        cacheFile,
        JSON.stringify({ hoy: pack.hoy, hojas: pack.hojas, data: pack.data || [] })
      );
      console.log('ok', key, (pack.data || []).length);
    }
    if (pack.hojas && pack.hojas.length) hojas = pack.hojas;
    packs.push({ key, pack });
  }

  const dayMeta = packs.map(({ key, pack }) => ({
    key,
    label: displayLabel(key, hojas.length ? hojas : pack.hojas),
    iso: isoForKey(key, hojas.length ? hojas : pack.hojas),
    people: mergePeople(pack.data)
  }));

  const supByFecha = loadSupervisorsByFecha();
  const supervisorDnis = loadSupervisorDnis();
  console.log('supervisores excluidos (DNI):', supervisorDnis.size);

  /* Personas que en al menos un día tuvieron < 30 jarras (sin supervisores) */
  const cis = new Set();
  dayMeta.forEach((d) => {
    d.people.forEach((p, ci) => {
      if (supervisorDnis.has(ci)) return;
      if (p.c > 0 && p.c < 30) cis.add(ci);
    });
  });

  const rows = [
    [
      'CI',
      'Nombre completo',
      'Grupo LIC',
      'Supervisor (último día con dato)',
      ...dayMeta.map((d) => d.label + ' · jarras'),
      'Días <30'
    ]
  ];

  const list = [...cis].sort((a, b) => a.localeCompare(b));
  for (const ci of list) {
    let nombre = '';
    let grupo = '';
    let supervisor = '';
    const values = [];
    let sum = 0;
    let nDays = 0;
    let daysLt30 = 0;
    let lastIso = '';

    dayMeta.forEach((d) => {
      const p = d.people.get(ci);
      if (p) {
        if (!nombre && p.nombre) nombre = p.nombre;
        if (p.grupo) grupo = p.grupo;
        values.push(p.c);
        sum += p.c;
        nDays += 1;
        if (p.c > 0 && p.c < 30) daysLt30 += 1;
        if (d.iso) lastIso = d.iso;
      } else {
        values.push('');
      }
    });

    const lic = normLic(grupo);
    if (lastIso && supByFecha[lastIso] && supByFecha[lastIso][lic]) {
      supervisor = supByFecha[lastIso][lic];
    } else {
      /* fallback: buscar en cualquier día de la semana */
      for (const d of dayMeta) {
        if (d.iso && supByFecha[d.iso] && supByFecha[d.iso][lic]) {
          supervisor = supByFecha[d.iso][lic];
          break;
        }
      }
    }

    rows.push([ci, nombre || ci, lic || grupo, supervisor, ...values, daysLt30]);
  }

  /* Orden: más días <30 primero, luego menor mínimo del día */
  const header = rows[0];
  const body = rows.slice(1).sort((a, b) => {
    const daysA = a[header.length - 1];
    const daysB = b[header.length - 1];
    if (daysB !== daysA) return daysB - daysA;
    const valsA = a.slice(4, header.length - 1).filter((v) => v !== '').map(Number);
    const valsB = b.slice(4, header.length - 1).filter((v) => v !== '').map(Number);
    const minA = valsA.length ? Math.min(...valsA) : 999;
    const minB = valsB.length ? Math.min(...valsB) : 999;
    return minA - minB;
  });
  const finalRows = [header].concat(body);

  let sheetBody = '';
  finalRows.forEach((row, ri) => {
    const r = ri + 1;
    let cells = '';
    row.forEach((val, ci) => {
      const ref = xlsxCol(ci) + r;
      if (typeof val === 'number' && Number.isFinite(val)) {
        cells += '<c r="' + ref + '"><v>' + val + '</v></c>';
      } else if (val === '') {
        cells += '<c r="' + ref + '" t="inlineStr"><is><t></t></is></c>';
      } else {
        cells +=
          '<c r="' + ref + '" t="inlineStr"><is><t>' + xmlEsc(val) + '</t></is></c>';
      }
    });
    sheetBody += '<row r="' + r + '">' + cells + '</row>';
  });

  const sheetXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetData>' +
    sheetBody +
    '</sheetData></worksheet>';
  const workbookXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheets><sheet name="Menos de 30" sheetId="1" r:id="rId1"/></sheets></workbook>';
  const relsXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>';
  const wbRelsXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
    '</Relationships>';
  const contentTypes =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '</Types>';

  const bytes = zipStore([
    { name: '[Content_Types].xml', data: contentTypes },
    { name: '_rels/.rels', data: relsXml },
    { name: 'xl/workbook.xml', data: workbookXml },
    { name: 'xl/_rels/workbook.xml.rels', data: wbRelsXml },
    { name: 'xl/worksheets/sheet1.xml', data: sheetXml }
  ]);

  const out = path.join(root, 'QBerries_menos_de_30_5_fechas.xlsx');
  fs.writeFileSync(out, bytes);
  console.log('Excel:', out);
  console.log('Personas con al menos 1 día <30:', list.length);
  console.log(
    'Fechas:',
    dayMeta.map((d) => d.label).join(' / ')
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
