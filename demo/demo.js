// Demo mode for static hosting (GitHub Pages): mock API and sample data for ProspectIQ.
(() => {
  const SAMPLE = 'https://urbanleaf-demo.example';
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
    { status: 'proposed', ruleId: 'image-alt', file: 'src/pages/index.jsx', line: 14, confidence: 'high', change: 'add alt="Officials handing over a certificate at a public event"', source: 'ai' },
    { status: 'proposed', ruleId: 'image-alt', file: 'src/Components/Header/index.jsx', line: 9, confidence: 'high', change: 'add alt="Logo emblem"', source: 'rule', needsReview: true },
    { status: 'proposed', ruleId: 'link-name', file: 'src/pages/index.jsx', line: 31, confidence: 'medium', change: 'add aria-label="Pension"', source: 'rule', needsReview: true },
    { status: 'ambiguous', ruleId: 'link-name' },
    { status: 'proposed', ruleId: 'button-name', file: 'src/Components/SearchBar/index.jsx', line: 22, confidence: 'high', change: 'add aria-label="Search"', source: 'ai' },
    { status: 'not-in-source', ruleId: 'label' },
    { status: 'skipped', ruleId: 'color-contrast', reason: 'no fixer for color-contrast yet' },
    { status: 'skipped', ruleId: 'heading-order', reason: 'no fixer for heading-order yet' },
    { status: 'proposed', ruleId: 'seo-title-missing', file: 'src/pages/index.jsx', line: 12, confidence: 'high', change: 'add <title>', source: 'ai', needsReview: true },
    { status: 'proposed', ruleId: 'seo-description-missing', file: 'src/pages/index.jsx', line: 12, confidence: 'high', change: 'add meta description', source: 'ai', needsReview: true },
    { status: 'proposed', ruleId: 'seo-open-graph-missing', file: 'src/pages/index.jsx', line: 12, confidence: 'high', change: 'add meta og:title, og:description, og:type', source: 'rule', needsReview: true },
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

  const PROSPECTIQ_REPORT = {
    meta: {
      generatedAt: new Date().toISOString(),
      reportId: 'RPT-URBANLEAF-DEMO',
      version: '1.0.0-prospectiq',
    },
    business: {
      id: 'urbanleaf-cafe',
      name: 'UrbanLeaf Café',
      industry: 'Café / Food & Beverage',
      location: 'Bandra West, Mumbai, Maharashtra, India',
      website: 'https://urbanleaf-demo.example',
      reportingPeriod: 'August 2026',
      nextAnalysis: 'September 2026',
      frequency: 'Monthly',
      isDemo: true,
      tagline: 'Artisanal coffee, plant-forward brunch & community roastery',
      environmentNotice: 'DEMO DATA — Simulated business intelligence',
    },
    score: {
      overall: 78,
      max: 100,
      label: 'Composite Digital Presence Score',
      benchmark: 'F&B Café Benchmark: 72',
      status: 'High Performing',
      subScores: [
        { key: 'websiteHealth', label: 'Website Health', score: 82, weight: '20%', delta: '+7%', desc: 'Site speed, accessibility compliance & structure' },
        { key: 'contentPerformance', label: 'Content Performance', score: 76, weight: '20%', delta: '+5%', desc: 'Engagement per post, video completion & resonance' },
        { key: 'audienceEngagement', label: 'Audience Engagement', score: 81, weight: '20%', delta: '+12%', desc: 'Saves, shares, comment sentiment & interaction rate' },
        { key: 'searchVisibility', label: 'Search & Visibility', score: 69, weight: '15%', delta: '+4%', desc: 'Local Google search rank, direction requests & SEO' },
        { key: 'channelConsistency', label: 'Channel Consistency', score: 74, weight: '15%', delta: '+9%', desc: 'Posting cadence, multi-platform presence & activity' },
        { key: 'conversionReadiness', label: 'Conversion Readiness', score: 71, weight: '10%', delta: '-2%', desc: 'CTA visibility, booking friction & direct contact pathways' },
      ],
    },
    historical: {
      trend: [
        { period: 'June 2026', score: 71 },
        { period: 'July 2026', score: 74 },
        { period: 'August 2026', score: 78 },
      ],
      deltas: {
        overallScore: { from: 72, to: 78, change: '+6', positive: true },
        instagramEngagement: { change: '+18%', positive: true },
        websitePerformance: { change: '+7%', positive: true },
        facebookEngagement: { change: '-11%', positive: false },
        contentConsistency: { change: '+9%', positive: true },
      },
    },
    channels: [
      { id: 'instagram', name: 'Instagram', handle: '@urbanleaf.cafe', score: 82, reach: '42.5k', engagementRate: '4.8%', followers: '24.8k', growth: '+18%', trendDirection: 'up', status: 'Strong Growth', statusColor: 'good', summary: 'Primary engagement channel. Short-form Reels driving 68% of discovery.' },
      { id: 'website', name: 'Website', handle: 'urbanleaf-demo.example', score: 82, reach: '24.1k visits', engagementRate: '2m 14s', followers: '44% bounce', growth: 'Stable', trendDirection: 'neutral', status: 'Healthy', statusColor: 'good', summary: 'Fast 1.8s load times. High interest in menus, CTA needs fold optimization.' },
      { id: 'google_business', name: 'Google Business', handle: 'UrbanLeaf Café — Mumbai', score: 79, reach: '18.2k views', engagementRate: '1.4k actions', followers: '4.6 ★ (380)', growth: '+9%', trendDirection: 'up', status: 'Growing', statusColor: 'good', summary: 'High local search intent for "artisanal coffee Bandra". Direction requests +14%.' },
      { id: 'youtube', name: 'YouTube', handle: 'UrbanLeaf Café', score: 71, reach: '12.8k views', engagementRate: '6.1%', followers: '5.4k subs', growth: '+13%', trendDirection: 'up', status: 'Emerging', statusColor: 'good', summary: 'High viewer retention on coffee brewing tutorials.' },
      { id: 'facebook', name: 'Facebook', handle: 'UrbanLeaf Café', score: 68, reach: '14.2k', engagementRate: '1.9%', followers: '14.2k', growth: '-11%', trendDirection: 'down', status: 'Needs Attention', statusColor: 'warn', summary: 'Static discount graphics experiencing reach fatigue. Requires pivot to video.' },
      { id: 'whatsapp', name: 'WhatsApp Business', handle: 'Concierge (+91 98200 XXXXX)', score: 75, reach: '1.15k views', engagementRate: '36% order rate', followers: '420 chats/mo', growth: '+15%', trendDirection: 'up', status: 'High Conversion', statusColor: 'good', summary: 'Highest conversion rate for weekend reservations and custom whole-bean orders.' },
      { id: 'linkedin', name: 'LinkedIn', handle: 'UrbanLeaf Hospitality', score: 54, reach: '3.1k', engagementRate: '2.4%', followers: '3.1k', growth: '+4%', trendDirection: 'up', status: 'Low Activity', statusColor: 'muted', summary: 'Underutilized B2B channel for corporate coffee catering.' },
      { id: 'twitter', name: 'X / Twitter', handle: '@UrbanLeafCafe', score: 62, reach: '4.8k', engagementRate: '2.1%', followers: '2.6k', growth: '+1%', trendDirection: 'neutral', status: 'Stable', statusColor: 'muted', summary: 'Effective for customer service and real-time community banter.' },
    ],
    contentPerformers: [
      { title: 'Monsoon Special Cold Brew', format: 'Short Video / Reel', channel: 'Instagram', reach: 28400, likes: 2340, shares: 342, engagementRate: '6.8%', performance: 'top' },
      { title: 'New Vegan Breakfast Plate', format: 'Photo Reel', channel: 'Instagram', reach: 21500, likes: 1820, shares: 280, engagementRate: '6.1%', performance: 'top' },
      { title: 'Behind the Counter: Roasting Beans', format: 'Video', channel: 'YouTube & IG', reach: 19800, likes: 1540, shares: 210, engagementRate: '5.4%', performance: 'top' },
      { title: 'Weekend Brunch Menu Showcase', format: 'Carousel', channel: 'Instagram & FB', reach: 16200, likes: 1120, shares: 118, engagementRate: '4.2%', performance: 'medium' },
      { title: 'Flat 10% Off on Weekdays', format: 'Static Graphic', channel: 'Facebook & X', reach: 6200, likes: 190, shares: 12, engagementRate: '1.4%', performance: 'low' },
    ],
    interestSignals: {
      disclaimer: 'Based on available engagement and interaction signals across connected channels. Does not represent final sales volume.',
      signals: [
        { offering: 'Cold Brew', score: 86, signalStrength: 'Very Strong', observation: 'Received 34% higher engagement than account average promotional content.', growth: '+28%' },
        { offering: 'Vegan Breakfast', score: 78, signalStrength: 'Strong', observation: 'High save rate (360 saves) indicates strong intent for weekend morning visits.', growth: '+22%' },
        { offering: 'Weekend Brunch', score: 71, signalStrength: 'Moderate High', observation: 'Reliable weekly spike in inquiries between Thursday and Saturday afternoons.', growth: '+11%' },
        { offering: 'Desserts & Pastries', score: 59, signalStrength: 'Moderate', observation: 'Steady engagement as secondary add-ons, but rarely drives primary discovery.', growth: '+4%' },
        { offering: 'Coffee Beans & Merch', score: 48, signalStrength: 'Emerging', observation: 'Lower overall volume, but shows highest repeat WhatsApp concierge conversion.', growth: '+15%' },
      ],
    },
    keyInsights: [
      { type: 'signal', badge: '🔥 Strongest Signal', title: 'Cold Brew content generated the strongest engagement signal.', detail: 'Monsoon Special Cold Brew video reached 28.4k people with 6.8% engagement rate, outperforming all other beverage showcases by +34%.' },
      { type: 'growth', badge: '📈 Growing Channel', title: 'Instagram engagement increased 18% compared with the previous period.', detail: 'Transition to short-form recipe and roasting Reels expanded discovery to non-followers by 41% across Mumbai culinary audiences.' },
      { type: 'attention', badge: '⚠️ Attention Required', title: 'Website conversion CTA has low visibility on mobile viewports.', detail: 'While website health is 82/100, the primary table reservation button is positioned below the second fold on mobile screens.' },
      { type: 'decline', badge: '📉 Declining Area', title: 'Facebook engagement decreased 11% due to static promo fatigue.', detail: 'Static 10% discount graphics generated only 1.4% engagement rate, signaling audience preference for video storytelling.' },
      { type: 'opportunity', badge: '🎯 Opportunity', title: 'Vegan breakfast content shows above-average engagement and save rates.', detail: 'Plant-forward menu items generated 360 bookmark saves and +22% organic shares. Expanding breakfast content could unlock weekday morning revenue.' },
    ],
    crossPlatformPatterns: [
      'Short-form product content is consistently outperforming static promotional posts by 2.8x across Instagram and Facebook.',
      'Cold Brew-related content generated the strongest combined engagement signal across all platforms during the August 2026 reporting period.',
      'Instagram is currently the primary engagement driver, while LinkedIn remains an underutilized B2B channel for corporate catering.',
      'Website performance and SEO are healthy (82/100), but the primary conversion CTA has lower mobile visibility than recommended.',
    ],
    websiteHealth: {
      score: 82,
      seoScore: 82,
      accessibilityScore: 88,
      performanceScore: 76,
      mobileScore: 79,
      loadSpeed: '1.8s',
      technicalIssuesCount: 4,
      findings: [
        { type: 'warn', title: 'Meta description needs improvement', detail: 'Description length is 42 characters; 70-160 characters is recommended.' },
        { type: 'warn', title: 'Two promotional images missing descriptive alt text', detail: 'Hero banner images in src/pages/index.jsx lack descriptive alt tags.' },
        { type: 'pass', title: 'Canonical configuration detected', detail: 'Canonical link correctly points to https://urbanleaf-demo.example.' },
        { type: 'pass', title: 'Mobile viewport configured', detail: 'Viewport meta tag is responsive and enables smooth mobile rendering.' },
        { type: 'pass', title: 'Primary H1 heading detected', detail: 'Single clear H1 heading structure found on the homepage.' },
      ],
    },
    recommendations: [
      { id: 'rec-1', priority: 'P1 — High Priority', priorityLevel: 'high', title: 'Improve primary website CTA visibility', problem: 'Primary reservation/ordering CTA has low visibility below the fold on mobile screens, causing drop-offs.', evidence: 'High social interest (+18% Instagram engagement) does not translate into proportional online reservations.', action: 'Move the primary booking/order CTA above the fold, implement a sticky mobile navigation bar, and test clear action wording ("Reserve Table").', impact: 'Expected +15-20% uplift in reservation click-throughs.' },
      { id: 'rec-2', priority: 'P1 — High Priority', priorityLevel: 'high', title: 'Expand content around high-interest Cold Brew and Vegan Breakfast themes', problem: 'High customer interest in signature items is currently supported by only 2 posts per month.', evidence: 'Cold Brew and Vegan Breakfast items scored 86 and 78 on interest signals, generating 34% and 22% higher engagement.', action: 'Schedule 2-3 weekly short-form Reels demonstrating behind-the-scenes brewing methods, bean origins, and chef plating.', impact: 'Capitalizes on proven audience appetite without increasing marketing spend.' },
      { id: 'rec-3', priority: 'P2 — Medium Priority', priorityLevel: 'medium', title: 'Improve Facebook posting consistency and shift away from static discount graphics', problem: 'Facebook engagement dropped by 11% due to repetitive discount banners.', evidence: 'Static graphic posts had only 1.4% engagement versus 5.4% for video content.', action: 'Replace static sale graphics with short customer interviews and video walk-throughs of daily café specials.', impact: 'Halts algorithmic reach decline and revitalizes neighborhood community reach.' },
      { id: 'rec-4', priority: 'P2 — Medium Priority', priorityLevel: 'medium', title: 'Add stronger conversion-focused landing page messaging', problem: 'Visitors landing on the menu page have a 44% bounce rate with no direct digital checkout option.', evidence: 'Google Business direction requests (+14%) indicate high footfall intent.', action: 'Incorporate WhatsApp concierge quick-chat links and one-click Google Maps directions on the website header.', impact: 'Directly channels online discovery into table bookings and coffee bean sales.' },
      { id: 'rec-5', priority: 'P3 — Opportunity', priorityLevel: 'opportunity', title: 'Repurpose high-performing Instagram content for YouTube Shorts & LinkedIn B2B', problem: 'High-performing video assets are currently confined to Instagram.', evidence: 'YouTube Shorts engagement is 6.1% and LinkedIn has 3.1k professional followers with only 2 posts/mo.', action: 'Cross-post all top Instagram Reels to YouTube Shorts and adapt brewing tips into LinkedIn posts for corporate office catering.', impact: 'Expands brand reach across B2B and search channels with zero new production overhead.' },
    ],
    pipeline: {
      title: 'Prototype Intelligence Pipeline',
      status: 'Verified & Computed',
      channelsAudited: 8,
      steps: [
        { step: 'Authorized Sources', badge: 'Input', desc: 'Securely ingests authorized tokens across Website, Google Business, Instagram, YouTube, etc.', detail: 'No unauthorized scraping. Ingestion restricted strictly to authenticated channels.' },
        { step: 'MCP Tool Orchestration', badge: 'Orchestration', desc: 'Dispatches specialized tool workers for web DOM extraction, engagement telemetry, and local search signals.', detail: 'Playwright headless browser for web assets; channel adapters for social telemetry.' },
        { step: 'Data Normalization', badge: 'Transform', desc: 'Transforms platform-specific metrics (likes, saves, views, footfall actions) into standard cross-channel units.', detail: 'Computes normalized engagement rates and reach percentiles across disparate platform APIs.' },
        { step: 'Evidence Extraction', badge: 'Analytics', desc: 'Isolates statistical anomalies and momentum signals (+34% Cold Brew interest, -11% Facebook engagement decay).', detail: 'Detects divergence between social interest and website booking conversions.' },
        { step: 'RAG Context Retrieval', badge: 'Context', desc: 'Fetches historical benchmarks (July 2026: 74) and F&B hospitality performance heuristics.', detail: 'Contextualizes performance against industry-specific seasonal trends.' },
        { step: 'AI Reasoning', badge: 'Inference', desc: 'Synthesizes multi-channel observations into root-cause problem statements and prioritized actions.', detail: 'Formulates P1, P2, and P3 actionable initiatives categorized by impact and operational feasibility.' },
        { step: 'Actionable Intelligence', badge: 'Delivery', desc: 'Generates the unified executive report with explainable presence scores and high-yield recommendations.', detail: 'Formatted for recurring PaaS delivery (monthly / quarterly / custom).' },
      ],
    },
    monitoring: {
      currentPeriod: 'August 2026',
      nextAnalysis: 'September 2026',
      frequency: 'Monthly',
    },
  };

  const routes = {
    '/api/config': () => ({ llm: true, model: 'Qwen-VL (demo)', hasAuth: false, hasSaved: true, hasToken: true }),
    '/api/saved': () => ({ items, categories: ['accessibility', 'seo'] }),
    '/api/map': () => ({ patches: mapping, diffs: [] }),
    '/api/apply': () => ({ patches: mapping.filter((p) => p.status === 'proposed'), diffs: [DIFF] }),
    '/api/verify': () => ({ before: 12, resolved: 7, remaining: 5, introduced: 0, check: 'passed' }),
    '/api/pr': (b) => (b.dryRun ? { title: 'a11y + SEO: fix 7 issues', body: PR_BODY } : { url: '#demo-pull-request' }),
    '/api/prospectiq/demo': () => PROSPECTIQ_REPORT,
    '/api/prospectiq/analyze': () => PROSPECTIQ_REPORT,
  };

  const realFetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = async (url, opts) => {
    const p = new URL(url, location.href).pathname;
    const i = p.indexOf('/api/');
    if (i < 0 && realFetch) return realFetch(url, opts);
    await new Promise((r) => setTimeout(r, 200));
    const fn = routes[p.slice(i)];
    const body = opts && opts.body ? JSON.parse(opts.body) : {};
    return new Response(JSON.stringify(fn ? fn(body) : { error: 'Not available in demo mode' }), {
      status: fn ? 200 : 404,
      headers: { 'Content-Type': 'application/json' },
    });
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
