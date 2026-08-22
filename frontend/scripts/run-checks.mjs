#!/usr/bin/env node
import {spawnSync} from 'node:child_process';
// Glob-run *.check.ts with node --experimental-strip-types.
// Zero matches is a failed run (RM-202): a silent empty suite is not a suite.
import {readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';

const roots = process.argv.slice(2);
if (roots.length === 0) {
  console.error('usage: run-checks.mjs <dir>...');
  process.exit(1);
}

function collect(dir, acc) {
  let entries;
  try {
    entries = readdirSync(dir, {withFileTypes: true});
  } catch (err) {
    console.error(`cannot read ${dir}: ${err.message}`);
    process.exit(1);
  }
  for (const ent of entries) {
    const path = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules') continue;
      collect(path, acc);
    } else if (ent.isFile() && ent.name.endsWith('.check.ts')) {
      acc.push(path);
    }
  }
}

const files = [];
for (const root of roots) {
  let st;
  try {
    st = statSync(root);
  } catch (err) {
    console.error(`not a directory: ${root} (${err.message})`);
    process.exit(1);
  }
  if (!st.isDirectory()) {
    console.error(`not a directory: ${root}`);
    process.exit(1);
  }
  collect(root, files);
}
files.sort();

if (files.length === 0) {
  console.error(`no *.check.ts files found under: ${roots.join(', ')}`);
  process.exit(1);
}

for (const file of files) {
  console.log(file);
}

for (const file of files) {
  const result = spawnSync(process.execPath, ['--experimental-strip-types', file], {
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
