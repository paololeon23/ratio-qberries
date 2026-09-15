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
      if (!meta || !meta.returnBlob) this.toast('PDF no disponible', 'warn');
      return null;
    }

    const people = [...(meta.people || [])].sort((a, b) => (b.c || 0) - (a.c || 0));
    if (!people.length) {
      if (!meta || !meta.returnBlob) this.toast('Sin trabajadores para el PDF', 'warn');
      return null;
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

    const filename = this._grupoPdfFilename(grupoShort, jefe, meta.fecha);

    if (meta.returnBlob) {
      const ab = doc.output('arraybuffer');
      return {
        blob: new Blob([ab], { type: 'application/pdf' }),
        filename,
        bytes: new Uint8Array(ab)
      };
    }

    doc.save(filename);
    this.toast('PDF descargado');
    return null;
  },

  _safeFilePart(s, max) {
    return (
      String(s || 'sin')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, max || 28) || 'sin'
    );
  },

  _grupoPdfFilename(grupoShort, jefe, fecha) {
    const fechaSlug = String(fecha || 'dia').replace(/\s+/g, '_');
    return (
      'LIC_' +
      this._safeFilePart(grupoShort || 'Grupo', 20) +
      '_' +
      this._safeFilePart(jefe || 'Sin_supervisor', 24) +
      '_' +
      fechaSlug +
      '.pdf'
    );
  },

  /**
   * Todos los reportes LIC en un ZIP · cada PDF: LIC + nombre supervisor
   * metas: [{ grupo, grupoShort, jefe, fecha, fechaLabel, people[], syncedAt }, ...]
   */
  async allGrupoTeamPdfsZip(metas) {
    if (!this._pdfCtor()) {
      this.toast('PDF no disponible', 'warn');
      return;
    }
    const list = (metas || []).filter((m) => m && (m.people || []).length);
    if (!list.length) {
      this.toast('Sin grupos para exportar', 'warn');
      return;
    }

    this.toast('Generando ' + list.length + ' reportes PDF…', 'ok');
    const files = [];
    const usedNames = {};
    for (let i = 0; i < list.length; i++) {
      const built = await this.grupoTeamPdf(Object.assign({}, list[i], { returnBlob: true }));
      if (!built || !built.bytes) continue;
      let name = built.filename;
      if (usedNames[name]) {
        const n = usedNames[name] + 1;
        usedNames[name] = n;
        name = name.replace(/\.pdf$/i, '_' + n + '.pdf');
      } else {
        usedNames[name] = 1;
      }
      files.push({ name: name, data: built.bytes });
    }

    if (!files.length) {
      this.toast('No se pudo generar ningún PDF', 'warn');
      return;
    }

    const zipBytes = this._zipStore(files);
    const fechaSlug = String((list[0] && list[0].fecha) || 'dia').replace(/\s+/g, '_');
    const zipName =
      'Reportes_LIC_' + this._safeFilePart(fechaSlug, 24) + '_' + files.length + '_grupos.zip';
    this._downloadBlob(new Blob([zipBytes], { type: 'application/zip' }), zipName);
    this.toast('ZIP listo · ' + files.length + ' reportes PDF', 'ok');
  },

  /**
   * Un solo PDF · todos los supervisores · Kg/Export + Jarras Descarte + TOTAL
   * Todo en UNA sola hoja A4
   */
  async resumenSupervisoresPdf(metas) {
    const PDF = this._pdfCtor();
    if (!PDF) {
      this.toast('PDF no disponible', 'warn');
      return;
    }
    const sorted = this._sortMetasByLic(
      (metas || []).filter((m) => m && (m.totalJr > 0 || (m.people || []).length))
    );
    if (!sorted.length) {
      this.toast('Sin supervisores para el PDF', 'warn');
      return;
    }

    const fmtI = (n) => Number(n || 0).toLocaleString('es-PE', { maximumFractionDigits: 0 });
    let totKg = 0;
    let totDesc = 0;
    sorted.forEach((m) => {
      totKg += Number(m.totalKgExportables) || 0;
      totDesc += Number(m.descarte != null ? m.descarte : m.deshidratado) || 0;
    });

    const fechaLabel = (sorted[0] && (sorted[0].fechaLabel || sorted[0].fecha)) || '—';
    const fechaSlug = String((sorted[0] && sorted[0].fecha) || 'dia').replace(/\s+/g, '_');

    const doc = new PDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    const margin = 10;
    const headerH = 22;
    const titleH = 6;
    const headH = 6;
    const totalH = 7;
    const footNoteH = 8;
    const bottomPad = 14;
    const tableTop = margin + headerH + 2 + titleH;
    const tableW = w - margin * 2;
    const n = sorted.length;
    const availRows = h - tableTop - headH - totalH - footNoteH - bottomPad;
    const rowH = Math.max(4.2, Math.min(6.4, availRows / Math.max(n, 1)));
    const fontSize = rowH >= 5.8 ? 8 : rowH >= 5 ? 7.2 : 6.5;

    const col = {
      lic: margin,
      licW: 18,
      sup: margin + 18,
      kgW: 32,
      deshW: 34
    };
    col.supW = tableW - col.licW - col.kgW - col.deshW;
    col.kg = margin + col.licW + col.supW;
    col.desh = col.kg + col.kgW;

    /* Cabecera compacta */
    doc.setFillColor(20, 53, 37);
    doc.rect(0, 0, w, headerH, 'F');
    doc.setFillColor(228, 30, 38);
    doc.rect(0, headerH, w, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Q BERRIES', margin, 8);
    doc.setFontSize(12);
    doc.text('Resumen supervisores · Kg/Export + Descarte', margin, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(fechaLabel, w - margin, 14, { align: 'right' });

    let y = margin + headerH + 3;
    doc.setTextColor(26, 35, 48);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(n + ' supervisores · una hoja', margin, y);
    y += titleH - 1;

    /* Encabezado tabla */
    doc.setFillColor(180, 35, 24);
    doc.rect(margin, y, tableW, headH, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    const hy = y + headH / 2 + 1.2;
    doc.text('LIC', col.lic + 1.5, hy);
    doc.text('Supervisor', col.sup + 1, hy);
    doc.text('Kg/Export.', col.kg + col.kgW - 1.5, hy, { align: 'right' });
    doc.text('Jarras Descarte', col.desh + col.deshW - 1.5, hy, { align: 'right' });
    y += headH;

    sorted.forEach((meta, i) => {
      if (i % 2 === 0) {
        doc.setFillColor(250, 252, 251);
        doc.rect(margin, y, tableW, rowH, 'F');
      }
      const descarte = Number(meta.descarte != null ? meta.descarte : meta.deshidratado) || 0;
      const totalKg = Number(meta.totalKgExportables) || 0;
      const lic = meta.grupoShort || meta.grupo || '—';
      const supName = this._supervisorShortName(meta);
      const supSafe = doc.splitTextToSize(String(supName), col.supW - 3)[0];
      const ty = y + rowH / 2 + 1.1;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fontSize);
      doc.setTextColor(26, 35, 48);
      doc.text(String(lic), col.lic + 1.5, ty);
      doc.setFont('helvetica', 'normal');
      doc.text(supSafe, col.sup + 1, ty);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(20, 53, 37);
      doc.text(fmtI(totalKg), col.kg + col.kgW - 1.5, ty, { align: 'right' });
      doc.setTextColor(122, 58, 15);
      doc.text(fmtI(descarte), col.desh + col.deshW - 1.5, ty, { align: 'right' });
      y += rowH;
    });

    /* TOTAL — misma hoja */
    doc.setFillColor(238, 244, 240);
    doc.setDrawColor(138, 154, 144);
    doc.setLineWidth(0.35);
    doc.rect(margin, y, tableW, totalH, 'FD');
    const tyTot = y + totalH / 2 + 1.2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.max(fontSize, 7.5));
    doc.setTextColor(15, 28, 20);
    doc.text('TOTAL', col.lic + 1.5, tyTot);
    doc.text('Suma · ' + n + ' supervisores', col.sup + 1, tyTot);
    doc.setTextColor(20, 53, 37);
    doc.text(fmtI(totKg), col.kg + col.kgW - 1.5, tyTot, { align: 'right' });
    doc.setTextColor(122, 58, 15);
    doc.text(fmtI(totDesc), col.desh + col.deshW - 1.5, tyTot, { align: 'right' });
    y += totalH + 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(107, 119, 133);
    doc.text(
      'Documento de uso interno · Q Berries · Licapa. Solo es data de la empresa.',
      margin,
      y
    );

    this._stampConfidential(doc);

    const filename =
      'Resumen_Supervisores_KgExport_Descarte_' + this._safeFilePart(fechaSlug, 16) + '.pdf';
    doc.save(filename);
    this.toast('PDF listo · 1 hoja · ' + n + ' supervisores + TOTAL', 'ok');
  },

  /**
   * Comparativa 2 fechas · por LIC · Kg/Export, Descarte, Total, Ratio + Δ
   * Una sola hoja A4 horizontal
   */
  async comparacionFechasPdf(model) {
    const PDF = this._pdfCtor();
    if (!PDF) {
      this.toast('PDF no disponible', 'warn');
      return;
    }
    const days = (model && model.days) || [];
    const rows = (model && model.rows) || [];
    if (days.length < 2 || !rows.length) {
      this.toast('Se necesitan 2 fechas con data para comparar', 'warn');
      return;
    }

    const d0 = days[0];
    const d1 = days[1];
    const fmtI = (n) => Number(n || 0).toLocaleString('es-PE', { maximumFractionDigits: 0 });
    const fmtR = (n) =>
      Number(n || 0).toLocaleString('es-PE', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
    const fmtDelta = (n) => {
      const v = Number(n) || 0;
      if (v > 0) return '+' + fmtI(v);
      return fmtI(v);
    };

    const totals = model.totals || {
      kg0: 0,
      desc0: 0,
      tot0: 0,
      kg1: 0,
      desc1: 0,
      tot1: 0,
      deltaDesc: 0
    };

    const doc = new PDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    const margin = 8;
    const headerH = 20;
    const headH = 10;
    const totalH = 6.5;
    const footNoteH = 6;
    const bottomPad = 10;
    const tableTop = margin + headerH + 4;
    const tableW = w - margin * 2;
    const n = rows.length;
    const availRows = h - tableTop - headH - totalH - footNoteH - bottomPad;
    const rowH = Math.max(3.8, Math.min(5.6, availRows / Math.max(n, 1)));
    const fontSize = rowH >= 5.2 ? 7 : rowH >= 4.5 ? 6.4 : 5.8;

    /* Columnas al estilo cuadro · por día + comparación */
    const cols = [
      { key: 'lic', label: 'LIC', w: 14 },
      { key: 'sup', label: 'Supervisor', w: 42 },
      { key: 'kg0', label: 'Kg/Exp.\n' + (d0.corta || ''), w: 18 },
      { key: 'desc0', label: 'Descarte\n' + (d0.corta || ''), w: 18 },
      { key: 'tot0', label: 'Total\n' + (d0.corta || ''), w: 18 },
      { key: 'ratio0', label: 'Ratio\n' + (d0.corta || ''), w: 14 },
      { key: 'kg1', label: 'Kg/Exp.\n' + (d1.corta || ''), w: 18 },
      { key: 'desc1', label: 'Descarte\n' + (d1.corta || ''), w: 18 },
      { key: 'tot1', label: 'Total\n' + (d1.corta || ''), w: 18 },
      { key: 'ratio1', label: 'Ratio\n' + (d1.corta || ''), w: 14 },
      { key: 'delta', label: 'Δ Desc.', w: 16 }
    ];
    const sumW = cols.reduce((s, c) => s + c.w, 0);
    const scaleX = tableW / sumW;
    cols.forEach((c) => {
      c.w = c.w * scaleX;
    });

    doc.setFillColor(20, 53, 37);
    doc.rect(0, 0, w, headerH, 'F');
    doc.setFillColor(228, 30, 38);
    doc.rect(0, headerH, w, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Q BERRIES', margin, 7);
    doc.setFontSize(12);
    doc.text('Comparación de fechas · Kg/Export · Descarte · Total · Ratio', margin, 14.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text((d0.corta || '') + '  vs  ' + (d1.corta || ''), w - margin, 12, { align: 'right' });

    let y = margin + headerH + 2;
    doc.setTextColor(26, 35, 48);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(n + ' supervisores · una hoja · Δ = descarte día 2 − día 1', margin, y);
    y += 3;

    doc.setFillColor(180, 35, 24);
    doc.rect(margin, y, tableW, headH, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.8);
    let x = margin;
    cols.forEach((col) => {
      const lines = String(col.label).split('\n');
      const start = y + (lines.length > 1 ? 3.2 : headH / 2 + 1);
      lines.forEach((ln, li) => {
        doc.text(ln, x + col.w / 2, start + li * 3.2, { align: 'center' });
      });
      x += col.w;
    });
    y += headH;

    const clip = (text, maxW) => {
      const t = String(text || '—');
      try {
        if (typeof doc.getTextWidth === 'function' && doc.getTextWidth(t) <= maxW) return t;
        if (typeof doc.getTextWidth === 'function') {
          let s = t;
          while (s.length > 1 && doc.getTextWidth(s + '…') > maxW) s = s.slice(0, -1);
          return s + '…';
        }
      } catch (e) {
        /* ignore */
      }
      return t.length > 28 ? t.slice(0, 27) + '…' : t;
    };

    rows.forEach((row, i) => {
      if (i % 2 === 0) {
        doc.setFillColor(250, 252, 251);
        doc.rect(margin, y, tableW, rowH, 'F');
      }
      const ty = y + rowH / 2 + 1;
      let cx = margin;
      const vals = {
        lic: row.lic,
        sup: row.nombre,
        kg0: fmtI(row.kg0),
        desc0: fmtI(row.desc0),
        tot0: fmtI(row.tot0),
        ratio0: fmtR(row.ratio0),
        kg1: fmtI(row.kg1),
        desc1: fmtI(row.desc1),
        tot1: fmtI(row.tot1),
        ratio1: fmtR(row.ratio1),
        delta: fmtDelta(row.deltaDesc)
      };
      cols.forEach((col) => {
        const isSup = col.key === 'sup';
        const isDelta = col.key === 'delta';
        const isDesc = col.key === 'desc0' || col.key === 'desc1';
        const isTot = col.key === 'tot0' || col.key === 'tot1';
        doc.setFont('helvetica', isSup ? 'normal' : 'bold');
        doc.setFontSize(fontSize);
        if (isDelta) {
          const dlt = Number(row.deltaDesc) || 0;
          if (dlt > 0) doc.setTextColor(180, 35, 24);
          else if (dlt < 0) doc.setTextColor(31, 107, 53);
          else doc.setTextColor(26, 35, 48);
        } else if (isDesc) {
          doc.setTextColor(122, 58, 15);
        } else if (isTot) {
          doc.setTextColor(20, 53, 37);
        } else {
          doc.setTextColor(26, 35, 48);
        }
        const align = isSup || col.key === 'lic' ? (col.key === 'lic' ? 'center' : 'left') : 'right';
        const tx =
          align === 'left' ? cx + 1.2 : align === 'right' ? cx + col.w - 1.2 : cx + col.w / 2;
        doc.text(clip(vals[col.key], col.w - 2), tx, ty, { align: align });
        cx += col.w;
      });
      y += rowH;
    });

    doc.setFillColor(238, 244, 240);
    doc.setDrawColor(138, 154, 144);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, tableW, totalH, 'FD');
    const tyTot = y + totalH / 2 + 1;
    let cx = margin;
    const totVals = {
      lic: 'TOTAL',
      sup: 'Suma · ' + n,
      kg0: fmtI(totals.kg0),
      desc0: fmtI(totals.desc0),
      tot0: fmtI(totals.tot0),
      ratio0: '—',
      kg1: fmtI(totals.kg1),
      desc1: fmtI(totals.desc1),
      tot1: fmtI(totals.tot1),
      ratio1: '—',
      delta: fmtDelta(totals.deltaDesc)
    };
    cols.forEach((col) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(Math.max(fontSize, 6.2));
      const isDelta = col.key === 'delta';
      const isDesc = col.key === 'desc0' || col.key === 'desc1';
      if (isDelta) {
        const dlt = Number(totals.deltaDesc) || 0;
        if (dlt > 0) doc.setTextColor(180, 35, 24);
        else if (dlt < 0) doc.setTextColor(31, 107, 53);
        else doc.setTextColor(15, 28, 20);
      } else if (isDesc) {
        doc.setTextColor(122, 58, 15);
      } else {
        doc.setTextColor(15, 28, 20);
      }
      const align = col.key === 'sup' ? 'left' : col.key === 'lic' ? 'center' : 'right';
      const tx = align === 'left' ? cx + 1.2 : align === 'right' ? cx + col.w - 1.2 : cx + col.w / 2;
      doc.text(String(totVals[col.key]), tx, tyTot, { align: align });
      cx += col.w;
    });
    y += totalH + 3;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(107, 119, 133);
    doc.text(
      'Uso interno Q Berries · Licapa. Ratio = Total jarras ÷ Total Jr. Solo es data de la empresa.',
      margin,
      y
    );

    this._stampConfidential(doc);

    const filename =
      'Comparacion_' +
      this._safeFilePart(d0.corta || d0.fecha, 10) +
      '_vs_' +
      this._safeFilePart(d1.corta || d1.fecha, 10) +
      '.pdf';
    doc.save(filename);
    this.toast('PDF comparativo · 1 hoja · ' + n + ' supervisores', 'ok');
  },

  _grupoImgFilename(grupoShort, jefe, fecha) {
    const fechaSlug = String(fecha || 'dia').replace(/\s+/g, '_');
    return (
      'LIC_' +
      this._safeFilePart(grupoShort || 'Grupo', 20) +
      '_' +
      this._safeFilePart(jefe || 'Sin_supervisor', 24) +
      '_' +
      fechaSlug +
      '.png'
    );
  },

  /** Dibuja tarjeta PNG de un LIC · todas las personas en 2 columnas */
  async _buildGrupoTeamPng(meta) {
    const people = [...(meta.people || [])].sort((a, b) => (b.c || 0) - (a.c || 0));
    if (!people.length) return null;

    const grupoShort = meta.grupoShort || meta.grupo || 'Grupo';
    const jefe = meta.jefe || 'Sin jefe asignado';
    const fechaLabel = meta.fechaLabel || meta.fecha || '—';
    const totalJarras = people.reduce((s, r) => s + (Number(r.c) || 0), 0);
    const avg = people.length ? totalJarras / people.length : 0;
    const fmtN = (n) =>
      Number(n || 0).toLocaleString('es-PE', { maximumFractionDigits: 1 });

    const scale = 2;
    const W = 1040;
    const pad = 40;
    const gap = 20;
    const colW = (W - pad * 2 - gap) / 2;
    const rowH = 30;
    const headerH = 118;
    const kpiH = 86;
    const listHead = 34;
    const footH = 88;
    const mid = Math.ceil(people.length / 2);
    const leftCol = people.slice(0, mid);
    const rightCol = people.slice(mid);
    const rows = Math.max(leftCol.length, rightCol.length);
    /* Espacio extra arriba/abajo/lados para que nada choque ni se corte */
    const H = headerH + 32 + kpiH + listHead + rows * rowH + footH + 28;

    const canvas = document.createElement('canvas');
    canvas.width = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.scale(scale, scale);

    function roundRect(c, x, yy, w, h, r) {
      const rr = Math.min(r, w / 2, h / 2);
      c.beginPath();
      c.moveTo(x + rr, yy);
      c.arcTo(x + w, yy, x + w, yy + h, rr);
      c.arcTo(x + w, yy + h, x, yy + h, rr);
      c.arcTo(x, yy + h, x, yy, rr);
      c.arcTo(x, yy, x + w, yy, rr);
      c.closePath();
    }

    function clipText(c, text, maxW) {
      if (c.measureText(text).width <= maxW) return text;
      let t = text;
      while (t.length > 1 && c.measureText(t + '…').width > maxW) t = t.slice(0, -1);
      return t + '…';
    }

    function personName(r) {
      return (
        (window.QB && QB.avatars && (QB.avatars.realName(r) || QB.avatars.shortName(r))) ||
        (r.ci ? 'CI ' + r.ci : 'Sin nombre')
      );
    }

    function drawColHead(x, yy) {
      ctx.fillStyle = '#1f8a3e';
      ctx.fillRect(x, yy, colW, 26);
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 11px Helvetica, Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('#', x + 8, yy + 17);
      ctx.fillText('CI', x + 32, yy + 17);
      ctx.fillText('Trabajador', x + 108, yy + 17);
      ctx.textAlign = 'right';
      ctx.fillText('Jarras', x + colW - 8, yy + 17);
      ctx.textAlign = 'left';
    }

    function drawPersonRow(r, rank, x, yy, stripe) {
      if (stripe) {
        ctx.fillStyle = '#fafbfa';
        ctx.fillRect(x, yy, colW, rowH);
      }
      const name = clipText(ctx, String(personName(r)), colW - 200);
      ctx.fillStyle = '#3c4650';
      ctx.font = '500 11px Helvetica, Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(String(rank), x + 8, yy + 19);
      ctx.fillText(String(r.ci || '—'), x + 32, yy + 19);
      ctx.fillStyle = '#0f1c14';
      ctx.font = '600 11px Helvetica, Arial, sans-serif';
      ctx.fillText(name, x + 108, yy + 19);
      ctx.textAlign = 'right';
      ctx.font = '800 11px Helvetica, Arial, sans-serif';
      ctx.fillText(fmtN(r.c), x + colW - 8, yy + 19);
      ctx.textAlign = 'left';
    }

    /* Fondo */
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    /* Header verde */
    ctx.fillStyle = '#143525';
    ctx.fillRect(0, 0, W, headerH - 6);
    ctx.fillStyle = '#e41e26';
    ctx.fillRect(0, headerH - 6, W, 4);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 13px Helvetica, Arial, sans-serif';
    ctx.fillText('Q BERRIES', pad, 32);
    ctx.font = '800 24px Helvetica, Arial, sans-serif';
    ctx.fillText('Reporte de equipo', pad, 60);
    ctx.font = '500 13px Helvetica, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText('Avance de jarras · Licapa · ' + people.length + ' personas', pad, 84);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 12px Helvetica, Arial, sans-serif';
    ctx.fillText(fechaLabel, W - pad, 36);
    if (meta.syncedAt) {
      ctx.font = '500 11px Helvetica, Arial, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillText('Act. ' + String(meta.syncedAt), W - pad, 54);
    }
    ctx.textAlign = 'left';

    /* Título LIC + jefe */
    let y = headerH + 30;
    ctx.fillStyle = '#0f1c14';
    ctx.font = '800 22px Helvetica, Arial, sans-serif';
    ctx.fillText(grupoShort, pad, y);
    y += 22;
    ctx.fillStyle = '#5a6b60';
    ctx.font = '500 13px Helvetica, Arial, sans-serif';
    ctx.fillText('Supervisor / jefe: ' + jefe, pad, y);
    y += 10;

    /* KPI boxes */
    const boxW = (W - pad * 2 - 20) / 3;
    const kpis = [
      { label: 'Personas', value: String(people.length) },
      { label: 'Total jarras', value: fmtN(totalJarras) },
      { label: 'Promedio', value: fmtN(avg) }
    ];
    kpis.forEach((k, i) => {
      const x = pad + i * (boxW + 10);
      const by = y + 10;
      ctx.fillStyle = '#f4f7f5';
      ctx.strokeStyle = '#e2ebe4';
      ctx.lineWidth = 1;
      roundRect(ctx, x, by, boxW, 52, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#6b7785';
      ctx.font = '600 11px Helvetica, Arial, sans-serif';
      ctx.fillText(k.label, x + 14, by + 18);
      ctx.fillStyle = '#0f1c14';
      ctx.font = '800 18px Helvetica, Arial, sans-serif';
      ctx.fillText(k.value, x + 14, by + 40);
    });
    y += kpiH;

    /* 2 columnas · todas las personas */
    const xL = pad;
    const xR = pad + colW + gap;
    drawColHead(xL, y);
    drawColHead(xR, y);
    y += 28;

    for (let i = 0; i < rows; i++) {
      if (leftCol[i]) drawPersonRow(leftCol[i], i + 1, xL, y, i % 2 === 0);
      if (rightCol[i]) drawPersonRow(rightCol[i], mid + i + 1, xR, y, i % 2 === 0);
      y += rowH;
    }

    y += 20;
    ctx.strokeStyle = '#1f8a3e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(W - pad, y);
    ctx.stroke();
    y += 26;
    ctx.fillStyle = '#0f1c14';
    ctx.font = '800 14px Helvetica, Arial, sans-serif';
    ctx.fillText('Total del equipo · ' + people.length + ' personas', pad, y);
    ctx.textAlign = 'right';
    ctx.fillText(fmtN(totalJarras) + ' jarras', W - pad, y);
    ctx.textAlign = 'left';
    y += 22;
    ctx.fillStyle = '#6b7785';
    ctx.font = '500 11px Helvetica, Arial, sans-serif';
    ctx.fillText('Uso interno Q Berries · Solo autorizado para la empresa', pad, y);

    const filename = this._grupoImgFilename(grupoShort, jefe, meta.fecha);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return null;
    const buf = await blob.arrayBuffer();
    return { blob, filename, bytes: new Uint8Array(buf) };
  },

  /**
   * Todas las imágenes LIC en un ZIP · una PNG por grupo (LIC + supervisor)
   */
  async allGrupoTeamPngsZip(metas) {
    const list = (metas || []).filter((m) => m && (m.people || []).length);
    if (!list.length) {
      this.toast('Sin grupos para exportar', 'warn');
      return;
    }

    this.toast('Generando ' + list.length + ' imágenes…', 'ok');
    const files = [];
    const usedNames = {};
    for (let i = 0; i < list.length; i++) {
      const built = await this._buildGrupoTeamPng(list[i]);
      if (!built || !built.bytes) continue;
      let name = built.filename;
      if (usedNames[name]) {
        const n = usedNames[name] + 1;
        usedNames[name] = n;
        name = name.replace(/\.png$/i, '_' + n + '.png');
      } else {
        usedNames[name] = 1;
      }
      files.push({ name: name, data: built.bytes });
    }

    if (!files.length) {
      this.toast('No se pudo generar ninguna imagen', 'warn');
      return;
    }

    const zipBytes = this._zipStore(files);
    const fechaSlug = String((list[0] && list[0].fecha) || 'dia').replace(/\s+/g, '_');
    const zipName =
      'Imagenes_LIC_' + this._safeFilePart(fechaSlug, 24) + '_' + files.length + '_grupos.zip';
    this._downloadBlob(new Blob([zipBytes], { type: 'application/zip' }), zipName);
    this.toast('ZIP listo · ' + files.length + ' imágenes PNG', 'ok');
  },

  _cuadroImgFilename(grupoShort, jefe, fecha) {
    return (
      'Cuadro_' +
      this._safeFilePart(grupoShort || 'Grupo', 20) +
      '_' +
      this._safeFilePart(jefe || 'Sin_supervisor', 24) +
      '_' +
      this._safeFilePart(String(fecha || 'dia').replace(/\s+/g, '_'), 16) +
      '.png'
    );
  },

  _licNum(grupoShort) {
    const m = String(grupoShort || '').match(/\d+/);
    return m ? parseInt(m[0], 10) : 9999;
  },

  _sortMetasByLic(metas) {
    return (metas || []).slice().sort((a, b) => this._licNum(a.grupoShort) - this._licNum(b.grupoShort));
  },

  _supervisorShortName(meta) {
    const sup = meta.supervisor || meta.jefe || '';
    const lines = String(sup)
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    return lines.length ? lines[lines.length - 1] : '—';
  },

  /** Tabla consolidada · todos los supervisores en pocas imágenes */
  async _buildResumenSupervisoresPng(allMetas, pageIndex, rowsPerPage) {
    const sorted = this._sortMetasByLic(allMetas);
    if (!sorted.length) return null;

    const perPage = rowsPerPage || 15;
    const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
    const page = Math.max(0, Math.min(pageIndex, totalPages - 1));
    const rows = sorted.slice(page * perPage, (page + 1) * perPage);
    const isLastPage = page >= totalPages - 1;

    let totKg = 0;
    let totDesc = 0;
    sorted.forEach((m) => {
      totKg += Number(m.totalKgExportables) || 0;
      totDesc += Number(m.descarte != null ? m.descarte : m.deshidratado) || 0;
    });

    const fmtI = (n) => Number(n || 0).toLocaleString('es-PE', { maximumFractionDigits: 0 });
    const fechaHeader = (sorted[0] && (sorted[0].fechaLabel || sorted[0].fecha)) || '—';
    const fechaSlug = String((sorted[0] && sorted[0].fecha) || 'dia').replace(/\s+/g, '_');

    const scale = 2;
    const margin = 28;
    const inner = 24;
    const headerH = 84;
    const gapHeaderTable = 18;
    const headH = 44;
    const rowH = 30;
    const totalRowH = isLastPage ? 40 : 0;
    const gapTableFoot = 18;
    const footH = 62;

    /* Solo 2 columnas de cifras + identificación · suma abajo */
    const cols = [
      { key: 'lic', label: 'LIC', w: 64, text: 'center' },
      { key: 'sup', label: 'Supervisor', w: 300, text: 'left' },
      { key: 'kg', label: 'Kg / Export.', w: 130, text: 'center' },
      { key: 'desh', label: 'Jarras Descarte', w: 130, text: 'center' }
    ];
    const tableW = cols.reduce((s, c) => s + c.w, 0);
    const cardW = tableW + inner * 2;
    const W = cardW + margin * 2;
    const innerW = tableW;
    const tableBodyH = headH + rows.length * rowH + totalRowH;
    const H =
      margin * 2 + inner + headerH + gapHeaderTable + tableBodyH + gapTableFoot + footH + inner;

    const canvas = document.createElement('canvas');
    canvas.width = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.scale(scale, scale);

    function roundRect(c, x, yy, w, h, r) {
      const rr = Math.min(r, w / 2, h / 2);
      c.beginPath();
      c.moveTo(x + rr, yy);
      c.arcTo(x + w, yy, x + w, yy + h, rr);
      c.arcTo(x + w, yy + h, x, yy + h, rr);
      c.arcTo(x, yy + h, x, yy, rr);
      c.arcTo(x, yy, x + w, yy, rr);
      c.closePath();
    }

    function clipText(c, text, maxW) {
      const t = String(text || '—');
      if (c.measureText(t).width <= maxW) return t;
      let s = t;
      while (s.length > 1 && c.measureText(s + '…').width > maxW) s = s.slice(0, -1);
      return s + '…';
    }

    ctx.fillStyle = '#e8ede9';
    ctx.fillRect(0, 0, W, H);

    const cardX = margin;
    const cardY = margin;
    const cardH = H - margin * 2;
    roundRect(ctx, cardX, cardY, cardW, cardH, 14);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#c5d4ca';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const hx = cardX + inner;
    const hxRight = cardX + cardW - inner;
    let y = cardY + inner;

    roundRect(ctx, hx, y, innerW, headerH, 10);
    ctx.fillStyle = '#143525';
    ctx.fill();
    ctx.fillStyle = '#e41e26';
    ctx.fillRect(hx, y + headerH - 3, innerW, 3);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 11px Helvetica, Arial, sans-serif';
    ctx.fillText('Q BERRIES', hx + 16, y + 28);
    ctx.font = '800 20px Helvetica, Arial, sans-serif';
    const title =
      'Kg/Export + Descarte · pág. ' + (page + 1) + '/' + totalPages;
    ctx.fillText(title, hx + 16, y + 56);
    ctx.textAlign = 'right';
    ctx.font = '600 12px Helvetica, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillText(fechaHeader, hxRight - 18, y + 56);
    ctx.textAlign = 'left';

    y += headerH + gapHeaderTable;
    const tableX = hx;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(tableX, y, tableW, tableBodyH);
    ctx.strokeStyle = '#8a9a90';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(tableX, y, tableW, tableBodyH);

    ctx.fillStyle = '#b42318';
    ctx.fillRect(tableX + 1, y + 1, tableW - 2, headH - 1);

    let cx = tableX;
    cols.forEach((col, i) => {
      if (i > 0) {
        ctx.beginPath();
        ctx.moveTo(cx, y);
        ctx.lineTo(cx, y + tableBodyH);
        ctx.strokeStyle = i === 0 ? '#ffffff' : '#d5e0d8';
        ctx.lineWidth = 1;
        ctx.globalAlpha = i === 0 ? 0.35 : 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 10px Helvetica, Arial, sans-serif';
      ctx.textAlign = 'center';
      const lines = col.label.split('\n');
      const startY = y + (lines.length > 1 ? 16 : headH / 2 + 4);
      lines.forEach((ln, li) => {
        const ty = lines.length > 1 ? startY + li * 13 : y + headH / 2 + 4;
        ctx.fillText(clipText(ctx, ln, col.w - 10), cx + col.w / 2, ty);
      });
      cx += col.w;
    });

    function drawRow(rowY, h, values, opts) {
      const zebra = opts && opts.zebra;
      const bold = opts && opts.bold;
      if (zebra) {
        ctx.fillStyle = '#fafcfb';
        ctx.fillRect(tableX + 1, rowY + 1, tableW - 2, h - 1);
      }
      let x = tableX;
      cols.forEach((col, i) => {
        if (i > 0) {
          ctx.beginPath();
          ctx.moveTo(x, rowY);
          ctx.lineTo(x, rowY + h);
          ctx.strokeStyle = '#d5e0d8';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.fillStyle =
          bold && col.key === 'kg'
            ? '#143525'
            : bold && col.key === 'desh'
              ? '#7a3a0f'
              : bold
                ? '#0f1c14'
                : col.key === 'kg'
                  ? '#143525'
                  : col.key === 'desh'
                    ? '#7a3a0f'
                    : '#1f2a30';
        ctx.font =
          (bold || col.key === 'kg' || col.key === 'desh' || col.key === 'lic'
            ? '700 12px'
            : '500 11px') + ' Helvetica, Arial, sans-serif';
        ctx.textAlign = col.text;
        ctx.textBaseline = 'middle';
        const tx =
          col.text === 'left' ? x + 8 : col.text === 'right' ? x + col.w - 8 : x + col.w / 2;
        ctx.fillText(clipText(ctx, values[col.key], col.w - 12), tx, rowY + h / 2);
        x += col.w;
      });
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
    }

    let dataY = y + headH;
    rows.forEach((meta, ri) => {
      const descarte = Number(meta.descarte != null ? meta.descarte : meta.deshidratado) || 0;
      const totalKg = Number(meta.totalKgExportables) || 0;
      drawRow(
        dataY,
        rowH,
        {
          lic: meta.grupoShort || meta.grupo || '—',
          sup: this._supervisorShortName(meta),
          kg: fmtI(totalKg),
          desh: fmtI(descarte)
        },
        { zebra: ri % 2 === 0 }
      );
      dataY += rowH;
    });

    if (isLastPage) {
      ctx.beginPath();
      ctx.moveTo(tableX, dataY);
      ctx.lineTo(tableX + tableW, dataY);
      ctx.strokeStyle = '#8a9a90';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = '#eef4f0';
      ctx.fillRect(tableX + 1, dataY + 1, tableW - 2, totalRowH - 1);
      drawRow(
        dataY,
        totalRowH,
        {
          lic: 'TOTAL',
          sup: 'Suma · ' + sorted.length + ' supervisores',
          kg: fmtI(totKg),
          desh: fmtI(totDesc)
        },
        { bold: true }
      );
      dataY += totalRowH;
    }

    ctx.beginPath();
    ctx.moveTo(tableX, y + headH);
    ctx.lineTo(tableX + tableW, y + headH);
    ctx.strokeStyle = '#8a9a90';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    y += tableBodyH + gapTableFoot;
    roundRect(ctx, tableX, y, tableW, footH, 8);
    ctx.fillStyle = '#f4f7f5';
    ctx.fill();
    ctx.strokeStyle = '#cfdcd4';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#4a5c52';
    ctx.font = '600 11px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Documento de uso interno · Q Berries · Licapa', tableX + tableW / 2, y + 24);
    ctx.fillStyle = '#7a3a0f';
    ctx.font = '700 10px Helvetica, Arial, sans-serif';
    ctx.fillText(
      'Solo es data de la empresa. No compartir fuera de la empresa.',
      tableX + tableW / 2,
      y + 42
    );
    ctx.textAlign = 'left';

    const filename =
      'Resumen_Todos_Supervisores_' +
      this._safeFilePart(fechaSlug, 16) +
      '_p' +
      (page + 1) +
      '.png';
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return null;
    const buf = await blob.arrayBuffer();
    return { blob, filename, bytes: new Uint8Array(buf) };
  },

  /** Cuadro resumen LIC · tabla horizontal estilo reporte */
  async _buildGrupoCuadroPng(meta) {
    if (!meta) return null;

    const grupoShort = meta.grupoShort || meta.grupo || 'Grupo';
    const supervisor = meta.supervisor || meta.jefe || 'Sin supervisor';
    const supervisorGeneral = meta.supervisorGeneral || supervisor;
    const fechaRaw = meta.fecha || meta.fechaLabel || '';
    const fechaHeader = meta.fechaLabel || fechaRaw || '—';
    const fechaTabla = meta.fechaCorta || (() => {
      const m = String(meta.fecha || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return m[3] + '/' + m[2] + '/' + m[1].slice(2);
      return '—';
    })();
    const lotesList = Array.isArray(meta.lotesList)
      ? meta.lotesList.filter(Boolean)
      : String(meta.lotes || '')
          .split(/\s*·\s*|\s*-\s*(?=L\d)/)
          .map((s) => s.trim())
          .filter(Boolean);
    const lotesDisplay = lotesList.length ? lotesList.join('\n') : '—';
    const totalJr = Number(meta.totalJr) || 0;
    const totalKg = Number(meta.totalKgExportables) || 0;
    const deshidratado = Number(meta.descarte != null ? meta.descarte : meta.deshidratado) || 0;
    const totalJarras = totalKg + deshidratado;
    const ratio = totalJr ? totalJarras / totalJr : 0;
    const fmtN = (n) => Number(n || 0).toLocaleString('es-PE', { maximumFractionDigits: 2 });
    const fmtI = (n) => Number(n || 0).toLocaleString('es-PE', { maximumFractionDigits: 0 });

    const scale = 2;
    const margin = 28;
    const inner = 24;
    const headerH = 84;
    const gapHeaderTable = 22;
    const headH = 52;
    const lotesLines = Math.max(1, lotesList.length || 1);
    const supLines = Math.max(3, String(supervisor).split('\n').length);
    const supGenLines = Math.max(2, String(supervisorGeneral).split('\n').length);
    const dataLines = Math.max(supLines, supGenLines, lotesLines, 3);
    const lineH = 15;
    const rowH = Math.max(90, 22 + dataLines * lineH);
    const gapTableFoot = 20;
    const footH = 62;

    const cols = [
      { key: 'fecha', label: 'Fecha', w: 84, align: 'center', text: 'center', kind: 'date' },
      { key: 'supGen', label: 'Supervisor\nGeneral', w: 208, align: 'left', text: 'left', kind: 'person' },
      { key: 'sup', label: 'Supervisor', w: 208, align: 'left', text: 'left', kind: 'person' },
      { key: 'jr', label: 'Total\nJr', w: 72, align: 'center', text: 'center', kind: 'num' },
      { key: 'kg', label: 'Kg/\nExport.', w: 96, align: 'center', text: 'center', kind: 'num' },
      { key: 'desh', label: 'Jarras\nDescarte', w: 96, align: 'center', text: 'center', kind: 'num' },
      { key: 'tot', label: 'Total\nJarras', w: 96, align: 'center', text: 'center', kind: 'num' },
      { key: 'ratio', label: 'Ratio', w: 76, align: 'center', text: 'center', kind: 'num' },
      { key: 'lotes', label: 'Lotes\nCosechados', w: 168, align: 'left', text: 'left', kind: 'lotes' }
    ];
    const tableW = cols.reduce((s, c) => s + c.w, 0);
    const cardW = tableW + inner * 2;
    const W = cardW + margin * 2;
    const innerW = tableW;
    const H = margin * 2 + inner + headerH + gapHeaderTable + headH + rowH + gapTableFoot + footH + inner;

    const values = {
      fecha: fechaTabla,
      supGen: supervisorGeneral,
      sup: supervisor,
      jr: fmtI(totalJr),
      kg: fmtI(totalKg),
      desh: fmtI(deshidratado),
      tot: fmtI(totalJarras),
      ratio: fmtN(ratio),
      lotes: lotesDisplay
    };

    const canvas = document.createElement('canvas');
    canvas.width = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.scale(scale, scale);

    function roundRect(c, x, yy, w, h, r) {
      const rr = Math.min(r, w / 2, h / 2);
      c.beginPath();
      c.moveTo(x + rr, yy);
      c.arcTo(x + w, yy, x + w, yy + h, rr);
      c.arcTo(x + w, yy + h, x, yy + h, rr);
      c.arcTo(x, yy + h, x, yy, rr);
      c.arcTo(x, yy, x + w, yy, rr);
      c.closePath();
    }

    function clipText(c, text, maxW) {
      const t = String(text || '—');
      if (c.measureText(t).width <= maxW) return t;
      let s = t;
      while (s.length > 1 && c.measureText(s + '…').width > maxW) s = s.slice(0, -1);
      return s + '…';
    }

    function wrapLines(c, text, maxW, maxLines) {
      const raw = String(text || '—').trim();
      if (raw.includes('\n')) {
        return raw
          .split('\n')
          .map((ln) => clipText(c, ln.trim(), maxW))
          .filter(Boolean)
          .slice(0, maxLines);
      }
      const words = raw.split(/\s+/);
      const lines = [];
      let line = '';
      for (let i = 0; i < words.length; i++) {
        const test = line ? line + ' ' + words[i] : words[i];
        if (c.measureText(test).width <= maxW) {
          line = test;
        } else {
          if (line) lines.push(line);
          line = words[i];
          if (lines.length >= maxLines - 1) {
            const rest = words.slice(i + 1).join(' ');
            line = clipText(c, line + (rest ? ' ' + rest : ''), maxW);
            break;
          }
        }
      }
      if (line) lines.push(line);
      return lines.slice(0, maxLines);
    }

    function drawCellText(c, text, x, y, w, h, opts) {
      const padX = opts.padX || 8;
      const align = opts.align || 'center';
      const maxLines = opts.maxLines || 3;
      const lh = opts.lineH || 15;
      const font = opts.font || '500 11px Helvetica, Arial, sans-serif';
      const boldFirst = opts.boldFirst || false;
      c.font = font;
      c.textBaseline = 'middle';
      const maxW = w - padX * 2;
      const lines = wrapLines(c, text, maxW, maxLines);
      const blockH = lines.length * lh;
      let ty = y + (h - blockH) / 2 + lh / 2;
      lines.forEach((ln, i) => {
        if (boldFirst && i === 0) {
          c.font = '700 ' + font.replace(/^[\d\w]+\s+/, '');
        } else {
          c.font = font;
        }
        c.textAlign = align;
        const tx =
          align === 'left' ? x + padX : align === 'right' ? x + w - padX : x + w / 2;
        c.fillText(ln, tx, ty);
        ty += lh;
      });
      c.textBaseline = 'alphabetic';
      c.textAlign = 'left';
    }

    /* Fondo */
    ctx.fillStyle = '#e8ede9';
    ctx.fillRect(0, 0, W, H);

    const cardX = margin;
    const cardY = margin;
    const cardH = H - margin * 2;
    roundRect(ctx, cardX, cardY, cardW, cardH, 14);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#c5d4ca';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const hx = cardX + inner;
    const hxRight = cardX + cardW - inner;
    let y = cardY + inner;

    /* Cabecera marca — bloque separado */
    roundRect(ctx, hx, y, innerW, headerH, 10);
    ctx.fillStyle = '#143525';
    ctx.fill();
    ctx.fillStyle = '#e41e26';
    ctx.fillRect(hx, y + headerH - 3, innerW, 3);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 11px Helvetica, Arial, sans-serif';
    ctx.fillText('Q BERRIES', hx + 16, y + 28);
    ctx.font = '800 21px Helvetica, Arial, sans-serif';
    ctx.fillText('Resumen LIC · ' + grupoShort, hx + 16, y + 56);
    ctx.textAlign = 'right';
    ctx.font = '600 12px Helvetica, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillText(fechaHeader, hxRight - 18, y + 56);
    ctx.textAlign = 'left';

    /* Espacio blanco antes de la tabla */
    y += headerH + gapHeaderTable;

    const tableX = hx;
    const tableH = headH + rowH;

    /* Marco de tabla (cuadro formal) */
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(tableX, y, tableW, tableH);
    ctx.strokeStyle = '#8a9a90';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(tableX, y, tableW, tableH);

    /* Fila encabezado roja */
    ctx.fillStyle = '#b42318';
    ctx.fillRect(tableX + 1, y + 1, tableW - 2, headH - 1);

    let cx = tableX;
    cols.forEach((col, i) => {
      if (i > 0) {
        ctx.beginPath();
        ctx.moveTo(cx, y);
        ctx.lineTo(cx, y + tableH);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.35;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 10px Helvetica, Arial, sans-serif';
      ctx.textAlign = 'center';
      const lines = col.label.split('\n');
      const startY = y + (lines.length > 1 ? 19 : headH / 2 + 4);
      lines.forEach((ln, li) => {
        const ty = lines.length > 1 ? startY + li * 13 : y + headH / 2 + 4;
        ctx.fillText(clipText(ctx, ln, col.w - 12), cx + col.w / 2, ty);
      });
      cx += col.w;
    });

    /* Fila de datos */
    const dataY = y + headH;
    ctx.fillStyle = '#fafcfb';
    ctx.fillRect(tableX + 1, dataY + 1, tableW - 2, rowH - 1);

    cx = tableX;
    cols.forEach((col, i) => {
      if (i > 0) {
        ctx.beginPath();
        ctx.moveTo(cx, dataY);
        ctx.lineTo(cx, dataY + rowH);
        ctx.strokeStyle = '#d5e0d8';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      const kind = col.kind || 'text';
      const isNum = kind === 'num';
      ctx.fillStyle = col.key === 'tot' ? '#143525' : col.key === 'desh' ? '#7a3a0f' : '#1f2a30';
      drawCellText(ctx, values[col.key], cx, dataY, col.w, rowH, {
        align: col.text,
        padX: col.text === 'left' ? 8 : 6,
        maxLines:
          kind === 'lotes'
            ? Math.max(2, lotesLines)
            : kind === 'person'
              ? Math.max(3, dataLines)
              : kind === 'date'
                ? 1
                : 2,
        lineH: lineH,
        boldFirst: kind === 'person',
        font: (isNum ? '700 12px' : '500 11px') + ' Helvetica, Arial, sans-serif'
      });
      cx += col.w;
    });

    /* Línea entre encabezado y datos */
    ctx.beginPath();
    ctx.moveTo(tableX, dataY);
    ctx.lineTo(tableX + tableW, dataY);
    ctx.strokeStyle = '#8a9a90';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    /* Pie confidencial */
    y += tableH + gapTableFoot;
    roundRect(ctx, tableX, y, tableW, footH, 8);
    ctx.fillStyle = '#f4f7f5';
    ctx.fill();
    ctx.strokeStyle = '#cfdcd4';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#4a5c52';
    ctx.font = '600 11px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Documento de uso interno · Q Berries · Licapa', tableX + tableW / 2, y + 24);
    ctx.fillStyle = '#7a3a0f';
    ctx.font = '700 10px Helvetica, Arial, sans-serif';
    ctx.fillText(
      'Solo es data de la empresa. No compartir fuera de la empresa.',
      tableX + tableW / 2,
      y + 42
    );
    ctx.textAlign = 'left';

    const filename = this._cuadroImgFilename(grupoShort, supervisor, meta.fecha);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return null;
    const buf = await blob.arrayBuffer();
    return { blob, filename, bytes: new Uint8Array(buf) };
  },

  async allGrupoCuadrosPngsZip(metas) {
    const list = (metas || []).filter((m) => m && (m.totalJr > 0 || (m.people || []).length));
    if (!list.length) {
      this.toast('Sin grupos para exportar', 'warn');
      return;
    }

    const perPage = 15;
    const resumenPages = Math.max(1, Math.ceil(list.length / perPage));
    this.toast(
      'Generando ' + resumenPages + ' resumen(es) + ' + list.length + ' cuadros…',
      'ok'
    );
    const files = [];
    const usedNames = {};

    for (let p = 0; p < resumenPages; p++) {
      const builtRes = await this._buildResumenSupervisoresPng(list, p, perPage);
      if (!builtRes || !builtRes.bytes) continue;
      let name = builtRes.filename;
      if (usedNames[name]) {
        const n = usedNames[name] + 1;
        usedNames[name] = n;
        name = name.replace(/\.png$/i, '_' + n + '.png');
      } else {
        usedNames[name] = 1;
      }
      files.push({ name: name, data: builtRes.bytes });
    }

    for (let i = 0; i < list.length; i++) {
      const built = await this._buildGrupoCuadroPng(list[i]);
      if (!built || !built.bytes) continue;
      let name = built.filename;
      if (usedNames[name]) {
        const n = usedNames[name] + 1;
        usedNames[name] = n;
        name = name.replace(/\.png$/i, '_' + n + '.png');
      } else {
        usedNames[name] = 1;
      }
      files.push({ name: name, data: built.bytes });
    }

    if (!files.length) {
      this.toast('No se pudo generar ningún cuadro', 'warn');
      return;
    }

    const zipBytes = this._zipStore(files);
    const fechaSlug = String((list[0] && list[0].fecha) || 'dia').replace(/\s+/g, '_');
    const zipName =
      'Cuadros_LIC_' + this._safeFilePart(fechaSlug, 24) + '_' + files.length + '_grupos.zip';
    this._downloadBlob(new Blob([zipBytes], { type: 'application/zip' }), zipName);
    this.toast(
      'ZIP listo · ' + resumenPages + ' resumen + ' + (files.length - resumenPages) + ' cuadros PNG',
      'ok'
    );
  },

  /** Escapar texto para XML de hoja Excel */
  _xmlEsc(s) {
    return String(s == null ? '' : s)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
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
   * lt40 = menos de 30 jarras · gt40 = 58 o más jarras
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

    const bytes = this._xlsxFromRows(rows, mode === 'gt40' ? '58 o mas' : 'menos de 30');
    const blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const fechaSlug = String(meta.fecha || 'dia').replace(/\s+/g, '_');
    const tag = mode === 'gt40' ? '58_o_mas' : 'menos_de_34';
    const filename = 'QBerries_' + tag + '_jarras_' + fechaSlug + '.xlsx';

    this._downloadBlob(blob, filename);
    this.toast(
      'Excel descargado · ' +
        people.length +
        ' personas · ' +
        (mode === 'gt40' ? '58 o más' : 'menos de 30')
    );
  },

  /**
   * Excel comparación multi-hoja · menos de 30 jarras
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
      'Días <30'
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
        Number(p.ltDays) || 0
      ]);
    });

    const bytes = this._xlsxFromRows(rows, 'Comparacion menos 30');
    const blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const slug = days
      .map((d) => String(d.short || d.fecha || '').replace(/\//g, '-'))
      .join('_');
    const filename = 'QBerries_comparacion_menos_30_' + slug + '.xlsx';
    this._downloadBlob(blob, filename);
    this.toast('Excel descargado · ' + people.length + ' personas · ' + days.length + ' hojas');
  },

  _ratioBinLabel(c) {
    const n = Number(c) || 0;
    if (n <= 0) return '—';
    if (n <= 30) return '≤30';
    if (n <= 40) return '31-40';
    if (n <= 50) return '41-50';
    if (n <= 60) return '51-60';
    if (n <= 70) return '61-70';
    return '>70';
  },

  _ratioBinLabelDetail(c) {
    const n = Number(c) || 0;
    if (n <= 70) return this._ratioBinLabel(n);
    if (n <= 80) return '71-80';
    if (n <= 90) return '81-90';
    if (n <= 100) return '91-100';
    return '>100';
  },

  /**
   * PNG del gráfico de ratios + leyenda de fechas filtradas
   * meta: { chartId, fechaLabels: string[], title?: string, fileTag?: string }
   */
  async ratioChartImage(meta) {
    meta = meta || {};
    const chartId = meta.chartId || 'chartDist';
    const chart = QB.charts && QB.charts.instances && QB.charts.instances[chartId];
    if (!chart) {
      this.toast('Gráfico no listo', 'warn');
      return;
    }

    const labels = (meta.fechaLabels || []).filter(Boolean);
    const legendTitle =
      meta.title ||
      (chartId === 'chartDistGt70'
        ? 'Q Berries · Más de 70 jarras'
        : 'Q Berries · Ratios Cosecha / Diario');
    const fileTag =
      meta.fileTag ||
      (chartId === 'chartDistGt70' ? 'mas_de_70' : 'ratios_cosecha');

    /* Sin animación: si se captura al inicio, las barras salen en 0 (imagen vacía) */
    try {
      chart.resize();
      chart.setOption(
        {
          animation: false,
          animationDuration: 0,
          animationDurationUpdate: 0
        },
        false
      );
    } catch (_) {}

    await new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setTimeout(resolve, 80));
      });
    });

    const chartUrl = chart.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#ffffff'
    });

    /* Reactivar animación suave para la UI */
    try {
      chart.setOption(
        {
          animation: true,
          animationDuration: 650,
          animationDurationUpdate: 400
        },
        false
      );
    } catch (_) {}

    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('img'));
      el.src = chartUrl;
    }).catch(() => null);

    if (!img) {
      this.toast('No se pudo generar la imagen', 'warn');
      return;
    }

    const scale = 2;
    const padX = 28;
    const padTop = 22;
    const chartW = img.width;
    const chartH = img.height;
    const gapChartFooter = 22;
    const footerPadY = 22;
    const footerH = labels.length > 3 ? 136 : 118;
    const W = Math.max(chartW / scale, 720);
    const chartDrawW = W - padX * 2;
    const chartDrawH = (chartH / chartW) * chartDrawW;
    const H = padTop + chartDrawH + gapChartFooter + footerH + 12;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(W * scale);
    canvas.height = Math.round(H * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      this.toast('No se pudo generar la imagen', 'warn');
      return;
    }
    ctx.scale(scale, scale);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    ctx.drawImage(img, padX, padTop, chartDrawW, chartDrawH);

    const footY = padTop + chartDrawH + gapChartFooter;
    const footBoxH = footerH;
    ctx.fillStyle = '#f4f8f5';
    ctx.fillRect(padX, footY, chartDrawW, footBoxH);

    ctx.fillStyle = chartId === 'chartDistGt70' ? '#e41e26' : '#2f9e44';
    ctx.fillRect(padX, footY, 5, footBoxH);

    const textX = padX + 22;
    let ty = footY + footerPadY + 16;

    ctx.fillStyle = '#143525';
    ctx.font = '700 16px "IBM Plex Sans", "Segoe UI", sans-serif';
    ctx.fillText(legendTitle, textX, ty);

    ty += 28;
    ctx.fillStyle = '#5b6b63';
    ctx.font = '600 13px "IBM Plex Sans", "Segoe UI", sans-serif';
    ctx.fillText('Fecha filtrada', textX, ty);

    ty += 28;
    const fechaLine =
      labels.length === 0
        ? 'Sin fecha'
        : labels.join(' / ');

    ctx.fillStyle = '#14532d';
    ctx.font = '800 15px "IBM Plex Sans", "Segoe UI", sans-serif';
    const maxFechaW = chartDrawW - 44;
    let fechaDraw = fechaLine;
    if (ctx.measureText(fechaDraw).width > maxFechaW) {
      /* Si no caben en una línea, partir en dos renglones */
      const parts = labels.slice();
      let line1 = '';
      let line2 = '';
      for (let i = 0; i < parts.length; i++) {
        const next = (line1 ? line1 + ' / ' : '') + parts[i];
        if (!line2 && ctx.measureText(next).width <= maxFechaW) {
          line1 = next;
        } else {
          line2 = (line2 ? line2 + ' / ' : '') + parts[i];
        }
      }
      ctx.fillText(line1 || fechaDraw, textX, ty);
      if (line2) {
        let l2 = line2;
        if (ctx.measureText(l2).width > maxFechaW) {
          while (l2.length > 8 && ctx.measureText(l2 + '…').width > maxFechaW) l2 = l2.slice(0, -1);
          l2 += '…';
        }
        ctx.fillText(l2, textX, ty + 22);
      }
    } else {
      ctx.fillText(fechaDraw, textX, ty);
    }

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) {
      this.toast('No se pudo generar la imagen', 'warn');
      return;
    }

    const slug =
      labels.length === 1
        ? String(labels[0] || 'dia')
            .replace(/[^\w\-]+/g, '_')
            .replace(/_+/g, '_')
            .slice(0, 48)
        : labels.length + '_fechas';
    const filename = 'QBerries_' + fileTag + '_' + (slug || 'dia') + '.png';
    this._downloadBlob(blob, filename);
    this.toast(
      'Imagen lista · ' + (labels.length === 1 ? labels[0] : labels.length + ' fechas')
    );
  },

  /**
   * Excel · ratios cosecha / diario según fechas filtradas
   * meta: { people: [{ci,c,grupo,fecha,fechaLabel}], fechas: string[] }
   */
  excelRatioDist(meta) {
    meta = meta || {};
    const people = [...(meta.people || [])]
      .filter((r) => Number(r.c || 0) > 0)
      .sort((a, b) => {
      const ka = String(a.fechaSort || a.fecha || '');
      const kb = String(b.fechaSort || b.fecha || '');
      if (ka !== kb) return ka.localeCompare(kb);
      return (Number(b.c) || 0) - (Number(a.c) || 0);
    });
    if (!people.length) {
      this.toast('Sin personas para este Excel', 'warn');
      return;
    }

    const shortGrupo = (g) => String(g || '—').replace(/^Grupo\s+/i, '') || '—';
    const jefeDe = (g, fecha) => {
      if (!QB.supervisors) return '';
      return QB.supervisors.fullLabel(g, fecha) || QB.supervisors.label(g, fecha) || '';
    };
    const nombreDe = (r) => {
      let full =
        (QB.avatars && QB.avatars.realName(r)) ||
        String(r.nombreCompleto || '').trim() ||
        '';
      if (!full && QB.workers && typeof QB.workers.get === 'function') {
        const w = QB.workers.get(r.ci);
        if (w && w.nombreCompleto) full = String(w.nombreCompleto).trim();
      }
      if (!full) {
        const ape = String(r.apellido || '').trim();
        const nom = String(r.nombre || '').trim();
        full = [ape, nom].filter(Boolean).join(' ').trim();
      }
      return full || String(r.ci || '—');
    };

    const rows = [['CI', 'Nombre completo', 'Grupo LIC', 'Supervisor', 'Jarras', 'Rango', 'Fecha']];
    people.forEach((r) => {
      const c = Number(r.c || 0);
      rows.push([
        String(r.ci || ''),
        nombreDe(r),
        shortGrupo(r.grupo),
        jefeDe(r.grupo, r.fecha || meta.fecha),
        c,
        this._ratioBinLabel(c),
        r.fechaLabel || r.fecha || meta.fechaLabel || ''
      ]);
    });

    const fechas = meta.fechas || [];
    const nFechas = fechas.length || [...new Set(people.map((p) => p.fecha).filter(Boolean))].length || 1;
    const bytes = this._xlsxFromRows(rows, 'Ratios cosecha');
    const blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const slug =
      nFechas === 1
        ? String(fechas[0] || people[0].fecha || 'dia').replace(/\s+/g, '_')
        : nFechas + '_fechas';
    const filename = 'QBerries_ratios_cosecha_' + slug + '.xlsx';

    this._downloadBlob(blob, filename);
    this.toast(
      'Excel descargado · ' +
        people.length +
        (nFechas > 1 ? ' registros · ' + nFechas + ' fechas' : ' personas')
    );
  },

  /**
   * Excel · solo personas con más de 70 jarras (mismas fechas filtradas)
   */
  excelRatioGt70(meta) {
    meta = meta || {};
    const people = [...(meta.people || [])]
      .filter((r) => Number(r.c || 0) > 70)
      .sort((a, b) => {
        const ka = String(a.fechaSort || a.fecha || '');
        const kb = String(b.fechaSort || b.fecha || '');
        if (ka !== kb) return ka.localeCompare(kb);
        return (Number(b.c) || 0) - (Number(a.c) || 0);
      });
    if (!people.length) {
      this.toast('Sin personas con más de 70 jarras', 'warn');
      return;
    }

    const shortGrupo = (g) => String(g || '—').replace(/^Grupo\s+/i, '') || '—';
    const jefeDe = (g, fecha) => {
      if (!QB.supervisors) return '';
      return QB.supervisors.fullLabel(g, fecha) || QB.supervisors.label(g, fecha) || '';
    };
    const nombreDe = (r) => {
      let full =
        (QB.avatars && QB.avatars.realName(r)) ||
        String(r.nombreCompleto || '').trim() ||
        '';
      if (!full && QB.workers && typeof QB.workers.get === 'function') {
        const w = QB.workers.get(r.ci);
        if (w && w.nombreCompleto) full = String(w.nombreCompleto).trim();
      }
      if (!full) {
        const ape = String(r.apellido || '').trim();
        const nom = String(r.nombre || '').trim();
        full = [ape, nom].filter(Boolean).join(' ').trim();
      }
      return full || String(r.ci || '—');
    };

    const rows = [['CI', 'Nombre completo', 'Grupo LIC', 'Supervisor', 'Jarras', 'Rango', 'Fecha']];
    people.forEach((r) => {
      const c = Number(r.c || 0);
      rows.push([
        String(r.ci || ''),
        nombreDe(r),
        shortGrupo(r.grupo),
        jefeDe(r.grupo, r.fecha || meta.fecha),
        c,
        this._ratioBinLabelDetail(c),
        r.fechaLabel || r.fecha || meta.fechaLabel || ''
      ]);
    });

    const fechas = meta.fechas || [];
    const nFechas = fechas.length || [...new Set(people.map((p) => p.fecha).filter(Boolean))].length || 1;
    const bytes = this._xlsxFromRows(rows, 'Mas de 70');
    const blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const slug =
      nFechas === 1
        ? String(fechas[0] || people[0].fecha || 'dia').replace(/\s+/g, '_')
        : nFechas + '_fechas';
    const filename = 'QBerries_ratios_mas_de_70_' + slug + '.xlsx';

    this._downloadBlob(blob, filename);
    this.toast(
      'Excel >70 · ' +
        people.length +
        (nFechas > 1 ? ' registros · ' + nFechas + ' fechas' : ' personas') +
        (meta.detail ? ' · ' + meta.detail : '')
    );
  }
};
