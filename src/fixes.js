// Applies a fix to one JSX element. Deterministic rules first, AI only where wording is needed.
import * as t from '@babel/types';
import { staticProps, parseSnippet, classHints, localClass } from './mapSource.js';
import * as llm from './llm.js';

const attr = (n, v) => t.jsxAttribute(t.jsxIdentifier(n), t.stringLiteral(v));
const has = (open, n) => open.attributes.some((a) => a.type === 'JSXAttribute' && a.name.name === n);
const humanize = (s) =>
  s.replace(/\.[a-z0-9]+$/i, '').replace(/^(Fa|Md|Io|Ai|Bs|Ri|Fi)(?=[A-Z])/, '').replace(/[-_]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2').trim();
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const skip = (reason) => ({ skipped: true, reason });

async function askLabel(v, kind) {
  if (!llm.llmEnabled()) return null;
  return (await llm.suggestLabel({ html: v.html, context: v.context, kind }).catch(() => null))?.label || null;
}

// Cheap heuristics for a name: title, child icon component, href, name/id.
function heuristicLabel(open, parent, v) {
  const p = staticProps(open);
  if (typeof p.title === 'string') return p.title;
  const icon = (parent?.children || []).find((c) => c.type === 'JSXElement' && /^[A-Z]/.test(c.openingElement.name.name || ''));
  if (icon) return cap(humanize(icon.openingElement.name.name));
  if (typeof p.href === 'string' && p.href !== '/') return cap(humanize(p.href.split('/').filter(Boolean).pop()));
  const a = parseSnippet(v.html).attrs;
  return cap(humanize(p.name || p.id || a.name || a.id || ''));
}

// Carousel dots / pagination bullets: an empty button per slide, usually rendered in a .map() loop.
const isDot = (open, v) => {
  const names = [...classHints(open), ...(parseSnippet(v.html).attrs.class || '').split(/\s+/).map(localClass)];
  return names.some((n) => /dot|indicator|bullet|pagination/i.test(n));
};

// If the element is inside items.map((x, i) => ...), return the index variable (adding one if missing).
function loopIndex(path) {
  const fn = path.findParent((p) => p.isArrowFunctionExpression() || p.isFunctionExpression());
  const call = fn?.parentPath;
  if (!call?.isCallExpression() || call.node.callee.property?.name !== 'map') return null;
  const params = fn.node.params;
  if (params[1]?.type === 'Identifier') return params[1].name;
  if (params.length !== 1 || fn.scope.hasBinding('index')) return null;
  params.push(t.identifier('index'));
  return 'index';
}

const labelWithIndex = (label, idx) =>
  t.jsxAttribute(t.jsxIdentifier('aria-label'), t.jsxExpressionContainer(
    t.templateLiteral(
      [t.templateElement({ raw: `${label} `, cooked: `${label} ` }), t.templateElement({ raw: '', cooked: '' }, true)],
      [t.binaryExpression('+', t.identifier(idx), t.numericLiteral(1))],
    )));

export async function applyFix(hit, v) {
  const open = hit.node;
  switch (v.ruleId) {
    case 'image-alt': {
      if (has(open, 'alt')) return skip('alt is set dynamically');
      let r = null, source = 'ai';
      if (llm.llmEnabled() && v.src) r = await llm.describeImage({ src: v.src, context: v.context }).catch(() => null);
      if (!r) {
        source = 'rule';
        r = { alt: cap(humanize((v.src || '').split('?')[0].split('/').pop() || '')), decorative: false };
      }
      if (!r.decorative && !r.alt) return skip('no alt text could be produced');
      open.attributes.push(attr('alt', r.decorative ? '' : r.alt));
      return { change: `add alt="${r.decorative ? '' : r.alt}"`, source, needsReview: source === 'rule' };
    }
    case 'button-name':
    case 'link-name':
    case 'label': {
      if (has(open, 'aria-label') || has(open, 'aria-labelledby')) return skip('already has an accessible name');
      if (v.ruleId === 'button-name' && isDot(open, v)) {
        const idx = loopIndex(hit.path);
        if (idx) {
          open.attributes.push(labelWithIndex('Go to slide', idx));
          return { change: `add aria-label={\`Go to slide \${${idx} + 1}\`}`, source: 'rule', needsReview: false };
        }
      }
      const kind = v.ruleId === 'button-name' ? 'button' : v.ruleId === 'link-name' ? 'link' : 'form field';
      let label = heuristicLabel(open, hit.parent, v), source = 'rule';
      if (!label) { label = await askLabel(v, kind); source = 'ai'; }
      if (!label) return skip('no label could be produced');
      open.attributes.push(attr('aria-label', label));
      return { change: `add aria-label="${label}"`, source, needsReview: source === 'rule' };
    }
    default:
      return skip(`no fixer for ${v.ruleId} yet`);
  }
}
