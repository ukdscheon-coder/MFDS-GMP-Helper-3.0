// KGMP ([별표 2], ISO 13485:2016 structure) reference data and the MFDS audit plan order.
// Audit order follows section 7 "Audit Plan and Time Schedule" of an MFDS audit plan; dates and times are intentionally omitted.

export interface Clause {
  id: string; // e.g. "7.5.6"
  en: string;
  ko: string;
  /** lower-case keywords in several languages, used for rule-based matching */
  kw: string[];
}

export const CLAUSES: Clause[] = [
  { id: '4.1', en: 'General requirements', ko: '일반 요구사항', kw: ['quality management system', 'qms', 'process interaction', 'outsourc', 'quality agreement', 'software validation qms', 'qualitätsmanagementsystem', 'sistema di gestione', 'système de management', 'sistema de gestión', '品質マネジメントシステム', '质量管理体系', '품질경영시스템', '외주'] },
  { id: '4.2.1', en: 'Documentation requirements – General', ko: '문서화 요구사항 – 일반', kw: ['documentation structure', 'document hierarchy', 'quality policy and objectives document', '문서체계'] },
  { id: '4.2.2', en: 'Quality manual', ko: '품질매뉴얼', kw: ['quality manual', 'qualitätsmanagementhandbuch', 'qm-handbuch', 'manuale della qualità', 'manuel qualité', 'manual de calidad', '品質マニュアル', '质量手册', '품질매뉴얼', '품질 매뉴얼'] },
  { id: '4.2.3', en: 'Medical device file', ko: '의료기기파일(제품표준서)', kw: ['medical device file', 'technical file', 'technical documentation', 'device master record', 'dmr', 'design dossier', 'product file', 'technische dokumentation', 'fascicolo tecnico', 'dossier technique', 'expediente técnico', '技術ファイル', '技术文件', '제품표준서', '기술문서', '의료기기파일'] },
  { id: '4.2.4', en: 'Control of documents', ko: '문서관리', kw: ['document control', 'control of documents', 'document management', 'lenkung von dokumenten', 'dokumentenlenkung', 'controllo dei documenti', 'maîtrise des documents', 'control de documentos', '文書管理', '文件控制', '문서관리', '문서 관리'] },
  { id: '4.2.5', en: 'Control of records', ko: '기록관리', kw: ['control of records', 'record control', 'records management', 'retention', 'lenkung von aufzeichnungen', 'controllo delle registrazioni', 'maîtrise des enregistrements', 'control de registros', '記録の管理', '记录控制', '기록관리', '기록 관리'] },
  { id: '5.1', en: 'Management commitment', ko: '경영의지', kw: ['management commitment', 'top management commitment', 'verantwortung der leitung', 'impegno della direzione', 'engagement de la direction', '경영의지', '경영 의지'] },
  { id: '5.2', en: 'Customer focus', ko: '고객중심', kw: ['customer focus', 'kundenorientierung', 'focalizzazione sul cliente', 'écoute client', '고객중심'] },
  { id: '5.3', en: 'Quality policy', ko: '품질방침', kw: ['quality policy', 'qualitätspolitik', 'politica per la qualità', 'politique qualité', 'política de calidad', '品質方針', '质量方针', '품질방침'] },
  { id: '5.4', en: 'Planning (quality objectives, QMS planning)', ko: '기획(품질목표·품질경영시스템 기획)', kw: ['quality objective', 'qms planning', 'qualitätsziele', 'obiettivi per la qualità', 'objectifs qualité', 'objetivos de calidad', '品質目標', '质量目标', '품질목표'] },
  { id: '5.5.1', en: 'Responsibility and authority', ko: '책임과 권한', kw: ['responsibility and authority', 'organization chart', 'organisation chart', 'organigram', 'job description', 'verantwortung und befugnis', 'organigramm', 'organigramma', 'responsabilité et autorité', 'organigrama', '組織図', '组织机构', '조직도', '책임과 권한', '직무기술서'] },
  { id: '5.5.2', en: 'Management representative', ko: '품질책임자', kw: ['management representative', 'quality representative', 'beauftragter der leitung', 'rappresentante della direzione', 'représentant de la direction', 'representante de la dirección', '管理責任者', '管理者代表', '품질책임자'] },
  { id: '5.5.3', en: 'Internal communication', ko: '내부 의사소통', kw: ['internal communication', 'interne kommunikation', 'comunicazione interna', 'communication interne', '내부 의사소통'] },
  { id: '5.6', en: 'Management review', ko: '경영검토', kw: ['management review', 'managementbewertung', 'riesame della direzione', 'revue de direction', 'revisión por la dirección', 'マネジメントレビュー', '管理评审', '경영검토', '경영 검토'] },
  { id: '6.1', en: 'Provision of resources', ko: '자원의 확보', kw: ['provision of resources', 'resource management', 'bereitstellung von ressourcen', 'messa a disposizione delle risorse', 'mise à disposition des ressources', '자원의 확보', '자원관리'] },
  { id: '6.2', en: 'Human resources', ko: '인적자원', kw: ['human resources', 'training', 'competence', 'qualification of personnel', 'personnel', 'schulung', 'personal', 'formazione', 'risorse umane', 'formation', 'capacitación', '教育訓練', '培训', '인적자원', '교육훈련', '교육 훈련'] },
  { id: '6.3', en: 'Infrastructure', ko: '기반시설', kw: ['infrastructure', 'maintenance', 'preventive maintenance', 'facility', 'equipment maintenance', 'infrastruktur', 'instandhaltung', 'wartung', 'infrastrutture', 'manutenzione', 'entretien', 'mantenimiento', 'インフラストラクチャー', '保守', '基础设施', '维护', '기반시설', '설비관리', '유지보수'] },
  { id: '6.4', en: 'Work environment and contamination control', ko: '작업환경과 오염관리', kw: ['work environment', 'cleanroom', 'clean room', 'environmental monitoring', 'contamination control', 'hygiene', 'gowning', 'arbeitsumgebung', 'reinraum', 'ambiente di lavoro', 'camera bianca', 'environnement de travail', 'salle propre', 'ambiente de trabajo', 'sala limpia', '作業環境', 'クリーンルーム', '工作环境', '洁净室', '작업환경', '청정실', '오염관리'] },
  { id: '7.1', en: 'Planning of product realization (risk management)', ko: '제품실현의 기획(위험관리)', kw: ['risk management', 'iso 14971', 'product realization', 'fmea', 'hazard analysis', 'cybersecurity', 'risikomanagement', 'gestione del rischio', 'gestion des risques', 'gestión de riesgos', 'リスクマネジメント', '风险管理', '위험관리', '제품실현'] },
  { id: '7.2', en: 'Customer-related processes', ko: '고객 관련 프로세스', kw: ['customer-related', 'contract review', 'order review', 'order processing', 'sales', 'tender', 'kundenbezogene', 'vertragsprüfung', 'riesame del contratto', 'revue de contrat', 'revisión del contrato', '顧客関連', '合同评审', '고객 관련', '계약검토', '주문'] },
  { id: '7.3', en: 'Design and development', ko: '설계 및 개발', kw: ['design and development', 'design control', 'design input', 'design output', 'design review', 'design verification', 'design validation', 'design transfer', 'design change', 'design history file', 'dhf', 'usability', 'clinical evaluation', 'entwicklung', 'design', 'progettazione e sviluppo', 'conception et développement', 'diseño y desarrollo', '設計開発', '设计和开发', '설계 및 개발', '설계'] },
  { id: '7.4', en: 'Purchasing', ko: '구매', kw: ['purchasing', 'supplier', 'vendor', 'incoming inspection', 'approved supplier list', 'beschaffung', 'lieferant', 'wareneingangsprüfung', 'approvvigionamento', 'fornitor', 'achats', 'fournisseur', 'compras', 'proveedor', '購買', 'サプライヤー', '采购', '供应商', '구매', '공급업체', '수입검사'] },
  { id: '7.5.1', en: 'Control of production and service provision', ko: '생산 및 서비스 제공 관리', kw: ['production control', 'manufacturing', 'work instruction', 'work order', 'batch record', 'device history record', 'dhr', 'production process', 'release', 'labelling', 'labeling', 'packaging', 'produktion', 'fertigung', 'arbeitsanweisung', 'produzione', 'istruzione operativa', 'production', 'fabrication', 'producción', 'fabricación', '製造', '作業手順', '生产', '作业指导书', '생산', '제조', '작업지시서', '제조지시서', '제조기록'] },
  { id: '7.5.2', en: 'Cleanliness of product', ko: '제품의 청결', kw: ['cleanliness of product', 'product cleaning', 'cleaning process', 'reinigung', 'pulizia', 'nettoyage', 'limpieza', '洗浄', '清洁', '세척'] },
  { id: '7.5.3', en: 'Installation activities', ko: '설치 활동', kw: ['installation', 'installation qualification of product', 'montage', 'installazione', 'instalación', '据付', '安装', '설치'] },
  { id: '7.5.4', en: 'Servicing activities', ko: '서비스 활동', kw: ['servicing', 'service activities', 'field service', 'repair', 'kundendienst', 'assistenza tecnica', 'service après-vente', 'servicio técnico', 'サービス', '服务', '서비스', '수리'] },
  { id: '7.5.5', en: 'Particular requirements for sterile medical devices', ko: '멸균 의료기기에 대한 특별 요구사항', kw: ['sterile device', 'sterilization record', 'sterilization batch', 'steril', 'sterile', 'stérile', 'estéril', '滅菌', '灭菌', '멸균'] },
  { id: '7.5.6', en: 'Validation of processes for production and service provision', ko: '생산 및 서비스 제공 프로세스의 유효성 확인', kw: ['process validation', 'iq', 'oq', 'pq', 'installation qualification', 'operational qualification', 'performance qualification', 'special process', 'software validation production', 'prozessvalidierung', 'validazione di processo', 'validation des procédés', 'validación de procesos', 'プロセスバリデーション', '过程确认', '공정 밸리데이션', '프로세스 유효성', '밸리데이션'] },
  { id: '7.5.7', en: 'Validation of processes for sterilization and sterile barrier systems', ko: '멸균과 멸균포장 프로세스의 유효성 확인', kw: ['sterilization validation', 'sterile barrier', 'iso 11135', 'iso 11137', 'iso 17665', 'iso 11607', 'ethylene oxide', 'gamma', 'sterilisationsvalidierung', 'validazione della sterilizzazione', 'validation de stérilisation', '滅菌バリデーション', '灭菌确认', '멸균 밸리데이션', '멸균포장'] },
  { id: '7.5.8', en: 'Identification', ko: '식별', kw: ['identification', 'udi', 'unique device identification', 'labeling identification', 'returned product', 'kennzeichnung', 'identificazione', 'identification du produit', 'identificación', '識別', '标识', '식별', '표준코드'] },
  { id: '7.5.9', en: 'Traceability', ko: '추적성', kw: ['traceability', 'tracking', 'lot traceability', 'distribution record', 'implantable', 'rückverfolgbarkeit', 'rintracciabilità', 'tracciabilità', 'traçabilité', 'trazabilidad', 'トレーサビリティ', '可追溯', '추적성', '추적관리'] },
  { id: '7.5.10', en: 'Customer property', ko: '고객자산', kw: ['customer property', 'eigentum des kunden', 'proprietà del cliente', 'propriété du client', 'propiedad del cliente', '顧客の所有物', '顾客财产', '고객자산', '고객 자산'] },
  { id: '7.5.11', en: 'Preservation of product', ko: '제품의 보존', kw: ['preservation', 'storage', 'handling', 'warehouse', 'shipping', 'distribution', 'shelf life', 'stability', 'erhaltung', 'lagerung', 'conservazione', 'magazzino', 'préservation', 'stockage', 'preservación', 'almacenamiento', '保存', '保管', '防护', '贮存', '보존', '보관', '창고'] },
  { id: '7.6', en: 'Control of monitoring and measuring equipment', ko: '모니터링 및 측정 장비의 관리', kw: ['calibration', 'measuring equipment', 'monitoring and measuring', 'metrology', 'kalibrierung', 'prüfmittel', 'taratura', 'strumenti di misura', 'étalonnage', 'calibración', '校正', '校准', '교정', '측정장비', '계측기'] },
  { id: '8.1', en: 'Measurement, analysis and improvement – General', ko: '측정, 분석 및 개선 – 일반', kw: ['statistical technique', 'statistical method', 'measurement analysis and improvement', 'statistische', 'tecniche statistiche', 'techniques statistiques', '통계적 기법'] },
  { id: '8.2.1', en: 'Feedback', ko: '피드백', kw: ['feedback', 'post-market surveillance', 'post market surveillance', 'pms', 'customer satisfaction', 'marktbeobachtung', 'sorveglianza post-commercializzazione', 'surveillance après commercialisation', 'vigilancia poscomercialización', '市販後', '上市后监督', '피드백', '시판후', '시판 후'] },
  { id: '8.2.2', en: 'Complaint handling', ko: '불만처리', kw: ['complaint', 'reklamation', 'beschwerde', 'reclami', 'réclamation', 'reclamación', 'queja', '苦情', '投诉', '불만', '고객불만'] },
  { id: '8.2.3', en: 'Reporting to regulatory authorities', ko: '규제 당국에 보고', kw: ['vigilance', 'adverse event', 'regulatory reporting', 'reporting to regulatory authorities', 'mdr reporting', 'incident report', 'advisory notice', 'field safety', 'vorkommnis', 'vigilanza', 'matériovigilance', 'vigilancia', '不具合報告', '不良事件', '부작용', '이상사례', '규제 당국'] },
  { id: '8.2.4', en: 'Internal audit', ko: '내부감사', kw: ['internal audit', 'audit program', 'internes audit', 'audit interno', 'audit interne', 'auditoría interna', '内部監査', '内部审核', '내부감사', '내부 감사', '내부심사'] },
  { id: '8.2.5', en: 'Monitoring and measurement of processes', ko: '프로세스의 모니터링 및 측정', kw: ['process monitoring', 'process performance', 'kpi', 'prozessüberwachung', 'monitoraggio dei processi', 'surveillance des processus', '프로세스 모니터링'] },
  { id: '8.2.6', en: 'Monitoring and measurement of product', ko: '제품의 모니터링 및 측정', kw: ['final inspection', 'in-process inspection', 'product release', 'testing', 'test record', 'inspection', 'acceptance', 'endprüfung', 'prüfung', 'collaudo', 'controllo finale', 'contrôle final', 'inspección final', '最終検査', '检验', '최종검사', '출하검사', '시험검사', '공정검사'] },
  { id: '8.3', en: 'Control of nonconforming product', ko: '부적합 제품의 관리', kw: ['nonconforming', 'non-conforming', 'nonconformity', 'concession', 'rework', 'recall', 'lenkung fehlerhafter', 'nichtkonform', 'non conforme', 'non conformità', 'non-conforme', 'producto no conforme', '不適合', '不合格品', '부적합'] },
  { id: '8.4', en: 'Analysis of data', ko: '데이터 분석', kw: ['data analysis', 'analysis of data', 'trend analysis', 'datenanalyse', 'analisi dei dati', 'analyse des données', 'análisis de datos', 'データ分析', '数据分析', '데이터 분석'] },
  { id: '8.5', en: 'Improvement (corrective and preventive action)', ko: '개선(시정조치·예방조치)', kw: ['corrective action', 'preventive action', 'capa', 'improvement', 'root cause', 'korrekturmaßnahme', 'vorbeugungsmaßnahme', 'azione correttiva', 'azione preventiva', 'action corrective', 'action préventive', 'acción correctiva', 'acción preventiva', '是正処置', '予防処置', '纠正措施', '预防措施', '시정조치', '예방조치', '개선'] },
];

export const CLAUSE_BY_ID: Record<string, Clause> = Object.fromEntries(CLAUSES.map((c) => [c.id, c]));

export type Auditor = 'MFDS' | 'QMS' | 'all';

export interface AuditStep {
  order: number;
  day: number;
  article: string; // as shown in the plan
  en: string;
  ko: string;
  auditor: Auditor;
  /** clause ids whose documents are listed under this step; empty = meeting/tour */
  clauses: string[];
}

// Order only — derived from section 7 of the MFDS Audit Plan. Clauses the plan does not list separately
// (e.g. 5.1–5.4, 7.5.1–7.5.7, 8.2.5) are placed under their parent step.
export const AUDIT_STEPS: AuditStep[] = [
  { order: 1, day: 1, article: '–', en: 'Opening meeting', ko: '개시회의(심사 범위·방법 설명, 일정 확인, 회사 소개)', auditor: 'all', clauses: [] },
  { order: 2, day: 1, article: '–', en: 'Factory tour', ko: '공장 투어', auditor: 'all', clauses: [] },
  { order: 3, day: 1, article: '4.1', en: 'General requirement', ko: '일반 요구사항', auditor: 'QMS', clauses: ['4.1'] },
  { order: 4, day: 1, article: '4.2', en: 'Documentation requirements', ko: '문서화 요구사항', auditor: 'QMS', clauses: ['4.2.1', '4.2.2', '4.2.4', '4.2.5'] },
  { order: 5, day: 1, article: '4.2.3', en: 'Medical device file', ko: '의료기기파일(제품표준서)', auditor: 'MFDS', clauses: ['4.2.3'] },
  { order: 6, day: 1, article: '5.', en: 'Management responsibility – Responsibility and authority', ko: '경영책임 – 책임과 권한', auditor: 'QMS', clauses: ['5.1', '5.2', '5.3', '5.4', '5.5.1', '5.5.3'] },
  { order: 7, day: 1, article: '5.5.2', en: 'Management representative', ko: '품질책임자', auditor: 'MFDS', clauses: ['5.5.2'] },
  { order: 8, day: 1, article: '5.6', en: 'Management review', ko: '경영검토', auditor: 'QMS', clauses: ['5.6'] },
  { order: 9, day: 1, article: '8.2.4', en: 'Internal audit', ko: '내부감사', auditor: 'QMS', clauses: ['8.2.4'] },
  { order: 10, day: 1, article: '6.2', en: 'Human resources', ko: '인적자원', auditor: 'QMS', clauses: ['6.2'] },
  { order: 11, day: 2, article: '6.1', en: 'Resource management – Provision of resources', ko: '자원관리 – 자원의 확보', auditor: 'MFDS', clauses: ['6.1'] },
  { order: 12, day: 2, article: '6.3', en: 'Infrastructure', ko: '기반시설', auditor: 'QMS', clauses: ['6.3'] },
  { order: 13, day: 2, article: '6.4', en: 'Work environment', ko: '작업환경', auditor: 'QMS', clauses: ['6.4'] },
  { order: 14, day: 2, article: '7.1', en: 'Planning of product realization – Risk management', ko: '제품실현의 기획 – 위험관리', auditor: 'QMS', clauses: ['7.1'] },
  { order: 15, day: 2, article: '7.3', en: 'Design and development', ko: '설계 및 개발', auditor: 'QMS', clauses: ['7.3'] },
  { order: 16, day: 2, article: '7.4', en: 'Purchasing', ko: '구매', auditor: 'QMS', clauses: ['7.4'] },
  { order: 17, day: 2, article: '7.6', en: 'Control of monitoring and measuring equipment', ko: '모니터링 및 측정 장비의 관리', auditor: 'all', clauses: ['7.6'] },
  { order: 18, day: 3, article: '7.5', en: 'Production and service provision', ko: '생산 및 서비스 제공', auditor: 'QMS', clauses: ['7.5.1', '7.5.2', '7.5.3', '7.5.4', '7.5.5', '7.5.6', '7.5.7', '7.5.10'] },
  { order: 19, day: 3, article: '7.5.8–7.5.9', en: 'Identification and traceability', ko: '식별 및 추적성', auditor: 'MFDS', clauses: ['7.5.8', '7.5.9'] },
  { order: 20, day: 3, article: '7.5.11', en: 'Preservation of product', ko: '제품의 보존', auditor: 'QMS', clauses: ['7.5.11'] },
  { order: 21, day: 3, article: '8.', en: 'Measurement, analysis and improvement', ko: '측정, 분석 및 개선', auditor: 'QMS', clauses: ['8.1', '8.2.5'] },
  { order: 22, day: 3, article: '8.2.1', en: 'Feedback', ko: '피드백', auditor: 'all', clauses: ['8.2.1'] },
  { order: 23, day: 3, article: '8.2.2', en: 'Complaint handling', ko: '불만처리', auditor: 'all', clauses: ['8.2.2'] },
  { order: 24, day: 3, article: '8.2.3', en: 'Reporting to regulatory authorities', ko: '규제 당국에 보고', auditor: 'MFDS', clauses: ['8.2.3'] },
  { order: 25, day: 3, article: '8.2.6', en: 'Monitoring and measurement of product – Testing record (DMR, DHR)', ko: '제품의 모니터링 및 측정 – 시험기록(DMR, DHR)', auditor: 'MFDS', clauses: ['8.2.6'] },
  { order: 26, day: 3, article: '8.3', en: 'Control of nonconforming product', ko: '부적합 제품의 관리', auditor: 'QMS', clauses: ['8.3'] },
  { order: 27, day: 4, article: '7.2', en: 'Customer-related processes', ko: '고객 관련 프로세스', auditor: 'MFDS', clauses: ['7.2'] },
  { order: 28, day: 4, article: '8.5', en: 'Improvement – Corrective and preventive action (CAPA)', ko: '개선 – 시정 및 예방조치(CAPA)', auditor: 'all', clauses: ['8.5'] },
  { order: 29, day: 4, article: '8.4', en: 'Analysis of data', ko: '데이터 분석', auditor: 'QMS', clauses: ['8.4'] },
  { order: 30, day: 4, article: '–', en: 'Audit summary / Closing meeting', ko: '심사 요약 / 종료회의', auditor: 'all', clauses: [] },
];

/** Map any clause-like number found in a document (e.g. "7.3.5", "8.2.2") to the KGMP clause id used here. */
export function normalizeClause(raw: string): string | null {
  const parts = raw.split('.').filter(Boolean).map((p) => p.replace(/\D/g, ''));
  if (!parts.length) return null;
  const major = Number(parts[0]);
  if (major < 4 || major > 8) return null;
  for (let len = Math.min(parts.length, 3); len >= 1; len--) {
    const id = parts.slice(0, len).join('.');
    if (CLAUSE_BY_ID[id]) return id;
  }
  // sub-clauses under grouped ids
  const two = parts.slice(0, 2).join('.');
  const grouped = ['4.1', '5.4', '5.6', '6.4', '7.1', '7.2', '7.3', '7.4', '7.5.9', '8.3', '8.5'];
  for (const g of grouped) if (two === g || parts.slice(0, 3).join('.').startsWith(g + '.')) return g;
  if (two === '4.2' || two === '5.5' || two === '8.2' || two === '7.5') return null;
  return null;
}

export function stepForClause(id: string): AuditStep | undefined {
  return AUDIT_STEPS.find((s) => s.clauses.includes(id));
}
