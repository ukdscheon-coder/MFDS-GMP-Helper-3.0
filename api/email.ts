import type { VercelRequest, VercelResponse } from '@vercel/node';

// Sends the generated report as an attachment via Resend (https://resend.com). Needs RESEND_API_KEY and EMAIL_FROM.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return res.status(501).json({ error: 'Email sending is not configured (RESEND_API_KEY, EMAIL_FROM).' });
  try {
    const { to, subject, text, filename, contentBase64 } = req.body as { to: string; subject: string; text: string; filename: string; contentBase64: string };
    const list = String(to || '').split(/[,;\s]+/).filter((s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)).slice(0, 10);
    if (!list.length) return res.status(400).json({ error: 'No valid recipient' });
    if ((contentBase64 || '').length > 14_000_000) return res.status(413).json({ error: 'Attachment too large' });
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to: list, subject: String(subject).slice(0, 200), text: String(text).slice(0, 5000), attachments: [{ filename, content: contentBase64 }] }),
    });
    if (!r.ok) return res.status(502).json({ error: (await r.text()).slice(0, 300) });
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}
