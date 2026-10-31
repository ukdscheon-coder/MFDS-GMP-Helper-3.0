// Documents built from the gap analysis:
//  - KGMP gap report (pre-assessment for the importer / consultant)
//  - KGMP supplement (annex) to the manufacturer's existing quality manual — closes the Korea-specific gaps without
//    re-issuing the whole QM: cross-reference, exclusion rationale, Korea clauses (KO/EN draft) and an action list.
import { CLAUSE_BY_ID } from '../data/kgmp';
import { KDELTAS } from '../data/kgmp-delta';
import type { Outcome } from '../data/rules';
import { COUNTRY_BY_CODE } from '../data/countries';
import { REG_BASIS, SEV_LABEL, VERDICT_LABEL, type GapResult, type Profile } from './gap';
import type { Lang } from './i18n';
import type { Block, Cell, SiteInfo } from './report';
import type { DocRecord } from './types';

const L = (lang: Lang, ko: string, en: string) => (lang === 'ko' ? ko : en);
const today = () => new Date().toISOString().slice(0, 10);
const EFFORT_TXT = { S: ['0.5–1일', '0.5–1 d'], M: ['2–4일', '2–4 d'], L: ['5–10일', '5–10 d'] } as const;
const STATE_TXT: Record<string, [string, string]> = {
  ok: ['충족', 'Covered'], weak: ['확인 필요', 'To confirm'], 'qm-only': ['QM만', 'QM only'], missing: ['미흡', 'Missing'],
  excluded: ['적용제외', 'Excluded'], 'excluded-review': ['적용제외(근거 확인)', 'Excluded (check)'], conflict: ['적용제외 모순', 'Exclusion conflict'],
};

const procsFor = (docs: DocRecord[], id: string) => docs.filter((d) => d.hits.some((h) => h.clause === id && !h.section && !/^quality manual$/i.test(h.evidence || '')));
const qmSection = (docs: DocRecord[], id: string) => docs.map((d) => d.hits.find((h) => h.clause === id && h.section)?.section).find(Boolean) || '';

export function buildGapReport(a: { gap: GapResult; profile: Profile; docs: DocRecord[]; site: SiteInfo; out: Outcome; lang: Lang }): Block[] {
  const { gap, profile, site, lang, out } = a;
  const b: Block[] = [];
  b.push({ t: 'title', text: L(lang, 'KGMP 사전 갭 분석 보고서', 'KGMP Pre-assessment Gap Report'), sub: L(lang, '해외 제조소 품질문서(QM·SOP) 대비 KGMP 적합성 사전 점검', 'Overseas site quality documents (QM / SOPs) checked against KGMP before the MFDS audit') });
  b.push({ t: 'table', widths: [18, 32, 18, 32], rows: [
    [{ text: L(lang, '제조소', 'Site'), shade: 'head' }, [site.site, COUNTRY_BY_CODE[site.country]?.[lang]].filter(Boolean).join(', '), { text: L(lang, '수입업자', 'Importer'), shade: 'head' }, site.applicant],
    [{ text: L(lang, '품질매뉴얼', 'Quality manual'), shade: 'head' }, profile.qm ? `${profile.qm.docNo} ${profile.qm.title} Rev ${profile.qm.version}`.trim() : L(lang, '인식되지 않음', 'Not identified'), { text: L(lang, '대상 품목', 'Products'), shade: 'head' }, site.product],
    [{ text: L(lang, '준비도', 'Readiness'), shade: 'head' }, `${gap.readiness}% — ${L(lang, VERDICT_LABEL[gap.verdict].ko, VERDICT_LABEL[gap.verdict].en)}`, { text: L(lang, '예상 보완 공수', 'Estimated effort'), shade: 'head' }, `${gap.effortDays[0]}–${gap.effortDays[1]} ${L(lang, '인일', 'man-days')}`],
    [{ text: L(lang, '지적 예상', 'Findings'), shade: 'head' }, `${L(lang, '중대', 'Major')} ${gap.counts.major} · ${L(lang, '경미', 'Minor')} ${gap.counts.minor} · ${L(lang, '관찰', 'Obs.')} ${gap.counts.obs} · ${L(lang, '개선권고', 'OFI')} ${gap.counts.ofi}`, { text: L(lang, '작성일', 'Date'), shade: 'head' }, `${today()}${site.preparedBy ? ' · ' + site.preparedBy : ''}`],
  ] });
  b.push({ t: 'p', small: true, text: L(lang, `기준: ${REG_BASIS.name.ko} · 규칙 버전 ${REG_BASIS.rulesVersion}. ${REG_BASIS.notes.ko}. 본 보고서는 문서 기반 사전 점검이며 MFDS 심사 결과를 대신하지 않습니다.`, `Basis: ${REG_BASIS.name.en} · rules ${REG_BASIS.rulesVersion}. ${REG_BASIS.notes.en}. Document-based pre-assessment; not an MFDS audit result.`) });

  b.push({ t: 'h', text: L(lang, '1. 예상 지적사항과 권장 조치', '1. Expected findings and recommended actions') });
  b.push({
    t: 'table', widths: [6, 9, 10, 37, 28, 10], head: ['No', L(lang, '조항', 'Clause'), L(lang, '등급', 'Grade'), L(lang, '내용', 'Finding'), L(lang, '권장 조치 (QM 전면 개정 없이)', 'Action (no full QM rewrite)'), L(lang, '공수', 'Effort')],
    rows: gap.findings.length ? gap.findings.map((f, i) => [
      { text: String(i + 1), align: 'center' as const }, { text: f.clause, align: 'center' as const },
      { text: L(lang, SEV_LABEL[f.severity].ko, SEV_LABEL[f.severity].en), align: 'center' as const, shade: f.severity === 'major' ? ('gap' as const) : undefined },
      `${L(lang, f.title.ko, f.title.en)}\n${L(lang, f.detail.ko, f.detail.en)}${f.evidence ? `\n· ${f.evidence}` : ''}\n· ${f.ref}`,
      L(lang, f.action.ko, f.action.en), { text: L(lang, EFFORT_TXT[f.effort][0], EFFORT_TXT[f.effort][1]), align: 'center' as const },
    ]) : [[{ text: '–', align: 'center' }, '', '', L(lang, '예상 지적사항 없음', 'No findings expected'), '', '']],
  });

  b.push({ t: 'h', text: L(lang, '2. 조항별 충족 현황', '2. Clause coverage') });
  b.push({
    t: 'table', widths: [22, 14, 34, 30], head: [L(lang, '조항', 'Clause'), L(lang, '판정', 'Status'), L(lang, '관련 절차', 'Procedures'), L(lang, 'QM 해당 장', 'QM section')],
    rows: out.clauses.map((id) => {
      const st = gap.clauseState[id] || 'ok';
      return [`${id} ${L(lang, CLAUSE_BY_ID[id].ko, CLAUSE_BY_ID[id].en)}`, { text: L(lang, STATE_TXT[st][0], STATE_TXT[st][1]), align: 'center' as const, shade: st === 'missing' || st === 'conflict' ? ('gap' as const) : undefined },
        procsFor(a.docs, id).map((d) => `${d.docNo} ${d.title}`.trim()).join('\n'), qmSection(a.docs, id) ? `§${qmSection(a.docs, id)}` : ''] as Cell[];
    }),
  });

  b.push({ t: 'h', text: L(lang, '3. KGMP 고유 요구사항 (ISO 13485 대비)', '3. Korea-specific expectations (beyond ISO 13485)') });
  b.push({
    t: 'table', widths: [6, 10, 34, 14, 36], head: ['ID', L(lang, '조항', 'Clause'), L(lang, '요구사항', 'Expectation'), L(lang, '상태', 'Status'), L(lang, '확인 위치', 'Found in')],
    rows: KDELTAS.map((d) => {
      const s = gap.deltaState[d.id];
      const txt = s === 'met' ? L(lang, '반영됨', 'Addressed') : s === 'generic' ? L(lang, '한국 미명시', 'Not for Korea') : s === 'missing' ? L(lang, '없음', 'Missing') : L(lang, '해당 없음', 'N/A');
      const hit = profile.deltas[d.id];
      return [d.id, { text: d.clause, align: 'center' as const }, L(lang, d.title.ko, d.title.en), { text: txt, align: 'center' as const, shade: s === 'missing' ? ('gap' as const) : undefined }, hit?.where ? `${hit.where}${hit.snippet ? `: ${hit.snippet.slice(0, 80)}` : ''}` : ''] as Cell[];
    }),
  });
  return b;
}

export function buildAnnex(a: { gap: GapResult; profile: Profile; docs: DocRecord[]; site: SiteInfo; out: Outcome }): Block[] {
  const { gap, profile, docs, site, out } = a;
  const qmNo = profile.qm?.docNo || 'QM';
  const b: Block[] = [];
  b.push({ t: 'title', text: '품질매뉴얼 KGMP 부속서 / KGMP Supplement to the Quality Manual', sub: `${qmNo}${profile.qm?.version ? ` Rev ${profile.qm.version}` : ''} — 초안 / DRAFT` });
  b.push({ t: 'table', widths: [20, 30, 20, 30], rows: [
    [{ text: '문서번호 / Doc No', shade: 'head' }, `${qmNo}-KR`, { text: '개정 / Revision', shade: 'head' }, '00'],
    [{ text: '제조소 / Site', shade: 'head' }, [site.site, COUNTRY_BY_CODE[site.country]?.en].filter(Boolean).join(', '), { text: '수입업자 / Korean importer', shade: 'head' }, site.applicant || '[Importer]'],
    [{ text: '시행일 / Effective', shade: 'head' }, '[YYYY-MM-DD]', { text: '작성 기준 / Prepared', shade: 'head' }, `${today()} · rules ${REG_BASIS.rulesVersion}`],
  ] });

  b.push({ t: 'h', text: '1. 목적 및 적용범위 / Purpose and scope' });
  b.push({ t: 'p', text: `본 부속서는 기존 품질매뉴얼 ${qmNo}를 변경하지 않고, 대한민국 「의료기기 제조 및 품질관리 기준」(KGMP) 적합성 심사에 필요한 조항 대응 관계와 한국 고유 요구사항을 보완한다. 본 부속서와 품질매뉴얼이 상충하는 경우 대한민국 공급 제품에 대하여는 본 부속서를 우선 적용한다.` });
  b.push({ t: 'p', text: `This supplement does not change quality manual ${qmNo}. It maps the existing quality system to the Korean Medical Device GMP (KGMP) and adds the Korea-specific requirements. For product supplied to the Republic of Korea, this supplement prevails where it differs from the quality manual.` });

  b.push({ t: 'h', text: '2. KGMP–품질매뉴얼 대응표 / KGMP cross-reference' });
  b.push({
    t: 'table', widths: [26, 18, 40, 16], head: ['KGMP (ISO 13485:2016)', 'QM', '절차 / Procedures', '상태 / Status'],
    rows: out.clauses.map((id) => {
      const st = gap.clauseState[id] || 'ok';
      const procs = procsFor(docs, id).map((d) => `${d.docNo} ${d.title}`.trim());
      return [`${id} ${CLAUSE_BY_ID[id].ko} / ${CLAUSE_BY_ID[id].en}`, qmSection(docs, id) ? `§${qmSection(docs, id)}` : '', procs.join('\n') || (st === 'ok' ? '— (QM)' : '[작성 예정 / to be issued]'), { text: `${STATE_TXT[st][0]} / ${STATE_TXT[st][1]}`, shade: st === 'missing' || st === 'conflict' ? ('gap' as const) : undefined }] as Cell[];
    }),
  });

  b.push({ t: 'h', text: '3. 적용제외 및 근거 / Exclusions and rationale' });
  b.push({
    t: 'table', widths: [20, 50, 30], head: ['조항 / Clause', 'QM 근거 / QM rationale', '대한민국 허가 품목 적용 / For Korean-licensed products'],
    rows: profile.exclusions.length ? profile.exclusions.map((x) => [`${x.clause} ${CLAUSE_BY_ID[x.clause]?.en || ''}`, x.text, gap.clauseState[x.clause] === 'conflict' ? { text: '모순 — 철회 필요 / Conflict — withdraw', shade: 'gap' as const } : '[동일 근거 적용 / Same rationale applies]'] as Cell[])
      : [['–', 'QM에 적용제외 기재 없음 / No exclusions stated in the QM', '']],
  });

  b.push({ t: 'h', text: '4. 대한민국 고유 요구사항 / Korea-specific requirements' });
  const open = KDELTAS.filter((d) => gap.deltaState[d.id] && gap.deltaState[d.id] !== 'n/a');
  open.forEach((d, i) => {
    const s = gap.deltaState[d.id];
    b.push({ t: 'p', text: `K.${i + 1} ${d.title.ko} / ${d.title.en}  (KGMP ${d.clause}${s === 'met' ? ' — 기존 문서 반영 / already addressed' : ''})` });
    if (s === 'met') { const h = profile.deltas[d.id]; b.push({ t: 'p', small: true, text: `→ ${h?.where || ''}${h?.snippet ? ` — "${h.snippet}"` : ''}` }); return; }
    b.push({ t: 'p', text: d.annex.ko });
    b.push({ t: 'p', text: d.annex.en });
    b.push({ t: 'p', small: true, text: `근거 / Ref.: ${d.ref}` });
  });

  b.push({ t: 'h', text: '5. 보완 조치 계획 / Action plan' });
  b.push({
    t: 'table', widths: [7, 9, 10, 42, 16, 16], head: ['No', 'KGMP', '등급 / Grade', '조치 / Action', '담당 / Owner', '완료 예정 / Due'],
    rows: gap.findings.length ? gap.findings.map((f, i) => [{ text: String(i + 1), align: 'center' as const }, { text: f.clause, align: 'center' as const }, { text: `${SEV_LABEL[f.severity].ko} / ${SEV_LABEL[f.severity].en}`, align: 'center' as const }, `${f.action.ko}\n${f.action.en}`, '', ''] as Cell[])
      : [['–', '', '', '보완 필요 사항 없음 / None', '', '']],
  });
  b.push({ t: 'sign', statement: '본 부속서는 위 제조소 품질경영시스템의 일부로 승인되었다. / This supplement is approved as part of the site quality management system.', lines: [{ role: '작성 / Prepared' }, { role: '검토 / Reviewed (QA)' }, { role: '승인 / Approved (Management)' }] });
  return b;
}
