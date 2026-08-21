# field-notes — HeroUI/app gotchas

Trust these over the docs. When you discover a new one, add it here
(and to `docs/agents/recurring-mistakes.md` if it's a violation class).

## Components

- **HeroUI Chip has no `outline` variant** — valid: `primary | secondary |
  soft | tertiary`, all filled. The neutral outline tag is the app variant
  `className="chip--outline"` (UI-CONTRACT §2).
- **Chip `size="sm"` is 12px** ≈ spec's 11.5px — acceptable; don't fight it.
  (The old tw-merge size-vs-colour collision is gone by construction: sizes are
  `type-*` now, RM-134.)
- **`Page` renders a white Surface** — list screens pass
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
- **HeroUI Drawer geometry is not keyboard-sheet geometry** — its wrapper tracks visual
  viewport height, but the dialog keeps an `85vh` cap and ignores `offsetTop`/viewport
  scroll. Keep `KeyboardSheet`'s custom bottom/max-height math; compose React Aria modal
  semantics underneath it instead of swapping in Drawer.
- **React Aria locks the document, not `Page`'s `.easy_main-content` scroller** — shared
  overlays also need one reference-counted app-scroller lock held through exit unmount.
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
  (The `selected:` Tailwind prefix does not exist in this project — a silent
  no-op; HeroUI signals selection via `data-selected="true"`.) Reference
  implementations: `@components/browse-screen.tsx` (filter row) and
  `training-plans/plan-builder/workout-list.tsx` (workout tabs).
- **`ToggleButtonGroup` JOINS its children — a pill variant must out-specify it** —
  HeroUI sets `.toggle-button-group .toggle-button{border-radius:0}` plus a 24px
  outer pair on `:first-child`/`:last-child`, and its `isDetached` opt-out re-forces
  24px. All three beat a single-class variant. Restate the radius group-scoped
  (`:is()` keeps it compact) AND pass `isDetached`.
- **HeroUI `Tabs.Tab` ships `w-full`** — without an explicit `w-auto` each tab
  stretches to container width and the row overflows off-screen. Computed styles
  look fine; only a screenshot catches it.
- **`Button` inside a grid cell does not stretch** (it's inline-flex) — palette/tile
  grids need `w-full` on the Button or cells collapse to label width.
- **A HeroUI `Button` used as a list ROW imposes 14px / 20px line-height /
  default-foreground on everything inside it** — reset with `type-metric
  font-normal leading-[normal] text-foreground` on the row, or every child
  (including meters) drifts from the page context.
- **A row with a control inside it can't be a `ListBox.Item`** (no interactive
  control inside an option) — use plain elements with two buttons, as the
  nutrition-plan meal-item rows do.
- **`Page.Title` hard-codes `truncate`** — override with `whitespace-normal` when the
  title is a generated summary rather than a name.
- **`ListBox.Label` doesn't exist** — use the top-level `Label` import inside
  `ListBox.Item`. ListBox exposes `Root / Item / ItemIndicator / Section`.
- **HeroUI 3.2.1 has NO `Snippet`** — a copy-link row is `Surface` + mono
  `Typography` + copy `Button` + `toast('Link copied')`.
- **`Meter` needs compound children like `ProgressBar`** —
  `<Meter><Meter.Track><Meter.Fill/></Meter.Track></Meter>`; colors are
  `accent | danger | default | success | warning` (no `primary`).
- **`ProgressBar` renders empty unless given compound children** —
  `<ProgressBar value={100}><ProgressBar.Track><ProgressBar.Fill/></ProgressBar.Track></ProgressBar>`.
  Ratio bars = one ProgressBar per segment in a `flex gap-0.5` row, each wrapped in
  a div with `style={{flexGrow: value}} /* ui-contract-allow */` (the §1 exception;
  the gate skips lines marked `ui-contract-allow`). Drive fill via `value`,
  never `style={{width}}`.
- **`Switch` also renders NOTHING without compound children** —
  `<Switch><Switch.Content><Switch.Control><Switch.Thumb/>…`. React Aria puts
  `data-selected` on the CONTENT label, not the control, so a selected-state
  tint needs `group/switch` + `group-data-[selected=true]/switch:`.
- **`FormActions` owns everything about the action row** — Cancel-outline then
  Save, right-aligned, a ✓ icon on submit, AND the mobile sticky footer. Render it
  bare (`<FormActions ... />`); never wrap it in a sticky div, never add an icon.
  Form fields are likewise already white app-wide. Don't re-fix these per screen.
- **`Typography` has no `body-lg`** (use `body` + weight). Button white-outline =
  `variant="outline"` (Buttons DO have it — only Chip lacks it).
- **Ink-filled CTA** = `<Button className="bg-ink text-ink-foreground">` —
  `--color-ink` is in @theme.
- **`AssignSurface` supports external triggers** — `triggerClassName` /
  `triggerTestId` style+tag the built-in trigger, and
  `isOpen`/`onOpenChange`/`anchorRef` drive it from a ⋯ menu item with no
  trigger of its own.
- **A label + a count inside one control need a literal `{' '}`** — controls are
  `display:flex` with `gap:0` and JSX collapses whitespace between children, so
  `{name}<span>{n}</span>` renders `Upper A3`. `FilterCount` in
  `browse-screen.tsx` documents the trap (RM-140). Check `textContent` on the
  live node, not the source.
- **Biome blocks `onError` on `<img>`** (`noNoninteractiveElementInteractions`) —
  use the repo's message-attachments biome-ignore precedent for broken-image
  fallbacks.

## Theme mechanics

- **Theme pins on vendor classes live in `@layer components`** — there they
  beat HeroUI's defaults but stay overridable by call-site utilities. An
  UNLAYERED rule in index.css beats every utility app-wide and makes the
  property dead at call sites; treat one as a bug, not a technique.
- **A release from an unlayered theme rule must be a `:not()` on that rule** —
  a modifier in `@layer components` cannot beat an unlayered rule (RM-139).
  Toggle any app-owned modifier on a live node and read `getComputedStyle`
  before trusting it.
- **Vendor surfaces are families, not classes** — HeroUI floats composite-widget
  popovers as `<block>__popover` (dropdown, select, autocomplete, date-picker,
  combo-box, date-range-picker, color-picker) WITHOUT the plain `.popover`
  class — a skin written for `.popover` never reaches them. Census the family
  from the live stylesheets before writing the rule:
  `for (sheet of document.styleSheets) … selectorText.match(/[a-z-]+__popover/g)`.
  Same trap for any vendor element skinned by one class name (`__trigger`,
  `__dialog`, …). See RM-174.
- **Type steps are `@utility type-*` blocks that set `line-height: normal`
  themselves** — a text node with a wrong line-height isn't using a `type-*`
  step at all.
- **Size + colour combine freely** — sizes are `type-*` (no tw-merge group),
  so `type-eyebrow text-muted` is safe everywhere, including inside HeroUI
  components. The old `[color:var(--…)]` escalation is banned outright
  (RM-137, gated).
- **`rounded-full` computes `calc(infinity*1px)`** — for a true 999px pill use
  the `--radius-pill` token.
- **`shadow-none` on HeroUI components computes a 5-layer transparent shadow
  stack**, not `none` — use `[box-shadow:none]`.
- **Never bake `[row-gap:normal]` into a shared class recipe** — an arbitrary
  gap property silently beats `gap-*` on every caller that legitimately has a
  gap. Keep such a reset a separate constant applied per node.
- **HeroUI `@theme --color-*` literals are pinned in `index.css @theme`**
  (foreground, muted, surface-tertiary, success, the soft-foregrounds) — check
  there before treating a computed colour as a component bug.
- **Fonts**: fontsource variable families are aliased in index.css as plain
  `"Inter"` / `"Space Grotesk"` @font-face entries; the `--font-*` tokens use
  the plain names.
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
- **Some screens' key states are invisible against mature dev data** — e.g. the
  dashboard setup strip auto-hides once setup is complete. Verifying those
  requires seeding an incomplete workspace or briefly stubbing conditions (mark
  stubs `TEMP-VERIFY` and grep before committing).
- **`403 AccessDenied` on every attachment URL is a CLOCK, not a credential.** A
  presigned URL is signed with the host clock and checked against MinIO's; Docker
  Desktop's VM clock drifts hours behind after the host sleeps, so every URL is
  `Request is not valid yet` and MinIO answers a bare 403. Check
  `curl -sD - http://localhost:9000/minio/health/live | grep -i date`
  against `date -u`; fix by restarting Docker Desktop (the VM clock — a container
  restart does not move it).
- **coachapp access tokens expire in ~5 min** — grab a fresh token right before
  any scripted API call; reload the app tab first to force a refresh. The axi
  `eval` output wraps strings in escaped quotes — strip `\"` or auth silently 401s.
- **`networkidle` never fires on the app** (persistent connections) — Playwright
  waits must be explicit selector waits, and `chrome-devtools-axi` flows should
  wait on content, not network.

## Data seeding

- **Seed data via the app origin's token** —
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
