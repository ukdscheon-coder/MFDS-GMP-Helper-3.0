// Text-based PDF with embedded Korean font (NanumGothic, OFL) via jsPDF + autotable.
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cellText, type Block } from '../report';

let fontB64: Promise<string> | null = null;
function loadFont(): Promise<string> {
  if (!fontB64) {
    const urls = ['NanumGothic.ttf', '/NanumGothic.ttf'];
    fontB64 = (async () => {
      for (const u of urls) {
        try { const r = await fetch(u); if (r.ok && (r.headers.get('content-type') || '').indexOf('html') < 0) return await r.arrayBuffer(); } catch { /* try next */ }
      }
      throw new Error('Korean font could not be loaded for PDF');
    })()
      .then((buf) => {
        const bytes = new Uint8Array(buf);
        let s = '';
        for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        return btoa(s);
      });
  }
  return fontB64;
}

export async function toPdf(blocks: Block[]): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.addFileToVFS('NanumGothic.ttf', await loadFont());
  doc.addFont('NanumGothic.ttf', 'Nanum', 'normal');
  doc.addFont('NanumGothic.ttf', 'Nanum', 'bold'); // same face; headers use size/shade for emphasis
  doc.setFont('Nanum', 'normal');
  const M = 14;
  const W = 210 - M * 2;
  let y = 16;
  const ensure = (h: number) => { if (y + h > 285) { doc.addPage(); y = 16; } };

  for (const b of blocks) {
    if (b.t === 'title') {
      doc.setFontSize(16); doc.text(b.text, 105, y, { align: 'center' }); y += 7;
      if (b.sub) { doc.setFontSize(9); doc.text(doc.splitTextToSize(b.sub, W), 105, y, { align: 'center' }); y += 8; }
    } else if (b.t === 'h') {
      ensure(14);
      doc.setFontSize(11.5); doc.text(b.text, M, y + 4); y += 6;
      doc.setLineWidth(0.4); doc.line(M, y, M + W, y); y += 3;
    } else if (b.t === 'p') {
      doc.setFontSize(b.small ? 8 : 9.5);
      const lines = doc.splitTextToSize(b.text, W);
      ensure(lines.length * 4.2); doc.text(lines, M, y + 3); y += lines.length * 4.2 + 2;
    } else if (b.t === 'break') {
      doc.addPage(); y = 16;
    } else if (b.t === 'table') {
      autoTable(doc, {
        startY: y,
        margin: { left: M, right: M },
        head: b.head ? [b.head] : undefined,
        body: b.rows.map((r) => r.map((c) => {
          const o = typeof c === 'string' ? { text: c } : c;
          return {
            content: o.text,
            styles: {
              fillColor: o.shade === 'head' ? [217, 226, 243] : o.shade === 'gap' ? [255, 242, 204] : undefined,
              halign: o.shade === 'head' || o.align === 'center' ? 'center' : 'left',
            },
          };
        })) as never,
        styles: { font: 'Nanum', fontSize: 7.6, cellPadding: 1.4, lineColor: [0, 0, 0], lineWidth: 0.15, textColor: [0, 0, 0], valign: 'middle', overflow: 'linebreak' },
        headStyles: { font: 'Nanum', fillColor: [217, 226, 243], textColor: [0, 0, 0], halign: 'center', fontStyle: 'normal' },
        columnStyles: Object.fromEntries(b.widths.map((w, i) => [i, { cellWidth: (w / 100) * W }])),
        theme: 'grid',
        rowPageBreak: 'avoid',
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
    } else if (b.t === 'sign') {
      ensure(45);
      doc.setFontSize(10); y += 6;
      doc.text(b.statement, 105, y, { align: 'center' }); y += 7;
      doc.text('20      년      월      일', 105, y, { align: 'center' }); y += 5;
      autoTable(doc, {
        startY: y, margin: { left: M, right: M }, theme: 'grid',
        body: b.lines.map((l) => [{ content: l.role, styles: { fillColor: [217, 226, 243] } }, '성명(Name):', '(서명/Signature)']) as never,
        styles: { font: 'Nanum', fontSize: 9, minCellHeight: 10, lineColor: [0, 0, 0], lineWidth: 0.15, textColor: [0, 0, 0], valign: 'middle' },
        columnStyles: { 0: { cellWidth: W * 0.35 }, 1: { cellWidth: W * 0.4 }, 2: { cellWidth: W * 0.25 } },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
    }
  }
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); doc.setFontSize(7.5); doc.setTextColor(90);
    doc.text(`MFDS GMP Helper · KGMP (ISO 13485:2016)`, M, 292);
    doc.text(`${i} / ${pages}`, 210 - M, 292, { align: 'right' });
    doc.setTextColor(0);
  }
  return doc.output('blob');
}

export { cellText };
