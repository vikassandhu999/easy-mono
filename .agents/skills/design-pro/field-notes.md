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
