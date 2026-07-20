# /port-screen — port one redesign screen to exact spec

Usage: `/port-screen XX` — badge from `design-handoff/UI-CONTRACT.md` §8
(DB CL IN EX EP ED FO FD FE RC RD RE NP NE NB TR TE TB FM FB ST).

Target app: `frontend/apps/coachapp-v2`. This is a **presentation-only** port:
routing, data hooks (RTK Query in `src/api/*`), and behavior already exist and work.
You restyle the screen to match the redesign. You never re-architect data, never
touch `src/api/*` wiring, never port more than this one badge.

## 0. Preconditions — fail fast, in order

1. **Theme installed:** `grep -q 'canvas' frontend/apps/coachapp-v2/src/index.css`.
   If missing, STOP: merging `design-handoff/theme.css` into `src/index.css` is its
   own global change that must land before any screen port. Say so and do that
   instead (or ask).
2. **App running:** coachapp dev server on `http://localhost:2021` (`just web`, or
   `pnpm dev` in the app dir). Real dev-backend data is fine — content does not
   need to match the reference images, layout does. Dev OTP for any login: 123456.
3. **Browser bridge:** `chrome-devtools-axi pages` responds; reuse an existing
   authenticated tab. Never clear cookies/storage.

## 1. Read — only these, in this order

1. `design-handoff/UI-CONTRACT.md` §1–§6 entirely, plus your badge's §8 row
   (it names the exact codebase files you'll edit).
2. `frontend/apps/coachapp-v2/AGENTS.md` — Canonical Components, Page Anatomy,
   Choosing Containers. Where it overlaps the contract, AGENTS.md wins.
3. `design-handoff/RECIPES.md` — golden snippets for pills, list rows, chips,
   status cells. Copy verbatim; do not re-derive styles.
4. `design-handoff/COPY.md` § {badge} — exact strings, use verbatim.
   `design-handoff/INTERACTIONS.md` § {badge} — behavior the pictures can't show.
5. `design-handoff/refs/{badge}-desktop.png` and `refs/{badge}-mobile.png` —
   **actually look at them** (Read tool). These are the acceptance target.
6. The target module files from the §8 row.

Do NOT read `design-handoff/design/Dashboard Redesign.dc.html` yet — it's the
escalation path in step 4, not an input.

## 2. Gap check

For every visual element with no obvious §2 component mapping, check
`design-handoff/GAPS.md`. Listed → follow its resolution exactly.
Not listed → STOP and ask the user; never improvise a component or hand-style a div.

## 3. Implement

- §2 components only; app wrappers (`@/@components/*`, `@/builder-kit/*`) before raw HeroUI.
- Zero `style={{}}`, zero hex, zero `px/rem` arbitrary values, zero numbered color
  scales. Tokens per §3; helper-class translations per §4.
- `onPress` never `onClick`; icon-only buttons get `aria-label`; 44px targets on mobile.
- Every overlay: `Popover` desktop / `KeyboardSheet` mobile (one shared content
  component); confirms are `AlertDialog` on both.
- All states: loading via `ListSkeleton`/`PageSkeleton` (never a centered spinner),
  empty, error (`ErrorState`/`Alert`), plus interactive states from INTERACTIONS.md.
- Data through existing hooks. No `useEffect` fetching, no prototype sample arrays.

## 4. Visual convergence loop — this is what makes the port succeed

Iterate until you cannot name a difference. Minimum two full iterations; the first
render always has drift.

1. **Render** both widths (batch with `run`; screenshots go to the scratchpad dir):
   ```
   chrome-devtools-axi run 'resize 1240 900; open http://localhost:2021/{route}; wait 800; screenshot {scratch}/{badge}-desktop.png'
   chrome-devtools-axi run 'resize 390 844; wait 400; screenshot {scratch}/{badge}-mobile.png'
   ```
2. **Compare:** Read your screenshot and the matching `refs/{badge}-*.png` in the
   same message. Write down every concrete mismatch as a list: layout structure,
   spacing rhythm, alignment, visual hierarchy, surface/background layering,
   chip/pill styles, typography (face/weight/size), iconography, states shown.
   Sample-data differences (names, numbers, counts) are NOT mismatches — layout
   around them must still hold.
3. **Fix** every named mismatch in code. Hot-reload picks it up.
4. **Re-render and re-compare.** Exit the loop only when a fresh comparison at BOTH
   widths yields an empty mismatch list.

**Escalation — when the PNG doesn't tell you what the design intends** (exact
structure, an ambiguous grouping, a state you can't see): grep the spec slice —
`grep -n 'data-screen-label="{badge}"' 'design-handoff/design/Dashboard Redesign.dc.html'`
— and read only that section (100–250 lines, desktop + mobile frames). It is a
spec, not source: extract its *decisions*, then express them via UI-CONTRACT §3/§4
components and tokens. Never copy its markup, classes, or `var(--*)` values.

Known acceptable diffs (do not chase): font antialiasing, scrollbar presence,
real data differing from the prototype's sample rows.

## 5. Gates — all must pass

```
./scripts/check-ui-contract.sh          # §5 grep gate on your changed files
cd frontend && pnpm lint                # Biome
./scripts/check-rm.sh                   # recurring-mistakes ledger
```

Then self-check against UI-CONTRACT §6 (Definition of Done) line by line, and
verify copy matches COPY.md § {badge} verbatim.

## 6. Finish

- Fill the `design-handoff/PORT-TICKET.md` checklist into the PR/commit body.
- Attach the final desktop + mobile screenshots.
- Note any agreed deviations (from step 2 stop-and-asks) under "Notes / deviations".
- One badge per branch. If you discovered a workflow problem (wrong route, missing
  fixture, ambiguous doc), record it in the PR notes so this command gets fixed —
  don't silently work around it.

## Route map (badge → route, from `src/@config/routes.ts`)

DB `/dashboard` · CL `/clients` · IN `/clients/invite`
· EX `/library/exercises` · EP `/library/exercises/:id` · ED `/library/exercises/:id/edit`
· FO `/library/foods` · FD `/library/foods/:id` · FE `/library/foods/:id/edit`
· RC `/library/recipes` · RD `/library/recipes/:id` · RE `/library/recipes/:id/edit`
· NP `/library/nutrition-plans` · NE `/library/nutrition-plans/:id/edit` · NB `/library/nutrition-plans/:id` (builder = detail)
· TR `/library/training-plans` · TE `/library/training-plans/:id/edit` · TB `/library/training-plans/:id` (builder = detail)
· FM `/library/check-ins` · FB `/library/check-ins/:id/edit` · ST `/settings`

For `:id` routes, pick any existing entity from the running app's list screen.
If a route 404s, check `src/@config/routes.ts` — it is the authority.
