# MFDS GMP Helper

해외 제조소의 QM·SOP·문서목록을 업로드하면 KGMP([별표 2], ISO 13485:2016) 조항과 매칭하고,
MFDS Audit Plan 순서별 Related documents(SOP Title / Document No / Final version / Revision date)를
식약처 제출 서식(HWP·Word·PDF·인쇄·이메일)으로 만들어 주는 앱입니다.

## 기능
- **양방향 해외 실사**: 실사 기관(MFDS·FDA·PMDA·ANVISA·SFDA·EU NB·MHRA·NMPA·MDSAP) × 제조소 소재국을 골라, 한국 MFDS가 해외 제조소로 가는 경우와 해외 기관이 한국(또는 제3국) 제조소로 오는 경우를 같은 틀로 처리. 자국 내 실사는 경고, 통역 경로 자동 제안
- 심사 조건 조합: 심사 방법(자동/서류검토만/현장조사), 심사 구분(최초·정기·변경·추가), 등급(1~4), 용도, 제조의뢰자-제조자, 위해우려·MDSAP·보류 등 → 심사 주체·적용 조항·제출 서류·일수·유효기간 자동 판단
- 업로드: 파일·폴더·ZIP·사진(OCR)·PDF(스캔 OCR)·Word(.docx)·Excel/CSV·TXT
- 분석: QM 조항별 SOP 참조, 마스터리스트, 문서 머리글(문서번호·개정·일자, 다국어) 추출, 키워드·AI 매칭
- 결과: Audit Plan 순서(Day 1~N) 편집, 미매칭 문서 지정, 한국어 번역
- 내보내기: HWPX, DOCX, PDF(나눔고딕 임베드), 인쇄, Excel, 이메일
- 사전 조율: 일정 역산, 위해우려·보류 사전 확인, 사전협의 항목, 담당자·장소, 통역 동의서, 출장 준비, 당일 준비물, 제조소와 요청서·회신 Excel 주고받기

## 환경 변수 (Vercel)
| 변수 | 용도 |
| --- | --- |
| `ANTHROPIC_API_KEY` | AI 정밀 분석·번역 (없으면 규칙 기반) |
| `ANTHROPIC_MODEL` | 선택, 기본 `claude-sonnet-5-5` |
| `RESEND_API_KEY`, `EMAIL_FROM` | 서버 이메일 발송 (없으면 기기 공유/메일 앱) |

## 개발
```
npm install
npm run dev
npm run build
```

## 배포 (GitHub → Vercel)
1. 이 폴더 전체를 GitHub 새 저장소(예: `mfds-gmp-helper`)에 올립니다. (`node_modules`, `dist`는 올리지 않음 — `.gitignore`에 포함)
2. Vercel → Add New Project → 해당 저장소 Import
3. Framework: **Vite** (vercel.json에 지정됨) · Build: `npm run build` · Output: `dist` — 그대로 Deploy
4. (선택) Settings → Environment Variables: `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM` 추가 후 Redeploy

## 다음 단계 (Global GMP Helper)
`src/data/kgmp.ts`(조항·Audit Plan)와 `src/data/rules.ts`(심사 조건 규칙)가 규제기관별 모듈의 기준 형태입니다.
FDA(QMSR/21 CFR 820), EU MDR, MHRA, ANVISA(RDC 665), SFDA, PMDA 등은 같은 구조의 파일을 추가해 선택형으로 확장합니다.
