// Smoke test of the static demo (docs/) in a simulated browser, served from a sub-folder like GitHub Pages.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { JSDOM } from 'jsdom';

execFileSync('node', ['scripts/build-demo.js']);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((req, res) => {
  const rel = req.url.replace(/^\/repo\//, '').replace(/^$/, 'index.html') || 'index.html';
  const f = path.join('docs', rel === '' || rel === '/' ? 'index.html' : rel);
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'text/plain' }); res.end(fs.readFileSync(f));
}).listen(0);
await new Promise((r) => srv.once('listening', r));

const dom = await JSDOM.fromURL(`http://127.0.0.1:${srv.address().port}/repo/index.html`, {
  runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
  beforeParse(w) { w.Response = Response; w.confirm = () => true; },
});
const doc = dom.window.document;
const until = async (f) => { for (let i = 0; i < 120 && !f(); i++) await new Promise((r) => setTimeout(r, 50)); assert.ok(f(), 'timed out'); };
assert.ok(doc.querySelector('.demo-banner'));
await until(() => doc.querySelector('#status').innerHTML.includes('chip'));
doc.querySelector('#urls').value = 'https://anything.example/';
doc.querySelector('#scan').click();
await until(() => doc.querySelectorAll('#list article').length === 8);
doc.querySelector('#approveAll').click();
doc.querySelector('#repo').value = 'C:/demo/frontend';
doc.querySelector('#map').click();
await until(() => doc.querySelector('#mapSummary').textContent.includes('matched'));
doc.querySelector('#apply').click();
await until(() => doc.querySelector('#diff').textContent.includes('alt='));
doc.querySelector('#verify').click();
await until(() => doc.querySelector('#verifyOut').textContent.includes('Resolved'));
doc.querySelector('#prPreview').click();
await until(() => doc.querySelector('#prText').textContent.includes('a11y: fix'));
dom.window.close(); srv.close();
console.log('Demo test passed');
