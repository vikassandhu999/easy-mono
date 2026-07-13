---
name: design-porting
description: >
  How to implement the coachez .dc.html designs into the coachapp-v2 codebase
  (React 19 + HeroUI v3.2.1 + Tailwind v4) without scattering design values.
  Use for ANY task that ports a screen, component, or visual detail from the
  design files. The design files are the source of truth for STRUCTURE and
  INTENT — never for raw values.
precedence: >
  AGENTS.md owns process and architecture (data, routing, forms, canonical
  components, page anatomy). This skill owns styling. On a styling question,
  this skill wins; on everything else, AGENTS.md wins.
---

# Design Porting Skill

## The one idea

The `.dc.html` design files were hand-authored across many sessions. They are
**consistent in intent but drifted in values**: the same button appears with 6
different radii, the primary blue flips between `#0091FF` and `#0A84FF`, ~9
near-identical grays stand in for one hairline, and font sizes carry random
half-pixels. If you transcribe these files literally, you import the drift and
the codebase's consistency collapses.

So: **the design files tell you WHAT an element is and HOW it's composed. The
token + component layer (`src/index.css`) tells you what VALUES it uses.** You
never copy a number out of a design file into a `.tsx`. The fold map in
`token-reconciliation.md` translates every design value to its token.

## Where style is allowed to live (ranked; bottom is banned)

1. **Component theme** — `@layer components` BEM overrides + `--field-*` tokens
   in `src/index.css`. Anything true of *every* instance of a component
   (button weight/radius, tab indicator, input border, chip shape) lives here.
2. **HeroUI variant/size/color props** at the call site — `<Button
   color="accent" variant="ghost" size="sm">`. This is the vocabulary; the look
   behind each variant is defined once in tier 1.
3. **Semantic token utilities** — see the cheat-sheet in
   `index-css-additions.css`. Surfaces (`bg-surface`, `bg-surface-secondary`),
   ink (`text-foreground`, `text-foreground-secondary`, `text-muted`), hairlines
   (`border-border`, `border-separator`, `border-edge`), accent/status
   (`text-link`, `bg-link-soft`, `text-success`, `text-danger`, `text-star`),
   elevation (`shadow-hairline/raised/popover/modal`), radius
   (`rounded-inset/control/card/window/full`), and the domain palette
   (`bg-training`, `bg-nutrition-soft`, …). For plain elements that aren't
   HeroUI components.
4. **Tailwind default scale for spacing/sizing/type ONLY** — `p-4`, `gap-3`,
   `size-11`, `text-sm`. If a design's `13px` doesn't land on the grid, round to
   the nearest step; the grid wins over the mock.
5. **BANNED** —
   - arbitrary values: `bg-[#…]`, `rounded-[18px]`, `p-[13px]`, `shadow-[…]`, `w-[59px]`
   - any hex literal in `.tsx` (exception: `src/@components/brand-icons.tsx`, the
     single allowlisted home for literal brand marks like WhatsApp green)
   - **Tailwind's raw color palette**: `bg-zinc-100`, `text-blue-500`,
     `border-gray-200`, … — named, lint-legal, and a total system bypass. Color
     comes only from semantic tokens.
   - **Tailwind's default radius/shadow utilities**: `rounded-sm|md|lg|xl|2xl|3xl`,
     `shadow-2xs|xs|sm|md|lg|xl|2xl`. Radius and elevation come only from the
     semantic utilities (`rounded-control`, `shadow-popover`, …). `rounded-full`
     is allowed (pills/circles are part of the scale).
   - a `className` on a HeroUI component that overrides its themed foundation
     (see the className rule below)
   - reaching into the token layer from component code: no `var(--token)` in
     `style`/`className`, no `style={{ … }}` carrying a design constant.
     **Exception:** `style` is allowed for *runtime-computed geometry only* —
     progress-bar percent widths, chart coordinates, drag positions. Never for
     anything knowable at author time.

If you're typing a `[`, a raw palette color, or a default `rounded-*`/`shadow-*`
inside a className, stop — the value belongs in tier 1, or you're using the
wrong named scale.

**Tokens are consumed as utilities, never as `var()`.** Every token in
`index.css` is bridged to a Tailwind utility. Component code types the utility
or a HeroUI prop. `var(--token)` is legal *only* inside `index.css`. If a role
has no utility, that's a missing bridge in the CSS layer — add the bridge, don't
inline the var.

## className on HeroUI components

HeroUI v3 is Tailwind-first — it *expects* `className`. The enemy isn't
className; it's **per-instance divergence that bypasses the theme** (`<Button
className="rounded-full px-8 font-bold">` — now this button matches no other,
and your `@layer components` theme is silently overridden, since utilities beat
components in the cascade).

**The rule:** a `className` on a HeroUI component may **position/size it**
(layout utilities) or **apply a semantic token the design assigns to that
specific instance** (`bg-nutrition-soft`, `text-danger`). It may **not override
the component's themed foundation** — radius, font-weight, base padding,
default look. To change those, use a `variant`/`color`/`size` **prop**; if the
look recurs, promote it to a themed BEM modifier or a wrapper. A bespoke look
with no token is a `DESIGN-DEVIATION` flag, not a className.

Two litmus questions settle almost every case:
- *Should every instance of this component look this way?* → theme it.
- *Is this just how this one instance reads/sits, using system tokens?* → className is fine.

And: **prefer the prop when a prop expresses it** — `<Button color="danger">`
over `<Button className="text-danger">`. The prop routes through the theme; the
className competes with it.

```
✅ <Button className="mt-4 w-full">          layout
✅ <Button color="danger" variant="ghost">  props — ideal
✅ <Surface className="bg-nutrition-soft">   semantic token, this instance
⚠️ <Button className="text-danger">          works, but use color="danger"
❌ <Button className="rounded-full px-8 font-bold">  overrides themed radius/weight → variant/wrapper
❌ <Tabs className="bg-zinc-100 rounded-lg p-0.5">   re-inlines the centrally-themed segmented look
```

Enforcement note: this is a **code-review judgment call**, not a lint — you
can't reliably grep "appearance vs layout." The machine floor (hex + raw
palette + arbitrary-value + default radius/shadow bans) already catches what
makes a bad className *dangerous*, so a bad className that slips review is
usually mild (a stray `font-bold`), not a full theme bypass.

## Component theming rules (HeroUI v3)

- HeroUI v3 styles every component with **BEM classes** (`.button`,
  `.button--primary`, `.tabs__tab`). Each component's docs page publishes its
  class list under "CSS classes" — look them up per component; never guess
  (a wrong class is a silent no-op). Verified so far: `.button` (in use),
  Tabs = `.tabs`, `.tabs__list-container`, `.tabs__list`, `.tabs__tab`,
  `.tabs__indicator`, `.tabs__separator`, `.tabs__panel`; selected state is
  `[aria-selected="true"]`.
- Restyle a whole component family once in `@layer components`. Restyle ALL form
  controls at once via `--field-background` / `--field-hover` / `--field-border`
  / `--field-radius` — don't touch inputs individually. (`--field-radius:
  0.625rem` = 10px already equals `--radius-control`; aligned.)
- Layer order: utilities beat components in the cascade. A stray inline utility
  at a call site *will* override the themed component — another reason rule 5
  exists and the lint is mandatory.
- A recurring look that isn't a stock variant becomes a **named BEM modifier**
  (`.button--tile`) or a **thin wrapper component** (`<TileButton>`), defined
  once — never a bespoke per-screen `className`.
- **Segmented controls: pick the right primitive.** The iOS-style segment
  appears in two roles in the designs:
  - switching visible *panels/content* → `Tabs` (primary variant)
  - picking a *value or view mode* (Pipeline/List, Days/Weeks/Months, filter
    tabs) → `ToggleButtonGroup` (already canonical in AGENTS.md)
  Both are themed to the identical segmented look in `index.css`. Tabs
  selectors are verified; ToggleButtonGroup's BEM classes must be looked up on
  its docs page before theming.
- `@heroui/react` is pinned to `3.2.1`; BEM names are internal API, so keep it
  pinned.

## The workflow

### Step 1 — normalize the vocabulary (HUMAN, once — DONE)

Consistency cannot be discovered in the design files because it isn't there
yet. It was manufactured once, centrally: the drifted values are collapsed into
a canonical scale with a fold map. See `token-reconciliation.md` (decisions
resolved) and `index-css-additions.css` (the encoding).

An agent must NOT redo this pass: deciding "is `11px` a real step or drift off
`10`?" requires knowing intent, and an agent will decide differently per file,
recreating the drift in a new costume.

### Step 2 — encode it

Merge `index-css-additions.css` into `src/index.css` (merge notes are inline in
that file). The vocabulary is then complete and closed.

### Step 3 — port screens (AGENT, mechanical)

For each screen, the `.dc.html` is the visual spec, not the source. Rebuild it
from HeroUI primitives + `Page` / `BrowseListBox` / `FormLayout`, styled only
with token utilities and the default Tailwind spacing/type scale. Use the fold
map to translate any design value to its token. Compose freely; invent no
values.

## Deviation protocol

Be **strict on values, permissive on composition.**

- **Default: snap to nearest token.** A design value within tolerance of a token
  *is* that token. No new number.
- **Genuine one-off** the system can't express: you are **forbidden to inline
  it.** Stop and emit a flagged comment:
  `// DESIGN-DEVIATION: needs <value> for <element> — not in system`.
  A human decides: promote to a token, or redesign the element to fit.
- **Deviation count is a health metric.** Flags per PR near zero = system
  complete. Climbing = a real gap → add a token. It is never a signal to loosen
  the rule.

## Enforcement (makes the rules real, not advisory)

`just check-rm` hard-fails on, in `src/**/*.tsx` (excluding
`@components/brand-icons.tsx` for rule 1):

1. hex literal — `#[0-9a-fA-F]{3,8}\b`
2. arbitrary-value bracket — `-\[`
3. token reach-in — `var\(--`
4. raw Tailwind palette — `\b(bg|text|border|ring|fill|stroke)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d`
5. default radius/shadow — `\brounded-(xs|sm|md|lg|xl|2xl|3xl)\b` and `\bshadow-(2xs|xs|sm|md|lg|xl|2xl)\b`

**Introduction strategy — ratchet, don't big-bang:** existing code already
violates these (e.g. `app-shell.tsx` has `text-[10px]`, `rounded-2xl`,
`rounded-xl`). Turning on hard-fail day one breaks the build. Instead: snapshot
current violations into a baseline file; CI fails only on violations **not in
the baseline**; shrink the baseline as screens get ported. New/ported files are
always held to zero.

Reviewers don't police consistency — the build does.

## Definition of done (per screen)

- Renders correctly at 375px and 1280px.
- Zero new lint violations (rules 1–5 above) in touched files.
- No `className` that overrides a HeroUI component's themed foundation; layout
  utilities and instance-level semantic tokens only. Props preferred where a
  prop expresses the intent.
- Any recurring look is a theme/variant/wrapper, not repeated inline.
- `DESIGN-DEVIATION` flags raised for anything the system couldn't express.
- `pnpm build` clean; `just check-rm` clean against baseline.
