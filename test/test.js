// Offline end-to-end test: axe-core (via jsdom) -> mapper -> fixer. Also tests the LLM client against a local mock server.
import fs from 'node:fs';
import http from 'node:http';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import axe from 'axe-core';
import { fix } from '../src/run.js';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { RULES } from '../src/scan.js';
import { compare } from '../src/verify.js';
import { buildBody, commitAndPush } from '../src/pr.js';
import { createServer } from '../src/server.js';
import { buildFindings } from '../src/seo.js';
import { suggestHtml } from '../src/htmlFix.js';

fs.rmSync('.cache', { recursive: true, force: true }); // keep the mock-server check independent of cached answers
const html = fs.readFileSync('test/fixture/rendered.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'outside-only' });
dom.window.eval(axe.source);
const res = await dom.window.axe.run(dom.window.document, { runOnly: { type: 'rule', values: RULES } });
const violations = res.violations.flatMap((v) => v.nodes.map((n) => ({
  ruleId: v.id, wcag: v.tags.filter((x) => /^wcag\d/.test(x)), html: n.html, target: n.target,
  src: dom.window.document.querySelector(n.target[0])?.getAttribute('src') || null, context: '',
})));
console.log(`axe found ${violations.length} violations:`, violations.map((v) => v.ruleId).join(', '));
assert.equal(violations.length, 8);

// 1) Rule-only mode
delete process.env.LLM_BASE_URL;
let out = await fix({ violations, repo: 'test/fixture' });
console.table(out.patches.map((p) => ({ rule: p.ruleId, status: p.status, line: p.line, change: p.change })));
assert.equal(out.patches.filter((p) => p.status === 'proposed').length, 5);
assert.equal(out.patches.filter((p) => p.status === 'covered').length, 0);
const d = out.diffs.join('');
for (const s of ['alt="Hero library"', 'aria-label="Email"', 'aria-label="Trash"', 'aria-label="Profile"', 'aria-label={`Go to slide ${i + 1}`}']) assert.ok(d.includes(s), `missing ${s}`);
assert.ok(d.includes('(it, index)') || d.includes('(s, i)'), 'expected mapped carousel loop variable update');
const mappedWithConfidence = out.patches.filter((p) => p.status === 'proposed');
assert.ok(mappedWithConfidence.every((p) => typeof p.mapping?.confidence === 'number' && p.mapping.confidence >= 0 && p.mapping.confidence <= 1));
assert.ok(mappedWithConfidence.every((p) => ['HIGH', 'MEDIUM', 'LOW'].includes(p.mapping.classification)));
assert.ok(out.patches.filter((p) => ['image-alt', 'button-name', 'link-name', 'label'].includes(p.ruleId))
  .every((p) => p.rootCause && p.recommendation), 'missing deterministic root-cause text');
console.log(d);

// 2) AI mode against a mock OpenAI-compatible server (checks image is sent as a data URL)
let sawImage = false;
const srv = http.createServer((req, rsp) => {
  let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
    const body = JSON.parse(b);
    if (JSON.stringify(body).includes('data:image')) sawImage = true;
    rsp.setHeader('Content-Type', 'application/json');
    rsp.end(JSON.stringify({ choices: [{ message: { content: '{"alt":"Students reading in a sunlit library","decorative":false}' } }] }));
  });
}).listen(0);
process.env.LLM_BASE_URL = `http://127.0.0.1:${srv.address().port}/v1`;
process.env.LLM_MODEL = 'mock-vl';
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
out = await fix({ violations: violations.map((v) => (v.ruleId === 'image-alt' ? { ...v, src: png } : v)), repo: 'test/fixture' });
srv.close();
assert.ok(sawImage);
assert.ok(out.diffs.join('').includes('alt="Students reading in a sunlit library"'));

// 3) Honest "not in source" for an element that matches nothing in the repo
delete process.env.LLM_BASE_URL;
const vendor = { ruleId: 'button-name', wcag: [], html: '<button class="vendor__x"></button>', target: [], src: null, context: '' };
const r3 = await fix({ violations: [...violations, vendor], repo: 'test/fixture' });
assert.equal(r3.patches.filter((p) => p.status === 'not-in-source').length, 1);
const lowConfidence = await fix({ violations: [{ ruleId: 'button-name', wcag: [], html: '<button></button>', target: [], src: null, context: '' }], repo: 'test/fixture' });
assert.ok(['ambiguous', 'not-in-source'].includes(lowConfidence.patches[0].status));
assert.equal(lowConfidence.patches[0].fixStatus, 'UNRESOLVED');

// 4) Verification comparison
const c1 = compare([{ ruleId: 'a', html: '1' }, { ruleId: 'a', html: '2' }], [{ ruleId: 'a', html: '2' }, { ruleId: 'b', html: '3' }]);
assert.equal(c1.before, 2);
assert.equal(c1.after, 2);
assert.equal(c1.resolved, 1);
assert.equal(c1.remaining, 1);
assert.equal(c1.introduced, 1);
assert.ok(c1.summary && c1.details);
assert.equal(c1.summary.success, false);
assert.ok(c1.details.regressions.some((r) => r.ruleId === 'b' && r.status === 'REGRESSION'));

// 4b) Medium confidence is suggestion-only in non-reviewed write mode
const tmpMedium = fs.mkdtempSync(path.join(os.tmpdir(), 'a11y-mid-'));
fs.cpSync('test/fixture', tmpMedium, { recursive: true });
const beforeMedium = fs.readFileSync(path.join(tmpMedium, 'src/pages/index.jsx'), 'utf8');
const mediumOnly = [{ ruleId: 'button-name', wcag: [], html: '<button class="btn-delete"><svg></svg></button>', target: [], src: null, context: 'delete profile' }];
const mediumRun = await fix({ violations: mediumOnly, repo: tmpMedium, write: true, reviewed: false });
assert.equal(mediumRun.patches[0].fixStatus, mediumRun.patches[0].mapping.classification === 'MEDIUM' ? 'REVIEW REQUIRED' : mediumRun.patches[0].fixStatus);
const afterMedium = fs.readFileSync(path.join(tmpMedium, 'src/pages/index.jsx'), 'utf8');
if (mediumRun.patches[0].mapping.classification === 'MEDIUM') assert.equal(afterMedium, beforeMedium, 'MEDIUM mapping should not auto-write without explicit review');
fs.rmSync(tmpMedium, { recursive: true, force: true });

// 5) Branch + commit + push to a local bare remote, and PR body
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'a11y-'));
const remote = path.join(tmp, 'remote.git'), work = path.join(tmp, 'work');
const g = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8' });
execFileSync('git', ['init', '--bare', '-b', 'main', remote]);
fs.cpSync('test/fixture', work, { recursive: true });
g(work, 'init', '-b', 'main'); g(work, 'config', 'user.email', 't@t'); g(work, 'config', 'user.name', 't');
g(work, 'add', '.'); g(work, 'commit', '-m', 'init'); g(work, 'remote', 'add', 'origin', remote); g(work, 'push', '-u', 'origin', 'main');
const r5 = await fix({ violations, repo: work, write: true });
commitAndPush({ repoDir: work, report: r5.patches, branch: 'a11y/test' });
assert.ok(g(work, 'branch', '-a').includes('a11y/test'));
assert.ok(buildBody(r5.patches).includes('| Location |'));
fs.rmSync(tmp, { recursive: true, force: true });

// 6) Dashboard API end to end (scan itself needs a real browser, so it is only checked for a clean failure)
const t2 = fs.mkdtempSync(path.join(os.tmpdir(), 'a11y-dash-'));
process.env.VIOLATIONS_FILE = path.join(t2, 'v.json');
fs.writeFileSync(process.env.VIOLATIONS_FILE, JSON.stringify(violations));
const copy = path.join(t2, 'repo');
fs.cpSync('test/fixture', copy, { recursive: true });
const app = createServer().listen(0, '127.0.0.1');
await new Promise((r) => app.once('listening', r));
const base = `http://127.0.0.1:${app.address().port}`;
const get = async (u) => (await fetch(base + u)).json();
const post = async (u, b) => (await fetch(base + u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) })).json();
assert.ok((await (await fetch(base + '/')).text()).includes('Auto-Patcher'));
assert.equal((await fetch(base + '/%2e%2e/package.json')).status, 404);
assert.equal((await get('/api/config')).hasSaved, true);
const saved = await get('/api/saved');
assert.equal(saved.items.length, 8);
const alt = saved.items.find((i) => i.ruleId === 'image-alt');
assert.ok(alt.fix.supported && alt.fix.after.includes('alt="'));
const mapped = await post('/api/map', { repo: 'test/fixture' });
assert.equal(mapped.patches.filter((p) => p.status === 'proposed').length, 5);
assert.ok(mapped.patches.filter((p) => p.status === 'proposed').every((p) => typeof p.mapping?.confidence === 'number'));
assert.ok(mapped.patches.some((p) => p.rootCause));
assert.ok(mapped.patches.some((p) => p.status === 'proposed' && typeof p.sourceDiff === 'string' && p.sourceDiff.includes('@@')));
const ids = saved.items.filter((i) => i.fix.supported).map((i) => i.id);
const applied = await post('/api/apply', { repo: copy, ids });
assert.ok(applied.diffs.join('').includes('aria-label'));
assert.ok(fs.readFileSync(path.join(copy, 'src/pages/index.jsx'), 'utf8').includes('aria-label="Email"'));
assert.ok((await post('/api/pr', { repo: copy, dryRun: true })).body.includes('| Location |'));
const sse = await (await fetch(base + '/api/scan?urls=' + encodeURIComponent('http://127.0.0.1:1/'))).text();
assert.ok(sse.includes('event: fail'));
// 7) Dashboard page smoke test in a simulated browser
const dash = await JSDOM.fromURL(base + '/', { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
  beforeParse(w) { w.fetch = (u, o) => fetch(new URL(u, base), o); } });
const doc = dash.window.document;
const until = async (f) => { for (let i = 0; i < 100 && !f(); i++) await new Promise((r) => setTimeout(r, 50)); assert.ok(f(), 'timed out'); };
await until(() => doc.querySelector('#status').innerHTML.includes('chip'));
doc.querySelector('#saved').click();
await until(() => doc.querySelectorAll('#list article').length === 8);
doc.querySelector('button[data-a="approved"]:not([disabled])').click();
assert.ok(doc.querySelector('button[aria-pressed="true"]'));
assert.ok(doc.querySelector('#summary').textContent.includes('Approved'));
dash.window.close();
app.close();
fs.rmSync(t2, { recursive: true, force: true });
fs.rmSync('out', { recursive: true, force: true });

// 8) SEO: findings from page data, suggestions, and a Next.js <Head> patch
const page = { title: '', titleEl: false, desc: '', viewport: '', canonical: '', robots: '', h1s: ['About the library'], og: {}, jsonld: 0, lang: 'en',
  para: 'Borrow books, join reading circles, and use free study rooms across the city.', img: 'https://x.test/hero.jpg', text: 'About the library Borrow books', generic: [] };
const seo = buildFindings({ url: 'https://x.test/about', d: page, xrobots: '', site: { robots: false, sitemap: false } });
const seoIds = seo.map((x) => x.ruleId);
for (const id of ['seo-title-missing', 'seo-description-missing', 'seo-viewport-missing', 'seo-canonical-missing', 'seo-open-graph-missing', 'seo-structured-data-missing', 'seo-robots-txt-missing', 'seo-sitemap-missing'])
  assert.ok(seoIds.includes(id), `missing finding ${id}`);
assert.ok(!seoIds.includes('seo-h1-missing'));
const tSug = await suggestHtml(seo.find((x) => x.ruleId === 'seo-title-missing'));
assert.ok(tSug.supported && tSug.after.startsWith('<title>About the library | x.test'));
assert.equal((await suggestHtml(seo.find((x) => x.ruleId === 'seo-sitemap-missing'))).supported, false);
const seoRun = await fix({ violations: seo, repo: 'test/fixture' });
const seoDiff = seoRun.diffs.join('');
assert.equal(seoRun.patches.filter((p) => p.status === 'proposed').length, 5);   // title, description, viewport, canonical, og (robots.txt is a new file, not a code patch)
assert.ok(seoDiff.includes("import Head from 'next/head'") && seoDiff.includes('<title>') && seoDiff.includes('name="description"') && seoDiff.includes('rel="canonical"'));
assert.equal((seoDiff.match(/<Head>/g) || []).length, 1);
console.log(seoDiff);
console.log('All tests passed');
