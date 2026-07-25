# field-notes — HeroUI/app gotchas learned on prior ports

Trust these over the handoff docs. When you discover a new one, add it here
(and to `docs/agents/recurring-mistakes.md` if it's a violation class).

## Components

- **HeroUI Chip has no `outline` variant** (contract §2 is stale there). Valid:
  `primary | secondary | soft | tertiary` — all filled. The redesign's white
  outline chip = `<Chip size="sm" variant="secondary" className="rounded-chip border border-border bg-surface" />`.
- **Chip `size="sm"` is 12px** ≈ spec's 11.5px — acceptable; don't fight it.
  (The old tw-merge size-vs-colour collision is gone by construction: sizes are
  `type-*` now, RM-134.)
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
- **Ink-selected pills/segments are theme variants, not class strings** — use
  `.toggle-button--ink` (always a pill) or `.toggle-button--filter` (underline
  below `sm`); the variant owns rest fill, selected fill and foreground.
  Re-assembling the old `data-[selected=true]:bg-ink` string is gated (RM-136).
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

- **Before flagging a whole node as "design wrong", prove the rule is absent.**
  Cheap check: extract every class the dc.html uses and diff against the classes
  its inline `<style>` defines —
  `grep -o 'class="[^"]*"' | ...` vs `<style>` block. Client Detail used 38 and
  defined 36; the 2 undefined ones (`.attnchip`, `.chip.def`) were exactly the
  42 diff keys. Dashboard Redesign defines all 39, which is why the whole
  21-badge campaign never hit this.
- **The `_ds/…` stylesheets the dc.html links are NOT in the repo** and 404 on
  every render — but they are TOKEN files only (`:root` custom properties from
  the Claude Design project, fetchable via `DesignSync get_file`). They define
  no component classes, and each frame's `.vp` block self-defines its colour
  tokens, so the missing links do not affect the diff. Don't chase them.

- **DC runtime normalizes style attributes** on nodes it re-renders (holes/sc-if
  subtrees): `font-weight:700` becomes `font-weight: 700`. Manifest `[style*=]`
  selectors must use colon-free substrings (`[style*='700']`, `[style*='14px']`,
  `[style*='warning-soft']`) or structural paths — never `prop:value` literals.
- **Type steps are `@utility type-*` blocks that set `line-height: normal`
  themselves** — the old `--text-*--line-height` pairing is gone with the
  namespace. A text node still diffing on line-height means it isn't using a
  `type-*` step at all.
- **Wrappers need `[line-height:normal]` + `text-foreground`** — the app body
  inherits `--default-foreground` (0.2103) and preflight's 1.5 line-height; the
  design frames compute `--foreground` (0.17) and `normal`. Set both on the
  screen's top-level containers.
- **HeroUI `@theme --color-*` literals drift from the redesign `:root` vars**
  (foreground, muted, surface-tertiary, success, all three soft-foregrounds).
  Pinned to the design values in `index.css @theme` — check there before
  flagging a color diff as a design conflict.
- **`rounded-full` computes `calc(infinity*1px)` ≈ 3.4e7px**, the designs write
  `999px` — use the `--radius-pill: 999px` token for design pills.
- **`shadow-none` on HeroUI components computes a 5-layer transparent shadow
  stack**, not `none` — use `[box-shadow:none]`.
- **`gap-0` computes `0px` but a design flex container without gap computes
  `normal`** — use `sm:[column-gap:normal] sm:[row-gap:normal]` to unset.
- **Size + colour combine freely now** — sizes are `type-*` (no tw-merge group),
  so `type-eyebrow text-muted` is safe everywhere, including inside HeroUI
  components. The old `[color:var(--…)]` escalation is banned outright
  (RM-137, gated) — it was scar tissue from the pre-`type-*` collision.
- **HeroUI `Tabs.Tab` ships `w-full`** — without an explicit `w-auto` each tab
  stretches to container width and the row overflows off-screen. Style-diff
  can't see this (computed props match); only the screenshot pass catches it.
- **Theme pins on vendor classes live in `@layer components`** — there they
  beat HeroUI's defaults but stay overridable by call-site utilities. An
  UNLAYERED rule in index.css beats every utility app-wide and makes the
  property dead at call sites; treat one as a bug, not a technique.
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
- **Don't chase UA-default colours from the prototype** — a design button with
  no color rule computes `rgb(0,0,0)`, but arbitrary `color:` properties are
  banned (RM-137, gated) and the theme wins: use the nearest `text-*` token or
  flag the pair as a design conflict.
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
- **`check-ui-contract.sh` does NOT see untracked files** — it diffs
  `git diff --name-only $BASE`, so a brand-new screen passes the gate before its
  first commit and only fails on the NEXT branch. `git add -N` (or just commit)
  before trusting a green gate on a new file.
- **`:first-of-type` counts by TAG, not by class** — `> .card:first-of-type`
  matched nothing in CD-SD because a non-card div precedes the cards. Index with
  `> div:nth-child(n)` when siblings are mixed.
- **A HeroUI `Button` used as a list ROW imposes 14px / 20px line-height /
  default-foreground on everything inside it** — the design's row inherits the
  page context instead. Reset with `type-metric font-normal leading-[normal]
  text-foreground` on the row or every child (including meters) diffs. This was
  all 22 of CD/NU's first-pass diffs.
- **`Switch` also renders NOTHING without compound children** — it joins
  `ProgressBar`/`Meter`: `<Switch><Switch.Content><Switch.Control><Switch.Thumb/>
  …`. And react-aria puts `data-selected` on the CONTENT label, not the control,
  so a selected-state tint needs `group/switch` + `group-data-[selected=true]/switch:`.
- **`ProgressBar` is the sanctioned meter and needs no `style={{}}`** — give
  `Track`/`Fill` the design's classes and drive width via `value`; the compound
  children are required or it renders empty.
- **A design flag can be global across BOTH frames** — CD's `showCS` opens the
  overlay in the desktop AND mobile frame, so a second click on the mobile list
  is intercepted by the mobile overlay. One click is enough; and any state that
  runs after it must reset the page (`{eval: "location.reload()"}`) because
  states share one design page and `markReviewed` also closes the overlay.
- **Fixtures must be self-restoring, not just self-creating** — a check-in
  schedule appeared on the "fresh" client mid-session and silently broke both
  CD-OV `fresh` and CD-CI `no-schedule`. `dev_client_states.exs` now DELETES
  schedules for that client on every run, alongside the unreviewed-submission
  reset. If a state depends on the absence of something, seed the absence.
- **A shared wrapper silently swallows `data-testid`** — passing it to a
  component whose props type doesn't declare it type-checks (JSX allows
  `data-*`) but never reaches the DOM, so manifests report MISSING APP NODE.
  Give shared components an explicit `testId` prop.
- **`cd` failing in a chained shell command silently skips the `&&` part but
  still runs anything after a newline** — a refactor "succeeded" (build green,
  diff PASS) while its edit had never applied, because the following build
  command ran anyway. Verify a refactor with `git diff --stat`, not just a
  green build.

## style-diff convergence (learned on NB, the first Dashboard-family manifest)

- **`Dashboard Redesign.dc.html` never defines `--surface-tertiary`, `--warning`,
  `--danger` or `--success`** — only accent / background / surface / foreground /
  muted / border / ink. Any declaration referencing them is *invalid at
  computed-value time*, so the property falls back to its INITIAL value, **not to
  the helper class's value**: `background: color-mix(…var(--warning)…)` computes
  `transparent` (not `.ptag`'s `var(--background)`) and `border-color` computes
  `currentColor`. When a node diffs on exactly these, check `refs/<ID>.png` — if
  the ref shows the intended tint, the render is broken (flag it as a design
  conflict); if the ref agrees with the render, match the render.
- **`Disclosure.Body`'s `.disclosure__body` is unlayered** — its padding beats
  every utility. Put a plain `div` inside `Disclosure.Content` instead.
- **Collapsed `Disclosure` bodies still render** — a static `data-testid` inside
  one resolves to N nodes and `querySelector` takes the first (hidden) one. Gate
  body-level anchors on the card's `open` flag.
- **Never bake `[row-gap:normal]` into a shared class recipe** — it silently
  beats `gap-*` on every caller that legitimately has a gap. Keep the reset a
  separate constant (`NO_GAP`) applied per node.
- **`margin-left: auto` is not a style, it's a measurement** — the value is the
  remaining space, so it accumulates the sub-pixel text advance of every sibling
  to its left (the design page renders in a fallback font; the app renders its
  bundled Inter). NB's weekday row landed 0.53px off with every other property
  equal. Don't map auto-margined nodes — the diff is unfixable noise.
- **Single-frame screens: run `--width desktop`.** The Dashboard NB section has
  no mobile frame, so every pair is `widths: ["desktop"]` — but the script still
  navigates and replays every state at 390px, doubling the run and pushing it
  past the ~5-minute token TTL (later states fail with a bare selector timeout
  that looks like a selector bug).
- **The manifest drives a LIVE builder, so states mutate the fixture** — a run
  left the plan two days short and one meal heavy. `backend/priv/repo/dev_nutrition_builder.exs`
  deletes and rebuilds the NB plan every run; run it before every pass. Give the
  fixture the SAME content as the frame (two days, same tab labels), or
  layout-derived numbers drift.
- **Alphabetical fixture data can flip a state** — the first six foods in the dev
  library are chocolate and crisps, so the seeded day blew past its target and
  the energy bar rendered in `warning`. The seed filters to 20–200 kcal/100g.
- **`oldest()` ties when a seed writes N rows in one second** — `timestamps(type:
  :utc_datetime)` truncates to the second and the tie-break is the (random) UUID,
  so TB's builder opened a different workout tab on every run and the mapped
  nodes moved with it. Stagger `inserted_at` explicitly in fixture seeds.
- **Per-width duplicates break lookups, and `waitForSelector` says so plainly** —
  "locator resolved to 2 elements. Proceeding with the first one" plus a timeout
  means a `hidden sm:block` / `sm:hidden` pair, not a bad selector. Render once
  with `useIsDesktop()`.
- **A parallel column of buttons beside a `ListBox` only lines up while both
  columns' rows are the same height.** TB's set `×` (22px in the design) drifted
  from its 44px row. When the design puts a control *inside* a row, the row
  can't be a `ListBox.Item` (no interactive control inside an option) — use
  plain elements with two buttons, as the NB meal-item rows do.
- **Don't bake a gap reset into a shared "inline link" recipe either** — NB's
  affordances are bare spans (gap `normal`), TB's `Add exercise` carries an icon
  and a 6px gap. An arbitrary `[row-gap:normal]` can't be overridden by a
  `gap-*` utility, so the odd one out states its own classes.

## Styling / tokens

- **RECIPES.md px arbitrary values** (`rounded-[9px]`, `text-[12.5px]`) would trip
  the gate — snap them to the CLOSED scale instead: type steps via `type-*`
  (11/14/16/19/22/27/30) and radii via `rounded-chip/control/panel/card` + pill.
  Never register a new token for an exact spec value — that's what grew the
  theme 81 → 164 (RM-132); nothing within ±2px means STOP and propose.
- **RECIPES R2/R3's `selected:` Tailwind prefix is a silent NO-OP** — no such
  variant exists in this project. HeroUI ToggleButton signals selection via
  `data-selected="true"`, and the ink-selected look is the theme's
  `.toggle-button--ink` / `--filter` variant — hand-writing the
  `data-[selected=true]:*` string is gated (RM-136). Reference implementations:
  `@components/browse-screen.tsx` (filter row) and
  `training-plans/plan-builder/workout-list.tsx` (workout tabs).
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
