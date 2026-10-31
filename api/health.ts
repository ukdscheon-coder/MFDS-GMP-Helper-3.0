import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MODEL } from './_claude.js';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ ai: Boolean(process.env.ANTHROPIC_API_KEY), model: MODEL, email: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM) });
}
