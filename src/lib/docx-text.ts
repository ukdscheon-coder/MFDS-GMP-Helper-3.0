import JSZip from 'jszip';

/**
 * Word (.docx) → plain text that keeps what matters for GMP document matching:
 *  - automatic heading / list numbers (stored in numbering.xml, not in the text runs), e.g. "4.2.4 Control of documents"
 *  - table rows on one line with cells separated by " | " (cross-reference matrices, document lists, header blocks)
 *  - headers and footers first (document number, revision and date usually live there)
 */

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

interface Lvl { start: number; fmt: string; text: string }
interface NumDefs { abs: Map<string, Map<number, Lvl>>; num: Map<string, { abs: string; starts: Map<number, number> }> }
interface StyleDef { numId?: string; ilvl?: number; basedOn?: string }

const attr = (el: Element | null | undefined, name: string) => (el ? el.getAttributeNS(W, name) ?? el.getAttribute(`w:${name}`) : null);
const kids = (el: Element, local: string) => Array.from(el.childNodes).filter((n): n is Element => n.nodeType === 1 && (n as Element).localName === local);
const kid = (el: Element | null | undefined, local: string) => (el ? kids(el, local)[0] || null : null);

function parse(xml: string): Document {
  return new DOMParser().parseFromString(xml, 'application/xml');
}

function readNumbering(xml: string | null): NumDefs {
  const defs: NumDefs = { abs: new Map(), num: new Map() };
  if (!xml) return defs;
  const root = parse(xml).documentElement;
  for (const a of kids(root, 'abstractNum')) {
    const lv = new Map<number, Lvl>();
    for (const l of kids(a, 'lvl')) {
      lv.set(Number(attr(l, 'ilvl') || 0), {
        start: Number(attr(kid(l, 'start'), 'val') || 1),
        fmt: attr(kid(l, 'numFmt'), 'val') || 'decimal',
        text: attr(kid(l, 'lvlText'), 'val') ?? '',
      });
    }
    defs.abs.set(attr(a, 'abstractNumId') || '', lv);
  }
  for (const n of kids(root, 'num')) {
    const starts = new Map<number, number>();
    for (const o of kids(n, 'lvlOverride')) {
      const s = attr(kid(o, 'startOverride'), 'val');
      if (s) starts.set(Number(attr(o, 'ilvl') || 0), Number(s));
    }
    defs.num.set(attr(n, 'numId') || '', { abs: attr(kid(n, 'abstractNumId'), 'val') || '', starts });
  }
  return defs;
}

function readStyles(xml: string | null): Map<string, StyleDef> {
  const map = new Map<string, StyleDef>();
  if (!xml) return map;
  for (const s of kids(parse(xml).documentElement, 'style')) {
    const ppr = kid(s, 'pPr');
    const np = kid(ppr, 'numPr');
    map.set(attr(s, 'styleId') || '', {
      numId: attr(kid(np, 'numId'), 'val') || undefined,
      ilvl: kid(np, 'ilvl') ? Number(attr(kid(np, 'ilvl'), 'val')) : undefined,
      basedOn: attr(kid(s, 'basedOn'), 'val') || undefined,
    });
  }
  return map;
}

const ROMAN: [number, string][] = [[1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']];
function fmtNum(n: number, fmt: string): string {
  switch (fmt) {
    case 'lowerLetter': return String.fromCharCode(96 + (((n - 1) % 26) + 1));
    case 'upperLetter': return String.fromCharCode(64 + (((n - 1) % 26) + 1));
    case 'lowerRoman': case 'upperRoman': {
      let r = '', x = n;
      for (const [v, s] of ROMAN) while (x >= v) { r += s; x -= v; }
      return fmt === 'upperRoman' ? r.toUpperCase() : r;
    }
    case 'none': case 'bullet': return '';
    default: return String(n); // decimal, decimalZero, ganada, etc. → arabic is good enough for clause numbers
  }
}

/** Plain text of a paragraph's runs (w:t, tabs, breaks); ignores deleted text. */
function runText(p: Element): string {
  let s = '';
  const walk = (el: Element) => {
    for (const n of Array.from(el.childNodes)) {
      if (n.nodeType !== 1) continue;
      const e = n as Element;
      const ln = e.localName;
      if (ln === 'del' || ln === 'delText' || ln === 'instrText') continue;
      if (ln === 't') s += e.textContent || '';
      else if (ln === 'tab') s += ' ';
      else if (ln === 'br' || ln === 'cr') s += ' ';
      else if (ln === 'p' || ln === 'tbl') continue; // nested blocks (text boxes) handled separately
      else walk(e);
    }
  };
  walk(p);
  return s;
}

class Numberer {
  private counters = new Map<string, number[]>();
  constructor(private defs: NumDefs, private styles: Map<string, StyleDef>) {}

  private styleNum(styleId: string | null): { numId?: string; ilvl?: number } {
    let id = styleId, guard = 0, numId: string | undefined, ilvl: number | undefined;
    while (id && guard++ < 10) {
      const st = this.styles.get(id);
      if (!st) break;
      numId ??= st.numId;
      ilvl ??= st.ilvl;
      id = st.basedOn || null;
    }
    return { numId, ilvl };
  }

  label(p: Element): string {
    const ppr = kid(p, 'pPr');
    const np = kid(ppr, 'numPr');
    const fromStyle = this.styleNum(attr(kid(ppr, 'pStyle'), 'val'));
    const numId = attr(kid(np, 'numId'), 'val') || fromStyle.numId;
    if (!numId || numId === '0') return '';
    const ilvl = kid(np, 'ilvl') ? Number(attr(kid(np, 'ilvl'), 'val')) : fromStyle.ilvl ?? 0;
    const num = this.defs.num.get(numId);
    const lvls = num && this.defs.abs.get(num.abs);
    if (!num || !lvls) return '';
    const key = num.abs; // Word continues numbering across num instances of the same abstract list
    const c = this.counters.get(key) || [];
    for (let i = 0; i < ilvl; i++) if (c[i] === undefined) c[i] = (num.starts.get(i) ?? lvls.get(i)?.start ?? 1);
    c[ilvl] = c[ilvl] === undefined ? (num.starts.get(ilvl) ?? lvls.get(ilvl)?.start ?? 1) : c[ilvl] + 1;
    c.length = ilvl + 1;
    this.counters.set(key, c);
    const lv = lvls.get(ilvl);
    if (!lv || lv.fmt === 'bullet' || lv.fmt === 'none') return '';
    return lv.text.replace(/%(\d)/g, (_, k) => {
      const i = Number(k) - 1;
      return fmtNum(c[i] ?? 1, lvls.get(i)?.fmt || 'decimal');
    }).trim();
  }
}

function blockLines(container: Element, nb: Numberer, out: string[]) {
  for (const el of Array.from(container.childNodes)) {
    if (el.nodeType !== 1) continue;
    const e = el as Element;
    if (e.localName === 'p') {
      const label = nb.label(e);
      const t = runText(e).replace(/\s+/g, ' ').trim();
      if (t || label) out.push(label && t ? `${label} ${t}` : t || label);
      // text boxes / shapes inside the paragraph
      for (const tx of Array.from(e.getElementsByTagNameNS(W, 'txbxContent'))) blockLines(tx, nb, out);
    } else if (e.localName === 'tbl') {
      for (const tr of kids(e, 'tr')) {
        const cells = kids(tr, 'tc').map((tc) => {
          const inner: string[] = [];
          blockLines(tc, nb, inner);
          return inner.join(' / ');
        });
        const row = cells.map((c) => c.trim()).filter(Boolean);
        if (row.length) out.push(row.join(' | '));
      }
    } else if (e.localName === 'sdt') {
      const content = kid(e, 'sdtContent');
      if (content) blockLines(content, nb, out);
    } else if (e.localName === 'customXml' || e.localName === 'smartTag') {
      blockLines(e, nb, out);
    }
  }
}

export async function docxText(buf: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buf);
  const read = async (n: string) => (zip.file(n) ? zip.file(n)!.async('string') : null);
  const defs = readNumbering(await read('word/numbering.xml'));
  const styles = readStyles(await read('word/styles.xml'));
  const parts = Object.keys(zip.files)
    .filter((n) => /^word\/(header\d*|document|footer\d*)\.xml$/.test(n))
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  function rank(n: string) {
    return n.includes('header') ? 0 : n.includes('document') ? 1 : 2;
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of parts) {
    const xml = await read(p);
    if (!xml) continue;
    const root = parse(xml).documentElement;
    const body = p.includes('document') ? kid(root, 'body') || root : root;
    const lines: string[] = [];
    blockLines(body, new Numberer(defs, styles), lines);
    const block = lines.join('\n');
    if (!block.trim()) continue;
    if (p.includes('header') || p.includes('footer')) {
      if (seen.has(block)) continue;
      seen.add(block);
    }
    out.push(block);
  }
  return out.join('\n');
}
