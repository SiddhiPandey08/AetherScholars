// Fix suggestions at HTML level, for ANY site (no source code needed). Shown in the dashboard as before/after.
import { parseSnippet } from './mapSource.js';
import * as llm from './llm.js';

const humanize = (s) => (s || '').replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const attrVal = (s) => s.replace(/"/g, '&quot;');

function addAttr(html, name, value) {
  return html.replace(/^<(\w+)([^>]*?)(\/?)>/, (m, tag, rest, close) => `<${tag}${rest.trimEnd()} ${name}="${attrVal(value)}"${close ? ' /' : ''}>`);
}

export async function suggestHtml(v) {
  if (v.category === 'seo') return suggestSeo(v);
  const a = parseSnippet(v.html).attrs;
  const ok = (name, value, source, needsReview = false) =>
    ({ supported: true, change: `add ${name}="${value}"`, after: addAttr(v.html, name, value), source, needsReview });
  const askLabel = async (kind) => (llm.llmEnabled() ? (await llm.suggestLabel({ html: v.html, context: v.context, kind }).catch(() => null))?.label : null);

  switch (v.ruleId) {
    case 'image-alt': {
      let r = null;
      if (llm.llmEnabled() && v.src) r = await llm.describeImage({ src: v.src, context: v.context }).catch(() => null);
      if (r) return ok('alt', r.decorative ? '' : r.alt, 'ai');
      const guess = cap(humanize((v.src || a.src || '').split('?')[0].split('/').pop()));
      return guess ? ok('alt', guess, 'rule', true) : { supported: false, note: 'Needs a written description of the image.' };
    }
    case 'link-name': {
      const label = a.title || cap(humanize((a.href || '').split(/[?#]/)[0].split('/').filter(Boolean).pop())) || (await askLabel('link'));
      return label ? ok('aria-label', label, a.title || a.href ? 'rule' : 'ai', !a.title) : { supported: false, note: 'Needs a human-written link name.' };
    }
    case 'button-name': {
      const label = a.title || (await askLabel('button'));
      return label ? ok('aria-label', label, a.title ? 'rule' : 'ai', !a.title) : { supported: false, note: 'Needs a human-written button name.' };
    }
    case 'label': {
      const label = cap(humanize(a.placeholder || a.name || a.id)) || (await askLabel('form field'));
      return label ? ok('aria-label', label, a.placeholder || a.name || a.id ? 'rule' : 'ai', true) : { supported: false, note: 'Needs a visible label.' };
    }
    default:
      return { supported: false, note: v.help ? `${v.help}. No automatic fix yet.` : `No automatic fix for ${v.ruleId} yet.` };
  }
}

// ---------- SEO ----------
const clip = (s, n) => {
  s = (s || '').replace(/\s+/g, ' ').trim();
  if (s.length <= n) return s;
  const cut = s.slice(0, n - 3), sp = cut.lastIndexOf(' ');
  return cut.slice(0, sp > n / 2 ? sp : cut.length).replace(/[,;:\s]+$/, '') + '...';
};
const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const renderTag = (t) => (t.el === 'title' ? `<title>${escAttr(t.text).replace(/&quot;/g, '"')}</title>`
  : `<${t.el} ${Object.entries(t.attrs).map(([k, v]) => `${k}="${escAttr(v)}"`).join(' ')}>`);
const describeTag = (t) => (t.el === 'title' ? 'add <title>' : t.el === 'link' ? 'add canonical link' : `add meta ${t.attrs.name || t.attrs.property}`);
const NOTES = {
  'seo-h1-missing': 'Add one clear main heading (h1) that says what the page is about.',
  'seo-h1-multiple': 'Keep one h1 and turn the others into h2 or h3.',
  'seo-noindex': 'This tells search engines to skip the page. Remove it unless that is intended.',
  'seo-not-https': 'Serve the site over HTTPS and redirect http to https.',
  'seo-generic-link-text': 'Replace vague link text such as "click here" with words that describe the destination.',
  'seo-structured-data-missing': 'Add JSON-LD structured data (schema.org) that describes the page.',
  'seo-sitemap-missing': 'Publish a sitemap.xml and list it in robots.txt.',
};

async function suggestSeo(v) {
  const c = v.seo || {};
  let origin = '';
  try { origin = new URL(v.url).origin; } catch { /* keep empty */ }
  if (v.ruleId === 'seo-robots-txt-missing') {
    return { supported: true, kind: 'file', change: 'create robots.txt', after: `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml`, source: 'rule', needsReview: true };
  }
  const needsText = ['seo-title-missing', 'seo-title-length', 'seo-description-missing', 'seo-description-length', 'seo-open-graph-missing'].includes(v.ruleId);
  const ai = needsText && llm.llmEnabled() ? await llm.suggestSeoText({ url: v.url, h1: c.h1, text: c.text }).catch(() => null) : null;
  const site = (c.host || '').replace(/^www\./, '');
  const title = clip(ai?.title || (c.h1 ? (c.h1.length < 30 && site ? `${c.h1} | ${site}` : c.h1) : site), 60);
  const desc = clip(ai?.description || c.para || c.text, 155);
  const meta = (attrs) => ({ el: 'meta', attrs });
  const tags = {
    'seo-title-missing': [{ el: 'title', text: title }],
    'seo-title-length': [{ el: 'title', text: title }],
    'seo-description-missing': [meta({ name: 'description', content: desc })],
    'seo-description-length': [meta({ name: 'description', content: desc })],
    'seo-viewport-missing': [meta({ name: 'viewport', content: 'width=device-width, initial-scale=1' })],
    'seo-canonical-missing': [{ el: 'link', attrs: { rel: 'canonical', href: (v.url || '').split('#')[0].split('?')[0] } }],
    'seo-open-graph-missing': [meta({ property: 'og:title', content: title }), meta({ property: 'og:description', content: desc }), meta({ property: 'og:type', content: 'website' }),
      ...(c.img ? [meta({ property: 'og:image', content: c.img })] : [])],
  }[v.ruleId];
  if (!tags) return { supported: false, note: NOTES[v.ruleId] || v.help || 'No automatic fix for this check.' };
  if (tags.some((t) => (t.el === 'title' ? !t.text : t.attrs.content === '' ))) return { supported: false, note: 'Needs a hand-written value; the page has no text to base it on.' };
  return { supported: true, change: tags.map(describeTag).join(', '), after: tags.map(renderTag).join('\n'), tags, source: ai ? 'ai' : 'rule', needsReview: v.ruleId !== 'seo-viewport-missing' };
}
