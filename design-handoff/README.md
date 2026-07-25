# CoachEasy redesign — design handoff

The designer ships prototypes (`design/*.dc.html`) and reference renders here;
agents port them with `/port-screen XX` (`.claude/commands/port-screen.md`),
which drives the `design-pro` skill end-to-end. The install/bootstrap phase is
long done — the theme lives in `frontend/apps/coachapp-v2/src/index.css` and
**wins on conflict** (UI-CONTRACT §3).

## Contents
- `UI-CONTRACT.md` — the rules: component fence, prototype→HeroUI mapping, DoD, screen index (§8).
- `CLIENT-DETAIL.md` — build handoff for the **client detail hub** and everything reachable from it (CD/OV·TR·NU·CI, SD, ND, CS, PH, WH, DT, IR, ED) + the seven lifecycle states. Prototype: `Client Detail.dc.html`. Refs: `refs/CD-*.png`.
- `RECIPES.md` — golden snippets (exact classes/variants) for the repeated patterns: pills, list rows, sidebar, chips, status cells. Copy verbatim.
- `refs/XX-{desktop,mobile}.png` — per-frame reference renders at design width (desktop 1240, mobile 390, 2×) — inputs to the diff gate. NB/TB/FB are single-frame.
- `scripts/style-diff.mjs` — computed-style convergence gate: compares design nodes vs app nodes per manifest; a port isn't done until it passes.
- `scripts/visual-diff.mjs` — Playwright + pixelmatch gate: renders your route at 1240/390 and diffs against refs.
- `manifests/*.json` — per-screen selector manifests consumed by `style-diff.mjs`.
- `design/*.dc.html` — the specs. **Never read one whole**: grep `data-screen-label="XX"` or `data-ref="xx-desktop"` and read that slice. Inline-styled on purpose; never copy their markup or styles.
- `screens/XX.png` — whole-section overview images (desktop+mobile side by side) for humans.
- `COPY.md` — exact strings per screen. Verbatim; sample data excluded.
- `INTERACTIONS.md` — per-screen behavior the markup can't show.
- `GAPS.md` — pre-answered "no §2 mapping" cases + the still-open ones.

## Agent workflow per screen
Use `/port-screen XX` — it encodes the read order, the rules, and the render→diff→fix loop that makes results converge on the refs.

Note: `design/support.js` is the prototype's runtime — needed only to open the .dc.html in a browser; irrelevant to the port.
