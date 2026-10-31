// Pre-audit request package (bilingual) and the Excel form exchanged with the overseas site.
import * as XLSX from 'xlsx';
import { CLAUSES } from '../data/kgmp';
import { COUNTRY_BY_CODE, interpPath } from '../data/countries';
import { CONSULT_ITEMS, DAY_PACK, LOGISTICS, timeline, type PrepState } from '../data/prep';
import type { AuditConfig, Outcome } from '../data/rules';
import { auditorLabel, scheduleSteps, type Block, type Cell, type SiteInfo } from './report';
import type { DocRecord } from './types';
import { SEV_LABEL, type GapResult } from './gap';

const BI = (ko: string, en: string) => `${ko}\n${en}`;
const REVIEW = { initial: ['Initial review', '최초심사'], periodic: ['Periodic review', '정기심사'], change: ['Change (relocation) review', '변경심사'], additional: ['Additional product group review', '추가심사'] } as const;
const INTERP_TYPE = { resident: ['Resident staff in the country', '해당 국가 상주인력'], importer: ['Korean importer staff', '국내 제조·수입업체 관계자'], pro: ['Professional interpreter', '전문 통역인력'], other: ['Other', '기타'] } as const;
const INTERP_EXP = { iso13485: ['ISO 13485 interpretation', 'ISO 13485 통역'], quality: ['Quality-related interpretation', '품질관련 통역'], other: ['Other field', '다른 분야 통역'] } as const;

export function gapClauses(docs: DocRecord[], out: Outcome) {
  return out.clauses.filter((id) => !docs.some((d) => d.hits.some((h) => h.clause === id)));
}

export function buildPrepPackage(a: { prep: PrepState; cfg: AuditConfig; out: Outcome; site: SiteInfo; docs: DocRecord[]; gap?: GapResult }): Block[] {
  const { prep, cfg, out, site, docs, gap } = a;
  const b: Block[] = [];
  const steps = scheduleSteps(out.clauses, out.days);
  const gaps = gapClauses(docs, out);

  b.push({ t: 'title', text: '사전 준비 요청서 / KGMP Pre-audit Request', sub: '해외 제조소 적합성인정등 심사 / MFDS (Korea) KGMP · ISO 13485:2016 — on-site audit of overseas manufacturer' });
  b.push({ t: 'h', text: '1. 심사 개요 / Audit overview' });
  b.push({
    t: 'table', widths: [22, 28, 22, 28], rows: [
      [{ text: BI('제조소', 'Site'), shade: 'head' }, site.site, { text: BI('신청인(수입업자)', 'Applicant (importer)'), shade: 'head' }, site.applicant],
      [{ text: BI('소재지', 'Address'), shade: 'head' }, site.address, { text: BI('대상 품목', 'Products'), shade: 'head' }, site.product],
      [{ text: BI('심사 구분', 'Review type'), shade: 'head' }, BI(REVIEW[cfg.reviewType][1], REVIEW[cfg.reviewType][0]), { text: BI('등급', 'Device class'), shade: 'head' }, `Class ${cfg.grade} / ${cfg.grade}등급`],
      [{ text: BI('심사 방법', 'Method'), shade: 'head' }, out.method === 'onsite' ? BI('현장조사 + 서류검토', 'On-site audit + document review') : BI('서류검토', 'Document review'), { text: BI('현장조사 일수', 'Audit days'), shade: 'head' }, out.days ? `${out.days}일 / ${out.days} days` : '–'],
      [{ text: BI('희망 시작일', 'Proposed start'), shade: 'head' }, prep.auditStart || '', { text: BI('기준', 'Criteria'), shade: 'head' }, 'KGMP [별표 2] (ISO 13485:2016)'],
      [{ text: BI('수입업자 담당', 'Importer contact'), shade: 'head' }, [prep.contact.importerContact, prep.contact.importerEmail].filter(Boolean).join('\n'), { text: BI('제조소 담당', 'Site contact'), shade: 'head' }, [prep.contact.siteContact, prep.contact.siteEmail].filter(Boolean).join('\n')],
    ],
  });
  b.push({ t: 'p', text: '동봉한 Excel 서식을 작성해 요청 서류와 함께 회신해 주십시오. 외국어 자료는 원문과 한글 번역본, 영어 자료는 원문과 한글 요약본을 제출하며, 모든 자료는 품질책임자 승인본이어야 합니다.\nPlease complete the enclosed Excel form (Site info, Audit plan, Documents, Interpreter, Logistics) and return it with the requested documents. Documents in a language other than English need a Korean translation; English documents need a Korean summary. Every document must be approved by the quality representative.' });

  const tl = timeline(prep, { periodic: cfg.reviewType === 'periodic', onsite: out.method === 'onsite', days: out.days });
  if (tl.length) {
    b.push({ t: 'h', text: '2. 일정 / Timeline' });
    b.push({ t: 'table', widths: [16, 66, 18], head: ['날짜 / Date', '내용 / Milestone', '구분 / Basis'], rows: tl.map((m) => [{ text: m.date, align: 'center' }, BI(m.ko, m.en), { text: m.kind === 'law' ? '규정 / Regulation' : m.kind === 'audit' ? '심사 / Audit' : '권장 / Suggested', align: 'center' }]) });
  }

  b.push({ t: 'h', text: '3. 사전 제출 요청 서류 / Documents requested before the audit' });
  b.push({ t: 'table', widths: [10, 66, 24], head: ['목 / Item', '서류 / Document', '구분 / Need'], rows: out.documents.map((d) => [{ text: d.code, align: 'center' }, BI(d.ko, d.en), { text: d.required === 'yes' ? '필수 / Required' : '해당 시 / If applicable', align: 'center' }]) });

  if (gaps.length) {
    b.push({ t: 'h', text: '4. 근거 문서 확인 요청 / Evidence not yet identified' });
    b.push({ t: 'p', small: true, text: '받은 자료에서 아래 조항의 절차서를 확인하지 못했습니다. SOP 제목·문서번호·최종버전·개정일을 알려 주십시오.\nWe could not identify a procedure for the KGMP clauses below in the documents received. Please state the SOP title, document number, final version and revision date.' });
    b.push({ t: 'table', widths: [12, 38, 50], head: ['조항 / Clause', '요구사항 / Requirement', 'Related documents (SOP Title / Document No / Final version / Revision date)'], rows: gaps.map((id) => { const c = CLAUSES.find((x) => x.id === id)!; return [{ text: id, align: 'center' }, BI(c.ko, c.en), { text: '', shade: 'gap' }]; }) });
  }

  b.push({ t: 'break' });
  if (gap && gap.findings.length) {
    b.push({ t: 'h', text: '4-1. KGMP 사전 갭 — 조치계획 회신 요청 / KGMP pre-assessment — please return an action plan' });
    b.push({ t: 'p', small: true, text: '아래 항목은 귀사 품질문서를 KGMP와 비교해 현장 실사에서 지적될 가능성이 있는 사항입니다. 품질매뉴얼 전체를 개정할 필요는 없으며, 대부분 KGMP 부속서 또는 해당 절차의 한 항목 추가로 해결됩니다. 회신용 Excel의 6_KGMP_Gaps 시트에 조치계획을 기재해 주십시오. / These items may be raised at the MFDS audit. A full QM revision is not needed: most are closed by a KGMP supplement or one addition to the relevant procedure. Please enter your action plan in sheet 6_KGMP_Gaps of the reply form.' });
    b.push({ t: 'table', widths: [10, 9, 11, 40, 30], head: ['ID', 'KGMP', '등급 / Grade', '예상 지적 / Expected finding', '권장 조치 / Suggested action'],
      rows: gap.findings.map((f) => [f.id, { text: f.clause, align: 'center' as const }, { text: `${SEV_LABEL[f.severity].ko} / ${SEV_LABEL[f.severity].en}`, align: 'center' as const, shade: f.severity === 'major' ? ('gap' as const) : undefined }, BI(f.title.ko, f.title.en), BI(f.action.ko, f.action.en)] as Cell[]) });
  }
  b.push({ t: 'h', text: '5. 심사 일정별 담당자·장소 / Audit plan — auditee and location' });
  b.push({ t: 'p', small: true, text: 'MFDS Audit Plan 순서이며 시간은 심사단과 협의합니다. / Order follows the MFDS audit plan; times are agreed with the audit team.' });
  b.push({
    t: 'table', widths: [9, 9, 30, 10, 14, 12, 16], head: ['순서', 'Day', 'KGMP · 심사 활동', '담당 심사', '제조소 담당자', '장소', '준비 문서'],
    rows: steps.map((s) => {
      const a0 = prep.assign[s.order] || { auditee: '', location: '', docs: '' };
      return [{ text: String(s.order), align: 'center' }, { text: `Day ${s.dayN}`, align: 'center' }, `${s.article} ${s.ko}\n${s.en}`, { text: auditorLabel(s.auditor, 'ko'), align: 'center' }, a0.auditee, a0.location, a0.docs] as Cell[];
    }),
  });

  b.push({ t: 'h', text: '6. 사전협의 항목 / Pre-consultation items' });
  b.push({ t: 'table', widths: [50, 15, 15, 20], head: ['항목 / Item', '상태 / Status', '담당 / Owner', '비고 / Note'], rows: CONSULT_ITEMS.map((i) => { const s = prep.consult[i.id]; return [BI(i.ko, i.en), { text: s?.status === 'done' ? '확정 / Confirmed' : s?.status === 'doing' ? '진행 / In progress' : '□', align: 'center' }, s?.owner || '', s?.note || ''] as Cell[]; }) });

  b.push({ t: 'h', text: '7. 출장 준비 / Logistics' });
  b.push({ t: 'table', widths: [55, 15, 30], head: ['항목 / Item', '상태 / Status', '비고 / Note'], rows: LOGISTICS.map((i) => { const s = prep.logistics[i.id]; return [BI(i.ko, i.en) + (i.hint ? `\n※ ${i.hint.en} / ${i.hint.ko}` : ''), { text: s?.status === 'done' ? '완료 / Done' : s?.status === 'doing' ? '진행 / In progress' : '□', align: 'center' }, s?.note || ''] as Cell[]; }) });

  b.push({ t: 'h', text: '8. 심사 당일 준비물 / Audit-day pack' });
  b.push({ t: 'table', widths: [85, 15], head: ['항목 / Item', '준비 / Ready'], rows: DAY_PACK.map((i) => [BI(i.ko, i.en), { text: prep.dayPack[i.id] ? '■' : '□', align: 'center' }] as Cell[]) });

  // Interpreter consent form (해설서 제8조 양식)
  b.push({ t: 'break' });
  b.push({ t: 'title', text: '통역 관련 주의사항에 대한 동의서', sub: 'Consent on interpretation (MFDS KGMP on-site audit)' });
  const it = prep.interp;
  b.push({
    t: 'table', widths: [20, 30, 20, 30], rows: [
      [{ text: '제조/수입업체명', shade: 'head' }, site.applicant, { text: '업 종류', shade: 'head' }, '□ 제조   ■ 수입'],
      [{ text: '업허가번호', shade: 'head' }, '', { text: '심사국가', shade: 'head' }, COUNTRY_BY_CODE[site.country]?.ko || site.address.split(',').pop()?.trim() || ''],
      [{ text: '통역 언어', shade: 'head' }, it.path || interpPath('MFDS', site.country, 'ko') || '현지어 → 한국어', { text: '통역자 수', shade: 'head' }, `${it.count}명`],
      [{ text: '통역자 구분', shade: 'head' }, (Object.keys(INTERP_TYPE) as (keyof typeof INTERP_TYPE)[]).map((k) => `${it.type === k ? '■' : '□'} ${INTERP_TYPE[k][1]}`).join('\n'), { text: '특이사항(경력)', shade: 'head' }, (Object.keys(INTERP_EXP) as (keyof typeof INTERP_EXP)[]).map((k) => `${it.experience === k ? '■' : '□'} ${INTERP_EXP[k][1]}`).join('\n')],
    ],
  });
  b.push({ t: 'p', small: true, text: '1. 의료기기 적합성인정등 심사(GMP 심사)는 개인이 아닌 대한민국 식품의약품안전처장을 대신하여 공무를 수행하는 것으로 심사 시 언어는 한국어를 사용한다.\n2. 원활한 GMP 심사를 위하여 의료기기 제조/수입업체는 심사국가의 언어(현장 통역 언어)를 이해하여 한국어로 통역할 수 있는 통역자를 활용하여야 한다.\n3. 비영어권 국가의 경우, GMP 심사 시 통역이 매우 큰 비중을 차지하므로 원활한 심사가 진행될 수 있도록 사전 준비를 철저히 하여야 한다.\n4. 이중 통역(예: 독일어 → 영어 → 한국어) 등 한국어로 직접 통역이 아닌 제2의 국가의 언어를 거쳐 통역되는 경우에는 심사 기간이 연장될 수 있다.\n5. 심사원이 현장에서 통역의 문제로 GMP 심사 진행이 어렵거나 심사가 불가능하다고 판단한 경우에는 심사를 중단할 수 있다.' });
  b.push({ t: 'sign', statement: '상기 업체 대표자(품질책임자)인 본인은 통역 관련 주의사항을 확인하였고, 그 내용을 충분히 이해하였습니다. 통역의 문제로 GMP 심사에 불이익을 받을 수 있다는 사실에 동의합니다.', lines: [{ role: '대표자(품질책임자)' }] });
  return b;
}

// ---------------------------------------------------------------- Excel exchange form
const SHEETS = { info: '1_Site_Info', plan: '2_Audit_Plan', docs: '3_Documents', interp: '4_Interpreter', logi: '5_Logistics', gaps: '6_KGMP_Gaps' };
const akey = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

export function prepXlsx(a: { prep: PrepState; out: Outcome; site: SiteInfo; docs: DocRecord[]; gap?: GapResult }): Blob {
  const { prep, out, site, docs, gap } = a;
  const wb = XLSX.utils.book_new();
  const info = [
    ['항목 / Field', '답변 / Answer'],
    ['제조소 명칭 / Site name', site.site], ['소재지 / Site address', site.address], ['대상 품목 / Products', site.product],
    ['제조소 담당자 / Site contact', prep.contact.siteContact], ['담당자 이메일 / Site e-mail', prep.contact.siteEmail],
    ['희망 시작일 (YYYY-MM-DD) / Proposed audit start', prep.auditStart],
    ['제조·품질 종업원 수 / Number of employees (manufacturing & quality)', ''],
    ['품질책임자 / Quality representative', ''],
    ['KGMP nonconformity in last 3 years? (Y/N) / 최근 3년 KGMP 부적합', ''],
    ['Failed sample test in last 3 years? (Y/N) / 최근 3년 수거검사 부적합', ''],
    ['Recall / stop order in last 3 years? (Y/N) / 최근 3년 강제회수·사용중지', ''],
    ['위탁 주요공정 / Outsourced main processes (sterilisation etc.)', ''],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(info); ws1['!cols'] = [{ wch: 62 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, ws1, SHEETS.info);

  const steps = scheduleSteps(out.clauses, out.days);
  const plan = [['Order', 'Day', 'KGMP', 'Activity', 'Activity (KO)', 'Auditor', 'Auditee (name / role)', 'Location', 'Documents to have ready'],
    ...steps.map((s) => { const x = prep.assign[s.order] || { auditee: '', location: '', docs: '' }; return [s.order, `Day ${s.dayN}`, s.article, s.en, s.ko, s.auditor === 'QMS' ? 'QMS auditor' : s.auditor, x.auditee, x.location, x.docs]; })];
  const ws2 = XLSX.utils.aoa_to_sheet(plan); ws2['!cols'] = [6, 7, 12, 44, 30, 12, 26, 18, 36].map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(wb, ws2, SHEETS.plan);

  const docRows: (string | number)[][] = [['KGMP clause', 'Requirement', 'SOP Title', 'Document No', 'Final version', 'Revision date (YYYY-MM-DD)', 'Remark']];
  for (const id of out.clauses) {
    const c = CLAUSES.find((x) => x.id === id)!;
    const ds = docs.filter((d) => d.hits.some((h) => h.clause === id));
    if (!ds.length) docRows.push([id, c.en, '', '', '', '', '작성 요청 / Please fill in']);
    for (const d of ds) docRows.push([id, c.en, d.title, d.docNo, d.version, d.revisionDate, '']);
  }
  const ws3 = XLSX.utils.aoa_to_sheet(docRows); ws3['!cols'] = [10, 40, 44, 18, 12, 18, 24].map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(wb, ws3, SHEETS.docs);

  const ws4 = XLSX.utils.aoa_to_sheet([['Field', 'Answer'], ['Interpretation path (e.g. Italian → English → Korean)', prep.interp.path], ['Number of interpreters', prep.interp.count], ['Interpreter type (resident / importer / professional / other)', prep.interp.type], ['Experience (ISO 13485 / quality / other)', prep.interp.experience]]);
  ws4['!cols'] = [{ wch: 60 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws4, SHEETS.interp);

  const ws5 = XLSX.utils.aoa_to_sheet([['Item', 'Arranged? (Y/N)', 'Note'], ...LOGISTICS.map((i) => [i.en + (i.hint ? ` (${i.hint.en})` : ''), prep.logistics[i.id]?.status === 'done' ? 'Y' : '', prep.logistics[i.id]?.note || ''])]);
  ws5['!cols'] = [{ wch: 70 }, { wch: 16 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws5, SHEETS.logi);

  if (gap && gap.findings.length) {
    // the site answers each expected finding with an action plan before the audit
    const head = ['ID', 'KGMP clause', 'Grade', 'Expected finding', '예상 지적사항', 'Recommended action', 'Ref.', '[Site] Action plan / 조치 계획', '[Site] Target date (YYYY-MM-DD)', '[Site] Evidence document No'];
    const rows = gap.findings.map((f) => { const r = prep.gapReplies?.[f.id]; return [f.id, f.clause, SEV_LABEL[f.severity].en, `${f.title.en}\n${f.detail.en}`, f.title.ko, f.action.en, f.ref, r?.plan || '', r?.due || '', r?.evidence || '']; });
    const ws6 = XLSX.utils.aoa_to_sheet([head, ...rows]);
    ws6['!cols'] = [6, 8, 10, 60, 40, 50, 30, 40, 16, 22].map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(wb, ws6, SHEETS.gaps);
  }
  const outBuf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([outBuf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export interface ImportResult { prep: PrepState; site: Partial<SiteInfo>; docs: DocRecord[]; risk: { gmpFail?: boolean; sampleFail?: boolean; recall?: boolean }; counts: { plan: number; docs: number; gaps: number } }

/** Read the site's returned Excel form back into the app. */
export async function importPrepXlsx(file: File, prev: PrepState): Promise<ImportResult> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false });
  const rows = (name: string) => (wb.Sheets[name] ? (XLSX.utils.sheet_to_json<string[]>(wb.Sheets[name], { header: 1, raw: false, defval: '' }) as string[][]) : []);
  const prep: PrepState = JSON.parse(JSON.stringify(prev));
  const site: Partial<SiteInfo> = {};
  const risk: ImportResult['risk'] = {};
  const yes = (v: string) => /^(y|yes|예|o|true|1)$/i.test(v.trim());

  for (const [k, v] of rows(SHEETS.info).slice(1)) {
    const key = String(k).toLowerCase(); const val = String(v || '').trim();
    if (!val) continue;
    if (key.includes('site name')) site.site = val;
    else if (key.includes('site address')) site.address = val;
    else if (key.includes('products')) site.product = val;
    else if (key.includes('site contact')) prep.contact.siteContact = val;
    else if (key.includes('site e-mail')) prep.contact.siteEmail = val;
    else if (key.includes('proposed audit start')) prep.auditStart = val;
    else if (key.includes('kgmp nonconformity')) risk.gmpFail = yes(val);
    else if (key.includes('failed sample')) risk.sampleFail = yes(val);
    else if (key.includes('recall')) risk.recall = yes(val);
  }
  let planCount = 0;
  for (const r of rows(SHEETS.plan).slice(1)) {
    const order = Number(r[0]);
    if (!order) continue;
    const a = { auditee: String(r[6] || ''), location: String(r[7] || ''), docs: String(r[8] || '') };
    if (a.auditee || a.location || a.docs) { prep.assign[order] = a; planCount++; }
  }
  const docs: DocRecord[] = [];
  for (const r of rows(SHEETS.docs).slice(1)) {
    const [clause, , title, docNo, version, revisionDate] = r.map((x) => String(x || '').trim());
    if (!clause || (!title && !docNo)) continue;
    const key = docNo ? docNo.toUpperCase().replace(/[\s_]+/g, '-') : `xl:${clause}:${title}`;
    let d = docs.find((x) => x.key === key);
    if (!d) { d = { key, title, docNo, version, revisionDate, fileIds: [], fileNames: [file.name], hits: [], excerpt: '' }; docs.push(d); }
    if (!d.hits.some((h) => h.clause === clause)) d.hits.push({ clause, score: 0.97, source: 'master', evidence: 'Site reply form' });
  }
  const it = rows(SHEETS.interp);
  if (it.length) {
    const get = (prefix: string) => String(it.find((r) => String(r[0]).toLowerCase().startsWith(prefix))?.[1] || '').trim();
    const path = get('interpretation path'); if (path) prep.interp.path = path;
    const cnt = get('number of'); if (cnt) prep.interp.count = cnt;
    const ty = get('interpreter type').toLowerCase(); if (ty) prep.interp.type = ty.startsWith('res') ? 'resident' : ty.startsWith('imp') ? 'importer' : ty.startsWith('pro') ? 'pro' : 'other';
    const ex = get('experience').toLowerCase(); if (ex) prep.interp.experience = ex.includes('13485') ? 'iso13485' : ex.startsWith('qual') ? 'quality' : 'other';
  }
  rows(SHEETS.logi).slice(1).forEach((r, i) => {
    const item = LOGISTICS[i]; if (!item) return;
    const done = yes(String(r[1] || '')); const note = String(r[2] || '');
    if (done || note) prep.logistics[item.id] = { status: done ? 'done' : prep.logistics[item.id]?.status || 'todo', note };
  });
  let gapCount = 0;
  for (const r of rows(SHEETS.gaps).slice(1)) {
    const id = String(r[0] || '').trim();
    const plan = String(r[7] || '').trim(), due = String(r[8] || '').trim(), evidence = String(r[9] || '').trim();
    if (!id || !(plan || due || evidence)) continue;
    prep.gapReplies = { ...(prep.gapReplies || {}), [id]: { plan, due, evidence } };
    gapCount++;
  }
  return { prep, site, docs, risk, counts: { plan: planCount, docs: docs.length, gaps: gapCount } };
}

/** Merge documents confirmed by the site into the analysed list (site reply wins for metadata). */
export function mergeDocs(base: DocRecord[], incoming: DocRecord[]): DocRecord[] {
  const out = base.map((d) => ({ ...d, hits: [...d.hits] }));
  for (const n of incoming) {
    const ex = out.find((d) => (n.docNo && d.docNo && akey(d.docNo) === akey(n.docNo)) || d.key === n.key);
    if (ex) {
      ex.title = n.title || ex.title; ex.version = n.version || ex.version; ex.revisionDate = n.revisionDate || ex.revisionDate;
      for (const h of n.hits) if (!ex.hits.some((x) => x.clause === h.clause)) ex.hits.push(h);
      if (!ex.fileNames.includes(n.fileNames[0])) ex.fileNames.push(n.fileNames[0]);
    } else out.push(n);
  }
  return out;
}
