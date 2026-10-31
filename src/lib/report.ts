// Report model in MFDS submission-form layout, shared by the HWPX / DOCX / PDF / print renderers.
import { AUDIT_STEPS, CLAUSES, CLAUSE_BY_ID, type AuditStep } from '../data/kgmp';
import type { AuditConfig, Outcome } from '../data/rules';
import { COUNTRY_BY_CODE } from '../data/countries';
import { glossaryKo } from './ai';
import type { Lang } from './i18n';
import type { DocRecord } from './types';

export interface SiteInfo { site: string; address: string; applicant: string; product: string; preparedBy: string; country: string }
export const EMPTY_SITE: SiteInfo = { site: '', address: '', applicant: '', product: '', preparedBy: '', country: '' };

export type Cell = string | { text: string; bold?: boolean; shade?: 'head' | 'gap'; align?: 'center' | 'left' };
export type Block =
  | { t: 'title'; text: string; sub?: string }
  | { t: 'h'; text: string }
  | { t: 'p'; text: string; small?: boolean }
  | { t: 'table'; widths: number[]; head?: string[]; rows: Cell[][] }
  | { t: 'sign'; lines: { role: string }[]; statement: string }
  | { t: 'break' };

export interface StepDocs { step: AuditStep & { dayN: number }; docs: { doc: DocRecord; clause: string }[] }

/** Keep only steps with applicable clauses and spread them over the audit length (default 4 days, order preserved). */
export function scheduleSteps(applicable: string[], days: number | null, plan: AuditStep[] = AUDIT_STEPS): (AuditStep & { dayN: number; clausesApplicable: string[] })[] {
  const steps = plan.map((s) => ({ ...s, clausesApplicable: s.clauses.filter((c) => applicable.includes(c)) }))
    .filter((s) => !s.clauses.length || s.clausesApplicable.length);
  if (plan !== AUDIT_STEPS) return steps.map((s) => ({ ...s, dayN: 0 })); // foreign regulator plans: order only, no days
  const n = days || 4;
  if (n === 4 && steps.length === AUDIT_STEPS.length) return steps.map((s) => ({ ...s, dayN: s.day }));
  const body = steps.filter((s) => s.clauses.length);
  const per = Math.ceil(body.length / n);
  let k = 0;
  return steps.map((s) => {
    if (s.order <= 2) return { ...s, dayN: 1 };
    if (s.order === 30) return { ...s, dayN: n };
    const d = Math.min(n, Math.floor(k / per) + 1);
    k++;
    return { ...s, dayN: d };
  });
}

export function groupBySteps(docs: DocRecord[], applicable: string[] = CLAUSES.map((c) => c.id), days: number | null = 4, plan: AuditStep[] = AUDIT_STEPS): StepDocs[] {
  return scheduleSteps(applicable, days, plan).map((step) => {
    const list: { doc: DocRecord; clause: string }[] = [];
    for (const c of step.clausesApplicable) {
      for (const d of docs) if (d.hits.some((h) => h.clause === c) && !list.some((x) => x.doc.key === d.key)) list.push({ doc: d, clause: c });
    }
    // procedures first, the quality manual section after them
    const sc = (x: { doc: DocRecord; clause: string }) => x.doc.hits.find((h) => h.clause === x.clause)?.score ?? 0;
    list.sort((a, b) => sc(b) - sc(a));
    return { step: { ...step, clauses: step.clausesApplicable }, docs: list };
  });
}

export const auditorLabel = (a: string, lang: Lang) => (a === 'QMS' ? (lang === 'ko' ? '심사기관' : 'QMS auditor') : a);
export const clauseName = (id: string, lang: Lang) => (lang === 'ko' ? CLAUSE_BY_ID[id]?.ko : CLAUSE_BY_ID[id]?.en) || id;

export function titleOut(d: DocRecord, out: Lang, clause?: string): string {
  const sec = clause ? d.hits.find((h) => h.clause === clause)?.section : undefined;
  const tail = sec ? ` — §${sec}` : '';
  if (out === 'en') return d.title + tail;
  const ko = (d.titleKo || glossaryKo(d.title)).replace(/^(.+?)\s*\(\1\)$/, '$1');
  return (ko && ko !== d.title ? `${ko} (${d.title})` : d.title) + tail;
}

const L = (lang: Lang, ko: string, en: string) => (lang === 'ko' ? ko : en);

const REVIEW = { initial: ['최초심사', 'Initial'], periodic: ['정기심사', 'Periodic'], change: ['변경심사', 'Change of site'], additional: ['추가심사', 'Additional product group'] } as const;
const PURPOSE = { domestic: ['국내 판매용', 'Domestic sale'], export: ['수출용', 'Export only'], clinical: ['임상시험용', 'Clinical investigation'] } as const;
const ROLE = { single: ['단독 제조소', 'Single manufacturer'], giver: ['제조의뢰자', 'Contract giver (legal manufacturer)'], maker: ['제조자(수탁)', 'Contract manufacturer'] } as const;

export function buildReport(args: { docs: DocRecord[]; cfg: AuditConfig; out: Outcome; site: SiteInfo; lang: Lang }): Block[] {
  const { docs, cfg, out, site, lang } = args;
  const today = new Date().toISOString().slice(0, 10);
  const groups = groupBySteps(docs, out.clauses, out.days);
  const blocks: Block[] = [];
  const box = (b: boolean) => (b ? '■' : '□');

  blocks.push({ t: 'title', text: L(lang, '의료기기 적합성인정등 심사 준비자료', 'KGMP Conformity Assessment – Preparation File'), sub: L(lang, '제조소 품질문서 관리 개요 및 [별표 2] 기준 점검표 · KGMP (ISO 13485:2016)', 'Outline of quality documents and KGMP standard checklist · KGMP (ISO 13485:2016)') });

  // 1. 기본정보
  blocks.push({ t: 'h', text: L(lang, '1. 심사 기본정보', '1. Audit information') });
  const methodTxt = out.method === 'onsite' ? L(lang, '현장조사 + 서류검토', 'On-site + document review') : L(lang, '서류검토만', 'Document review only');
  blocks.push({
    t: 'table', widths: [18, 32, 18, 32], rows: [
      [{ text: L(lang, '제조소 명칭', 'Site'), shade: 'head' }, site.site, { text: L(lang, '신청인(수입업자)', 'Applicant (importer)'), shade: 'head' }, site.applicant],
      [{ text: L(lang, '제조소 소재지', 'Address'), shade: 'head' }, [site.address, COUNTRY_BY_CODE[site.country]?.[lang]].filter(Boolean).join(', '), { text: L(lang, '대상 품목(군)', 'Products'), shade: 'head' }, site.product],
      [{ text: L(lang, '심사 구분', 'Review type'), shade: 'head' }, `${L(lang, REVIEW[cfg.reviewType][0], REVIEW[cfg.reviewType][1])} · ${L(lang, PURPOSE[cfg.purpose][0], PURPOSE[cfg.purpose][1])}`, { text: L(lang, '의료기기 등급', 'Device class'), shade: 'head' }, `${cfg.grade}${L(lang, '등급', '')}`],
      [{ text: L(lang, '심사 방법', 'Method'), shade: 'head' }, methodTxt, { text: L(lang, '심사 주체', 'Authority'), shade: 'head' }, L(lang, out.authorityNote.ko, out.authorityNote.en)],
      [{ text: L(lang, '제조소 구분', 'Site role'), shade: 'head' }, L(lang, ROLE[cfg.role][0], ROLE[cfg.role][1]), { text: L(lang, '현장조사 일수', 'On-site days'), shade: 'head' }, out.days ? `${out.days}${L(lang, '일 (예상)', ' days (est.)')}` : '–'],
      [{ text: L(lang, '적용 기준', 'Criteria'), shade: 'head' }, `KGMP (ISO 13485:2016) · ${L(lang, out.clauseBasis.ko, out.clauseBasis.en)}`, { text: L(lang, '인정서 유효기간', 'Validity'), shade: 'head' }, L(lang, out.validity.ko, out.validity.en)],
      [{ text: L(lang, '인정번호 심사구분', 'Certificate code'), shade: 'head' }, `${out.certCode} (${L(lang, '별표 5', 'Annex 5')})`, { text: L(lang, '작성일', 'Prepared'), shade: 'head' }, `${today}${site.preparedBy ? ' · ' + site.preparedBy : ''}`],
    ],
  });

  // 2. 판단 근거
  blocks.push({ t: 'h', text: L(lang, '2. 심사 조합 판단 근거 및 유의사항', '2. Basis and notes') });
  blocks.push({
    t: 'table', widths: [12, 70, 18], head: [L(lang, '구분', 'Type'), L(lang, '내용', 'Detail'), L(lang, '근거', 'Reference')],
    rows: [
      ...out.reasons.map((r) => [{ text: r.level === 'must' ? L(lang, '필수', 'Must') : L(lang, '판단', 'Basis'), align: 'center' as const }, L(lang, r.ko, r.en), r.ref]),
      ...out.warnings.map((r) => [{ text: L(lang, '유의', 'Note'), align: 'center' as const, shade: r.level === 'info' ? undefined : ('gap' as const) }, L(lang, r.ko, r.en), r.ref]),
      ...out.deadlines.map((d) => [{ text: L(lang, '기한', 'Deadline'), align: 'center' as const }, L(lang, d.ko, d.en), L(lang, '고시 제7·8조', 'Art. 7–8')]),
    ],
  });

  // 3. 구비서류 체크리스트
  blocks.push({ t: 'h', text: L(lang, '3. 구비서류 체크리스트 (고시 제7조)', '3. Submission checklist (Art. 7)') });
  blocks.push({
    t: 'table', widths: [10, 56, 12, 12, 10],
    head: [L(lang, '목', 'Item'), L(lang, '서류', 'Document'), L(lang, '구분', 'Need'), L(lang, '대상', 'For'), L(lang, '제출', 'Done')],
    rows: out.documents.map((d) => [
      { text: d.code, align: 'center' as const }, L(lang, d.ko, d.en) + (d.note ? ` — ${L(lang, d.note.ko, d.note.en)}` : ''),
      { text: d.required === 'yes' ? L(lang, '필수', 'Required') : L(lang, '해당 시', 'If applicable'), align: 'center' as const },
      { text: d.for === 'both' ? L(lang, '의뢰자·제조자', 'Both') : d.for === 'giver' ? L(lang, '제조의뢰자', 'Giver') : '–', align: 'center' as const },
      { text: '□', align: 'center' as const },
    ]),
  });

  // 4. 품질문서 관리 개요 (타목)
  blocks.push({ t: 'break' });
  blocks.push({ t: 'h', text: L(lang, '4. 제조소의 품질문서 관리 개요 (제7조제1항제2호 타목)', '4. Outline of quality document management') });
  const ovRows: Cell[][] = [];
  for (const id of out.clauses) {
    const ds = docs.filter((d) => d.hits.some((h) => h.clause === id));
    if (!ds.length) ovRows.push([`${id} ${clauseName(id, lang)}`, { text: L(lang, '근거 문서 확인 필요', 'Evidence to be confirmed'), shade: 'gap' }, { text: '', shade: 'gap' }, { text: '', shade: 'gap' }, { text: '', shade: 'gap' }]);
    for (const d of ds) ovRows.push([`${id} ${clauseName(id, lang)}`, titleOut(d, lang, id), d.docNo, d.version, d.revisionDate]);
  }
  blocks.push({ t: 'table', widths: [24, 36, 16, 10, 14], head: [L(lang, '관련 조항', 'Clause'), L(lang, '관련 절차명', 'Procedure'), L(lang, '문서번호', 'Document No'), L(lang, '최종버전', 'Final version'), L(lang, '제·개정일자', 'Revision date')], rows: ovRows });

  // 5. Audit plan 순서별 Related documents
  blocks.push({ t: 'break' });
  blocks.push({ t: 'h', text: L(lang, '5. MFDS Audit Plan 순서별 Related documents', '5. Related documents in MFDS audit-plan order') });
  const apRows: Cell[][] = [];
  for (const g of groups) {
    const head = `${g.step.order}. Day ${g.step.dayN}`;
    const act = `${g.step.article}  ${lang === 'ko' ? g.step.ko : g.step.en}\n(${auditorLabel(g.step.auditor, lang)})`;
    if (!g.step.clauses.length) { apRows.push([head, act, { text: L(lang, '회의·투어', 'Meeting / tour'), align: 'center' }, '', '', '']); continue; }
    if (!g.docs.length) { apRows.push([head, act, { text: L(lang, '근거 문서 확인 필요', 'Evidence to be confirmed'), shade: 'gap' }, { text: '', shade: 'gap' }, { text: '', shade: 'gap' }, { text: '', shade: 'gap' }]); continue; }
    g.docs.forEach(({ doc, clause }, i) => apRows.push([i ? '' : head, i ? '' : act, titleOut(doc, lang, clause), doc.docNo, doc.version, doc.revisionDate]));
  }
  blocks.push({ t: 'table', widths: [10, 27, 31, 14, 8, 10], head: [L(lang, '순서', 'Order'), L(lang, 'KGMP · 심사 활동 (담당)', 'KGMP · Activity (Auditor)'), 'SOP Title', 'Document No', 'Final version', 'Revision date'], rows: apRows });

  // 6. 별표 2 기준 점검표 ([붙임 1] 양식)
  blocks.push({ t: 'break' });
  blocks.push({ t: 'h', text: L(lang, '6. 제조소의 [별표 2] 기준 점검표 ([붙임 1] 양식)', '6. KGMP standard checklist ([Attachment 1] form)') });
  blocks.push({ t: 'p', small: true, text: L(lang, '※ 한 조항에 절차서가 둘 이상이면 추가 확인사항에 모두 적습니다. 준수 여부는 제조소가 확인 후 표시합니다.', '※ List every related SOP. The site marks compliance after review.') });
  const clRows: Cell[][] = CLAUSES.map((c) => {
    const applicable = out.clauses.includes(c.id);
    const ds = docs.filter((d) => d.hits.some((h) => h.clause === c.id));
    const extra = ds.length
      ? ds.map((d) => `- SOP Title: ${titleOut(d, lang)}\n- Document No: ${d.docNo}\n- Final version: ${d.version}\n- Revision date: ${d.revisionDate}`).join('\n\n')
      : applicable ? `- SOP Title:\n- Document No:\n- Final version:\n- Revision date:` : '';
    return [
      { text: c.id, align: 'center' as const }, lang === 'ko' ? `${c.ko}\n${c.en}` : c.en,
      { text: `${box(applicable)} ${L(lang, '예', 'Y')}\n${box(!applicable)} ${L(lang, '아니오', 'N')}`, align: 'center' as const },
      { text: `□ ${L(lang, '예', 'Y')}\n□ ${L(lang, '아니오', 'N')}`, align: 'center' as const },
      applicable && !ds.length ? { text: extra, shade: 'gap' as const } : extra,
    ];
  });
  blocks.push({ t: 'table', widths: [8, 28, 10, 10, 44], head: [L(lang, '관련 조항', 'Article'), L(lang, '요구사항', 'Requirement'), L(lang, '해당 여부', 'Applicable'), L(lang, '준수 여부', 'Compliant'), L(lang, '추가 확인사항 (Related documents)', 'Additional information (Related documents)')], rows: clRows });

  blocks.push({ t: 'sign', statement: L(lang, '상기 내용이 사실과 다름없음을 확인합니다.', 'We confirm that the above information is correct.'), lines: [{ role: L(lang, '품질책임자 (Quality Representative)', 'Quality Representative') }, { role: L(lang, '제조소 대표 (Site Representative)', 'Site Representative') }] });
  return blocks;
}

export function reportText(groups: StepDocs[], lang: Lang): string {
  const lines: string[] = [];
  let day = 0;
  for (const g of groups) {
    if (g.step.dayN && g.step.dayN !== day) { day = g.step.dayN; lines.push('', `===== Day ${day} =====`); }
    lines.push('', `${g.step.order}. [${g.step.article}] ${lang === 'ko' ? g.step.ko : g.step.en} — ${auditorLabel(g.step.auditor, lang)}`);
    if (!g.step.clauses.length) continue;
    if (!g.docs.length) { lines.push(L(lang, '  (근거 문서 없음 — 확인 필요)', '  (no evidence found)')); continue; }
    for (const { doc, clause } of g.docs) {
      lines.push(`Related documents (${clause} ${clauseName(clause, lang)})`, `- SOP Title: ${titleOut(doc, lang, clause)}`, `- Document No: ${doc.docNo}`, `- Final version: ${doc.version}`, `- Revision date: ${doc.revisionDate}`);
    }
  }
  return lines.join('\n').trim();
}

export const cellText = (c: Cell) => (typeof c === 'string' ? c : c.text);
