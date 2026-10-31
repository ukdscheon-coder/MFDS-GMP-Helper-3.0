import {
  AlignmentType, BorderStyle, Document, Packer, PageBreak, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType, VerticalAlign,
} from 'docx';
import type { Block, Cell } from '../report';

const FONT = '맑은 고딕';
const CW = 10306; // A4 width minus margins, twips
const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const borders = { top: border, bottom: border, left: border, right: border };

function paras(text: string, opts: { bold?: boolean; size?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) {
  return text.split('\n').map((line) => new Paragraph({ alignment: opts.align, spacing: { after: 0 }, children: [new TextRun({ text: line, bold: opts.bold, size: opts.size ?? 17, font: FONT })] }));
}

function cell(c: Cell, widthPct: number, head = false) {
  const o = typeof c === 'string' ? { text: c } : c;
  const shade = head || o.shade === 'head' ? 'D9E2F3' : o.shade === 'gap' ? 'FFF2CC' : undefined;
  return new TableCell({
    width: { size: Math.round(widthPct * CW / 100), type: WidthType.DXA },
    borders,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    shading: shade ? { type: ShadingType.CLEAR, color: 'auto', fill: shade } : undefined,
    children: paras(o.text || ' ', { bold: head || o.bold || o.shade === 'head', align: head || o.shade === 'head' || o.align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT }),
  });
}

export async function toDocx(blocks: Block[]): Promise<Blob> {
  const children: (Paragraph | Table)[] = [];
  for (const b of blocks) {
    if (b.t === 'title') {
      children.push(...paras(b.text, { bold: true, size: 32, align: AlignmentType.CENTER }));
      if (b.sub) children.push(...paras(b.sub, { size: 18, align: AlignmentType.CENTER }), new Paragraph({ text: '' }));
    } else if (b.t === 'h') {
      children.push(new Paragraph({ spacing: { before: 240, after: 80 }, keepNext: true, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '000000', space: 1 } }, children: [new TextRun({ text: b.text, bold: true, size: 23, font: FONT })] }));
    } else if (b.t === 'p') children.push(...paras(b.text, { size: b.small ? 16 : 19 }));
    else if (b.t === 'break') children.push(new Paragraph({ children: [new PageBreak()] }));
    else if (b.t === 'table') {
      const rows: TableRow[] = [];
      if (b.head) rows.push(new TableRow({ tableHeader: true, children: b.head.map((h, i) => cell(h, b.widths[i], true)) }));
      for (const r of b.rows) rows.push(new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, b.widths[i])) }));
      children.push(new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: b.widths.map((w) => Math.round((w * CW) / 100)), rows }), new Paragraph({ text: '' }));
    } else if (b.t === 'sign') {
      children.push(new Paragraph({ text: '' }), ...paras(b.statement, { align: AlignmentType.CENTER, size: 20 }), ...paras('20      년      월      일', { align: AlignmentType.CENTER, size: 20 }), new Paragraph({ text: '' }));
      children.push(new Table({
        width: { size: CW, type: WidthType.DXA },
        columnWidths: [35, 40, 25].map((w) => Math.round((w * CW) / 100)),
        rows: b.lines.map((l) => new TableRow({ height: { value: 600, rule: 'atLeast' }, children: [cell({ text: l.role, shade: 'head' }, 35), cell('성명(Name):', 40), cell('(서명/Signature)', 25)] })),
      }));
    }
  }
  const doc = new Document({
    creator: 'MFDS GMP Helper',
    title: 'KGMP preparation file',
    styles: { default: { document: { run: { font: FONT, size: 18 } } } },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 850, bottom: 850, left: 800, right: 800 } } }, children }],
  });
  return Packer.toBlob(doc);
}
