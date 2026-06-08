# ADR-001: Nutrition Plan Builder + Meal Logging

**Date:** 2026-04-05
**Last updated:** 2026-04-11 (strict template/personal separation — removed `type`, removed `draft` status, split endpoints, added client banner + archive button)
**Context:** Nutrition plan creation (coachapp-v2), food log viewing (coachapp-v2), and meal logging (clientapp-v2)

---

## Context

A nutrition plan is the most complex entity in the coaching platform. Unlike exercises, foods, or recipes (which are single-form CRUD), a nutrition plan is a multi-layered, server-persisted builder:

```
NutritionPlan
├── name, description, tags, macros_goal, status
├── client: null | PlanClient   ← null for templates, set for personal plans
├── client_id: null | string    ← template-vs-personal is derived from this
├── meals[]                     ← created via separate API mutation (show endpoint only)
│   ├── name, position, macros
│   └── meal_items[]            ← created via separate API mutation
│       ├── food_id OR recipe_id
│       └── amount, unit, weight_g, position
└── plan_items[]                ← assigns meals to day+meal_type slots (show endpoint only)
    ├── day: "monday"..."sunday"
    ├── meal_type: "breakfast" | "lunch" | "dinner" | "snack"
    └── meal_id
```

`NutritionPlanStatus = 'active' | 'archived'`. There is no `draft` status and no `type` field — a plan is a template when `client_id` is null and a personal plan when it points at a client. `meals` and `plan_items` are only preloaded on `GET /v1/coach/nutrition_plans/:id` (the show endpoint); list endpoints omit them, so the types are optional and must be accessed defensively.

Each nested entity (`Meal`, `MealItem`, `PlanItem`) is managed through its own API endpoint, not submitted as part of a single create request. This fundamentally shapes the UX architecture.

---

## Decision: Two-Step Creation Flow

### Step 1: Create Plan (NEW PAGE)

A standard form page (`create-nutrition-plan.tsx`) collects plan metadata:

- Name (required), description, tags, macros goal (calories, protein, carbs, fats)
- Uses the shared `NutritionPlanForm` component (react-hook-form + zod)
- No status or type fields — created plans default to `active` server-side, and the archive/unarchive button on the detail page manages status afterwards
- On submit: `createNutritionPlan` mutation -> navigate to plan detail/builder

**Why not a single-page builder?** The API creates entities individually. A client-side accumulator that fires a chain of dependent API calls on save would be fragile (partial failures, no incremental saving). The server-persisted approach means every action is immediately durable.

### Step 2: Build on Detail Page (NEW PAGE)

After creation, the coach lands on `nutrition-plan-detail.tsx` which serves as both the **detail view** and the **builder**. All operations are live server mutations with RTK Query cache invalidation providing reactivity.

The detail page has six sections:

1. **Client banner** (personal plans only) — `ClientPlanBanner` at the top of the page, tappable link back to the client, avatar + full name + Personal chip. Hidden for templates.
2. **Header** — plan name, status chip, Template chip (when `!plan.client_id`), edit/duplicate/copy-to-client/archive/unarchive/delete actions. Archive and Unarchive are mutually exclusive and toggle the plan status.
3. **Macros Goal** — daily target grid (if set); zero values display as em-dash, not "0g"
4. **Daily Totals** — computed totals vs. goal with color-coded progress bars (green/yellow/red), powered by `useGetNutritionPlanMacrosQuery`
5. **Meals Builder** — add/remove meals, add foods/recipes to meals, inline editing of names and amounts
6. **Weekly Schedule** (Day Planner) — assign meals to day+meal_type slots, copy day via dialog

---

## Container Decisions

Every interaction was evaluated against the mobile-first container hierarchy:

| Action                  | Keyboard?         | Container    | Rationale                                         |
| ----------------------- | ----------------- | ------------ | ------------------------------------------------- |
| Create plan form        | Yes, 2+ fields    | **NEW PAGE** | Multiple inputs, macros grid                      |
| Edit plan metadata      | Yes, 2+ fields    | **NEW PAGE** | Same form as create                               |
| Add meal (name input)   | Yes, 1 field      | **INLINE**   | Single text field in current view                 |
| Add food/recipe to meal | Yes, search input | **INLINE**   | Autocomplete popover, no navigation               |
| Set amount/unit/weight  | Yes, 3 fields     | **INLINE**   | Compact grid below the picker, fits mobile        |
| Delete meal             | No, confirmation  | **DIALOG**   | Zero-input yes/no via AlertDialog                 |
| Delete plan             | No, confirmation  | **DIALOG**   | Zero-input yes/no via AlertDialog                 |
| Remove meal item        | No, single tap    | **INLINE**   | Button press, no confirmation needed (reversible) |
| Assign meal to day slot | Yes, search       | **INLINE**   | MealPicker autocomplete                           |
| Remove day assignment   | No, single tap    | **INLINE**   | Button press, just unlinking                      |
| Copy day                | No, select+tap    | **DIALOG**   | AlertDialog with HeroUI Select for target day     |
| Edit meal name          | Yes, 1 field      | **INLINE**   | Tap name to toggle inline Input, save on blur     |
| Edit meal item amounts  | Yes, 3 fields     | **INLINE**   | Tap amounts to toggle inline inputs, save/cancel  |
| Copy plan to client     | Yes, search       | **INLINE**   | ClientPicker autocomplete in top nav toggle panel |
| Assign plan from client | Yes, search       | **INLINE**   | NutritionPlanPicker autocomplete in section panel |
| Archive / Unarchive plan | No, single tap   | **INLINE**   | Toggle button in detail page action bar          |

---

## Component Architecture

### Screens (feature root)

| File                        | Route                               | Purpose                       |
| --------------------------- | ----------------------------------- | ----------------------------- |
| `list-nutrition-plans.tsx`  | `/library/nutrition-plans`          | Infinite scroll list + search |
| `create-nutrition-plan.tsx` | `/library/nutrition-plans/create`   | Step 1 form                   |
| `nutrition-plan-detail.tsx` | `/library/nutrition-plans/:id`      | Builder + detail view         |
| `edit-nutrition-plan.tsx`   | `/library/nutrition-plans/:id/edit` | Edit plan metadata            |

### Components (`nutrition-plans/components/`)

| Component                   | Purpose                                                     | Used by              |
| --------------------------- | ----------------------------------------------------------- | -------------------- |
| `nutrition-plan-form.tsx`   | Shared form (schema + hook + component) for create/edit     | create, edit screens |
| `nutrition-plan-card.tsx`   | List item card (name, meal count, status chip)              | list screen          |
| `meal-section.tsx`          | Single meal card: items list, inline name editing, per-meal macro totals, tabbed picker with serving size chips, delete | detail screen        |
| `meal-item-row.tsx`         | Food/recipe row with image, name, inline amount/unit/weight editing, remove | meal-section         |
| `meal-item-picker.tsx`      | Tabbed (Foods/Recipes) autocomplete for adding items        | meal-section         |
| `meal-picker.tsx`           | Autocomplete for selecting/creating meals in day planner    | day-planner          |
| `day-planner.tsx`           | Weekly schedule: day tabs + meal_type slots + copy day      | detail screen        |
| `nutrition-plan-picker.tsx` | Autocomplete to search/select plan templates for assignment | client detail page   |

### Reused from other features

| Component           | From                  | Used for                                                 |
| ------------------- | --------------------- | -------------------------------------------------------- |
| `FoodPicker`        | `foods/components/`   | Not used directly anymore (replaced by `MealItemPicker`) |
| `ClientPicker`      | `clients/components/` | Copy plan to client (search + select client)             |
| `ClientPlanBanner`  | `@components/`        | Personal-plan banner at the top of the detail page       |
| `AlertDialog`       | HeroUI                | Delete confirmations (meal, plan)                        |
| `InfiniteList`      | `@components/`        | Plan list screen                                         |
| `PageLayout`        | `@components/`        | All screens                                              |

---

## Data Flow

```
nutrition-plan-detail.tsx
  │
  ├── useGetNutritionPlanQuery(id)     → plan.meals[], plan.plan_items[]
  │
  ├── useGetNutritionPlanMacrosQuery(id) → computed daily macro totals (DailyTotals)
  │
  ├── MealSection (per meal)
  │   ├── useCreateMealItemMutation    → add food/recipe to meal
  │   ├── useDeleteMealItemMutation    → remove item from meal
  │   ├── useDeleteMealMutation        → delete entire meal
  │   └── useUpdateMealMutation        → rename meal (inline editing)
  │
  ├── MealItemRow (per item, inside MealSection)
  │   └── useUpdateMealItemMutation    → edit amount/unit/weight (inline editing)
  │
  ├── DayPlanner
  │   ├── useCreatePlanItemMutation    → assign meal to day slot
  │   ├── useDeletePlanItemMutation    → remove day assignment
  │   ├── useCopyNutritionPlanDayMutation → copy day's assignments
  │   └── useCreateMealMutation        → create meal + assign (from picker)
  │
  ├── Inline "Add Meal"
  │   └── useCreateMealMutation        → create meal (name only)
  │
  └── Copy to Client (inline panel)
      └── useAssignNutritionPlanMutation → copy plan to selected client

client-detail.tsx (ClientPlans section — unified nutrition + training)
  │
  ├── useListClientNutritionPlansQuery({clientId}) → GET /v1/coach/clients/:id/nutrition_plans
  │
  └── "+ Nutrition plan" button (inline picker)
      └── useAssignNutritionPlanMutation → copy selected template to this client
```

Cache invalidation:

- Mutations against a specific plan (`updateNutritionPlan`, `deleteNutritionPlan`, `createMeal`, `updateMealItem`, etc.) invalidate `{type: 'NutritionPlan', id}` so `useGetNutritionPlanQuery` refetches with updated `meals[]` and `plan_items[]`.
- `updateNutritionPlan`, `deleteNutritionPlan`, and `assignNutritionPlan` invalidate both `{type: 'NutritionPlan', id: 'LIST'}` (library) and `{type: 'NutritionPlan', id: 'CLIENT_LIST'}` (all client detail pages), since a status change or assignment can move a plan between the two scopes.
- `assignNutritionPlan` additionally invalidates `{type: 'Client', id: 'LIST'}` and `{type: 'Client', id: body.client_id}` to refresh the destination client's detail page (and any list counts).

---

## Key Design Decisions

### 1. MealItem food/recipe hydration via queryFn

The API's `MealItem` schema only has `food_id` / `recipe_id` — it does not return resolved food/recipe objects. The `getNutritionPlan` endpoint uses a `queryFn` (not a plain `query`) that: (1) fetches the plan, (2) collects unique food/recipe IDs from all meal items, (3) batch-fetches them in parallel, (4) merges the resolved objects into each `meal_item`. This allows `MealItemRow` and `MealSection` to display food/recipe names, images, macros, and serving sizes without separate queries.

### 2. Tabbed item picker (Foods + Recipes)

`MealItemPicker` has two tabs with independent server-side searches rather than a combined search. This keeps the UX clear (coach knows which type they're adding) and avoids type ambiguity in results.

### 3. MealPicker with "New meal" as first option

The day planner's `MealPicker` always shows "New meal" as the first autocomplete option. When text is typed, it becomes "Create [name]". This enables creating a meal and assigning it to a day slot in one action rather than requiring the coach to create a meal in the Meals section first. If no name is typed, the meal defaults to the slot's meal_type label (e.g., "Breakfast").

### 4. Auto-scroll on meal creation

After creating a meal (from either the inline "Add Meal" or the day planner), the detail page scrolls to the new `MealSection` in the Meals builder. Implemented via a callback ref pattern: `scrollToMealId` state + callback ref that fires `scrollIntoView()` and then clears itself.

### 5. Day values use named days, not numbers

The API uses `"monday"` through `"sunday"` for the `day` field, and `"breakfast"`, `"lunch"`, `"dinner"`, `"snack"` for `meal_type`. These are displayed as shortened labels (Mon-Sun) in the day tabs.

### 6. Copy day uses AlertDialog with Select

Copying a day's assignments to another day uses an `AlertDialog` with a HeroUI `Select` compound component for choosing the target day. The "Copy meals" trigger button appears above the day's meal slots only when the current day has assignments. The dialog heading uses the full day name ("Copy Monday Meals to"). The Copy button is disabled until a target day is selected, and shows pending state during the API call.

### 7. Plan assignment works from both directions

A plan can be assigned to a client from two entry points:

- **From plan detail page:** "Copy to Client" button in the top nav bar reveals an inline `ClientPicker` panel below the nav bar. The coach searches for a client, and the API copies the plan template to that client.
- **From client detail page:** `+ Nutrition plan` button within the unified Plans section reveals an inline `NutritionPlanPicker`. The coach searches plan templates and assigns one. (See [ADR-005](adr-005-client-management.md) for the unified Plans section design.)

Both use the same `assignNutritionPlan` mutation (`POST /nutrition_plans/:id/assign`). The API creates a copy of the plan for the client (the original template remains unchanged).

### 8. Strict endpoint separation between library templates and personal plans

Templates and personal plans are served by two completely distinct endpoints — no client-side filtering, no shared query:

- `GET /v1/coach/nutrition_plans` — library endpoint, returns templates only. Used by `list-nutrition-plans.tsx` and `NutritionPlanPicker`. Cached under `NutritionPlan LIST`.
- `GET /v1/coach/clients/:id/nutrition_plans` — client-scoped endpoint, returns that client's plans only. Used by `client-detail.tsx` via `useListClientNutritionPlansQuery`. Cached under `NutritionPlan CLIENT_LIST`.

Both responses include the `client` preload (a minimal `PlanClient` object with `id`, `first_name`, `last_name`) so the UI can render the banner without a second fetch. Mutations that can move a plan between the two scopes (`update`, `delete`, `assign`) invalidate both `LIST` and `CLIENT_LIST` to keep the library and all client detail pages in sync. The `assign` mutation additionally invalidates `{type: 'Client', id: body.client_id}` to refresh the destination client's page.

The template-vs-personal distinction is derived from `!plan.client_id` (covers both `null` and `undefined`). The Template chip on the detail header is shown when this is true; the `ClientPlanBanner` is shown when `plan.client` is set.

### 9. Daily totals vs goal with progress bars

The `DailyTotals` component (defined inline in `nutrition-plan-detail.tsx`) wires up the existing `useGetNutritionPlanMacrosQuery` to show computed daily macro totals against the plan's macros goal. Each macro shows a progress bar color-coded: green (90-110% of goal), red (>120%), yellow (otherwise). Columns where both total and goal are zero are hidden.

### 10. Per-meal macro totals

Each `MealSection` computes calories and protein totals from its items' resolved food/recipe macros using `useMemo`. If `meal.macros` has non-zero server values, those are preferred. Otherwise, a client-side sum scales each item's macros by `weight_g / 100` (or falls back to `amount`). Displayed as "{cal} kcal · {pro}g protein" between the items list and the picker.

### 11. Inline meal name editing

Tapping the meal name in `MealSection` toggles an inline `<Input>` (via callback ref for auto-focus, avoiding the `autoFocus` lint rule). Save fires on blur or Enter. Cancel on Escape. Empty input reverts to the original name. Uses `useUpdateMealMutation`.

### 12. Inline meal item amount editing

Tapping the amount display in `MealItemRow` toggles three inline inputs (amount, unit, weight_g) with Save/Cancel buttons. Uses `useUpdateMealItemMutation`. Only sends changed fields in the PATCH body. Touch targets are 44px minimum (`min-h-11`).

### 13. Serving size quick-fill chips

When adding a food/recipe to a meal, `MealSection` renders the item's `serving_sizes` as tappable chips in a horizontally scrollable row. Tapping a chip auto-fills the amount, unit, and weight_g fields. Manual input change clears the active chip highlight. Same pattern reused in the recipe ingredient list (`ingredient-list.tsx`).

### 14. Zero-value macros goal display

The macros goal grid in the detail page displays an em-dash (`—`) in dimmed color for zero/unset values instead of "0g". This prevents the impression that the coach deliberately set a target of 0.

### 15. Two-status model with archive button

`NutritionPlanStatus` has only two values: `active` and `archived`. There is no `draft` status and no status field on the create/edit form. New plans are created as `active` server-side. The coach transitions a plan to `archived` via the Archive button in the detail header (which calls `updateNutritionPlan` with `{status: 'archived'}`) and back to active via the Unarchive button. Status is displayed as a chip in the header with a defensive `STATUS_MAP[plan.status] ?? UNKNOWN_STATUS` fallback in case the backend returns a value outside the enum.

### 16. Personal plan banner

When a plan has a non-null `client` preload, `ClientPlanBanner` renders at the top of the detail page (above the plan header). The banner is a `<Link>` back to `/clients/:id`, with a soft Avatar showing the client's initials, the client's full name, optional start/end dates, and a "Personal" chip. This gives the coach a one-tap route back to the client context they came from, and makes the template-vs-personal distinction visually obvious.

The `PlanClient` type used by the banner is defined in `api/trainingPlans.ts` and re-imported by `api/nutritionPlans.ts` so both plan domains share the exact same minimal shape. The banner component lives in `@components/client-plan-banner.tsx` and is reused by both `training-plan-detail.tsx` and `nutrition-plan-detail.tsx`.

---

## API Endpoints Used

| Endpoint                                        | Hook                              | Purpose                            |
| ----------------------------------------------- | --------------------------------- | ---------------------------------- |
| `POST /v1/coach/nutrition_plans`                | `useCreateNutritionPlanMutation`  | Create plan shell                  |
| `GET /v1/coach/nutrition_plans/:id`             | `useGetNutritionPlanQuery`        | Fetch plan with meals + plan_items |
| `PATCH /v1/coach/nutrition_plans/:id`           | `useUpdateNutritionPlanMutation`  | Edit metadata                      |
| `DELETE /v1/coach/nutrition_plans/:id`          | `useDeleteNutritionPlanMutation`  | Delete plan                        |
| `GET /v1/coach/nutrition_plans` (infinite)      | `useNutritionPlansInfiniteQuery`  | List with pagination               |
| `POST /v1/coach/nutrition_plans/:id/meals`      | `useCreateMealMutation`           | Add meal to plan                   |
| `DELETE /v1/coach/meals/:id`                    | `useDeleteMealMutation`           | Remove meal                        |
| `POST /v1/coach/meals/:id/items`                | `useCreateMealItemMutation`       | Add food/recipe to meal            |
| `PATCH /v1/coach/meals/:id`                     | `useUpdateMealMutation`           | Rename meal (inline editing)       |
| `DELETE /v1/coach/meal_items/:id`               | `useDeleteMealItemMutation`       | Remove item from meal              |
| `PATCH /v1/coach/meal_items/:id`                | `useUpdateMealItemMutation`       | Edit item amounts (inline editing) |
| `POST /v1/coach/nutrition_plans/:id/plan_items` | `useCreatePlanItemMutation`       | Assign meal to day slot            |
| `DELETE /v1/coach/plan_items/:id`               | `useDeletePlanItemMutation`       | Remove day assignment              |
| `POST /v1/coach/nutrition_plans/:id/copy-day`   | `useCopyNutritionPlanDayMutation` | Copy day assignments               |
| `POST /v1/coach/nutrition_plans/:id/assign`     | `useAssignNutritionPlanMutation`  | Copy plan to a client              |
| `GET /v1/coach/nutrition_plans/:id/macros`      | `useGetNutritionPlanMacrosQuery`  | Computed daily macro totals        |
| `GET /v1/coach/clients/:id/nutrition_plans`     | `useListClientNutritionPlansQuery` | List plans assigned to a client   |
| `GET /v1/coach/foods`                           | `useListFoodsQuery`               | Food search in picker              |
| `GET /v1/coach/recipes`                         | `useListRecipesQuery`             | Recipe search in picker            |
| `GET /v1/coach/clients`                         | `useListClientsQuery`             | Client search in ClientPicker      |

---

## Coach-Side: Food Log Viewing

The coach views a client's food log adherence from the client detail page. This is read-only — the coach can delete bad data but doesn't log food for clients.

### Component Architecture (coach food log viewing)

| Component | Location | Purpose |
| --- | --- | --- |
| `ClientNutritionAdherence` | `clients/components/client-nutrition-adherence.tsx` | Weekly Mon-Sun adherence strip showing daily compliance icons (checkmark >=80%, half 50-80%, circle <50%, dash = future). Auto-fetches the client's active nutrition plan via `useListNutritionPlansQuery({client_id})` to resolve `macros_goal` for calorie percentage computation. Tapping a non-future day toggles inline drill-down. Uses local-time date formatting (`fmtLocal`) to avoid UTC timezone shift. |
| `ClientNutritionDetail` | `clients/components/client-nutrition-detail.tsx` | Per-day food log table grouped by meal slot. Shows food name, amount, calories, planned/unplanned indicator. Renders inline within the adherence strip when a day is selected. |

### Container Decisions (coach food log viewing)

| Action | Keyboard? | Container | Rationale |
| --- | --- | --- | --- |
| View weekly adherence | No | **INLINE** | Section on client detail page |
| View daily food log detail | No | **INLINE** | Expands below the weekly strip on tap |

### Data Flow (coach food log viewing)

```
client-detail.tsx
  └── ClientNutritionAdherence
      ├── useGetCoachFoodLogSummaryQuery({client_id, from, to}) → weekly summaries
      ├── useListNutritionPlansQuery({client_id}) → find active plan's macros_goal
      └── ClientNutritionDetail (on day tap)
          └── useListCoachFoodLogsQuery({client_id, date}) → day's food logs
```

### API Endpoints (coach food log viewing)

| Endpoint | Hook | Purpose |
| --- | --- | --- |
| `GET /v1/coach/food_logs/summary?client_id=X&from=...&to=...` | `useGetCoachFoodLogSummaryQuery` | Daily macro summaries for adherence strip |
| `GET /v1/coach/food_logs?client_id=X&date=...` | `useListCoachFoodLogsQuery` | Client's food logs for a specific date |
| `DELETE /v1/coach/food_logs/:id` | `useDeleteCoachFoodLogMutation` | Remove bad data (wired, not yet used in UI) |

---

## Client-Side: Meal Logging (clientapp-v2)

The client app (`clientapp-v2`) is a separate Vite SPA with its own API layer pointing to `/v1/client/*` endpoints. Plans, foods, and recipes are read-only; food logs are full CRUD.

### Design Philosophy

The plan is guidance, not a mandate. The client's job is to log what they actually ate. Deviations (replacing a food, eating a different amount, skipping a meal, adding a snack) are normal outcomes, not errors. No red warnings or "didn't follow plan" indicators. The comparison is for the coach's analysis, not the client's judgment.

Nutrition logging differs from workout logging in a key way: there are no "sessions". Food is logged as independent entries throughout the day, grouped by `date` + `meal_slot`. The daily view merges planned meals (from the nutrition plan's weekly schedule) with food log entries to show logged/unlogged status per item.

### Data Model: FoodLog

```
FoodLog
├── date, meal_slot ("breakfast" | "morning_snack" | "lunch" | "afternoon_snack" | "dinner" | "evening_snack")
├── food_id (nullable), recipe_id (nullable)
├── meal_item_id (nullable — links to planned item, null = freestyle/unplanned)
├── amount, unit, weight_g
├── macros_snapshot (per-100g macros at log time — change resilience)
├── food_name_snapshot (food name at log time — change resilience)
└── notes
```

`meal_item_id` enables per-item comparison: when non-null, the logged entry is linked to a specific planned `MealItem`. Replacement detection: `food_log.food_id != meal_item.food_id`. When null, the entry is freestyle (unplanned snack, extra item).

### Screen Architecture

| File | Route | Purpose |
| --- | --- | --- |
| `nutrition/nutrition-daily.tsx` | `/nutrition` | Daily view: date navigator, macro progress, planned meals with log status, inline log/edit panels, "Log all meals" button |
| `nutrition/add-food.tsx` | `/nutrition/add-food` | New page: meal slot selector, food/recipe search, amount input. Handles both unplanned food and replacement flows via location state |
| `dashboard/dashboard.tsx` | `/dashboard` | `TodayNutritionSummary` component: compact card showing today's logged calories/protein/count with navigation to nutrition tab |

### Components (`nutrition/components/`)

| Component | Purpose | Used by |
| --- | --- | --- |
| `date-navigator.tsx` | `[<] Monday, Mar 25 [>]` with prev/next day navigation, "Today" indicator | nutrition-daily |
| `daily-macro-progress.tsx` | Four progress bars (Calories/Protein/Carbs/Fats) showing consumed vs planned. Shows consumed-only when no plan exists. | nutrition-daily |
| `meal-slot-section.tsx` | Per-meal card: planned items with logged/unlogged status icons, per-meal "Log all" button, unplanned items section, replacement indicator (strikethrough + "replaced" badge). Items tappable: unlogged opens log inline, logged opens edit inline. | nutrition-daily |
| `log-item-inline.tsx` | Inline panel for logging a planned item: pre-filled amount/unit from plan, macros preview, Log/Replace buttons. Proportional weight_g scaling for non-gram units. | nutrition-daily |
| `edit-log-inline.tsx` | Inline panel for editing an existing food log: amount/unit inputs, macros preview, Update/Delete buttons. Uses `useUpdateFoodLogMutation` and `useDeleteFoodLogMutation`. | nutrition-daily |
| `food-search-picker.tsx` | Debounced search across foods + recipes using `useListClientFoodsQuery` + `useListClientRecipesQuery`. HeroUI SearchField + ListBox. | add-food |

### Shared Utilities (`@utils/` and `@easy/utils`)

| File | Exports | Used by |
| --- | --- | --- |
| `@easy/utils` (nutrition.ts) | `MEAL_SLOTS`, `WEEKDAYS`, `computePlannedMacros`, `sumMacros`, `computeMacrosFromSnapshot`, `normalizeMacros`, `formatDateISO`, `formatMacroValue`, `MacroTotals` | nutrition-daily, add-food, daily-macro-progress, meal-slot-section, dashboard |
| `@utils/nutrition-helpers.ts` | Re-exports from `@easy/utils` for convenience | components that import from local path |

### Container Decisions (client meal logging)

| Action | Keyboard? | Container | Rationale |
| --- | --- | --- | --- |
| View daily nutrition | No | **INLINE** | Main nutrition page |
| Log a planned item (adjust amount) | Yes, 1 field | **INLINE** | Single amount field fits in current view |
| Edit an existing log entry | Yes, 1 field | **INLINE** | Same as logging — single amount field |
| Replace a food | Yes, search + amount | **NEW PAGE** | Search input opens keyboard, 2+ steps |
| Add unplanned food | Yes, search + amount | **NEW PAGE** | Search input opens keyboard, multi-step |
| Delete a food log entry | No, single tap | **INLINE** | Button within the edit panel, no confirmation |
| "Log all" per meal | No, single tap | **INLINE** | One-tap bulk action |
| "Log all meals" per day | No, single tap | **INLINE** | One-tap bulk action |
| Navigate between days | No, tap arrows | **INLINE** | Date navigator in header |
| Select meal slot (add food) | No, tap buttons | **INLINE** | Button group, no keyboard |

### Data Flow (client meal logging)

```
nutrition-daily.tsx
  ├── useGetTodayPlanQuery({date})         → today's planned meals from active plan
  ├── useListMyFoodLogsQuery({date})       → logged entries for the date
  ├── computePlannedMacros(meals)          → planned macro totals
  ├── sumMacros(logs)                      → consumed macro totals
  │
  ├── DailyMacroProgress (consumed vs planned)
  ├── MealSlotSection (per meal)
  │   ├── useLogMealMutation               → "Log all" for this meal
  │   └── PlannedItemRow / UnplannedLogRow → item display
  │
  ├── LogItemInline (for unlogged items)
  │   └── useLogFoodMutation               → log single item
  │
  ├── EditLogInline (for logged items)
  │   ├── useUpdateFoodLogMutation         → update amount/unit
  │   └── useDeleteFoodLogMutation         → remove entry
  │
  └── useLogDayMutation                    → "Log all meals" button

add-food.tsx
  ├── FoodSearchPicker
  │   ├── useListClientFoodsQuery          → search foods
  │   └── useListClientRecipesQuery        → search recipes
  └── useLogFoodMutation                   → log the selected food

dashboard.tsx
  └── TodayNutritionSummary
      └── useListMyFoodLogsQuery({date: today}) → today's summary
```

### Key Design Decisions (meal logging)

#### 1. No session model for nutrition

Unlike workout logging which has explicit start/end sessions, nutrition has no session concept. Each `FoodLog` entry is independent. They're grouped by `date` + `meal_slot` for display. This matches how people eat — throughout the day, not in discrete sessions.

#### 2. TodayPlan convenience endpoint

`GET /v1/client/nutrition_plans/today?date=` resolves the client's active plan → weekday → PlanItems for that day → Meals with MealItems. This avoids the client needing to know plan IDs, weekday mapping, or PlanItem resolution logic. The date param enables viewing other days.

#### 3. Bulk logging: log_meal and log_day

Two server-side bulk endpoints eliminate N+1 API calls. `POST /v1/client/food_logs/log_meal` creates entries for all unlogged items in a meal. `POST /v1/client/food_logs/log_day` does the same for all meals in a day. The server checks which `meal_item_id` values already have logs for that date+slot, avoiding duplicates.

#### 4. Proportional weight_g scaling for non-gram units

When a planned item uses non-gram units (e.g., "1 piece = 120g"), changing the amount to "2 pieces" proportionally scales: `(2 / 1) * 120 = 240g`. This ensures macro previews remain accurate. For the add-food flow (no plan reference), `weight_g = 0` for non-gram units and the server resolves from the food's serving sizes.

#### 5. Replacement detection via food_id mismatch

Same pattern as training's exercise replacement. When `food_log.food_id != meal_item.food_id`, the UI shows the planned food name with strikethrough, the replacement food name below, and an amber "replaced" badge. No explicit "replace" field — the mismatch IS the detection.

#### 6. Change resilience via macros_snapshot + food_name_snapshot

The server auto-populates `macros_snapshot` (per-100g macros) and `food_name_snapshot` on FoodLog creation. If the coach later edits the food's macros or name, historical logs retain accurate data. All client-side macro computations use the snapshot, not the live food data.

#### 7. Cache invalidation: TODAY tag on NutritionPlan

The `getTodayPlan` query always includes `{type: 'NutritionPlan', id: 'TODAY'}` in its `providesTags`. All food log mutations invalidate this tag, ensuring the daily view refetches plan data after any logging action. This keeps the `allPlannedLogged` check and planned macro totals in sync.

#### 8. Dashboard nutrition summary

The dashboard shows a compact `TodayNutritionSummary` card between the active session banner and today's workout. It fetches today's food logs and displays calorie/protein totals + entry count. Tapping navigates to the nutrition tab.

### API Endpoints (client meal logging)

| Endpoint | Hook | Purpose |
| --- | --- | --- |
| `GET /v1/client/nutrition_plans` | `useListMyNutritionPlansQuery` | List assigned plans |
| `GET /v1/client/nutrition_plans/:id` | `useGetMyNutritionPlanQuery` | Plan with meals + items + schedule |
| `GET /v1/client/nutrition_plans/today?date=` | `useGetTodayPlanQuery` | Resolved meals for a specific date |
| `GET /v1/client/food_logs?date=` | `useListMyFoodLogsQuery` | Food logs for a date |
| `POST /v1/client/food_logs` | `useLogFoodMutation` | Log a single food entry |
| `POST /v1/client/food_logs/log_meal` | `useLogMealMutation` | Bulk log all items in a meal |
| `POST /v1/client/food_logs/log_day` | `useLogDayMutation` | Bulk log all items for a day |
| `PATCH /v1/client/food_logs/:id` | `useUpdateFoodLogMutation` | Update a log entry |
| `DELETE /v1/client/food_logs/:id` | `useDeleteFoodLogMutation` | Remove a log entry |
| `GET /v1/client/foods` | `useListClientFoodsQuery` | Search foods (for logging) |
| `GET /v1/client/foods/:id` | `useGetClientFoodQuery` | Food detail |
| `GET /v1/client/recipes` | `useListClientRecipesQuery` | Search recipes (for logging) |
| `GET /v1/client/recipes/:id` | `useGetClientRecipeQuery` | Recipe detail |

---

## What's Not Built Yet

- **Meal reordering** -- `reorderNutritionPlanMeals` mutation exists but drag-and-drop UI is deferred
- **Meal item reordering** -- position field exists but no drag-and-drop
- **Plan duplication** -- `duplicateNutritionPlan` mutation exists, UI deferred (separate from assignment which is built)
- **Shopping list** -- `getNutritionPlanShoppingList` endpoint exists, UI deferred
- **Tags management** -- tags field exists on plan, not exposed in form yet
- **Serving size quick-fill in client logging** -- the client's add-food flow defaults to grams; serving size chips (as in the coach meal builder) are not shown
- **Plan start/end dates** -- no `start_date` / `end_date` on plans, so client can't see "plan ends in 3 days"
- **Coach food log deletion UI** -- `useDeleteCoachFoodLogMutation` is wired but no delete button rendered in the detail view
