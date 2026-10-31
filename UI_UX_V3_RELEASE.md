# MFDS GMP Helper 3.0 — UI/UX Integration

## Changes
- Screenshot-inspired white/blue professional workspace
- Desktop fixed left navigation, mobile bottom navigation
- Audit settings, uploads, matching, Gap Analysis, pre-coordination, audit plan, export navigation
- Four-format export selector with preview; export buttons wired to existing report export functions and disabled until document analysis exists
- Existing document parsing, KGMP mapping, Gap Analysis, pre-audit and Vercel API files preserved
- All 32 prior regulatory reference sources and six sample output artifacts retained

## Important limitations
- Build is **not verified**: npm dependency installation did not complete in the execution environment; TypeScript reports missing type definitions because node_modules is incomplete.
- Screenshots were used as UI design references, not as legal or technical validation.
- Export preview is simplified; actual exported report is produced by existing export engine.
- KGMP clause-by-clause legal accuracy and real-world manufacturing document matching remain unverified.
- Vercel deployment and iPhone browser execution have not been verified.
- Do not upload proprietary manufacturer documents to public GitHub repositories.

## Deploy
Project: mfds-gmp-helper
Framework: Vite
Install: npm ci
Build: npm run build
Output: dist
API endpoints: /api/* (Vercel)
Environment variables: consult DEPLOY.md; server-side AI credentials only.
