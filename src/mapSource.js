// Maps a flagged DOM node back to the JSX element in the source repo.
import fs from 'node:fs';
import path from 'node:path';
import * as recast from 'recast';
import * as babelParser from '@babel/parser';
import _traverse from '@babel/traverse';
import * as t from '@babel/types';
const traverse = _traverse.default ?? _traverse;

// recast needs tokens; plain JSX is enough for this project (add 'typescript' for .tsx later).
const babel = {
  parse: (src) => babelParser.parse(src, { sourceType: 'module', tokens: true, plugins: ['jsx'] }),
};

const ALIAS = {
  img: ['img', 'Image', 'Avatar'], button: ['button', 'Button', 'IconButton'], a: ['a', 'Link'],
  input: ['input', 'Input', 'TextField'], select: ['select', 'Select'], textarea: ['textarea', 'TextArea', 'TextField'],
};

export function parseSnippet(html) {
  const tag = (html.match(/^<\s*([a-zA-Z0-9]+)/) || [])[1]?.toLowerCase();
  const attrs = {};
  for (const m of html.matchAll(/([:\w-]+)\s*=\s*"([^"]*)"/g)) attrs[m[1]] = m[2];
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return { tag, attrs, text };
}

const nameOf = (n) => (n.type === 'JSXIdentifier' ? n.name : null);

export function staticProps(open) {
  const p = {};
  for (const a of open.attributes) {
    if (a.type !== 'JSXAttribute' || a.name.type !== 'JSXIdentifier') continue;
    const k = a.name.name, v = a.value;
    if (!v) p[k] = true;
    else if (v.type === 'StringLiteral') p[k] = v.value;
    else if (v.type === 'JSXExpressionContainer') {
      const e = v.expression;
      if (e.type === 'StringLiteral') p[k] = e.value;
      else if (e.type === 'TemplateLiteral' && !e.expressions.length) p[k] = e.quasis[0].value.cooked;
    }
  }
  return p;
}

// CSS-module class names: the built HTML has "styles-module__hash__dot"; the source has styles.dot.
export const localClass = (c) => (c.includes('__') ? c.split('__').pop() : c);

// Names used inside className={...}: styles.dot, styles['dot'], 'a b', `${styles.a} b`.
export function classHints(open) {
  const hints = new Set();
  const a = open.attributes.find((x) => x.type === 'JSXAttribute' && x.name.name === 'className');
  if (!a || !a.value) return hints;
  const add = (str) => str.split(/\s+/).filter(Boolean).forEach((c) => hints.add(c));
  t.traverseFast(a.value, (n) => {
    if (n.type === 'StringLiteral') add(n.value);
    else if (n.type === 'TemplateElement') add(n.value.cooked || '');
    else if (n.type === 'MemberExpression') {
      if (!n.computed && n.property.type === 'Identifier') hints.add(n.property.name);
      else if (n.property.type === 'StringLiteral') hints.add(n.property.value);
    }
  });
  return hints;
}

const base = (x) => x.split('?')[0].split('/').pop();

function score(sn, props, jsxText, hints) {
  let s = 0;
  for (const k of ['id', 'name', 'type', 'placeholder', 'href', 'role', 'title']) {
    if (sn.attrs[k] !== undefined && props[k] !== undefined) s += props[k] === sn.attrs[k] ? 3 : -3;
  }
  if (sn.attrs.class && typeof props.className === 'string') {
    const a = new Set(sn.attrs.class.split(/\s+/));
    if (props.className.split(/\s+/).some((x) => a.has(x))) s += 2;
  }
  for (const c of (sn.attrs.class || '').split(/\s+/).filter(Boolean)) if (hints.has(localClass(c))) s += 3;
  if (sn.attrs.src && typeof props.src === 'string' && base(props.src) === base(sn.attrs.src)) s += 3;
  if (sn.text && jsxText && sn.text === jsxText) s += 2;
  return s;
}

export class Project {
  constructor(dir) {
    this.dir = dir;
    this.files = [];
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory() && e.name !== 'node_modules' && e.name !== '.next') walk(p);
        else if (/\.(jsx?|mjs)$/.test(e.name)) {
          const code = fs.readFileSync(p, 'utf8');
          try { this.files.push({ file: p, code, ast: recast.parse(code, { parser: babel }), dirty: false }); } catch { /* skip unparsable */ }
        }
      }
    };
    walk(path.join(dir, 'src'));
  }

  find(violation) {
    const sn = parseSnippet(violation.html);
    const names = ALIAS[sn.tag] || [sn.tag];
    const cands = [];
    for (const f of this.files) {
      traverse(f.ast, {
        JSXOpeningElement: (p) => {
          if (!names.includes(nameOf(p.node.name))) return;
          const text = (p.parent.children || []).filter((c) => c.type === 'JSXText').map((c) => c.value.trim()).join(' ').trim();
          cands.push({ f, node: p.node, parent: p.parent, path: p, s: score(sn, staticProps(p.node), text, classHints(p.node)), line: p.node.loc?.start.line });
        },
      });
    }
    cands.sort((a, b) => b.s - a.s);
    const [best, second] = cands;
    let confidence = 'none';
    if (best) confidence = best.s <= 0 ? 'none' : best.s >= 3 && (!second || best.s > second.s) ? 'high' : cands.length === 1 ? 'medium' : 'low';
    return { best, confidence, candidates: cands.slice(0, 3).map((c) => ({ file: path.relative(this.dir, c.f.file), line: c.line })) };
  }

  // Next.js pages router: /about -> src/pages/about.jsx or src/pages/about/index.jsx (also without src/).
  pageFile(pathname) {
    const p = decodeURIComponent(pathname).replace(/^\/+|\/+$/g, '');
    const bases = p ? [p, `${p}/index`] : ['index'];
    const want = new Set();
    for (const root of ['src/pages', 'pages']) for (const b of bases) for (const ext of ['.jsx', '.js']) want.add(path.resolve(this.dir, root, b + ext));
    return this.files.find((f) => want.has(path.resolve(f.file)));
  }

  changed() {
    // Keep each file's original line endings so Windows/Linux differences do not rewrite every line.
    return this.files.filter((f) => f.dirty).map((f) => {
      let after = recast.print(f.ast, { lineTerminator: f.code.includes('\r\n') ? '\r\n' : '\n' }).code;
      // recast prints new import strings with double quotes; match the file's own style.
      if (/from '/.test(f.code) && !/from "/.test(f.code)) after = after.replace(/(import \w+ from )"next\/head";/, "$1'next/head';");
      return { ...f, after };
    });
  }
}
