// Report for inbound inspections (a foreign regulator / auditor inspecting this manufacturer).
import { CLAUSES } from '../data/kgmp';
import { COUNTRY_BY_CODE } from '../data/countries';
const countryName = (c: string, lang: Lang) => (COUNTRY_BY_CODE[c] ? (lang === 'ko' ? COUNTRY_BY_CODE[c].ko : COUNTRY_BY_CODE[c].en) : '');
import type { Agency } from '../data/agencies';
import { clauseName, groupBySteps, titleOut, type Block, type Cell, type SiteInfo } from './report';
import type { Lang } from './i18n';
import type { DocRecord } from './types';

const L = (lang: Lang, ko: string, en: string) => (lang === 'ko' ? ko : en);

export function inboundClauses(p: { sterile: boolean; installation: boolean; servicing: boolean; design: boolean }) {
  return CLAUSES.map((c) => c.id).filter((id) =>
    !(!p.sterile && (id === '7.5.5' || id === '7.5.7')) && !(!p.installation && id === '7.5.3') && !(!p.servicing && id === '7.5.4') && !(!p.design && id === '7.3'));
}

export function buildInboundReport(a: { agency: Agency; docs: DocRecord[]; clauses: string[]; site: SiteInfo; lang: Lang; interp?: string }): Block[] {
  const { agency: ag, docs, clauses, site, lang } = a;
  const t = (b: { ko: string; en: string }) => (lang === 'ko' ? b.ko : b.en);
  const b: Block[] = [];
  const name = t(ag.name);
  b.push({ t: 'title', text: L(lang, `${name} 해외 제조소 실사 대비 자료`, `${name} overseas inspection readiness file`), sub: L(lang, `제조소 품질문서 매칭 · 기준: ${ag.criteria.ko}`, `Quality document mapping · Criteria: ${ag.criteria.en}`) });

  b.push({ t: 'h', text: L(lang, '1. 실사 개요', '1. Inspection profile') });
  const row = (k: string, v: string): Cell[] => [{ text: k, shade: 'head' }, v];
  b.push({
    t: 'table', widths: [22, 78], rows: [
      row(L(lang, '실사 방향', 'Direction'), `${name} → ${[site.site, countryName(site.country, lang)].filter(Boolean).join(', ')}`),
      row(L(lang, '제조소', 'Site'), [site.site, site.address, countryName(site.country, lang)].filter(Boolean).join('\n')),
      row(L(lang, '통역 경로', 'Interpretation'), a.interp || ''),
      row(L(lang, '대상 품목', 'Products'), site.product),
      row(L(lang, '기준', 'Criteria'), t(ag.criteria)),
      row(L(lang, '실사 주체', 'Who inspects'), t(ag.who)),
      row(L(lang, '실사 시기·주기', 'When'), t(ag.when)),
      row(L(lang, '사전 통보', 'Notice'), t(ag.notice)),
      row(L(lang, '기간', 'Duration'), t(ag.duration)),
      row(L(lang, '언어', 'Language'), t(ag.language)),
      row(L(lang, '지적·회신 기한', 'Findings & response'), t(ag.findings)),
      row(L(lang, '비용', 'Cost'), t(ag.cost)),
    ],
  });

  b.push({ t: 'h', text: L(lang, '2. 사전 준비 서류', '2. Documents to prepare') });
  b.push({ t: 'table', widths: [8, 80, 12], head: ['No.', L(lang, '서류', 'Document'), L(lang, '준비', 'Ready')], rows: ag.docs.map((d, i) => [{ text: String(i + 1), align: 'center' as const }, t(d), { text: '□', align: 'center' as const }]) });

  b.push({ t: 'h', text: L(lang, `3. ${name} 추가 확인사항 (ISO 13485 외)`, `3. ${name}-specific checks beyond ISO 13485`) });
  b.push({
    t: 'table', widths: [12, 48, 40], head: [L(lang, '조항', 'Clause'), L(lang, '확인사항', 'Check'), 'Related documents'],
    rows: ag.deltas.map((d) => {
      const ds = docs.filter((x) => x.hits.some((h) => h.clause === d.clause));
      return [{ text: d.clause, align: 'center' as const }, L(lang, d.ko, d.en), ds.length ? ds.map((x) => `${titleOut(x, lang)} · ${x.docNo} · Rev ${x.version}`).join('\n') : { text: L(lang, '확인 필요', 'To confirm'), shade: 'gap' as const }] as Cell[];
    }),
  });

  b.push({ t: 'break' });
  b.push({ t: 'h', text: L(lang, `4. ${name} 실사 순서별 Related documents`, `4. Related documents in ${name} inspection order`) });
  const rows: Cell[][] = [];
  for (const g of groupBySteps(docs, clauses, null, ag.steps)) {
    const act = `${g.step.article}  ${lang === 'ko' ? g.step.ko : g.step.en}`;
    if (!g.step.clauses.length) { rows.push([{ text: String(g.step.order), align: 'center' }, act, { text: L(lang, '회의', 'Meeting'), align: 'center' }, '', '', '']); continue; }
    if (!g.docs.length) { rows.push([{ text: String(g.step.order), align: 'center' }, act, { text: L(lang, '근거 문서 확인 필요', 'Evidence to be confirmed'), shade: 'gap' }, { text: '', shade: 'gap' }, { text: '', shade: 'gap' }, { text: '', shade: 'gap' }]); continue; }
    g.docs.forEach(({ doc, clause }, i) => rows.push([{ text: i ? '' : String(g.step.order), align: 'center' }, i ? `  └ ${clause}` : `${act}\n  └ ${clause} ${clauseName(clause, lang)}`, titleOut(doc, lang, clause), doc.docNo, doc.version, doc.revisionDate]));
  }
  b.push({ t: 'table', widths: [7, 30, 31, 14, 8, 10], head: [L(lang, '순서', 'No.'), L(lang, '실사 영역 · 조항', 'Area · clause'), 'SOP Title', 'Document No', 'Final version', 'Revision date'], rows });

  b.push({ t: 'h', text: L(lang, '5. ISO 13485:2016 조항별 점검표', '5. ISO 13485:2016 clause checklist') });
  b.push({
    t: 'table', widths: [9, 33, 10, 48], head: [L(lang, '조항', 'Clause'), L(lang, '요구사항', 'Requirement'), L(lang, '해당', 'Applicable'), 'Related documents'],
    rows: CLAUSES.map((c) => {
      const ap = clauses.includes(c.id);
      const ds = docs.filter((d) => d.hits.some((h) => h.clause === c.id));
      const txt = ds.map((d) => `- SOP Title: ${titleOut(d, lang)}\n- Document No: ${d.docNo}\n- Final version: ${d.version}\n- Revision date: ${d.revisionDate}`).join('\n\n');
      return [{ text: c.id, align: 'center' as const }, lang === 'ko' ? `${c.ko}\n${c.en}` : c.en, { text: ap ? '■' : '□', align: 'center' as const }, ap && !ds.length ? { text: L(lang, '확인 필요', 'To confirm'), shade: 'gap' as const } : txt] as Cell[];
    }),
  });

  b.push({ t: 'h', text: L(lang, '6. 근거', '6. Sources') });
  b.push({ t: 'p', small: true, text: ag.sources.map((s) => `${s.title} — ${s.url}`).join('\n') + L(lang, '\n※ [확인 필요] 표시는 기관 최신 원문으로 재확인하십시오.', '\n※ Re-check items marked [check] against the regulator’s current text.') });
  b.push({ t: 'sign', statement: L(lang, '상기 준비 상태를 확인합니다.', 'Readiness confirmed.'), lines: [{ role: L(lang, '품질책임자 (Quality Representative)', 'Quality Representative') }, { role: L(lang, '제조소 대표 (Site Representative)', 'Site Representative') }] });
  return b;
}
