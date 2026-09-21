// SEO audit: collects on-page signals in the browser, then turns them into findings (same shape as accessibility findings).

// Runs inside the page. Must not use anything from outside this function.
function collect() {
  const meta = (sel) => document.querySelector(sel)?.getAttribute('content') || '';
  const GENERIC = /^(click here|here|read more|more|learn more|link|this|details|click)$/i;
  const paras = [...document.querySelectorAll('main p, article p, p')].map((p) => p.innerText.trim()).filter((t) => t.length > 60);
  const img = [...document.images].find((i) => i.naturalWidth >= 200 && /^https?:/.test(i.currentSrc));
  return {
    title: (document.title || '').trim(),
    titleEl: !!document.querySelector('head > title'),
    desc: meta('meta[name="description"]').trim(),
    viewport: meta('meta[name="viewport"]'),
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
    robots: meta('meta[name="robots"]'),
    h1s: [...document.querySelectorAll('h1')].map((h) => h.innerText.trim()).filter(Boolean),
    og: { title: meta('meta[property="og:title"]'), description: meta('meta[property="og:description"]'), image: meta('meta[property="og:image"]') },
    jsonld: document.querySelectorAll('script[type="application/ld+json"]').length,
    para: paras[0] || '',
    img: img ? img.currentSrc : '',
    text: (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 700),
    generic: [...document.querySelectorAll('a[href]')].filter((a) => GENERIC.test(a.innerText.trim())).slice(0, 3).map((a) => a.outerHTML.slice(0, 200)),
  };
}

async function checkSite(page, origin) {
  const found = async (p) => {
    try {
      const r = await page.request.get(origin + p, { timeout: 8000 });
      return r.ok() && !/<html/i.test((await r.text()).slice(0, 300));
    } catch { return false; }
  };
  return { robots: await found('/robots.txt'), sitemap: await found('/sitemap.xml') };
}

// Pure function (easy to test): data collected from the page -> list of findings.
export function buildFindings({ url, d, xrobots = '', site = { robots: true, sitemap: true } }) {
  const u = new URL(url);
  const local = ['localhost', '127.0.0.1'].includes(u.hostname);
  const ctx = { h1: d.h1s[0] || '', para: d.para, text: d.text, img: d.img, host: u.hostname };
  const out = [];
  const add = (ruleId, impact, help, html) => out.push({ ruleId, category: 'seo', impact, wcag: [], help, html, url, target: [], src: null, context: '', seo: ctx });

  if (!d.title) add('seo-title-missing', 'serious', 'Every page needs a unique, descriptive title', '<head> ... </head>  (no <title> found)');
  else if (d.title.length < 15 || d.title.length > 60) add('seo-title-length', 'minor', `Titles work best at 30 to 60 characters (this one is ${d.title.length})`, `<title>${d.title}</title>`);

  if (!d.desc) add('seo-description-missing', 'serious', 'A meta description gives search results a summary to show', '<head> ... </head>  (no meta description found)');
  else if (d.desc.length < 70 || d.desc.length > 160) add('seo-description-length', 'minor', `Descriptions work best at 70 to 160 characters (this one is ${d.desc.length})`, `<meta name="description" content="${d.desc}">`);

  if (d.h1s.length === 0) add('seo-h1-missing', 'serious', 'Each page should have one main heading (h1)', '<body> ... </body>  (no <h1> found)');
  else if (d.h1s.length > 1) add('seo-h1-multiple', 'moderate', `The page has ${d.h1s.length} h1 headings; one is clearer`, `<h1>${d.h1s[0]}</h1>  (+${d.h1s.length - 1} more)`);

  if (!d.viewport) add('seo-viewport-missing', 'serious', 'Without a viewport tag the page is not mobile-friendly', '<head> ... </head>  (no viewport meta found)');
  if (!d.canonical) add('seo-canonical-missing', 'minor', 'A canonical link tells search engines the preferred address', '<head> ... </head>  (no canonical link found)');

  const ogMissing = ['title', 'description', 'image'].filter((k) => !d.og[k]);
  if (ogMissing.length) add('seo-open-graph-missing', 'minor', 'Social sharing tags control how the page looks when shared', `Missing: ${ogMissing.map((k) => 'og:' + k).join(', ')}`);

  const noindex = /noindex/i.test(d.robots) || /noindex/i.test(xrobots);
  if (noindex) add('seo-noindex', 'critical', 'Search engines are told not to index this page', `<meta name="robots" content="${d.robots || xrobots}">`);
  if (u.protocol === 'http:' && !local) add('seo-not-https', 'serious', 'The page is not served over HTTPS', url);
  if (d.generic.length) add('seo-generic-link-text', 'moderate', 'Links should describe where they go', d.generic[0]);
  if (!d.jsonld) add('seo-structured-data-missing', 'minor', 'Structured data helps search engines understand the page', '<script type="application/ld+json"> not found');
  if (!site.robots) add('seo-robots-txt-missing', 'minor', 'A robots.txt file guides search engine crawlers', `${u.origin}/robots.txt  (not found)`);
  if (!site.sitemap) add('seo-sitemap-missing', 'minor', 'A sitemap lists the pages you want indexed', `${u.origin}/sitemap.xml  (not found)`);
  return out;
}

export async function auditSeo(page, url, response) {
  const d = await page.evaluate(collect);
  const xrobots = response?.headers()['x-robots-tag'] || '';
  return buildFindings({ url, d, xrobots, site: await checkSite(page, new URL(url).origin) });
}
