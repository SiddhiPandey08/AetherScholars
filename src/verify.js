// Verification: re-scan after patching and compare with the "before" scan; optionally run a project check (lint/build/tests).
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const key = (v) => `${v.ruleId}|${v.html}`;

// Fixed problems disappear from the new scan; untouched ones stay; anything new is a regression.
export function compare(before, after) {
  const b = new Set(before.map(key)), a = new Set(after.map(key));
  return {
    before: b.size,
    resolved: [...b].filter((k) => !a.has(k)).length,
    remaining: [...b].filter((k) => a.has(k)).length,
    introduced: [...a].filter((k) => !b.has(k)).length,
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
  fs.mkdirSync('out', { recursive: true });
  fs.writeFileSync('out/verify.json', JSON.stringify(result, null, 2));
  console.table([result]);
  if (result.introduced || result.check === 'FAILED') console.log('Do not open a pull request yet: something new appeared or the check failed.');
}
