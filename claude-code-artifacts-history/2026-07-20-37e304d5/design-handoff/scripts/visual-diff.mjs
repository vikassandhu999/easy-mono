#!/usr/bin/env node
/* visual-diff.mjs — the gate that makes ports converge.
   Usage: node scripts/visual-diff.mjs CL [--update-shots] [--threshold 0.03]
   Requires: pnpm add -D playwright pixelmatch pngjs  (npx playwright install chromium)

   What it does:
   1. Starts the app (expects `pnpm dev` already running on PORT or VITE_PORT, default 5173)
   2. Renders the screen's route with seeded mock data at:
        desktop 1240×(auto)  — matches design-handoff/refs/XX-desktop.png design width
        mobile   390×(auto)  — matches design-handoff/refs/XX-mobile.png (bezel cropped: content
                               area is the inner 368×800 at radius 42 — we crop refs on the fly)
   3. Pixel-diffs against the reference; writes shots/XX-{desktop,mobile}-{actual,diff}.png
   4. Exits 1 if mismatch ratio > threshold (default 3%)

   IMPORTANT for agents: a failing diff is your iteration signal. Open the -diff.png,
   read the hot zones, fix code, re-run. Do NOT raise the threshold to pass. */

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const ROUTES = { // badge -> [route, needsSeed]
  DB: '/', CL: '/clients', IN: '/clients/invite',
  EX: '/exercises', EP: '/exercises/:id', ED: '/exercises/:id/edit',
  FO: '/foods', FD: '/foods/:id', FE: '/foods/:id/edit',
  RC: '/recipes', RD: '/recipes/:id', RE: '/recipes/:id/edit',
  NP: '/nutrition-plans', NE: '/nutrition-plans/:id/edit', NB: '/nutrition-plans/:id/builder',
  TR: '/training-plans', TE: '/training-plans/:id/edit', TB: '/training-plans/:id/builder',
  FM: '/checkins', FB: '/checkins/:id/edit', ST: '/settings',
};
// TODO(repo): replace :id with a seeded fixture id; mock API via MSW seed used by pnpm dev:fixtures

const badge = process.argv[2];
const update = process.argv.includes('--update-shots');
const threshold = parseFloat((process.argv.find(a => a.startsWith('--threshold')) || '').split(' ')[1] || '0.03');
if (!ROUTES[badge]) { console.error('Unknown badge. One of: ' + Object.keys(ROUTES).join(' ')); process.exit(2); }

const BASE = process.env.APP_URL || 'http://localhost:5173';
const REFS = 'design-handoff/refs';
const OUT = 'design-handoff/shots';
fs.mkdirSync(OUT, { recursive: true });

function refFor(badge, kind) {
  const single = path.join(REFS, `${badge}.png`);          // NB/TB/FB single-frame refs
  const split = path.join(REFS, `${badge}-${kind}.png`);
  return fs.existsSync(split) ? split : (kind === 'desktop' && fs.existsSync(single) ? single : null);
}
function cropMobileBezel(png) { // refs include a 390px phone shell: 11px bezel + 42px radius inset (2x scale)
  const b = 22; // 11px * 2
  const out = new PNG({ width: png.width - b * 2, height: png.height - b * 2 });
  PNG.bitblt(png, out, b, b, out.width, out.height, 0, 0);
  return out;
}
async function shoot(page, width, url, file) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file, fullPage: true });
}
function diff(refFile, actFile, outFile, mobile) {
  let ref = PNG.sync.read(fs.readFileSync(refFile));
  if (mobile) ref = cropMobileBezel(ref);
  let act = PNG.sync.read(fs.readFileSync(actFile));
  // normalize widths (ref is 2x): scale actual up via nearest neighbor if needed — keep it simple: compare at min common size
  const w = Math.min(ref.width, act.width * 2), h = Math.min(ref.height, act.height * 2);
  // In practice: render actual at deviceScaleFactor 2 instead (see playwright context) so sizes align 1:1.
  const d = new PNG({ width: w, height: h });
  const n = pixelmatch(ref.data, act.data, d.data, w, h, { threshold: 0.12 });
  fs.writeFileSync(outFile, PNG.sync.write(d));
  return n / (w * h);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ deviceScaleFactor: 2 });
const page = await ctx.newPage();
const url = BASE + ROUTES[badge];
let fail = false;
for (const [kind, width] of [['desktop', 1240], ['mobile', 390]]) {
  const ref = refFor(badge, kind);
  if (!ref) { console.log(`(no ${kind} ref for ${badge} — skipped)`); continue; }
  const act = `${OUT}/${badge}-${kind}-actual.png`;
  await shoot(page, width, url, act);
  if (update) continue;
  const ratio = diff(ref, act, `${OUT}/${badge}-${kind}-diff.png`, kind === 'mobile');
  const ok = ratio <= threshold;
  console.log(`${badge} ${kind}: ${(ratio * 100).toFixed(2)}% mismatch ${ok ? 'PASS' : 'FAIL'}`);
  if (!ok) fail = true;
}
await browser.close();
process.exit(fail ? 1 : 0);
