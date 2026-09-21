// Demo mode for static hosting (GitHub Pages): fake API and fake scan with sample data. Nothing is scanned or changed.
(() => {
  const SAMPLE = 'https://sample-portal.example/';
  const it = (id, ruleId, impact, wcag, help, html, fix, extra = {}) => ({ id, ruleId, category: 'accessibility', impact, wcag, help, html, url: SAMPLE, fix, ...extra });
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
    it(8, 'seo-title-missing', 'serious', [], 'Every page needs a unique, descriptive title', '<head> ... </head>  (no <title> found)',
      ok('add <title>', '<title>Pension and Welfare Services | sample-portal.example</title>', 'ai', true), { category: 'seo' }),
    it(9, 'seo-description-missing', 'serious', [], 'A meta description gives search results a summary to show', '<head> ... </head>  (no meta description found)',
      ok('add meta description', '<meta name="description" content="Apply for pension, certificates and welfare schemes online, check your status, and find a service centre near you.">', 'ai', true), { category: 'seo' }),
    it(10, 'seo-open-graph-missing', 'minor', [], 'Social sharing tags control how the page looks when shared', 'Missing: og:title, og:description, og:image',
      ok('add meta og:title, og:description, og:type', '<meta property="og:title" content="Pension and Welfare Services | sample-portal.example">\n<meta property="og:description" content="Apply for pension, certificates and welfare schemes online.">\n<meta property="og:type" content="website">', 'rule', true), { category: 'seo' }),
    it(11, 'seo-h1-missing', 'serious', [], 'Each page should have one main heading (h1)', '<body> ... </body>  (no <h1> found)',
      no('Add one clear main heading (h1) that says what the page is about.'), { category: 'seo' }),
  ];

  const mapping = [
    { status: 'proposed', ruleId: 'image-alt', file: 'src/pages/index.jsx', line: 14, confidence: 'high', mapping: { confidence: 0.96, classification: 'HIGH' }, change: 'add alt="Officials handing over a certificate at a public event"', source: 'ai', fixStatus: 'FIXED', rootCause: 'The rendered image has no usable alt text.', recommendation: 'Add informative alt text.' },
    { status: 'proposed', ruleId: 'image-alt', file: 'src/Components/Header/index.jsx', line: 9, confidence: 'high', mapping: { confidence: 0.9, classification: 'HIGH' }, change: 'add alt="Logo emblem"', source: 'rule', needsReview: true, fixStatus: 'REVIEW REQUIRED', rootCause: 'The rendered image has no usable alt text.', recommendation: 'Add informative alt text.' },
    { status: 'proposed', ruleId: 'link-name', file: 'src/pages/index.jsx', line: 31, confidence: 'medium', mapping: { confidence: 0.72, classification: 'MEDIUM' }, change: 'add aria-label="Pension"', source: 'rule', needsReview: true, fixStatus: 'REVIEW REQUIRED', rootCause: 'The link has no discernible accessible name.', recommendation: 'Add readable link text or aria-label.' },
    { status: 'ambiguous', ruleId: 'link-name' },
    { status: 'proposed', ruleId: 'button-name', file: 'src/Components/SearchBar/index.jsx', line: 22, confidence: 'high', mapping: { confidence: 0.88, classification: 'HIGH' }, change: 'add aria-label="Search"', source: 'ai', fixStatus: 'FIXED', rootCause: 'The button has no discernible accessible name.', recommendation: 'Add visible text or aria-label.' },
    { status: 'not-in-source', ruleId: 'label' },
    { status: 'skipped', ruleId: 'color-contrast', reason: 'no fixer for color-contrast yet' },
    { status: 'skipped', ruleId: 'heading-order', reason: 'no fixer for heading-order yet' },
    { status: 'proposed', ruleId: 'seo-title-missing', file: 'src/pages/index.jsx', line: 12, confidence: 'high', mapping: { confidence: 0.99, classification: 'HIGH' }, change: 'add <title>', source: 'ai', needsReview: true, fixStatus: 'REVIEW REQUIRED' },
    { status: 'proposed', ruleId: 'seo-description-missing', file: 'src/pages/index.jsx', line: 12, confidence: 'high', mapping: { confidence: 0.99, classification: 'HIGH' }, change: 'add meta description', source: 'ai', needsReview: true, fixStatus: 'REVIEW REQUIRED' },
    { status: 'proposed', ruleId: 'seo-open-graph-missing', file: 'src/pages/index.jsx', line: 12, confidence: 'high', mapping: { confidence: 0.99, classification: 'HIGH' }, change: 'add meta og:title, og:description, og:type', source: 'rule', needsReview: true, fixStatus: 'REVIEW REQUIRED' },
    { status: 'skipped', ruleId: 'seo-h1-missing', reason: 'Add one clear main heading (h1) that says what the page is about.' },
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
+      <button className={styles.searchBtn} aria-label="Search"><FaSearch /></button>
--- src/pages/index.jsx
+++ src/pages/index.jsx
@@ -12,3 +12,8 @@
     <main>
+      <Head>
+        <title>Pension and Welfare Services | sample-portal.example</title>
+        <meta name="description" content="Apply for pension, certificates and welfare schemes online..." />
+        <meta property="og:type" content="website" />
+      </Head>`;

  const PR_BODY = `## Accessibility and SEO fixes (7)

Proposed by the Accessibility Auto-Patcher. Please review every change before merging.

| Location | Issue | Change | Source |
| --- | --- | --- | --- |
| \`src/pages/index.jsx:14\` | image-alt (wcag2a, wcag111) | add alt="Officials handing over a certificate at a public event" | AI |
| \`src/Components/Header/index.jsx:9\` | image-alt (wcag2a, wcag111) | add alt="Logo emblem" | Rule (check wording) |
| \`src/pages/index.jsx:31\` | link-name (wcag2a, wcag244, wcag412) | add aria-label="Pension" | Rule (check wording) |
| \`src/Components/SearchBar/index.jsx:22\` | button-name (wcag2a, wcag412) | add aria-label="Search" | AI |
| \`src/pages/index.jsx:12\` | seo-title-missing | add <title> | AI (check wording) |
| \`src/pages/index.jsx:12\` | seo-description-missing | add meta description | AI (check wording) |
| \`src/pages/index.jsx:12\` | seo-open-graph-missing | add meta og:title, og:description, og:type | Rule (check wording) |`;

  const routes = {
    '/api/config': () => ({ llm: true, model: 'Qwen-VL (demo)', hasAuth: false, hasSaved: true, hasToken: true }),
    '/api/saved': () => ({ items, categories: ['accessibility', 'seo'] }),
    '/api/map': () => ({ patches: mapping, diffs: [] }),
    '/api/apply': () => ({ patches: mapping.filter((p) => p.status === 'proposed'), diffs: [DIFF] }),
    '/api/verify': () => ({ before: 12, after: 5, resolved: 7, remaining: 5, introduced: 0, summary: { before: 12, after: 5, resolved: 7, introduced: 0, remaining: 5, regressions: 0, success: true }, details: { before: { total: 12, byRule: {} }, after: { total: 5, byRule: {} }, regressions: [], remaining: [], introduced: [], resolved: [] }, check: 'passed' }),
    '/api/pr': (b) => (b.dryRun ? { title: 'a11y + SEO: fix 7 issues', body: PR_BODY } : { url: '#demo-pull-request' }),
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
      say('progress', { message: `12 issue(s) found on ${SAMPLE}` }, 1200);
      say('progress', { message: 'Writing suggested fix 12 of 12...' }, 1700);
      say('done', { items, categories: ['accessibility', 'seo'] }, 2200);
    }
    addEventListener(t, f) { (this.h[t] = this.h[t] || []).push(f); }
    close() {}
  };
})();
