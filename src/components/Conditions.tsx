import type { AuditConfig, Outcome } from '../data/rules';
import type { Lang } from '../lib/i18n';
import type { SiteInfo } from '../lib/report';

const tr = (l: Lang, ko: string, en: string) => (l === 'ko' ? ko : en);

function Seg<T extends string | number>({ value, options, onChange }: { value: T; options: { v: T; label: string; hint?: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={String(o.v)} type="button" title={o.hint} onClick={() => onChange(o.v)}
          className={`px-3 py-1.5 rounded-md text-sm border transition ${value === o.v ? 'bg-ink text-white border-ink' : 'bg-white border-slate-300 hover:border-ink'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Check({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <label className={`flex items-start gap-2 text-sm py-1 ${disabled ? 'opacity-40' : ''}`} title={hint}>
      <input type="checkbox" className="mt-0.5" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}{hint && <span className="block text-[11px] text-slate-400 leading-snug">{hint}</span>}</span>
    </label>
  );
}

export function Conditions({ cfg, set, out, lang, site, setSite }: { cfg: AuditConfig; set: (p: Partial<AuditConfig>) => void; out: Outcome; lang: Lang; site: SiteInfo; setSite: (s: SiteInfo) => void }) {
  const L = (ko: string, en: string) => tr(lang, ko, en);
  return (
    <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
      <div className="space-y-4">
        <Row label={L('① 심사 방법', '① Review method')}>
          <Seg value={cfg.method} onChange={(v) => set({ method: v })} options={[
            { v: 'auto', label: L('규정에 따라 자동', 'Auto (by regulation)') },
            { v: 'document', label: L('서류검토만', 'Document review only') },
            { v: 'onsite', label: L('반드시 현장조사', 'On-site audit') },
          ]} />
        </Row>
        <Row label={L('② 심사 구분', '② Review type')}>
          <Seg value={cfg.reviewType} onChange={(v) => set({ reviewType: v })} options={[
            { v: 'initial', label: L('최초심사', 'Initial') }, { v: 'periodic', label: L('정기심사', 'Periodic') },
            { v: 'change', label: L('변경심사', 'Change (relocation)') }, { v: 'additional', label: L('추가심사', 'Additional group') },
          ]} />
        </Row>
        <Row label={L('③ 의료기기 등급', '③ Device class')}>
          <Seg value={cfg.grade} onChange={(v) => set({ grade: v })} options={[1, 2, 3, 4].map((g) => ({ v: g as 1 | 2 | 3 | 4, label: L(`${g}등급`, `Class ${g}`) }))} />
        </Row>
        <Row label={L('④ 용도', '④ Purpose')}>
          <Seg value={cfg.purpose} onChange={(v) => set({ purpose: v })} options={[
            { v: 'domestic', label: L('국내 판매', 'Domestic sale') }, { v: 'export', label: L('수출용', 'Export only') }, { v: 'clinical', label: L('임상시험용', 'Clinical') },
          ]} />
        </Row>
        <Row label={L('⑤ 제조소 구분', '⑤ Site role')}>
          <Seg value={cfg.role} onChange={(v) => set({ role: v })} options={[
            { v: 'single', label: L('단독 제조소', 'Single site') }, { v: 'giver', label: L('제조의뢰자', 'Contract giver') }, { v: 'maker', label: L('제조자(수탁)', 'Contract manufacturer') },
          ]} />
        </Row>

        <details className="rounded-lg border border-slate-200 p-3" open>
          <summary className="text-sm font-semibold cursor-pointer">{L('⑥ 심사 방법에 영향을 주는 조건', '⑥ Conditions affecting the method')}</summary>
          <div className="mt-2 grid sm:grid-cols-2 gap-x-4">
            <Check checked={cfg.riskSite} onChange={(v) => set({ riskSite: v })} label={L('위해우려제조소', 'High-risk site')} hint={L('최근 3년 GMP 부적합, 수거검사 부적합, 국내외 강제회수·사용중지·제조중지', 'Last 3 years: KGMP fail, sample-test fail, recall / stop order')} />
            <Check checked={cfg.confidential} onChange={(v) => set({ confidential: v })} label={L('기업비밀로 QM·제품표준서 제출 불가', 'Cannot submit QM / product standard (confidential)')} hint={L('제조소 사유서로 현장조사 요청', 'On-site requested by letter')} />
            <Check checked={cfg.otherCert} onChange={(v) => set({ otherCert: v })} label={L('다른 수입업자가 이 제조소의 유효한 KGMP 인정서 보유', 'Another importer holds a valid certificate for this site')} />
            {cfg.otherCert && <Check checked={cfg.otherCertOnsite} onChange={(v) => set({ otherCertOnsite: v })} label={L('└ 그 인정서는 현장조사로 발급됨', '└ issued after an on-site audit')} />}
            <Check checked={cfg.ivdCert} onChange={(v) => set({ ivdCert: v })} label={L('체외진단 GMP 인정서(현장조사) 보유', 'Holds IVD KGMP certificate (on-site)')} />
            <Check checked={cfg.mdsap} onChange={(v) => set({ mdsap: v })} label={L('MDSAP 적합인정서 보유', 'Holds MDSAP certificate')} hint={L('고시 제2026-46호 반영 — 현행 조문 확인 권장', 'Per Notice 2026-46 — check current text')} />
            {cfg.mdsap && <Check checked={cfg.mdsapMajorNc} onChange={(v) => set({ mdsapMajorNc: v })} label={L('└ 중대 부적합 이력 있음', '└ Major nonconformity history')} />}
            {cfg.reviewType === 'change' && <Check checked={cfg.foreignCertForChange} onChange={(v) => set({ foreignCertForChange: v })} label={L('이전 후 생산국 인정서·실사결과 제출 가능', 'Origin certificate & audit report after relocation available')} />}
            {cfg.reviewType === 'periodic' && <Check checked={cfg.batchPeriodic} onChange={(v) => set({ batchPeriodic: v })} label={L('정기심사 일괄신청(제조소 여러 곳)', 'Batch periodic application')} />}
            {cfg.reviewType === 'periodic' && cfg.batchPeriodic && <Check checked={cfg.batchSelected} onChange={(v) => set({ batchSelected: v })} label={L('└ 이 제조소가 현장조사 대상', '└ This site is the on-site one')} hint={L('최상위 등급·국내 수입량 최다·현장조사 이력 없음 순으로 종합 판단', 'Highest class, largest volume, never audited')} />}
            <Check checked={cfg.suspended} onChange={(v) => set({ suspended: v })} label={L('한시적 현장조사 보류 지역', 'Temporary on-site suspension')} hint={L('외교부 여행금지·철수권고·특별여행주의보, 전시·감염병·천재지변', 'Travel ban / war / epidemic / disaster')} />
          </div>
        </details>

        <details className="rounded-lg border border-slate-200 p-3" open>
          <summary className="text-sm font-semibold cursor-pointer">{L('⑦ 제품·공정 특성', '⑦ Product & process')}</summary>
          <div className="mt-2 grid sm:grid-cols-2 gap-x-4">
            <Check checked={cfg.design} onChange={(v) => set({ design: v })} label={L('제조소가 설계·개발 수행', 'Site performs design & development')} />
            <Check checked={cfg.sterile} onChange={(v) => set({ sterile: v })} label={L('멸균 의료기기', 'Sterile device')} />
            <Check checked={cfg.installation} onChange={(v) => set({ installation: v })} label={L('설치 필요', 'Installation required')} />
            <Check checked={cfg.servicing} onChange={(v) => set({ servicing: v })} label={L('사후 서비스 필요', 'Servicing required')} />
            <Check checked={cfg.software} onChange={(v) => set({ software: v })} label={L('소프트웨어 의료기기 제조소', 'Software device site')} />
            <Check checked={cfg.innovativeSw} onChange={(v) => set({ innovativeSw: v })} label={L('혁신의료기기 소프트웨어', 'Innovative device software')} />
            <Check checked={cfg.humanAnimal} onChange={(v) => set({ humanAnimal: v })} label={L('인체조직·동물유래 물질 사용', 'Human / animal-origin material')} />
            <Check checked={cfg.fusion} onChange={(v) => set({ fusion: v })} label={L('융복합 의료제품(의약품 결합)', 'Drug–device combination')} />
            <Check checked={cfg.kitCombo} onChange={(v) => set({ kitCombo: v })} label={L('한벌구성·조합 의료기기', 'Kit / combination device')} />
            <Check checked={cfg.multiMainProcess} onChange={(v) => set({ multiMainProcess: v })} label={L('주요공정 2개 이상·다수 품목·공급업체 현장조사', '≥2 main processes / many products / supplier visit')} />
            <Check checked={cfg.doubleInterpretation} onChange={(v) => set({ doubleInterpretation: v })} label={L('이중 통역(현지어→영어→한국어)', 'Double interpretation')} />
          </div>
        </details>

        <details className="rounded-lg border border-slate-200 p-3">
          <summary className="text-sm font-semibold cursor-pointer">{L('⑧ 제출 서식 기본정보', '⑧ Form header details')}</summary>
          <div className="mt-2 grid sm:grid-cols-2 gap-2">
            {([['site', L('제조소 명칭', 'Site name')], ['address', L('제조소 소재지', 'Site address')], ['applicant', L('신청인(수입업자)', 'Applicant (importer)')], ['product', L('대상 품목(군)', 'Products / group')], ['preparedBy', L('작성자', 'Prepared by')]] as [keyof SiteInfo, string][]).map(([k, label]) => (
              <label key={k} className="text-xs text-slate-500">{label}
                <input className="mt-0.5 w-full border rounded px-2 py-1.5 text-sm text-slate-800" value={site[k]} onChange={(e) => setSite({ ...site, [k]: e.target.value })} />
              </label>
            ))}
          </div>
        </details>
      </div>

      {/* outcome */}
      <aside className="rounded-xl bg-slate-50 border border-slate-200 p-4 self-start lg:sticky lg:top-4 space-y-3">
        <h3 className="font-semibold">{L('규정 판단 결과', 'Regulatory outcome')}</h3>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
          <dt className="text-slate-500">{L('심사 방법', 'Method')}</dt>
          <dd className="font-semibold">{out.method === 'onsite' ? L('현장조사 + 서류검토', 'On-site + document') : L('서류검토만', 'Document only')}
            {cfg.method === 'auto' ? <span className="ml-1 text-xs font-normal text-slate-400">({L('자동', 'auto')})</span> : null}
            {out.methodLocked && <span className="ml-1 text-[11px] rounded bg-rose-100 text-rose-800 px-1.5">{L('현장조사 필수', 'on-site mandatory')}</span>}</dd>
          <dt className="text-slate-500">{L('심사 주체', 'Authority')}</dt><dd>{L(out.authorityNote.ko, out.authorityNote.en)}</dd>
          <dt className="text-slate-500">{L('현장조사 일수', 'On-site days')}</dt><dd>{out.days ? `${out.days}${L('일 (예상)', ' days (est.)')}` : '–'}</dd>
          <dt className="text-slate-500">{L('적용 조항', 'Clauses')}</dt><dd>{out.clauses.length}{L('개', '')} · <span className="text-slate-500">{L(out.clauseBasis.ko, out.clauseBasis.en)}</span></dd>
          <dt className="text-slate-500">{L('제출 서류', 'Documents')}</dt><dd>{out.documents.filter((d) => d.required === 'yes').length}{L('종 필수', ' required')} + {out.documents.filter((d) => d.required === 'cond').length}{L('종 해당 시', ' conditional')}</dd>
          <dt className="text-slate-500">{L('유효기간', 'Validity')}</dt><dd>{L(out.validity.ko, out.validity.en)}</dd>
          <dt className="text-slate-500">{L('인정번호 구분', 'Cert code')}</dt><dd className="font-mono">{out.certCode}</dd>
        </dl>
        <ul className="space-y-1.5 text-xs">
          {[...out.reasons, ...out.warnings].map((r, i) => (
            <li key={i} className={`rounded px-2 py-1.5 ${r.level === 'must' ? 'bg-rose-50 text-rose-900' : r.level === 'warn' ? 'bg-amber-50 text-amber-900' : 'bg-white text-slate-700 border border-slate-200'}`}>
              {L(r.ko, r.en)} <span className="text-slate-400">· {r.ref}</span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm font-semibold mb-1.5">{label}</div>
      {children}
    </div>
  );
}
