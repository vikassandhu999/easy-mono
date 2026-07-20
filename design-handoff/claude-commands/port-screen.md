# /port-screen — port one redesign screen to exact spec

Usage: `/port-screen CL` (badge from design-handoff/UI-CONTRACT.md §8)

## Preconditions (fail fast if missing)
- `design-handoff/theme.css` values are merged into `src/index.css` (check: body bg is `var(--background)` off-white, `--ink` exists). If not, STOP and do that first — it is a separate, global PR.
- `pnpm dev` running with seeded fixture data (deterministic — the diff gate depends on it).

## Steps
1. Read (only these, in order):
   - `design-handoff/UI-CONTRACT.md` §1–§6 + your badge's §8 row
   - `design-handoff/RECIPES.md` — copy snippets verbatim, do not re-derive styles
   - `design-handoff/COPY.md` § {badge} and `design-handoff/INTERACTIONS.md` § {badge}
   - `design-handoff/refs/{badge}-desktop.png` and `-mobile.png` — look at them
   - The target module files from §8. NEVER read the whole .dc.html; only grep
     `data-ref="{badge}-desktop"` for a specific layout question the docs don't answer.
2. Check `design-handoff/GAPS.md` for every element with no obvious mapping. Unlisted + unmapped → stop and ask.
3. Implement. Rules: §2 components only (app wrappers first), zero style={{}}/hex/px, `onPress`, every overlay = Popover desktop / KeyboardSheet mobile (AlertDialog confirms excepted).
4. Gate: `node scripts/visual-diff.mjs {badge}`. On FAIL: open `design-handoff/shots/{badge}-*-diff.png`, identify hot zones, fix, re-run. Iterate until PASS at both widths. Never raise the threshold; never edit the refs.
5. Run `pnpm lint`, the UI-contract grep gate, and `just check-rm`.
6. Fill `design-handoff/PORT-TICKET.md` checklist into the PR body; attach actual + diff shots.

## Known acceptable diffs (do not chase)
- Font antialiasing / sub-pixel text shifts
- Scrollbar presence
- Fixture data differing from prototype sample rows (names/values — layout must still match)
