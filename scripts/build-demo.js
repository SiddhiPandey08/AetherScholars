// Builds docs/ (static demo for GitHub Pages) from public/ + demo/demo.js.
import fs from 'node:fs';

fs.mkdirSync('docs', { recursive: true });
let html = fs.readFileSync('public/index.html', 'utf8')
  .replace('href="/style.css"', 'href="style.css"')
  .replace('<script src="/app.js"></script>', '<script src="demo.js"></script>\n<script src="app.js"></script>')
  .replace('<header class="top">', '<div class="demo-banner" role="note"><strong>Demo mode.</strong> This page uses sample data. Nothing is scanned, saved, or changed. The real tool runs on your own computer.</div>\n<header class="top">')
  .replace('placeholder="https://example.gov.in/"', 'placeholder="Any address works in this demo"');
fs.writeFileSync('docs/index.html', html);
fs.writeFileSync('docs/style.css', fs.readFileSync('public/style.css', 'utf8') +
  '\n.demo-banner{background:var(--warnbg);color:var(--warn);padding:10px 16px;text-align:center;font-size:14px;border-bottom:1px solid var(--border)}\n');
fs.copyFileSync('public/app.js', 'docs/app.js');
fs.copyFileSync('demo/demo.js', 'docs/demo.js');
fs.writeFileSync('docs/.nojekyll', '');
console.log('Built docs/');
