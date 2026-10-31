import { useState } from 'react';
import { KDELTAS } from '../data/kgmp-delta';
import { REG_BASIS, SEV_LABEL, VERDICT_LABEL, type GapResult, type Profile, type Severity } from '../lib/gap';
import type { Lang } from '../lib/i18n';
import type { PrepState } from '../data/prep';
import type { DocFmt } from '../lib/render';

const SEV_CLS: Record<Severity, string> = {
  major: 'bg-red-600 text-white', minor: 'bg-amber-500 text-white', obs: 'bg-sky-600 text-white', ofi: 'bg-slate-500 text-white',
};
const VERDICT_CLS = { ready: 'bg-emerald-100 text-emerald-800 border-emerald-300', fix: 'bg-amber-100 text-amber-900 border-amber-300', major: 'bg-red-100 text-red-800 border-red-300' };
const EFFORT = { S: ['0.5–1일', '0.5–1 d'], M: ['2–4일', '2–4 d'], L: ['5–10일', '5–10 d'] } as const;

export function GapPanel({ lang, gap, profile, replies, busy, onDoc, onJson }: {
  lang: Lang; gap: GapResult; profile: Profile; replies: PrepState['gapReplies']; busy: boolean;
  onDoc: (kind: 'report' | 'annex', fmt: DocFmt) => void; onJson: () => void;
}) {
  const L = (ko: string, en: string) => (lang === 'ko' ? ko : en);
  const [sev, setSev] = useState<Severity | 'all'>('all');
  const [open, setOpen] = useState<string | null>(null);
  const list = gap.findings.filter((f) => sev === 'all' || f.severity === sev);
  const bar = gap.readiness >= 85 ? 'bg-emerald-500' : gap.readiness >= 60 ? 'bg-amber-500' : 'bg-red-500';
  const btn = 'px-3 py-1.5 rounded-md text-sm border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40';
  const pbtn = 'px-3 py-1.5 rounded-md text-sm bg-ink text-white hover:bg-brand-700 disabled:opacity-40';

  return (
    <div className="space-y-5">
      {/* score */}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="text-xs text-slate-500">{L('KGMP 실사 준비도', 'KGMP audit readiness')}</div>
          <div className="flex items-end gap-2 mt-1"><span className="text-4xl font-bold tabular-nums">{gap.readiness}</span><span className="text-lg text-slate-500 mb-1">%</span></div>
          <div className="h-2 rounded bg-slate-100 mt-2 overflow-hidden"><div className={`h-full ${bar}`} style={{ width: `${gap.readiness}%` }} /></div>
          <div className={`inline-block mt-3 text-sm font-semibold border rounded px-2 py-0.5 ${VERDICT_CLS[gap.verdict]}`}>{L(VERDICT_LABEL[gap.verdict].ko, VERDICT_LABEL[gap.verdict].en)}</div>
        </div>
        <div className="rounded-lg border border-slate-200 p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSev('all')} className={`text-sm rounded-full px-3 py-1 border ${sev === 'all' ? 'bg-ink text-white border-ink' : 'border-slate-300'}`}>{L('전체', 'All')} {gap.findings.length}</button>
            {(['major', 'minor', 'obs', 'ofi'] as Severity[]).map((s) => (
              <button key={s} onClick={() => setSev(s)} className={`text-sm rounded-full px-3 py-1 border ${sev === s ? 'bg-ink text-white border-ink' : 'border-slate-300'}`}>
                {L(SEV_LABEL[s].ko, SEV_LABEL[s].en)} {gap.counts[s]}
              </button>
            ))}
          </div>
          <div className="text-sm"><span className="text-slate-500">{L('예상 보완 공수', 'Estimated remediation')}: </span><b>{gap.effortDays[0]}–{gap.effortDays[1]} {L('인일', 'man-days')}</b>
            <span className="text-slate-400 text-xs"> · {L('컨설팅 견적 기준', 'basis for a consulting quote')}</span></div>
          <div className="text-sm"><span className="text-slate-500">{L('품질매뉴얼', 'Quality manual')}: </span>{profile.qm ? `${profile.qm.docNo} ${profile.qm.title} ${profile.qm.version ? 'Rev ' + profile.qm.version : ''}` : L('인식되지 않음 — QM을 올리면 장별 대응까지 분석합니다', 'not identified — upload the QM for section mapping')}</div>
          <div className="text-[11px] text-slate-400">{L(`기준: ${REG_BASIS.name.ko} · 규칙 ${REG_BASIS.rulesVersion}`, `Basis: ${REG_BASIS.name.en} · rules ${REG_BASIS.rulesVersion}`)}</div>
        </div>
      </div>

      {/* findings */}
      <div>
        <div className="text-sm font-semibold mb-2">{L('예상 지적사항과 권장 조치 — QM 전면 개정 없이 보완', 'Expected findings and actions — without rewriting the whole QM')}</div>
        {!list.length && <p className="text-sm text-slate-500">{L('해당 등급의 예상 지적사항이 없습니다.', 'No findings in this grade.')}</p>}
        <ul className="space-y-2">
          {list.map((f) => {
            const r = replies?.[f.id];
            const isOpen = open === f.id;
            return (
              <li key={f.id} className="rounded-lg border border-slate-200">
                <button className="w-full text-left p-3 flex gap-2 items-start" onClick={() => setOpen(isOpen ? null : f.id)}>
                  <span className={`shrink-0 text-[11px] font-semibold rounded px-1.5 py-0.5 ${SEV_CLS[f.severity]}`}>{L(SEV_LABEL[f.severity].ko, SEV_LABEL[f.severity].en)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="font-mono text-xs text-slate-500 mr-1">{f.clause}</span>
                    <span className="text-sm font-medium break-words">{L(f.title.ko, f.title.en)}</span>
                    {r?.plan && <span className="ml-2 text-[11px] rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.5">{L('제조소 조치계획 접수', 'Site plan received')}</span>}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">{L(EFFORT[f.effort][0], EFFORT[f.effort][1])}</span>
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 text-sm space-y-1.5 border-t border-slate-100 pt-2">
                    <p className="text-slate-700 break-words">{L(f.detail.ko, f.detail.en)}</p>
                    <p className="break-words"><span className="font-semibold text-ink">{L('권장 조치', 'Action')}: </span>{L(f.action.ko, f.action.en)}</p>
                    {f.evidence && <p className="text-xs text-slate-500 break-words">{L('확인 위치', 'Found in')}: {f.evidence}</p>}
                    <p className="text-xs text-slate-400 break-words">{L('근거', 'Ref.')}: {f.ref} · ID {f.id}</p>
                    {r && <p className="text-xs rounded bg-emerald-50 border border-emerald-200 p-2 break-words">{L('제조소 회신', 'Site reply')}: {r.plan}{r.due ? ` · ${r.due}` : ''}{r.evidence ? ` · ${r.evidence}` : ''}</p>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Korea-specific checklist */}
      <div>
        <div className="text-sm font-semibold mb-2">{L('KGMP 고유 요구사항 점검 (ISO 13485·MDSAP에 보통 없는 항목)', 'Korea-specific checks (usually absent from ISO 13485 / MDSAP systems)')}</div>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {KDELTAS.map((d) => {
            const s = gap.deltaState[d.id];
            const [dot, txt] = s === 'met' ? ['bg-emerald-500', L('반영됨', 'Addressed')] : s === 'generic' ? ['bg-amber-400', L('한국 미명시', 'Not for Korea')] : s === 'missing' ? ['bg-red-500', L('없음', 'Missing')] : ['bg-slate-300', L('해당 없음', 'N/A')];
            return (
              <div key={d.id} className="flex items-start gap-2 text-sm rounded border border-slate-100 px-2 py-1.5">
                <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${dot}`} />
                <span className="min-w-0 flex-1 break-words"><span className="font-mono text-xs text-slate-400 mr-1">{d.clause}</span>{L(d.title.ko, d.title.en)}</span>
                <span className="shrink-0 text-xs text-slate-500">{txt}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* outputs */}
      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-3">
        <div>
          <div className="text-sm font-semibold">{L('갭 분석 보고서', 'Gap report')} <span className="font-normal text-xs text-slate-500">{L('— 수입업자·컨설팅 제안용', '— for the importer / consulting proposal')}</span></div>
          <div className="flex flex-wrap gap-2 mt-1.5">
            <button className={pbtn} disabled={busy} onClick={() => onDoc('report', 'hwpx')}>HWP</button>
            <button className={pbtn} disabled={busy} onClick={() => onDoc('report', 'docx')}>Word</button>
            <button className={pbtn} disabled={busy} onClick={() => onDoc('report', 'pdf')}>PDF</button>
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold">{L('KGMP 부속서(Annex) 초안', 'KGMP supplement (annex) draft')} <span className="font-normal text-xs text-slate-500">{L('— 기존 QM은 그대로, 한국 요구사항만 보완(한/영)', '— keeps the QM, adds Korea items (KO/EN)')}</span></div>
          <div className="flex flex-wrap gap-2 mt-1.5">
            <button className={pbtn} disabled={busy} onClick={() => onDoc('annex', 'docx')}>Word</button>
            <button className={btn} disabled={busy} onClick={() => onDoc('annex', 'hwpx')}>HWP</button>
            <button className={btn} disabled={busy} onClick={() => onDoc('annex', 'pdf')}>PDF</button>
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold">GlobalRegAI <span className="font-normal text-xs text-slate-500">{L('— 규정 변경 시 재점검용 데이터(JSON)', '— data for re-checks when rules change (JSON)')}</span></div>
          <div className="flex flex-wrap gap-2 mt-1.5"><button className={btn} disabled={busy} onClick={onJson}>JSON</button></div>
        </div>
        <p className="text-[11px] text-slate-400">{L('갭 목록은 6단계 사전 조율 Excel 서식(6_KGMP_Gaps 시트)에도 들어가 제조소가 조치계획을 회신할 수 있습니다.', 'The gap list is also in the pre-audit Excel form (sheet 6_KGMP_Gaps) so the site can return its action plan.')}</p>
      </div>
    </div>
  );
}
