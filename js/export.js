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
        r.nombreCompleto ||
        [r.nombre, r.apellido].filter(Boolean).join(' ').trim() ||
        'Sin nombre';
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

    const shareText = [
      '*Q Berries · Reporte de equipo*',
      'LIC: ' + licLabel,
      'Supervisor: ' + jefeLabel,
      'Fecha: ' + fechaLabel,
      'Personas: ' + people.length + ' · Jarras: ' + fmtN(totalJarras),
      '',
      'Solo autorizado para la empresa'
    ].join('\n');

    const shareTitle = 'LIC ' + licLabel + ' · ' + jefeLabel;

    try {
      const blob = doc.output('blob');
      const file = new File([blob], filename, { type: 'application/pdf' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          files: [file]
        });
        this.toast('Elige WhatsApp para enviar');
        return;
      }
    } catch (err) {
      if (err && err.name === 'AbortError') {
        this.toast('Compartir cancelado', 'warn');
        return;
      }
    }

    // Fallback: descarga + abre WhatsApp con texto LIC + supervisor
    doc.save(filename);
    const waUrl = 'https://wa.me/?text=' + encodeURIComponent(shareText + '\n\n📎 Adjunta el PDF: ' + filename);
    try {
      window.open(waUrl, '_blank', 'noopener');
    } catch (_) {}
    this.toast('PDF descargado · abre WhatsApp y adjunta el archivo');
  }
};
