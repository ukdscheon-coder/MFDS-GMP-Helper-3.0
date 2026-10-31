// Pre-audit coordination (사전 조율) definitions.
// Regulatory items cite the KGMP notice / GMP 종합 해설서; items marked "권장" are planning suggestions, not legal deadlines.

export type Status = 'todo' | 'doing' | 'done';

export interface Item { id: string; ko: string; en: string; hint?: { ko: string; en: string } }

// 해설서 제8조 해설 "GMP 현장조사 사전협의" items
export const CONSULT_ITEMS: Item[] = [
  { id: 'entry', ko: '심사대상 국가 입국요건 및 사전 요구사항', en: 'Entry requirements and advance requests of the country' },
  { id: 'sites', ko: '심사대상 제조소(주소·작업소·시험실·보관소, 위탁 공정 장소)', en: 'Sites to be audited (incl. subcontracted process locations)' },
  { id: 'people', ko: '심사 참석 인원(경영진·품질책임자·공정별 담당자)', en: 'Attendees (management, quality representative, process owners)' },
  { id: 'schedule', ko: '심사 및 출장 일정(현장조사 희망일 20일 전 확정)', en: 'Audit and travel dates (fix ≥20 days before)' },
  { id: 'agenda', ko: '심사 세부일정(Audit Plan 순서별 담당자·장소)', en: 'Detailed agenda (auditee and location per audit step)' },
  { id: 'transport', ko: '교통편(공항–숙소–제조소)', en: 'Transport (airport – hotel – site)' },
  { id: 'criteria', ko: '심사기준(KGMP [별표 2], 적용 조항 범위)', en: 'Audit criteria (KGMP, applicable clauses)' },
  { id: 'language', ko: '심사 언어·통역(통역 관련 주의사항 동의서)', en: 'Audit language and interpretation (consent form)' },
  { id: 'cost', ko: '출장여비(공무원 국외여비 규정, 항공 일반석 기준)', en: 'Travel costs (government rules, economy class)' },
];

export const LOGISTICS: Item[] = [
  { id: 'visa', ko: '비자·전자여행허가(ESTA·ETIAS 등)', en: 'Visa / electronic travel authorisation' },
  { id: 'vaccine', ko: '예방접종·풍토병 예방약', en: 'Vaccinations / endemic disease medicine' },
  { id: 'insurance', ko: '여행자보험', en: 'Travel insurance' },
  { id: 'flight', ko: '항공편(일반석 기준)', en: 'Flights (economy class)' },
  { id: 'hotel', ko: '숙소(제조소와의 거리·안전)', en: 'Hotel (distance to site, safety)' },
  { id: 'car', ko: '현지 이동수단', en: 'Local transport', hint: { ko: '제조소 제공 차량을 이용하면 일비 50% 감액, 사유서 필요', en: 'If the site provides a car, the daily allowance is halved and a written reason is needed' } },
  { id: 'room', ko: '심사장(회의실·프로젝터·인터넷·문서 열람 PC)', en: 'Audit room (projector, internet, PC for records)' },
  { id: 'ppe', ko: '청정실·작업장 출입 복장(PPE)·안전교육', en: 'Cleanroom gowning (PPE) and safety induction' },
  { id: 'photo', ko: '사진 촬영·자료 반출 규칙 확인', en: 'Photography and document-copy rules' },
];

export const RISK_QUESTIONS: Item[] = [
  { id: 'gmpFail', ko: '최근 3년 이 제조소가 KGMP 심사에서 부적합을 받았습니까?', en: 'KGMP nonconformity for this site in the last 3 years?' },
  { id: 'sampleFail', ko: '최근 3년 신청 품목군이 수거검사에서 품질부적합이었습니까?', en: 'Failed MFDS sample test for this product group in the last 3 years?' },
  { id: 'recall', ko: '최근 3년 국내외 정부가 신청 제품에 강제회수·사용중지·제조중지를 했습니까?', en: 'Government recall / use stop / manufacturing stop in the last 3 years?' },
  { id: 'advisory', ko: '제조소 지역이 외교부 여행금지·철수권고·특별여행주의보 지역입니까? (0404.go.kr)', en: 'Is the region under a Korean travel ban / withdrawal / special advisory? (0404.go.kr)' },
];

export const DAY_PACK: Item[] = [
  { id: 'opening', ko: '개시회의 자료: 회사 소개, 조직도, 심사 범위·품목, 위탁 공정', en: 'Opening meeting deck: company, organisation chart, scope, outsourcing' },
  { id: 'index', ko: 'QM과 절차서 목록(품질문서 관리 개요) 출력본', en: 'Printed QM and procedure index' },
  { id: 'lot', ko: '대표품목 1개 로트 추적 묶음: 구매 → 수입검사 → 배치기록(DHR) → 출하검사 → 불만', en: 'One representative lot traced: purchasing → incoming → DHR → release → complaints' },
  { id: 'calib', ko: '측정장비 목록과 교정성적서', en: 'Measuring equipment list and calibration certificates' },
  { id: 'valid', ko: '공정·멸균·소프트웨어 밸리데이션 보고서', en: 'Process / sterilisation / software validation reports' },
  { id: 'training', ko: '핵심 인원 교육훈련 기록', en: 'Training records of key personnel' },
  { id: 'logs', ko: 'CAPA·불만·부적합·내부감사·경영검토 기록', en: 'CAPA, complaint, nonconformity, internal audit and management review records' },
  { id: 'kr', ko: '한국 법령 연계 자료: 부작용 보고 절차, 추적관리, 표시기재', en: 'Korea-specific: adverse event reporting, tracking, labelling' },
  { id: 'interp', ko: '통역자 사전 브리핑(용어집 공유)', en: 'Interpreter briefing (glossary shared)' },
];

export interface StepAssign { auditee: string; location: string; docs: string }
export interface Interp { path: string; count: string; type: 'resident' | 'importer' | 'pro' | 'other'; experience: 'iso13485' | 'quality' | 'other' }

export interface PrepState {
  auditStart: string; // YYYY-MM-DD
  expiry: string; // periodic only
  consult: Record<string, { status: Status; owner: string; note: string } | undefined>;
  logistics: Record<string, { status: Status; note: string } | undefined>;
  risk: Record<string, 'yes' | 'no' | ''>;
  dayPack: Record<string, boolean>;
  assign: Record<number, StepAssign | undefined>;
  interp: Interp;
  contact: { siteContact: string; siteEmail: string; importerContact: string; importerEmail: string };
  /** the site's answers to the KGMP gap list (keyed by finding id) */
  gapReplies?: Record<string, { plan: string; due: string; evidence: string }>;
}

export const EMPTY_PREP: PrepState = {
  auditStart: '', expiry: '', consult: {}, logistics: {}, risk: {}, dayPack: {}, assign: {},
  interp: { path: '', count: '1', type: 'resident', experience: 'iso13485' },
  contact: { siteContact: '', siteEmail: '', importerContact: '', importerEmail: '' },
};

// ---------------------------------------------------------------- timeline
export interface Milestone { date: string; ko: string; en: string; kind: 'law' | 'advice' | 'audit' }

const d2s = (d: Date) => d.toISOString().slice(0, 10);
const add = (s: string, days: number) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d2s(d); };
const addMonths = (s: string, m: number) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCMonth(d.getUTCMonth() + m); return d2s(d); };

export function timeline(p: PrepState, opts: { periodic: boolean; onsite: boolean; days: number | null }): Milestone[] {
  const out: Milestone[] = [];
  if (opts.periodic && p.expiry) {
    out.push({ date: addMonths(p.expiry, -3), ko: '정기심사 신청 마감(유효기간 만료 3개월 전)', en: 'Periodic review application deadline (3 months before expiry)', kind: 'law' });
    out.push({ date: add(p.expiry, -20), ko: '현장조사 희망일 확정 마감(만료일 20일 전 기준)', en: 'Desired on-site date fixed (20 days before expiry)', kind: 'law' });
    out.push({ date: p.expiry, ko: '적합인정서 유효기간 만료', en: 'Certificate expiry', kind: 'law' });
  }
  const T = p.auditStart;
  if (T) {
    out.push({ date: add(T, -60), ko: '제조소에 사전 요청서·서식 발송 (권장)', en: 'Send request package to the site (suggested)', kind: 'advice' });
    out.push({ date: add(T, -40), ko: '제조소 회신(서식·서류·담당자) 수령 (권장)', en: 'Receive the site’s completed forms and documents (suggested)', kind: 'advice' });
    out.push({ date: add(T, -35), ko: '심사 신청서·통역 동의서 제출 (권장)', en: 'Submit application and interpreter consent (suggested)', kind: 'advice' });
    if (opts.onsite) out.push({ date: add(T, -20), ko: '현장조사 희망일 확정 마감(시작일 20일 전)', en: 'Desired on-site date fixed (20 days before start)', kind: 'law' });
    out.push({ date: add(T, -30), ko: '비자·항공·숙소 확정 (권장)', en: 'Visa, flights and hotel confirmed (suggested)', kind: 'advice' });
    out.push({ date: add(T, -10), ko: '심사단과 사전협의 회의 (권장)', en: 'Pre-audit meeting with the audit team (suggested)', kind: 'advice' });
    if (opts.onsite && opts.days) {
      const end = add(T, opts.days - 1);
      out.push({ date: T, ko: `현장조사 시작 (Day 1)`, en: 'On-site audit starts (Day 1)', kind: 'audit' });
      out.push({ date: end, ko: `현장조사 종료 (Day ${opts.days})`, en: `On-site audit ends (Day ${opts.days})`, kind: 'audit' });
      out.push({ date: add(end, 7), ko: '심사 결과 통보 기한(출장 종료일부터 7일)', en: 'Result notice due (7 days after the audit)', kind: 'law' });
      out.push({ date: add(end, 37), ko: '1차 보완 제출 기한 예상(통보 후 30일)', en: 'First correction due (≈30 days after notice)', kind: 'law' });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
