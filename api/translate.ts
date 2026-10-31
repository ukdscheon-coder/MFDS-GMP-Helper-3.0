import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callClaude, parseJson } from './_claude.js';

const NAMES: Record<string, string> = { ko: 'Korean', en: 'English' };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const texts = (req.body?.texts || []) as string[];
    const target = NAMES[req.body?.target as string] || 'Korean';
    const system = `Translate each item into ${target}. These are titles of medical-device quality documents (SOPs, forms, records). Use standard Korean GMP / ISO 13485 terminology when translating into Korean. Keep document numbers, codes and proper nouns unchanged. Return JSON only: {"translations":["..."]} in the same order and count.`;
    const text = await callClaude(system, JSON.stringify(texts), 4000);
    res.status(200).json(parseJson(text));
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}
