// Verification: re-scan after patching and compare with the "before" scan; optionally run a project check (lint/build/tests).
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const key = (v) => `${v.ruleId}|${v.html}`;
const byRule = (list) => {
  const map = {};
  for (const v of list) map[v.ruleId] = (map[v.ruleId] || 0) + 1;
  return map;
};

// Fixed problems disappear from the new scan; untouched ones stay; anything new is a regression.
export function compare(before, after) {
  const b = new Set(before.map(key)), a = new Set(after.map(key));
  const beforeRules = byRule(before);
  const afterRules = byRule(after);
  const allRules = [...new Set([...Object.keys(beforeRules), ...Object.keys(afterRules)])];
  const remaining = [...b].filter((k) => a.has(k)).length;
  const introduced = [...a].filter((k) => !b.has(k)).length;
  const regressions = allRules
    .filter((r) => (beforeRules[r] || 0) === 0 && (afterRules[r] || 0) > 0)
    .map((r) => ({ ruleId: r, status: 'REGRESSION', before: 0, after: afterRules[r] }));
  const resolved = [...b].filter((k) => !a.has(k)).length;
  return {
    before: b.size,
    after: a.size,
    resolved,
    remaining,
    introduced,
    summary: {
      before: b.size,
      after: a.size,
      resolved,
      introduced,
      remaining,
      regressions: regressions.length,
      success: introduced === 0 && regressions.length === 0,
    },
    details: {
      before: { total: b.size, byRule: beforeRules },
      after: { total: a.size, byRule: afterRules },
      regressions,
      remaining: [...a].filter((k) => b.has(k)).map((k) => ({ key: k, status: 'UNRESOLVED' })),
      introduced: [...a].filter((k) => !b.has(k)).map((k) => ({ key: k, status: 'REGRESSION' })),
      resolved: [...b].filter((k) => !a.has(k)).map((k) => ({ key: k, status: 'FIXED' })),
    },
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { scan } = await import('./scan.js');
  const args = process.argv.slice(2), urls = [], opt = {};
  for (let i = 0; i < args.length; i++) args[i].startsWith('--') ? (opt[args[i].slice(2)] = args[++i]) : urls.push(args[i]);
  if (!opt.before || !urls.length) { console.error('Usage: node src/verify.js --before violations.json [--repo <dir> --check "npm run lint"] <url> [<url> ...]'); process.exit(1); }
  const before = JSON.parse(fs.readFileSync(opt.before, 'utf8'));
  const after = [];
  for (const u of urls) after.push(...(await scan(u)));
  const result = compare(before, after);
  if (opt.check) {
    try { execSync(opt.check, { cwd: opt.repo || '.', stdio: 'pipe' }); result.check = 'passed'; } catch { result.check = 'FAILED'; }
  }
  if (result.summary) {
    result.summary.check = result.check || null;
    result.summary.success = result.summary.success && result.check !== 'FAILED';
  }
  fs.mkdirSync('out', { recursive: true });
  fs.writeFileSync('out/verify.json', JSON.stringify(result, null, 2));
  console.table([{
    before: result.before,
    after: result.after,
    resolved: result.resolved,
    remaining: result.remaining,
    introduced: result.introduced,
    regressions: result.summary?.regressions || 0,
    check: result.check || '',
    success: result.summary?.success ? 'yes' : 'no',
  }]);
  if (result.introduced || result.check === 'FAILED' || result.summary?.regressions) {
    console.log('Do not open a pull request yet: regressions or failed checks were detected.');
  }
}
