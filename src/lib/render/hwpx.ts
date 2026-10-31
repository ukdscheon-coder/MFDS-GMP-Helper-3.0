// HWPX (한글 OWPML) writer. Static parts come from a template built with python-hwpx; the section body is generated here.
import JSZip from 'jszip';
import headerXml from '../../assets/hwpx/header.xml?raw';
import contentHpf from '../../assets/hwpx/content.hpf?raw';
import versionXml from '../../assets/hwpx/version.xml?raw';
import settingsXml from '../../assets/hwpx/settings.xml?raw';
import containerXml from '../../assets/hwpx/container.xml?raw';
import containerRdf from '../../assets/hwpx/container.rdf?raw';
import manifestXml from '../../assets/hwpx/manifest.xml?raw';
import secOpen from '../../assets/hwpx/sec_open.xml?raw';
import firstPara from '../../assets/hwpx/firstpara.xml?raw';
import { cellText, type Block, type Cell } from '../report';

// ids defined in the template header.xml
const CH = { normal: 0, bold: 7, title: 8, h1: 9, small: 3, smallBold: 10, grey: 11 };
const PP = { normal: 0, center: 20, head: 21, right: 23 };
const BF = { plain: 3, head: 4, gap: 5 };
const CONTENT_W = 42520; // A4 width 59528 - margins 8504*2

const x = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

let pid = 1000;
function para(text: string, charPr: number, paraPr = PP.normal, pageBreak = false): string {
  return `<hp:p id="${pid++}" paraPrIDRef="${paraPr}" styleIDRef="0" pageBreak="${pageBreak ? 1 : 0}" columnBreak="0" merged="0"><hp:run charPrIDRef="${charPr}"><hp:t>${x(text)}</hp:t></hp:run></hp:p>`;
}
const paras = (text: string, charPr: number, paraPr = PP.normal) => (text || ' ').split('\n').map((l) => para(l, charPr, paraPr)).join('');

function estLines(text: string, widthUnits: number) {
  const usable = Math.max(2000, widthUnits - 1020);
  return text.split('\n').reduce((n, line) => {
    let w = 0;
    for (const ch of line) w += /[ᄀ-ᇿ　-鿿가-힣＀-￯]/.test(ch) ? 900 : 520;
    return n + Math.max(1, Math.ceil(w / usable));
  }, 0);
}

let tid = 50000;
function table(widths: number[], head: string[] | undefined, rows: Cell[][]): string {
  const colW = widths.map((w) => Math.round((w / 100) * CONTENT_W));
  colW[colW.length - 1] += CONTENT_W - colW.reduce((a, b) => a + b, 0);
  const all: { cells: Cell[]; head: boolean }[] = [...(head ? [{ cells: head as Cell[], head: true }] : []), ...rows.map((r) => ({ cells: r, head: false }))];
  let totalH = 0;
  const trs = all.map((r, ri) => {
    const lines = Math.max(...r.cells.map((c, ci) => estLines(cellText(c), colW[ci])));
    const h = lines * 1500 + 282;
    totalH += h;
    const tcs = r.cells.map((c, ci) => {
      const o = typeof c === 'string' ? { text: c } : c;
      const isHead = r.head || o.shade === 'head';
      const bf = isHead ? BF.head : o.shade === 'gap' ? BF.gap : BF.plain;
      const center = isHead || o.align === 'center';
      return `<hp:tc name="" header="${r.head ? 1 : 0}" hasMargin="0" protect="0" editable="0" dirty="1" borderFillIDRef="${bf}"><hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">${paras(o.text, isHead || o.bold ? CH.smallBold : CH.small, center ? PP.center : PP.normal)}</hp:subList><hp:cellAddr colAddr="${ci}" rowAddr="${ri}"/><hp:cellSpan colSpan="1" rowSpan="1"/><hp:cellSz width="${colW[ci]}" height="${h}"/><hp:cellMargin left="510" right="510" top="141" bottom="141"/></hp:tc>`;
    }).join('');
    return `<hp:tr>${tcs}</hp:tr>`;
  }).join('');
  return `<hp:p id="${pid++}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="0"><hp:tbl id="${tid++}" zOrder="0" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="${head ? 1 : 0}" rowCnt="${all.length}" colCnt="${widths.length}" cellSpacing="0" borderFillIDRef="${BF.plain}" noAdjust="0"><hp:sz width="${CONTENT_W}" widthRelTo="ABSOLUTE" height="${totalH}" heightRelTo="ABSOLUTE" protect="0"/><hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/><hp:outMargin left="0" right="0" top="0" bottom="0"/><hp:inMargin left="510" right="510" top="141" bottom="141"/>${trs}</hp:tbl></hp:run></hp:p>`;
}

export async function toHwpx(blocks: Block[], title: string): Promise<Blob> {
  pid = 1000; tid = 50000;
  let body = '';
  let breakNext = false;
  const preview: string[] = [];
  for (const b of blocks) {
    if (b.t === 'break') { breakNext = true; continue; }
    if (b.t === 'title') {
      body += para(b.text, CH.title, PP.center, breakNext);
      if (b.sub) body += para(b.sub, CH.normal, PP.center);
      body += para('', CH.normal);
      preview.push(b.text);
    } else if (b.t === 'h') {
      body += para(b.text, CH.h1, PP.head, breakNext);
      preview.push(b.text);
    } else if (b.t === 'p') {
      body += b.text.split('\n').map((l, i) => para(l, b.small ? CH.small : CH.normal, PP.normal, breakNext && i === 0)).join('');
    } else if (b.t === 'table') {
      if (breakNext) body += para('', CH.normal, PP.normal, true);
      body += table(b.widths, b.head, b.rows) + para('', CH.small);
    } else if (b.t === 'sign') {
      body += para('', CH.normal) + para(b.statement, CH.normal, PP.center) + para('20      년      월      일', CH.normal, PP.center) + para('', CH.normal);
      body += table([35, 40, 25], undefined, b.lines.map((l) => [{ text: l.role, shade: 'head' as const }, '성명(Name):', '(서명/Signature)']));
    }
    breakNext = false;
  }
  const section = `${secOpen}${firstPara}${body}</hs:sec>`;
  const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const hpf = contentHpf
    .replace(/<opf:title\/>/, `<opf:title>${x(title)}</opf:title>`)
    .replace(/synthetic-fixture-author/g, 'MFDS GMP Helper')
    .replace(/(name="CreatedDate" content="text">)[^<]*/, `$1${now}`)
    .replace(/(name="ModifiedDate" content="text">)[^<]*/, `$1${now}`);

  const zip = new JSZip();
  zip.file('mimetype', 'application/hwp+zip', { compression: 'STORE' });
  zip.file('version.xml', versionXml);
  zip.file('Contents/header.xml', headerXml);
  zip.file('Contents/section0.xml', section);
  zip.file('Contents/content.hpf', hpf);
  zip.file('settings.xml', settingsXml);
  zip.file('Preview/PrvText.txt', preview.join('\r\n'));
  zip.file('META-INF/container.xml', containerXml);
  zip.file('META-INF/container.rdf', containerRdf);
  zip.file('META-INF/manifest.xml', manifestXml);
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', mimeType: 'application/hwp+zip' });
}
