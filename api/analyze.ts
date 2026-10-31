import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callClaude, parseJson } from './_claude.js';

const SYSTEM = `You are a medical-device QMS auditor preparing an MFDS (Korea) KGMP on-site audit of an overseas manufacturer.
KGMP [별표 2] follows ISO 13485:2016 clause numbering. Valid clause ids (use exactly these):
4.1, 4.2.1, 4.2.2, 4.2.3, 4.2.4, 4.2.5, 5.1, 5.2, 5.3, 5.4, 5.5.1, 5.5.2, 5.5.3, 5.6, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4,
7.5.1, 7.5.2, 7.5.3, 7.5.4, 7.5.5, 7.5.6, 7.5.7, 7.5.8, 7.5.9, 7.5.10, 7.5.11, 7.6, 8.1, 8.2.1, 8.2.2, 8.2.3, 8.2.4, 8.2.5, 8.2.6, 8.3, 8.4, 8.5.
For each document you receive (an SOP, record, form or quality-manual cross-reference, in any language), return:
- clauses: the 1-3 KGMP clause ids this document is the evidence for (most specific first). Use [] if none.
- title: the document title in its original language, cleaned (no doc number, no "Rev")
- docNo, version, revisionDate (YYYY-MM-DD when determinable): correct or fill these from the excerpt; keep the given value if it is right; "" if unknown.
- titleKo: a natural Korean translation of the title using standard Korean GMP terminology (e.g. Document Control → 문서관리 절차서, CAPA → 시정 및 예방조치 절차서).
- confidence: 0..1
Answer with JSON only: {"results":[{"key":"...","clauses":[],"title":"","docNo":"","version":"","revisionDate":"","titleKo":"","confidence":0.0}]}`;

interface InDoc { key: string; fileName: string; title: string; docNo: string; version: string; revisionDate: string; excerpt: string }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const docs = (req.body?.docs || []) as InDoc[];
    const user = docs
      .map((d) => `### key=${d.key}\nfile: ${d.fileName}\ncurrent: title="${d.title}" docNo="${d.docNo}" version="${d.version}" revisionDate="${d.revisionDate}"\nexcerpt:\n${(d.excerpt || '').slice(0, 1800)}`)
      .join('\n\n');
    const text = await callClaude(SYSTEM, user, 8000);
    res.status(200).json(parseJson(text));
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}
