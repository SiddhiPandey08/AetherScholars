// Applies SEO tags to a Next.js (pages router) page by adding them inside <Head> from next/head.
import path from 'node:path';
import * as t from '@babel/types';
import _traverse from '@babel/traverse';
import { suggestHtml } from './htmlFix.js';

const traverse = _traverse.default ?? _traverse;
const skip = (reason) => ({ skipped: true, reason });
const val = (a) => (a.value?.type === 'JSXExpressionContainer' ? a.value.expression.value : a.value?.value);
const attrOf = (open, n) => open.attributes.find((a) => a.type === 'JSXAttribute' && a.name.name === n);
const safe = (s) => !/["\\{}&<>]/.test(s);
const jsxAttr = (n, v) => t.jsxAttribute(t.jsxIdentifier(n), safe(v) ? t.stringLiteral(v) : t.jsxExpressionContainer(t.stringLiteral(v)));

function makeEl({ el, text, attrs }) {
  if (el === 'title') {
    return t.jsxElement(t.jsxOpeningElement(t.jsxIdentifier('title'), []), t.jsxClosingElement(t.jsxIdentifier('title')),
      [safe(text) ? t.jsxText(text) : t.jsxExpressionContainer(t.stringLiteral(text))], false);
  }
  return t.jsxElement(t.jsxOpeningElement(t.jsxIdentifier(el), Object.entries(attrs).map(([k, v]) => jsxAttr(k, v)), true), null, [], true);
}

function hasTag(head, tag) {
  if (!head) return false;
  return head.children.some((c) => {
    if (c.type !== 'JSXElement') return false;
    const o = c.openingElement, name = o.name.name;
    if (tag.el === 'title') return name === 'title';
    if (tag.el === 'link') return name === 'link' && val(attrOf(o, 'rel') || {}) === tag.attrs.rel;
    const key = tag.attrs.name !== undefined ? 'name' : 'property';
    return name === 'meta' && val(attrOf(o, key) || {}) === tag.attrs[key];
  });
}

function findRoot(ast) {
  const JSX = /^JSX(Element|Fragment)$/;
  const fromFn = (fn) => {
    if (fn.body.type === 'BlockStatement') {
      const ret = [...fn.body.body].reverse().find((s) => s.type === 'ReturnStatement' && s.argument && JSX.test(s.argument.type));
      return ret?.argument ?? null;
    }
    return JSX.test(fn.body.type) ? fn.body : null;
  };
  let root = null;
  traverse(ast, {
    ExportDefaultDeclaration(p) {
      let d = p.node.declaration;
      if (d.type === 'Identifier') { d = p.scope.getBinding(d.name)?.path.node; if (d?.type === 'VariableDeclarator') d = d.init; }
      if (d && /Function|Arrow/.test(d.type)) root = fromFn(d);
      p.stop();
    },
  });
  return root;
}

const sp = (n) => ' '.repeat(Math.max(0, n));
const nl = (n) => t.jsxText('\n' + sp(n));

// Adds elements to a <Head>, one per line, keeping the closing tag on its own line.
function fill(head, els, ind) {
  const last = head.children[head.children.length - 1];
  const tail = last?.type === 'JSXText' && !last.value.trim() ? head.children.pop() : null;
  els.forEach((el) => head.children.push(nl(ind), el));
  head.children.push(tail || nl(ind - 2));
}

// Returns the line of the change, or null if nothing was added.
export function patchHead(ast, tags) {
  traverse.cache?.clear();
  const body = ast.program.body;
  const imp = body.find((n) => n.type === 'ImportDeclaration' && n.source.value === 'next/head');
  const name = imp?.specifiers.find((s) => s.type === 'ImportDefaultSpecifier')?.local.name || 'Head';
  let head = null;
  if (imp) traverse(ast, { JSXElement(p) { if (!head && p.node.openingElement.name.name === name) { head = p.node; p.stop(); } } });
  const fresh = tags.filter((tag) => !hasTag(head, tag)).map(makeEl);
  if (!fresh.length) return null;
  if (head) { fill(head, fresh, head.__ind ?? (head.loc?.start.column ?? 4) + 2); return head.loc?.start.line ?? 1; }
  const root = findRoot(ast);
  if (!root || root.openingElement?.selfClosing) return null;
  const col = root.loc?.start.column ?? 4;
  const el = t.jsxElement(t.jsxOpeningElement(t.jsxIdentifier(name), []), t.jsxClosingElement(t.jsxIdentifier(name)), [], false);
  el.__ind = col + 4;
  fill(el, fresh, col + 4);
  root.children.unshift(nl(col + 2), el);
  if (!imp) {
    const last = [...body].reverse().find((n) => n.type === 'ImportDeclaration');
    const q = last?.source.extra?.raw?.[0] || "'";
    const lit = t.stringLiteral('next/head');
    lit.extra = { raw: `${q}next/head${q}`, rawValue: 'next/head' };
    body.splice(last ? body.indexOf(last) + 1 : 0, 0, t.importDeclaration([t.importDefaultSpecifier(t.identifier(name))], lit));
  }
  return root.loc?.start.line ?? 1;
}

export async function applySeoFix(project, v) {
  if (/-length$/.test(v.ruleId)) return skip('edit the existing text in your code');
  const s = await suggestHtml(v);
  if (!s.supported || !s.tags?.length) return skip(s.note || 'no source change for this check');
  const f = project.pageFile(new URL(v.url).pathname);
  if (!f) return skip('no matching page file for this route (only the Next.js pages router is supported)');
  const line = patchHead(f.ast, s.tags);
  if (line == null) return skip('tags already present, or the page layout was not recognised');
  f.dirty = true;
  return { change: s.change, source: s.source, needsReview: s.needsReview, file: path.relative(project.dir, f.file), line, confidence: 'high' };
}
