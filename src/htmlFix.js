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
