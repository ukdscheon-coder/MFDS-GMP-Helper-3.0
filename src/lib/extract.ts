import * as pdfjs from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import type { SourceFile } from './types';
import { docxText } from './docx-text';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

export const ACCEPT =
  '.pdf,.docx,.xlsx,.xls,.xlsm,.csv,.txt,.md,.png,.jpg,.jpeg,.tif,.tiff,.bmp,.webp,.gif,.zip';

const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'tif', 'tiff', 'bmp', 'webp', 'gif'];
const SHEET_EXT = ['xlsx', 'xls', 'xlsm', 'csv'];

export interface RawUpload {
  file: File | Blob;
  name: string;
  path: string;
}

export const extOf = (name: string) => (name.split('.').pop() || '').toLowerCase();

let idSeq = 0;
export const newId = () => `f${Date.now().toString(36)}${(idSeq++).toString(36)}`;

/** Expand zip archives into their member files. */
export async function expandUploads(list: RawUpload[]): Promise<RawUpload[]> {
  const out: RawUpload[] = [];
  for (const u of list) {
    if (extOf(u.name) === 'zip') {
      try {
        const zip = await JSZip.loadAsync(await u.file.arrayBuffer());
        const entries = Object.values(zip.files).filter((f) => !f.dir && !f.name.startsWith('__MACOSX') && !f.name.split('/').pop()!.startsWith('.'));
        for (const e of entries) {
          const blob = await e.async('blob');
          const base = e.name.split('/').pop()!;
          out.push(...(await expandUploads([{ file: blob, name: base, path: `${u.path || u.name}/${e.name}` }])));
        }
      } catch {
        out.push(u);
      }
    } else out.push(u);
  }
  return out;
}

/** Recursively read a dropped directory entry (Chrome/Edge/Safari/Firefox support webkitGetAsEntry). */
export async function readDropItems(items: DataTransferItemList): Promise<RawUpload[]> {
  const out: RawUpload[] = [];
  const walk = async (entry: FileSystemEntry, prefix: string): Promise<void> => {
    if (entry.isFile) {
      const file = await new Promise<File>((res, rej) => (entry as FileSystemFileEntry).file(res, rej));
      if (!file.name.startsWith('.')) out.push({ file, name: file.name, path: prefix + file.name });
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      let batch: FileSystemEntry[] = [];
      do {
        batch = await new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej));
        for (const child of batch) await walk(child, `${prefix}${entry.name}/`);
      } while (batch.length > 0);
    }
  };
  const entries = Array.from(items)
    .map((it) => (it.kind === 'file' ? it.webkitGetAsEntry?.() : null))
    .filter(Boolean) as FileSystemEntry[];
  if (!entries.length) return out;
  for (const e of entries) await walk(e, '');
  return out;
}

// ---------- PDF ----------
async function pdfText(buf: ArrayBuffer, onOcr: (p: number) => void, ocrLangs: string): Promise<{ text: string; ocr: boolean }> {
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    // rebuild lines by y position
    const lines = new Map<number, { x: number; w: number; h: number; s: string }[]>();
    for (const it of content.items as { str: string; transform: number[]; width?: number }[]) {
      if (!('str' in it) || !it.str) continue;
      const y = Math.round(it.transform[5] / 2) * 2;
      if (!lines.has(y)) lines.set(y, []);
      lines.get(y)!.push({ x: it.transform[4], w: it.width || 0, h: Math.abs(it.transform[0]) || 10, s: it.str });
    }
    // a wide horizontal gap on one line is a table-cell boundary (header blocks, cross-reference tables) → " | "
    const joinLine = (parts: { x: number; w: number; h: number; s: string }[]) => {
      parts.sort((a, b) => a.x - b.x);
      let out = '';
      let end = -Infinity;
      for (const p of parts) {
        if (!p.s.trim()) { // whitespace runs that span a wide gap (tabs in Word tables / header blocks)
          if (out && p.w > p.h * 2.5) out += ' | ';
          else if (out && !out.endsWith(' ')) out += ' ';
          end = Math.max(end, p.x + p.w);
          continue;
        }
        if (out && !out.endsWith(' | ')) out += p.x - end > p.h * 2.5 ? ' | ' : (out.endsWith(' ') || p.x - end < p.h * 0.1 ? '' : ' ');
        out += p.s;
        end = Math.max(end, p.x + p.w);
      }
      return out.replace(/\s+/g, ' ').replace(/(\s*\|\s*)+/g, ' | ').trim();
    };
    const text = [...lines.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, parts]) => joinLine(parts))
      .filter(Boolean)
      .join('\n');
    pages.push(text);
  }
  const total = pages.join('\n').replace(/\s/g, '').length;
  if (total > 40 * doc.numPages || total > 400) return { text: pages.join('\n\f\n'), ocr: false };

  // Scanned PDF: OCR up to 15 pages
  const limit = Math.min(doc.numPages, 15);
  const ocrPages: string[] = [];
  for (let i = 1; i <= limit; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
    const blob: Blob = await new Promise((r) => canvas.toBlob((b) => r(b!), 'image/png'));
    ocrPages.push(await ocrImage(blob, ocrLangs));
    onOcr(i / limit);
  }
  return { text: ocrPages.join('\n\f\n'), ocr: true };
}

// ---------- OCR ----------
let workerPromise: Promise<import('tesseract.js').Worker> | null = null;
let workerLangs = '';
async function ocrImage(blob: Blob, langs: string): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  if (!workerPromise || workerLangs !== langs) {
    if (workerPromise) (await workerPromise).terminate();
    workerLangs = langs;
    workerPromise = createWorker(langs.split('+'));
  }
  const w = await workerPromise;
  const { data } = await w.recognize(blob);
  return data.text;
}

// ---------- DOCX: see docx-text.ts (auto-numbered headings, table rows, headers/footers) ----------

// ---------- Spreadsheets ----------
function sheetRows(buf: ArrayBuffer, ext: string): { name: string; rows: string[][] }[] {
  const wb = ext === 'csv' ? XLSX.read(new TextDecoder().decode(buf), { type: 'string' }) : XLSX.read(buf, { type: 'array', cellDates: true });
  return wb.SheetNames.map((name) => {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, raw: false, defval: '' }) as unknown[][];
    return { name, rows: rows.map((r) => r.map((c) => String(c ?? '').trim())).filter((r) => r.some(Boolean)) };
  });
}

export async function extractFile(
  up: RawUpload,
  sf: SourceFile,
  ocrLangs: string,
  update: (patch: Partial<SourceFile>) => void,
): Promise<void> {
  const ext = sf.ext;
  try {
    update({ status: 'reading' });
    const buf = await up.file.arrayBuffer();
    if (ext === 'pdf') {
      const { text, ocr } = await pdfText(buf, (p) => update({ status: 'ocr', progress: p }), ocrLangs);
      update({ text, ocr, status: 'done' });
    } else if (ext === 'docx' || ext === 'docm') {
      update({ text: await docxText(buf), status: 'done' });
    } else if (SHEET_EXT.includes(ext)) {
      const sheets = sheetRows(buf, ext);
      const text = sheets.map((s) => `# ${s.name}\n` + s.rows.map((r) => r.filter(Boolean).join(' | ')).join('\n')).join('\n\n');
      update({ sheets, text, status: 'done' });
    } else if (IMAGE_EXT.includes(ext)) {
      update({ status: 'ocr' });
      const text = await ocrImage(up.file, ocrLangs);
      update({ text, ocr: true, status: 'done' });
    } else if (ext === 'txt' || ext === 'md') {
      update({ text: new TextDecoder().decode(buf), status: 'done' });
    } else {
      update({ status: 'unsupported', error: ext === 'doc' ? 'Old .doc format — save as .docx or PDF' : `.${ext} is not supported` });
    }
  } catch (e) {
    update({ status: 'error', error: e instanceof Error ? e.message : String(e) });
  }
}
