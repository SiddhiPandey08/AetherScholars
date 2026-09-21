// Orchestrator: violations -> map to source -> fix -> diffs (dry run unless --write).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTwoFilesPatch } from 'diff';
import { Project } from './mapSource.js';
import { applyFix } from './fixes.js';
import { applySeoFix } from './seoSource.js';

try { process.loadEnvFile('.env'); } catch { /* no .env: rule-only mode */ }

export async function fix({ violations, repo, write = false }) {
  const project = new Project(repo);
  const patches = [], seen = new Set();
  for (const v of violations) {
    const base = { ruleId: v.ruleId, category: v.category || 'accessibility', wcag: v.wcag, html: v.html };
    if (v.category === 'seo') {
      const s = await applySeoFix(project, v);
      patches.push(s.skipped ? { ...base, status: 'skipped', reason: s.reason } : { ...base, status: 'proposed', ...s });
      continue;
    }
    const hit = project.find(v);
    if (!hit.best || hit.confidence === 'none') {
      patches.push({ ...base, status: 'not-in-source', reason: 'No element in your code matches (likely a third-party component or generated at runtime)' });
      continue;
    }
    if (hit.confidence === 'low') { patches.push({ ...base, status: 'ambiguous', candidates: hit.candidates }); continue; }
    if (seen.has(hit.best.node)) { patches.push({ ...base, status: 'covered', reason: 'same element as an earlier fix' }); continue; }
    seen.add(hit.best.node);
    const r = await applyFix(hit.best, v);
    if (r.skipped) { patches.push({ ...base, status: 'skipped', reason: r.reason }); continue; }
    hit.best.f.dirty = true;
    patches.push({
      ...base, status: 'proposed', ...r, confidence: hit.confidence,
      file: path.relative(repo, hit.best.f.file), line: hit.best.line,
    });
  }
  const changed = project.changed();
  const diffs = changed.map((f) => createTwoFilesPatch(path.relative(repo, f.file), path.relative(repo, f.file), f.code, f.after));
  if (write) changed.forEach((f) => fs.writeFileSync(f.file, f.after));
  return { patches, diffs };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : null; };
  const repo = arg('repo');
  if (!repo || !arg('from')) { console.error('Usage: node src/run.js --repo <frontend dir> --from violations.json [--write]'); process.exit(1); }
  const out = await fix({ violations: JSON.parse(fs.readFileSync(arg('from'), 'utf8')), repo, write: process.argv.includes('--write') });
  fs.mkdirSync('out', { recursive: true });
  fs.writeFileSync('out/report.json', JSON.stringify(out.patches, null, 2));
  fs.writeFileSync('out/patches.diff', out.diffs.join('\n'));
  console.table(out.patches.map((p) => ({ rule: p.ruleId, status: p.status, file: p.file, line: p.line, change: p.change || p.reason })));
  console.log('Wrote out/report.json and out/patches.diff');
}
