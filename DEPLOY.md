# Vercel 배포 가이드 (2026-10-31)

이 폴더는 Vercel에 바로 배포 가능한 상태입니다.

## 배포 순서
1. GitHub에 새 저장소 생성 후 이 폴더 전체 업로드 (node_modules, dist 제외)
2. Vercel → New Project → Import Git Repository
3. Framework Preset: Vite
4. Build Command: npm run build
5. Output Directory: dist
6. (선택) Environment Variables:
   - ANTHROPIC_API_KEY : AI 정밀 분석·번역용
   - ANTHROPIC_MODEL : 기본 claude-sonnet-5-5
   - RESEND_API_KEY, EMAIL_FROM : 서버 이메일 발송용

## 주요 기능 (현재 버전)
- MFDS KGMP [별표 2] / ISO 13485 기반 문서 매칭
- 양방향 실사 지원: MFDS → 해외 제조소 / 해외 기관 → 한국(또는 제3국) 제조소
- 지원 기관: MFDS, FDA, PMDA, ANVISA, SFDA, EU NB, MHRA, NMPA, MDSAP
- 사전 조율(Prep) 기능: 일정 역산, 위해우려 확인, 사전협의, 통역, 출장·당일 준비물, Excel 요청/회신
- Gap 분석, Annex 생성, 다국어 지원, HWPX/DOCX/PDF/Excel 내보내기
- 업로드: PDF(OCR), Word, Excel, ZIP, 이미지 등

## 주의
- 규제 기준은 정적 데이터입니다. 실사 전 반드시 최신 고시·가이드를 재확인하세요.
- 공개 배포 시 제조소 내부 문서는 public/에 넣지 마세요.
