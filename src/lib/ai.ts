import { CLAUSE_BY_ID } from '../data/kgmp';
import type { DocRecord } from './types';

export async function aiAvailable(): Promise<{ ai: boolean; model?: string; email?: boolean }> {
  try {
    const r = await fetch('/api/health');
    if (!r.ok) return { ai: false };
    return await r.json();
  } catch {
    return { ai: false };
  }
}

interface AiResult { key: string; clauses: string[]; title: string; docNo: string; version: string; revisionDate: string; titleKo: string; confidence: number }

/** Send docs in batches to the serverless Claude endpoint and merge results into the records. */
export async function aiRefine(docs: DocRecord[], onProgress: (p: number) => void): Promise<DocRecord[]> {
  const out = docs.map((d) => ({ ...d, hits: [...d.hits] }));
  const batch = 8;
  for (let i = 0; i < out.length; i += batch) {
    const slice = out.slice(i, i + batch);
    const r = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        docs: slice.map((d) => ({ key: d.key, fileName: d.fileNames.join(', '), title: d.title, docNo: d.docNo, version: d.version, revisionDate: d.revisionDate, excerpt: d.excerpt })),
      }),
    });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `AI ${r.status}`);
    const { results } = (await r.json()) as { results: AiResult[] };
    for (const res of results || []) {
      const d = out.find((x) => x.key === res.key);
      if (!d) continue;
      d.title = res.title || d.title;
      d.docNo = res.docNo || d.docNo;
      d.version = res.version || d.version;
      d.revisionDate = res.revisionDate || d.revisionDate;
      d.titleKo = res.titleKo || d.titleKo;
      const strong = d.hits.filter((h) => h.source === 'explicit' || h.source === 'qm' || h.source === 'master' || h.source === 'manual');
      const aiHits = (res.clauses || []).filter((c) => CLAUSE_BY_ID[c]).map((c, idx) => ({ clause: c, score: Math.max(0.5, (res.confidence || 0.7) - idx * 0.05), source: 'ai' as const, evidence: 'AI' }));
      // keep strong evidence; replace keyword guesses with AI judgement
      const merged = [...strong];
      for (const h of aiHits) if (!merged.some((m) => m.clause === h.clause)) merged.push(h);
      d.hits = merged.length ? merged : d.hits;
    }
    onProgress(Math.min(1, (i + batch) / out.length));
  }
  return out;
}

export async function aiTranslate(texts: string[], target: 'ko' | 'en'): Promise<string[]> {
  const out: string[] = [];
  for (let i = 0; i < texts.length; i += 40) {
    const slice = texts.slice(i, i + 40);
    const r = await fetch('/api/translate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ texts: slice, target }) });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `AI ${r.status}`);
    const j = (await r.json()) as { translations: string[] };
    out.push(...slice.map((s, k) => j.translations?.[k] || s));
  }
  return out;
}

// ------------------------------------------------------------- offline glossary (no AI key)
// Longest phrases first. Covers common SOP titles in English, German, Italian, French and Spanish.
const GLOSSARY: [RegExp, string][] = ([
  ['corrective and preventive action', '시정 및 예방조치'], ['corrective action', '시정조치'], ['preventive action', '예방조치'], ['capa', '시정 및 예방조치'],
  ['control of documents', '문서관리'], ['document control', '문서관리'], ['control of records', '기록관리'], ['record control', '기록관리'], ['records management', '기록관리'],
  ['quality manual', '품질매뉴얼'], ['quality policy', '품질방침'], ['quality objectives', '품질목표'], ['management review', '경영검토'], ['management representative', '품질책임자'],
  ['internal audit', '내부감사'], ['training', '교육훈련'], ['human resources', '인적자원'], ['competence', '역량'], ['infrastructure', '기반시설'], ['maintenance', '유지보수'],
  ['work environment', '작업환경'], ['cleanroom', '청정실'], ['clean room', '청정실'], ['environmental monitoring', '환경 모니터링'], ['contamination control', '오염관리'],
  ['risk management', '위험관리'], ['design and development', '설계 및 개발'], ['design control', '설계관리'], ['design change', '설계변경'], ['usability', '사용적합성'],
  ['purchasing', '구매'], ['supplier evaluation', '공급업체 평가'], ['supplier', '공급업체'], ['incoming inspection', '수입검사'], ['production control', '생산관리'],
  ['work instruction', '작업지침서'], ['work order', '작업지시서'], ['device history record', '제조이력기록(DHR)'], ['batch record', '배치기록'], ['process validation', '공정 밸리데이션'],
  ['software validation', '소프트웨어 밸리데이션'], ['sterilization', '멸균'], ['sterile barrier', '멸균 차단 시스템'], ['packaging', '포장'], ['labeling', '표시기재'], ['labelling', '표시기재'],
  ['identification and traceability', '식별 및 추적성'], ['identification', '식별'], ['traceability', '추적성'], ['customer property', '고객자산'], ['preservation of product', '제품의 보존'],
  ['storage', '보관'], ['handling', '취급'], ['distribution', '유통'], ['calibration', '교정'], ['monitoring and measuring equipment', '모니터링 및 측정 장비'], ['measuring equipment', '측정장비'],
  ['feedback', '피드백'], ['post-market surveillance', '시판 후 감시'], ['post market surveillance', '시판 후 감시'], ['complaint handling', '불만처리'], ['complaint', '고객불만'],
  ['vigilance', '부작용 보고'], ['adverse event', '이상사례'], ['advisory notice', '권고문'], ['recall', '회수'], ['final inspection', '최종검사'], ['in-process inspection', '공정검사'],
  ['inspection and testing', '검사 및 시험'], ['product release', '제품 출하'], ['nonconforming product', '부적합 제품'], ['non-conforming product', '부적합 제품'], ['nonconformity', '부적합'],
  ['rework', '재작업'], ['analysis of data', '데이터 분석'], ['data analysis', '데이터 분석'], ['statistical techniques', '통계적 기법'], ['improvement', '개선'],
  ['customer-related processes', '고객 관련 프로세스'], ['contract review', '계약검토'], ['order processing', '주문처리'], ['installation', '설치'], ['servicing', '서비스'], ['service', '서비스'],
  ['technical file', '기술문서'], ['medical device file', '의료기기파일'], ['change control', '변경관리'], ['organization chart', '조직도'], ['organisation chart', '조직도'], ['job description', '직무기술서'],
  ['lenkung von dokumenten', '문서관리'], ['dokumentenlenkung', '문서관리'], ['lenkung von aufzeichnungen', '기록관리'], ['managementbewertung', '경영검토'], ['internes audit', '내부감사'],
  ['korrekturmaßnahmen', '시정조치'], ['vorbeugungsmaßnahmen', '예방조치'], ['reklamationsbearbeitung', '불만처리'], ['beschaffung', '구매'], ['kalibrierung', '교정'], ['schulung', '교육훈련'],
  ['controllo dei documenti', '문서관리'], ['gestione dei documenti', '문서관리'], ['controllo delle registrazioni', '기록관리'], ['riesame della direzione', '경영검토'], ['audit interni', '내부감사'],
  ['azioni correttive', '시정조치'], ['azioni preventive', '예방조치'], ['gestione dei reclami', '불만처리'], ['approvvigionamento', '구매'], ['taratura', '교정'], ['formazione', '교육훈련'],
  ['maîtrise des documents', '문서관리'], ['maîtrise des enregistrements', '기록관리'], ['revue de direction', '경영검토'], ['audit interne', '내부감사'], ['actions correctives', '시정조치'],
  ['actions préventives', '예방조치'], ['réclamations', '불만처리'], ['achats', '구매'], ['étalonnage', '교정'], ['control de documentos', '문서관리'], ['auditoría interna', '내부감사'],
  ['technical file management', '기술문서 관리'], ['lenkung fehlerhafter produkte', '부적합 제품 관리'], ['lenkung nichtkonformer produkte', '부적합 제품 관리'], ['gestione delle non conformità', '부적합 관리'], ['management', '관리'], ['evaluation', '평가'], ['control', '관리'], ['procedure', '절차서'], ['procedura', '절차서'], ['procédure', '절차서'], ['verfahrensanweisung', '절차서'], ['procedimiento', '절차서'], ['form', '양식'], ['record', '기록'], ['plan', '계획'], ['report', '보고서'],
] as [string, string][])
  .sort((a, b) => b[0].length - a[0].length)
  .map(([k, v]) => {
    const esc = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return [new RegExp(/^[a-z\s-]+$/.test(k) ? `\\b${esc}s?\\b` : esc, 'gi'), v];
  });

/** Rough term-by-term Korean rendering used when no AI key is configured. */
export function glossaryKo(title: string): string {
  if (!title || /[가-힣]/.test(title)) return title;
  let s = title;
  let hits = 0;
  for (const [r, v] of GLOSSARY) {
    s = s.replace(r, () => { hits++; return v; });
  }
  if (!hits) return '';
  const out = s.replace(/\b(of|for|and|the|von|der|die|des|di|della|delle|dei|de|la|le|les|del|y|und|e|et)\b/gi, ' ').replace(/[.,;:]+$/, '').replace(/\s{2,}/g, ' ').trim();
  // only use a full rendering; half-translated titles read worse than the original
  return /[A-Za-zÀ-ÿ]{3,}/.test(out.replace(/\b[A-Z0-9]{2,}[-\d]*\b/g, '')) ? '' : out;
}
