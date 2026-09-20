// Minimal OpenAI-compatible client (works with Qwen-VL served via vLLM/Ollama/etc.).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const llmEnabled = () => !!(process.env.LLM_BASE_URL && process.env.LLM_MODEL);
const CACHE = path.resolve('.cache/llm.json');
const readCache = () => (fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {});

// Responses are cached on disk so a slow or unreachable server cannot break the demo.
async function chat(content) {
  const key = crypto.createHash('sha1').update(process.env.LLM_MODEL + JSON.stringify(content)).digest('hex');
  const cache = readCache();
  if (cache[key]) return cache[key];
  const res = await fetch(`${process.env.LLM_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.LLM_API_KEY ? { Authorization: `Bearer ${process.env.LLM_API_KEY}` } : {}),
    },
    body: JSON.stringify({ model: process.env.LLM_MODEL, temperature: 0.2, messages: [{ role: 'user', content }] }),
  });
  if (!res.ok) throw new Error(`LLM request failed: ${res.status}`);
  const text = (await res.json()).choices[0].message.content;
  cache[key] = text;
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1));
  return text;
}

const parseJson = (t) => {
  try { return JSON.parse(t.match(/\{[\s\S]*\}/)[0]); } catch { return null; }
};

async function toDataUrl(src) {
  if (src.startsWith('data:')) return src;
  const r = await fetch(src);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > 4e6) throw new Error('image too large');
  return `data:${r.headers.get('content-type') || 'image/jpeg'};base64,${buf.toString('base64')}`;
}

// Vision step: alt text for an image. Returns { alt, decorative } or null.
export async function describeImage({ src, context = '' }) {
  const prompt =
    'You write alt text for web images following WCAG. ' +
    `Nearby page text: "${context.slice(0, 200)}". ` +
    'Reply ONLY with JSON: {"alt": "<max 125 chars, no \'image of\'>", "decorative": <true|false>}. ' +
    'If the image is purely decorative or repeats nearby text, set decorative true and alt "".';
  const out = await chat([
    { type: 'text', text: prompt },
    { type: 'image_url', image_url: { url: await toDataUrl(src) } },
  ]);
  return parseJson(out);
}

// Text step: accessible name for a button, link, or form field. Returns { label } or null.
export async function suggestLabel({ html, context = '', kind }) {
  const out = await chat(
    `Suggest a concise accessible name (1 to 4 words) for this ${kind}. HTML: ${html.slice(0, 400)}. ` +
      `Nearby text: "${context.slice(0, 200)}". Reply ONLY with JSON: {"label": "..."}`
  );
  return parseJson(out);
}
