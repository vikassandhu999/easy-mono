# UI-CONTRACT.md — CoachEasy → HeroUI v3 implementation contract

**Read this before touching any screen.** Structure, routing, and data are already built in `coachapp-v2/`. Your job when implementing a prototype screen is **presentation only**: render the existing data with the components below, matching the prototype's layout and states. Do **not** re-architect data, and do **not** hand-build UI out of styled `<div>`s.

The prototype file (`Dashboard Redesign.dc.html`) is a **spec, not source**. It is inline-styled on purpose. Never copy its markup, CSS, helper classes, or `var(--*)` values into the app. Translate its *decisions* (layout, interaction, copy, states) into the components here.

This contract **layers on top of `coachapp-v2/AGENTS.md`** — read that first; where they overlap, AGENTS.md wins. In particular its Canonical Components, Page Anatomy, and Choosing Containers sections are part of this contract.

---

## 0. The one rule

> If a UI need is not covered by a component in §2, **stop and ask** — do not build it from raw elements + styling.

Everything visual comes from HeroUI v3 (default theme, `@heroui/react` 3.2.1) and its tokens, **behind the app's canonical wrappers where one exists**. Precedence: app wrapper (`@/@components/*`, `@/builder-kit/*`) → raw HeroUI → stop and ask. You are working inside a fence; §2 is the fence.

---

## 1. Hard prohibitions (enforced by lint/CI — see §5)

- ❌ No `style={{ }}` prop in `src/**`. Exception: a single genuinely dynamic value that cannot be a token (a live width `%`, a computed `transform`). Allowlisted case-by-case in review — never for color, spacing, radius, font, or shadow.
- ❌ No hardcoded values: no hex colors, no `px`/`rem`/`em` literals inside Tailwind arbitrary values (`w-[240px]`, `text-[#111]`, `p-[13px]`). Use tokens / semantic classes / component defaults.
- ❌ No numbered color scales (`bg-primary-500`, `text-neutral-700`). Semantic tokens only (§3).
- ❌ No `@nextui-org/*`, no `HeroUIProvider`, no `framer-motion`, no Tailwind-v3 plugin config. These are HeroUI **v2** patterns and are forbidden in v3.
- ❌ No raw `<button>`, `<input>`, `<select>`, `<table>`, `<dialog>` for anything HeroUI covers. Use the component.
- ❌ No `onClick` on interactive HeroUI primitives — use `onPress`.
- ❌ No react-aria `NumberField` — it races mobile soft keyboards. Numeric entry is always `NumberInput` / `FormNumberField` (see §2).
- ❌ No custom CSS files / CSS modules / styled-components for component styling. Layout utilities (flex/grid/gap via Tailwind semantic classes) are fine; visual styling comes from components + tokens.

If you find yourself reaching for any of these, the design maps to a component you haven't used yet — check §2 and §4.

---

## 2. Component vocabulary (closed list)

Import from `@heroui/react` — **but check the app-wrapper table first**; if a wrapper exists, the raw primitive is the wrong answer. Follow the compound (dot-notation) API exactly.

### App canonical wrappers (use these before raw HeroUI)
| Need | Wrapper | Where |
|---|---|---|
| Page scaffold (header/title/toolbar) | `Page` | `@/@components/page` |
| Form scaffold + submit row | `FormLayout`, `FormActions`, `FieldRow` | `@/@components/form-fields/*` |
| Text / number / select / textarea fields in forms | `FormTextField`, `FormNumberField`, `FormSelectField`, `FormTextAreaField` | `@/@components/form-fields/*` |
| Numeric entry anywhere | `NumberInput` | `@/@components/number-input` — **never** react-aria `NumberField` |
| Browse/search lists (skeleton + error + empty + load-more baked in) | `BrowseListBox` | `@/@components/browse-list-box` |
| Loading states | `ListSkeleton`, `PageSkeleton` | `@/@components/*` — never a centered spinner on first load |
| Page-level fetch error | `ErrorState` | `@/@components/error-state` |
| Back affordance | `BackButton` + `useGoBack` | `@/@components/back-button` |
| Mobile bottom sheet | `KeyboardSheet` | `@/builder-kit/keyboard-sheet` |
| Search-picker (responsive popover/sheet) | `SearchPickerSheet` | `@/builder-kit/search-picker-sheet` |
| Client picker | `ClientPicker` | `@/@components/client-picker` |
| Save/fail feedback | `toast` (lowercase import from `@heroui/react`) via `mutation-toast` helpers | `@/@components/mutation-toast` |

### Actions & inputs
| Need | Component | Canonical usage |
|---|---|---|
| Any button | `Button` | `<Button variant="primary" onPress={fn}>Save</Button>` — variants: `primary \| secondary \| tertiary \| outline \| ghost \| danger`. Icon-only ⇒ add `aria-label`. |
| Text / number field | `FormTextField` / `FormNumberField` in forms; raw `TextField` (+ `Input`, `Label`, `Description`, `FieldError`) only outside react-hook-form | Never a bare `<input>`; never react-aria `NumberField`. |
| Multi-line | `FormTextAreaField` in forms; raw `TextArea` otherwise | Note the casing: `TextArea`, not `Textarea`. |
| Search box | `SearchField` | list/library search rows — has built-in clear. |
| Dropdown select | `FormSelectField` in forms; raw `Select` + `ListBox` otherwise | single-select (form "Type", set-editor units). |
| Boolean toggle | `Switch` | settings/required toggles that read as on/off. |
| Checkbox | `Checkbox` | multi-select rows, "required" where a check reads better. |
| Single choice | `RadioGroup` + `Radio` | 2–3 exclusive options. |
| Segmented control / weekday chips / set-type | `ToggleButton`/`ToggleButtonGroup` (already the app pattern — see `client-weight.tsx`, `list-checkins.tsx`); `Tabs` for view switching | prototype `.segbtn`, `.daytab`, `.wday`, plan/day switches. |

### Containers & structure
| Need | Component | Canonical usage |
|---|---|---|
| Card surface | `Card` (+ `Card.Header`, `Card.Title`, `Card.Description`, `Card.Content`, `Card.Footer`); `Surface` for lower-level surfaces (see `page.tsx`) | prototype `.card`. Default radius/border/shadow — add none. |
| Headings / body text | `Typography` | the app's text primitive — don't hand-style `<h2>`/`<p>`. |
| Tab navigation | `Tabs` (+ `Tabs.List`, `Tabs.Tab`, `Tabs.Panel`) | Settings rail + mobile underline tabs, library status tabs. |
| Collapsible | `Disclosure` | meal cards, workout cards, form sections (AGENTS.md prefers `Disclosure`; no `Accordion` in the app). |
| Entity lists (clients, plans, foods, roster) | `ListBox` (+ `Label`, `Description`) via `BrowseListBox` for fetched lists | this is the app's list idiom — **not** `Table`. |
| Data table | `Table` (+ `Table.Header/Row/Column/Cell`) | program-sheet grid, session detail — desktop only; cards/lists or horizontal scroll on mobile (AGENTS.md). |
| Form sections | `Fieldset` + `Legend` (+ `Form`, `ErrorMessage`) | never a styled `<section>`. |
| Divider | `Separator` | never a styled `<hr>`/border div. |
| Breadcrumbs | `Breadcrumbs` | detail/edit back-trails if used. |

### Overlays
| Need | Component | Canonical usage |
|---|---|---|
| Confirm / destructive / simple dialog | `AlertDialog` (+ `useOverlayState`) | delete day, deactivate trainer, cancel subscription, add seats. The app has **no `Modal`** — keyboard-heavy work goes to a page, not a dialog (AGENTS.md Choosing Containers). |
| Anchored panel (desktop) | `Popover` | inline "assign workout", slot picker, `.bmenu` rich panels. |
| Action menu | `Dropdown` / `Menu` (+ items, shortcuts, danger item) | the `.bmenu` ⋯ menus (rename/move/duplicate/remove). |
| Transient notice | `toast` (lowercase import) + `@/@components/mutation-toast` helpers | save/added/failed feedback. App-shell already renders the toast region — never add a provider. |
| Hover label | `Tooltip` | icon-button affordances — never hover-only actions (44px targets). |
| **Mobile bottom sheet** | `KeyboardSheet` (`@/builder-kit/keyboard-sheet`) | every mobile picker/invite/amount/add-seats flow. |
| **Responsive overlay (every overlay)** | one content component + one control wrapper: `Popover` on desktop, `KeyboardSheet` on mobile (`useIsDesktop`) | mirror `plan-assign-control.tsx` / `food-picker-control.tsx` / `SearchPickerSheet`. Applies to **all** overlays — pickers, invite, amount, add-seats, assign — not just pickers. Only exception: `AlertDialog` confirms stay centered dialogs on both breakpoints. Never desktop-only or centered-modal flows. |

### Feedback & display
| Need | Component | Canonical usage |
|---|---|---|
| Status/label pill | `Chip` | prototype `.ptag` and dot statuses. `variant="soft" color="success\|warning\|danger\|default"` for status; `variant="outline"` for neutral tags. |
| Count / dot overlay | `Badge` | nav unread counts, notification dots. |
| User avatar | `Avatar` | initials fallback; prototype `.av`. |
| Determinate progress | `ProgressBar` | macro meters, seat-usage meter, kcal line. |
| Loading placeholder | `Skeleton` via `ListSkeleton` / `PageSkeleton` | list/detail loading states (required — see §6). |
| Spinner | `Spinner` | inline/button pending. |
| Inline status banner | `Alert` (info/success/warning/danger) | "used in N places", awaiting-seat warning, form errors. |
| Styled anchor | `Link` | in-text links. |

**Icons:** `lucide-react` (already a dependency), thin/medium stroke. No icon fonts, no emoji, no unicode glyphs. Icon-only buttons always get `aria-label`.

**Also in scope (already used in the app):** `Avatar`, `Chip`, `Badge`, `InputOTP` (via `FormOtpField`), `DateField`/`DatePicker`/`Calendar` (via `@/@components/date-input`), `Collection`, `ListBoxLoadMoreItem`, `CloseButton`, `Header`.

---

## 3. Token map — prototype `var(--*)` → HeroUI semantic token

Never port a prototype variable. Substitute:

| Prototype | HeroUI token / class | Notes |
|---|---|---|
| `--accent`, `--accent-soft` | `primary`, `primary-soft` | one brand accent only |
| `--ink` (dark sidebar/bottom-nav) | app shell dark surface (fixed neutral / `content` on dark) | the only dark chrome; body stays light |
| `--surface` | `surface` (white cards) | cards sit brighter than page |
| `--background` | `background` (off-white) | page bg, not pure white |
| `--surface-tertiary` | `surface-tertiary` | meter tracks, muted fills |
| `--foreground` / `--muted` | `foreground` / `muted-foreground` | |
| `--border` | `border` | hairline 1px |
| `--danger` / `--warning` / `--success` (+ `-soft`) | `danger` / `warning` / `success` (+ `-soft`) | status only |
| radii (`border-radius:12/13/16px`) | component defaults (`Card` 24, `Chip` 16, fields 12) | delete explicit radii |
| shadows | `--surface-shadow` / `--overlay-shadow` / `--field-shadow` (role-based) | none in dark mode |
| spacing literals | Tailwind semantic gap/padding | Card 16px padding, `gap-3`, Button `gap-2`, Chip `gap-1.5` |

Because you're on the default theme, spacing/radius/shadow/type come free — strip the prototype's geometry and let defaults apply.

---

## 4. Prototype helper-class → component mapping

The helper classes are exactly where inlining creeps in. Translate class → component, never class → CSS:

| Prototype class / pattern | Implement as |
|---|---|
| `.frame` | app shell layout (not a component — page container) |
| `.side` / `.navi` / bottom nav | existing `app-shell.tsx` (`@/@components/app-shell`); active state via route — extend it, don't rebuild |
| `.card` | `Card` (+ subparts) |
| `.ptag` | `Chip variant="outline" size="sm"` |
| dot status + label | `Chip variant="soft"` with status color |
| `.segbtn` | `ToggleButtonGroup` (or `Tabs` when it switches views) |
| `.daytab`, `.wday` | `ToggleButton` / `ToggleButtonGroup` |
| `.bmenu` (⋯ menu) | `Dropdown` / `Menu` |
| `.bmenu` (rich anchored panel: assign/slot/swap pickers) | `Popover` |
| modal/scrim (desktop) | `AlertDialog` for confirm/simple; keyboard-heavy flows become a **page**, not a dialog |
| bottom sheet (mobile) | `KeyboardSheet` |
| confirm-inline / destructive | `AlertDialog` |
| `.fld` / `.sfld` | `FormTextField` / `FormNumberField` (raw `TextField`/`Input` outside forms) |
| meters, kcal line, seat usage | `ProgressBar` |
| `.av` | `Avatar` |
| accordions (meals, workouts, form sections) | `Disclosure` (form sections: `Fieldset` + `Legend`) |
| program-sheet grid | `Table` (desktop); cards/scroll on mobile |
| rosters, clients, plan/food/recipe lists | `ListBox` items via `BrowseListBox` — **not** `Table` |
| "used in N places", awaiting seat | `Alert` (soft) |

---

## 5. Lint / CI gates (add before the first port PR)

The repo lints with **Biome** (`pnpm lint`), not ESLint — don't add an `.eslintrc`. Enforcement is a grep gate (same mechanism as the existing `just check-rm` recurring-mistakes ledger; add these patterns there or as a sibling CI script that fails on any match in `src/**/*.tsx`):

```bash
# style prop, onClick on components, hex colors, px/rem in arbitrary values,
# numbered scales, v2 imports, react-aria NumberField
rg -n --glob 'src/**/*.tsx' \
  -e 'style=\{\{' \
  -e 'onClick=' \
  -e '#[0-9a-fA-F]{3,8}\b' \
  -e '\[[0-9.]+(px|rem|em)\]' \
  -e '(bg|text|border|ring)-(primary|neutral|default|success|warning|danger)-[0-9]{2,3}' \
  -e '@nextui-org/' -e 'HeroUIProvider' -e 'framer-motion' \
  -e '\bNumberField\b' \
  && { echo 'UI-CONTRACT violation'; exit 1; } || exit 0
```

(`onClick=` and `NumberField` matches inside allowlisted wrappers — e.g. `@/@components/number-input` — are excluded by path.) A PR that inlines styles or hardcodes values literally cannot merge.

---

## 6. Definition of Done — per screen

- [ ] Renders **only** §2 components, preferring app wrappers over raw HeroUI; zero `style={{}}` (except an explicitly allowlisted dynamic value); zero hex/px/rem literals; zero numbered color scales.
- [ ] Semantic tokens only (§3); no prototype `var(--*)`.
- [ ] `onPress` (not `onClick`); every icon-only button has `aria-label`; compound components used per API.
- [ ] Layout + copy + interaction match the prototype section (desktop **and** mobile).
- [ ] All states present: empty (`ListEmptyState`/`ErrorState` patterns), **loading via `ListSkeleton`/`PageSkeleton`** (never a centered spinner), error via `Alert`/`ErrorState`, and the interactive states the prototype shows. Pending buttons keep constant width (see `form-actions.tsx`).
- [ ] Every overlay is responsive: `Popover` desktop / `KeyboardSheet` mobile (confirms stay `AlertDialog` on both). Works at 375px and 1280px.
- [ ] Screens sit in `Page`; forms follow AGENTS.md Forms (react-hook-form + zod, `applyFormErrors`); page anatomy matches the exercise create/edit/detail reference screens.
- [ ] Passes the lint + grep gates in §5.

---

## 7. Process

1. Land the **lint/CI gates (§5) first** — before any UI PR.
2. **Reference PR:** convert one screen fully (Foods list + detail — the exercise screens are already the page-anatomy reference per AGENTS.md, so Foods should match them). Review hard for §6. This PR becomes the pattern all others must match; reviewers diff against it.
3. Fan out the rest, one module per PR, each meeting §6:
   app shell → Clients + Invite → Builder libraries (Exercises/Foods/Recipes) → Nutrition (list + day-first builder) → Training (list/edit + program-sheet builder) → Forms (list + builder) → Settings.
4. Any component need not in §2 → raise it, don't improvise.

---

## 8. Screen ↔ codebase ↔ prototype index

**How to find a screen in the prototype — never read the whole file.** Every section in `Dashboard Redesign.dc.html` starts with a marker comment `<!-- ============ SECTION NAME ============ -->` and shows a two-letter badge on the canvas. To work on a screen:

1. Look up its badge below.
2. `grep -n 'data-screen-label="XX"' 'Dashboard Redesign.dc.html'` (each section wrapper carries its badge), or `grep -n '============'` to list all sections with line numbers.
3. Read from your section's marker to the next marker (typically 100–250 lines). Each section contains a **Desktop** frame and a **Mobile** frame — implement both.
4. Behavior/data logic for interactive sections lives in the logic class at the bottom of the file — grep for the state keys you see in `{{ }}` holes if you need it (data shape only; real data comes from `src/api/*`).

| Badge | Prototype section (marker) | Codebase module |
|---|---|---|
| DB | (first frame, top of file) Dashboard | `dashboard/*` |
| CL | CLIENTS LISTING | `clients/list-clients.tsx`, `clients/clients-list/*` |
| IN | INVITE CLIENT | `clients/invite-client.tsx`, `clients/client-invite-form/*` |
| EX | BUILDER · EXERCISES | `exercises/list-exercises.tsx`, `exercises/exercise-list-item.tsx` |
| EP | BUILDER · EXERCISE PREVIEW | `exercises/exercise-detail.tsx` |
| ED | BUILDER · EDIT EXERCISE | `exercises/exercise-form/*` |
| FO | BUILDER · FOODS | `foods/list-foods.tsx`, `foods/food-list-item.tsx` |
| FD | BUILDER · FOOD DETAIL | `foods/food-detail.tsx` |
| FE | BUILDER · EDIT FOOD | `foods/food-form/*` |
| RC | BUILDER · RECIPES | `recipes/list-recipes.tsx`, `recipes/recipe-list-item.tsx` |
| RD | BUILDER · RECIPE DETAIL | `recipes/recipe-detail.tsx` |
| RE | BUILDER · EDIT RECIPE | `recipes/recipe-form/*` |
| NP | NUTRITION · PLANS LIST | `nutrition-plans/list-nutrition-plans.tsx` |
| NE | NUTRITION · EDIT PLAN | `nutrition-plans/nutrition-plan-form/*` |
| NB | NUTRITION · PLAN BUILDER | `nutrition-plans/plan-builder/*` |
| TR | TRAINING · PLANS LIST | `training-plans/list-training-plans.tsx` |
| TE | TRAINING · EDIT PLAN | `training-plans/training-plan-form/*` |
| TB | TRAINING · PLAN BUILDER | `training-plans/plan-builder/*` (set editor already exists) |
| FM | FORMS · LISTING | `checkins/list-checkins.tsx` |
| FB | FORMS · BUILDER | `checkins/checkin-builder.tsx`, `checkins/question-presets.ts`, `api/checkins.ts` |
| ST | SETTINGS | `settings/*` (`billing`, `team`, `add-seats-dialog`, `components/editable-row`) |

Data hooks (**RTK Query** — `src/api/*`, generated endpoints in `src/api/generated.ts`) already exist — reuse them; the prototype's local arrays only show data *shape*. Never fetch in `useEffect`.
