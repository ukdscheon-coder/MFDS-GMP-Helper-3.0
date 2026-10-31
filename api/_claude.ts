// Shared helper for calling the Anthropic Messages API from Vercel serverless functions.
export const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';

export async function callClaude(system: string, user: string, maxTokens = 8000): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
  });
  if (!r.ok) throw new Error(`Anthropic API ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j = (await r.json()) as { content: { type: string; text?: string }[] };
  return j.content.filter((c) => c.type === 'text').map((c) => c.text).join('');
}

export function parseJson<T>(s: string): T {
  const start = s.search(/[[{]/);
  const end = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'));
  return JSON.parse(s.slice(start, end + 1)) as T;
}
