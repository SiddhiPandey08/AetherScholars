// Delivery: commit the patched files on a new branch, push, and open a pull request. A human merges it.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
const proposed = (report) => report.filter((p) => p.status === 'proposed');

export function buildBody(report) {
  const p = proposed(report);
  const rows = p.map((x) =>
    `| \`${x.file}:${x.line}\` | ${x.ruleId} (${(x.wcag || []).join(', ')}) | ${x.change} | ${x.source === 'ai' ? 'AI' : 'Rule'}${x.needsReview ? ' (check wording)' : ''} |`);
  return [
    `## Accessibility fixes (${p.length})`, '',
    'Proposed by the Accessibility Auto-Patcher. Please review every change before merging.', '',
    '| Location | Issue | Change | Source |', '| --- | --- | --- | --- |', ...rows, '',
    'Rule = deterministic fix. AI = suggested by a vision/language model; please double-check the wording.',
  ].join('\n');
}

export function commitAndPush({ repoDir, report, branch, push = true }) {
  const dir = path.resolve(repoDir);
  const files = [...new Set(proposed(report).map((p) => path.join(dir, p.file)))];
  if (!files.length) throw new Error('No proposed fixes in the report');
  git(dir, 'checkout', '-b', branch);
  git(dir, 'add', '--', ...files);
  git(dir, 'commit', '-m', `a11y: fix ${proposed(report).length} accessibility issues`);
  if (push) git(dir, 'push', '-u', 'origin', branch);
  return dir;
}

function parseRemote(url) {
  const m = url.match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (!m) throw new Error(`Cannot read a GitHub owner/repo from remote: ${url}`);
  return { owner: m[1], name: m[2] };
}

export async function openPr({ repoDir, report, base = 'main', dryRun = false }) {
  const n = proposed(report).length;
  const title = `a11y: fix ${n} accessibility issue${n === 1 ? '' : 's'}`;
  const body = buildBody(report);
  if (dryRun) { console.log(`${title}\n\n${body}`); return { title, body }; }
  if (!process.env.GITHUB_TOKEN) throw new Error('Set GITHUB_TOKEN (fine-grained token: Contents and Pull requests write access).');
  const branch = `a11y/auto-fixes-${new Date().toISOString().slice(0, 10)}`;
  const dir = commitAndPush({ repoDir, report, branch });
  const { owner, name } = parseRemote(git(dir, 'remote', 'get-url', 'origin'));
  const { Octokit } = await import('@octokit/rest');
  const res = await new Octokit({ auth: process.env.GITHUB_TOKEN }).pulls.create({ owner, repo: name, head: branch, base, title, body });
  console.log(`Opened pull request: ${res.data.html_url}`);
  return res.data;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : null; };
  const repoDir = arg('repo');
  if (!repoDir) { console.error('Usage: node src/pr.js --repo <frontend dir> [--base main] [--dry-run]  (after run.js --write)'); process.exit(1); }
  await openPr({ repoDir, report: JSON.parse(fs.readFileSync('out/report.json', 'utf8')), base: arg('base') || 'main', dryRun: process.argv.includes('--dry-run') });
}
