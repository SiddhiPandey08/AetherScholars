// Demo mode for static hosting (GitHub Pages): fake API and fake scan with sample data. Nothing is scanned or changed.
(() => {
  const SAMPLE = 'https://sample-portal.example/';
  const it = (id, ruleId, impact, wcag, help, html, fix, extra = {}) => ({ id, ruleId, impact, wcag, help, html, url: SAMPLE, fix, ...extra });
  const ok = (change, after, source, needsReview = false) => ({ supported: true, change, after, source, needsReview });
  const no = (note) => ({ supported: false, note });

  const items = [
    it(0, 'image-alt', 'critical', ['wcag2a', 'wcag111'], 'Images must have alternative text', '<img src="/images/hero-notice.jpg" class="hero">',
      ok('add alt', '<img src="/images/hero-notice.jpg" class="hero" alt="Officials handing over a certificate at a public event">', 'ai')),
    it(1, 'image-alt', 'critical', ['wcag2a', 'wcag111'], 'Images must have alternative text', '<img src="/img/logo-emblem.png">',
      ok('add alt', '<img src="/img/logo-emblem.png" alt="Logo emblem">', 'rule', true)),
    it(2, 'link-name', 'serious', ['wcag2a', 'wcag244', 'wcag412'], 'Links must have discernible text', '<a href="/services/pension"><img src="/icons/pension.svg" alt=""></a>',
      ok('add aria-label', '<a href="/services/pension" aria-label="Pension"><img src="/icons/pension.svg" alt=""></a>', 'rule', true)),
    it(3, 'link-name', 'serious', ['wcag2a', 'wcag244', 'wcag412'], 'Links must have discernible text', '<a href="/apply-online" class="btn-round"><svg></svg></a>',
      ok('add aria-label', '<a href="/apply-online" class="btn-round" aria-label="Apply online"><svg></svg></a>', 'rule', true)),
    it(4, 'button-name', 'critical', ['wcag2a', 'wcag412'], 'Buttons must have discernible text', '<button class="search-btn"><svg></svg></button>',
      ok('add aria-label', '<button class="search-btn" aria-label="Search"><svg></svg></button>', 'ai')),
    it(5, 'label', 'critical', ['wcag2a', 'wcag412'], 'Form elements must have labels', '<input type="email" id="newsletter" name="newsletter">',
      ok('add aria-label', '<input type="email" id="newsletter" name="newsletter" aria-label="Newsletter">', 'rule', true)),
    it(6, 'color-contrast', 'serious', ['wcag2aa', 'wcag143'], 'Elements must meet minimum color contrast ratio thresholds', '<p class="notice" style="color:#aaa">Last date to apply is 30 June.</p>',
      no('Elements must meet minimum colour contrast.')),
    it(7, 'heading-order', 'moderate', ['best-practice'], 'Heading levels should only increase by one', '<h4>Quick links</h4>',
      no('Heading levels should only increase by one.')),
  ];

  const mapping = [
    { status: 'proposed', ruleId: 'image-alt', file: 'src/pages/index.jsx', line: 14, confidence: 'high', change: 'add alt="Officials handing over a certificate at a public event"', source: 'ai' },
    { status: 'proposed', ruleId: 'image-alt', file: 'src/Components/Header/index.jsx', line: 9, confidence: 'high', change: 'add alt="Logo emblem"', source: 'rule', needsReview: true },
    { status: 'proposed', ruleId: 'link-name', file: 'src/pages/index.jsx', line: 31, confidence: 'medium', change: 'add aria-label="Pension"', source: 'rule', needsReview: true },
    { status: 'ambiguous', ruleId: 'link-name' },
    { status: 'proposed', ruleId: 'button-name', file: 'src/Components/SearchBar/index.jsx', line: 22, confidence: 'high', change: 'add aria-label="Search"', source: 'ai' },
    { status: 'not-in-source', ruleId: 'label' },
    { status: 'skipped', ruleId: 'color-contrast', reason: 'no fixer for color-contrast yet' },
    { status: 'skipped', ruleId: 'heading-order', reason: 'no fixer for heading-order yet' },
  ];

  const DIFF = `--- src/pages/index.jsx
+++ src/pages/index.jsx
@@ -14,3 +14,3 @@
-      <img src="/images/hero-notice.jpg" className="hero" />
+      <img src="/images/hero-notice.jpg" className="hero" alt="Officials handing over a certificate at a public event" />
--- src/Components/SearchBar/index.jsx
+++ src/Components/SearchBar/index.jsx
@@ -22,1 +22,1 @@
-      <button className={styles.searchBtn}><FaSearch /></button>
+      <button className={styles.searchBtn} aria-label="Search"><FaSearch /></button>`;

  const PR_BODY = `## Accessibility fixes (4)

Proposed by the Accessibility Auto-Patcher. Please review every change before merging.

| Location | Issue | Change | Source |
| --- | --- | --- | --- |
| \`src/pages/index.jsx:14\` | image-alt (wcag2a, wcag111) | add alt="Officials handing over a certificate at a public event" | AI |
| \`src/Components/Header/index.jsx:9\` | image-alt (wcag2a, wcag111) | add alt="Logo emblem" | Rule (check wording) |
| \`src/pages/index.jsx:31\` | link-name (wcag2a, wcag244, wcag412) | add aria-label="Pension" | Rule (check wording) |
| \`src/Components/SearchBar/index.jsx:22\` | button-name (wcag2a, wcag412) | add aria-label="Search" | AI |`;

  const routes = {
    '/api/config': () => ({ llm: true, model: 'Qwen-VL (demo)', hasAuth: false, hasSaved: true, hasToken: true }),
    '/api/saved': () => ({ items }),
    '/api/map': () => ({ patches: mapping, diffs: [] }),
    '/api/apply': () => ({ patches: mapping.filter((p) => p.status === 'proposed'), diffs: [DIFF] }),
    '/api/verify': () => ({ before: 8, resolved: 4, remaining: 4, introduced: 0, check: 'passed' }),
    '/api/pr': (b) => (b.dryRun ? { title: 'a11y: fix 4 accessibility issues', body: PR_BODY } : { url: '#demo-pull-request' }),
    '/api/login/start': () => ({ ok: true }),
    '/api/login/finish': () => ({ ok: true }),
  };

  const realFetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = async (url, opts) => {
    const p = new URL(url, location.href).pathname, i = p.indexOf('/api/');
    if (i < 0 && realFetch) return realFetch(url, opts);
    await new Promise((r) => setTimeout(r, 250));
    const fn = routes[p.slice(i)];
    const body = opts && opts.body ? JSON.parse(opts.body) : {};
    return new Response(JSON.stringify(fn ? fn(body) : { error: 'Not available in demo mode' }), { status: fn ? 200 : 404, headers: { 'Content-Type': 'application/json' } });
  };

  window.EventSource = class {
    constructor() {
      this.h = {};
      const say = (t, d, ms) => setTimeout(() => (this.h[t] || []).forEach((f) => f({ data: JSON.stringify(d) })), ms);
      say('progress', { message: `Scanning ${SAMPLE} (1 of 1)... (demo data)` }, 300);
      say('progress', { message: `8 issue(s) found on ${SAMPLE}` }, 1200);
      say('progress', { message: 'Writing suggested fix 8 of 8...' }, 1700);
      say('done', { items }, 2200);
    }
    addEventListener(t, f) { (this.h[t] = this.h[t] || []).push(f); }
    close() {}
  };
})();
