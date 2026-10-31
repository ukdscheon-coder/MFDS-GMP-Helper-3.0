import { Fragment } from 'react';
import type { Agency } from '../data/agencies';
import type { AuditConfig } from '../data/rules';
import type { Lang } from '../lib/i18n';
import type { SiteInfo } from '../lib/report';

export function AgencyPanel({ lang, agency, cfg, set, site, setSite }: {
  lang: Lang; agency: Agency; cfg: AuditConfig; set: (p: Partial<AuditConfig>) => void; site: SiteInfo; setSite: (s: SiteInfo) => void;
}) {
  const L = (ko: string, en: string) => (lang === 'ko' ? ko : en);
  const t = (b: { ko: string; en: string }) => (lang === 'ko' ? b.ko : b.en);
  const rows: [string, { ko: string; en: string }][] = [
    [L('기준', 'Criteria'), agency.criteria], [L('실사 주체', 'Who'), agency.who], [L('시기·주기', 'When'), agency.when],
    [L('사전 통보', 'Notice'), agency.notice], [L('기간', 'Duration'), agency.duration], [L('언어', 'Language'), agency.language],
    [L('지적·회신 기한', 'Findings'), agency.findings], [L('비용', 'Cost'), agency.cost],
  ];
  const chk = (k: keyof AuditConfig, label: string) => (
    <label className="inline-flex items-center gap-1.5 text-sm mr-4"><input type="checkbox" checked={!!cfg[k]} onChange={(e) => set({ [k]: e.target.checked } as Partial<AuditConfig>)} />{label}</label>
  );
  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm rounded-lg border border-slate-200 p-3 self-start">
          {rows.map(([k, v]) => <Fragment key={k}><dt className="text-slate-500 whitespace-nowrap">{k}</dt><dd>{t(v)}</dd></Fragment>)}
        </dl>
        <div className="space-y-3">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <div className="text-sm font-semibold mb-1">{L('사전 준비 서류', 'Documents to prepare')}</div>
            <ul className="text-sm list-disc ml-4 space-y-0.5">{agency.docs.map((d, i) => <li key={i}>{t(d)}</li>)}</ul>
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
            <div className="text-sm font-semibold mb-1">{L('ISO 13485 외 추가 확인', 'Beyond ISO 13485')}</div>
            <ul className="text-sm space-y-0.5">{agency.deltas.map((d, i) => <li key={i}><span className="font-mono text-xs mr-1">{d.clause}</span>{L(d.ko, d.en)}</li>)}</ul>
          </div>
        </div>
      </div>
      <div>
        <div className="text-sm font-semibold mb-1">{L('제품·공정 특성 (해당 없는 조항 제외)', 'Product & process (excludes N/A clauses)')}</div>
        {chk('design', L('설계·개발 수행', 'Design & development'))}{chk('sterile', L('멸균 의료기기', 'Sterile'))}{chk('installation', L('설치 필요', 'Installation'))}{chk('servicing', L('서비스 필요', 'Servicing'))}
      </div>
      <details className="rounded-lg border border-slate-200 p-3">
        <summary className="text-sm font-semibold cursor-pointer">{L('제조소 기본정보', 'Site details')}</summary>
        <div className="mt-2 grid sm:grid-cols-3 gap-2">
          {([['site', L('제조소 명칭', 'Site name')], ['address', L('소재지', 'Address')], ['product', L('대상 품목', 'Products')]] as [keyof SiteInfo, string][]).map(([k, label]) => (
            <label key={k} className="text-xs text-slate-500">{label}<input className="mt-0.5 w-full border rounded px-2 py-1.5 text-sm text-slate-800" value={site[k]} onChange={(e) => setSite({ ...site, [k]: e.target.value })} /></label>
          ))}
        </div>
      </details>
      <p className="text-[11px] text-slate-400">{L('근거', 'Sources')}: {agency.sources.map((s, i) => <a key={i} className="underline mr-2" href={s.url} target="_blank" rel="noreferrer">{s.title}</a>)} · {L('[확인 필요]는 기관 최신 원문으로 재확인', '[check] = verify against current text')}</p>
    </div>
  );
}
