#!/usr/bin/env node
/* style-diff.mjs — the ground truth for design-pro ports.
   Compares getComputedStyle between the live-rendered dc.html prototype and the
   running app, per mapped node, per state. Deterministic: no eyeballing.

   Usage:
     node design-handoff/scripts/style-diff.mjs design-handoff/manifests/CD-OV.json [--state active] [--width desktop|mobile] [--json]

   Run via the app workspace so Playwright resolves:
     cd frontend/apps/coachapp-v2 && node ../../../design-handoff/scripts/style-diff.mjs ../../../design-handoff/manifests/CD-OV.json

   Exit 0 = every compared property matches (or is ledgered in accepted-diffs.md).
   Exit 1 = drift. The report lists every mismatch — fix code or (user-only)
   ledger it. NEVER widen EPS to pass.

   Manifest shape (JSON):
   {
     "design": "design-handoff/design/Client Detail.dc.html",
     "app":    { "base": "http://localhost:2021", "route": "/clients/42" },
     "tokenKey": "coachapp.accessToken",          // optional: APP_TOKEN env → localStorage
     "states": [
       { "name": "active",
         "design": [ {"click": "text=Active"} ],  // steps to reach the state in the prototype
         "app":    [ ],                           // steps to reach it in the app
         "route":  "/clients/42",                 // optional per-state route (default app.route)
         "pairs":  ["header-name", "stat-weight"] // optional subset; default = all pairs
       }
     ],
     "pairs": [
       { "name": "header-name",
         "design": { "desktop": "[data-ref='CD-OV-desktop'] .who h2",
                     "mobile":  "[data-ref='CD-OV-mobile'] .who h2" },
         "app": "[data-testid='client-name']",
         "widths": ["desktop", "mobile"] }        // optional; default both
     ]
   }
   Steps: {goto: url} {click: sel} {fill: [sel, val]} {eval: js} {wait: sel} {sleep: ms}
   Selectors are Playwright selectors ("text=", "css=", ...). "design" may be a
   plain string when the same selector works in both frames.
*/

import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

// playwright is resolved from the CWD's node_modules (run from frontend/apps/coachapp-v2)
const { chromium } = createRequire(path.join(process.cwd(), 'noop.js'))('playwright');

const EPS = 0.5; // px — subpixel rendering slack. Never raise.
const PROPS = [
  'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing',
  'color', 'background-color',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-color', 'border-top-left-radius', 'border-top-right-radius',
  'border-bottom-left-radius', 'border-bottom-right-radius',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'row-gap', 'column-gap', 'box-shadow',
];
const WIDTHS = { desktop: { width: 1240, height: 900 }, mobile: { width: 390, height: 844 } };

const args = process.argv.slice(2);
const manifestPath = args.find((a) => !a.startsWith('--'));
if (!manifestPath) { console.error('Usage: style-diff.mjs <manifest.json> [--state name] [--width desktop|mobile] [--json]'); process.exit(2); }
const onlyState = args.includes('--state') ? args[args.indexOf('--state') + 1] : null;
const onlyWidth = args.includes('--width') ? args[args.indexOf('--width') + 1] : null;
const asJson = args.includes('--json');

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const manifest = JSON.parse(fs.readFileSync(path.resolve(manifestPath), 'utf8'));
const designUrl = 'file://' + path.resolve(root, manifest.design);
const ledgerFile = path.join(root, 'design-handoff/accepted-diffs.md');
// Only table rows count — the file's prose contains an example key that must not match.
const ledger = new Set(
  (fs.existsSync(ledgerFile) ? fs.readFileSync(ledgerFile, 'utf8') : '')
    .split('\n').filter((l) => l.startsWith('|')).join('\n')
    .match(/`([^`]+:[^`]+:[^`]+:[^`]+)`/g)?.map((m) => m.slice(1, -1)) ?? [],
);
const screenId = path.basename(manifestPath).replace(/\.json$/, '');

async function runSteps(page, steps = []) {
  for (const s of steps) {
    if (s.goto) await page.goto(s.goto, { waitUntil: 'networkidle' });
    else if (s.click) await page.click(s.click);
    else if (s.fill) await page.fill(s.fill[0], s.fill[1]);
    else if (s.eval) await page.evaluate(s.eval);
    else if (s.wait) await page.waitForSelector(s.wait);
    else if (s.sleep) await page.waitForTimeout(s.sleep);
  }
}

async function styles(page, selector) {
  return page.evaluate(
    ([sel, props]) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      const out = {};
      for (const p of props) out[p] = cs.getPropertyValue(p);
      return out;
    },
    [selector, PROPS],
  );
}

// Values match when their non-numeric skeletons are equal (normalized quotes/
// whitespace/case for font lists) AND every embedded number agrees within EPS.
function same(a, b) {
  const nums = (v) => (v.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  const skel = (v) => v.replace(/-?\d+(\.\d+)?/g, '#').replace(/["']/g, '').replace(/\s+/g, ' ').toLowerCase().trim();
  const na = nums(a), nb = nums(b);
  if (skel(a) !== skel(b) || na.length !== nb.length) return false;
  return na.every((n, i) => Math.abs(n - nb[i]) <= EPS);
}

const browser = await chromium.launch();
const findings = []; // {state, width, pair, prop, design, app, ledgered} | {state, width, pair, missing}

const designCtx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const designPage = await designCtx.newPage();
await designPage.goto(designUrl, { waitUntil: 'networkidle' });
await designPage.evaluate(() => document.fonts.ready);

const appCtx = await browser.newContext({ deviceScaleFactor: 1 });
if (process.env.APP_TOKEN && manifest.tokenKey) {
  await appCtx.addInitScript(
    ([k, v]) => localStorage.setItem(k, v),
    [manifest.tokenKey, process.env.APP_TOKEN],
  );
}
const appPage = await appCtx.newPage();

for (const state of manifest.states) {
  if (onlyState && state.name !== onlyState) continue;
  await runSteps(designPage, state.design);
  const pairNames = state.pairs ?? manifest.pairs.map((p) => p.name);
  for (const widthName of Object.keys(WIDTHS)) {
    if (onlyWidth && widthName !== onlyWidth) continue;
    await appPage.setViewportSize(WIDTHS[widthName]);
    // 'networkidle' never fires on the app (persistent connections) — rely on
    // explicit {wait} steps in the manifest's state recipe instead.
    // a state may live on its own route (e.g. one seeded client per lifecycle state)
    await appPage.goto(manifest.app.base + (state.route ?? manifest.app.route), { waitUntil: 'domcontentloaded' });
    await runSteps(appPage, state.app);
    await appPage.evaluate(() => document.fonts.ready);
    for (const pair of manifest.pairs.filter((p) => pairNames.includes(p.name))) {
      if (pair.widths && !pair.widths.includes(widthName)) continue;
      const designSel = typeof pair.design === 'string' ? pair.design : pair.design[widthName];
      if (!designSel) continue;
      const [d, a] = [await styles(designPage, designSel), await styles(appPage, pair.app)];
      if (!d || !a) {
        findings.push({ state: state.name, width: widthName, pair: pair.name, missing: !d ? 'design' : 'app' });
        continue;
      }
      for (const prop of PROPS) {
        // a border color is invisible (pure noise) when both sides' width is 0
        if (prop === 'border-top-color' && d['border-top-width'] === '0px' && a['border-top-width'] === '0px') continue;
        if (same(d[prop], a[prop])) continue;
        const key = `${screenId}:${state.name}:${pair.name}:${prop}`;
        findings.push({ state: state.name, width: widthName, pair: pair.name, prop, design: d[prop], app: a[prop], ledgered: ledger.has(key), key });
      }
    }
  }
}
await browser.close();

const live = findings.filter((f) => f.missing || !f.ledgered);
if (asJson) console.log(JSON.stringify(findings, null, 2));
else {
  for (const f of findings) {
    if (f.missing) console.log(`MISSING ${f.missing.toUpperCase()} NODE  ${f.state}/${f.width}/${f.pair}`);
    else console.log(`${f.ledgered ? '(ledgered) ' : ''}${f.state}/${f.width}/${f.pair}  ${f.prop}: design=${f.design}  app=${f.app}`);
  }
  console.log(`\n${live.length} live diff(s), ${findings.length - live.length} ledgered — ${live.length ? 'FAIL' : 'PASS'}`);
}
process.exit(live.length ? 1 : 0);
