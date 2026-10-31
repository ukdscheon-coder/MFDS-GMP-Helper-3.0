import { REGULATORY_STATUS } from './data/regulatory-status';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CLAUSES, CLAUSE_BY_ID } from './data/kgmp';
import { DEFAULT_CONFIG, evaluate, type AuditConfig } from './data/rules';
import { ACCEPT, expandUploads, extOf, extractFile, newId, readDropItems, type RawUpload } from './lib/extract';
import { analyze, guessKind } from './lib/analyze';
import { aiAvailable, aiRefine, aiTranslate, glossaryKo } from './lib/ai';
import { auditorLabel, buildReport, EMPTY_SITE, groupBySteps, reportText, type SiteInfo, type StepDocs } from './lib/report';
import { download, inPreview, emailReport, xlsxBlob } from './lib/deliver';
import { t, type Lang } from './lib/i18n';
import type { DocRecord, FileKind, SourceFile } from './lib/types';
import { Conditions } from './components/Conditions';
import { AgencyPanel } from './components/AgencyPanel';
import { AGENCIES, AGENCY_BY_ID, type AgencyId } from './data/agencies';
import { COUNTRIES, COUNTRY_BY_CODE, interpPath, isOverseas } from './data/countries';
import { AUDIT_STEPS } from './data/kgmp';
import { buildInboundReport, inboundClauses } from './lib/inbound';
import { Prep } from './components/Prep';
import { EMPTY_PREP, type PrepState } from './data/prep';
import { buildPrepPackage, importPrepXlsx, mergeDocs, prepXlsx } from './lib/prep';
import { printBlocks, renderBlocks, type DocFmt } from './lib/render';
import { buildProfile, EMPTY_PROFILE, evaluateGaps, gapJson, type Profile } from './lib/gap';
import { buildAnnex, buildGapReport } from './lib/annex';
import { GapPanel } from './components/GapPanel';

const OCR_LANGS = [
  { code: 'eng', label: 'English' }, { code: 'kor', label: '한국어' }, { code: 'deu', label: 'Deutsch' }, { code: 'ita', label: 'Italiano' },
  { code: 'fra', label: 'Français' }, { code: 'spa', label: 'Español' }, { code: 'jpn', label: '日本語' }, { code: 'chi_sim', label: '中文' },
];

const STORE_KEY = 'mfds-gmp-helper:v2';
interface Stored { docs: DocRecord[]; uiLang: Lang; outLang: Lang; cfg: AuditConfig; site: SiteInfo; prep: PrepState; mode: Mode; agencyId: AgencyId; profile?: Profile }
type Mode = 'mfds' | 'inbound';
function loadStore(): Partial<Stored> | null {
  try { const s = localStorage.getItem(STORE_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}
function saveStore(v: Stored) { try { localStorage.setItem(STORE_KEY, JSON.stringify(v)); } catch { /* storage unavailable */ } }

const fmtSize = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const stamp = () => new Date().toISOString().slice(0, 10);

type Fmt = 'hwpx' | 'docx' | 'pdf' | 'xlsx';

export default function App() {
  const [workspacePage, setWorkspacePage] = useState('settings');
  const [exportFmt, setExportFmt] = useState<Fmt>('hwpx');
  const stored = useMemo(loadStore, []);
  const [uiLang, setUiLang] = useState<Lang>(stored?.uiLang || 'ko');
  const [outLang, setOutLang] = useState<Lang>(stored?.outLang || 'ko');
  const [cfg, setCfg] = useState<AuditConfig>({ ...DEFAULT_CONFIG, ...(stored?.cfg || {}) });
  const [site, setSite] = useState<SiteInfo>({ ...EMPTY_SITE, ...(stored?.site || {}) });
  const [mode, setMode] = useState<Mode>(stored?.mode || 'mfds');
  const [agencyId, setAgencyId] = useState<AgencyId>(stored?.agencyId || 'FDA');
  const agency = AGENCY_BY_ID[agencyId] || AGENCY_BY_ID.FDA;
  const regId = mode === 'mfds' ? 'MFDS' : agencyId;
  const setReg = (id: string) => { if (id === 'MFDS') setMode('mfds'); else { setMode('inbound'); setAgencyId(id as AgencyId); } };
  const overseas = isOverseas(regId, site.country);
  const regLabel = regId === 'MFDS' ? 'MFDS' : (uiLang === 'ko' ? agency.name.ko : agency.name.en);
  const countryLabel = COUNTRY_BY_CODE[site.country] ? (uiLang === 'ko' ? COUNTRY_BY_CODE[site.country].ko : COUNTRY_BY_CODE[site.country].en) : '';
  const [prep, setPrep] = useState<PrepState>({ ...EMPTY_PREP, ...(stored?.prep || {}) });
  const [files, setFiles] = useState<SourceFile[]>([]);
  const [ocrLangs, setOcrLangs] = useState<string[]>(['eng', 'kor']);
  const [docs, setDocs] = useState<DocRecord[] | null>(stored?.docs?.length ? stored.docs : null);
  const [notes, setNotes] = useState<string[]>([]);
  const [profile, setProfile] = useState<Profile>(stored?.profile || EMPTY_PROFILE);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [srv, setSrv] = useState<{ ai: boolean; model?: string; email?: boolean }>({ ai: false });
  const [useAi, setUseAi] = useState(true);
  const [gapsOnly, setGapsOnly] = useState(false);
  const [toast, setToast] = useState('');
  const [drag, setDrag] = useState(false);
  const [mailTo, setMailTo] = useState('');
  const [mailFmt, setMailFmt] = useState<Fmt>('pdf');
  const uploads = useRef(new Map<string, RawUpload>());
  const L = (k: Parameters<typeof t>[1]) => t(uiLang, k);
  const T = (ko: string, en: string) => (uiLang === 'ko' ? ko : en);

  const outcome = useMemo(() => evaluate(cfg), [cfg]);

  useEffect(() => { aiAvailable().then(setSrv); }, []);
  useEffect(() => { saveStore({ docs: docs || [], uiLang, outLang, cfg, site, prep, mode, agencyId, profile }); }, [docs, uiLang, outLang, cfg, site, prep, mode, agencyId, profile]);
  useEffect(() => { if (toast) { const id = setTimeout(() => setToast(''), 2600); return () => clearTimeout(id); } }, [toast]);

  const patchFile = useCallback((id: string, patch: Partial<SourceFile>) => setFiles((fs) => fs.map((f) => (f.id === id ? { ...f, ...patch } : f))), []);

  const addUploads = useCallback(async (raw: RawUpload[]) => {
    const list = await expandUploads(raw);
    const created: SourceFile[] = list.map((u) => {
      const id = newId();
      uploads.current.set(id, u);
      return { id, name: u.name, path: u.path, ext: extOf(u.name), size: u.file.size, kind: 'unknown' as FileKind, status: 'queued', text: '' };
    });
    setFiles((fs) => [...fs, ...created]);
    for (const sf of created) {
      let final: SourceFile = sf;
      await extractFile(uploads.current.get(sf.id)!, sf, ocrLangs.join('+'), (p) => { final = { ...final, ...p }; patchFile(sf.id, p); });
      if (final.status === 'done') patchFile(sf.id, { kind: guessKind(final) });
    }
  }, [ocrLangs, patchFile]);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fl = Array.from(e.target.files || []);
    addUploads(fl.map((f) => ({ file: f, name: f.name, path: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name })));
    e.target.value = '';
  };
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const fromItems = await readDropItems(e.dataTransfer.items);
    addUploads(fromItems.length ? fromItems : Array.from(e.dataTransfer.files).map((f) => ({ file: f, name: f.name, path: f.name })));
  };

  const reading = files.some((f) => ['queued', 'reading', 'ocr'].includes(f.status));
  const readyCount = files.filter((f) => f.status === 'done').length;

  const run = async () => {
    setError('');
    setBusy(L('analyzing'));
    try {
      const res = analyze(files);
      let out = res.docs;
      if (useAi && srv.ai && out.length) out = await aiRefine(out, (p) => setBusy(`${L('analyzing')} ${Math.round(p * 100)}%`));
      setDocs(out);
      setNotes(res.notes);
      setProfile(buildProfile(files, out, res.exclusions));
      setTimeout(() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' }), 60);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setBusy(''); }
  };

  const translateAll = async () => {
    if (!docs) return;
    setBusy(L('translating'));
    setError('');
    try {
      const need = docs.filter((d) => d.title && !d.titleKo && !/[가-힣]/.test(d.title));
      const tr = await aiTranslate(need.map((d) => d.title), 'ko');
      setDocs(docs.map((d) => { const i = need.indexOf(d); return i >= 0 ? { ...d, titleKo: tr[i] } : d; }));
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(''); }
  };

  const updateDoc = (key: string, patch: Partial<DocRecord>) => setDocs((ds) => ds && ds.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  const removeHit = (key: string, clause: string) => setDocs((ds) => ds && ds.map((d) => (d.key === key ? { ...d, hits: d.hits.filter((h) => h.clause !== clause) } : d)));
  const addHit = (key: string, clause: string) => setDocs((ds) => ds && ds.map((d) => (d.key === key && !d.hits.some((h) => h.clause === clause) ? { ...d, hits: [{ clause, score: 1, source: 'manual' as const, evidence: 'manual' }, ...d.hits] } : d)));

  const allDocs = docs || [];
  const inbound = mode === 'inbound';
  const applicable = useMemo(() => (inbound ? inboundClauses(cfg) : outcome.clauses), [inbound, cfg, outcome]);
  const groups = useMemo(() => groupBySteps(allDocs, applicable, inbound ? null : outcome.days, inbound ? agency.steps : AUDIT_STEPS), [allDocs, applicable, inbound, outcome, agency]);
  const unmatched = useMemo(() => allDocs.filter((d) => !d.hits.some((h) => applicable.includes(h.clause))), [allDocs, applicable]);
  const docSteps = groups.filter((g) => g.step.clauses.length);
  const covered = docSteps.filter((g) => g.docs.length).length;
  const dayCount = Math.max(1, ...groups.map((g) => g.step.dayN));
  const dayKeys = inbound ? [0] : Array.from({ length: dayCount }, (_, i) => i + 1);

  const gap = useMemo(() => (docs && !inbound ? evaluateGaps(allDocs, profile, cfg, outcome) : null), [docs, inbound, allDocs, profile, cfg, outcome]);
  const gapDoc = async (kind: 'report' | 'annex', fmt: DocFmt) => {
    if (!gap) return;
    setBusy(T('파일 만드는 중…', 'Building file…')); setError('');
    try {
      const blocks = kind === 'report' ? buildGapReport({ gap, profile, docs: allDocs, site, out: outcome, lang: outLang }) : buildAnnex({ gap, profile, docs: allDocs, site, out: outcome });
      const name = kind === 'report' ? `KGMP_Gap_Report_${stamp()}` : `${(profile.qm?.docNo || 'QM').replace(/[^\w-]+/g, '_')}-KR_KGMP_Supplement_DRAFT`;
      await download(await renderBlocks(blocks, fmt, kind === 'report' ? 'KGMP 갭 분석 보고서' : 'KGMP 부속서'), `${name}.${fmt}`);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(''); }
  };
  const gapJsonExport = async () => {
    if (!gap) return;
    try {
      const json = JSON.stringify(gapJson({ gap, profile, docs: allDocs, site: { site: site.site, country: site.country, product: site.product, applicant: site.applicant }, cfg }), null, 2);
      await download(new Blob([json], { type: 'application/json' }), `KGMP_Gap_${stamp()}.json`);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  };

  const reportBlocks = () => (inbound ? buildInboundReport({ agency, docs: allDocs, clauses: applicable, site, lang: outLang, interp: interpPath(agencyId, site.country, outLang) }) : buildReport({ docs: allDocs, cfg, out: outcome, site, lang: outLang }));
  const baseName = inbound ? `${agencyId}_Inspection_Readiness_${stamp()}` : `KGMP_Audit_File_${stamp()}`;

  const makeFile = async (fmt: Fmt): Promise<{ blob: Blob; name: string }> => {
    if (fmt === 'xlsx') return { blob: xlsxBlob(groups, outLang, unmatched), name: `${baseName}.xlsx` };
    return { blob: await renderBlocks(reportBlocks(), fmt, 'KGMP 심사 준비자료'), name: `${baseName}.${fmt}` };
  };

  const exportAs = async (fmt: Fmt) => {
    setBusy(T('파일 만드는 중…', 'Building file…'));
    setError('');
    try { const f = await makeFile(fmt); await download(f.blob, f.name); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(''); }
  };

  const printReport = async () => {
    if (inPreview()) { await exportAs('pdf'); setToast(T('미리보기에서는 인쇄 대신 PDF로 저장합니다', 'In the preview, print saves a PDF instead')); return; }
    if (!(await printBlocks(reportBlocks(), 'KGMP 심사 준비자료'))) setError(T('팝업이 차단되었습니다. 팝업을 허용해 주세요.', 'Pop-up blocked — allow pop-ups to print.'));
  };

  // ---------- pre-audit coordination (file exchange with the site) ----------
  const prepBlocks = () => buildPrepPackage({ prep, cfg, out: outcome, site, docs: allDocs, gap: gap || undefined });
  const prepName = `KGMP_PreAudit_Request_${(site.site || 'site').replace(/[^\w-]+/g, '_')}_${stamp()}`;
  const prepExport = async (fmt: DocFmt) => {
    setBusy(T('파일 만드는 중…', 'Building file…')); setError('');
    try { await download(await renderBlocks(prepBlocks(), fmt, 'KGMP 사전 준비 요청서'), `${prepName}.${fmt}`); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(''); }
  };
  const prepPrint = async () => { if (inPreview()) { await prepExport('pdf'); return; } if (!(await printBlocks(prepBlocks(), 'KGMP 사전 준비 요청서'))) setError(T('팝업이 차단되었습니다. 팝업을 허용해 주세요.', 'Pop-up blocked — allow pop-ups to print.')); };
  const prepForm = () => download(prepXlsx({ prep, out: outcome, site, docs: allDocs, gap: gap || undefined }), `KGMP_Reply_Form_${stamp()}.xlsx`);
  const prepEmail = async () => {
    setBusy(T('메일 준비 중…', 'Preparing email…')); setError('');
    try {
      const blob = await renderBlocks(prepBlocks(), 'pdf', 'KGMP 사전 준비 요청서');
      const r = await emailReport({
        blob, filename: `${prepName}.pdf`, to: prep.contact.siteEmail || mailTo, serverEmail: !!srv.email,
        subject: `[KGMP] 사전 준비 요청 / Pre-audit request – ${site.site || ''}`.trim(),
        text: T('MFDS KGMP 현장조사 사전 준비 요청서를 보내드립니다. 첨부 요청서와 회신용 Excel 서식을 작성해 회신해 주십시오.\n\nPlease find the MFDS KGMP pre-audit request attached. Kindly complete the reply Excel form and return it with the requested documents.', 'Please find the MFDS KGMP pre-audit request attached. Kindly complete the reply Excel form and return it with the requested documents.'),
      });
      if (r === 'mailto') await download(prepXlsx({ prep, out: outcome, site, docs: allDocs, gap: gap || undefined }), `KGMP_Reply_Form_${stamp()}.xlsx`);
      setToast(r === 'sent' ? T('메일을 보냈습니다', 'Email sent') : r === 'mailto' ? T('메일 앱을 열고 요청서·서식을 내려받았습니다 — 첨부해 주세요', 'Mail app opened; attach the downloaded files') : r === 'shared' ? T('공유했습니다', 'Shared') : '');
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(''); }
  };
  const prepImport = async (f: File) => {
    setError('');
    try {
      const r = await importPrepXlsx(f, prep);
      setPrep(r.prep);
      setSite((s) => ({ ...s, ...Object.fromEntries(Object.entries(r.site).filter(([, v]) => v)) }));
      if (r.risk.gmpFail || r.risk.sampleFail || r.risk.recall) setCfg((c) => ({ ...c, riskSite: true }));
      if (r.docs.length) setDocs((d) => mergeDocs(d || [], r.docs));
      setToast(T(`회신 반영: 일정 ${r.counts.plan}건, 문서 ${r.counts.docs}건, 갭 조치계획 ${r.counts.gaps}건`, `Imported: ${r.counts.plan} plan rows, ${r.counts.docs} documents, ${r.counts.gaps} gap plans`));
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  };

  const sendMail = async () => {
    setBusy(T('메일 준비 중…', 'Preparing email…'));
    setError('');
    try {
      const f = await makeFile(mailFmt);
      const r = await emailReport({
        blob: f.blob, filename: f.name, to: mailTo, serverEmail: !!srv.email,
        subject: `[KGMP] ${site.site || T('해외 제조소', 'Overseas site')} – ${T('적합성인정등 심사 준비자료', 'KGMP audit preparation file')}`,
        text: reportText(groups, outLang).slice(0, 3500),
      });
      setToast(r === 'sent' ? T('메일을 보냈습니다', 'Email sent') : r === 'shared' ? T('공유했습니다', 'Shared') : r === 'mailto' ? T('메일 앱을 열고 파일을 내려받았습니다 — 첨부해 주세요', 'Mail app opened; attach the downloaded file') : '');
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(''); }
  };

  const copyText = async () => {
    try { await navigator.clipboard.writeText(reportText(groups, outLang)); setToast(L('copied')); } catch { /* clipboard blocked */ }
  };

  const reset = () => { setFiles([]); setDocs(null); setNotes([]); setProfile(EMPTY_PROFILE); uploads.current.clear(); };

  const navItems = [
    ['settings','실사 설정','⚙'], ['upload','문서 업로드','⇧'], ['matching','매칭 결과','≍'],
    ['gap','Gap 분석','▥'], ['coordination','사전 조율','☷'], ['audit','감사 계획','▤'], ['export','보고서 / 내보내기','⇩'],
  ];
  const jump = (id: string) => { setWorkspacePage(id); requestAnimationFrame(() => document.getElementById('workspace-' + id)?.scrollIntoView({behavior:'smooth',block:'start'})); };

  return (
    <div className="gmp-layout min-h-screen">
      <aside className="gmp-sidebar no-print" aria-label="업무 메뉴">
        <div className="gmp-logo"><span className="gmp-shield">♢</span><div><strong>MFDS GMP Helper</strong><small>의료기기 GMP 심사 지원</small></div></div>
        <nav className="gmp-nav">
          {navItems.map(([id,label,symbol]) => <button key={id} type="button" className={workspacePage === id ? 'gmp-nav-active' : ''} onClick={() => jump(id)}><span className="gmp-nav-icon">{symbol}</span>{label}</button>)}
        </nav>
        <div className="gmp-sidebar-bottom"><strong>Regulatory Workspace</strong><p>한국 KGMP 기준 · 원본 증빙 중심</p><a href={REGULATORY_STATUS.source} target="_blank" rel="noreferrer">MFDS 공식 규정 ↗</a></div>
      </aside>
      <div className="gmp-workspace">
      <header className="gmp-topbar no-print"><div><strong>{navItems.find(([id]) => id === workspacePage)?.[1] || '심사 대시보드'}</strong><small>Overseas Manufacturer · KGMP Audit</small></div><div className="gmp-top-actions"><LangSeg label="화면" value={uiLang} onChange={setUiLang}/><LangSeg label="보고서" value={outLang} onChange={setOutLang}/></div></header>
      <div className="gmp-reg-banner no-print"><span><strong>MFDS GMP · 고시 제{REGULATORY_STATUS.notice}호</strong> · 시행 {REGULATORY_STATUS.effective} · 조항별 법률 검증 필요</span><a href={REGULATORY_STATUS.source} target="_blank" rel="noreferrer">공식 원문 확인 ↗</a></div>
      <div className="gmp-dashboard no-print"><div><small>DOCUMENTS</small><strong>{files.length}</strong><span>업로드 자료</span></div><div><small>MATCHING</small><strong>{docs?.length || 0}</strong><span>분석 결과</span></div><div><small>AUDIT PLAN</small><strong>{dayCount || 4}</strong><span>심사 일정 구분</span></div><div><small>STATUS</small><strong>{busy ? '진행 중' : docs ? '분석됨' : '준비 중'}</strong><span>프로젝트 상태</span></div></div>
      <main className="gmp-main mx-auto max-w-6xl px-4 py-6 space-y-6">
        {/* ---------- 1. conditions ---------- */}
        <section id="workspace-settings" className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 no-print">
          {/* regulator × manufacturing-site country (overseas audit, both directions) */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 mb-5">
            <div className="text-sm font-semibold mb-1.5">{T('실사 기관 (어느 규제기관이)', 'Regulator (who audits)')}</div>
            <div className="flex flex-wrap gap-1.5">
              {(['MFDS', ...AGENCIES.map((a) => a.id)] as string[]).map((id) => {
                const label = id === 'MFDS' ? T('한국 MFDS(식약처)', 'Korea MFDS') : (uiLang === 'ko' ? AGENCY_BY_ID[id as AgencyId].name.ko : AGENCY_BY_ID[id as AgencyId].name.en);
                return <button key={id} onClick={() => setReg(id)} className={`px-3 py-1.5 rounded-md text-sm border ${regId === id ? 'bg-ink text-white border-ink' : 'bg-white border-slate-300 hover:border-ink'}`}>{label}</button>;
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-2"><span className="font-semibold">{T('제조소 소재국 (어디로)', 'Manufacturing site country (where)')}</span>
                <select className="border rounded px-2 py-1.5" value={site.country} onChange={(e) => setSite({ ...site, country: e.target.value })}>
                  <option value="">{T('선택', 'Select')}</option>
                  {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{uiLang === 'ko' ? c.ko : c.en}</option>)}
                </select>
              </label>
              {site.country && (overseas
                ? <span className="rounded bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-1 text-xs">{T('해외 실사', 'Overseas audit')}: {regLabel} → {countryLabel} · {T('통역', 'Interpretation')} {interpPath(regId, site.country, uiLang)}</span>
                : <span className="rounded bg-amber-50 border border-amber-200 text-amber-800 px-2 py-1 text-xs">{T('자국 내 실사입니다 — 이 앱은 해외 실사(기관 소재국 밖의 제조소)를 대상으로 합니다.', 'This is a domestic audit — the app covers overseas audits.')}</span>)}
            </div>
          </div>
          <h2 className="text-lg font-semibold">{inbound ? T(`1. ${agency.name.ko}의 해외 제조소 실사`, `1. ${agency.name.en} overseas inspection`) : T('1. MFDS 해외 제조소 심사 조건', '1. MFDS overseas audit conditions')}</h2>
          <p className="text-sm text-slate-600 mt-1 mb-4">{inbound ? T('기관의 해외 실사 규정(기준·통보·기간·언어·지적/회신·비용)과 사전 준비 서류를 보여주고, 업로드한 문서를 그 기관의 실사 순서로 매칭합니다.', 'Shows the regulator’s overseas inspection rules and documents, and maps uploaded documents to its inspection order.') : T('조건을 고르면 고시 제4~9조·[별표 4]에 따라 심사 방법·주체·적용 조항·제출 서류·일정이 바로 정해집니다.', 'Pick the conditions; method, authority, applicable clauses, documents and schedule follow the KGMP notice.')}</p>
          {inbound
            ? <AgencyPanel lang={uiLang} agency={agency} cfg={cfg} set={(p) => setCfg((c) => ({ ...c, ...p }))} site={site} setSite={setSite} />
            : <Conditions cfg={cfg} set={(p) => setCfg((c) => ({ ...c, ...p }))} out={outcome} lang={uiLang} site={site} setSite={setSite} />}
        </section>

        {/* ---------- 2. upload ---------- */}
        <section id="workspace-upload" className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 no-print">
          <div className="flex flex-wrap justify-between gap-2 items-baseline">
            <h2 className="text-lg font-semibold">{T('2. 해외 제조소 자료 업로드', '2. Upload manufacturer documents')}</h2>
            {(files.length > 0 || docs) && <button className="text-sm text-slate-500 hover:text-red-600" onClick={reset}>{L('reset')}</button>}
          </div>
          <p className="text-sm text-slate-600 mt-1">{L('step1Help')}</p>
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            className={`mt-4 rounded-lg border-2 border-dashed p-6 text-center transition ${drag ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-slate-50'}`}
          >
            <div className="text-3xl mb-1" aria-hidden>⇪</div>
            <p className="font-medium">{L('drop')}</p>
            <p className="text-xs text-slate-500 mt-1">{L('formats')}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <label className="cursor-pointer px-4 py-2 rounded-md bg-brand-500 text-white text-sm font-medium hover:bg-brand-600">
                {L('pickFiles')}
                <input type="file" multiple accept={ACCEPT} className="hidden" onChange={onPick} data-testid="file-input" />
              </label>
              <label className="cursor-pointer px-4 py-2 rounded-md border border-brand-500 text-brand-600 text-sm font-medium hover:bg-brand-50">
                {L('pickFolder')}
                <input type="file" multiple className="hidden" onChange={onPick} {...({ webkitdirectory: '', directory: '' } as Record<string, string>)} />
              </label>
              <label className="cursor-pointer px-4 py-2 rounded-md border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-100">
                {T('사진 촬영', 'Take photo')}
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />
              </label>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
            <span className="font-medium">{L('ocrLang')}:</span>
            {OCR_LANGS.map((o) => (
              <label key={o.code} className="inline-flex items-center gap-1">
                <input type="checkbox" checked={ocrLangs.includes(o.code)} onChange={(e) => setOcrLangs((ls) => { const next = e.target.checked ? [...ls, o.code] : ls.filter((x) => x !== o.code); return next.length ? next : ls; })} />
                {o.label}
              </label>
            ))}
          </div>
          {files.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold mb-2">{L('files')} ({readyCount}/{files.length})</h3>
              <div className="max-h-72 overflow-auto rounded border border-slate-200">
                <table className="w-full text-sm">
                  <tbody>
                    {files.map((f) => (
                      <tr key={f.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-2 py-1.5 w-12"><span className="text-[10px] uppercase font-semibold rounded bg-slate-100 px-1.5 py-0.5">{f.ext || '?'}</span></td>
                        <td className="px-2 py-1.5 break-all">
                          <div>{f.name}{f.ocr && <span className="ml-1 text-[10px] text-amber-700">OCR</span>}</div>
                          {f.path !== f.name && <div className="text-[11px] text-slate-400">{f.path}</div>}
                          {f.error && <div className="text-[11px] text-red-600">{f.error}</div>}
                        </td>
                        <td className="px-2 py-1.5 text-xs text-slate-500 whitespace-nowrap">{fmtSize(f.size)}</td>
                        <td className="px-2 py-1.5">
                          <select className="text-xs border rounded px-1 py-0.5" value={f.kind} onChange={(e) => patchFile(f.id, { kind: e.target.value as FileKind })} aria-label={L('kind')}>
                            {(['unknown', 'qm', 'master', 'sop'] as FileKind[]).map((k) => <option key={k} value={k}>{L(`kind_${k}` as never)}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-1.5 text-xs whitespace-nowrap">
                          <span className={f.status === 'done' ? 'text-emerald-700' : f.status === 'error' || f.status === 'unsupported' ? 'text-red-600' : 'text-amber-700'}>
                            {L(`st_${f.status}` as never)}{f.status === 'ocr' && f.progress ? ` ${Math.round(f.progress * 100)}%` : ''}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-right"><button className="text-slate-400 hover:text-red-600" aria-label="remove" onClick={() => setFiles((fs) => fs.filter((x) => x.id !== f.id))}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <p className="mt-3 text-[11px] text-slate-400">{L('privacy')}</p>
        </section>

        {/* ---------- 3. analyse ---------- */}
        <section id="workspace-matching" className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 no-print">
          <h2 className="text-lg font-semibold">{T('3. 분석 및 매칭', '3. Analyse and match')}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <button onClick={run} disabled={!readyCount || reading || !!busy} className="px-5 py-2.5 rounded-md bg-brand-500 text-white font-medium disabled:opacity-40 hover:bg-brand-600" data-testid="analyze">
              {busy && busy.startsWith(L('analyzing')) ? busy : reading ? L('waitFiles') : L('analyze')}
            </button>
            <label className={`inline-flex items-center gap-2 text-sm ${srv.ai ? '' : 'opacity-50'}`}>
              <input type="checkbox" checked={useAi && srv.ai} disabled={!srv.ai} onChange={(e) => setUseAi(e.target.checked)} />
              {L('useAi')}{srv.model ? <span className="text-xs text-slate-400">({srv.model})</span> : null}
            </label>
          </div>
          {!srv.ai && <p className="mt-2 text-xs text-slate-500">{L('aiOff')}</p>}
        </section>

        {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 no-print">{error}</p>}

        {/* ---------- 4. results ---------- */}
        {docs && (
          <section id="results" className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex flex-wrap justify-between gap-3 items-start">
              <div>
                <h2 className="text-lg font-semibold">{inbound ? T(`4. ${agency.name.ko} 실사 순서별 Related documents`, `4. Related documents in ${agency.name.en} inspection order`) : T('4. MFDS Audit Plan 순서별 Related documents', '4. Related documents in MFDS audit-plan order')}</h2>
                <p className="text-sm text-slate-600 mt-1">
                  {inbound ? agency.criteria[uiLang === 'ko' ? 'ko' : 'en'].split(' (')[0] : 'KGMP (ISO 13485:2016)'} · {allDocs.length}{uiLang === 'ko' ? '' : ' '}{L('docsFound')} · {covered}/{docSteps.length} {L('stepsCovered')} {inbound ? '' : ` · ${dayCount} ${T('일 일정', 'day plan')}`}
                </p>
              </div>
              {srv.ai && outLang === 'ko' && <Btn onClick={translateAll} disabled={!!busy}>{busy === L('translating') ? busy : L('translate')}</Btn>}
            </div>

            {/* export bar */}
            <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 p-3 no-print">
              <div className="text-sm font-semibold mb-2">{inbound ? T(`${agency.name.ko} 실사 대비 자료 내보내기`, `Export ${agency.name.en} readiness file`) : T('식약처 제출 서식으로 내보내기', 'Export in MFDS submission format')}</div>
              <div className="flex flex-wrap gap-2">
                <Btn primary onClick={() => exportAs('hwpx')} disabled={!!busy}>HWP (.hwpx)</Btn>
                <Btn primary onClick={() => exportAs('docx')} disabled={!!busy}>Word (.docx)</Btn>
                <Btn primary onClick={() => exportAs('pdf')} disabled={!!busy}>PDF</Btn>
                <Btn onClick={printReport} disabled={!!busy}>{T('인쇄', 'Print')}</Btn>
                <Btn onClick={() => exportAs('xlsx')} disabled={!!busy}>Excel</Btn>
                <Btn onClick={copyText}>{L('copyText')}</Btn>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{T('이메일', 'Email')}</span>
                <input className="border rounded px-2 py-1.5 text-sm min-w-[220px] flex-1 max-w-sm" type="email" placeholder={T('받는 사람 (쉼표로 여러 명)', 'Recipients (comma-separated)')} value={mailTo} onChange={(e) => setMailTo(e.target.value)} />
                <select className="border rounded px-2 py-1.5 text-sm" value={mailFmt} onChange={(e) => setMailFmt(e.target.value as Fmt)}>
                  <option value="pdf">PDF</option><option value="hwpx">HWP</option><option value="docx">Word</option><option value="xlsx">Excel</option>
                </select>
                <Btn onClick={sendMail} disabled={!!busy}>{T('보내기', 'Send')}</Btn>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400">
                {srv.email ? T('서버에서 첨부파일과 함께 바로 발송합니다.', 'Sent from the server with the attachment.') : T('기기의 공유 기능(메일 앱)으로 파일을 보냅니다. 지원하지 않는 브라우저는 파일을 내려받고 메일 앱을 엽니다.', 'Uses the device share sheet; otherwise downloads the file and opens your mail app.')}
                {busy && !busy.startsWith(L('analyzing')) ? ` · ${busy}` : ''}
              </p>
            </div>

            {notes.includes('noQM') && <p className="mt-3 text-sm rounded bg-amber-50 text-amber-800 px-3 py-2 no-print">{L('noQM')}</p>}
            <label className="mt-3 inline-flex items-center gap-2 text-sm no-print">
              <input type="checkbox" checked={gapsOnly} onChange={(e) => setGapsOnly(e.target.checked)} /> {L('gapsOnly')}
            </label>

            {dayKeys.map((day) => {
              const dg = groups.filter((g) => g.step.dayN === day && (!gapsOnly || (g.step.clauses.length && !g.docs.length)));
              if (!dg.length) return null;
              return (
                <div key={day} className="mt-6">
                  <h3 className="text-base font-bold text-ink border-b-2 border-ink pb-1">{day ? `Day ${day}` : T(`${agency.name.ko} 실사 영역 순서`, `${agency.name.en} inspection order`)}</h3>
                  <div className="mt-3 space-y-3">
                    {dg.map((g) => <StepCard key={g.step.order} g={g} uiLang={uiLang} outLang={outLang} allDocs={allDocs} onUpdate={updateDoc} onRemove={removeHit} onAdd={addHit} />)}
                  </div>
                </div>
              );
            })}

            {unmatched.length > 0 && !gapsOnly && (
              <div className="mt-8 no-print">
                <h3 className="text-base font-bold text-ink">{L('unmatched')} ({unmatched.length})</h3>
                <div className="mt-2 divide-y divide-slate-100 border rounded">
                  {unmatched.map((d) => (
                    <div key={d.key} className="p-3 flex flex-wrap gap-3 items-center justify-between text-sm">
                      <div className="min-w-0">
                        <div className="font-medium break-words">{d.title || d.fileNames[0]}</div>
                        <div className="text-xs text-slate-500">{d.docNo} {d.version && `· Rev ${d.version}`} · {d.fileNames.join(', ')}
                          {d.hits.length > 0 && <span className="ml-1 text-amber-700">· {T('적용 제외 조항', 'out-of-scope clause')} {d.hits.map((h) => h.clause).join(', ')}</span>}</div>
                      </div>
                      <ClausePicker lang={uiLang} clauses={applicable} onPick={(c) => addHit(d.key, c)} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
        {/* ---------- 5. KGMP gap analysis ---------- */}
        {gap && <section id="workspace-gap" className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 no-print">
          <h2 className="text-lg font-semibold">{T('5. KGMP 갭 분석 — 실사 전 예상 지적과 보완', '5. KGMP gap analysis — expected findings before the audit')}</h2>
          <p className="text-sm text-slate-600 mt-1 mb-4">{T('제조소 QM·SOP를 KGMP와 한국 고유 요구사항에 비교해, 현장 실사에서 나올 지적을 미리 찾고 QM 전면 개정 없이 보완하는 방법을 제시합니다.', 'Compares the site QM / SOPs with KGMP and Korea-specific expectations, finds likely audit findings early, and proposes fixes that do not require rewriting the QM.')}</p>
          <GapPanel lang={uiLang} gap={gap} profile={profile} replies={prep.gapReplies} busy={!!busy} onDoc={gapDoc} onJson={gapJsonExport} />
        </section>}
        {/* ---------- 6. pre-audit coordination ---------- */}
        {!inbound && <section id="workspace-coordination" className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 no-print">
          <h2 className="text-lg font-semibold">{T('6. 사전 조율 — 해외 제조소 사전 준비', '6. Pre-audit coordination with the overseas site')}</h2>
          <p className="text-sm text-slate-600 mt-1 mb-4">{T('일정 역산, 사전협의 항목, 담당자·장소, 통역, 출장 준비를 정리하고 제조소와 요청서·Excel 서식으로 주고받습니다.', 'Back-schedule, track pre-consultation items, assign auditees, prepare interpretation and logistics, and exchange forms with the site.')}</p>
          <Prep lang={uiLang} prep={prep} setPrep={setPrep} cfg={cfg} setCfg={(p) => setCfg((c) => ({ ...c, ...p }))} out={outcome} docs={allDocs} busy={!!busy}
            onExport={prepExport} onPrint={prepPrint} onEmail={prepEmail} onFormXlsx={prepForm} onImport={prepImport} />
        </section>}
        <section id="workspace-audit" className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 no-print">
          <h2 className="text-lg font-semibold mb-2">감사 계획 · Audit Plan</h2>
          <p className="text-sm text-slate-500 mb-4">Day 1~Day 4 기준으로 준비자료를 검토합니다. 날짜 및 시간은 표시하지 않습니다.</p>
          <div className="gmp-day-grid">{[1,2,3,4].map(day => <div key={day} className="gmp-day-card"><strong>Day {day}</strong><span>{day === 1 ? 'QMS · Management · Documentation' : day === 2 ? 'Design · Purchasing · Resources' : day === 3 ? 'Production · Validation · Traceability' : 'CAPA · Findings · Closing'}</span><small>{docs ? '분석된 자료를 상단 매칭 결과에서 확인' : '문서 분석 후 증빙을 연결합니다'}</small></div>)}</div>
          <button className="gmp-outline mt-4" onClick={() => jump('matching')}>조항별 증빙 확인 →</button>
        </section>
        <section id="workspace-export" className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 no-print">
          <h2 className="text-lg font-semibold mb-1">감사 계획 내보내기 (Export)</h2>
          <p className="text-sm text-slate-500 mb-4">파일 형식을 선택하여 실제 분석 결과를 내보냅니다.</p>
          <div className="gmp-export-grid">{([['hwpx','HWPX','한글 문서'],['docx','DOCX','Word 문서'],['pdf','PDF','PDF 문서'],['xlsx','Excel','Excel 파일']] as [Fmt,string,string][]).map(([id,label,sub]) => <button key={id} className={'gmp-export-card '+(exportFmt===id?'selected':'')} onClick={()=>setExportFmt(id)}><span className={'gmp-file-icon '+id}>{label === 'Excel' ? 'X' : label === 'PDF' ? 'PDF' : label === 'DOCX' ? 'W' : 'H'}</span><strong>{label}</strong><small>{sub}</small><span className="gmp-download-label">{exportFmt===id?'✓ 선택됨':'선택하기'}</span></button>)}</div>
          <div className="gmp-report-preview"><strong>보고서 미리보기</strong><div className="gmp-report-paper"><h3>MFDS GMP Helper — Audit Plan</h3><p>심사 방향: {regLabel} → {countryLabel || '제조소 국가 미설정'}</p><p>분석된 문서: {allDocs.length}건 · 매칭된 심사 단계: {covered}/{docSteps.length}</p><table><thead><tr><th>Related Documents</th><th>Document No.</th><th>Version / Revision</th></tr></thead><tbody>{allDocs.slice(0,5).map((d,i)=><tr key={i}><td>{String((d as unknown as Record<string,unknown>).title || (d as unknown as Record<string,unknown>).name || 'Document')}</td><td>{String((d as unknown as Record<string,unknown>).docNo || '확인 필요')}</td><td>원본 확인 필요</td></tr>)}{!allDocs.length && <tr><td colSpan={3}>자료를 업로드하고 분석하면 실제 문서 목록이 표시됩니다.</td></tr>}</tbody></table></div></div>
          <div className="gmp-export-actions"><button className="gmp-primary" disabled={!docs || !!busy} onClick={()=>exportAs(exportFmt)}>↓ {exportFmt.toUpperCase()} 다운로드</button><button className="gmp-outline" disabled={!docs || !!busy} onClick={printReport}>▣ 인쇄</button><button className="gmp-outline" disabled={!docs} onClick={copyText}>▤ 보고서 복사</button></div>
          {!docs && <p className="text-xs text-amber-700 mt-3">실제 파일 출력은 문서 업로드 및 분석 후 활성화됩니다.</p>}
        </section>
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-8 text-[11px] text-slate-400 no-print">
        {T('기준: 「의료기기 제조 및 품질관리 기준」(현행 제2026-46호 확인 권장), 의료기기 GMP 종합 해설서, GMP 운영 기본 지침. 심사 일정은 MFDS Audit Plan 7항 순서(날짜·시간 제외)를 따릅니다. 최종 판단은 지방식약청·품질관리심사기관에 확인하세요.', 'Based on the KGMP notice, GMP guidance and the MFDS audit plan order. Confirm final decisions with the regional MFDS office or the QMS review body.')}
      </footer>
      {toast && <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-ink text-white text-sm px-4 py-2 rounded shadow z-50">{toast}</div>}
      </div>
    </div>
  );
}

function LangSeg({ label, value, onChange }: { label: string; value: Lang; onChange: (l: Lang) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-slate-300 text-xs">{label}</span>
      <div className="flex rounded overflow-hidden border border-slate-500">
        {(['ko', 'en'] as Lang[]).map((l) => (
          <button key={l} onClick={() => onChange(l)} className={`px-2 py-0.5 text-xs ${value === l ? 'bg-white text-ink font-semibold' : 'text-slate-200'}`}>{l === 'ko' ? '한국어' : 'EN'}</button>
        ))}
      </div>
    </div>
  );
}

function Btn({ children, onClick, disabled, primary }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; primary?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`px-3 py-1.5 rounded-md text-sm disabled:opacity-40 ${primary ? 'bg-ink text-white hover:bg-brand-700' : 'border border-slate-300 bg-white hover:bg-slate-50'}`}>
      {children}
    </button>
  );
}

function ClausePicker({ lang, onPick, clauses }: { lang: Lang; onPick: (c: string) => void; clauses?: string[] }) {
  const list = clauses ? CLAUSES.filter((c) => clauses.includes(c.id)) : CLAUSES;
  return (
    <select className="text-xs border rounded px-1.5 py-1 max-w-[260px]" value="" onChange={(e) => e.target.value && onPick(e.target.value)}>
      <option value="">{t(lang, 'assign')} …</option>
      {list.map((c) => <option key={c.id} value={c.id}>{c.id} {lang === 'ko' ? c.ko : c.en}</option>)}
    </select>
  );
}

function StepCard({ g, uiLang, outLang, allDocs, onUpdate, onRemove, onAdd }: {
  g: StepDocs; uiLang: Lang; outLang: Lang; allDocs: DocRecord[];
  onUpdate: (k: string, p: Partial<DocRecord>) => void; onRemove: (k: string, c: string) => void; onAdd: (k: string, c: string) => void;
}) {
  const { step, docs } = g;
  const [adding, setAdding] = useState(false);
  const meeting = !step.clauses.length;
  const badge = step.auditor === 'MFDS' ? 'bg-rose-100 text-rose-800' : step.auditor === 'QMS' ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-700';
  return (
    <div className={`rounded-lg border ${!meeting && !docs.length ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200'} p-3 break-inside-avoid`}>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-xs font-mono text-slate-400 w-6">{step.order}</span>
        <span className="text-sm font-mono font-semibold text-ink">{step.article}</span>
        <span className="font-medium">{outLang === 'ko' ? step.ko : step.en}</span>
        {outLang === 'ko' && <span className="text-xs text-slate-400">{step.en}</span>}
        {step.dayN !== 0 && <span className={`ml-auto text-[11px] rounded px-2 py-0.5 font-semibold ${badge}`}>{auditorLabel(step.auditor, uiLang)}</span>}
      </div>
      {meeting && <p className="text-xs text-slate-400 mt-1 ml-8">{t(uiLang, 'meeting')}</p>}
      {!meeting && !docs.length && <p className="text-sm text-amber-800 mt-2 ml-8">{t(uiLang, 'noEvidence')}</p>}
      {docs.length > 0 && (
        <div className="mt-2 ml-8 grid gap-2 md:grid-cols-2">
          {docs.map(({ doc, clause }) => <DocBlock key={doc.key + clause} doc={doc} clause={clause} uiLang={uiLang} outLang={outLang} onUpdate={onUpdate} onRemove={() => onRemove(doc.key, clause)} />)}
        </div>
      )}
      {!meeting && (
        <div className="ml-8 mt-2 no-print">
          {!adding ? (
            <button className="text-xs text-brand-600 hover:underline" onClick={() => setAdding(true)}>+ {t(uiLang, 'addDoc')}</button>
          ) : (
            <select autoFocus className="text-xs border rounded px-1.5 py-1 max-w-full" defaultValue="" onBlur={() => setAdding(false)}
              onChange={(e) => { if (e.target.value) onAdd(e.target.value, step.clauses[0]); setAdding(false); }}>
              <option value="">{t(uiLang, 'addDoc')} …</option>
              {allDocs.filter((d) => !docs.some((x) => x.doc.key === d.key)).map((d) => <option key={d.key} value={d.key}>{d.docNo ? `${d.docNo} – ` : ''}{d.title || d.fileNames[0]}</option>)}
            </select>
          )}
        </div>
      )}
    </div>
  );
}

function DocBlock({ doc, clause, uiLang, outLang, onUpdate, onRemove }: {
  doc: DocRecord; clause: string; uiLang: Lang; outLang: Lang; onUpdate: (k: string, p: Partial<DocRecord>) => void; onRemove: () => void;
}) {
  const hit = doc.hits.find((h) => h.clause === clause);
  const ko = doc.titleKo || glossaryKo(doc.title);
  const showKo = outLang === 'ko' && ko && ko !== doc.title;
  const conf = hit ? Math.round(hit.score * 100) : 0;
  const confCls = conf >= 85 ? 'text-emerald-700' : conf >= 60 ? 'text-amber-700' : 'text-red-600';
  return (
    <div className="rounded border border-slate-200 bg-white p-2.5 text-sm">
      <div className="flex justify-between gap-2">
        <div className="font-semibold text-ink">Related documents <span className="font-normal text-xs text-slate-500">· {clause} {outLang === 'ko' ? CLAUSE_BY_ID[clause]?.ko : CLAUSE_BY_ID[clause]?.en}</span></div>
        <button className="text-slate-300 hover:text-red-600 text-xs no-print" title={t(uiLang, 'remove')} onClick={onRemove}>✕</button>
      </div>
      <dl className="mt-1 space-y-0.5">
        <Field label="SOP Title">
          {showKo ? (
            <div>
              <Editable value={doc.titleKo || ko} onChange={(v) => onUpdate(doc.key, { titleKo: v })} />
              <div className="text-[11px] text-slate-400">{t(uiLang, 'original')}: {doc.title}</div>
            </div>
          ) : <Editable value={doc.title} onChange={(v) => onUpdate(doc.key, { title: v })} />}
        </Field>
        <Field label="Document No"><Editable value={doc.docNo} onChange={(v) => onUpdate(doc.key, { docNo: v })} /></Field>
        <Field label="Final version"><Editable value={doc.version} onChange={(v) => onUpdate(doc.key, { version: v })} /></Field>
        <Field label="Revision date"><Editable value={doc.revisionDate} onChange={(v) => onUpdate(doc.key, { revisionDate: v })} /></Field>
      </dl>
      <div className="mt-1.5 text-[11px] text-slate-400 flex flex-wrap gap-x-2">
        {hit && <span className={confCls}>{t(uiLang, `src_${hit.source}` as never)} {conf}%</span>}
        {hit?.evidence && hit.source !== 'manual' && hit.source !== 'ai' && <span className="truncate max-w-[220px]" title={hit.evidence}>“{hit.evidence}”</span>}
        <span className="truncate max-w-[220px]" title={doc.fileNames.join(', ')}>{t(uiLang, 'file')}: {doc.fileNames.join(', ')}</span>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-1.5">
      <dt className="shrink-0 text-slate-500">- {label}:</dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  );
}

function Editable({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-brand-500 outline-none placeholder:text-amber-600" value={value} placeholder="—" onChange={(e) => onChange(e.target.value)} />;
}
