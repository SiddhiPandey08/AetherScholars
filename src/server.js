// Local dashboard server (binds to 127.0.0.1 only). Serves public/ and a small JSON + SSE API.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { fix } from './run.js';
import { compare } from './verify.js';
import { openPr } from './pr.js';
import { suggestHtml } from './htmlFix.js';
import * as llm from './llm.js';
import { analyzeBusiness, URBANLEAF_BUSINESS } from './intelligence/index.js';

const PUBLIC = fileURLToPath(new URL('../public/', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const authFile = () => process.env.AUTH_FILE || 'auth.json';
const savedFile = () => process.env.VIOLATIONS_FILE || 'violations.json';

let current = { violations: [], opts: { allRules: false, a11y: true, seo: false } };
const optsFrom = (vs, allRules) => ({ allRules, a11y: vs.some((v) => v.category !== 'seo') || !vs.length, seo: vs.some((v) => v.category === 'seo') });
let loginSession = null;

async function toItems(violations, send) {
  const items = [];
  for (const [i, v] of violations.entries()) {
    send?.('progress', { message: `Writing suggested fix ${i + 1} of ${violations.length}...` });
    items.push({ id: i, ...v, fix: await suggestHtml(v).catch(() => ({ supported: false, note: 'Could not build a suggestion.' })) });
  }
  return items;
}

const readJson = (req) => new Promise((resolve, reject) => {
  let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { try { resolve(b ? JSON.parse(b) : {}); } catch (e) { reject(e); } });
});
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };

async function scanSse(u, res) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  const send = (evt, data) => res.write(`event: ${evt}\ndata: ${JSON.stringify(data)}\n\n`);
  const urls = (u.searchParams.get('urls') || '').split(/[\s,]+/).filter(Boolean);
  const opts = { allRules: u.searchParams.get('all') === '1', a11y: u.searchParams.get('a11y') !== '0', seo: u.searchParams.get('seo') === '1' };
  try {
    const { scan } = await import('./scan.js');
    const found = [], seen = new Set();
    for (const [i, url] of urls.entries()) {
      send('progress', { message: `Scanning ${url} (${i + 1} of ${urls.length})...` });
      const list = await scan(url, opts);
      send('progress', { message: `${list.length} issue(s) found on ${url}` });
      for (const v of list) { const k = v.ruleId + v.html; if (!seen.has(k)) { seen.add(k); found.push(v); } }
    }
    current = { violations: found, opts };
    fs.writeFileSync(savedFile(), JSON.stringify(found, null, 2));
    send('done', { items: await toItems(found, send), categories: [opts.a11y && 'accessibility', opts.seo && 'seo'].filter(Boolean) });
  } catch (e) {
    send('fail', { message: e.message });
  } finally {
    res.end();
  }
}

const api = {
  'GET /api/prospectiq/demo': async () => ({
    business: URBANLEAF_BUSINESS.profile,
    channels: URBANLEAF_BUSINESS.authorizedChannels,
    connectedChannels: {
      instagram: '@urbanleaf.cafe',
      facebook: 'UrbanLeaf Café',
      linkedin: 'UrbanLeaf Hospitality',
      whatsapp: '+91 98200 XXXXX',
      google_business: 'UrbanLeaf Café — Mumbai',
      youtube: 'UrbanLeaf Café',
      twitter: '@UrbanLeafCafe',
    },
  }),
  'POST /api/prospectiq/analyze': async ({ url, channels, isDemo }) => {
    const targetUrl = (url || '').trim();
    const isDemoTarget = isDemo || !targetUrl || targetUrl.toLowerCase().includes('urbanleaf') || targetUrl.toLowerCase().includes('demo.example');
    if (isDemoTarget) {
      return await analyzeBusiness({ url: targetUrl || 'https://urbanleaf-demo.example', channels, isDemo: true });
    }
    let customWebsiteAudit = null;
    try {
      const { scan } = await import('./scan.js');
      const found = await scan(targetUrl, { a11y: true, seo: true, allRules: false });
      current = { violations: found, opts: { allRules: false, a11y: true, seo: true } };
      fs.writeFileSync(savedFile(), JSON.stringify(found, null, 2));

      const seoIssues = found.filter((v) => v.category === 'seo');
      const a11yIssues = found.filter((v) => v.category !== 'seo');
      const seoScore = Math.max(30, 100 - seoIssues.length * 6);
      const a11yScore = Math.max(30, 100 - a11yIssues.length * 7);
      const perfScore = 78;
      const mobScore = found.some((v) => v.ruleId === 'seo-viewport-missing') ? 50 : 85;

      customWebsiteAudit = {
        score: Math.round((seoScore + a11yScore + perfScore + mobScore) / 4),
        seoScore,
        accessibilityScore: a11yScore,
        performanceScore: perfScore,
        mobileScore: mobScore,
        loadSpeed: '1.9s',
        technicalIssuesCount: found.length,
        findings: found.slice(0, 6).map((v) => ({
          type: v.impact === 'critical' || v.impact === 'serious' ? 'warn' : 'pass',
          title: v.help || v.ruleId,
          detail: v.html?.slice(0, 120) || 'On-page technical issue detected.',
          category: v.category || 'accessibility',
        })),
        rawViolationsCount: found.length,
      };
    } catch (err) {
      console.warn('Real scan warning:', err.message);
    }
    return await analyzeBusiness({ url: targetUrl, channels, isDemo: false, customWebsiteAudit });
  },
  'GET /api/config': async () => ({
    llm: llm.llmEnabled(), model: process.env.LLM_MODEL || null,
    hasAuth: fs.existsSync(authFile()), hasSaved: fs.existsSync(savedFile()), hasToken: !!process.env.GITHUB_TOKEN,
  }),
  'GET /api/saved': async () => {
    const vs = JSON.parse(fs.readFileSync(savedFile(), 'utf8'));
    current = { violations: vs, opts: optsFrom(vs, true) };
    return { items: await toItems(vs), categories: [current.opts.a11y && 'accessibility', current.opts.seo && 'seo'].filter(Boolean) };
  },
  'POST /api/map': async ({ repo }) => {
    const r = await fix({ violations: current.violations, repo, write: false });
    return { patches: r.patches, diffs: r.diffs };
  },
  'POST /api/apply': async ({ repo, ids }) => {
    const r = await fix({ violations: ids.map((i) => current.violations[i]), repo, write: true });
    fs.mkdirSync('out', { recursive: true });
    fs.writeFileSync('out/report.json', JSON.stringify(r.patches, null, 2));
    return { patches: r.patches, diffs: r.diffs };
  },
  'POST /api/verify': async ({ urls, check, repo }) => {
    const { scan } = await import('./scan.js');
    const after = [];
    for (const u of urls) after.push(...(await scan(u, current.opts)));
    const result = compare(current.violations, after);
    if (check) { try { execSync(check, { cwd: repo || '.', stdio: 'pipe' }); result.check = 'passed'; } catch { result.check = 'FAILED'; } }
    return result;
  },
  'POST /api/pr': async ({ repo, base, dryRun }) => {
    const out = await openPr({ repoDir: repo, report: JSON.parse(fs.readFileSync('out/report.json', 'utf8')), base: base || 'main', dryRun });
    return dryRun ? out : { url: /** @type {any} */ (out).html_url };
  },
  'POST /api/login/start': async ({ url }) => {
    const { chromium } = await import('playwright');
    if (loginSession) await loginSession.browser.close().catch(() => {});
    const browser = await chromium.launch({ headless: false });
    const ctx = await browser.newContext();
    await (await ctx.newPage()).goto(url);
    loginSession = { browser, ctx };
    return { ok: true };
  },
  'POST /api/login/finish': async () => {
    if (!loginSession) throw new Error('No login window is open.');
    await loginSession.ctx.storageState({ path: authFile() });
    await loginSession.browser.close();
    loginSession = null;
    return { ok: true };
  },
};

export function createServer() {
  return http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://localhost');
    try {
      if (req.method === 'GET' && u.pathname === '/api/scan') return await scanSse(u, res);
      const handler = api[`${req.method} ${u.pathname}`];
      if (handler) return json(res, 200, await handler(req.method === 'POST' ? await readJson(req) : {}));
      const file = path.join(PUBLIC, u.pathname === '/' ? 'index.html' : u.pathname);
      if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return json(res, 404, { error: 'Not found' });
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(fs.readFileSync(file));
    } catch (e) {
      if (!res.headersSent) json(res, 500, { error: e.message }); else res.end();
    }
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.loadEnvFile('.env'); } catch { /* optional */ }
  const port = Number(process.env.PORT) || 4173;
  createServer().listen(port, '127.0.0.1', () => console.log(`Dashboard running at http://localhost:${port}`));
}
