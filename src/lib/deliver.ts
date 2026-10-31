import * as XLSX from 'xlsx';
import { clauseName, titleOut, type StepDocs } from './report';
import type { Lang } from './i18n';
import type { DocRecord } from './types';

type ClaudeHost = { use: (n: string) => Promise<unknown> };
/** True inside the claude.ai preview frame (Artifact), where direct downloads and print are blocked. */
export const inPreview = () => typeof window !== 'undefined' && !!(window as unknown as { claude?: ClaudeHost }).claude;

/** Save a file. In the claude.ai preview it goes through the viewer's save prompt; elsewhere a normal browser download. */
export async function download(blob: Blob, filename: string): Promise<void> {
  const host = (window as unknown as { claude?: ClaudeHost }).claude;
  if (host) {
    const dl = (await host.use('downloads').catch(() => null)) as null | { save: (r: { filename: string; data: Blob }) => Promise<unknown> };
    if (dl) {
      let name = filename, data = blob;
      if (/\.hwpx$/i.test(name)) { // .hwpx is not on the preview's save allowlist → hand it over inside a .zip
        const { default: JSZip } = await import('jszip');
        const z = new JSZip(); z.file(name, blob);
        data = await z.generateAsync({ type: 'blob', compression: 'STORE' }); name = name.replace(/\.hwpx$/i, '_hwpx.zip');
      }
      try { await dl.save({ filename: name, data }); } catch (e) { if ((e as { code?: string }).code !== 'declined') throw new Error((e as { message?: string }).message || 'save failed'); }
      return;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export function xlsxBlob(groups: StepDocs[], lang: Lang, unmatched: DocRecord[]): Blob {
  const ko = lang === 'ko';
  const rows: string[][] = [[ko ? '순서' : 'Order', 'Day', 'KGMP (ISO 13485:2016)', ko ? '심사 활동' : 'Activity', ko ? '담당' : 'Auditor', ko ? '해당 조항' : 'Clause', 'SOP Title', 'Document No', 'Final version', 'Revision date', ko ? '원문 제목' : 'Original title', ko ? '파일' : 'File']];
  for (const g of groups) {
    const base = [String(g.step.order), g.step.dayN ? `Day ${g.step.dayN}` : "", g.step.article, ko ? g.step.ko : g.step.en, g.step.auditor === 'QMS' ? (ko ? '심사기관' : 'QMS auditor') : g.step.auditor];
    if (!g.docs.length) rows.push([...base, '', g.step.clauses.length ? (ko ? '근거 문서 확인 필요' : 'Evidence to be confirmed') : '', '', '', '', '', '']);
    for (const { doc, clause } of g.docs) rows.push([...base, `${clause} ${clauseName(clause, lang)}`, titleOut(doc, lang, clause), doc.docNo, doc.version, doc.revisionDate, doc.title, doc.fileNames.join(', ')]);
  }
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [6, 7, 14, 36, 10, 28, 44, 18, 12, 14, 40, 30].map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(wb, ws, 'Audit Plan');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Title', 'Document No', 'Final version', 'Revision date', 'File'], ...unmatched.map((d) => [d.title, d.docNo, d.version, d.revisionDate, d.fileNames.join(', ')])]), ko ? '미매칭 문서' : 'Unmatched');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

const toB64 = (blob: Blob) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });

export type MailResult = 'shared' | 'sent' | 'mailto' | 'cancelled';

/** Email the report: server (Resend) if configured and recipient given → OS share sheet with the file → mailto + download. */
export async function emailReport(opts: { blob: Blob; filename: string; subject: string; text: string; to: string; serverEmail: boolean }): Promise<MailResult> {
  if (opts.serverEmail && opts.to) {
    const r = await fetch('/api/email', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ to: opts.to, subject: opts.subject, text: opts.text, filename: opts.filename, contentBase64: await toB64(opts.blob) }) });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Email ${r.status}`);
    return 'sent';
  }
  const file = new File([opts.blob], opts.filename, { type: opts.blob.type });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare && nav.canShare({ files: [file] })) {
    try { await nav.share({ files: [file], title: opts.subject, text: opts.text }); return 'shared'; } catch (e) { if ((e as Error).name === 'AbortError') return 'cancelled'; }
  }
  await download(opts.blob, opts.filename);
  if (inPreview()) return 'mailto';
  const body = `${opts.text}\n\n(첨부: ${opts.filename} — 방금 내려받은 파일을 첨부해 주세요 / please attach the downloaded file)`;
  window.location.href = `mailto:${encodeURIComponent(opts.to)}?subject=${encodeURIComponent(opts.subject)}&body=${encodeURIComponent(body)}`;
  return 'mailto';
}
