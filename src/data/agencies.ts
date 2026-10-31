// Inbound inspections: foreign regulators / their auditors inspecting a Korean (or any) manufacturer.
// Facts as of 2026-10; each profile lists its sources. Items marked [확인 필요] should be re-checked against the regulator's current text.
import type { AuditStep } from './kgmp';

export type AgencyId = 'FDA' | 'PMDA' | 'ANVISA' | 'SFDA' | 'EU_NB' | 'MHRA' | 'NMPA' | 'MDSAP';

export interface Bi { ko: string; en: string }
export interface Agency {
  id: AgencyId;
  name: Bi;
  criteria: Bi; // inspection standard
  who: Bi; // who actually comes
  when: Bi; // triggers / frequency
  notice: Bi;
  duration: Bi;
  language: Bi;
  findings: Bi; // findings form and response deadline
  cost: Bi;
  docs: Bi[]; // typically requested before / at the start
  deltas: { clause: string; ko: string; en: string }[]; // agency-specific checks on top of ISO 13485
  steps: AuditStep[]; // inspection areas in order
  sources: { title: string; url: string }[];
}

const S = (order: number, article: string, en: string, ko: string, clauses: string[]): AuditStep => ({ order, day: 1, article, en, ko, auditor: 'all', clauses });

// ISO 13485 clause-order plan used when the regulator has no published area sequence
const ISO_ORDER: AuditStep[] = [
  S(1, '–', 'Opening meeting', '개시회의', []),
  S(2, '4', 'Quality management system & documentation', '품질경영시스템·문서화', ['4.1', '4.2.1', '4.2.2', '4.2.3', '4.2.4', '4.2.5']),
  S(3, '5', 'Management responsibility & review', '경영책임·경영검토', ['5.1', '5.2', '5.3', '5.4', '5.5.1', '5.5.2', '5.5.3', '5.6']),
  S(4, '6', 'Resource management', '자원관리', ['6.1', '6.2', '6.3', '6.4']),
  S(5, '7.1–7.2', 'Planning, risk management, customer processes', '제품실현 기획·위험관리·고객 프로세스', ['7.1', '7.2']),
  S(6, '7.3', 'Design and development', '설계 및 개발', ['7.3']),
  S(7, '7.4', 'Purchasing & supplier control', '구매·공급업체 관리', ['7.4']),
  S(8, '7.5–7.6', 'Production, validation, identification, traceability, preservation, calibration', '생산·밸리데이션·식별·추적성·보존·교정', ['7.5.1', '7.5.2', '7.5.3', '7.5.4', '7.5.5', '7.5.6', '7.5.7', '7.5.8', '7.5.9', '7.5.10', '7.5.11', '7.6']),
  S(9, '8.2.1–8.2.3', 'Feedback, complaints, regulatory reporting', '피드백·불만·규제당국 보고', ['8.2.1', '8.2.2', '8.2.3']),
  S(10, '8', 'Internal audit, monitoring, nonconforming product, data, CAPA', '내부감사·모니터링·부적합·데이터·CAPA', ['8.1', '8.2.4', '8.2.5', '8.2.6', '8.3', '8.4', '8.5']),
  S(11, '–', 'Closing meeting', '종료회의', []),
];

// MDSAP audit sequence (MDSAP Audit Approach): Management → Marketing authorization & registration → MA&I → Adverse events → D&D → Production → Purchasing
const MDSAP_ORDER: AuditStep[] = [
  S(1, '–', 'Opening meeting', '개시회의', []),
  S(2, 'Ch.1', 'Management', '경영(Management)', ['4.1', '4.2.1', '4.2.2', '4.2.4', '4.2.5', '5.1', '5.2', '5.3', '5.4', '5.5.1', '5.5.2', '5.5.3', '5.6', '6.1', '6.2']),
  S(3, 'Ch.2', 'Device marketing authorization & facility registration', '시판허가·시설등록', ['4.2.3']),
  S(4, 'Ch.3', 'Measurement, analysis and improvement', '측정·분석·개선', ['8.1', '8.2.1', '8.2.2', '8.2.4', '8.2.5', '8.3', '8.4', '8.5']),
  S(5, 'Ch.4', 'Medical device adverse events and advisory notices reporting', '이상사례·권고문 보고', ['8.2.3']),
  S(6, 'Ch.5', 'Design and development', '설계 및 개발', ['7.1', '7.2', '7.3']),
  S(7, 'Ch.6', 'Production and service controls', '생산 및 서비스 관리', ['6.3', '6.4', '7.5.1', '7.5.2', '7.5.3', '7.5.4', '7.5.5', '7.5.6', '7.5.7', '7.5.8', '7.5.9', '7.5.10', '7.5.11', '7.6', '8.2.6']),
  S(8, 'Ch.7', 'Purchasing', '구매', ['7.4']),
  S(9, '–', 'Closing meeting', '종료회의', []),
];

// FDA Compliance Program 7382.850 (QMSR, effective 2026-02-02): six QMS areas + Other Applicable FDA Requirements (OAFR)
const FDA_ORDER: AuditStep[] = [
  S(1, '–', 'Opening (credentials, FDA Form 482 Notice of Inspection)', '개시(신분증·FDA Form 482 실사 통지)', []),
  S(2, 'Area 1', 'Management Oversight', '경영 감독', ['4.1', '4.2.1', '4.2.2', '4.2.4', '4.2.5', '5.1', '5.2', '5.3', '5.4', '5.5.1', '5.5.2', '5.5.3', '5.6', '6.1', '6.2', '8.2.4']),
  S(3, 'Area 2', 'Design and Development', '설계 및 개발', ['7.1', '7.2', '7.3', '4.2.3']),
  S(4, 'Area 3', 'Change Control', '변경관리', ['7.3', '7.5.6']),
  S(5, 'Area 4', 'Outsourcing and Purchasing', '외주·구매', ['7.4']),
  S(6, 'Area 5', 'Production and Service Provision', '생산 및 서비스 제공', ['6.3', '6.4', '7.5.1', '7.5.2', '7.5.3', '7.5.4', '7.5.5', '7.5.6', '7.5.7', '7.5.10', '7.5.11', '7.6', '8.2.6']),
  S(7, 'Area 6', 'Measurement, Analysis and Improvement', '측정·분석·개선', ['8.1', '8.2.1', '8.2.2', '8.2.5', '8.3', '8.4', '8.5']),
  S(8, 'OAFR', 'MDR (21 CFR 803), Corrections & Removals (806), Tracking (821), UDI (830)', '의료기기 보고·시정 및 회수·추적·UDI', ['8.2.3', '7.5.8', '7.5.9']),
  S(9, '–', 'Close-out meeting (FDA Form 483 if observations)', '종료회의(지적 시 FDA Form 483)', []),
];

const KO_DOCS_BASE: Bi[] = [
  { ko: '품질매뉴얼과 절차서 목록(최신 개정 상태)', en: 'Quality manual and procedure list (current revisions)' },
  { ko: '조직도, 품질책임자·관리책임자 지정 문서', en: 'Organisation chart, management representative appointment' },
  { ko: '제품 목록·분류(등급)·인증서', en: 'Product list, classification and certificates' },
  { ko: '시설 배치도·주소(작업소·시험실·보관소, 외주 장소)', en: 'Site layout and addresses (incl. outsourced locations)' },
  { ko: '최근 내부감사·경영검토·외부심사 보고서', en: 'Recent internal audit, management review and external audit reports' },
  { ko: 'CAPA·불만·부적합·이상사례 목록', en: 'CAPA, complaint, nonconformity and adverse event logs' },
];

export const AGENCIES: Agency[] = [
  {
    id: 'FDA', name: { ko: '미국 FDA', en: 'US FDA' },
    criteria: { ko: '21 CFR Part 820 QMSR (2026.2.2 시행, ISO 13485:2016 인용) + 803·806·821·830', en: '21 CFR 820 QMSR (effective 2026-02-02, incorporates ISO 13485:2016) + 803/806/821/830' },
    who: { ko: 'FDA 조사관(OII) 직접 방문. MDSAP 심사보고서는 정기(routine) 실사를 대신할 수 있음', en: 'FDA investigators (OII); MDSAP reports can replace routine inspections' },
    when: { ko: '정기 감시, PMA 승인 전, for-cause(불만·리콜·MDR 등). 해외 제조소도 동일 대상', en: 'Routine surveillance, PMA pre-approval, for-cause; foreign sites included' },
    notice: { ko: '해외 실사는 보통 수주 전 사전통보였으나 2025.5부터 무통보(unannounced) 해외 실사 확대 — 상시 준비 필요', en: 'Foreign inspections were pre-announced; since May 2025 FDA expanded unannounced foreign inspections' },
    duration: { ko: '실사 모델과 위험도에 따라 결정(Model 2: 비멸균 22개·멸균 23개 이상 요소 + OAFR)', en: 'Depends on inspection model (Model 2: ≥22 elements non-sterile / ≥23 sterile + OAFR)' },
    language: { ko: '영어. 통역 필요 시 제조소가 준비. 영어가 아닌 기록은 번역 요청 가능', en: 'English; site provides interpreters; translations of records may be requested' },
    findings: { ko: 'FDA Form 483(관찰사항) → 15영업일 내 서면 회신 권장, 미흡 시 Warning Letter·수입경보 가능', en: 'Form 483 → written response within 15 business days; inadequate response may lead to Warning Letter / import alert' },
    cost: { ko: '실사 수수료 없음(출장비 FDA 부담)', en: 'No inspection fee' },
    docs: [...KO_DOCS_BASE, { ko: '경영검토·내부감사·공급업체 감사 보고서(QMSR에서 열람 대상)', en: 'Management review, internal audit and supplier audit reports (now within FDA authority under QMSR)' }, { ko: 'DMR/DHR, MDR·시정 및 회수 기록, UDI·FDA 등록·리스팅', en: 'Device master/history records, MDR and correction & removal records, UDI, registration & listing' }],
    deltas: [
      { clause: '8.2.3', ko: '21 CFR 803 의료기기 보고(MDR): 30일·5일 보고, eMDR', en: '21 CFR 803 MDR: 30-day / 5-day reports, eMDR' },
      { clause: '8.3', ko: '21 CFR 806 시정 및 회수 보고', en: '21 CFR 806 corrections and removals' },
      { clause: '7.5.9', ko: '21 CFR 821 추적 대상 기기', en: '21 CFR 821 device tracking' },
      { clause: '7.5.8', ko: '21 CFR 830 UDI·GUDID', en: '21 CFR 830 UDI / GUDID' },
      { clause: '4.2.5', ko: '기록 열람: 경영검토·내부감사·공급업체 감사 보고서 제시 가능해야 함', en: 'Be ready to show management review, internal and supplier audit reports' },
    ],
    steps: FDA_ORDER,
    sources: [
      { title: 'FDA – Quality Management System Regulation (QMSR)', url: 'https://www.fda.gov/medical-devices/postmarket-requirements-devices/quality-management-system-regulation-qmsr' },
      { title: 'King & Spalding – The QMSR goes live and FDA implements a new inspection technique', url: 'https://www.kslaw.com/news-and-insights/the-qmsr-goes-live-and-fda-implements-a-new-medical-device-inspection-technique' },
      { title: 'Emergo by UL – FDA expands unannounced foreign inspections (2025-05)', url: 'https://www.emergobyul.com/news/fda-expands-unannounced-inspections-foreign-manufacturing-plants-beyond-india-and-china-pilot' },
      { title: 'ProPharma – Form 483: 15 business days', url: 'https://www.propharmagroup.com/thought-leadership/fda-form-483-15-days-of-panic' },
    ],
  },
  {
    id: 'PMDA', name: { ko: '일본 PMDA', en: 'Japan PMDA' },
    criteria: { ko: 'QMS 성령(후생노동성령 제169호, ISO 13485:2016 정합)', en: 'MHLW Ordinance No. 169 (QMS Ordinance, aligned with ISO 13485:2016)' },
    who: { ko: 'PMDA 의료기기조사부(또는 등록인증기관). 실지조사·서면조사 중 PMDA가 판단', en: 'PMDA (or registered certification body); on-site or document review at PMDA’s discretion' },
    when: { ko: '승인 전, 일부변경, 수출용, 5년마다 정기조사(갱신기한 6개월 전 신청)', en: 'Pre-approval, partial change, export, 5-year periodic (apply 6 months before expiry)' },
    notice: { ko: '사전 연락·조정 후 실시', en: 'Scheduled with the applicant' },
    duration: { ko: '조사 계획에 따름', en: 'Per inspection plan' },
    language: { ko: '영어 외 외국어 자료는 일본어 또는 영어 번역 첨부, 외국 제조소 개요(양식2)는 영어 가능', en: 'Non-English documents need Japanese or English translation; foreign site overview (Form 2) may be in English' },
    findings: { ko: '지적사항 → 개선계획·결과 제출, 적합 시 기준적합증', en: 'Findings → improvement plan / results; certificate of conformity when compliant' },
    cost: { ko: '조사 수수료(실지조사 시 출장비 포함) [확인 필요]', en: 'Inspection fee (incl. travel for on-site) [check]' },
    docs: [...KO_DOCS_BASE, { ko: '외국 등록제조소 개요(양식2), 배치도·평면도·설비 목록, 부적합 연락 절차서, 품질 약정서', en: 'Foreign site overview (Form 2), layout, equipment list, defect notification SOP, quality agreements' }, { ko: '외국 당국 적합증명, ISO 13485 인증서, MDSAP 보고서(결과 상호활용)', en: 'Foreign authority certificates, ISO 13485 certificate, MDSAP report (reliance)' }],
    deltas: [
      { clause: '5.5.2', ko: '일본 제조판매업자(선임 외국제조의료기기 제조판매업자)와의 책임 분담·연락체계', en: 'Responsibilities with the Japanese marketing authorisation holder' },
      { clause: '8.2.3', ko: '일본 부적합(불구합) 정보 연락 절차', en: 'Defect information notification to the Japanese MAH' },
      { clause: '4.1', ko: 'QMS 성령 제3장(추가 요구사항) 적용 여부 확인', en: 'Check Chapter 3 additional requirements of the Ordinance' },
    ],
    steps: ISO_ORDER,
    sources: [
      { title: 'PMDA 事務連絡（令和7年10月1日）QMS適合性調査の申請資料', url: 'https://www.pmda.go.jp/files/000266406.pdf' },
      { title: 'PMDA – QMS適合性調査の調査手続き及び申請資料', url: 'https://www.pmda.go.jp/files/000273978.pdf' },
    ],
  },
  {
    id: 'ANVISA', name: { ko: '브라질 ANVISA', en: 'Brazil ANVISA' },
    criteria: { ko: 'RDC 665/2022(의료기기 GMP), RDC 687/2022(CBPF 기준), RDC 497/2021(절차)', en: 'RDC 665/2022 (device GMP), RDC 687/2022 (CBPF criteria), RDC 497/2021 (procedures)' },
    who: { ko: 'ANVISA 실사관(현장 또는 서류) 또는 MDSAP 심사기관 보고서', en: 'ANVISA inspectors (on-site or desk) or MDSAP auditing organisation report' },
    when: { ko: '3·4등급 등록에 CBPF(GMP 인증) 필요. 위험 기반으로 현장/서류 결정(RDC 687 제8조), Brazil 범위 MDSAP 보유 시 현장 실사 면제', en: 'CBPF needed for Class III/IV; risk-based on-site vs desk (RDC 687 Art. 8); waived with MDSAP covering Brazil' },
    notice: { ko: '사전 통보 후 실시 [확인 필요]', en: 'Pre-announced [check]' },
    duration: { ko: '실사 계획에 따름', en: 'Per inspection plan' },
    language: { ko: '포르투갈어·영어·스페인어 자료 [확인 필요], 통역 준비', en: 'Portuguese / English / Spanish documents [check]; interpreter' },
    findings: { ko: '지적 → 보완, CBPF 유효기간 2년(MDSAP 보유 시 4년, RDC 850/2024)', en: 'Findings → corrections; CBPF valid 2 years (4 years with MDSAP, RDC 850/2024)' },
    cost: { ko: 'CBPF 수수료(TFVS) 납부', en: 'CBPF fee (TFVS)' },
    docs: [...KO_DOCS_BASE, { ko: '브라질 등록 보유자(BRH)와의 계약·책임 분담', en: 'Agreement with the Brazilian Registration Holder' }],
    deltas: [
      { clause: '4.2.3', ko: 'RDC 665: 제품 마스터 기록·기술문서와 브라질 등록 정보 일치', en: 'RDC 665 device master record consistent with Brazilian registration' },
      { clause: '8.2.3', ko: '브라질 기술감시(Tecnovigilância) 보고', en: 'Brazilian technovigilance reporting' },
    ],
    steps: ISO_ORDER,
    sources: [
      { title: 'ANVISA – Legislação de Certificação de BPF de Dispositivos Médicos', url: 'https://www.gov.br/anvisa/pt-br/assuntos/produtosparasaude/mdsap/legislacao-de-produtos-para-a-saude' },
      { title: 'Emergo by UL – Brazil GMP certificates extended to four years', url: 'https://emergobyul.com/news/extension-brazil-gmp-certificates-four-years-official' },
    ],
  },
  {
    id: 'SFDA', name: { ko: '사우디 SFDA', en: 'Saudi SFDA' },
    criteria: { ko: 'SFDA.MD/GSO ISO 13485 최신판 및 SFDA 요구사항(MDS-REQ)', en: 'Latest SFDA.MD/GSO ISO 13485 and SFDA requirements' },
    who: { ko: 'SFDA 실사팀', en: 'SFDA inspection team' },
    when: { ko: '허가(최초)·정기·후속·민원(interactive)·제품확인 방문', en: 'Licensing, routine, follow-up, interactive (complaint) and product verification visits' },
    notice: { ko: '방문 일정 확인 요청에 현지 대리인이 기한 내 회신, SFDA가 방문 계획(유형·일수·인원) 송부', en: 'Authorised representative confirms timing; SFDA sends a visit plan (type, days, team)' },
    duration: { ko: '방문 계획에 명시(QMS 범위·생산라인·위험등급·이력 고려)', en: 'Set in the visit plan (scope, lines, risk class, history)' },
    language: { ko: '아랍어 또는 영어(또는 번역). 영어 외 언어로 진행 시 제조소가 통역 제공', en: 'Arabic or English (or translated); site provides interpreter for other languages' },
    findings: { ko: '종료 후 15일 내 보고서, 제조소 수령 확인 → SFDA 양식으로 시정계획(근본원인·시정·예방·일정), 최대 3회 수정 가능', en: 'Report within 15 days; acknowledge; corrective plan on SFDA form (root cause, CAPA, dates), up to 3 amendments' },
    cost: { ko: '방문 수수료는 제조소, 숙박·비자는 실사관 부담. 해외 제조소는 공항–숙소–제조소 이동(보험 포함) 제공', en: 'Site pays visit fees; inspectors pay hotel/visa; overseas site arranges insured transport' },
    docs: [...KO_DOCS_BASE, { ko: '시설 주소·좌표, 출입·보안·안전 안내, 참관인 승인 요청', en: 'Address and coordinates, entry/security/safety instructions, observer approval requests' }],
    deltas: [
      { clause: '6.3', ko: '회의실·프린터 제공, 개시·종료회의 최고경영자 참석 및 서명', en: 'Meeting room with printer; top management at opening/closing (signed)' },
      { clause: '8.2.3', ko: 'SFDA 이상사례·리콜 보고(NCMDR)', en: 'SFDA adverse event / recall reporting (NCMDR)' },
    ],
    steps: ISO_ORDER,
    sources: [
      { title: 'SFDA – Requirements for Inspection and QMS audit', url: 'https://www.sfda.gov.sa/sites/default/files/2022-12/InspectionQMS.pdf' },
      { title: 'SFDA – MDS-G-024 Guidance for ISO 13485 requirements', url: 'https://www.sfda.gov.sa/sites/default/files/2025-03/MDS-G024.pdf' },
    ],
  },
  {
    id: 'EU_NB', name: { ko: 'EU 인증기관(Notified Body)', en: 'EU Notified Body' },
    criteria: { ko: 'EU MDR 2017/745·IVDR 2017/746 부속서 IX(QMS+기술문서), EN ISO 13485', en: 'EU MDR/IVDR Annex IX (QMS + technical documentation), EN ISO 13485' },
    who: { ko: 'NB 심사원(EU 당국이 아닌 지정 인증기관). 주요 공급·외주업체도 심사 대상', en: 'Notified Body auditors; critical suppliers/subcontractors may be audited' },
    when: { ko: '최초·연간 사후관리·재인증 + 최소 5년에 1회 무통보 심사(고위험·이상신호 시 더 자주)', en: 'Initial, annual surveillance, recertification + unannounced audit at least once every 5 years (more often if risk)' },
    notice: { ko: '무통보 심사는 사전 통보 없음(휴무 기간은 미리 NB에 알림)', en: 'Unannounced audits have no notice (declare shutdown periods to the NB)' },
    duration: { ko: '무통보 심사 통상 심사원 2명·1일, 최근 로트를 입고부터 출하까지 추적', en: 'Unannounced: typically 2 auditors × 1 day, tracing a recent lot from receipt to release' },
    language: { ko: 'NB와 합의한 언어(대개 영어)', en: 'Language agreed with the NB (usually English)' },
    findings: { ko: '부적합(Major/Minor) → 시정계획, 미이행 시 인증 정지·취소', en: 'Major/minor NCs → corrective action plan; suspension/withdrawal if not addressed' },
    cost: { ko: '심사비(무통보·공급업체 심사 포함) 제조사 부담', en: 'Manufacturer pays (incl. unannounced and supplier audits)' },
    docs: [...KO_DOCS_BASE, { ko: '기술문서, 공급업체 계약(무통보 출입 허용 조항), 최근 로트 기록', en: 'Technical documentation, supplier contracts allowing unannounced access, recent lot records' }],
    deltas: [
      { clause: '7.4', ko: '주요 공급·외주업체 계약에 NB 무통보 출입 허용 조항', en: 'Supplier contracts allow unannounced NB access' },
      { clause: '8.2.1', ko: 'PMS·PSUR·PMCF(MDR 제83~86조)', en: 'PMS, PSUR, PMCF (MDR Art. 83–86)' },
      { clause: '5.5.2', ko: '규정준수책임자(PRRC, MDR 제15조)', en: 'Person responsible for regulatory compliance (PRRC, Art. 15)' },
      { clause: '7.5.8', ko: 'EU UDI·EUDAMED', en: 'EU UDI / EUDAMED' },
    ],
    steps: ISO_ORDER,
    sources: [
      { title: 'MDR Annex IX', url: 'https://www.medical-device-regulation.eu/2019/08/14/annex-ix/' },
      { title: 'Casus Consulting – EU unannounced NB audits (2026)', url: 'https://casusconsulting.com/eu-mdr-ivdr-unannounced-notified-body-audits-of-manufacturers-and-their-suppliers/' },
    ],
  },
  {
    id: 'MHRA', name: { ko: '영국 MHRA', en: 'UK MHRA' },
    criteria: { ko: 'UK MDR 2002(개정) — UKCA는 UK Approved Body가 심사, CE 인정·국제 신뢰(reliance) 경로 운영 [확인 필요]', en: 'UK MDR 2002 (as amended) — UKCA via UK Approved Bodies; CE recognition and international reliance routes [check]' },
    who: { ko: 'UK Approved Body 심사원(MHRA는 주로 시장감시·조사)', en: 'UK Approved Body auditors (MHRA mainly market surveillance / investigations)' },
    when: { ko: 'UKCA 최초·사후관리·재인증, 안전 문제 시 MHRA 조사 [확인 필요]', en: 'UKCA initial / surveillance / recertification; MHRA investigations for safety issues [check]' },
    notice: { ko: 'Approved Body 계약에 따름(무통보 심사 가능)', en: 'Per Approved Body contract (unannounced possible)' },
    duration: { ko: '심사 계획에 따름', en: 'Per audit plan' },
    language: { ko: '영어', en: 'English' },
    findings: { ko: '부적합 → 시정계획', en: 'Nonconformities → corrective action plan' },
    cost: { ko: '심사비 제조사 부담', en: 'Manufacturer pays' },
    docs: [...KO_DOCS_BASE, { ko: 'UK Responsible Person 계약, MHRA 기기 등록', en: 'UK Responsible Person agreement, MHRA device registration' }],
    deltas: [
      { clause: '8.2.1', ko: 'GB 시판 후 감시(PMS) 규정(2025 시행)', en: 'GB post-market surveillance regulations (in force 2025)' },
      { clause: '5.5.2', ko: 'UK Responsible Person 지정·연락', en: 'UK Responsible Person' },
    ],
    steps: ISO_ORDER,
    sources: [
      { title: 'Emergo by UL – MHRA international reliance route', url: 'https://www.emergobyul.com/news/mhra-proposes-international-reliance-route-medical-devices' },
      { title: 'Global Policy Watch – MHRA consultation response (2025-07)', url: 'https://www.globalpolicywatch.com/2025/07/mhra-announces-consultation-response-on-reforms-to-gb-pre-market-medical-device-regulation/' },
    ],
  },
  {
    id: 'NMPA', name: { ko: '중국 NMPA', en: 'China NMPA' },
    criteria: { ko: '의료기기 GMP(개정판 2026.11.1 시행: 품질보증·검증/밸리데이션·위탁생산 장 추가)', en: 'China device GMP (revision effective 2026-11-01: QA, validation, contract manufacturing)' },
    who: { ko: 'NMPA 식품약품심사검사센터(CFDI) 해외검사', en: 'CFDI overseas inspection' },
    when: { ko: '연간 해외검사 계획(2026년 33개사 통보) + for-cause, 원격검사·서류검토 병행', en: 'Annual overseas inspection plan (33 firms notified for 2026) + for-cause; remote and desk reviews' },
    notice: { ko: '2026년은 주로 무통보(for-cause) 중심 [확인 필요]', en: 'Mainly unannounced / for-cause in 2026 [check]' },
    duration: { ko: '검사 계획에 따름', en: 'Per plan' },
    language: { ko: '중국어(통역 필요)', en: 'Chinese (interpreter needed)' },
    findings: { ko: '불합격 시 수입·판매·사용 중지 → 시정 후 재검사(한국 골이식재 사례: 2023.5 중지 → 2025.4 해제)', en: 'Failure → import/sale/use suspension until re-inspection' },
    cost: { ko: '[확인 필요]', en: '[check]' },
    docs: [...KO_DOCS_BASE, { ko: '「해외 검사 대상 제품 기본정보표」, 생산·시험·품질관리 전 기록(진실성·추적성)', en: 'Basic information form for the inspected product; complete production, test and QC records' }],
    deltas: [
      { clause: '4.2.5', ko: '데이터 진실성(원자료·감사추적)', en: 'Data integrity (raw data, audit trail)' },
      { clause: '7.4', ko: '위탁생산 관리(개정 GMP)', en: 'Contract manufacturing control (revised GMP)' },
    ],
    steps: ISO_ORDER,
    sources: [{ title: 'CIRS – NMPA overseas inspection escalation', url: 'https://www.cirs-group.com/en/md/nmpa-overseas-inspection-escalation-compliance-of-overseas-medical-device-enterprises-cannot-be-delayed' }],
  },
  {
    id: 'MDSAP', name: { ko: 'MDSAP 심사기관', en: 'MDSAP Auditing Organisation' },
    criteria: { ko: 'ISO 13485:2016 + 참여국(미국·캐나다·브라질·일본·호주) 규제 요구사항', en: 'ISO 13485:2016 + participating countries’ requirements (US, CA, BR, JP, AU)' },
    who: { ko: 'MDSAP 인정 심사기관(AO)', en: 'Recognised MDSAP Auditing Organisation' },
    when: { ko: '3년 주기: 최초(1·2단계), 매년 사후관리, 재인증. FDA·ANVISA·PMDA 실사 대체·경감에 활용', en: '3-year cycle: initial, annual surveillance, recertification; used by FDA/ANVISA/PMDA for reliance' },
    notice: { ko: '사전 일정 협의(특별·무통보 심사 가능)', en: 'Scheduled (special / unannounced audits possible)' },
    duration: { ko: 'MDSAP 심사 시간 산정 절차에 따름', en: 'Per MDSAP audit time determination' },
    language: { ko: '영어 등 합의 언어', en: 'Agreed language' },
    findings: { ko: '부적합 등급(1~5) → 시정 증거 제출, 4·5등급은 당국 통보', en: 'NC grading 1–5 → evidence of correction; grades 4–5 notified to regulators' },
    cost: { ko: '심사비 제조사 부담', en: 'Manufacturer pays' },
    docs: KO_DOCS_BASE,
    deltas: [{ clause: '8.2.3', ko: '참여국별 이상사례 보고 요건', en: 'Adverse event reporting for each participating country' }],
    steps: MDSAP_ORDER,
    sources: [{ title: 'Emergo by UL – Brazil GMP certificates with MDSAP', url: 'https://emergobyul.com/news/extension-brazil-gmp-certificates-four-years-official' }],
  },
];

export const AGENCY_BY_ID = Object.fromEntries(AGENCIES.map((a) => [a.id, a])) as Record<AgencyId, Agency>;
