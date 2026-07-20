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

1. **Render** both widths (screenshots go to the scratchpad dir). Chrome windows
   can't shrink below ~500px, so `resize` is wrong for mobile — use viewport
   emulation, and reset it when done:
   ```
   chrome-devtools-axi open http://localhost:2021/{route}
   chrome-devtools-axi emulate --viewport "1240x900x2" && chrome-devtools-axi screenshot {scratch}/{badge}-desktop.png
   chrome-devtools-axi emulate --viewport "390x844x2,mobile,touch" && chrome-devtools-axi screenshot {scratch}/{badge}-mobile.png
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

## Field notes (learned on prior ports — trust these over the handoff docs)

- **HeroUI Chip has no `outline` variant** (contract §2 is stale there). Valid:
  `primary | secondary | soft | tertiary` — all filled. The redesign's white
  outline chip = `<Chip size="sm" variant="secondary" className="rounded-chip border border-border bg-surface" />`.
- **RECIPES.md px arbitrary values** (`rounded-[9px]`, `text-[12.5px]`) would trip
  the §5 gate — the spec values are registered as `@theme` tokens in `index.css`
  instead: `rounded-card/control/chip/nav`, `text-pill`, `text-chip`, `text-muted-2`.
  Use those.
- **tw-merge eats `text-chip`** when a text-color class is also present (it
  misreads the custom font-size token as a color). Chip `size="sm"` is 12px ≈
  spec's 11.5px — acceptable; don't fight it.
- **`Page` renders a white Surface** — ported list screens pass
  `<Page className="bg-background">` for the off-white pane until the shell flips
  the default. `ListBox` needs `p-0` and items `rounded-none` inside an R4 card.
- **Truncation inside ListBox items**: HeroUI `Label`/`Description` are blocks in
  a non-stretching flex column — add `max-w-full` alongside `truncate`, and
  `flex-1 min-w-0` on the text column.
- **Some screens' key states are invisible against mature dev data** — DB's setup
  strip auto-hides once setup is complete and its check-ins banner needs a non-empty
  review queue. Verifying those requires seeding an incomplete workspace or briefly
  stubbing the conditions (mark stubs `TEMP-VERIFY` and grep before committing).
- **`Avatar`'s root bg class beats a tone passed to `<Avatar className>`** — put
  tints on `Avatar.Fallback`.
- **Grid children don't shrink** — a `<section>` in `Page.Frame`'s grid needs explicit
  `min-w-0` or wide rows force horizontal page scroll at 390px (invisible at 1240px).
- **`CloseButton` ships a filled circle at rest** — bare `×` needs `bg-transparent`.
- **`Button variant="secondary"` renders its label in accent** — on dark/ink surfaces
  add explicit `text-foreground`.
- **Selection-mode collections don't fire `onAction`** — a `Dropdown.Menu`/`ListBox`
  with `selectionMode="single"` routes activation through `onSelectionChange` ONLY.
  Wiring `onAction` fails silently. (`question-palette.tsx` avoids it with
  `selectionMode="none"`; `meal-slot-control.tsx` uses onSelectionChange.)
- **Driving the app via `eval` + broad `[role=option]` selectors clicks the wrong
  rows** and can scramble your test data. Target by `aria-label` prefix, not text.
- **`ToggleButton` paints a grey fill at rest** — R3 segmented controls need an
  explicit `bg-transparent` alongside the `data-[selected=true]:bg-ink` pair, or
  unselected segments read grey instead of the spec's white.
- **`Button` inside a grid cell does not stretch** (it's inline-flex) — palette/tile
  grids need `w-full` on the Button or cells collapse to label width.
- **`Page.Title` hard-codes `truncate`** — override with `whitespace-normal` when the
  title is a generated summary rather than a name.
- **`ListBox.Label` doesn't exist** — use the top-level `Label` import inside
  `ListBox.Item`. ListBox exposes `Root / Item / ItemIndicator / Section`.
- **`Page` scrolls an inner container, not the window** — `chrome-devtools-axi scroll`
  is a no-op; scroll via `eval` on `.easy_main-content`.
- **HeroUI 3.2.1 has NO `Snippet`** — GAPS #13's copy row always takes the fallback
  branch (`Surface` + mono `Typography` + copy `Button` + `toast('Link copied')`).
- **`Meter` needs compound children like `ProgressBar`** —
  `<Meter><Meter.Track><Meter.Fill/></Meter.Track></Meter>`; colors are
  `accent | danger | default | success | warning` (no `primary`).
- **Viewport emulation remounts the app and resets component state** — screenshotting
  a post-submit/`sent` state at both widths costs two submissions. And
  `chrome-devtools-axi` uids go stale after every action: re-snapshot between steps.
- **`ProgressBar` renders empty unless given compound children** —
  `<ProgressBar value={100}><ProgressBar.Track><ProgressBar.Fill/></ProgressBar.Track></ProgressBar>`.
  Ratio bars = one ProgressBar per segment in a `flex gap-0.5` row, each wrapped in
  a div with `style={{flexGrow: value}} /* ui-contract-allow */` (the §1 exception;
  the gate skips lines marked `ui-contract-allow`).
- **`FormActions` owns everything about the action row** — Cancel-outline then
  Save, right-aligned, a ✓ icon on submit, AND the mobile sticky footer. Render it
  bare (`<FormActions ... />`); never wrap it in a sticky div, never add an icon.
  Form fields are likewise already white app-wide. Don't re-fix these per screen.
- **`CloseButton` takes no `size` prop**; `Typography` has no `body-lg` (use
  `body` + weight). Button white-outline = `variant="outline"` (Buttons DO have
  it — only Chip lacks it).
- **Ink-filled CTA** (spec `background:var(--foreground)`) =
  `<Button className="bg-ink text-ink-foreground">` — `--color-ink` is in @theme.
- **Seeding ref-matching data**: POST via the app origin's token —
  `fetch('http://localhost:4000/v1/...', {headers:{Authorization:'Bearer '+localStorage.getItem('coachapp.accessToken')}})`
  from `chrome-devtools-axi eval`. The token is a raw JWT string — never JSON.parse it.
  Food serving_sizes need `label` and `is_default`. Recipe ingredients need real
  `food_id`s + `weight_g` for computed totals. Exercises: dev DB has NO custom
  exercises — make one via `POST /v1/coach/training-exercises/{id}/copy` with
  `Content-Type: application/json` and a `{name}` body (422 otherwise); delete after.
- **Exercise `instructions` data embeds `1.`/`2.` enumerators** — numbered-step
  renderers must strip a leading enumerator per line; form textareas leave as-is.
- **Fixed-width toolbar filter pills wrap at 390px** — wrap the dropdown in a
  `shrink-0` container with NO fixed width so it hugs its content.
- **Recipe totals live on `recipe.nutrition`** (nullable object) — type segment
  keys via `NonNullable<Recipe['nutrition']>`, not Food's flat per-100g keys.
- **RECIPES R2/R3's `selected:` Tailwind prefix is a silent NO-OP** — no such
  variant exists in this project. HeroUI ToggleButton signals selection via
  `data-selected="true"`, so ink-selected pills/segments need
  `data-[selected=true]:border-ink data-[selected=true]:bg-ink data-[selected=true]:text-ink-foreground data-[selected=true]:font-semibold`.
  The reference implementation is the status tabs in `nutrition-plans/list-nutrition-plans.tsx`.
- **When the ref's own desktop/mobile treatments disagree** (e.g. uppercase mobile
  eyebrows vs title-case desktop legends), follow the accepted FO/FD/FE reference
  ports — one treatment at both widths, app convention wins.

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
