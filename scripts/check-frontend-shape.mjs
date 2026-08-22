#!/usr/bin/env node
// The frontend tree has three kinds of directory and nothing else:
//
//   api/          the server contract
//   ui/           feature-agnostic components and hooks
//   <feature>/    one per route group; nests only when the child is itself a
//                 route group (library/foods, nutrition-plans/builder)
//
// and the arrows point one way: feature -> ui -> api. This file is the
// mechanical half of that; the prose half is each app's AGENTS.md.
import {readFileSync, readdirSync, statSync, existsSync} from 'node:fs';
import {join, dirname, resolve, relative, basename} from 'node:path';

const BUCKETS = new Set(['components', 'lib', 'utils', 'helpers', 'domain', 'shared', 'common']);
let failed = false;
const fail = (rule, message, lines = []) => {
  console.log(`FAIL ${rule} — ${message}`);
  for (const l of lines.slice(0, 10)) console.log(`  ${l}`);
  failed = true;
};

for (const app of process.argv.slice(2)) {
  const root = resolve(app, 'src');
  const files = [];
  const dirs = [];
  (function walk(d) {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      if (statSync(p).isDirectory()) {
        dirs.push(p);
        walk(p);
      } else if (/\.tsx?$/.test(p)) files.push(p);
    }
  })(root);

  const rel = (p) => `${app}/src/${relative(root, p)}`;

  // R1 — a folder named for a layer says nothing about what is in it. Files are
  // told apart by name; the only non-feature folders are api/ and ui/.
  const buckets = dirs.filter((d) => BUCKETS.has(basename(d)));
  if (buckets.length) {
    fail('SHAPE-1', 'layer-bucket directory (name the files, do not nest them under a generic noun)', buckets.map(rel));
  }

  // R4 — the @ sigil existed only to sort shared folders to the top.
  const sigils = dirs.filter((d) => basename(d).startsWith('@'));
  if (sigils.length) {
    fail('SHAPE-4', '@-prefixed directory (shared UI is ui/, the contract is api/)', sigils.map(rel));
  }

  // R5 — a .ts beside a .tsx of the same name wins module resolution, so the
  // component silently becomes unreachable. Cost us two broken routes once.
  const shadows = files.filter((f) => f.endsWith('.tsx') && existsSync(f.replace(/\.tsx$/, '.ts')));
  if (shadows.length) {
    fail('SHAPE-5', 'a .ts shadows a .tsx of the same name (resolution picks the .ts)', shadows.map(rel));
  }

  const resolveSpec = (spec, from) => {
    let b;
    if (spec.startsWith('@/')) b = join(root, spec.slice(2));
    else if (spec.startsWith('.')) b = resolve(dirname(from), spec);
    else return null;
    b = b.replace(/\.tsx?$/, '');
    for (const c of [`${b}.ts`, `${b}.tsx`]) if (existsSync(c)) return c;
    return null;
  };
  // library/foods is its own group; library/plan-period-card.tsx is the group's
  // shared surface. Files directly in src/ are the composition root.
  const featureOf = (p) => {
    const s = relative(root, p).split('/');
    if (s.length === 1) return '<root>';
    return s[0] === 'library' && s.length > 2 ? `${s[0]}/${s[1]}` : s[0];
  };

  const upward = [];
  const internals = [];
  for (const f of files) {
    const from = featureOf(f);
    for (const m of readFileSync(f, 'utf8').matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      const t = resolveSpec(m[1], f);
      if (!t) continue;
      const to = featureOf(t);
      if (to === from) continue;

      // R2 — ui/ knows React and the contract. Nothing else.
      if (from === 'ui' && to !== 'api' && to !== '<root>') {
        upward.push(`${rel(f)} -> ${rel(t)}`);
        continue;
      }
      if (from === '<root>' || to === 'ui' || to === 'api' || to === '<root>') continue;
      // the library group's own shared surface is public to its sub-groups
      if (to === 'library' && from.startsWith('library/')) continue;

      // R3 — a feature's .tsx is private. Its .ts files are its public surface,
      // which is also what makes that surface testable.
      if (t.endsWith('.tsx')) internals.push(`${rel(f)} -> ${rel(t)}`);
    }
  }
  if (upward.length) {
    fail('SHAPE-2', 'ui/ imports a feature (ui/ may import api/ and itself only)', upward);
  }
  if (internals.length) {
    fail('SHAPE-3', "cross-feature import of a .tsx (a feature's components are private; share via ui/ or a .ts)", internals);
  }
}

if (!failed) console.log('check-frontend-shape: all clean');
process.exit(failed ? 1 : 0);
