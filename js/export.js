/* Exportar gráficos como imagen / reporte PDF */
window.QB = window.QB || {};

QB.export = {
  toast(msg, type = 'ok') {
    const host = document.getElementById('toastHost');
    if (!host) return;
    const el = document.createElement('div');
    el.className = `toast is-${type}`;
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  },

  _pdfCtor() {
    const { jsPDF } = window.jspdf || {};
    return jsPDF || window.jsPDF || null;
  },

  /** Pie fijo en todas las páginas */
  _stampConfidential(doc) {
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setDrawColor(196, 30, 38);
      doc.setLineWidth(0.35);
      doc.line(14, h - 16, w - 14, h - 16);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(90, 96, 104);
      doc.text('Solo autorizado para la empresa', w / 2, h - 10, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(130, 138, 146);
      doc.text('Q Berries · Documento interno · Confidencial', w / 2, h - 5.5, {
        align: 'center'
      });
    }
  },

  chartImage(chartId, filename) {
    const chart = QB.charts.instances[chartId];
    if (!chart) {
      this.toast('Gráfico no listo', 'warn');
      return;
    }
    const url = chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#ffffff' });
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `${chartId}.png`;
    a.click();
    this.toast('Imagen del gráfico lista');
    return url;
  },

  async shareChart(chartId, title) {
    const chart = QB.charts.instances[chartId];
    if (!chart) {
      this.toast('Gráfico no listo', 'warn');
      return;
    }
    const url = chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#ffffff' });
    try {
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], `${title || chartId}.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: title || 'Rendimientos Q Berries',
          text: 'Reporte de jarras · Q Berries Licapa',
          files: [file]
        });
        this.toast('Compartido');
        return;
      }
    } catch (_) {}
    this.chartImage(chartId, `${title || chartId}.png`);
  },

  async reportPdf(meta) {
    if (typeof window.jspdf === 'undefined' && typeof window.jsPDF === 'undefined') {
      this.toast('Cargando PDF…', 'warn');
    }
    const PDF = this._pdfCtor();
    if (!PDF) {
      this.toast('PDF no disponible', 'warn');
      return;
    }

    const doc = new PDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const w = doc.internal.pageSize.getWidth();
    let y = 14;

    doc.setFillColor(31, 138, 62);
    doc.rect(0, 0, w, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('Q Berries · Rendimientos Licapa', 14, 12);
    doc.setFontSize(10);
    doc.text(`Jarras · ${meta.fechas || ''} · ${meta.actualizado || ''}`, 14, 20);

    y = 36;
    doc.setTextColor(22, 48, 31);
    doc.setFontSize(12);
    doc.text('Resumen de jarras', 14, y);
    y += 8;
    doc.setFontSize(10);
    (meta.kpis || []).forEach((line) => {
      doc.text(line, 14, y);
      y += 6;
    });

    y += 4;
    const chartIds = [
      'chartTopLotes',
      'chartTopLic',
      'chartLiderazgo',
      'chartPeoresLic',
      'chartGauge',
      'chartDist'
    ];
    for (const id of chartIds) {
      const chart = QB.charts.instances[id];
      if (!chart) continue;
      const img = chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#ffffff' });
      if (y > 190) {
        doc.addPage();
        y = 16;
      }
      doc.setFontSize(11);
      doc.setTextColor(22, 48, 31);
      doc.text((meta.titles && meta.titles[id]) || id, 14, y);
      y += 4;
      const imgH = 70;
      doc.addImage(img, 'PNG', 14, y, w - 28, imgH);
      y += imgH + 10;
    }

    this._stampConfidential(doc);
    doc.save(`rendimientos-${(meta.fechas || 'reporte').replace(/\s+/g, '_')}.pdf`);
    this.toast('PDF generado');
  },

  /**
   * PDF formal del equipo · supervisor → trabajadores
   * meta: { grupo, grupoShort, jefe, fecha, fechaLabel, people[], syncedAt }
   */
  async grupoTeamPdf(meta) {
    const PDF = this._pdfCtor();
    if (!PDF) {
      this.toast('PDF no disponible', 'warn');
      return;
    }

    const people = [...(meta.people || [])].sort((a, b) => (b.c || 0) - (a.c || 0));
    if (!people.length) {
      this.toast('Sin trabajadores para el PDF', 'warn');
      return;
    }

    const doc = new PDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    const margin = 14;
    const usableBottom = h - 22;
    const grupoShort = meta.grupoShort || meta.grupo || 'Grupo';
    const fechaLabel = meta.fechaLabel || meta.fecha || '—';
    const jefe = meta.jefe || 'Sin jefe asignado';
    const totalJarras = people.reduce((s, r) => s + (Number(r.c) || 0), 0);
    const avg = people.length ? totalJarras / people.length : 0;
    const fmtN = (n) =>
      Number(n || 0).toLocaleString('es-PE', { maximumFractionDigits: 1 });

    const drawHeader = () => {
      doc.setFillColor(20, 53, 37);
      doc.rect(0, 0, w, 32, 'F');
      doc.setFillColor(228, 30, 38);
      doc.rect(0, 32, w, 1.2, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Q BERRIES', margin, 11);
      doc.setFontSize(15);
      doc.text('Reporte de equipo', margin, 19);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Avance de jarras · Licapa', margin, 26);

      doc.setFontSize(8);
      doc.text(fechaLabel, w - margin, 14, { align: 'right' });
      if (meta.syncedAt) {
        doc.text('Act. ' + String(meta.syncedAt), w - margin, 20, { align: 'right' });
      }
    };

    drawHeader();

    let y = 42;
    doc.setTextColor(26, 35, 48);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(grupoShort, margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(90, 96, 104);
    doc.text('Grupo: ' + String(meta.grupo || grupoShort), margin, y);
    y += 5;
    doc.text('Supervisor / jefe: ' + jefe, margin, y);
    y += 8;

    const boxW = (w - margin * 2 - 6) / 3;
    const kpis = [
      { label: 'Personas', value: String(people.length) },
      { label: 'Total jarras', value: fmtN(totalJarras) },
      { label: 'Promedio', value: fmtN(avg) }
    ];
    kpis.forEach((k, i) => {
      const x = margin + i * (boxW + 3);
      doc.setFillColor(247, 249, 248);
      doc.setDrawColor(230, 235, 232);
      doc.roundedRect(x, y, boxW, 14, 2, 2, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(107, 119, 133);
      doc.text(k.label, x + 3, y + 5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(26, 35, 48);
      doc.text(k.value, x + 3, y + 11);
    });
    y += 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(26, 35, 48);
    doc.text('Detalle de trabajadores', margin, y);
    y += 4;

    const col = {
      n: margin,
      dni: margin + 10,
      nombre: margin + 38,
      jarras: w - margin
    };

    const drawTableHead = () => {
      doc.setFillColor(31, 138, 62);
      doc.rect(margin, y, w - margin * 2, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('#', col.n + 2, y + 5.5);
      doc.text('CI', col.dni, y + 5.5);
      doc.text('Trabajador', col.nombre, y + 5.5);
      doc.text('Jarras', col.jarras - 2, y + 5.5, { align: 'right' });
      y += 8;
    };

    drawTableHead();

    people.forEach((r, i) => {
      if (y > usableBottom - 8) {
        doc.addPage();
        drawHeader();
        y = 40;
        drawTableHead();
      }
      const rowH = 7.2;
      if (i % 2 === 0) {
        doc.setFillColor(250, 251, 250);
        doc.rect(margin, y, w - margin * 2, rowH, 'F');
      }
      const name =
        (window.QB && QB.avatars && QB.avatars.realName(r)) ||
        (window.QB && QB.avatars && QB.avatars.shortName(r)) ||
        (r.ci ? 'CI ' + r.ci : 'Sin nombre');
      const nameSafe = doc.splitTextToSize(String(name), col.jarras - col.nombre - 18)[0];

      doc.setTextColor(60, 70, 80);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(String(i + 1), col.n + 2, y + 5);
      doc.text(String(r.ci || '—'), col.dni, y + 5);
      doc.setTextColor(26, 35, 48);
      doc.text(nameSafe, col.nombre, y + 5);
      doc.setFont('helvetica', 'bold');
      doc.text(fmtN(r.c), col.jarras - 2, y + 5, { align: 'right' });
      y += rowH;
    });

    y += 6;
    if (y > usableBottom - 18) {
      doc.addPage();
      drawHeader();
      y = 42;
    }
    doc.setDrawColor(31, 138, 62);
    doc.setLineWidth(0.4);
    doc.line(margin, y, w - margin, y);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(26, 35, 48);
    doc.text('Total del equipo', margin, y);
    doc.text(fmtN(totalJarras) + ' jarras', w - margin, y, { align: 'right' });
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(107, 119, 133);
    doc.text(
      'Documento para reenviar a los trabajadores del grupo. Uso interno Q Berries.',
      margin,
      y,
      { maxWidth: w - margin * 2 }
    );

    this._stampConfidential(doc);

    const safePart = (s, max) =>
      String(s || 'sin')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, max || 28) || 'sin';

    const licLabel = grupoShort;
    const jefeLabel = jefe || 'Sin_supervisor';
    const fechaSlug = String(meta.fecha || 'dia').replace(/\s+/g, '_');
    const filename =
      'LIC_' + safePart(licLabel, 20) + '_' + safePart(jefeLabel, 24) + '_' + fechaSlug + '.pdf';

    doc.save(filename);
    this.toast('PDF descargado');
  },

  /** Escapar texto para XML de hoja Excel */
  _xmlEsc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  /** Columna Excel 0-based → A, B, … AA */
  _xlsxCol(n) {
    let s = '';
    let x = n + 1;
    while (x > 0) {
      const m = (x - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      x = Math.floor((x - 1) / 26);
    }
    return s;
  },

  _crc32(bytes) {
    let table = this._crcTable;
    if (!table) {
      table = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[i] = c >>> 0;
      }
      this._crcTable = table;
    }
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) {
      crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  },

  _u16(n) {
    const b = new Uint8Array(2);
    b[0] = n & 0xff;
    b[1] = (n >>> 8) & 0xff;
    return b;
  },

  _u32(n) {
    const b = new Uint8Array(4);
    b[0] = n & 0xff;
    b[1] = (n >>> 8) & 0xff;
    b[2] = (n >>> 16) & 0xff;
    b[3] = (n >>> 24) & 0xff;
    return b;
  },

  /** ZIP sin compresión (válido para .xlsx) */
  _zipStore(files) {
    const enc = new TextEncoder();
    const parts = [];
    const central = [];
    let offset = 0;

    files.forEach((f) => {
      const nameBytes = enc.encode(f.name);
      const data = f.data instanceof Uint8Array ? f.data : enc.encode(f.data);
      const crc = this._crc32(data);
      const local = new Uint8Array(30 + nameBytes.length + data.length);
      local.set([0x50, 0x4b, 0x03, 0x04], 0);
      local.set(this._u16(20), 4);
      local.set(this._u16(0), 6);
      local.set(this._u16(0), 8);
      local.set(this._u16(0), 10);
      local.set(this._u16(0), 12);
      local.set(this._u32(crc), 14);
      local.set(this._u32(data.length), 18);
      local.set(this._u32(data.length), 22);
      local.set(this._u16(nameBytes.length), 26);
      local.set(this._u16(0), 28);
      local.set(nameBytes, 30);
      local.set(data, 30 + nameBytes.length);
      parts.push(local);

      const cen = new Uint8Array(46 + nameBytes.length);
      cen.set([0x50, 0x4b, 0x01, 0x02], 0);
      cen.set(this._u16(20), 4);
      cen.set(this._u16(20), 6);
      cen.set(this._u16(0), 8);
      cen.set(this._u16(0), 10);
      cen.set(this._u16(0), 12);
      cen.set(this._u16(0), 14);
      cen.set(this._u32(crc), 16);
      cen.set(this._u32(data.length), 20);
      cen.set(this._u32(data.length), 24);
      cen.set(this._u16(nameBytes.length), 28);
      cen.set(this._u16(0), 30);
      cen.set(this._u16(0), 32);
      cen.set(this._u16(0), 34);
      cen.set(this._u16(0), 36);
      cen.set(this._u32(0), 38);
      cen.set(this._u32(offset), 42);
      cen.set(nameBytes, 46);
      central.push(cen);
      offset += local.length;
    });

    const centralSize = central.reduce((n, c) => n + c.length, 0);
    const end = new Uint8Array(22);
    end.set([0x50, 0x4b, 0x05, 0x06], 0);
    end.set(this._u16(0), 4);
    end.set(this._u16(0), 6);
    end.set(this._u16(files.length), 8);
    end.set(this._u16(files.length), 10);
    end.set(this._u32(centralSize), 12);
    end.set(this._u32(offset), 16);
    end.set(this._u16(0), 20);

    const total = offset + centralSize + 22;
    const out = new Uint8Array(total);
    let p = 0;
    parts.forEach((chunk) => {
      out.set(chunk, p);
      p += chunk.length;
    });
    central.forEach((chunk) => {
      out.set(chunk, p);
      p += chunk.length;
    });
    out.set(end, p);
    return out;
  },

  /**
   * Genera .xlsx real (OOXML) desde filas [[...], ...]
   * Celdas string = texto (CI no pierde ceros); números = number
   */
  _xlsxFromRows(rows, sheetName) {
    const esc = (s) => this._xmlEsc(s);
    const name = String(sheetName || 'Datos').slice(0, 31) || 'Datos';
    let sheetBody = '';
    rows.forEach((row, ri) => {
      const r = ri + 1;
      let cells = '';
      (row || []).forEach((val, ci) => {
        const ref = this._xlsxCol(ci) + r;
        if (typeof val === 'number' && Number.isFinite(val)) {
          cells += `<c r="${ref}"><v>${val}</v></c>`;
        } else {
          cells += `<c r="${ref}" t="inlineStr"><is><t>${esc(val)}</t></is></c>`;
        }
      });
      sheetBody += `<row r="${r}">${cells}</row>`;
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
      '<sheets><sheet name="' +
      esc(name) +
      '" sheetId="1" r:id="rId1"/></sheets></workbook>';

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

    return this._zipStore([
      { name: '[Content_Types].xml', data: contentTypes },
      { name: '_rels/.rels', data: relsXml },
      { name: 'xl/workbook.xml', data: workbookXml },
      { name: 'xl/_rels/workbook.xml.rels', data: wbRelsXml },
      { name: 'xl/worksheets/sheet1.xml', data: sheetXml }
    ]);
  },

  _downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  },

  /**
   * Excel .xlsx · personas por umbral de jarras
   * meta: { mode: 'lt40'|'gt40', people[], fecha, fechaLabel }
   */
  excelPeopleByJarras(meta) {
    meta = meta || {};
    const mode = meta.mode === 'gt40' ? 'gt40' : 'lt40';
    const people = [...(meta.people || [])].sort((a, b) => (b.c || 0) - (a.c || 0));
    if (!people.length) {
      this.toast('Sin personas para este Excel', 'warn');
      return;
    }

    const shortGrupo = (g) => String(g || '—').replace(/^Grupo\s+/i, '') || '—';
    const jefeDe = (g, fecha) => {
      if (!QB.supervisors) return '';
      return QB.supervisors.fullLabel(g, fecha) || QB.supervisors.label(g, fecha) || '';
    };
    const nombreDe = (r) =>
      (QB.avatars && QB.avatars.realName(r)) ||
      (QB.avatars && QB.avatars.shortName(r)) ||
      r.ci ||
      '—';

    const rows = [['CI', 'Nombre', 'Grupo LIC', 'Supervisor', 'Jarras', 'Fecha']];
    people.forEach((r) => {
      rows.push([
        String(r.ci || ''),
        nombreDe(r),
        shortGrupo(r.grupo),
        jefeDe(r.grupo, meta.fecha),
        Number(r.c || 0),
        meta.fechaLabel || meta.fecha || ''
      ]);
    });

    const bytes = this._xlsxFromRows(rows, mode === 'gt40' ? 'Mas de 40' : 'Menos de 40');
    const blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const fechaSlug = String(meta.fecha || 'dia').replace(/\s+/g, '_');
    const tag = mode === 'gt40' ? 'mas_de_40' : 'menos_de_40';
    const filename = 'QBerries_' + tag + '_jarras_' + fechaSlug + '.xlsx';

    this._downloadBlob(blob, filename);
    this.toast(
      'Excel descargado · ' +
        people.length +
        ' personas · ' +
        (mode === 'gt40' ? 'más de 40' : 'menos de 40')
    );
  },

  /**
   * Excel comparación multi-hoja · menos de 40 jarras
   * meta: { days[], people[], fechas[] }
   */
  excelCompareLt40Matrix(meta) {
    meta = meta || {};
    const days = meta.days || [];
    const people = [...(meta.people || [])];
    if (!people.length || !days.length) {
      this.toast('Sin datos para exportar', 'warn');
      return;
    }

    const header = [
      'CI',
      'Nombre',
      'Grupo LIC',
      'Supervisor',
      ...days.map((d) => (d.short || d.label || d.fecha) + ' · jarras'),
      'Promedio',
      'Condición'
    ];
    const rows = [header];

    people.forEach((p) => {
      rows.push([
        String(p.ci || ''),
        p.nombre || '',
        p.grupo || '',
        p.supervisor && p.supervisor !== '—' ? p.supervisor : p.supervisorShort || '',
        ...days.map((d, i) => {
          const v = p.values[i];
          return v == null ? '' : Number(v) || 0;
        }),
        Number(p.promedio) || 0,
        p.condicion || ''
      ]);
    });

    const bytes = this._xlsxFromRows(rows, 'Comparacion menos 40');
    const blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const slug = days
      .map((d) => String(d.short || d.fecha || '').replace(/\//g, '-'))
      .join('_');
    const filename = 'QBerries_comparacion_menos_40_' + slug + '.xlsx';
    this._downloadBlob(blob, filename);
    this.toast('Excel descargado · ' + people.length + ' personas · ' + days.length + ' hojas');
  }
};
