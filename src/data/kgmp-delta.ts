// Korea-specific expectations that an ISO 13485 / MDSAP quality system usually does not state explicitly, but that
// MFDS auditors check at an overseas site (KGMP [별표 2] read together with the Medical Devices Act and MFDS guidance).
// Each item is detected in the uploaded documents: "met" = addressed for Korea, "generic" = the mechanism exists but
// Korea / the Korean importer is not named, "missing" = not found. References marked [확인 필요] must be checked against
// the current legal text before they are quoted to a client.
import type { AuditConfig } from './rules';

export type Effort = 'S' | 'M' | 'L';
export type Severity = 'major' | 'minor' | 'obs' | 'ofi';

export interface Bi { ko: string; en: string }

export interface KDelta {
  id: string;
  clause: string; // KGMP clause it belongs to
  title: Bi;
  need: Bi; // what the auditor expects to see
  ref: string;
  /** the topic, anywhere in the documents (generic mechanism) */
  topic: RegExp;
  /** extra condition for "Korea-specific" — default: a Korea marker within a few lines of the topic */
  korea?: RegExp;
  applies?: (c: AuditConfig) => boolean;
  ifMissing: Severity; // severity when nothing is found
  effort: Effort;
  action: Bi; // recommended action without rewriting the QM
  annex: Bi; // draft clause text for the KGMP supplement (placeholders in [brackets])
}

export const KOREA = /\b(korea|korean|republic of korea|south korea|mfds|kfda|k-?gmp|nids|nikom)\b|대한민국|한국|식약처|식품의약품안전처|의료기기안전정보원|韓国|韩国/i;

const IMPORTER = /\b(importer|import license holder|licen[cs]e holder|klh|local (?:license |licence )?holder|authori[sz]ed representative|local representative|distributor)\b|수입업자|수입자|허가권자|수입사/i;

export const KDELTAS: KDelta[] = [
  {
    id: 'K1', clause: '4.1', title: { ko: '한국 수입업자(허가권자)와의 품질 책임 분담', en: 'Quality responsibilities with the Korean importer (licence holder)' },
    need: { ko: '수입업자와 제조소 간 품질협약(역할·통보·기록 제공·실사 협조)이 문서로 정해져 있을 것', en: 'A written quality agreement with the Korean importer covering roles, notifications, record access and audit support' },
    ref: 'KGMP [별표2] 4.1.5·7.2.3, 의료기기법 수입업자 의무 [확인 필요]',
    topic: new RegExp(`(${IMPORTER.source}).{0,80}(agreement|responsib|contract|협약|계약|책임)|(quality agreement|품질협약|품질 협약)`, 'i'),
    korea: new RegExp(`${KOREA.source}|${IMPORTER.source}`, 'i'),
    ifMissing: 'major', effort: 'M',
    action: { ko: '기존 품질협약 양식에 한국 수입업자용 부록(통보 항목·기한, 기록 제공, MFDS 실사 협조)을 추가', en: 'Add a Korea appendix to the existing quality agreement (notifications and deadlines, record access, MFDS audit support)' },
    annex: { ko: '제조소는 대한민국 수입업자 [수입업자명]과 품질협약 [문서번호]를 체결하며, 협약에는 변경·부적합·불만·이상사례·회수 정보의 통보 기한, KGMP 심사 대응 및 기록 제공 책임을 포함한다.', en: 'The site maintains quality agreement [doc no.] with the Korean importer [name], defining notification timelines for changes, nonconformities, complaints, adverse events and recalls, and responsibilities for KGMP audits and record access.' },
  },
  {
    id: 'K2', clause: '8.2.3', title: { ko: '한국 내 이상사례(부작용) 보고 경로', en: 'Adverse-event reporting route for Korea' },
    need: { ko: '한국에서 발생한 이상사례·안전성 정보를 수입업자를 통해 MFDS에 기한 내 보고하는 절차', en: 'A procedure to report Korean adverse events / safety information to MFDS through the importer within the legal deadline' },
    ref: 'KGMP [별표2] 8.2.3, 의료기기법 부작용 보고 조항 [확인 필요]',
    topic: /\b(vigilance|adverse event|incident report|mdr report|reportable event|safety information)\b|부작용|이상사례|안전성 정보/i,
    ifMissing: 'major', effort: 'S',
    action: { ko: '이상사례 보고 절차의 국가별 표에 대한민국(MFDS·수입업자 경유·보고 기한) 행 추가', en: 'Add a Republic of Korea row (MFDS, via importer, deadline) to the country table of the vigilance procedure' },
    annex: { ko: '대한민국에서 인지된 이상사례 및 안전성 정보는 인지 후 [n]일 이내에 수입업자 [수입업자명]에게 통보하고, 수입업자가 MFDS 보고 기한 내에 보고한다. 제조소는 보고에 필요한 조사 자료를 제공한다.', en: 'Adverse events and safety information arising in Korea are notified to the importer [name] within [n] days of awareness; the importer reports to MFDS within the legal deadline, supported by the site’s investigation data.' },
  },
  {
    id: 'K3', clause: '8.3', title: { ko: '한국 내 회수·시정조치 연계', en: 'Recall / field action coordination for Korea' },
    need: { ko: '회수·현장시정조치 결정 시 한국 수입업자 통보와 MFDS 회수 계획 지원', en: 'Notify the Korean importer of recalls / field actions and support the MFDS recall plan' },
    ref: 'KGMP [별표2] 8.3.3, 의료기기법 회수 조항 [확인 필요]',
    topic: /\b(recall|field safety corrective|fsca|field action|advisory notice)\b|회수|시정조치/i,
    ifMissing: 'major', effort: 'S',
    action: { ko: '회수 절차의 통보 대상에 한국 수입업자를 추가하고 MFDS 회수계획 제출 지원을 명시', en: 'Add the Korean importer to recall notification lists and state support for the MFDS recall plan' },
    annex: { ko: '대한민국에 공급된 제품의 회수 또는 현장 시정조치가 결정되면 [n]일 이내에 수입업자에게 통보하고, 수입업자의 MFDS 회수계획 수립에 필요한 공급내역·로트 정보를 제공한다.', en: 'When a recall or field action affects product supplied to Korea, the importer is notified within [n] days and given distribution and lot data for the MFDS recall plan.' },
  },
  {
    id: 'K4', clause: '7.3', title: { ko: '변경 시 한국 허가·인정서 영향 평가', en: 'Change impact on the Korean licence / KGMP certificate' },
    need: { ko: '설계·공정·소재지·주요 공급업체 변경 시 한국 허가(변경허가)·KGMP(변경심사) 영향 평가와 수입업자 사전 통보', en: 'Changes to design, process, site or critical suppliers are assessed for the Korean licence and KGMP certificate and notified to the importer in advance' },
    ref: 'KGMP 고시 제4조(변경심사), [별표2] 7.3.9, 의료기기법 변경허가 [확인 필요]',
    topic: /\b(change control|change management|design change|change notification|regulatory impact|notif\w* (?:of )?change)\b|변경관리|변경 관리|변경통보/i,
    ifMissing: 'major', effort: 'S',
    action: { ko: '변경관리 양식의 규제 영향 평가 항목에 "대한민국(MFDS) 허가·KGMP"를 추가', en: 'Add "Republic of Korea (MFDS licence / KGMP)" to the regulatory-impact section of the change form' },
    annex: { ko: '변경관리 시 대한민국 허가사항 및 KGMP 적합인정서에 대한 영향을 평가하고, 변경허가 또는 변경심사가 필요한 변경은 시행 [n]일 전까지 수입업자에게 통보한다.', en: 'Each change is assessed for impact on the Korean licence and KGMP certificate; changes requiring a licence amendment or change review are notified to the importer at least [n] days before implementation.' },
  },
  {
    id: 'K5', clause: '7.5.1', title: { ko: '한국어 표시기재·첨부문서', en: 'Korean labelling and instructions for use' },
    need: { ko: '한국 허가사항과 일치하는 한국어 표시기재(라벨·첨부문서)의 작성·승인·부착 책임 및 관리', en: 'Control of Korean labels and IFU matching the Korean licence, with clear responsibility for creation, approval and application' },
    ref: 'KGMP [별표2] 7.5.1, 의료기기법 표시기재 조항 [확인 필요]',
    topic: /\b(label(?:l)?ing|labels?|instructions for use|ifu|artwork)\b|표시기재|라벨|첨부문서|사용설명서/i,
    ifMissing: 'minor', effort: 'S',
    action: { ko: '라벨 관리 절차에 한국어 표시(작성 주체: 제조소/수입업자, 허가사항 대조 확인)를 추가', en: 'Add Korean labelling (who creates it, check against the Korean licence) to the labelling procedure' },
    annex: { ko: '대한민국 공급 제품의 한국어 표시기재 및 첨부문서는 [제조소/수입업자]가 작성하고, 허가사항과의 일치 여부를 출하 전 확인한다.', en: 'Korean labels and IFU for product supplied to Korea are prepared by [site / importer] and checked against the Korean licence before release.' },
  },
  {
    id: 'K6', clause: '7.5.8', title: { ko: '의료기기 표준코드(UDI) — 한국', en: 'Korean UDI (standard code)' },
    need: { ko: '한국 표준코드(UDI) 부여·표시와 수입업자의 통합정보시스템 등록·공급내역 보고 지원', en: 'Korean UDI assignment / marking and support for the importer’s UDI database and supply reporting' },
    ref: 'KGMP [별표2] 7.5.8, 의료기기 표준코드 관련 고시 [확인 필요]',
    topic: /\b(udi|unique device identif\w*|gtin|gudid|eudamed)\b|표준코드|고유식별/i,
    ifMissing: 'minor', effort: 'S',
    action: { ko: 'UDI 절차의 데이터베이스 목록에 한국(수입업자 등록)을 추가', en: 'Add Korea (registered by the importer) to the UDI database list in the UDI procedure' },
    annex: { ko: '대한민국 공급 제품에는 표준코드를 표시하며, 수입업자의 표준코드 등록 및 공급내역 보고에 필요한 데이터를 제공한다.', en: 'Product supplied to Korea carries the Korean standard code; the site provides the data the importer needs for UDI registration and supply reporting.' },
  },
  {
    id: 'K7', clause: '7.5.9', title: { ko: '추적관리대상 의료기기의 추적성', en: 'Traceability for designated tracked devices' },
    need: { ko: '추적관리대상(이식형 등)이면 한국 공급분의 로트·일련번호 추적 기록을 수입업자에 제공', en: 'For tracked (e.g. implantable) devices, provide lot / serial traceability for Korean supply to the importer' },
    ref: 'KGMP [별표2] 7.5.9.2, 의료기기법 추적관리 조항 [확인 필요]',
    topic: /\b(traceab\w*|tracking|serial number|lot number|distribution record)\b|추적|일련번호|제조번호/i,
    applies: (c) => c.humanAnimal || c.grade >= 3,
    ifMissing: 'minor', effort: 'S',
    action: { ko: '추적성 절차에 한국 추적관리대상 품목 여부와 기록 제공 기한을 명시', en: 'State in the traceability procedure whether the product is a Korean tracked device and the record-delivery timeline' },
    annex: { ko: '대한민국 추적관리대상 의료기기에 해당하는 제품은 로트·일련번호별 출하 기록을 유지하고 수입업자 요청 시 [n]일 이내에 제공한다.', en: 'For products designated as tracked devices in Korea, lot / serial shipment records are kept and provided to the importer within [n] days on request.' },
  },
  {
    id: 'K8', clause: '5.5.2', title: { ko: '품질책임자 지정과 KGMP 대응 권한', en: 'Management representative and KGMP authority' },
    need: { ko: '품질책임자(경영대리인)의 지정·권한이 문서화되고 KGMP 심사 대응 책임이 명시될 것', en: 'Documented appointment and authority of the management representative, including KGMP audit responsibility' },
    ref: 'KGMP [별표2] 5.5.2',
    topic: /\b(management representative|quality representative|head of qa|qa manager|quality manager|prrc)\b|품질책임자|경영대리인/i,
    korea: /\b(regulatory|regulator|authorit|audit|k-?gmp|mfds)\w*/i,
    ifMissing: 'major', effort: 'S',
    action: { ko: '품질책임자 임명서 또는 직무기술서에 "KGMP 심사 대응·한국 수입업자 연락" 책임 한 줄 추가', en: 'Add "KGMP audits and liaison with the Korean importer" to the representative’s appointment letter or job description' },
    annex: { ko: '[직위/성명]을 KGMP 품질책임자로 지정하며, 품질경영시스템 유지, KGMP 심사 대응 및 대한민국 수입업자와의 품질 관련 연락을 책임진다.', en: '[Title / name] is designated as management representative for KGMP, responsible for maintaining the QMS, KGMP audits and quality communication with the Korean importer.' },
  },
  {
    id: 'K9', clause: '4.2.3', title: { ko: '의료기기파일 ↔ 한국 제품표준서 대응', en: 'Medical device file vs Korean product standard' },
    need: { ko: '의료기기파일(기술문서)이 한국 허가 제품표준서의 모양·구조, 원재료, 제조방법, 사용목적, 시험규격과 대응될 것', en: 'The medical device file maps to the Korean product standard (design, materials, manufacturing, intended use, test specifications)' },
    ref: 'KGMP [별표2] 4.2.3, 해설서 의료기기파일 [확인 필요]',
    topic: /\b(medical device file|technical file|technical documentation|device master record|dmr|design dossier)\b|제품표준서|의료기기파일|기술문서/i,
    korea: /제품표준서|product standard|korea|mfds/i,
    ifMissing: 'major', effort: 'M',
    action: { ko: '의료기기파일 목차에 "한국 제품표준서 대응표"(허가사항 ↔ 기술문서 위치)를 추가', en: 'Add a "Korean product standard cross-reference" (licence items ↔ technical file location) to the device file index' },
    annex: { ko: '대한민국 허가 품목마다 의료기기파일과 허가 제품표준서의 대응표 [문서번호]를 유지하며, 허가사항 변경 시 함께 개정한다.', en: 'For each Korean-licensed product a cross-reference [doc no.] between the device file and the Korean product standard is maintained and revised with any licence change.' },
  },
  {
    id: 'K10', clause: '4.2.5', title: { ko: '전자기록·데이터 무결성', en: 'Electronic records and data integrity' },
    need: { ko: '전자기록의 접근통제·감사추적·백업 등 데이터 무결성(ALCOA+) 관리', en: 'Data integrity controls for electronic records (access control, audit trail, backup; ALCOA+)' },
    ref: 'KGMP [별표2] 4.2.5 (컴퓨터 시스템·전자기록) — 2026 개정 강조사항 [확인 필요]',
    topic: /\b(data integrity|alcoa|audit trail|electronic record|electronic signature|21 cfr part 11|part 11|backup)\b|데이터 무결성|감사추적|전자기록|전자서명/i,
    korea: /\b(alcoa|data integrity|audit trail)\b|데이터 무결성|감사추적/i,
    ifMissing: 'minor', effort: 'M',
    action: { ko: '기록관리 절차에 ALCOA+ 원칙과 전자기록 감사추적·백업 주기를 추가', en: 'Add ALCOA+ principles, audit trail and backup frequency for electronic records to the records procedure' },
    annex: { ko: '품질기록은 ALCOA+ 원칙(귀속성·판독성·동시성·원본성·정확성 및 완전성·일관성·영속성·가용성)에 따라 관리하며, 전자기록 시스템은 접근통제, 감사추적 및 [주기] 백업을 적용한다.', en: 'Quality records follow ALCOA+ principles; electronic record systems apply access control, audit trail and [frequency] backup.' },
  },
  {
    id: 'K11', clause: '7.3', title: { ko: 'SW 의료기기 사이버보안', en: 'Cybersecurity for software medical devices' },
    need: { ko: 'SW 의료기기·SW 포함 의료기기의 사이버보안 위험관리·업데이트 관리 (디지털의료기기 K-GMP 포함)', en: 'Cybersecurity risk management and update control for SaMD / SiMD (incl. Digital K-GMP)' },
    ref: '디지털의료제품법·디지털의료기기 K-GMP, 사이버보안 가이드라인 [확인 필요]',
    topic: /\b(cyber ?security|vulnerabilit|penetration test|sbom|threat model|iec 81001-5-1)\b|사이버보안|취약점/i,
    korea: /\b(cyber ?security|sbom|iec 81001-5-1)\b|사이버보안/i,
    applies: (c) => c.software || c.innovativeSw,
    ifMissing: 'major', effort: 'L',
    action: { ko: 'SW 개발 절차에 사이버보안 위험관리(IEC 81001-5-1 기준)와 SBOM·취약점 관리 항목 추가', en: 'Add cybersecurity risk management (IEC 81001-5-1), SBOM and vulnerability handling to the software procedure' },
    annex: { ko: 'SW 의료기기는 [절차번호]에 따라 사이버보안 위험관리, SBOM 관리 및 취약점 대응을 수행하며, 보안 업데이트가 대한민국 허가에 미치는 영향을 변경관리로 평가한다.', en: 'Software devices undergo cybersecurity risk management, SBOM control and vulnerability handling per [procedure no.]; the impact of security updates on the Korean licence is assessed under change control.' },
  },
  {
    id: 'K12', clause: '8.2.2', title: { ko: '한국 고객불만의 수입업자 연계', en: 'Korean complaints via the importer' },
    need: { ko: '수입업자가 접수한 한국 불만의 접수·조사·회신 경로와 기한', en: 'Route and timelines for complaints received by the Korean importer (intake, investigation, reply)' },
    ref: 'KGMP [별표2] 8.2.2',
    topic: /\b(complaint)s?\b|불만|苦情|reclam/i,
    korea: new RegExp(`${KOREA.source}|${IMPORTER.source}`, 'i'),
    ifMissing: 'major', effort: 'S',
    action: { ko: '불만처리 절차의 접수 경로에 "해외 수입업자(한국 포함)" 경로와 회신 기한 추가', en: 'Add the overseas importer (incl. Korea) intake route and reply deadline to the complaint procedure' },
    annex: { ko: '대한민국 수입업자가 접수한 불만은 [n]일 이내 제조소에 전달되고, 제조소는 조사 결과를 [n]일 이내 회신하며 이상사례 해당 여부를 함께 판단한다.', en: 'Complaints received by the Korean importer reach the site within [n] days; the site replies with investigation results within [n] days, including the adverse-event decision.' },
  },
];
