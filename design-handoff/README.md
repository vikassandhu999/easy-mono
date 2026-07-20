# CoachEasy redesign — port handoff

Drop this folder into the repo root as `design-handoff/` (or similar). Then two one-line chores:

1. **Link it from `AGENTS.md`**: add "UI ports follow `design-handoff/UI-CONTRACT.md`." — agents won't read what isn't referenced.
2. **Commit the §5 grep gate** (`scripts/check-ui-contract.sh` from UI-CONTRACT §5) and wire it into CI / `just check-rm` now, not before the first PR.

## Contents
- `UI-CONTRACT.md` — the rules: component fence, prototype→HeroUI mapping, DoD, screen index (§8).
- `theme.css` — **install first**: redesign tokens extracted from the prototype's computed styles. Merge into `src/index.css`; every screen inherits most of its fidelity from this.
- `RECIPES.md` — golden snippets (exact classes/variants) for the repeated patterns: pills, list rows, sidebar, chips, status cells. Copy verbatim.
- `refs/XX-{desktop,mobile}.png` — per-frame reference renders at design width (desktop 1240, mobile 390, 2×) — inputs to the diff gate. NB/TB/FB are single-frame.
- `scripts/visual-diff.mjs` — Playwright + pixelmatch gate: renders your route at 1240/390 and diffs against refs; a port isn't done until it passes. Copy to `scripts/`, fill in the fixture ids.
- `claude-commands/port-screen.md` — drop into `.claude/commands/` → `/port-screen XX` runs the whole loop.
- `design/Dashboard Redesign.dc.html` — the spec itself. **Never read it whole**: grep `data-screen-label="XX"` or `data-ref="xx-desktop"` and read that slice. Inline-styled on purpose; never copy its markup or styles.
- `screens/XX.png` — whole-section overview images (desktop+mobile side by side) for humans.
- `COPY.md` — exact strings per screen. Verbatim; sample data excluded.
- `INTERACTIONS.md` — per-screen behavior the markup can't show.
- `GAPS.md` — pre-answered "no §2 mapping" cases + the still-open ones.
- `PORT-TICKET.md` — per-screen ticket template + suggested order.

## Install order (one-time)
1. Merge `theme.css` into `src/index.css` (own PR; fixes every screen's palette at once).
2. Copy `scripts/visual-diff.mjs` → `scripts/`, add deps (`playwright pixelmatch pngjs`), fill fixture routes, add to CI.
3. Copy `claude-commands/port-screen.md` → `.claude/commands/port-screen.md`.
4. Link from `AGENTS.md`: "UI ports follow `design-handoff/UI-CONTRACT.md`; port screens with `/port-screen XX`."

## Agent workflow per screen
Use `/port-screen XX` — it encodes the read order, the rules, and the render→diff→fix loop that makes results converge on the refs.

Note: `design/support.js` is the prototype's runtime — needed only to open the .dc.html in a browser; irrelevant to the port.
