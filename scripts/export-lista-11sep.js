const fs = require('fs');
const path = require('path');
const https = require('https');

const root = path.join(__dirname, '..');
const packPath = path.join(root, '.tmp-viernes11.json');
const API =
  'https://script.google.com/macros/s/AKfycbyZdvK2-8VuA6NOd1sNcnSg2F4B3mYjC-kstZIZMZdtUK-buhpcB7BTx68OVmnjZjEdqg/exec?action=todo&fecha=' +
  encodeURIComponent('__hoja__3');

const wanted = [
  ['17977385', 'JULCA JULCA MAURA BALBINA'],
  ['42717056', 'ANGEL SAAVEDRA NATIVIDAD'],
  ['47300869', 'BACA CABRERA LADY DIANA'],
  ['47441082', 'AGUILAR VALIENTE YERTI VANESA'],
  ['18220451', 'VILLANUEVA RAMOS SOFIA'],
  ['44463567', 'MOLINA AQUINO ELIZABETH'],
  ['60157324', 'UNUP JEMPEKIT NORA MICHELY'],
  ['70013489', 'SAAVEDRA NAMOC FRANK EDWIN'],
  ['74476269', 'PUANCHIG KUJI CHANELA'],
  ['77129589', 'FLORES BARTRA ERLITH'],
  ['80479533', 'REYES RUIZ JULIO MICHEL'],
  ['71966919', 'TORRES CACEDA RENATO ALEJANDRO'],
  ['44753920', 'CERNA GAMONAL FELIX SANTIAGO'],
  ['47756848', 'CUSQUIPOMA MORI DANIS IMER'],
  ['40209007', 'MORALES VARGAS YULI ESTHER'],
  ['19042654', 'REYES CRUZADO TERESA'],
  ['45483786', 'CABRERA JULCA JEEN FRANDY'],
  ['80606470', 'LOPEZ REBOLO DE AGUIRRE MARIA MARGARITA'],
  ['41087801', 'PRINCIPE GAMBOA SANTOS IRIS'],
  ['19032092', 'MENDEZ MENDEZ JUAN GAMBERTI'],
  ['40921676', 'TARRILLO CORREA RICHARD CRISTIAN'],
  ['41306441', 'BENITES ABANTO ROSA ELENA'],
  ['63361396', 'URQUIZA JUAREZ SONIA MARITZA'],
  ['76151272', 'CABRERA ANTICONA MABEL KATERINE'],
  ['62193963', 'TERAN ROMERO MARIANA'],
  ['75364074', 'MOSTACERO NAMOC DEYVI EDWIN']
];

function get(u, redirects) {
  redirects = redirects || 0;
  return new Promise((resolve, reject) => {
    https
      .get(u, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects < 5) {
          return resolve(get(res.headers.location, redirects + 1));
        }
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(d));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

function loadSupervisorsSep11() {
  const src = fs.readFileSync(path.join(root, 'js', 'supervisors.js'), 'utf8');
  const map = {};
  const re =
    /\{\s*nombre:\s*'([^']*)',\s*dni:\s*'([^']*)',\s*lic:\s*'([^']*)',\s*fecha:\s*'2026-09-11'\s*\}/g;
  let m;
  while ((m = re.exec(src))) {
    const lic = String(m[3] || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' ');
    map[lic] = m[1];
  }
  return map;
}

function normLic(g) {
  return String(g || '')
    .trim()
    .toUpperCase()
    .replace(/^GRUPO\s+/i, '')
    .replace(/\s+/g, ' ');
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

(async () => {
  let j;
  if (fs.existsSync(packPath)) {
    j = JSON.parse(fs.readFileSync(packPath, 'utf8'));
    console.log('Usando cache local', (j.data || []).length);
  } else {
    console.log('Descargando API viernes…');
    j = await get(API);
    fs.writeFileSync(
      packPath,
      JSON.stringify({ hoy: j.hoy, count: (j.data || []).length, data: j.data || [] })
    );
    console.log('API ok', (j.data || []).length);
  }

  const supMap = loadSupervisorsSep11();
  console.log('Supervisores 11-09:', Object.keys(supMap).length);

  const byCi = new Map();
  for (const r of j.data || []) {
    const ci = String(r.ci || '').replace(/\D/g, '');
    if (!ci) continue;
    const cur = byCi.get(ci);
    if (!cur) byCi.set(ci, Object.assign({}, r, { c: Number(r.c) || 0 }));
    else cur.c += Number(r.c) || 0;
  }

  const rows = [
    ['CI', 'Nombre lista', 'Nombre en sistema', 'Grupo LIC', 'Supervisor', 'Jarras', 'Fecha']
  ];
  let found = 0;
  const missing = [];
  for (const [ci, nom] of wanted) {
    const r = byCi.get(ci);
    if (r) {
      found++;
      const nombre = [r.apellido, r.nombre].filter(Boolean).join(' ').trim() || nom;
      const lic = normLic(r.grupo);
      const supervisor = supMap[lic] || '';
      rows.push([ci, nom, nombre, lic || String(r.grupo || ''), supervisor, Number(r.c) || 0, '11-09-2026']);
    } else {
      missing.push(ci + ' ' + nom);
      rows.push([ci, nom, 'NO ENCONTRADO', '', '', '', '11-09-2026']);
    }
  }

  let sheetBody = '';
  rows.forEach((row, ri) => {
    const r = ri + 1;
    let cells = '';
    row.forEach((val, ci) => {
      const ref = xlsxCol(ci) + r;
      if (typeof val === 'number' && Number.isFinite(val)) {
        cells += '<c r="' + ref + '"><v>' + val + '</v></c>';
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
    '<sheets><sheet name="Jarras 11-09" sheetId="1" r:id="rId1"/></sheets></workbook>';
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

  const out = path.join(root, 'QBerries_jarras_lista_11-09-2026_con_supervisor.xlsx');
  fs.writeFileSync(out, bytes);
  const totalJarras = rows.slice(1).reduce((s, r) => s + (Number(r[5]) || 0), 0);
  console.log('Excel:', out);
  console.log('Encontrados:', found, '/', wanted.length, '· Total jarras:', totalJarras);
  if (missing.length) console.log('No encontrados:\n' + missing.join('\n'));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
