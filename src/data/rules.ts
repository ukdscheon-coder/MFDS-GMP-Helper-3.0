// Audit-condition rules derived from 「의료기기 제조 및 품질관리 기준」 제4조~제9조, [별표 4],
// 의료기기 GMP 종합 해설서 and 의료기기 GMP 운영 기본 지침. MDSAP items follow 고시 제2026-46호 (current text should be re-checked).
import { CLAUSES } from './kgmp';

export type ReviewType = 'initial' | 'periodic' | 'change' | 'additional';
export type Method = 'auto' | 'document' | 'onsite';
export type Purpose = 'domestic' | 'export' | 'clinical';
export type Role = 'single' | 'giver' | 'maker';

export interface AuditConfig {
  method: Method;
  reviewType: ReviewType;
  grade: 1 | 2 | 3 | 4;
  purpose: Purpose;
  role: Role;
  riskSite: boolean; // 위해우려제조소
  confidential: boolean; // 기업비밀로 제2호 자료 제출 불가 → 현장조사 요청
  otherCert: boolean; // 다른 수입·제조업자가 이 제조소의 유효한 KGMP 인정서 보유
  otherCertOnsite: boolean; // 그 인정서가 현장조사로 발급됨
  ivdCert: boolean; // 체외진단 GMP 인정서 보유
  mdsap: boolean; // MDSAP 인정서 보유 [현행 확인]
  mdsapMajorNc: boolean; // 중대 부적합 이력
  foreignCertForChange: boolean; // 변경심사: 생산국 인정서(라목)·실사결과(사목) 제출 가능
  batchPeriodic: boolean; // 정기심사 일괄신청
  batchSelected: boolean; // 일괄신청 중 현장조사 대상으로 선정된 제조소
  suspended: boolean; // 한시적 현장조사 보류 지역(전시·감염병·천재지변, 여행경보)
  sterile: boolean;
  software: boolean; // SW 의료기기 제조소
  innovativeSw: boolean; // 혁신의료기기 SW
  humanAnimal: boolean; // 인체조직·동물유래 물질
  fusion: boolean; // 융복합 의료제품
  kitCombo: boolean; // 한벌구성·조합 의료기기
  installation: boolean;
  servicing: boolean;
  design: boolean; // 제조소가 설계·개발 수행
  multiMainProcess: boolean; // 주요공정 2개 이상 / 다수 품목 / 공급업체 현장조사
  doubleInterpretation: boolean; // 이중 통역
}

export const DEFAULT_CONFIG: AuditConfig = {
  method: 'auto', reviewType: 'initial', grade: 2, purpose: 'domestic', role: 'single',
  riskSite: false, confidential: false, otherCert: false, otherCertOnsite: true, ivdCert: false, mdsap: false, mdsapMajorNc: false,
  foreignCertForChange: true, batchPeriodic: false, batchSelected: true, suspended: false,
  sterile: false, software: false, innovativeSw: false, humanAnimal: false, fusion: false, kitCombo: false,
  installation: false, servicing: false, design: true, multiMainProcess: false, doubleInterpretation: false,
};

export interface Reason { ko: string; en: string; ref: string; level: 'info' | 'warn' | 'must' }

export interface Outcome {
  method: 'document' | 'onsite';
  autoMethod: 'document' | 'onsite';
  methodLocked: boolean; // regulation forces onsite
  reasons: Reason[];
  authority: 'single' | 'joint';
  authorityNote: { ko: string; en: string };
  clauses: string[]; // applicable KGMP clause ids
  clauseBasis: { ko: string; en: string };
  days: number | null;
  documents: SubmissionDoc[];
  validity: { ko: string; en: string };
  deadlines: { ko: string; en: string }[];
  warnings: Reason[];
  certCode: string; // 인정번호 심사구분 코드 (별표 5)
}

export interface SubmissionDoc { code: string; ko: string; en: string; required: 'yes' | 'cond'; note?: { ko: string; en: string }; for?: 'giver' | 'maker' | 'both' }

// ----------------------------------------------------------------------------- clause sets
const ALL = CLAUSES.map((c) => c.id);
const expand = (ids: string[]) => {
  const out = new Set<string>();
  for (const id of ids) for (const c of ALL) if (c === id || c.startsWith(id + '.')) out.add(c);
  // 7.4.3 is folded into 7.4 here
  if (ids.includes('7.4.3')) out.add('7.4');
  return ALL.filter((c) => out.has(c));
};
const SET_CHANGE = expand(['4.1', '4.2', '6.1', '6.3', '6.4', '7.5', '7.6', '8.2.2', '8.2.3', '8.2.6', '8.3', '8.5']);
const SET_CLINICAL = expand(['7.1', '7.3', '7.4.3', '7.5', '7.6', '8.2.6', '8.3']);
const SET_GRADE1 = expand(['4.1', '4.2', '5.5', '6.4', '7.1', '7.4', '7.5', '7.6', '8.2.1', '8.2.2', '8.2.3', '8.2.6', '8.3', '8.5']);

// ----------------------------------------------------------------------------- submission documents (고시 제7조, 2022-8호 목 기준)
const D = {
  form: { code: '별지1', ko: '의료기기 적합성인정등 심사 신청서(품질경영시스템 상호관계·구비서류 체크리스트 포함)', en: 'Application form (incl. QMS interrelation & checklist)' },
  lic: { code: '1호', ko: '수입업 허가증 사본(허가 전·임상용은 생략)', en: 'Import licence copy' },
  ga: { code: '가', ko: '제조소 개요(명칭·시설별 주소, 품질책임자 연락처)', en: 'Site overview' },
  na: { code: '나', ko: '제조·품질 관련 총 종업원 수', en: 'Number of employees (manufacturing & quality)' },
  da: { code: '다', ko: '제조 의료기기 목록(품목명·등급·대표품목·최근 3년 실적)', en: 'List of devices (name, class, representative item)' },
  ra: { code: '라', ko: '생산국 정부(위임기관) 발행 QMS 적합인정서 사본(ISO 9001 불가)', en: 'Country-of-origin QMS certificate (not ISO 9001)' },
  ma: { code: '마', ko: '시설 개요(평면도·청정구역·동선, 시설·장비 목록)', en: 'Facility overview (floor plan, cleanroom, equipment list)' },
  ba: { code: '바', ko: '대표품목 주요 공급·위탁업체명 및 업무범위', en: 'Key suppliers / subcontractors of the representative item' },
  sa: { code: '사', ko: '다른 인증기관 실사결과(최근 3년, 후속조치 포함)', en: 'Other certification audit reports (last 3 years, incl. follow-up)' },
  ah: { code: '아', ko: '품질매뉴얼(품질방침 포함)', en: 'Quality manual (incl. quality policy)' },
  ja: { code: '자', ko: '대표품목 제품표준서(모양·구조, 원자재, 제조방법, 시험규격, 사용기한, 표시기재)', en: 'Product standard of representative item' },
  cha: { code: '차', ko: '설치·사후지원 설명서', en: 'Installation / servicing instructions' },
  ka: { code: '카', ko: '조직도', en: 'Organisation chart' },
  ta: { code: '타', ko: '품질문서 관리 개요(문서명·번호·최종버전·제개정일)', en: 'Outline of quality document management' },
  pa: { code: '파', ko: '[별표 2] 기준 점검표(품질책임자 서명)', en: 'KGMP standard checklist (signed)' },
  ha: { code: '하', ko: '[별표 2] 기준 적합선언문(품질책임자 서명)', en: 'Declaration of conformity to KGMP (signed)' },
  geo: { code: '거', ko: '대표품목 프로세스 유효성 확인 요약(IQ/OQ/PQ)', en: 'Process validation summary of representative item' },
  neo: { code: '너', ko: '대표품목 모니터링·측정 장비 관리 요약(교정)', en: 'Monitoring & measuring equipment summary' },
  deo: { code: '더', ko: '혁신의료기기 지정서', en: 'Innovative medical device designation' },
  reo: { code: '러', ko: '제출자료가 제조소에서 작성됐음을 입증하는 증명서', en: 'Site certificate for submitted documents' },
  same: { code: '간소화', ko: '동일 제조소·동일 시스템 하 제조 확인 레터(품질책임자 서명)', en: 'Letter confirming same site & same QMS' },
  fin: { code: '제7조제7항', ko: '완제품 시험성적서(멸균제품은 멸균 입증자료 포함)', en: 'Finished product test report (incl. sterility evidence)' },
  interp: { code: '해설서', ko: '통역 관련 주의사항 동의서', en: 'Interpreter consent form' },
  summary: { code: '별지1 4쪽', ko: '제조소 총괄표(정기심사 일괄신청)', en: 'Site summary table (batch periodic)' },
  mdsapDocs: { code: '제7조제1항제3호 [현행 확인]', ko: 'MDSAP 적합인정서 사본·심사결과 자료·제품표준서·QMS 관련 자료', en: 'MDSAP certificate, audit report, product standard, QMS documents' },
  quality3: { code: '참고', ko: '1개 제조단위 이상 품질관리 실적(3개 권장)', en: 'Quality records of ≥1 batch (3 recommended)' },
} satisfies Record<string, Omit<SubmissionDoc, 'required'>>;

const req = (d: Omit<SubmissionDoc, 'required'>, required: 'yes' | 'cond' = 'yes', note?: SubmissionDoc['note'], forRole?: SubmissionDoc['for']): SubmissionDoc => ({ ...d, required, note, for: forRole });

function documentsFor(c: AuditConfig, method: 'document' | 'onsite', simplified: boolean): SubmissionDoc[] {
  const out: SubmissionDoc[] = [req(D.form)];
  if (c.purpose !== 'clinical') out.push(req(D.lic, 'cond', { ko: '최초심사 등 업허가 전에는 생략', en: 'Omit before licence is granted' }));
  if (c.mdsap && method === 'document') {
    out.push(req(D.mdsapDocs), req(D.reo));
    return out;
  }
  if (simplified) {
    out.push(req(D.ja), req(D.cha, 'cond'), req(D.geo), req(D.neo), req(D.deo, 'cond'), req(D.reo), req(D.same));
    return out;
  }
  const giverMaker = c.role !== 'single';
  if (method === 'onsite') {
    // 현장조사: 가·나·다·마·바·아·자·차·더
    const base = [D.ga, D.na, D.da, D.ma, D.ba, D.ah, D.ja, D.cha, D.deo];
    for (const d of base) {
      const forRole = giverMaker ? (['ga', 'na', 'ma', 'ba', 'ja'].some((k) => D[k as keyof typeof D] === d) ? 'both' : 'giver') : undefined;
      out.push(req(d, d === D.cha || d === D.deo ? 'cond' : 'yes', undefined, forRole));
    }
    out.push(req(D.interp, 'yes', { ko: '해외 제조소 현장조사 시 신청과 함께 제출', en: 'Submit with the application for overseas on-site audits' }));
  } else {
    const all = [D.ga, D.na, D.da, D.ra, D.ma, D.ba, D.sa, D.ah, D.ja, D.cha, D.ka, D.ta, D.pa, D.ha, D.geo, D.neo, D.deo, D.reo];
    for (const d of all) {
      const makerSet = [D.ga, D.na, D.ra, D.ma, D.ba, D.sa, D.ja];
      const forRole = giverMaker ? (makerSet.includes(d) ? 'both' : 'giver') : undefined;
      const cond = d === D.cha || d === D.deo || d === D.sa;
      out.push(req(d, cond ? 'cond' : 'yes', undefined, forRole));
    }
  }
  if (c.suspended) out.push(req(D.ra), req(D.sa), req(D.fin));
  if (c.reviewType === 'periodic' && c.batchPeriodic) out.push(req(D.summary));
  out.push(req(D.quality3, 'yes'));
  // de-duplicate by code
  return out.filter((d, i) => out.findIndex((x) => x.code === d.code) === i);
}

// ----------------------------------------------------------------------------- main evaluation
export function evaluate(c: AuditConfig): Outcome {
  const reasons: Reason[] = [];
  const warnings: Reason[] = [];
  let auto: 'document' | 'onsite' = 'onsite';
  let locked = false;
  let simplified = false;

  // 1) document-only cases (제6조제2항)
  if (c.reviewType === 'additional') { auto = 'document'; reasons.push({ ko: '추가심사는 서류검토로 실시', en: 'Additional review is a document review', ref: '제6조제2항제1호', level: 'info' }); }
  if (c.reviewType === 'change' && c.foreignCertForChange) { auto = 'document'; reasons.push({ ko: '변경심사에서 라목(생산국 인정서)·사목(실사결과)을 내면 서류검토', en: 'Change review with origin certificate and audit report → document review', ref: '제6조제2항제2호', level: 'info' }); }
  if (c.otherCert && (c.reviewType !== 'periodic' || c.otherCertOnsite)) { auto = 'document'; simplified = true; reasons.push({ ko: '다른 수입업자의 유효한 인정서가 있어 서류검토(제출자료 간소화, 유효기간은 기존 인정서와 같음)', en: 'Another importer holds a valid certificate → document review with simplified submission', ref: '제6조제2항제3호, 제7조제6항', level: 'info' }); }
  if (c.otherCert && c.reviewType === 'periodic' && !c.otherCertOnsite) warnings.push({ ko: '정기심사는 다른 업자의 인정서가 현장조사로 발급된 경우에만 서류검토 가능', en: 'For periodic review the other certificate must come from an on-site audit', ref: '해설서 p.22', level: 'warn' });
  if (c.reviewType === 'periodic' && c.batchPeriodic && !c.batchSelected) { auto = 'document'; reasons.push({ ko: '정기심사 일괄신청에서 현장조사 대상이 아닌 제조소는 서류검토', en: 'Batch periodic: non-selected sites get a document review', ref: '제6조제2항제4호', level: 'info' }); }
  if (c.ivdCert) { auto = 'document'; reasons.push({ ko: '체외진단 GMP 인정서(현장조사 발급) 보유 → 서류검토', en: 'IVD KGMP certificate held → document review', ref: '제6조제2항제5호', level: 'info' }); }
  if (c.mdsap) {
    const mustOnsite = c.reviewType === 'periodic' || c.mdsapMajorNc || c.fusion || c.humanAnimal;
    if (!mustOnsite) { auto = 'document'; reasons.push({ ko: 'MDSAP 인정서 보유 → 서류검토 가능 [현행 2026-46호 확인]', en: 'MDSAP certificate → document review possible [check current text]', ref: '제6조제2항제6호', level: 'info' }); }
    else { auto = 'onsite'; locked = true; reasons.push({ ko: 'MDSAP 보유라도 정기심사·중대 부적합 이력·융복합·인체유래는 현장조사 [현행 확인]', en: 'MDSAP but periodic / major NC / combination / human-origin → on-site', ref: '제6조제3항제4호', level: 'must' }); }
  }
  if (c.suspended) { auto = 'document'; reasons.push({ ko: '한시적 현장조사 보류(전시·감염병·천재지변, 외교부 여행경보 흑·적색·특별여행주의보) → 서류검토 후 한시적 인정서', en: 'Temporary on-site suspension → document review and temporary certificate', ref: '제6조제6항', level: 'warn' }); }

  // 2) mandatory on-site (제6조제3항)
  if (c.riskSite) { auto = 'onsite'; locked = true; reasons.push({ ko: '위해우려제조소(최근 3년 GMP 부적합·수거검사 부적합·국내외 강제회수 등) → 합동 현장조사', en: 'High-risk site → mandatory joint on-site audit', ref: '제6조제3항제2호, 별표 4', level: 'must' }); }
  if (c.confidential) { auto = 'onsite'; locked = true; reasons.push({ ko: '기업비밀로 제2호 자료 제출 불가 → 현장조사 요청', en: 'Confidential documents cannot be submitted → on-site requested', ref: '제6조제3항제3호', level: 'must' }); }
  if (c.suspended && locked) warnings.push({ ko: '현장조사 의무 사유가 있지만 보류 지역입니다 — 상황 종료 후 10일 이내 신청, 90일 이내 현장조사', en: 'On-site required but region suspended — apply within 10 days of resolution', ref: '제7조제8항, 제8조제12항', level: 'warn' });
  if (auto === 'onsite' && !reasons.length) reasons.push({ ko: '최초·정기심사의 기본은 현장조사 + 서류검토', en: 'Initial and periodic reviews default to on-site + document review', ref: '제6조제1항, 별표 4', level: 'info' });

  let method: 'document' | 'onsite' = c.method === 'auto' ? auto : c.method;
  if (c.method === 'document' && locked) {
    method = 'onsite';
    warnings.push({ ko: '선택하신 "서류검토만"은 규정상 허용되지 않아 현장조사로 바꿨습니다.', en: '"Document review only" is not allowed here, so on-site was applied.', ref: '제6조제3항', level: 'must' });
  } else if (c.method === 'onsite' && auto === 'document') {
    warnings.push({ ko: '서류검토 대상이지만 현장조사로 준비합니다(심사단 판단으로 현장조사 가능).', en: 'Eligible for document review, prepared as on-site.', ref: '해설서 p.20', level: 'info' });
  } else if (c.method === 'document' && auto === 'onsite') {
    warnings.push({ ko: '규정상 현장조사 대상입니다. 서류검토만으로 준비하면 심사기관이 현장조사를 결정할 수 있습니다.', en: 'Regulation points to on-site; the authority may still require it.', ref: '제6조제1항, 제8조제2항', level: 'warn' });
  }

  // 3) authority (별표 4)
  const joint = c.riskSite || c.grade >= 3;
  const authority: Outcome['authority'] = joint ? 'joint' : 'single';
  let authorityNote = joint
    ? { ko: '합동: 지방식약청 + 품질관리심사기관 (인정서 공동명의)', en: 'Joint: regional MFDS office + QMS review body' }
    : { ko: '단독: 품질관리심사기관 (인정서 심사기관 명의)', en: 'Single: QMS review body' };
  if (c.grade === 3 && (c.reviewType === 'change' || c.reviewType === 'periodic') && method === 'onsite' && !c.riskSite)
    authorityNote = { ko: '합동(3등급 변경·정기심사의 현장조사는 품질관리심사기관만 실시)', en: 'Joint (class 3 change/periodic on-site is done by the review body only)' };
  if (c.riskSite) authorityNote = { ko: '위해우려제조소: 등급과 관계없이 합동 현장조사·합동 서류검토', en: 'High-risk site: joint on-site and joint document review' };

  // 4) applicable clauses (제5조제2항)
  let clauses = ALL;
  let clauseBasis = { ko: '[별표 2] 전 조항', en: 'All KGMP clauses' };
  if (c.purpose === 'clinical') { clauses = SET_CLINICAL; clauseBasis = { ko: '임상시험용: 7.1, 7.3, 7.4.3, 7.5, 7.6, 8.2.6, 8.3', en: 'Clinical: 7.1, 7.3, 7.4.3, 7.5, 7.6, 8.2.6, 8.3' }; }
  else if (c.reviewType === 'change') { clauses = SET_CHANGE; clauseBasis = { ko: '변경심사: 4.1, 4.2, 6.1, 6.3, 6.4, 7.5, 7.6, 8.2.2, 8.2.3, 8.2.6, 8.3, 8.5', en: 'Change review subset' }; }
  else if (c.grade === 1) { clauses = SET_GRADE1; clauseBasis = { ko: '1등급: 4.1, 4.2, 5.5, 6.4, 7.1, 7.4, 7.5, 7.6, 8.2.1, 8.2.2, 8.2.3, 8.2.6, 8.3, 8.5', en: 'Class 1 subset' }; }
  // product-driven non-applicability (D 판정 후보)
  const notApplicable = new Set<string>();
  if (!c.sterile) { notApplicable.add('7.5.5'); notApplicable.add('7.5.7'); }
  if (!c.installation) notApplicable.add('7.5.3');
  if (!c.servicing) notApplicable.add('7.5.4');
  if (!c.design && c.purpose !== 'clinical') notApplicable.add('7.3');
  clauses = clauses.filter((id) => !notApplicable.has(id));

  // 5) days (해설서 제8조 심사일수)
  let days: number | null = null;
  if (method === 'onsite') {
    if (c.humanAnimal || c.multiMainProcess || c.kitCombo) days = 5;
    else if (c.software || c.reviewType === 'change') days = 3;
    else days = 4;
    if (c.doubleInterpretation) warnings.push({ ko: '이중 통역(예: 현지어→영어→한국어)은 심사 기간이 늘어날 수 있습니다.', en: 'Double interpretation may extend the audit.', ref: '해설서 p.75', level: 'warn' });
  }

  // 6) validity (제9조)
  let validity = { ko: '적합인정서 발행일로부터 3년', en: '3 years from issue' };
  if (c.reviewType === 'periodic') validity = c.batchPeriodic ? { ko: '일괄신청: 발행일로부터 3년', en: 'Batch: 3 years from issue' } : { ko: '기존 유효기간 만료일 다음날부터 3년(만료 후 발급이면 발행일부터 3년, 그 사이 판매금지)', en: '3 years from the day after expiry' };
  if (c.reviewType === 'change' || c.reviewType === 'additional') validity = { ko: '기존 적합인정서 유효기간 그대로', en: 'Unchanged from the existing certificate' };
  if (simplified || c.ivdCert) validity = { ko: '기존(다른 업자·체외진단) 인정서 유효기간과 동일', en: 'Same as the existing certificate' };
  if (c.mdsap && method === 'document') validity = { ko: 'MDSAP 인정서 유효기간과 동일 [현행 확인]', en: 'Same as MDSAP certificate [check]' };
  if (c.suspended) validity = { ko: '한시적 인정서: 발행일부터 상황종료일까지', en: 'Temporary: until the situation ends' };
  if (c.purpose !== 'domestic' || c.grade === 1) warnings.push({ ko: '수출용·1등급·임상시험용은 정기심사 대상이 아니며, 만료 후에는 최초심사를 다시 받습니다.', en: 'Export / class 1 / clinical: no periodic review; re-apply as initial after expiry.', ref: '제4조제3항, 제6조제4항', level: 'info' });
  if (c.grade === 1 && c.purpose === 'domestic') warnings.push({ ko: '1등급은 GMP 심사 대상이 아니며(희망 시 신청), 기준 준수 의무는 있습니다.', en: 'Class 1 is exempt from KGMP review (voluntary) but must comply.', ref: '제3조제2항', level: 'info' });
  if (c.reviewType === 'change' && c.software) warnings.push({ ko: 'SW 의료기기 제조소의 소재지 변경은 변경심사 대상이 아닙니다(다음 정기심사에서 확인).', en: 'Software site relocation is exempt from change review.', ref: '제4조제1항제3호', level: 'warn' });
  if (c.fusion) warnings.push({ ko: '융복합 의료제품: 보조작용 의약품 GMP 협의가 함께 진행됩니다.', en: 'Combination product: drug-part GMP consultation runs in parallel.', ref: '운영지침 5-8', level: 'info' });
  if (c.kitCombo) warnings.push({ ko: '한벌구성·조합: 주기능 품목군 제조소에서 현장조사, 연결·호환성 검증과 공급업체 관리를 집중 심사', en: 'Kit / combination: audit at main-function site, focus on interface and suppliers', ref: '운영지침 5-7', level: 'info' });
  if (c.role !== 'single') warnings.push({ ko: '제조의뢰자-제조자: 각각 심사하며 신청서 3쪽 품질경영시스템 상호관계를 꼭 작성', en: 'Contract giver–manufacturer: both audited; fill the QMS interrelation page', ref: '제6조제1항, 해설서 p.35', level: 'info' });

  const deadlines = [
    { ko: '현장조사 희망일은 시작일 20일 전까지 확정', en: 'Fix the desired on-site date ≥20 days before' },
    { ko: '처리기간: 서류검토 신청일부터 30일 / 현장조사 종료일부터 7일', en: 'Processing: 30 days (document) / 7 days after on-site' },
    { ko: '보완: 1차 30일, 2회 연장, 독촉 10일', en: 'Corrections: 30 days, 2 extensions, 10-day reminder' },
  ];
  if (c.reviewType === 'periodic') deadlines.unshift({ ko: '정기심사는 유효기간 만료 3개월 전까지 신청', en: 'Apply ≥3 months before expiry' });
  if (c.suspended) deadlines.push({ ko: '보류 해제 후 10일 이내 신청, 90일 이내 현장조사 / 매 수입 시 자가시험성적서 제출', en: 'Apply within 10 days of resolution; on-site within 90 days' });

  // 7) certificate code (별표 5): 제조/수입 · 심사구분 · 방법 · 종류
  const second = { initial: 'A', periodic: 'B', additional: 'C', change: 'D' }[c.reviewType];
  const third = method === 'document' ? 'A' : 'B';
  const fourth = c.purpose === 'clinical' ? 'C' : c.purpose === 'export' ? 'D' : c.innovativeSw ? 'E' : c.grade === 1 ? 'B' : 'A';
  const certCode = `B${second}${third}${fourth}`;

  return { method, autoMethod: auto, methodLocked: locked, reasons, authority, authorityNote, clauses, clauseBasis, days, documents: documentsFor(c, method, simplified), validity, deadlines, warnings, certCode };
}
