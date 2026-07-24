# field-notes — HeroUI/app gotchas learned on prior ports

Trust these over the handoff docs. When you discover a new one, add it here
(and to `docs/agents/recurring-mistakes.md` if it's a violation class).

## Components

- **HeroUI Chip has no `outline` variant** (contract §2 is stale there). Valid:
  `primary | secondary | soft | tertiary` — all filled. The redesign's white
  outline chip = `<Chip size="sm" variant="secondary" className="rounded-chip border border-border bg-surface" />`.
- **tw-merge eats `text-chip`** when a text-color class is also present (it
  misreads the custom font-size token as a color). Chip `size="sm"` is 12px ≈
  spec's 11.5px — acceptable; don't fight it.
- **`Page` renders a white Surface** — ported list screens pass
  `<Page className="bg-background">` for the off-white pane until the shell flips
  the default. `ListBox` needs `p-0` and items `rounded-none` inside an R4 card.
- **Truncation inside ListBox items**: HeroUI `Label`/`Description` are blocks in
  a non-stretching flex column — add `max-w-full` alongside `truncate`, and
  `flex-1 min-w-0` on the text column.
- **`Avatar`'s root bg class beats a tone passed to `<Avatar className>`** — put
  tints on `Avatar.Fallback`.
- **Grid children don't shrink** — a `<section>` in `Page.Frame`'s grid needs explicit
  `min-w-0` or wide rows force horizontal page scroll at 390px (invisible at 1240px).
- **`CloseButton` ships a filled circle at rest** — bare `×` needs `bg-transparent`;
  it also takes no `size` prop.
- **`Button variant="secondary"` renders its label in accent** — on dark/ink surfaces
  add explicit `text-foreground`.
- **Selection-mode collections don't fire `onAction`** — a `Dropdown.Menu`/`ListBox`
  with `selectionMode="single"` routes activation through `onSelectionChange` ONLY.
  Wiring `onAction` fails silently. (`question-palette.tsx` avoids it with
  `selectionMode="none"`; `meal-slot-control.tsx` uses onSelectionChange.)
- **`ToggleButton` paints a grey fill at rest** — R3 segmented controls need an
  explicit `bg-transparent` alongside the `data-[selected=true]:bg-ink` pair, or
  unselected segments read grey instead of the spec's white.
- **`Button` inside a grid cell does not stretch** (it's inline-flex) — palette/tile
  grids need `w-full` on the Button or cells collapse to label width.
- **`Page.Title` hard-codes `truncate`** — override with `whitespace-normal` when the
  title is a generated summary rather than a name.
- **`ListBox.Label` doesn't exist** — use the top-level `Label` import inside
  `ListBox.Item`. ListBox exposes `Root / Item / ItemIndicator / Section`.
- **HeroUI 3.2.1 has NO `Snippet`** — GAPS #13's copy row always takes the fallback
  branch (`Surface` + mono `Typography` + copy `Button` + `toast('Link copied')`).
- **`Meter` needs compound children like `ProgressBar`** —
  `<Meter><Meter.Track><Meter.Fill/></Meter.Track></Meter>`; colors are
  `accent | danger | default | success | warning` (no `primary`).
- **`ProgressBar` renders empty unless given compound children** —
  `<ProgressBar value={100}><ProgressBar.Track><ProgressBar.Fill/></ProgressBar.Track></ProgressBar>`.
  Ratio bars = one ProgressBar per segment in a `flex gap-0.5` row, each wrapped in
  a div with `style={{flexGrow: value}} /* ui-contract-allow */` (the §1 exception;
  the gate skips lines marked `ui-contract-allow`).
- **`FormActions` owns everything about the action row** — Cancel-outline then
  Save, right-aligned, a ✓ icon on submit, AND the mobile sticky footer. Render it
  bare (`<FormActions ... />`); never wrap it in a sticky div, never add an icon.
  Form fields are likewise already white app-wide. Don't re-fix these per screen.
- **`Typography` has no `body-lg`** (use `body` + weight). Button white-outline =
  `variant="outline"` (Buttons DO have it — only Chip lacks it).
- **Ink-filled CTA** (spec `background:var(--foreground)`) =
  `<Button className="bg-ink text-ink-foreground">` — `--color-ink` is in @theme.

## style-diff convergence (learned on CD-OV, the first full run)

- **DC runtime normalizes style attributes** on nodes it re-renders (holes/sc-if
  subtrees): `font-weight:700` becomes `font-weight: 700`. Manifest `[style*=]`
  selectors must use colon-free substrings (`[style*='700']`, `[style*='14px']`,
  `[style*='warning-soft']`) or structural paths — never `prop:value` literals.
- **Tailwind v4 custom `--text-*` tokens default line-height to 1.5** — when the
  design leaves line-height untouched (computed `normal`), pair every token with
  `--text-<name>--line-height: normal` or every text node diffs.
- **Wrappers need `[line-height:normal]` + `text-foreground`** — the app body
  inherits `--default-foreground` (0.2103) and preflight's 1.5 line-height; the
  design frames compute `--foreground` (0.17) and `normal`. Set both on the
  screen's top-level containers.
- **HeroUI `@theme --color-*` literals drift from the redesign `:root` vars**
  (foreground, muted, surface-tertiary, success, all three soft-foregrounds).
  Pinned to the design values in `index.css @theme` — check there before
  ledgering a color diff.
- **`rounded-full` computes `calc(infinity*1px)` ≈ 3.4e7px**, the designs write
  `999px` — use the `--radius-pill: 999px` token for design pills.
- **`shadow-none` on HeroUI components computes a 5-layer transparent shadow
  stack**, not `none` — use `[box-shadow:none]`.
- **`gap-0` computes `0px` but a design flex container without gap computes
  `normal`** — use `sm:[column-gap:normal] sm:[row-gap:normal]` to unset.
- **tw-merge eats EITHER the size or the color** when a custom text-size token
  and a text-color utility meet in a HeroUI `className` — apply color as
  `[color:var(--color-…)]` alongside the size token. Plain elements (no
  tw-merge) can combine both classes freely.
- **HeroUI `Tabs.Tab` ships `w-full`** — without an explicit `w-auto` each tab
  stretches to container width and the row overflows off-screen. Style-diff
  can't see this (computed props match); only the screenshot pass catches it.
- **Unlayered CSS beats every utility**: `.typography--h5 { letter-spacing:
  -0.015em }` in index.css wins over any Tailwind class (layers). A node that
  needs the design's `normal` letter-spacing can't be a `Typography` heading.
- **Icon-only buttons with no font rules in the design compute UA defaults**
  (Arial 13.33px 400, padding 1px 6px, gap normal) — match with
  `[font-family:Arial] [font-size:13.3333px] font-normal px-1.5 py-px` etc.;
  invisible on an icon-only node but the script measures it.
- **Fonts**: fontsource variable families are aliased in index.css as plain
  `"Inter"` / `"Space Grotesk"` @font-face entries and the `--font-*` tokens
  use the plain names, so computed font-family matches the designs. Buttons in
  the CD design use the short `Inter, sans-serif` stack → `font-btn` token.
- **Textareas keep UA `padding: 2px`** when the design doesn't reset it — `p-0.5`,
  not `p-0`.
- **Mutating manifest states go LAST** (states run in order, widths inner) and
  need a seed reset before every full run: `mix run priv/repo/dev_client_states.exs`
  restores Rowan White's unreviewed submission + unread messages, and prints the
  per-state client routes.
- **`state.route`** (added to style-diff.mjs) points a state at its own seeded
  client — one client per lifecycle state beats mutating one client between states.
- **`[color:…]` arbitrary property LOSES to a text-color utility in the same
  className** (cascade order, not tw-merge) — when matching a UA-default color
  (design buttons with no color rule compute `rgb(0,0,0)`), drop the text-*
  color class entirely and keep only `[color:black]`.
- **Biome blocks `onError` on `<img>`** (`noNoninteractiveElementInteractions`) —
  use the repo's message-attachments biome-ignore precedent for broken-image
  fallbacks.
- **`querySelector` takes the FIRST match — check what else the selector hits.**
  CD-TR's `.lbrow:not(.tap) div[style*='600']` matched the desktop row's *date
  column* (12px/600), not the title, and reported a phantom font-size diff.
  When a design row has a leading meta column, index structurally
  (`> div:nth-child(2) > div:first-child`) instead of by style substring.
- **Per-width text CONTENT differences need `useIsDesktop()`, not two nodes** —
  duplicating a node with `hidden sm:block` gives the manifest two matches and
  `querySelector` grabs the hidden one, whose computed styles differ.
- **The §5 gate is scoped to files changed vs the branch point** — touching a
  legacy file pulls its pre-existing violations into your port. `border-[1.5px]`
  (arbitrary *value*) trips it; `[border-width:1.5px]` (arbitrary *property*)
  does not, and is the app's existing hairline escape hatch.
- **`AssignSurface` now supports ports**: `triggerClassName` / `triggerTestId`
  style+tag the built-in trigger, and `isOpen`/`onOpenChange`/`anchorRef` drive
  it from a ⋯ menu item with no trigger of its own (CD/TR's Change plan).
- **A HeroUI `Button` used as a list ROW imposes 14px / 20px line-height /
  default-foreground on everything inside it** — the design's row inherits the
  page context instead. Reset with `text-metric font-normal leading-[normal]
  text-foreground` on the row or every child (including meters) diffs. This was
  all 22 of CD/NU's first-pass diffs.
- **`ProgressBar` is the sanctioned meter and needs no `style={{}}`** — give
  `Track`/`Fill` the design's classes and drive width via `value`; the compound
  children are required or it renders empty.
- **`cd` failing in a chained shell command silently skips the `&&` part but
  still runs anything after a newline** — a refactor "succeeded" (build green,
  diff PASS) while its edit had never applied, because the following build
  command ran anyway. Verify a refactor with `git diff --stat`, not just a
  green build.

## Styling / tokens

- **RECIPES.md px arbitrary values** (`rounded-[9px]`, `text-[12.5px]`) would trip
  the §5 gate — the spec values are registered as `@theme` tokens in `index.css`
  instead: `rounded-card/control/chip/nav`, `text-pill`, `text-chip`, `text-muted-2`.
  Use those; register a new token for any new exact spec value (never a px literal).
- **RECIPES R2/R3's `selected:` Tailwind prefix is a silent NO-OP** — no such
  variant exists in this project. HeroUI ToggleButton signals selection via
  `data-selected="true"`, so ink-selected pills/segments need
  `data-[selected=true]:border-ink data-[selected=true]:bg-ink data-[selected=true]:text-ink-foreground data-[selected=true]:font-semibold`.
  Reference implementation: status tabs in `nutrition-plans/list-nutrition-plans.tsx`.
- **When the ref's own desktop/mobile treatments disagree** (e.g. uppercase mobile
  eyebrows vs title-case desktop legends), follow the accepted FO/FD/FE reference
  ports — one treatment at both widths, app convention wins.
- **Fixed-width toolbar filter pills wrap at 390px** — wrap the dropdown in a
  `shrink-0` container with NO fixed width so it hugs its content.

## Browser / verification

- **Viewport emulation remounts the app and resets component state** — screenshotting
  a post-submit state at both widths costs two submissions. `chrome-devtools-axi`
  uids go stale after every action: re-snapshot between steps.
- **`Page` scrolls an inner container, not the window** — `chrome-devtools-axi scroll`
  is a no-op; scroll via `eval` on `.easy_main-content`.
- **Chrome windows can't shrink below ~500px** — mobile checks need viewport
  emulation: `chrome-devtools-axi emulate --viewport "390x844x2,mobile,touch"`
  (desktop: `"1240x900x2"`); reset when done.
- **Driving the app via `eval` + broad `[role=option]` selectors clicks the wrong
  rows** and can scramble test data. Target by `aria-label` prefix, not text.
- **Some screens' key states are invisible against mature dev data** — e.g. DB's
  setup strip auto-hides once setup is complete. Verifying those requires seeding
  an incomplete workspace or briefly stubbing conditions (mark stubs `TEMP-VERIFY`
  and grep before committing).
- **coachapp access tokens expire in ~5 min** — grab APP_TOKEN fresh right before
  each `style-diff.mjs` run; reload the app tab first to force a refresh. The axi
  `eval` output wraps strings in escaped quotes — strip `\"` or auth silently 401s.
- **`networkidle` never fires on the app** (persistent connections) — Playwright
  waits must be explicit `{wait: selector}` steps, and `chrome-devtools-axi`
  flows should wait on content, not network.

## Data seeding

- **Seed ref-matching data via the app origin's token** —
  `fetch('http://localhost:4000/v1/...', {headers:{Authorization:'Bearer '+localStorage.getItem('coachapp.accessToken')}})`
  from `chrome-devtools-axi eval`. The token is a raw JWT string — never JSON.parse it.
- Food serving_sizes need `label` and `is_default`. Recipe ingredients need real
  `food_id`s + `weight_g` for computed totals. Exercises: dev DB has NO custom
  exercises — make one via `POST /v1/coach/training-exercises/{id}/copy` with
  `Content-Type: application/json` and a `{name}` body (422 otherwise); delete after.
- **Exercise `instructions` data embeds `1.`/`2.` enumerators** — numbered-step
  renderers must strip a leading enumerator per line; form textareas leave as-is.
- **Recipe totals live on `recipe.nutrition`** (nullable object) — type segment
  keys via `NonNullable<Recipe['nutrition']>`, not Food's flat per-100g keys.
- **Dev OTP for any login/signup: 123456.**

## Route map (coachapp-v2 — authority is `src/@config/routes.ts`)

DB `/dashboard` · CL `/clients` · IN `/clients/invite`
· EX `/library/exercises` · EP `/library/exercises/:id` · ED `/library/exercises/:id/edit`
· FO `/library/foods` · FD `/library/foods/:id` · FE `/library/foods/:id/edit`
· RC `/library/recipes` · RD `/library/recipes/:id` · RE `/library/recipes/:id/edit`
· NP `/library/nutrition-plans` · NE `/library/nutrition-plans/:id/edit` · NB `/library/nutrition-plans/:id` (builder = detail)
· TR `/library/training-plans` · TE `/library/training-plans/:id/edit` · TB `/library/training-plans/:id` (builder = detail)
· FM `/library/check-ins` · FB `/library/check-ins/:id/edit` · ST `/settings`
· CD `/clients/:id` (+ sub-routes per CLIENT-DETAIL.md screen inventory)

For `:id` routes, pick any existing entity from the running app's list screen.
