// Scanner: loads a page in a real browser and runs axe-core. Read-only.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { auditSeo } from './seo.js';

export const RULES = ['image-alt', 'button-name', 'link-name', 'label'];
// --all-rules: report every WCAG A/AA problem axe knows (only the four above have automatic fixes so far).
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const AUTH = process.env.AUTH_FILE || 'auth.json';

// Scans one page. If auth.json exists (made by src/login.js) the scan runs as a logged-in user.
export async function scan(url, { allRules = false, a11y = true, seo = false } = {}) {
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext(fs.existsSync(AUTH) ? { storageState: AUTH } : {});
    const page = await ctx.newPage();
    const response = await page.goto(url, { waitUntil: 'networkidle' });
    console.log(`  session: ${fs.existsSync(AUTH) ? 'logged in (auth.json)' : 'anonymous'}`);
    const landed = new URL(page.url()).pathname;
    if (landed !== new URL(url).pathname) console.warn(`  note: ended up on ${landed} (redirected). If you expected a logged-in page, run src/login.js again.`);
    const out = [];
    if (seo) out.push(...(await auditSeo(page, url, response)));
    if (!a11y) return out;
    const builder = new AxeBuilder({ page });
    const results = await (allRules ? builder.withTags(TAGS) : builder.withRules(RULES)).analyze();
    for (const v of results.violations) {
      for (const n of v.nodes) {
        const extra = await page
          .$eval(n.target[0], (el) => ({
            src: el.tagName === 'IMG' ? el.currentSrc : null,
            context: (el.closest('a,button,li,article,section,div')?.innerText || '').slice(0, 200),
          }))
          .catch(() => ({ src: null, context: '' }));
        out.push({
          ruleId: v.id, category: 'accessibility', impact: v.impact, wcag: v.tags.filter((t) => /^wcag\d/.test(t)),
          html: n.html, target: n.target, url, help: v.help, helpUrl: v.helpUrl, summary: n.failureSummary, ...extra,
        });
      }
    }
    return out;
  } finally {
    await browser.close();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const allRules = process.argv.includes('--all-rules');
  const seo = process.argv.includes('--seo') || process.argv.includes('--seo-only');
  const a11y = !process.argv.includes('--seo-only');
  const urls = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (!urls.length) { console.error('Usage: node src/scan.js <url> [<url> ...] [--all-rules] [--seo | --seo-only]'); process.exit(1); }
  const all = [], seen = new Set();
  for (const u of urls) {
    const found = await scan(u, { allRules, a11y, seo });
    console.log(`${u}: ${found.length} issues`);
    for (const v of found) { const k = v.ruleId + v.html; if (!seen.has(k)) { seen.add(k); all.push(v); } }
  }
  fs.writeFileSync('violations.json', JSON.stringify(all, null, 2));
  console.log(`Total ${all.length} unique issues -> violations.json`);
}
