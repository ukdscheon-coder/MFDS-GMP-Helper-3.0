# MFDS GMP Helper 2.0 — Integrated Review Build

## Included
- Expanded React/Vite document extraction and KGMP-first matching from Vercel Ready project.
- All original `reference-materials/` from All Sources archive (unaltered).
- Gap analysis sample outputs under `examples/gap-samples/`.
- Visible regulatory source/status banner linking to official MFDS 2026-46 notice.
- Audit plan Day 1–Day 4 without fixed times.

## Regulatory limitations
- MFDS notice 2026-46 (effective 2026-07-01) confirmed from official MFDS site on 2026-10-31.
- Historical reference materials include superseded regulations; they must NOT be treated as current law.
- Automated matching is an aid, not a determination of compliance; verify clause and evidence manually.
- New official notice is linked, not bundled as an authoritative parsed clause corpus.
- No automated periodic source monitoring is deployed. Version freshness must be checked before submission.

## Security
- App stores some metadata/document-derived records in browser localStorage. Do not use confidential customer materials in production without security hardening and legal review.
- API secrets belong only in Vercel environment variables.

## Deploy
1. Unzip; upload `mfds-gmp-helper/` contents to GitHub repository root.
2. Import repo into Vercel, Framework Vite, Build `npm run build`, Output `dist`.
3. Configure `ANTHROPIC_API_KEY` only if AI API is desired; check api/ README/config.
4. Run smoke tests on iPhone Safari and desktop before customer use.
