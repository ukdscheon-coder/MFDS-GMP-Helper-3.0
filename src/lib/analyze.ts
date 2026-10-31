import { CLAUSES, CLAUSE_BY_ID, normalizeClause } from '../data/kgmp';
import type { ClauseHit, DocRecord, FileKind, SourceFile } from './types';

// ---------------------------------------------------------------- helpers
const STD_PREFIX = /^(ISO|IEC|EN|BS|DIN|ASTM|AAMI|ANSI|MDR|IVDR|CFR|MDD|UL|JIS|KS|GB|YY|NF|UNI|ICH|ASME|CEN|CENELEC|MEDDEV|MDCG|IMDRF|GHTF|EU|EC|FDA|MDSAP|TR|TS|IVD|CE|PAGE|REV|VER|TEL|FAX|ZIP|NO|NR|ART|SEC|QMS|ANNEX|DCB|DTAC|NHS|HTM|TABLE|FIG|STEP|DAY|ITEM|CLASS|TYPE|V|R|A|B|C)$/i;

/** Display form of a document number. */
export function normDocNo(s: string): string {
  return s.toUpperCase().replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}
/** Merge key: "CSC PR.013", "CSC-PR-013" and "csc_pr_013" are the same document. */
const docKey = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

const DOCNO_RE = /\b([A-Z]{1,6}(?:[-_ .][A-Z]{1,6})?[-_ .]?\d{2,5}(?:[-_.](?:[A-Z]{0,2}\d{1,3}[A-Z]?|[A-Z]{1,2}))?[A-Z]?)\b/g;

function looksLikeDocNo(raw: string): boolean {
  const s = raw.trim();
  if (s.length < 4 || s.length > 24) return false;
  if (!/\d{2,}/.test(s) || !/[A-Z]/.test(s)) return false;
  const prefix = s.split(/[-_ .\d]/)[0];
  if (STD_PREFIX.test(prefix)) return false;
  if (/^(19|20)\d{2}$/.test(s.replace(/\D/g, ''))) return false;
  return true;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  gen: 1, mai: 5, giu: 6, lug: 7, ago: 8, set: 9, ott: 10, dic: 12, // it
  janv: 1, févr: 2, fevr: 2, mars: 3, avr: 4, juin: 6, juil: 7, août: 8, aout: 8, sept: 9, déc: 12, // fr
  mär: 3, märz: 3, okt: 10, dez: 12, // de
  ene: 1, abr: 4, dici: 12, // es
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Find the first date in a string and normalise to YYYY-MM-DD (or return ''). */
export function findDate(s: string): string {
  let m = s.match(/(\d{4})\s*[-./년年]\s*(\d{1,2})\s*[-./월月]\s*(\d{1,2})/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = s.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b/);
  if (m) {
    let d = +m[1], mo = +m[2];
    if (mo > 12 && d <= 12) [d, mo] = [mo, d]; // US style
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return `${m[3]}-${pad(mo)}-${pad(d)}`;
  }
  m = s.match(/\b(\d{1,2})[\s.-]*([A-Za-zÀ-ÿ]{3,9})\.?[\s.,-]*(\d{4})\b/);
  if (m) {
    const mo = MONTHS[m[2].toLowerCase().slice(0, 4)] || MONTHS[m[2].toLowerCase().slice(0, 3)];
    if (mo) return `${m[3]}-${pad(mo)}-${pad(+m[1])}`;
  }
  m = s.match(/\b([A-Za-zÀ-ÿ]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})\b/);
  if (m) {
    const mo = MONTHS[m[1].toLowerCase().slice(0, 3)];
    if (mo) return `${m[3]}-${pad(mo)}-${pad(+m[2])}`;
  }
  m = s.match(/\b(\d{1,2})\/(\d{2})\b/); // "05/24" (MM/YY) in document tables
  if (m && +m[1] >= 1 && +m[1] <= 12) return `20${m[2]}-${pad(+m[1])}`;
  return '';
}

/** Text without markdown / front-matter noise, for metadata and title detection. */
function plain(text: string): string {
  return text
    .replace(/^\uFEFF/, '')
    .replace(/^---\n[\s\S]*?\n---\n/, (fm) => fm.replace(/^---$/gm, '').replace(/^(\w[\w ]*):\s*/gm, (_, k) => `${k.replace(/_/g, ' ')}: `))
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<br\s*\/?>/gi, ' / ')
    .replace(/\*\*|__|`/g, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*\|(.*)\|\s*$/gm, (_, row) => row.trim())
    .replace(/^\s*[-:| ]{3,}\s*$/gm, '');
}

// ---------------------------------------------------------------- labels (multilingual)
const L_DOCNO = String.raw`(?:document|doc\.?|sop|procedure|procedura|proc\.?|form|formulario|modulo|record)[ \t]*(?:no\.?|n[o°º]\.?|number|nr\.?|num\.?|#|id|code|ref\.?)|doc(?:ument)?[ \t]*(?:code|id)|codice(?:[ \t]+documento)?|code[ \t]+du[ \t]+document|n[°º][ \t]*(?:du[ \t]+)?document|dokument(?:en)?[- \t]?(?:nr|nummer)\.?|número[ \t]+de[ \t]+documento|c[óo]digo|文書番号|文件编号|문서[ \t]*번호|문서[ \t]*No\.?`;
const L_VER = String.raw`(?:sop[ \t]+|document[ \t]+|doc\.?[ \t]+)?(?:rev(?:ision)?\.?(?![a-z])[ \t]*(?:no\.?|nr\.?|level|index)?|version(?![a-z])|ver\.|edition|issue(?:[ \t]+no\.?)?(?![a-z])|indice|revisione|versione|r[ée]vision(?![a-z])|ausgabe|versi[óo]n|edici[óo]n|改訂(?:番号)?|版本|版数|개정[ \t]*번호|개정[ \t]*차수|버전)`;
const L_DATE = String.raw`(?:effective|revision|revised|issue|issued|approval|approved|release|valid(?:ity)?|implementation|review)[ \t]*(?:date|from|on)?|date|data(?:[ \t]+di[ \t]+(?:emissione|revisione|entrata in vigore))?|datum|gültig[ \t]+ab|g[üu]ltigkeitsdatum|freigabedatum|date[ \t]+d[' ]application|fecha(?:[ \t]+de[ \t]+(?:vigencia|emisión|revisión))?|施行日|改訂日|発行日|生效日期|发布日期|시행일(?:자)?|개정일(?:자)?|제정일(?:자)?|발행일`;
const L_TITLE = String.raw`(?:document[ \t]+|sop[ \t]+|procedure[ \t]+)?(?:title|name|subject)|titolo|oggetto|titre|objet|titel|bezeichnung|t[íi]tulo|文書名|标题|名称|문서[ \t]*명|제[ \t]*목`;


const reAll = (label: string, value: string) => new RegExp(`(?:^|[ \\t|:;,(])(?:${label})[ \\t]*[:：.#|-]?[ \\t]*${value}`, 'gim');
const LABEL_LINE = new RegExp(`^(?:${L_DOCNO}|${L_VER}|${L_DATE}|${L_TITLE}|page|seite|pagina|página|author|approv\\w*|prepared(?: by)?|reviewed(?: by)?|qms version|owner|process owner)(?:[ \\t]*[:：|#]|[ \\t]*\\d|[ \\t]*$)`, 'i');

function headerMeta(text: string) {
  const head = plain(text.slice(0, 6000));
  const meta = { docNo: '', version: '', revisionDate: '', title: '' };

  for (const dn of head.matchAll(reAll(L_DOCNO, '([A-Z0-9][A-Z0-9\\-_./ ]{2,28}[A-Z0-9])'))) {
    const cand = dn[1].trim().split(/\s{2,}| \| /)[0].replace(/\s+(rev|version|ver|page|date|title|effective).*$/i, '');
    if (/\d/.test(cand) && /[A-Z]/i.test(cand) && !findDate(cand)) { meta.docNo = cand.trim(); break; }
  }
  for (const vr of head.matchAll(reAll(L_VER, '([A-Z]?\\d{1,3}(?:\\.\\d{1,3}){0,2}[A-Z]?|[A-Z])(?![A-Za-z0-9])'))) {
    const pre = head.slice(Math.max(0, vr.index! - 12), vr.index! + 1).toLowerCase();
    if (/qms|policy|software|template|iso|form/.test(pre + vr[0].toLowerCase().split(/\s/)[0])) { meta.version ||= ''; continue; }
    meta.version = vr[1].trim();
    break;
  }
  const dl = new RegExp(`(?:^|[\\s|])(?:${L_DATE})\\s*[:：.|]?\\s*(.{0,40})`, 'im');
  const dm = head.match(dl);
  if (dm) meta.revisionDate = findDate(dm[1]);
  const top = head.split('\n').filter((l) => l.trim()).slice(0, 15).join('\n');
  const tl = top.match(new RegExp(`(?:^|\\|)\\s*(?:${L_TITLE})\\s*(?:[:：]|\\s\\|)\\s*([^\\n|]{4,120})`, 'im'));
  if (tl && !/^(and|of|the|rationale|description|version|revision|date)\b/i.test(tl[1].trim()) && !tl[1].split(/\s*\/\s*/).every((c) => GENERIC.test(c.trim())) && !badTitle(tl[1])) meta.title = tl[1].trim();
  return meta;
}

/** Common header cells (company name, "Controlled copy" …) seen in several files — never a title. */
let COMMON_CELLS = new Set<string>();

const GENERIC = /^(regulatory requirements?|document section|section|position|role|team|signature|name|document|description|date|version|revision|author|approval|approved by|reviewed by|prepared by|title|owner|process owner|comment|remarks?|no\.?|item|status|requirement|reference|references|iso 13485:2016 section|position \/ role|team|manufacturer|company|signature)$/i;

/** placeholders, generic table headers and numbered boilerplate headings are never a document title */
function badTitle(c: string): boolean {
  const t = c.replace(/^\d+(\.\d+)*\.?\s+/, '').trim();
  return GENERIC.test(t) || /^(general information|general|purpose|scope|summary|introduction|overview|purpose and scope|zweck|scopo|objet|objetivo|목적|적용\s*범위|개요)$/i.test(t) || /^[\\<(\[{]|<[^>]*>|\benter\b|\binsert\b|^tbd$/i.test(t);
}

function titleCandidates(line: string): string[] {
  return line.split(/\s+\|\s+|\s*\/\s+(?=[A-Z])/).map((c) => c.trim()).filter(Boolean);
}

function firstMeaningfulLine(text: string, docNo: string, fileName = ''): string {
  const fnWords = new Set(words(titleFromFileName(fileName, docNo)).map((w) => w.slice(0, 5)));
  const src = plain(text);
  const lines = src.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 60);
  // a markdown H1 is the title
  const h1s = [...text.replace(/^---\n[\s\S]*?\n---\n/, '').matchAll(/^\s*#\s+(.{4,100})$/gm)].map((m) => m[1].replace(/\*\*/g, '').trim());
  const goodH1 = h1s.find((h) => !/^(quality management system|qms)$/i.test(h) && /[A-Za-zÀ-ÿ가-힣]{3,}\s+[A-Za-zÀ-ÿ가-힣]{2,}/.test(h));
  if (goodH1) return goodH1;
  for (const l0 of lines) {
    const l = l0.replace(/^#{1,6}\s*/, '');
    for (const c of titleCandidates(l)) {
      if (c.length < 5 || c.length > 110) continue;
      if (COMMON_CELLS.has(c.toLowerCase()) || badTitle(c)) continue;
      if (MARKER.test(c) || /^[4-8](\.\d+)+\b/.test(c)) continue;
      // a table cell that has nothing in common with a descriptive file name is a header/body cell, not the title
      if (/\|/.test(l0) && fnWords.size >= 2 && !words(c).some((w) => fnWords.has(w.slice(0, 5)))) continue;
      if (/page\s*\d|seite|pagina|página|\bof\b\s*\d|copyright|confidential|controlled copy|^\d+$/i.test(c)) continue;
      if (docNo && docKey(c) === docKey(docNo)) continue;
      if (docNo && c.includes(docNo) && c.length < docNo.length + 6) continue;
      if (LABEL_LINE.test(c)) continue;
      if (/^[\w ]{2,30}:\s/.test(c)) continue; // key: value
      if (/\b(gmbh|ltd|limited|inc\.?|co\.,?\s*ltd|s\.?r\.?l|s\.?p\.?a|s\.?a\.?s?|corp(oration)?|ag|kk|株式会社|주식회사|\(주\))$/i.test(c)) continue;
      if (/(?:standard operating procedure|procedura operativa|procédure|verfahrensanweisung|procedimiento)$/i.test(c)) continue;
      if (!/[A-Za-zÀ-ÿ぀-鿿가-힣]{3}/.test(c)) continue;
      if (findDate(c) && c.length < 24) continue;
      return c.slice(0, 100);
    }
  }
  return '';
}

function titleFromFileName(name: string, docNo: string): string {
  let t = name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ');
  if (docNo) t = t.replace(new RegExp(docNo.replace(/[^A-Za-z0-9]/g, '').split('').join('[-_ .]?'), 'i'), '');
  t = t.replace(/\b(rev|ver|v)\.?\s*[A-Z0-9.]{1,4}\b/gi, '').replace(/-/g, ' ').replace(/^[\s\-–_]+|[\s\-–_]+$/g, '').replace(/\s{2,}/g, ' ');
  if (t === t.toLowerCase()) t = t.replace(/\b(sop|qm|qms|capa|prrc|ifu|pms|psur|pmcf|udi|kpi)\b/g, (w) => w.toUpperCase()).replace(/(^|\s)([a-z])/g, (_, sp, ch) => sp + ch.toUpperCase()).replace(/\b(Of|And|For|The|To|In|On)\b/g, (w) => w.toLowerCase());
  return t;
}

const cleanTitle = (t: string) => t.replace(/^#+\s*/, '').replace(/^[\s:–\-—,.;|]+|[\s:–\-—,.;|]+$/g, '').replace(/\s{2,}/g, ' ');

// ---------------------------------------------------------------- clause scoring
function kwRegex(k: string) {
  const esc = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (/^[a-z0-9 \-]+$/.test(k) && k.length <= 4) return new RegExp(`\\b${esc}\\b`, 'gi');
  if (/^[a-z]/.test(k)) return new RegExp(`\\b${esc}`, 'gi');
  return new RegExp(esc, 'gi');
}
const KW = CLAUSES.map((c) => ({ id: c.id, res: c.kw.map((k) => ({ k, r: kwRegex(k) })) }));

export function scoreClauses(title: string, body: string): ClauseHit[] {
  const t = title.toLowerCase();
  const b = body.slice(0, 6000).toLowerCase();
  const raw: { id: string; s: number; ev: string }[] = [];
  for (const c of KW) {
    let s = 0;
    let ev = '';
    for (const { k, r } of c.res) {
      r.lastIndex = 0;
      const inTitle = (t.match(r) || []).length;
      r.lastIndex = 0;
      const inBody = Math.min((b.match(r) || []).length, 5);
      const w = Math.min(1 + k.split(' ').length * 0.5, 2.5); // multi-word phrases weigh more
      if (inTitle) { s += 6 * w; ev = ev || k; }
      s += inBody * 0.6 * w;
      if (inBody && !ev) ev = k;
    }
    if (s > 0) raw.push({ id: c.id, s, ev });
  }
  raw.sort((a, b2) => b2.s - a.s);
  if (!raw.length || raw[0].s < 3) return [];
  const top = raw[0].s;
  return raw
    .filter((r) => r.s >= top * 0.75 && r.s >= 3)
    .slice(0, 2)
    .map((r) => ({ clause: r.id, score: Math.min(0.85, 0.35 + r.s / 40), source: 'keyword' as const, evidence: r.ev }));
}

// clause list such as "4.2.4, 4.2.5", "[13485:4.1.3e,4.2.4g,7.5.1a]", "7.1 a, b, c / 7.2.1, 7.2.2"
const CLAUSE_TOKEN = /(?<![\d.])([4-8](?:\.\d{1,2}){1,3})(?![\d]|\.\d)/g;
function clauseTokens(s: string): string[] {
  const out: string[] = [];
  for (const m of s.matchAll(CLAUSE_TOKEN)) {
    const id = normalizeClause(m[1]);
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

const EXCLUDED = /\b(exclu|non[- ]?applicab|not applicab|n\/a\b|nicht anwendbar|ausschl|esclus|non applicab|no aplica|適用除外|不适用)|적용\s*(제외|배제)|해당\s*없음/i;
const MARKER = /(?:\b(?:iso|en)\s*13485\b|\[13485:|\bkgmp\b|\bmdsap\b|\b21\s*cfr\s*820|regulatory\s+references?|normative\s+references?|reference(?:s)?\s+to\s+iso|iso\s+ref(?:erence)?|\bclause\b|\b§\s*(?=[4-8]\.)|관련\s*조항|준용\s*조항|관련\s*규격|해당\s*조항|요구사항\s*조항)/i;

/**
 * Explicit clause statements anywhere in a document: header fields ("Regulatory References: ISO 13485:2016 4.2.4, 4.2.5"),
 * bracket annotations ("[13485:7.3.2, 7.3.5]"), "Clause 7.4", "§ 8.2.2", "관련 조항: 7.5.6".
 */
export function explicitClauses(text: string): ClauseHit[] {
  const out: ClauseHit[] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(MARKER);
    if (!m) continue;
    if (EXCLUDED.test(line)) continue;
    // the list can continue on the next table cell / line ("Regulatory References | ISO 13485:2016 |\n 7.4")
    const seg = (line.slice(m.index! + m[0].length) + ' ' + (lines[i + 1] && !MARKER.test(lines[i + 1]) && lines[i + 1].length < 80 ? lines[i + 1] : '')).slice(0, 240)
      .replace(/(?:iso|en)\s*13485\s*:\s*(?:19|20)\d{2}/gi, ' ').replace(/\b(?:19|20)\d{2}\b/g, ' ');
    const ids = clauseTokens(seg);
    // a header row "ISO 13485:2016 Section | Document Section" → the clauses are in the first cell of the rows below
    if (/\|/.test(line)) {
      for (let j = i + 1; j < Math.min(lines.length, i + 40); j++) {
        const r = lines[j].trim();
        if (!r.includes('|')) break;
        if (/^[|\s:-]+$/.test(r)) continue;
        const first = r.replace(/^\|/, '').split('|')[0];
        if (EXCLUDED.test(r)) continue;
        for (const id of clauseTokens(first.replace(/(?:iso|en)\s*13485\s*:\s*(?:19|20)\d{2}/gi, ' '))) if (!ids.includes(id)) ids.push(id);
      }
    }
    for (const id of ids) {
      if (!out.some((h) => h.clause === id)) out.push({ clause: id, score: 0.95, source: 'explicit', evidence: line.replace(/<!--|-->/g, '').replace(/\s*\|\s*/g, ' | ').trim().slice(0, 70) });
    }
  }
  return out;
}

// ---------------------------------------------------------------- file classification
export function guessKind(f: SourceFile): FileKind {
  const n = f.name.toLowerCase();
  const head = plain(f.text.slice(0, 3000)).toLowerCase();
  const notQm = /training|log|record|form|template|checklist|questionnaire|교육|기록|양식|서식/.test(n);
  if ((!notQm && /quality[\s_-]*manual|qualitätsmanagementhandbuch|qm[\s_-]*handbuch|manuale[\s_]+(della[\s_]+)?qualit|manuel[\s_]+(de[\s_]+)?(la[\s_]+)?qualit|manual[\s_]+de[\s_]+calidad|品質マニュアル|质量手册|품질[\s_]*(경영)?[\s_]*매뉴얼|품질[\s_]*매뉴얼|품질[\s_]*편람|\bqm\b|\bqhb\b|\bqmm\b/.test(n)) ||
      /^\s*#?\s*(quality (management )?manual|qualitätsmanagementhandbuch|manuale della qualità|manuel qualité|manual de calidad|품질\s*(경영\s*)?매뉴얼|품질\s*편람)/m.test(head))
    return 'qm';
  if (f.sheets && f.sheets.some((s) => findHeader(s.rows))) return 'master';
  if (/master[\s_-]*list|document[\s_-]*(list|register|index)|list[\s_-]*of[\s_-]*documents|elenco[\s_]+documenti|liste[\s_]+des[\s_]+documents|dokumentenliste|문서[\s_]*목록|문서[\s_]*관리[\s_]*대장/.test(n)) return 'master';
  return 'sop';
}

// ---------------------------------------------------------------- master list (Excel / CSV)
const H = {
  docNo: /(doc(ument)?\.?\s*(no|n[o°º]|nr|number|#|id|code)|sop\s*(no|#|id)|procedure\s*no|codice|code|n[°º]\s*doc|dokument[-\s]?(nr|nummer)|n[úu]mero|c[óo]digo|文書番号|文件编号|문서\s*번호|번호|^id$|^no\.?$|^ref\.?$|doc-?id)/i,
  title: /(title|name|description|subject|titolo|descrizione|titre|d[ée]signation|titel|bezeichnung|t[íi]tulo|nombre|文書名|名称|标题|문서\s*명|제목|명칭)/i,
  version: /(rev|version|ver\b|edition|issue|index|indice|revisione|versione|ausgabe|versi[óo]n|版|개정\s*(번호|차수)?$|버전)/i,
  date: /(date|data|datum|fecha|gültig|effective|vigencia|日付|日期|일자|시행일|개정일)/i,
  clause: /(iso|clause|kgmp|§|chapter|capitolo|chapitre|kapitel|cap[íi]tulo|paragraph|norm|조항|요구사항|reference to)/i,
};

function findHeader(rows: string[][]): { row: number; col: Record<keyof typeof H, number> } | null {
  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const col = { docNo: -1, title: -1, version: -1, date: -1, clause: -1 } as Record<keyof typeof H, number>;
    rows[r].forEach((cell, i) => {
      const c = cell.trim();
      if (!c || c.length > 40) return;
      for (const k of ['clause', 'docNo', 'version', 'date', 'title'] as (keyof typeof H)[]) {
        if (col[k] === -1 && H[k].test(c) && !Object.values(col).includes(i)) { col[k] = i; break; }
      }
    });
    if (col.docNo >= 0 && col.title >= 0) return { row: r, col };
    // "Title / Doc-ID" in one column
    if (col.title >= 0 && /doc|id|no/i.test(rows[r][col.title] || '')) return { row: r, col: { ...col, docNo: col.title } };
  }
  return null;
}

interface Part { docNo: string; title: string; version: string; revisionDate: string; clauses: string[]; fileId: string; fileName: string; excerpt: string; source: 'master' | 'qm' | 'file'; hits?: ClauseHit[] }

function fromMaster(f: SourceFile): Part[] {
  const out: Part[] = [];
  for (const s of f.sheets || []) {
    const h = findHeader(s.rows);
    if (!h) continue;
    for (const row of s.rows.slice(h.row + 1)) {
      let docNo = (row[h.col.docNo] || '').trim();
      let title = (row[h.col.title] || '').trim();
      if (h.col.docNo === h.col.title) {
        DOCNO_RE.lastIndex = 0;
        const m = [...docNo.matchAll(DOCNO_RE)].map((x) => x[1]).find(looksLikeDocNo);
        docNo = m || '';
        title = m ? cleanTitle(title.replace(m, '')) : title;
      }
      if (!title) continue;
      const clauses = h.col.clause >= 0 ? clauseTokens(row[h.col.clause] || '') : [];
      out.push({
        docNo, title,
        version: h.col.version >= 0 ? row[h.col.version] || '' : '',
        revisionDate: h.col.date >= 0 ? findDate(row[h.col.date] || '') || row[h.col.date] || '' : '',
        clauses, fileId: f.id, fileName: f.name, excerpt: row.filter(Boolean).join(' | '), source: 'master',
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------- quality manual
// A QM is read section by section. A section's KGMP clause comes from (1) its heading number when the manual follows the
// ISO 13485 structure, (2) the heading text ("Quality Policy" → 5.3) when the manual uses its own chapter numbers,
// (3) explicit annotations in the section. The QM itself is evidence for every such section, and every document the
// section cites — by number or by title — is evidence for the same clause. Cross-reference tables (clause | procedure)
// are read row by row.

const HEAD_NUM = /^\s*(?:#{1,6}\s*)?(?:(?:clause|section|chapter|kapitel|capitolo|chapitre|cap[íi]tulo|abschnitt|par\.?|§|제)\s*)?(\d{1,2}(?:\.\d{1,2}){0,3})(?:\.|\s*[)–\-:])?\s+([^\d\s|].{1,88})$/i;
const HEAD_MD = /^\s*#{1,6}\s+(.{3,90})$/;

const STOP = new Set(['requirements', 'requirement', 'general', 'particular', 'process', 'processes', 'activities', 'control', 'product', 'products', 'medical', 'devices', 'device', 'provision', 'service', 'their', 'with', 'from', 'and', 'for', 'the', 'of', 'quality', 'management', 'system']);
const words = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z가-힣ㄱ-ㅎ ]/g, ' ').split(/\s+/).filter((w) => w.length >= 4 && !STOP.has(w));

function headingAgrees(id: string, text: string): boolean {
  const c = CLAUSE_BY_ID[id];
  if (!c) return false;
  const t = text.toLowerCase();
  if (t.includes(c.en.toLowerCase().split(' (')[0].split(' – ')[0]) || t.includes(c.ko)) return true;
  const hw = new Set(words(text).map((w) => w.slice(0, 6)));
  if (words(c.en).some((w) => hw.has(w.slice(0, 6)))) return true;
  if (/^(general|allgemeines|généralités|generalità|generalidades|일반|総則|总则)$/i.test(text.trim())) return true;
  return scoreClauses(text, '').some((h) => h.clause === id || h.clause.startsWith(id + '.') || id.startsWith(h.clause + '.'));
}

function headingKeyword(text: string): string[] {
  const hits = scoreClauses(text, '');
  return hits.length ? hits.filter((h) => h.score >= 0.5).map((h) => h.clause) : [];
}

interface Segment { clauses: string[]; text: string; label: string; row: boolean }
interface QmResult { parts: Part[]; segments: Segment[]; exclusions: Exclusion[] }
/** A clause the quality manual declares not applicable, with the QM's own justification text. */
export interface Exclusion { clause: string; where: string; text: string; /** set when only a sub-clause is excluded, e.g. 7.5.9.2 */ sub?: string }

function parseHeading(line: string): { num: string; text: string; md: boolean } | null {
  // PDF/Word put a tab between the number and the heading text ("4.2.4 | Control of documents")
  const l = line.replace(/\*\*/g, '').trim().replace(/^(\d{1,2}(?:\.\d{1,2}){0,3}\.?)\s*\|\s*([^|\d][^|]*)$/, '$1 $2');
  const m = l.match(HEAD_NUM);
  if (m) {
    const text = m[2].replace(/[#*]+$/, '').trim();
    const md = /^#/.test(l);
    // a numbered paragraph is not a heading: long, sentence-like, or starting lower-case
    if (!md && (text.length > 80 || text.split(/\s+/).length > 11 || /[.;:,]$/.test(text) || /^[a-z]/.test(text))) return null;
    return { num: m[1], text, md };
  }
  const h = l.match(HEAD_MD);
  return h ? { num: '', text: h[1].replace(/[#*]+$/, '').trim(), md: true } : null;
}

function fromQM(f: SourceFile): QmResult {
  const parts: Part[] = [];
  const segments: Segment[] = [];
  const exclusions: Exclusion[] = [];
  const addExcl = (clauses: string[], where: string, text: string, raw = '') => {
    const deep = raw.match(/[4-8](?:\.\d{1,2}){1,3}/)?.[0] || '';
    for (const c of clauses) if (CLAUSE_BY_ID[c] && !exclusions.some((x) => x.clause === c && (x.sub || '') === (deep && deep !== c ? deep : ''))) exclusions.push({ clause: c, where: where.slice(0, 70), text: plain(text).replace(/\s+/g, ' ').trim().slice(0, 200), ...(deep && deep !== c ? { sub: deep } : {}) });
  };
  const lines = f.text.split('\n');

  // pass 1 — does the manual follow the ISO 13485 chapter structure?
  let numbered = 0, agree = 0;
  for (const line of lines) {
    const h = parseHeading(line);
    if (!h || !h.num.includes('.')) continue;
    const id = normalizeClause(h.num);
    if (!id) continue;
    numbered++;
    if (headingAgrees(id, h.text)) agree++;
  }
  const isoStructured = agree >= 3 && agree / Math.max(1, numbered) >= 0.4;

  // table of contents: "4.2.4 Control of documents ........ 12" when the same heading appears again later
  const headKey = (h: { num: string; text: string }) => `${h.num} ${h.text.replace(/[.…\s]*\d{1,3}$/, '').replace(/[.…]{2,}.*$/, '').trim()}`.toLowerCase();
  const headCount = new Map<string, number>();
  for (const line of lines) { const h = parseHeading(line); if (h) headCount.set(headKey(h), (headCount.get(headKey(h)) || 0) + 1); }
  const isToc = (h: { num: string; text: string }) => (/[.…]{3,}\s*\d{1,3}$/.test(h.text) || (/\s\d{1,3}$/.test(h.text) && (headCount.get(headKey(h)) || 0) > 1));

  const selfHits: ClauseHit[] = [];
  const addSelf = (clause: string, ev: string, score = 0.8) => {
    if (!CLAUSE_BY_ID[clause]) return;
    const ex = selfHits.find((x) => x.clause === clause);
    const hit: ClauseHit = { clause, score, source: 'qm', evidence: ev, section: ev.replace(/^QM\s+/, '').slice(0, 60) };
    if (!ex) selfHits.push(hit);
    else if (hit.section!.startsWith(clause + ' ') && !ex.section?.startsWith(clause + ' ')) Object.assign(ex, hit); // the exact section wins
  };

  let current: string[] = [];
  let label = '';
  let excluded = false;
  let depth = 0; // heading depth of the current section (numbers / markdown level)
  let seg: Segment | null = null;
  let segRefs: Part[] = []; // documents cited in the current section via the section's clause
  let segSelf: string[] = []; // clauses this section added to the QM itself
  const flush = () => {
    if (!seg) return;
    // a list of many documents (SOP index, template list) is not clause evidence for each of them
    const distinct = new Set(segRefs.map((p) => docKey(p.docNo)));
    if (distinct.size > 6) for (const p of segRefs) { p.hits = []; p.clauses = []; }
    // "7.5.5 Sterile devices — Not applicable." → no evidence for that clause
    const otherClauses = clauseTokens(seg.text.replace(/\b(?:19|20)\d{2}\b/g, ' ')).filter((c) => !seg!.clauses.includes(c));
    if (EXCLUDED.test(seg.text.slice(0, 160)) && seg.text.length < 400 && !otherClauses.length) {
      addExcl(seg.clauses, `QM ${seg.label}`, seg.text);
      for (const c of segSelf) { const i = selfHits.findIndex((h) => h.clause === c && h.evidence === `QM ${seg!.label}`); if (i >= 0) selfHits.splice(i, 1); }
      seg.clauses = [];
    }
    if (seg.clauses.length && seg.text.trim() && distinct.size <= 6) segments.push(seg);
    segRefs = []; segSelf = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (/^(?:#{1,6}\s*)?(annex|appendix|anhang|allegato|annexe|anexo|attachment|부록|별첨|첨부)\b/i.test(line) && line.length < 120) {
      flush(); current = []; label = line.slice(0, 60); depth = 0; excluded = false; seg = null;
      continue;
    }
    const h = parseHeading(line);
    if (h && isToc(h)) continue;
    if (h) {
      const lvl = h.num ? h.num.split('.').length : (line.match(/^#+/)?.[0].length || 9);
      let next: string[] | null = null;
      const id = h.num ? normalizeClause(h.num) : null;
      if (isoStructured && /^[4-8]$/.test(h.num)) next = []; // chapter title ("5 Management responsibility") — its sub-clauses carry the mapping
      else if (id && (isoStructured || headingAgrees(id, h.text))) next = [id];
      else {
        const kw = headingKeyword(h.text);
        if (kw.length) next = kw;
        else if (h.num && lvl <= depth) next = []; // a new, unrelated numbered section closes the previous one
        else if (!h.num && h.md && lvl <= depth) next = [];
      }
      if (next) {
        flush();
        current = next;
        depth = lvl;
        label = `${h.num ? h.num + ' ' : ''}${h.text}`.slice(0, 70);
        excluded = EXCLUDED.test(h.text);
        if (excluded && current.length && h.num) addExcl(current, `QM ${label}`, h.text);
        seg = { clauses: excluded ? [] : current, text: '', label, row: false };
        if (!excluded) for (const c of current) { if (!selfHits.some((x) => x.clause === c)) segSelf.push(c); addSelf(c, `QM ${label}`); }
      } else if (EXCLUDED.test(h.text)) { excluded = true; if (seg) seg.clauses = []; }
      continue;
    }

    // inline annotations / explicit references belong to the current section
    if (MARKER.test(line) && !EXCLUDED.test(line) && !excluded) {
      const ex = explicitClauses(line).map((x) => x.clause);
      const isRow = /\|/.test(line);
      if (ex.length && !isRow) {
        for (const c of ex) { if (!current.includes(c)) current = [...current, c]; addSelf(c, `QM ${label}`); }
        if (seg) seg.clauses = current;
      }
    }

    // cross-reference table rows: "4.2.4 | Control of documents | QP-0424"
    const cells = line.replace(/^\||\|$/g, '').split(/\s*\|\s*/);
    const rowClauses = cells.length > 1 && /^\s*\**\s*[4-8](?:\.\d{1,2}){1,3}/.test(cells[0]) ? clauseTokens(cells[0]) : [];
    const rowExcluded = EXCLUDED.test(line) || excluded;
    // exclusion statements: a row of the exclusions table, or "Exclusions: 7.5.5 is not applicable …"
    if (rowClauses.length && rowExcluded) addExcl(rowClauses, `QM ${label}`, cells.slice(1).join(' — ') || line, cells[0]);
    else if (!rowClauses.length && EXCLUDED.test(line) && !MARKER.test(line)) addExcl(clauseTokens(line.replace(/\b(?:19|20)\d{2}\b/g, ' ')), `QM ${label}`, line);
    const target = rowClauses.length ? rowClauses : current;

    DOCNO_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    let refs = 0;
    while ((m = DOCNO_RE.exec(line))) {
      const no = m[1];
      if (!looksLikeDocNo(no) || docKey(no) === docKey(f.name.split(/[_ ]/)[0])) continue;
      refs++;
      if (rowExcluded) continue;
      const after = line.slice(m.index + no.length).replace(/^[\s:–\-—,)|]+/, '');
      const before = line.slice(0, m.index).replace(/[\s(\[:–\-—|]+$/, '');
      let title = after.split(/[;|]|\s{3,}|\(|\b(?:rev|version|ver)\b/i)[0].trim();
      if (title.length < 4 || /^[\d.,]/.test(title)) {
        const b = before.split(/[:;|]|\s{3,}/).pop()?.trim() || '';
        title = b.length >= 4 && !/^[4-8](\.\d+)+$/.test(b) ? b : '';
      }
      title = title.replace(/^(?:procedure|sop|related procedure|see|per|according to|in line with)\s*[:\-]?\s*/i, '').replace(/[)\]]+$/, '');
      if (LABEL_LINE.test(title) || /^(document|doc)\s*(id|no|number)\b/i.test(title)) title = '';
      const ver = line.slice(m.index).match(new RegExp(`(?:${L_VER})\\s*[:.]?\\s*([A-Z]?\\d{1,3}(?:\\.\\d{1,3})?)`, 'i'));
      const part: Part = {
        docNo: no, title: cleanTitle(plain(title).slice(0, 100)).replace(/[)\]]+$/, '').trim(), version: ver?.[1] || '', revisionDate: '', clauses: target, fileId: f.id, fileName: f.name, excerpt: line.slice(0, 200), source: 'qm',
        hits: target.map((c) => ({ clause: c, score: rowClauses.length ? 0.92 : 0.9, source: 'qm' as const, evidence: `QM ${rowClauses.length ? cells.slice(0, 2).join(' ') : label}`.slice(0, 80) })),
      };
      parts.push(part);
      if (!rowClauses.length) segRefs.push(part);
    }
    if (rowClauses.length && !rowExcluded) {
      // a row without a document number may still name a procedure by title (resolved later) or refer to the QM itself
      segments.push({ clauses: rowClauses, text: line, label: cells.slice(0, 2).join(' ').slice(0, 70), row: true });
      if (!refs && cells.slice(1).every((c) => /^[\d. ()a-z]*$/i.test(c) || /^\(?all\)?$/i.test(c) || c.length < 3)) for (const c of rowClauses) addSelf(c, `QM ${line.slice(0, 60)}`, 0.9);
    }
    if (seg && !excluded && !rowClauses.length) seg.text += line + '\n';
  }
  flush();

  const meta = headerMeta(f.text);
  if (!selfHits.some((h) => h.clause === '4.2.2')) selfHits.unshift({ clause: '4.2.2', score: 0.99, source: 'explicit', evidence: 'Quality manual' });
  parts.push({
    docNo: meta.docNo || '', title: meta.title || firstMeaningfulLine(f.text, meta.docNo, f.name) || titleFromFileName(f.name, ''),
    version: meta.version, revisionDate: meta.revisionDate, clauses: selfHits.map((h) => h.clause), fileId: f.id, fileName: f.name,
    excerpt: f.text.slice(0, 1500), source: 'file', hits: selfHits,
  });
  return { parts, segments, exclusions };
}

// ---------------------------------------------------------------- single SOP / record files
function fromFile(f: SourceFile): Part {
  const meta = headerMeta(f.text);
  let docNo = meta.docNo;
  DOCNO_RE.lastIndex = 0;
  const fromName = [...f.name.toUpperCase().matchAll(DOCNO_RE)].map((m) => m[1]).find(looksLikeDocNo);
  if (!docNo || (fromName && docKey(fromName).startsWith(docKey(docNo)) && fromName.length > docNo.length)) docNo = fromName || docNo;
  let version = meta.version;
  if (!version) {
    const vm = f.name.match(/\b(?:rev|ver|v|r)\.?\s*([0-9]{1,3}(?:\.[0-9]{1,2})?|[A-Z])\b/i);
    if (vm) version = vm[1];
  }
  const title = cleanTitle(meta.title || firstMeaningfulLine(f.text, docNo, f.name) || titleFromFileName(f.name, docNo));
  let explicit = explicitClauses(f.text);
  // a document citing a dozen clauses is a cross-reference list / audit programme / checklist, not evidence for each clause
  if (explicit.length > 12) explicit = explicitClauses(f.text.slice(0, 2500)).slice(0, 4);
  const kw = scoreClauses(title + ' ' + titleFromFileName(f.name, docNo), plain(f.text));
  const hits = explicit.length ? explicit : kw;
  return {
    docNo, title, version, revisionDate: meta.revisionDate, clauses: hits.map((h) => h.clause),
    fileId: f.id, fileName: f.name, excerpt: f.text.slice(0, 1500), source: 'file', hits,
  };
}

// ---------------------------------------------------------------- title references ("see SOP Document and Record Control")
const normTxt = (s: string) => ' ' + s.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu, ' ').trim() + ' ';
function titleVariants(title: string): string[] {
  const base = title.replace(/\(.*?\)/g, ' ').replace(/^\s*(?:standard operating procedure|sop|procedure|procedura|verfahrensanweisung|qp|wi|work instruction)\b[\s:\-–]*/i, '');
  const out = new Set<string>();
  for (const v of [title, base, ...(title.match(/\(([^)]{8,})\)/)?.slice(1) || [])]) {
    const n = normTxt(v);
    if (n.trim().length >= 10 && n.trim().split(' ').length >= 2) out.add(n);
  }
  return [...out];
}

// ---------------------------------------------------------------- merge
export function analyze(files: SourceFile[]): { docs: DocRecord[]; notes: string[]; exclusions: Exclusion[] } {
  const notes: string[] = [];
  const parts: Part[] = [];
  const segments: Segment[] = [];
  const exclusions: Exclusion[] = [];
  const ready = files.filter((f) => f.status === 'done' && f.text.trim());

  // header cells repeated across files are company names / boilerplate, not titles
  const cellCount = new Map<string, number>();
  for (const f of ready) {
    const seen = new Set<string>();
    for (const l of plain(f.text.slice(0, 1500)).split('\n').slice(0, 12)) for (const c of titleCandidates(l)) seen.add(c.toLowerCase());
    for (const c of seen) cellCount.set(c, (cellCount.get(c) || 0) + 1);
  }
  COMMON_CELLS = new Set([...cellCount].filter(([c, n]) => n >= Math.max(2, Math.ceil(ready.length * 0.3)) && c.length < 60 && !/^#/.test(c)).map(([c]) => c));

  const qmIds = new Set<string>();
  for (const f of ready) {
    const kind = f.kind === 'unknown' ? guessKind(f) : f.kind;
    if (kind === 'master') {
      const rows = fromMaster(f);
      if (rows.length) parts.push(...rows);
      else parts.push(fromFile(f));
    } else if (kind === 'qm') {
      const r = fromQM(f);
      parts.push(...r.parts);
      segments.push(...r.segments);
      for (const x of r.exclusions) if (!exclusions.some((y) => y.clause === x.clause)) exclusions.push(x);
      qmIds.add(f.id);
    } else parts.push(fromFile(f));
  }
  if (!qmIds.size) notes.push('noQM');

  const byKey = new Map<string, DocRecord>();
  const priority = { file: 3, master: 2, qm: 1 } as const;
  const bestSrc = new Map<string, number>();
  for (const p of parts) {
    const key = p.docNo ? docKey(p.docNo) : `file:${p.fileId}`;
    let rec = byKey.get(key);
    if (!rec) {
      rec = { key, title: '', docNo: p.docNo ? normDocNo(p.docNo) : '', version: '', revisionDate: '', fileIds: [], fileNames: [], hits: [], excerpt: '' };
      byKey.set(key, rec);
    }
    const pr = priority[p.source];
    const cur = bestSrc.get(key) || 0;
    if (pr >= cur) {
      if (p.title && !(pr === cur && p.source === 'qm' && rec.title)) rec.title = p.title;
      if (p.version) rec.version = p.version;
      if (p.revisionDate) rec.revisionDate = p.revisionDate;
      if (p.docNo) rec.docNo = normDocNo(p.docNo);
      if (p.excerpt && (pr > cur || !rec.excerpt)) rec.excerpt = p.excerpt;
      bestSrc.set(key, pr);
    } else {
      rec.title ||= p.title;
      rec.version ||= p.version;
      rec.revisionDate ||= p.revisionDate;
      rec.excerpt ||= p.excerpt;
    }
    if (!rec.fileIds.includes(p.fileId)) { rec.fileIds.push(p.fileId); rec.fileNames.push(p.fileName); }
    const hits: ClauseHit[] = p.hits || p.clauses.map((c) => ({ clause: c, score: p.source === 'qm' ? 0.9 : 0.92, source: p.source as 'qm' | 'master', evidence: p.source === 'qm' ? `QM: ${p.excerpt.slice(0, 80)}` : 'Master list' }));
    for (const h of hits) {
      const ex = rec.hits.find((x) => x.clause === h.clause);
      if (!ex) rec.hits.push({ ...h });
      else if (h.score > ex.score || (ex.source === 'keyword' && h.source !== 'keyword')) Object.assign(ex, h);
    }
  }

  // documents that the QM cites by title only
  if (segments.length) {
    const recs = [...byKey.values()].filter((rec) => !rec.fileIds.every((id) => qmIds.has(id)) || rec.docNo);
    const recVars = new Map(recs.map((r) => [r, titleVariants(r.title)] as const));
    const segN = segments.map((s) => ({ ...s, n: normTxt(s.text) }))
      .filter((s) => s.row || recs.filter((r) => recVars.get(r)!.some((v) => s.n.includes(v))).length <= 6);
    for (const rec of byKey.values()) {
      if (rec.fileIds.some((id) => qmIds.has(id)) && rec.fileIds.length === 1 && !rec.fileIds.some((id) => !qmIds.has(id))) continue;
      const vars = titleVariants(rec.title);
      if (!vars.length) continue;
      for (const s of segN) {
        if (!vars.some((v) => s.n.includes(v))) continue;
        for (const c of s.clauses) {
          const ex = rec.hits.find((x) => x.clause === c);
          const hit: ClauseHit = { clause: c, score: s.row ? 0.9 : 0.86, source: 'qm', evidence: `QM ${s.label}`.slice(0, 80) };
          if (!ex) rec.hits.push(hit);
          else if (ex.source === 'keyword') Object.assign(ex, hit);
        }
      }
    }
  }

  // When a doc has explicit/QM/master evidence, drop weaker keyword guesses for other clauses
  for (const rec of byKey.values()) {
    const strong = rec.hits.filter((h) => h.source !== 'keyword');
    if (strong.length) rec.hits = strong;
    rec.hits = rec.hits.filter((h) => CLAUSE_BY_ID[h.clause]).sort((a, b) => b.score - a.score);
  }
  const docs = [...byKey.values()].sort((a, b) => (a.docNo || a.title).localeCompare(b.docNo || b.title));
  return { docs, notes, exclusions };
}
