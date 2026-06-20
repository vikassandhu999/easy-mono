# ADR-001: Nutrition Plan Builder + Meal Logging

**Date:** 2026-04-05
**Last updated:** 2026-06-19 (rewritten lean — dropped component/endpoint/data-flow inventories that mirror the code; kept decisions + rationale. Code is the source of truth for what exists.)
**Scope:** coach plan builder + food-log viewing (coachapp-v2), client meal logging (clientapp-v2)
**See also:** ADR-000 (container hierarchy, form architecture, CRUD pattern, cache tags), ADR-002 (training plans — same builder shape), ADR-005 (client management).

> This ADR records *why* the nutrition feature is shaped the way it is. It does **not** list components, hooks, or endpoints — those live in the code and rot the moment they're duplicated here. Read `src/nutrition-plans/`, `src/api/{nutritionPlans,meals,mealLogs}.ts`, and `src/domain/{nutrition-plans,client-nutrition}.ts` for the inventory.

---

## Context

A nutrition plan is the most complex entity on the platform. Exercises, foods, and recipes are single-form CRUD; a nutrition plan is a multi-layered, **server-persisted** builder whose nested entities are each created through their own endpoint, not as one nested create payload:

```
NutritionPlan
├── name, description, tags, macros_goal, status
├── client_id: null | string      ← template when null, personal plan when set
├── source_template_id: null      ← set when assigned/duplicated from a template
├── client: null | PlanClient     ← minimal {id, first_name, last_name} preload for the banner
├── meals[]                        ← each created via its own endpoint (preloaded on show only)
│   ├── name, position, macros
│   └── meal_items[]               ← each created via its own endpoint
│       ├── food_id OR recipe_id   (API returns only the id — see Decision 3)
│       └── amount, unit, weight_g, position
└── plan_items[]                   ← assigns a meal to a day+meal_type slot (preloaded on show only)
    ├── day: "monday".."sunday"
    └── meal_type: "breakfast" | "lunch" | "dinner" | "snack"
```

`status` is `'active' | 'archived'` — there is no `draft`. `meals` and `plan_items` are preloaded **only** on the show endpoint (`GET /v1/coach/nutrition_plans/:id`); list endpoints omit them, so both are optional on the type and must be read defensively. That a plan can only be assembled through many individual, individually-persisted mutations is the fact that shapes every decision below.

---

## Decision: Two-step creation, server-persisted builder

**Step 1 — create the shell** (`create-nutrition-plan.tsx`): a standard form collecting name, description, tags, macros goal. No status/type field — plans default to `active` server-side. On submit, create → navigate to the detail page.

**Step 2 — build on the detail page** (`nutrition-plan-detail.tsx`): the detail view *is* the builder. Every action (add meal, add food, edit amount, assign to a day) is a live mutation; RTK Query cache invalidation drives reactivity.

**Why not a single-page builder with one save?** The API persists each meal / meal_item / plan_item individually. A client-side accumulator firing a dependent chain of calls on save would be fragile — partial failures, no incremental save, hard rollback. Server-persisting every action makes each one immediately durable and the builder stateless.

The detail page has six sections, top to bottom: **client banner** (personal plans only — see Decision 8), **header** (name, status chip, Template chip, actions), **macros goal**, **daily totals** (Decision 4), **meals builder**, **weekly schedule** / day planner.

---

## Decision: queryFn hydration of foods/recipes

The API's `MealItem` carries only `food_id` / `recipe_id`, not the resolved objects. `getNutritionPlan` is a `queryFn` (not a plain `query`) that fetches the plan, collects the unique food/recipe ids across all meal items, batch-fetches them in parallel, and merges the resolved objects back onto each item. This lets the builder render names, images, macros, and serving sizes without per-row queries. Items that already arrive hydrated are left untouched.

---

## Decision: Macro totals live in the domain layer, not the components

Two computations, both extracted out of the components into `src/domain/`:

- **Per-meal totals** — `getMealMacroSummary(meal)` in `domain/nutrition-plans.ts`. Prefers the server's `meal.macros` when non-zero; otherwise sums each item's resolved macros scaled by `weight_g / 100` (falling back to `amount`).
- **Daily totals vs goal** — the `DailyTotals` block in the detail screen wires `getNutritionPlanMacros` to show consumed-vs-goal progress bars, color-coded green (90–110% of goal), red (>120%), yellow otherwise. Columns where total and goal are both zero are hidden.

Keeping the math in `domain/` keeps it testable and out of the render path.

---

## Decision: Strict template/personal endpoint separation

Templates and personal plans come from two distinct endpoints — no client-side filtering, no shared query:

- `GET /v1/coach/nutrition_plans` — library, templates only (`LIST` cache).
- `GET /v1/coach/clients/:id/nutrition_plans` — that client's plans only (`CLIENT_LIST` cache).

Both responses preload the minimal `client` object so the UI renders the banner without a second fetch. Mutations that can move a plan between scopes (`update`, `delete`, `assign`) invalidate both caches; `assign` additionally refreshes the destination `Client`. Template-vs-personal is derived from `!plan.client_id` (covers null and undefined). This is the canonical home for this decision — ADR-000 Discovery #10 covers the shared cache-tag mechanics for both plan domains.

---

## Decision: Plan assignment is one mutation, two entry points

`assignNutritionPlan` (`POST /nutrition_plans/:id/assign`) copies a template to a client; the original template is untouched and the copy records `source_template_id`. It's reachable from the plan detail page ("Copy to Client" → inline `ClientPicker`) and from the client detail page (`+ Nutrition plan` → inline `NutritionPlanPicker`, see ADR-005). Same mutation either way.

---

## Decision: Two-status archive model

`status` is `active | archived` only. New plans are `active`; the coach toggles via Archive/Unarchive in the header (an `update` with `{status}`). The header chip reads through a `STATUS_MAP[status] ?? UNKNOWN` fallback so an out-of-enum value from the backend renders safely rather than blank.

---

## Decision: Personal-plan banner shared with training plans

When `plan.client` is set, `ClientPlanBanner` renders above the header — a `<Link>` back to `/clients/:id` with the client's avatar, name, and a "Personal" chip. It gives a one-tap route back to the client context and makes template-vs-personal visually obvious. The `PlanClient` type is defined in `api/trainingPlans.ts` and re-imported by `api/nutritionPlans.ts`, and the component (`@components/client-plan-banner.tsx`) is shared by both plan detail screens, so nutrition and training keep an identical shape.

---

## Decision: Picker and inline-edit patterns

- **Tabbed item picker** — `MealItemPicker` has separate Foods and Recipes tabs with independent server-side searches, not one combined search, so the coach always knows which type they're adding.
- **MealPicker "New meal" first** — the day planner's picker always offers "New meal" as the first option ("Create [name]" once text is typed), so a coach can create a meal and assign it to a slot in one action. Empty name defaults to the slot's `meal_type` label.
- **Serving-size chips** — when adding an item, its `serving_sizes` render as tappable quick-fill chips that set amount/unit/weight_g; manual edits clear the highlight. Same pattern as recipes' `ingredient-list.tsx`.
- **Inline editing** — meal name (tap → `Input`, save on blur/Enter, Escape cancels, empty reverts) and meal-item amounts (`meal-item-amount-fields.tsx`: amount/unit/weight_g, PATCH sends only changed fields). 44px touch targets.
- **Copy day** — `AlertDialog` + HeroUI `Select` for the target day; trigger only shows when the source day has assignments; Copy disabled until a target is chosen.
- **Day/meal_type are named strings** (`"monday"`, `"breakfast"`), displayed as short labels (Mon–Sun) — not numeric indices.
- **Auto-scroll** — after creating a meal (inline or from the day planner) the page scrolls to the new section via a self-clearing callback ref.

---

## Container decisions

Follows ADR-000's container hierarchy. The non-obvious calls specific to this feature:

| Action | Container | Why |
| --- | --- | --- |
| Create / edit plan metadata | **NEW PAGE** | 2+ fields incl. the macros grid |
| Add meal / add food / edit amounts | **INLINE** | single field or compact grid, stays in the builder |
| Assign meal to day slot | **INLINE** | `MealPicker` autocomplete |
| Copy plan to client / assign from client | **INLINE** | picker panel, no navigation |
| Delete meal / delete plan | **DIALOG** | zero-input yes/no |
| Copy day | **DIALOG** | one `Select`, no keyboard |
| Remove meal item / remove day assignment | **INLINE** | single tap, reversible, no confirm |

Everything else (the standard list/create/edit/detail screens) follows ADR-000's CRUD module pattern unchanged. The list screen uses the shared `BrowseListBox` + `ListEmptyState` + `useInfiniteItems` generics (see ADR-000) — there is no per-feature list-item component.

---

## Coach-side: food-log viewing (read-only)

The coach reviews a client's adherence from the client detail page. **Read-only by intent** — the coach analyses, they don't log for clients.

- `ClientNutritionAdherence` — weekly Mon–Sun strip of daily compliance icons (✓ ≥80%, half 50–80%, ○ <50%, – future). Fetches the client's active plan to resolve `macros_goal` for the percentage. Local-time date formatting to avoid a UTC day-shift. Tapping a past day expands `ClientNutritionDetail` inline.
- The adherence/comparison math (`getAdherenceLevel`, `buildMealLogComparison`, day totals, skipped slots, slot labels) lives in `src/domain/client-nutrition.ts`, not the components.

The coach meal-log API is read-only — summary + per-day list, no delete (see "Not built yet").

---

## Client-side: meal logging (clientapp-v2)

A separate Vite SPA against `/v1/client/*`. Plans/foods/recipes are read-only; food logs are full CRUD.

### Philosophy: the plan is guidance, not a mandate

The client's job is to log what they actually ate. Deviations — a swap, a different amount, a skipped meal, an extra snack — are normal outcomes, not errors. No red "didn't follow plan" warnings. The plan-vs-actual comparison is for the coach's analysis, never the client's judgment.

### Data model: FoodLog

```
FoodLog
├── date, meal_slot            ("breakfast" | "morning_snack" | "lunch" |
│                               "afternoon_snack" | "dinner" | "evening_snack")
├── food_id?, recipe_id?
├── meal_item_id?              ← links to a planned item; null = freestyle/unplanned
├── amount, unit, weight_g
├── macros_snapshot            ← per-100g macros captured at log time
├── food_name_snapshot         ← food name captured at log time
└── notes
```

### Decision: no session model

Unlike workout logging (explicit start/end sessions), each `FoodLog` is independent, grouped by `date` + `meal_slot` for display. This matches how people eat — throughout the day, not in discrete sessions. The daily view merges the plan's scheduled meals with the day's logs to show logged/unlogged status per item.

### Decision: snapshots for change resilience

The server captures `macros_snapshot` and `food_name_snapshot` at log creation. If the coach later edits the food's macros or name, historical logs stay accurate. **All client-side macro math reads the snapshot, never the live food.**

### Decision: replacement detection via `food_id` mismatch

`meal_item_id` links a log to a planned item. When `food_log.food_id != meal_item.food_id`, the UI strikes through the planned food, shows the replacement below, and tags an amber "replaced" badge. There is no explicit "replace" field — the mismatch *is* the signal. (Same pattern as training's exercise replacement.)

### Decision: bulk logging endpoints

`POST .../food_logs/log_meal` and `.../log_day` create entries for all unlogged items in a meal / day in one call, eliminating N+1 logging. The server skips `meal_item_id`s already logged for that date+slot, so re-tapping "Log all" can't duplicate.

### Decision: `TodayPlan` convenience endpoint

`GET /v1/client/nutrition_plans/today?date=` resolves active plan → weekday → plan_items → meals with items server-side, so the client never handles plan ids or weekday mapping. The `date` param lets the client view other days.

### Decision: proportional `weight_g` scaling

For a planned item in non-gram units ("1 piece = 120g"), changing amount to "2 pieces" scales weight `(2/1)*120 = 240g` so macro previews stay accurate. In the add-food flow (no plan reference) non-gram units send `weight_g = 0` and the server resolves from the food's serving sizes.

### Containers

Daily view, per-item logging, edit, and the "Log all" bulk actions are all **INLINE** (single amount field or one tap). Replacing a food and adding an unplanned food are **NEW PAGE** (search opens the keyboard, multi-step) — see ADR-000's keyboard rule.

---

## What's not built yet

- **Drag-and-drop reordering** — `position` exists on meals and meal items and is settable on create/update, but there's no reorder UI and **no bulk-reorder endpoint** (an earlier `reorderNutritionPlanMeals` was never built).
- **Plan duplication UI** — the `duplicate` endpoint exists; no UI yet.
- **Shopping list UI** — the `shopping-list` endpoint exists; no UI yet.
- **Tags management** — `tags` is on the model but not exposed in the form.
- **Coach food-log deletion** — the coach meal-log API is read-only (summary + list); no delete endpoint or button.
- **Serving-size chips in client logging** — the client add-food flow defaults to grams; the coach builder's quick-fill chips aren't shown there.
- **Plan start/end dates** — not modeled, so neither side can show "plan ends in N days".
