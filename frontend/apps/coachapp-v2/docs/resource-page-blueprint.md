# Resource Page Blueprint (Loom-style, HeroUI v3)

Use this blueprint for list/index screens such as Clients, Library, Plans, Recipes, Foods, Meals, etc.

## Purpose

Create repeatable, production-ready resource pages with:
- clean hierarchy,
- predictable control placement,
- one dominant action,
- mobile-first behavior,
- strict token consistency.

## Canonical Structure (top to bottom)

1. **Page Header**
   - Left: breadcrumb/context (`Manage`), title, short description.
   - Right: one primary CTA only (`Button variant="primary"`).
   - Layout:
     - Mobile: stacked (`flex-col`, gap-4).
     - Desktop: split (`sm:flex-row sm:items-end sm:justify-between`).

2. **Control Rail (group related controls together)**
   - Single bordered row/panel directly above data list/grid.
   - Left: status/category tabs/filters.
   - Right: sort control (`outline` or `ghost`, never `primary`).
   - Keep filter + sort in the same visual group.

3. **Section Meta Row**
   - Left: current view label (e.g., `All Clients`).
   - Right: count summary (e.g., `12 total`).
   - Muted, compact, no competing actions.

4. **Content Region**
   - Responsive list/card grid.
   - Loading state via `Skeleton`.
   - Empty state via `Card` + title + description + action.

## Placement Rules (must follow)

- Primary CTA belongs in header-right on desktop and header-bottom on mobile.
- Sort belongs in the control rail with filters/tabs (not isolated in header).
- Tabs, sort, and list must be vertically adjacent (no unrelated sections between them).
- Keep related controls within one border context when possible.

## Component + Variant Rules

- Use HeroUI primitives only.
- Recommended variants:
  - Primary action: `primary`
  - Active filter tab: `secondary`
  - Inactive filter tab: `ghost`
  - Sort and utility controls: `outline` or `ghost`
- Maintain minimum tap target `min-h-11` for interactive controls.

## Token + Styling Rules

Allowed semantic tokens only:
- Backgrounds: `bg-background`, `bg-surface`, `bg-surface-secondary`, `bg-accent`, `bg-default`
- Text: `text-foreground`, `text-muted`
- Borders: `border-border`, `border-separator`

Do not introduce:
- ad-hoc color classes,
- opacity text classes,
- custom CSS modules,
- extra visual effects beyond approved shadows/radius.

## Spacing Rhythm (default)

- Page wrapper: `flex flex-col gap-6`
- Header block internals: `gap-2`
- Header/control rail separation: `gap-4` (mobile), `gap-6` overall page rhythm
- Grid/list gaps: `gap-4`
- Desktop content padding remains from layout shell (`md:p-6`)

## Accessibility + Interaction

- Use semantic landmarks and headings.
- Icon-only actions must include `aria-label`.
- Use `isDisabled` for disabled state.
- Keep press behavior subtle (`transition-none data-[pressed]:scale-100` where needed).

## PR Checklist for Resource Pages

- [ ] Exactly one primary CTA in the view.
- [ ] Header uses left context + right CTA pattern.
- [ ] Tabs/filters and sort are grouped in one control rail.
- [ ] Meta row shows current segment + total count.
- [ ] Loading + empty states are present and token-compliant.
- [ ] Mobile-first layout works without hidden critical actions.
- [ ] `pnpm -C apps/coachapp-v2 build` passes.
