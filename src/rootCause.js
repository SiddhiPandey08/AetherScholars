import { parseSnippet } from './mapSource.js';

const q = (v) => (v ? `"${String(v).slice(0, 120)}"` : null);
const short = (s) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 120);

function sentence(parts) {
  return parts.filter(Boolean).join(' ');
}

export function explainRootCause(v, mapped = {}) {
  if ((v.category || 'accessibility') !== 'accessibility') return null;
  const sn = parseSnippet(v.html || '');
  const a = sn.attrs || {};
  const conf = Number(mapped.confidenceScore || 0);
  const confidence = Number.isFinite(conf) ? Math.max(0, Math.min(1, conf)) : 0;
  const base = {
    confidence,
    recommendation: '',
    explanation: '',
  };
  switch (v.ruleId) {
    case 'image-alt': {
      const src = short(v.src || a.src || '');
      base.explanation = sentence([
        'The rendered image has no usable alt text.',
        src ? `Source hint: ${q(src)}.` : null,
      ]);
      base.recommendation = 'Add an informative alt attribute, or alt="" only if the image is purely decorative.';
      return base;
    }
    case 'button-name': {
      const title = short(a.title || '');
      const ctx = short(v.context || '');
      base.explanation = sentence([
        'The button has no discernible accessible name (no text, aria-label, or aria-labelledby).',
        title ? `A title exists (${q(title)}) but title is not a reliable accessible name.` : null,
        ctx ? `Nearby context: ${q(ctx)}.` : null,
      ]);
      base.recommendation = 'Add visible button text or an aria-label that describes the action.';
      return base;
    }
    case 'link-name': {
      const href = short(a.href || '');
      base.explanation = sentence([
        'The link has no discernible accessible name.',
        href ? `Link target: ${q(href)}.` : null,
        'Assistive technologies cannot announce the link purpose.',
      ]);
      base.recommendation = 'Add readable link text or aria-label that matches the destination purpose.';
      return base;
    }
    case 'label': {
      const field = short(a.name || a.id || a.type || '');
      base.explanation = sentence([
        'The form control has no associated label or accessible name.',
        field ? `Field hint: ${q(field)}.` : null,
      ]);
      base.recommendation = 'Associate a visible <label> (for/id) or provide aria-label/aria-labelledby.';
      return base;
    }
    default:
      return null;
  }
}
