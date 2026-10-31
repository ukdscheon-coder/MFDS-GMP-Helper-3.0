// KGMP gap analysis: what an MFDS audit team is likely to raise at the overseas site, found in advance from the QM / SOPs.
// Grading follows the ISO 19011 / MDSAP habit (major · minor · observation · opportunity for improvement) so the result reads
// like an audit pre-assessment. The recommended actions deliberately avoid rewriting the manufacturer's whole QM: each gap is
// closed by a targeted addition — usually one clause in a KGMP supplement (annex) to the existing QM.
import { CLAUSE_BY_ID, stepForClause } from '../data/kgmp';
import { KDELTAS, KOREA, type Bi, type Effort, type Severity } from '../data/kgmp-delta';
import type { AuditConfig, Outcome } from '../data/rules';
import type { Exclusion } from './analyze';
import type { DocRecord, SourceFile } from './types';

export type { Severity, Effort } from '../data/kgmp-delta';

/** Regulatory basis the analysis was made against — stored with every result so a later rule change can re-trigger it. */
export const REG_BASIS = {
  id: 'KR-MFDS-KGMP',
  name: { ko: '의료기기 제조 및 품질관리 기준(식약처 고시) [별표2] — ISO 13485:2016 구조', en: 'MFDS Medical Device GMP (KGMP) Notice, Annex 2 — ISO 13485:2016 structure' },
  rulesVersion: '2026.10.29',
  notes: { ko: 'MDSAP 관련 항목은 고시 제2026-46호 기준. [확인 필요] 표시는 현행 원문 대조 후 인용', en: 'MDSAP items per Notice 2026-46. Items marked [check] must be verified against the current text' },
};

export type DeltaStatus = 'met' | 'generic' | 'missing';
export interface DeltaHit { status: DeltaStatus; where?: string; snippet?: string }

/** Evidence collected at analysis time (needs the file texts, which are not kept after reload). */
export interface Profile {
  exclusions: Exclusion[];
  deltas: Record<string, DeltaHit>;
  qm?: { docNo: string; title: string; version: string };
  analysedAt: string;
}

export const EMPTY_PROFILE: Profile = { exclusions: [], deltas: {}, analysedAt: '' };

export function buildProfile(files: SourceFile[], docs: DocRecord[], exclusions: Exclusion[]): Profile {
  const texts = files.filter((f) => f.status === 'done' && f.text.trim()).map((f) => ({ name: f.name, lines: f.text.split('\n') }));
  const deltas: Record<string, DeltaHit> = {};
  for (const d of KDELTAS) {
    let generic: DeltaHit | null = null;
    let met: DeltaHit | null = null;
    for (const t of texts) {
      for (let i = 0; i < t.lines.length && !met; i++) {
        if (!d.topic.test(t.lines[i])) continue;
        const snippet = t.lines[i].replace(/\s+/g, ' ').trim().slice(0, 140);
        generic ||= { status: 'generic', where: t.name, snippet };
        const win = t.lines.slice(Math.max(0, i - 3), i + 4).join(' ');
        if ((d.korea || KOREA).test(win)) met = { status: 'met', where: t.name, snippet };
      }
      if (met) break;
    }
    deltas[d.id] = met || generic || { status: 'missing' };
  }
  const qmDoc = docs.find((d) => d.hits.some((h) => h.clause === '4.2.2' && /quality manual/i.test(h.evidence || '')) || /quality manual|품질\s*매뉴얼|qualitätsmanagementhandbuch|manuale della qualit/i.test(d.title));
  return { exclusions, deltas, qm: qmDoc ? { docNo: qmDoc.docNo, title: qmDoc.title, version: qmDoc.version } : undefined, analysedAt: new Date().toISOString() };
}

// ISO 13485:2016 clauses that require a documented procedure / documented arrangements (the usual "procedure missing" findings)
const PROC_REQUIRED = new Set(['4.2.3', '4.2.4', '4.2.5', '5.6', '6.2', '6.3', '6.4', '7.1', '7.2', '7.3', '7.4', '7.5.1', '7.5.2', '7.5.6', '7.5.7', '7.5.8', '7.5.9', '7.5.11', '7.6', '8.2.1', '8.2.2', '8.2.3', '8.2.4', '8.3', '8.4', '8.5']);

// QM exclusions that contradict the product / process conditions chosen for the audit
const CONFLICTS: { clause: string; when: (c: AuditConfig) => boolean; why: Bi }[] = [
  { clause: '7.3', when: (c) => c.design, why: { ko: '심사 조건에서 "제조소가 설계·개발 수행"으로 선택했습니다', en: 'Audit conditions say the site performs design and development' } },
  { clause: '7.5.5', when: (c) => c.sterile, why: { ko: '멸균 의료기기로 선택했습니다', en: 'Product is selected as sterile' } },
  { clause: '7.5.7', when: (c) => c.sterile, why: { ko: '멸균 의료기기로 선택했습니다', en: 'Product is selected as sterile' } },
  { clause: '6.4', when: (c) => c.sterile, why: { ko: '멸균 제품은 작업환경·오염관리가 필수입니다', en: 'Sterile products require contamination control' } },
  { clause: '7.5.3', when: (c) => c.installation, why: { ko: '설치가 필요한 제품으로 선택했습니다', en: 'Product requires installation' } },
  { clause: '7.5.4', when: (c) => c.servicing, why: { ko: '서비스가 필요한 제품으로 선택했습니다', en: 'Product requires servicing' } },
];

export type ClauseState = 'ok' | 'weak' | 'qm-only' | 'missing' | 'excluded' | 'conflict' | 'excluded-review';

export interface Finding {
  id: string;
  kind: 'clause' | 'korea' | 'exclusion';
  clause: string;
  severity: Severity;
  title: Bi;
  detail: Bi;
  action: Bi;
  ref: string;
  effort: Effort;
  evidence?: string;
  deltaId?: string;
}

export interface GapResult {
  findings: Finding[];
  clauseState: Record<string, ClauseState>;
  deltaState: Record<string, DeltaStatus | 'n/a'>;
  readiness: number; // 0–100
  verdict: 'ready' | 'fix' | 'major';
  counts: Record<Severity, number>;
  effortDays: [number, number];
  basis: typeof REG_BASIS;
}

const EFFORT_DAYS: Record<Effort, [number, number]> = { S: [0.5, 1], M: [2, 4], L: [5, 10] };
const SEV_ORDER: Record<Severity, number> = { major: 0, minor: 1, obs: 2, ofi: 3 };

const isQmHit = (d: DocRecord, clause: string, qmKey?: string) => {
  const h = d.hits.find((x) => x.clause === clause);
  return !!h && (!!h.section || (!!qmKey && d.docNo === qmKey) || /^quality manual$/i.test(h.evidence || ''));
};

export function evaluateGaps(docs: DocRecord[], profile: Profile, cfg: AuditConfig, out: Outcome): GapResult {
  const findings: Finding[] = [];
  const clauseState: Record<string, ClauseState> = {};
  const qmKey = profile.qm?.docNo || undefined;
  const next = (p: string, key: string) => `${p}-${key}`; // stable ids: the site's replies are keyed by them

  // 1) exclusions written in the QM
  for (const x of profile.exclusions) {
    if (x.sub && !CONFLICTS.some((c) => x.sub!.startsWith(c.clause) && c.when(cfg))) continue; // only a sub-clause (e.g. 7.5.9.2 implants) is excluded
    const conflict = CONFLICTS.find((c) => (x.clause === c.clause || x.clause.startsWith(c.clause + '.')) && c.when(cfg));
    if (conflict) {
      clauseState[x.clause] = 'conflict';
      findings.push({
        id: next('E', x.clause), kind: 'exclusion', clause: x.clause, severity: 'major',
        title: { ko: `적용제외가 제품 조건과 모순 — ${x.clause} ${CLAUSE_BY_ID[x.clause]?.ko || ''}`, en: `Exclusion contradicts the product — ${x.clause} ${CLAUSE_BY_ID[x.clause]?.en || ''}` },
        detail: { ko: `QM은 이 조항을 적용제외로 기재했지만 ${conflict.why.ko}. "${x.text}"`, en: `The QM excludes this clause, but ${conflict.why.en.toLowerCase()}. "${x.text}"` },
        action: { ko: '적용제외를 철회하고 해당 절차를 마련하거나, 제품 조건이 틀렸다면 심사 조건을 수정', en: 'Withdraw the exclusion and provide the procedure, or correct the audit conditions if they are wrong' },
        ref: 'KGMP [별표2] 4.2.2 (적용제외 정당화)', effort: 'L', evidence: x.where,
      });
    } else if (out.clauses.includes(x.clause)) {
      clauseState[x.clause] = 'excluded-review';
      findings.push({
        id: next('E', x.clause), kind: 'exclusion', clause: x.clause, severity: 'obs',
        title: { ko: `적용제외 근거 확인 — ${x.clause} ${CLAUSE_BY_ID[x.clause]?.ko || ''}`, en: `Check exclusion rationale — ${x.clause} ${CLAUSE_BY_ID[x.clause]?.en || ''}` },
        detail: { ko: `QM 적용제외: "${x.text}". KGMP 심사에서는 적용제외 사유가 한국 허가 품목에도 그대로 맞는지 확인합니다.`, en: `QM exclusion: "${x.text}". KGMP auditors check that the rationale also holds for the Korean-licensed products.` },
        action: { ko: 'KGMP 부속서의 적용제외 표에 한국 허가 품목 기준 근거를 한 줄로 명시', en: 'State the rationale for the Korean-licensed products in the annex exclusion table' },
        ref: 'KGMP [별표2] 4.2.2', effort: 'S', evidence: x.where,
      });
    }
  }

  // 2) every applicable clause
  for (const id of out.clauses) {
    if (clauseState[id]) continue;
    const ds = docs.filter((d) => d.hits.some((h) => h.clause === id));
    const procs = ds.filter((d) => !isQmHit(d, id, qmKey));
    const strongProcs = procs.filter((d) => d.hits.find((h) => h.clause === id)!.source !== 'keyword');
    const qm = ds.some((d) => isQmHit(d, id, qmKey));
    const c = CLAUSE_BY_ID[id];
    const mfdsItem = stepForClause(id)?.auditor === 'MFDS';
    const needProc = PROC_REQUIRED.has(id);
    if (strongProcs.length) { clauseState[id] = 'ok'; continue; }
    if (procs.length) {
      clauseState[id] = 'weak';
      findings.push({
        id: next('C', id), kind: 'clause', clause: id, severity: 'ofi',
        title: { ko: `근거 확인 필요 — ${id} ${c.ko}`, en: `Confirm evidence — ${id} ${c.en}` },
        detail: { ko: `문서 내용으로만 추정했습니다(${procs.map((d) => d.docNo || d.title).slice(0, 3).join(', ')}). QM이나 문서 마스터리스트에서 이 조항과 연결되지 않습니다.`, en: `Estimated from content only (${procs.map((d) => d.docNo || d.title).slice(0, 3).join(', ')}); not linked to this clause by the QM or master list.` },
        action: { ko: 'KGMP 부속서 대응표에 해당 절차를 명시', en: 'List the procedure against this clause in the annex cross-reference' },
        ref: `KGMP [별표2] ${id}`, effort: 'S',
      });
      continue;
    }
    if (qm && !needProc) { clauseState[id] = 'ok'; continue; } // policy-level clauses (5.1, 5.3 …) are met by the QM itself
    if (qm) {
      clauseState[id] = 'qm-only';
      findings.push({
        id: next('C', id), kind: 'clause', clause: id, severity: 'minor',
        title: { ko: `${needProc ? '문서화된 절차 없음' : '절차 연결 없음'} — ${id} ${c.ko}`, en: `${needProc ? 'No documented procedure' : 'No linked procedure'} — ${id} ${c.en}` },
        detail: { ko: `QM에는 기술되어 있으나 ${needProc ? 'KGMP가 요구하는 문서화된 절차' : '이를 실행하는 절차·기록'}가 확인되지 않습니다.`, en: `Covered in the QM, but the ${needProc ? 'documented procedure KGMP requires' : 'implementing procedure / records'} was not found.` },
        action: { ko: needProc ? '기존 절차 중 이 요구를 다루는 문서를 지정하거나, 짧은 작업지침서를 추가' : 'QM 해당 장과 실행 기록(양식)을 대응표에 연결', en: needProc ? 'Point to an existing procedure that covers it, or add a short work instruction' : 'Link the QM section and its records in the cross-reference' },
        ref: `KGMP [별표2] ${id}`, effort: needProc ? 'M' : 'S',
      });
      continue;
    }
    clauseState[id] = 'missing';
    findings.push({
      id: next('C', id), kind: 'clause', clause: id, severity: needProc || mfdsItem ? 'major' : 'minor',
      title: { ko: `근거 문서 없음 — ${id} ${c.ko}`, en: `No evidence — ${id} ${c.en}` },
      detail: { ko: `QM과 업로드 문서 어디에서도 이 조항을 찾지 못했습니다.${mfdsItem ? ' 이 항목은 MFDS 심사원이 직접 확인합니다.' : ''}`, en: `Not found in the QM or any uploaded document.${mfdsItem ? ' MFDS auditors check this item themselves.' : ''}` },
      action: { ko: '제조소에 해당 절차를 요청하고, 없으면 절차를 작성(또는 QM 적용제외 근거를 제시)', en: 'Request the procedure from the site; if none exists, write one (or justify an exclusion in the QM)' },
      ref: `KGMP [별표2] ${id}`, effort: id === '7.3' || id === '4.2.3' ? 'L' : 'M',
    });
  }

  // 3) Korea-specific expectations
  const deltaState: Record<string, DeltaStatus | 'n/a'> = {};
  for (const d of KDELTAS) {
    if ((d.applies && !d.applies(cfg)) || !out.clauses.includes(d.clause)) { deltaState[d.id] = 'n/a'; continue; }
    const hit = profile.deltas[d.id] || { status: 'missing' as const };
    deltaState[d.id] = hit.status;
    if (hit.status === 'met') continue;
    const generic = hit.status === 'generic';
    const sev: Severity = generic ? (d.ifMissing === 'major' ? 'minor' : 'obs') : d.ifMissing;
    findings.push({
      id: next('K', d.id.slice(1)), kind: 'korea', clause: d.clause, severity: sev, deltaId: d.id,
      title: { ko: `${generic ? '한국 적용 미명시' : '한국 고유 요구 누락'} — ${d.title.ko}`, en: `${generic ? 'Korea not addressed' : 'Korea-specific requirement missing'} — ${d.title.en}` },
      detail: generic
        ? { ko: `일반 절차는 있으나 한국(MFDS·수입업자) 적용이 명시되지 않았습니다. 기대 사항: ${d.need.ko}`, en: `A general process exists but Korea (MFDS / importer) is not addressed. Expected: ${d.need.en}` }
        : { ko: `관련 내용을 찾지 못했습니다. 기대 사항: ${d.need.ko}`, en: `Nothing found. Expected: ${d.need.en}` },
      action: d.action, ref: d.ref, effort: generic ? 'S' : d.effort, evidence: hit.where ? `${hit.where}: ${hit.snippet || ''}` : undefined,
    });
  }

  findings.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity] || a.clause.localeCompare(b.clause, undefined, { numeric: true }));

  // readiness
  const W: Record<ClauseState, number> = { ok: 1, weak: 0.8, 'qm-only': 0.5, missing: 0, excluded: 1, 'excluded-review': 0.8, conflict: 0 };
  let got = 0, tot = 0;
  for (const id of out.clauses) { tot += 1; got += W[clauseState[id] || 'ok']; }
  for (const s of Object.values(deltaState)) { if (s === 'n/a') continue; tot += 0.5; got += s === 'met' ? 0.5 : s === 'generic' ? 0.25 : 0; }
  const counts: Record<Severity, number> = { major: 0, minor: 0, obs: 0, ofi: 0 };
  for (const f of findings) counts[f.severity]++;
  // coverage, then a penalty per expected finding so the score agrees with the verdict
  const readiness = tot ? Math.max(0, Math.round((got / tot) * 100) - counts.major * 4 - counts.minor * 1) : 0;
  const verdict: GapResult['verdict'] = counts.major >= 3 || readiness < 60 ? 'major' : counts.major > 0 || readiness < 85 ? 'fix' : 'ready';
  const effortDays = findings.reduce<[number, number]>((a, f) => [a[0] + EFFORT_DAYS[f.effort][0], a[1] + EFFORT_DAYS[f.effort][1]], [0, 0]);
  return { findings, clauseState, deltaState, readiness, verdict, counts, effortDays, basis: REG_BASIS };
}

export const SEV_LABEL: Record<Severity, Bi> = {
  major: { ko: '중대', en: 'Major' }, minor: { ko: '경미', en: 'Minor' }, obs: { ko: '관찰', en: 'Observation' }, ofi: { ko: '개선권고', en: 'OFI' },
};
export const VERDICT_LABEL: Record<GapResult['verdict'], Bi> = {
  ready: { ko: '실사 준비 양호', en: 'Ready for the audit' },
  fix: { ko: '보완 후 실사 가능', en: 'Ready after targeted fixes' },
  major: { ko: '실사 전 중대 보완 필요', en: 'Major remediation needed before the audit' },
};

/** Machine-readable result for GlobalRegAI (regulatory-change monitoring re-runs the check when REG_BASIS changes). */
export function gapJson(a: { gap: GapResult; profile: Profile; docs: DocRecord[]; site: { site: string; country: string; product: string; applicant: string }; cfg: AuditConfig }) {
  return {
    schema: 'globalregai.gap-assessment/v1',
    generatedAt: new Date().toISOString(),
    regulator: 'MFDS', framework: a.gap.basis.id, rulesVersion: a.gap.basis.rulesVersion,
    site: a.site,
    conditions: { grade: a.cfg.grade, reviewType: a.cfg.reviewType, sterile: a.cfg.sterile, software: a.cfg.software, design: a.cfg.design, installation: a.cfg.installation, servicing: a.cfg.servicing },
    qualityManual: a.profile.qm || null,
    readiness: a.gap.readiness, verdict: a.gap.verdict, counts: a.gap.counts, effortManDays: a.gap.effortDays,
    clauses: a.gap.clauseState,
    koreaRequirements: Object.fromEntries(KDELTAS.map((d) => [d.id, { clause: d.clause, title: d.title.en, status: a.gap.deltaState[d.id], ref: d.ref }])),
    findings: a.gap.findings.map((f) => ({ id: f.id, kind: f.kind, clause: f.clause, severity: f.severity, title: f.title.en, titleKo: f.title.ko, action: f.action.en, actionKo: f.action.ko, ref: f.ref, effort: f.effort, evidence: f.evidence || null })),
    documents: a.docs.map((d) => ({ docNo: d.docNo, title: d.title, version: d.version, revisionDate: d.revisionDate, clauses: d.hits.map((h) => h.clause) })),
    exclusions: a.profile.exclusions,
  };
}
