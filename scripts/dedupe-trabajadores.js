const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'data', 'trabajadores.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

function parseFecha(s) {
  const m = String(s || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return Date.UTC(+m[3], +m[2] - 1, +m[1]);
}

const byDni = new Map();
const noDni = [];
data.forEach((r, i) => {
  const dni = String(r.dni || '')
    .replace(/\D/g, '')
    .trim();
  if (!dni) {
    noDni.push({ i, r });
    return;
  }
  if (!byDni.has(dni)) byDni.set(dni, []);
  byDni.get(dni).push({ i, ...r, dni });
});

const dups = [...byDni.entries()].filter(([, arr]) => arr.length > 1);
console.log('total', data.length);
console.log('unique dni', byDni.size);
console.log('sin dni', noDni.length);
console.log('dnis duplicados', dups.length);
console.log(
  'registros extra',
  dups.reduce((s, [, a]) => s + a.length - 1, 0)
);

dups.slice(0, 10).forEach(([dni, arr]) => {
  console.log('---', dni, 'x' + arr.length);
  arr.forEach((x) =>
    console.log(' ', x.fechaIngreso, '|', x.cargo, '|', String(x.nombre || '').slice(0, 45))
  );
});

/* Keep oldest fechaIngreso per DNI; if tie, first occurrence in file.
   Also keep entries without DNI as-is (if any). */
const chosen = new Map(); // dni -> record
for (const [dni, arr] of byDni) {
  arr.sort((a, b) => {
    const ta = parseFecha(a.fechaIngreso);
    const tb = parseFecha(b.fechaIngreso);
    if (ta == null && tb == null) return a.i - b.i;
    if (ta == null) return 1;
    if (tb == null) return -1;
    if (ta !== tb) return ta - tb;
    return a.i - b.i;
  });
  const best = arr[0];
  chosen.set(dni, {
    dni: best.dni,
    nombre: best.nombre,
    cargo: best.cargo,
    fechaIngreso: best.fechaIngreso
  });
}

/* Preserve roughly original order: first appearance of each DNI in file,
   but with the oldest record's fields. Append any DNI that somehow wasn't
   in original order (shouldn't happen). */
const seen = new Set();
const out = [];
for (const r of data) {
  const dni = String(r.dni || '')
    .replace(/\D/g, '')
    .trim();
  if (!dni) {
    out.push(r);
    continue;
  }
  if (seen.has(dni)) continue;
  seen.add(dni);
  out.push(chosen.get(dni));
}

fs.writeFileSync(file, JSON.stringify(out, null, 4) + '\n', 'utf8');
console.log('escrito', out.length, '(-' + (data.length - out.length) + ')');
