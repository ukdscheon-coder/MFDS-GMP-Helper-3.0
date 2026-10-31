import { useMemo, useRef } from 'react';
import { CLAUSE_BY_ID } from '../data/kgmp';
import { CONSULT_ITEMS, DAY_PACK, LOGISTICS, RISK_QUESTIONS, timeline, type PrepState, type Status } from '../data/prep';
import type { AuditConfig, Outcome } from '../data/rules';
import type { Lang } from '../lib/i18n';
import { gapClauses } from '../lib/prep';
import { auditorLabel, scheduleSteps } from '../lib/report';
import type { DocRecord } from '../lib/types';

type Fmt = 'hwpx' | 'docx' | 'pdf';

export function Prep(p: {
  lang: Lang; prep: PrepState; setPrep: (fn: (p: PrepState) => PrepState) => void; cfg: AuditConfig; setCfg: (patch: Partial<AuditConfig>) => void;
  out: Outcome; docs: DocRecord[]; busy: boolean;
  onExport: (fmt: Fmt) => void; onPrint: () => void; onEmail: () => void; onFormXlsx: () => void; onImport: (f: File) => void;
}) {
  const { lang, prep, setPrep, cfg, out, docs } = p;
  const L = (ko: string, en: string) => (lang === 'ko' ? ko : en);
  const steps = useMemo(() => scheduleSteps(out.clauses, out.days), [out]);
  const tl = useMemo(() => timeline(prep, { periodic: cfg.reviewType === 'periodic', onsite: out.method === 'onsite', days: out.days }), [prep, cfg.reviewType, out]);
  const gaps = gapClauses(docs, out);
  const fileRef = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().slice(0, 10);

  const setRisk = (id: string, v: 'yes' | 'no') => {
    setPrep((s) => {
      const risk = { ...s.risk, [id]: v };
      const anyRisk = ['gmpFail', 'sampleFail', 'recall'].some((k) => risk[k] === 'yes');
      p.setCfg({ riskSite: anyRisk, suspended: risk.advisory === 'yes' });
      return { ...s, risk };
    });
  };

  const autofillDocs = () => setPrep((s) => {
    const assign = { ...s.assign };
    for (const st of steps) {
      if (!st.clausesApplicable.length) continue;
      const list = docs.filter((d) => d.hits.some((h) => st.clausesApplicable.includes(h.clause))).map((d) => d.docNo || d.title).filter(Boolean);
      const cur = assign[st.order] || { auditee: '', location: '', docs: '' };
      assign[st.order] = { ...cur, docs: cur.docs || list.join(', ') };
    }
    return { ...s, assign };
  });

  const statusSel = (v: Status | undefined, on: (s: Status) => void) => (
    <select className="text-xs border rounded px-1 py-1" value={v || 'todo'} onChange={(e) => on(e.target.value as Status)}>
      <option value="todo">{L('미착수', 'To do')}</option><option value="doing">{L('진행 중', 'In progress')}</option><option value="done">{L('확정', 'Confirmed')}</option>
    </select>
  );
  const inp = 'border rounded px-2 py-1 text-sm w-full';

  return (
    <div className="space-y-6">
      {/* actions */}
      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
        <div className="text-sm font-semibold mb-2">{L('제조소와 파일로 주고받기', 'Exchange with the site by file')}</div>
        <ol className="text-xs text-slate-600 list-decimal ml-4 mb-3 space-y-0.5">
          <li>{L('사전 요청서(한국어·영어)와 회신용 Excel 서식을 제조소에 보냅니다.', 'Send the request letter (KO/EN) and the reply Excel form to the site.')}</li>
          <li>{L('제조소가 담당자·장소·문서·통역·출장 정보를 Excel에 채워 회신합니다.', 'The site fills in auditees, locations, documents, interpreter and logistics.')}</li>
          <li>{L('회신 Excel을 불러오면 일정표·문서·통역 정보가 자동으로 채워집니다.', 'Import the returned Excel and the app fills everything in.')}</li>
        </ol>
        <div className="flex flex-wrap gap-2">
          <B primary onClick={() => p.onExport('hwpx')} disabled={p.busy}>{L('요청서 HWP', 'Request HWP')}</B>
          <B primary onClick={() => p.onExport('docx')} disabled={p.busy}>{L('요청서 Word', 'Request Word')}</B>
          <B primary onClick={() => p.onExport('pdf')} disabled={p.busy}>{L('요청서 PDF', 'Request PDF')}</B>
          <B onClick={p.onPrint} disabled={p.busy}>{L('인쇄', 'Print')}</B>
          <B onClick={p.onEmail} disabled={p.busy}>{L('이메일 발송', 'Email')}</B>
          <B onClick={p.onFormXlsx} disabled={p.busy}>{L('회신용 Excel 서식', 'Reply Excel form')}</B>
          <B onClick={() => fileRef.current?.click()} disabled={p.busy}>{L('회신 Excel 불러오기', 'Import reply Excel')}</B>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) p.onImport(f); e.target.value = ''; }} />
        </div>
      </div>

      {/* dates & contacts */}
      <Sub title={L('① 일정과 연락처', '① Dates and contacts')}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Lab text={L('현장조사 희망 시작일', 'Proposed on-site start')}><input type="date" className={inp} value={prep.auditStart} min={today} onChange={(e) => setPrep((s) => ({ ...s, auditStart: e.target.value }))} /></Lab>
          {cfg.reviewType === 'periodic' && <Lab text={L('현재 적합인정서 만료일', 'Current certificate expiry')}><input type="date" className={inp} value={prep.expiry} onChange={(e) => setPrep((s) => ({ ...s, expiry: e.target.value }))} /></Lab>}
          {([['importerContact', L('수입업자 담당자', 'Importer contact')], ['importerEmail', L('수입업자 이메일', 'Importer e-mail')], ['siteContact', L('제조소 담당자', 'Site contact')], ['siteEmail', L('제조소 이메일', 'Site e-mail')]] as [keyof PrepState['contact'], string][]).map(([k, t]) => (
            <Lab key={k} text={t}><input className={inp} value={prep.contact[k]} onChange={(e) => setPrep((s) => ({ ...s, contact: { ...s.contact, [k]: e.target.value } }))} /></Lab>
          ))}
        </div>
        {tl.length > 0 && (
          <ol className="mt-4 relative border-l-2 border-slate-200 ml-2 space-y-2">
            {tl.map((m, i) => (
              <li key={i} className="ml-4 text-sm">
                <span className={`absolute -left-[7px] mt-1.5 w-3 h-3 rounded-full ${m.kind === 'law' ? 'bg-rose-500' : m.kind === 'audit' ? 'bg-ink' : 'bg-slate-300'}`} />
                <span className="font-mono text-xs text-slate-500 mr-2">{m.date}</span>
                <span className={m.date < today ? 'text-red-700' : ''}>{L(m.ko, m.en)}</span>
                <span className="ml-1 text-[11px] text-slate-400">{m.kind === 'law' ? L('규정', 'regulation') : m.kind === 'advice' ? L('권장', 'suggested') : ''}</span>
              </li>
            ))}
          </ol>
        )}
        {!tl.length && <p className="text-xs text-slate-500 mt-2">{L('시작일을 넣으면 신청·확정·결과·보완 기한을 거꾸로 계산합니다.', 'Enter the start date to back-schedule all deadlines.')}</p>}
      </Sub>

      {/* risk precheck */}
      <Sub title={L('② 위해우려·현장조사 보류 사전 확인', '② High-risk and suspension pre-check')}>
        <div className="space-y-1.5">
          {RISK_QUESTIONS.map((q) => (
            <div key={q.id} className="flex flex-wrap items-center justify-between gap-2 text-sm border-b border-slate-100 pb-1.5">
              <span>{L(q.ko, q.en)}</span>
              <span className="flex gap-1">
                {(['no', 'yes'] as const).map((v) => (
                  <button key={v} onClick={() => setRisk(q.id, v)} className={`px-2.5 py-0.5 rounded text-xs border ${prep.risk[q.id] === v ? (v === 'yes' ? 'bg-rose-600 text-white border-rose-600' : 'bg-ink text-white border-ink') : 'border-slate-300'}`}>{v === 'yes' ? L('예', 'Yes') : L('아니오', 'No')}</button>
                ))}
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-2">{L('답을 고르면 ① 심사 조건의 "위해우려제조소"·"현장조사 보류"에 바로 반영됩니다.', 'Answers update the high-risk / suspension conditions above.')} {cfg.riskSite && <b className="text-rose-700">{L('→ 합동 현장조사 대상', '→ joint on-site audit')}</b>}</p>
      </Sub>

      {/* consult checklist */}
      <Sub title={L('③ 사전협의 항목 (해설서 제8조)', '③ Pre-consultation items')}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead><tr className="text-left text-xs text-slate-500"><th className="py-1">{L('항목', 'Item')}</th><th>{L('상태', 'Status')}</th><th>{L('담당', 'Owner')}</th><th>{L('비고', 'Note')}</th></tr></thead>
            <tbody>
              {CONSULT_ITEMS.map((i) => {
                const v = prep.consult[i.id];
                const set = (patch: Partial<{ status: Status; owner: string; note: string }>) => setPrep((s) => ({ ...s, consult: { ...s.consult, [i.id]: { status: 'todo', owner: '', note: '', ...s.consult[i.id], ...patch } } }));
                return (
                  <tr key={i.id} className="border-t border-slate-100">
                    <td className="py-1.5 pr-2">{L(i.ko, i.en)}</td>
                    <td className="pr-2">{statusSel(v?.status, (st) => set({ status: st }))}</td>
                    <td className="pr-2 w-32"><input className={inp} value={v?.owner || ''} onChange={(e) => set({ owner: e.target.value })} /></td>
                    <td className="w-56"><input className={inp} value={v?.note || ''} onChange={(e) => set({ note: e.target.value })} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Sub>

      {/* audit plan assignments */}
      <Sub title={L('④ Audit Plan 순서별 제조소 담당자·장소·준비 문서', '④ Auditee, location and documents per audit step')}>
        <div className="flex justify-end mb-2"><B onClick={autofillDocs} disabled={!docs.length}>{L('매칭된 문서로 준비 문서 채우기', 'Fill documents from matches')}</B></div>
        <div className="overflow-x-auto max-h-[480px] overflow-y-auto border rounded">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="sticky top-0 bg-white"><tr className="text-left text-xs text-slate-500"><th className="p-1.5">#</th><th>Day</th><th>KGMP</th><th>{L('담당 심사', 'Auditor')}</th><th>{L('제조소 담당자', 'Auditee')}</th><th>{L('장소', 'Location')}</th><th>{L('준비 문서', 'Documents')}</th></tr></thead>
            <tbody>
              {steps.map((s) => {
                const a = prep.assign[s.order] || { auditee: '', location: '', docs: '' };
                const set = (patch: Partial<typeof a>) => setPrep((st) => ({ ...st, assign: { ...st.assign, [s.order]: { ...a, ...patch } } }));
                return (
                  <tr key={s.order} className="border-t border-slate-100 align-top">
                    <td className="p-1.5 text-xs text-slate-400">{s.order}</td>
                    <td className="text-xs whitespace-nowrap pt-2">Day {s.dayN}</td>
                    <td className="pr-2 pt-1.5"><span className="font-mono text-xs">{s.article}</span> {lang === 'ko' ? s.ko : s.en}</td>
                    <td className="text-xs pt-2 pr-2">{auditorLabel(s.auditor, lang)}</td>
                    <td className="pr-1 w-36"><input className={inp} value={a.auditee} onChange={(e) => set({ auditee: e.target.value })} /></td>
                    <td className="pr-1 w-28"><input className={inp} value={a.location} onChange={(e) => set({ location: e.target.value })} /></td>
                    <td className="w-56"><input className={inp} value={a.docs} onChange={(e) => set({ docs: e.target.value })} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Sub>

      {/* gaps */}
      <Sub title={L(`⑤ 근거 문서 확인 요청 (${gaps.length}개 조항)`, `⑤ Evidence requests (${gaps.length} clauses)`)}>
        {gaps.length ? (
          <div className="flex flex-wrap gap-1.5">
            {gaps.map((id) => <span key={id} className="text-xs rounded bg-amber-50 border border-amber-200 text-amber-900 px-2 py-0.5">{id} {lang === 'ko' ? CLAUSE_BY_ID[id].ko : CLAUSE_BY_ID[id].en}</span>)}
          </div>
        ) : <p className="text-sm text-emerald-700">{L('모든 적용 조항에 근거 문서가 있습니다.', 'Every applicable clause has evidence.')}</p>}
        <p className="text-xs text-slate-500 mt-2">{L('이 목록은 사전 요청서 4항과 회신용 Excel(3_Documents)에 자동으로 들어갑니다.', 'Included in the request letter (section 4) and the reply form (3_Documents).')}</p>
      </Sub>

      {/* interpreter */}
      <Sub title={L('⑥ 통역 준비 (통역 동의서 자동 작성)', '⑥ Interpreter (consent form filled in)')}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Lab text={L('통역 언어 경로', 'Language path')}><input className={inp} placeholder={L('예: 이탈리아어 → 영어 → 한국어', 'e.g. Italian → English → Korean')} value={prep.interp.path} onChange={(e) => { const v = e.target.value; setPrep((s) => ({ ...s, interp: { ...s.interp, path: v } })); p.setCfg({ doubleInterpretation: (v.match(/→|->/g) || []).length >= 2 }); }} /></Lab>
          <Lab text={L('통역자 수', 'Interpreters')}><input className={inp} type="number" min={1} value={prep.interp.count} onChange={(e) => setPrep((s) => ({ ...s, interp: { ...s.interp, count: e.target.value } }))} /></Lab>
          <Lab text={L('통역자 구분', 'Interpreter type')}>
            <select className={inp} value={prep.interp.type} onChange={(e) => setPrep((s) => ({ ...s, interp: { ...s.interp, type: e.target.value as PrepState['interp']['type'] } }))}>
              <option value="resident">{L('해당 국가 상주인력', 'Resident staff')}</option><option value="importer">{L('국내 제조·수입업체 관계자', 'Importer staff')}</option><option value="pro">{L('전문 통역인력', 'Professional')}</option><option value="other">{L('기타', 'Other')}</option>
            </select>
          </Lab>
          <Lab text={L('경력', 'Experience')}>
            <select className={inp} value={prep.interp.experience} onChange={(e) => setPrep((s) => ({ ...s, interp: { ...s.interp, experience: e.target.value as PrepState['interp']['experience'] } }))}>
              <option value="iso13485">{L('ISO 13485 통역', 'ISO 13485')}</option><option value="quality">{L('품질관련 통역', 'Quality')}</option><option value="other">{L('다른 분야 통역', 'Other field')}</option>
            </select>
          </Lab>
        </div>
        {cfg.doubleInterpretation && <p className="text-xs text-amber-800 mt-2">{L('이중 통역은 심사 기간이 늘어날 수 있습니다(해설서 p.75).', 'Double interpretation may extend the audit.')}</p>}
      </Sub>

      {/* logistics */}
      <Sub title={L('⑦ 출장 준비', '⑦ Logistics')}>
        <div className="grid md:grid-cols-2 gap-x-6">
          {LOGISTICS.map((i) => {
            const v = prep.logistics[i.id];
            return (
              <div key={i.id} className="flex items-start gap-2 py-1.5 border-b border-slate-100 text-sm">
                {statusSel(v?.status, (st) => setPrep((s) => ({ ...s, logistics: { ...s.logistics, [i.id]: { note: '', ...s.logistics[i.id], status: st } } })))}
                <div className="flex-1">
                  {L(i.ko, i.en)}
                  {i.hint && <div className="text-[11px] text-amber-700">※ {L(i.hint.ko, i.hint.en)}</div>}
                  <input className="mt-1 border-b w-full text-xs outline-none" placeholder={L('메모', 'Note')} value={v?.note || ''} onChange={(e) => setPrep((s) => ({ ...s, logistics: { ...s.logistics, [i.id]: { status: 'todo', ...s.logistics[i.id], note: e.target.value } } }))} />
                </div>
              </div>
            );
          })}
        </div>
      </Sub>

      {/* day pack */}
      <Sub title={L('⑧ 심사 당일 준비물', '⑧ Audit-day pack')}>
        <div className="grid md:grid-cols-2 gap-x-6">
          {DAY_PACK.map((i) => (
            <label key={i.id} className="flex items-start gap-2 py-1 text-sm">
              <input type="checkbox" className="mt-1" checked={!!prep.dayPack[i.id]} onChange={(e) => setPrep((s) => ({ ...s, dayPack: { ...s.dayPack, [i.id]: e.target.checked } }))} />
              {L(i.ko, i.en)}
            </label>
          ))}
        </div>
      </Sub>
    </div>
  );
}

function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h3 className="text-sm font-bold text-ink mb-2">{title}</h3>{children}</div>;
}
function Lab({ text, children }: { text: string; children: React.ReactNode }) {
  return <label className="text-xs text-slate-500 block">{text}<div className="mt-0.5 text-slate-800">{children}</div></label>;
}
function B({ children, onClick, disabled, primary }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; primary?: boolean }) {
  return <button onClick={onClick} disabled={disabled} className={`px-3 py-1.5 rounded-md text-sm disabled:opacity-40 ${primary ? 'bg-ink text-white hover:bg-brand-700' : 'border border-slate-300 bg-white hover:bg-slate-50'}`}>{children}</button>;
}
