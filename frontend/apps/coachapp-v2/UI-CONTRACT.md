# UI-CONTRACT.md — CoachEasy → HeroUI v3 implementation contract

**Read this before touching any screen.** Screen work is **presentation only**: render existing data with the components below. Do **not** re-architect data, and do **not** hand-build UI out of styled `<div>`s. The app itself is the primary reference for every pattern — when in doubt, find the screen that already does it.

This contract **layers on top of `coachapp-v2/AGENTS.md`** — read that first; where they overlap, AGENTS.md wins. In particular its Canonical Components, Page Anatomy, and Choosing Containers sections are part of this contract.

---

## 0. The one rule

> If a UI need is not covered by a component in §2, **stop and ask** — do not build it from raw elements + styling.

Everything visual comes from HeroUI v3 (default theme, `@heroui/react` 3.2.1) and its tokens, **behind the app's canonical wrappers where one exists**. Precedence: app wrapper (`@/@components/*`, `@/builder-kit/*`) → raw HeroUI → stop and ask. You are working inside a fence; §2 is the fence.

---

## 1. Hard prohibitions (enforced by lint/CI — see §4)

- ❌ No `style={{ }}` prop in `src/**`. Exception: a single genuinely dynamic value that cannot be a token (a live width `%`, a computed `transform`). Allowlisted case-by-case in review — never for color, spacing, radius, font, or shadow.
- ❌ No hardcoded values: no hex colors, no `px`/`rem`/`em` literals inside Tailwind arbitrary values (`w-[240px]`, `text-[#111]`, `p-[13px]`). Use tokens / semantic classes / component defaults.
- ❌ No numbered color scales (`bg-primary-500`, `text-neutral-700`). Semantic tokens only (§3).
- ❌ No `@nextui-org/*`, no `HeroUIProvider`, no `framer-motion`, no Tailwind-v3 plugin config. These are HeroUI **v2** patterns and are forbidden in v3.
- ❌ No raw `<button>`, `<input>`, `<select>`, `<table>`, `<dialog>` for anything HeroUI covers. Use the component.
- ❌ No `onClick` on interactive HeroUI primitives — use `onPress`.
- ❌ No react-aria `NumberField` — it races mobile soft keyboards. Numeric entry is always `NumberInput` / `FormNumberField` (see §2).
- ❌ No custom CSS files / CSS modules / styled-components for component styling. Layout utilities (flex/grid/gap via Tailwind semantic classes) are fine; visual styling comes from components + tokens.

If you find yourself reaching for any of these, the need maps to a component you haven't used yet — check §2.

---

## 2. Component vocabulary (closed list)

Import from `@heroui/react` — **but check the app-wrapper table first**; if a wrapper exists, the raw primitive is the wrong answer. Follow the compound (dot-notation) API exactly.

### App canonical wrappers (use these before raw HeroUI)
| Need | Wrapper | Where |
|---|---|---|
| Page scaffold (header/title/toolbar) | `Page` | `@/@components/page` |
| Form scaffold + responsive body surface + submit row | `FormLayout`, `FormPanel`, `FormActions`, `FieldRow` | `@/@components/form-fields/*` |
| Text / number / select / textarea fields in forms | `FormTextField`, `FormNumberField`, `FormSelectField`, `FormTextAreaField` | `@/@components/form-fields/*` |
| Numeric entry anywhere | `NumberInput` | `@/@components/number-input` — **never** react-aria `NumberField` |
| Browse/search lists (skeleton + error + empty + load-more baked in) | `BrowseListBox` | `@/@components/browse-list-box` |
| Loading states | `ListSkeleton`, `PageSkeleton` | `@/@components/*` — never a centered spinner on first load |
| Page-level fetch error | `ErrorState` | `@/@components/error-state` |
| Back affordance | `BackButton` + `useGoBack` | `@/@components/back-button` |
| Mobile bottom sheet | `KeyboardSheet` | `@/builder-kit/keyboard-sheet` |
| Picker / short-form overlay (centered desktop) | `PickerModal` | `@/builder-kit/picker-modal` |
| Anchored select / inline editor | `ResponsiveOverlay` | `@/builder-kit/responsive-overlay` |
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
| Segmented control / weekday chips / set-type | `ToggleButton`/`ToggleButtonGroup` (already the app pattern — see `client-weight.tsx`, `list-checkins.tsx`); `Tabs` for view switching | segmented filters, weekday chips, plan/day switches. |

### Containers & structure
| Need | Component | Canonical usage |
|---|---|---|
| Card surface | `Card` (+ `Card.Header`, `Card.Title`, `Card.Description`, `Card.Content`, `Card.Footer`); `Surface` for lower-level surfaces (see `page.tsx`) | Default radius/border/shadow — add none. |
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
| Confirm / destructive / simple dialog | `AlertDialog` (+ `useOverlayState`) | delete day, deactivate trainer, cancel subscription. |
| Anchored panel (desktop) | `Popover` via `ResponsiveOverlay` | select-like controls and inline editors only. |
| Action menu | `Dropdown` / `Menu` (+ items, shortcuts, danger item) | the ⋯ menus (rename/move/duplicate/remove). |
| Transient notice | `toast` (lowercase import) + `@/@components/mutation-toast` helpers | save/added/failed feedback. App-shell already renders the toast region — never add a provider. |
| Hover label | `Tooltip` | icon-button affordances — never hover-only actions (44px targets). |
| **Mobile bottom sheet** | `KeyboardSheet` (`@/builder-kit/keyboard-sheet`) | every mobile picker / invite / amount / add-seats flow. |
| **Picker / short-form overlay** | `PickerModal` (`@/builder-kit/picker-modal`) | centered `Modal` on desktop, `KeyboardSheet` on mobile — pickers, invite trainer, and other short forms that need a stable surface (decision 2026-08-04). Never anchored to the trigger. |
| **Responsive overlay (anchored)** | `ResponsiveOverlay` | `Popover` desktop + `KeyboardSheet` mobile for select-like / inline editors only. `AlertDialog` confirms stay centered on both breakpoints. |

### Feedback & display
| Need | Component | Canonical usage |
|---|---|---|
| Status/label pill | `Chip` | `variant="soft" color="success\|warning\|danger\|default"` for status; neutral outline tags use the app variant `className="chip--outline"` — Chip has NO `outline` variant in HeroUI 3.2.1. |
| Count / dot overlay | `Badge` | nav unread counts, notification dots. |
| User avatar | `Avatar` | initials fallback. |
| Determinate progress | `ProgressBar` | macro meters, seat-usage meter, kcal line. |
| Loading placeholder | `Skeleton` via `ListSkeleton` / `PageSkeleton` | list/detail loading states (required — see §5). |
| Spinner | `Spinner` | inline/button pending. |
| Inline status banner | `Alert` (info/success/warning/danger) | "used in N places", awaiting-seat warning, form errors. |
| Styled anchor | `Link` | in-text links. |

**Icons:** `lucide-react` (already a dependency), thin/medium stroke. No icon fonts, no emoji, no unicode glyphs. Icon-only buttons always get `aria-label`.

**Also in scope (already used in the app):** `Avatar`, `Chip`, `Badge`, `InputOTP` (via `FormOtpField`), `DateField`/`DatePicker`/`Calendar` (via `@/@components/date-input`), `Collection`, `ListBoxLoadMoreItem`, `CloseButton`, `Header`.

---

## 3. Tokens & the theme

Semantic tokens only — the palette, in `frontend/apps/coachapp-v2/src/index.css`:

| Token / class | Role |
|---|---|
| `accent`, `accent-soft` | one brand accent only. `primary`/`divider`/`content*` are DEAD v2 tokens (RM-101, gated) |
| `bg-ink` / `text-ink-foreground` | the only dark chrome (sidebar/bottom-nav, dark CTAs, selected fills); body stays light |
| `surface` | white cards — cards sit brighter than page |
| `background` | off-white page bg, not pure white |
| `surface-tertiary` | meter tracks, muted fills |
| `foreground` / `muted` (`muted-2` tertiary) | text |
| `border` | hairline 1px |
| `danger` / `warning` / `success` (+ `-soft`) | status only |
| `rounded-chip/control/card/panel` (+ `--radius-pill`) | the only radii — snap to the nearest, never a px literal |
| `--surface-shadow` / `--overlay-shadow` / `--field-shadow` | role-based shadows; none in dark mode |
| spacing | nearest Tailwind `gap-*`/`p-*` step |

**The scale is closed.** The `--type-*` and `--radius-*` tokens in `index.css` are the complete vocabulary. Snap to the nearest existing token; never register a new one — `scripts/check-ui-contract.sh` fails any diff that adds one. Adding to the scale is a user decision, made in its own commit. Same fence as §2: a value you cannot express is a STOP-and-ask, not a licence to invent.

**The theme wins on conflict.** The theme is the system every screen is measured against — the scale **and the component rules built on it**: the one control height (`--spacing-control`), the field height, the selection registers (`--ink` / `--filter` / `--tab`), the tab strip, `--tracking-eyebrow`, the radius steps. A screen does not get its own taller field tier or smaller heading. A register the theme has no rule for is a STOP-and-ask.

Never resolve a conflict by writing a divergent value at a call site — that hides the disagreement in 200 classNames. If the theme is genuinely wrong, change the theme in its own commit.

---

## 4. Lint / CI gates — they exist; run them

The gates are BUILT and run in `just lint` / before finishing:

- `scripts/check-ui-contract.sh` — the §1 prohibitions (style prop, onClick,
  hex, px/rem arbitrary values, numbered scales, v2 imports, `NumberField`),
  the dead `text-<size>` utilities, and the **theme freeze** (fails any diff
  that adds a `--type-*`/`--radius-*` token; `UI_CONTRACT_SKIP_THEME=1` for a
  deliberate, user-approved scale change). Diff-scoped vs the branch point —
  it does NOT see untracked files, so `git add -N` new screens before trusting
  a green run.
- `scripts/check-theme-selectors.sh` (in `pnpm lint`) — every theme selector
  must match a real HeroUI class; no dangling `var(--x)`.
- `scripts/check-rm.sh` — the graduated recurring-mistakes rules.

The repo lints with **Biome** (`pnpm lint`), not ESLint — don't add an
`.eslintrc`, and don't re-implement the gates inline.

---

## 5. Definition of Done — per screen

- [ ] Renders **only** §2 components, preferring app wrappers over raw HeroUI; zero `style={{}}` (except an explicitly allowlisted dynamic value); zero hex/px/rem literals; zero numbered color scales.
- [ ] Semantic tokens only (§3).
- [ ] `onPress` (not `onClick`); every icon-only button has `aria-label`; compound components used per API.
- [ ] All states present: empty (`ListEmptyState`/`ErrorState` patterns), **loading via `ListSkeleton`/`PageSkeleton`** (never a centered spinner), error via `Alert`/`ErrorState`. Pending buttons keep constant width (see `form-actions.tsx`).
- [ ] Every overlay is responsive: `Popover` desktop / `KeyboardSheet` mobile (confirms stay `AlertDialog` on both). Works at 375px and 1280px.
- [ ] Screens sit in `Page`; forms follow AGENTS.md Forms (react-hook-form + zod, `applyFormErrors`); page anatomy matches the exercise create/edit/detail reference screens.
- [ ] Passes the lint + grep gates in §4.

Data hooks (**React Query** — hand-written hooks in `src/api/*` over the generated `src/api/schema.ts` types) already exist — reuse them. Never fetch in `useEffect`.
