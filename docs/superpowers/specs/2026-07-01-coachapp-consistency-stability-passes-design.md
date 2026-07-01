# Coachapp consistency & stability passes — design

**Date:** 2026-07-01
**App:** `frontend/apps/coachapp-v2`
**Goal:** components stable across desktop and mobile — nothing overflowing, nothing rendering where it shouldn't, no important element hidden.

## Context (what already holds)

- Lists (clients/foods/exercises/recipes/plans) go through one shared `BrowseListBox` with baked-in loading/error/empty; rows are mostly guarded with `min-w-0` + `truncate`.
- Typography is ~96% tokenized via the shared `Typography` component.
- HeroUI `Table` usages are all wrapped in `Table.ScrollContainer` (scroll, not page-overflow).

The instability is concentrated in specific, findable places. These four passes target them, breakage-first.

## Pass 1 — Overflow sweep @375px

**Method (hybrid):**
1. Code grep for four anti-patterns: user-data text without `truncate`/`min-w-0`; `whitespace-nowrap` on wrapping content; fixed `w-[NNpx]`; unguarded `min-w-[NNpx]`.
2. Resize Chrome to **375×812**, walk high-risk screens, confirm fixes and catch what grep misses.

**Known fixes queued:**
- `prospects/prospect-detail.tsx:272/285` — email/phone anchors → `truncate` / `break-all`.
- `clients/components/invitation-widget.tsx:151` — `whitespace-nowrap` action button.
- Verify builder grids (`nutrition-plans/plan-builder/nutrition-schedule.tsx` `min-w-[420px]`, `w-[70px]`, `min-w-[40px]`) are genuinely guarded by `overflow-x-auto` and don't push the page width.

**Verify:** each fixed screen at 375px and 900px.

## Pass 2 — Fixed-element & overlay stability

**Method:**
- Add ONE shared safe-area utility (`pb-safe` in the Tailwind layer) and replace the ad-hoc `env(safe-area-inset-bottom)` sprinkles (`app-shell.tsx`, `keyboard-sheet.tsx`).
- Verify each fixed/overlay element on mobile: bottom nav doesn't clip the last list row (scroll container bottom padding = nav height + safe area); `keyboard-sheet` docks above the keyboard; dialog action buttons stay reachable.

**Out of scope:** unifying the two overlay systems (custom `keyboard-sheet` vs HeroUI `Popover`/`AlertDialog`). Big refactor, low payoff — each works; we only make them stable.

**Verify:** bottom nav, keyboard sheet, and one AlertDialog at 375px.

## Pass 3 — Loading skeletons

**Method:**
- Swap the load-state `Spinner` in `BrowseListBox` for layout-matched skeleton rows; add a shared skeleton for detail/form pages. Use HeroUI `Skeleton` if present, else a small shared component. Centralized (~3 files, not 30).

**Verify:** reload key screens — content appears without the layout jumping.

## Pass 4 — State & reuse consistency

- Dedup `prospects/list-prospects.tsx` onto `BrowseListBox`.
- Route remaining ad-hoc loading/error through `ErrorState` / `ListEmptyState`.
- Tokenize the `text-[9px]/[10px]/[7px]` micro-labels in the plan builders (`nutrition-schedule.tsx`, `meal-item-row.tsx`).

**Verify:** `pnpm --filter coachapp-v2 exec tsc --noEmit` + `biome check` + spot-check prospects.

## Order & delivery

1 → 2 → 3 → 4. Each pass committed separately for reviewability. Run directly with targeted sub-agents for the grep-heavy Pass 1 — not a big multi-agent workflow.
