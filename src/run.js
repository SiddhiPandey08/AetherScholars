// Orchestrator: violations -> map to source -> fix -> diffs (dry run unless --write).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTwoFilesPatch } from 'diff';
import { Project } from './mapSource.js';
import { applyFix } from './fixes.js';
import { applySeoFix } from './seoSource.js';
import { explainRootCause } from './rootCause.js';

try { process.loadEnvFile('.env'); } catch { /* no .env: rule-only mode */ }

const hunkForLine = (diffText, line) => {
  if (!line || !diffText) return null;
  const lines = diffText.split('\n');
  let cur = null;
  for (let i = 0; i < lines.length; i++) {
    const m = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(lines[i]);
    if (m) {
      const start = Number(m[1]);
      const len = Number(m[2] || 1);
      cur = { start, end: start + Math.max(0, len - 1), at: i };
    }
    if (cur && line >= cur.start && line <= cur.end) {
      const out = [];
      for (let j = cur.at; j < lines.length; j++) {
        if (j !== cur.at && lines[j].startsWith('@@ ')) break;
        out.push(lines[j]);
      }
      return out.join('\n');
    }
  }
  return null;
};

const fixStatusOf = (status, confidenceClass, shouldApply) => {
  if (status !== 'proposed') return status === 'ambiguous' || status === 'not-in-source' ? 'UNRESOLVED' : 'UNRESOLVED';
  if (confidenceClass === 'HIGH') return shouldApply ? 'FIXED' : 'PROPOSED';
  if (confidenceClass === 'MEDIUM') return shouldApply ? 'FIXED' : 'REVIEW REQUIRED';
  return 'UNRESOLVED';
};

export async function fix({ violations, repo, write = false, reviewed = false }) {
  const project = new Project(repo);
  const patches = [], seen = new Set();
  for (const v of violations) {
    const base = { ruleId: v.ruleId, category: v.category || 'accessibility', wcag: v.wcag, html: v.html };
    const genericRoot = explainRootCause(v, { confidenceScore: 0 });
    if (v.category === 'seo') {
      const s = await applySeoFix(project, v);
      patches.push(s.skipped ? { ...base, status: 'skipped', reason: s.reason } : { ...base, status: 'proposed', ...s });
      continue;
    }
    const hit = project.find(v);
    if (!hit.best || hit.confidence === 'none') {
      patches.push({
        ...base,
        status: 'not-in-source',
        reason: 'No element in your code matches (likely a third-party component or generated at runtime)',
        mapping: { confidence: 0, classification: 'LOW' },
        rootCause: genericRoot?.explanation,
        recommendation: genericRoot?.recommendation,
        explanationConfidence: genericRoot?.confidence,
        fixStatus: 'UNRESOLVED',
      });
      continue;
    }
    if (hit.confidenceClass === 'LOW') {
      patches.push({
        ...base,
        status: 'ambiguous',
        candidates: hit.candidates,
        mapping: { confidence: hit.confidenceScore, classification: hit.confidenceClass },
        reason: 'Mapping confidence too low for a safe automated source update',
        rootCause: genericRoot?.explanation,
        recommendation: genericRoot?.recommendation,
        explanationConfidence: genericRoot?.confidence,
        fixStatus: 'UNRESOLVED',
      });
      continue;
    }
    if (seen.has(hit.best.node)) { patches.push({ ...base, status: 'covered', reason: 'same element as an earlier fix' }); continue; }
    seen.add(hit.best.node);
    const shouldApply = hit.confidenceClass === 'HIGH' || (hit.confidenceClass === 'MEDIUM' && reviewed);
    const r = await applyFix(hit.best, v);
    if (r.skipped) {
      patches.push({
        ...base,
        status: 'skipped',
        reason: r.reason,
        mapping: { confidence: hit.confidenceScore, classification: hit.confidenceClass },
        rootCause: genericRoot?.explanation,
        recommendation: genericRoot?.recommendation,
        explanationConfidence: genericRoot?.confidence,
        fixStatus: 'UNRESOLVED',
      });
      continue;
    }
    if (shouldApply || !write) hit.best.f.dirty = true;
    const root = explainRootCause(v, hit);
    patches.push({
      ...base, status: 'proposed', ...r, confidence: hit.confidence,
      mapping: { confidence: hit.confidenceScore, classification: hit.confidenceClass },
      rootCause: root?.explanation,
      recommendation: root?.recommendation,
      explanationConfidence: root?.confidence,
      file: path.relative(repo, hit.best.f.file), line: hit.best.line,
      fixStatus: fixStatusOf('proposed', hit.confidenceClass, shouldApply),
    });
  }
  const changed = project.changed();
  const diffs = changed.map((f) => createTwoFilesPatch(path.relative(repo, f.file), path.relative(repo, f.file), f.code, f.after));
  const diffMap = new Map(changed.map((f, i) => [path.relative(repo, f.file), diffs[i]]));
  for (const p of patches) {
    if (p.status !== 'proposed' || !p.file || !p.line) continue;
    p.sourceDiff = hunkForLine(diffMap.get(p.file), p.line);
  }
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
