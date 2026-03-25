# ADR-001: Nutrition Plan Builder

**Date:** 2026-03-25  
**Context:** Nutrition plan creation and management in coachapp-v2

---

## Context

A nutrition plan is the most complex entity in the coaching platform. Unlike exercises, foods, or recipes (which are single-form CRUD), a nutrition plan is a multi-layered, server-persisted builder:

```
NutritionPlan
├── name, description, tags, macros_goal, type, status
├── meals[]                    ← created via separate API mutation
│   ├── name, position, macros
│   └── meal_items[]           ← created via separate API mutation
│       ├── food_id OR recipe_id
│       └── amount, unit, weight_g, position
└── plan_items[]               ← assigns meals to day+meal_type slots
    ├── day: "monday"..."sunday"
    ├── meal_type: "breakfast" | "lunch" | "dinner" | "snack"
    └── meal_id
```

Each nested entity (`Meal`, `MealItem`, `PlanItem`) is managed through its own API endpoint, not submitted as part of a single create request. This fundamentally shapes the UX architecture.

---

## Decision: Two-Step Creation Flow

### Step 1: Create Plan (NEW PAGE)

A standard form page (`create-nutrition-plan.tsx`) collects plan metadata:

- Name (required), description, type (standard/template), status (draft/active/archived), macros goal (calories, protein, carbs, fats)
- Uses the shared `NutritionPlanForm` component (react-hook-form + zod)
- On submit: `createNutritionPlan` mutation -> navigate to plan detail/builder

**Why not a single-page builder?** The API creates entities individually. A client-side accumulator that fires a chain of dependent API calls on save would be fragile (partial failures, no incremental saving). The server-persisted approach means every action is immediately durable.

### Step 2: Build on Detail Page (NEW PAGE)

After creation, the coach lands on `nutrition-plan-detail.tsx` which serves as both the **detail view** and the **builder**. All operations are live server mutations with RTK Query cache invalidation providing reactivity.

The detail page has five sections:

1. **Header** -- plan name, status/type chips, edit/delete navigation, copy-to-client
2. **Macros Goal** -- daily target grid (if set); zero values display as em-dash, not "0g"
3. **Daily Totals** -- computed totals vs. goal with color-coded progress bars (green/yellow/red), powered by `useGetNutritionPlanMacrosQuery`
4. **Meals Builder** -- add/remove meals, add foods/recipes to meals, inline editing of names and amounts
5. **Weekly Schedule** (Day Planner) -- assign meals to day+meal_type slots, copy day via dialog

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

| Component      | From                  | Used for                                                 |
| -------------- | --------------------- | -------------------------------------------------------- |
| `FoodPicker`   | `foods/components/`   | Not used directly anymore (replaced by `MealItemPicker`) |
| `ClientPicker` | `clients/components/` | Copy plan to client (search + select client)             |
| `AlertDialog`  | HeroUI                | Delete confirmations (meal, plan)                        |
| `InfiniteList` | `@components/`        | Plan list screen                                         |
| `PageLayout`   | `@components/`        | All screens                                              |

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

client-detail.tsx (ClientNutritionPlans section)
  │
  ├── useListNutritionPlansQuery({client_id}) → plans assigned to this client
  │
  └── Assign Plan (inline panel)
      └── useAssignNutritionPlanMutation → copy selected template to this client
```

All mutations invalidate the `NutritionPlan` cache tag, so `useGetNutritionPlanQuery` automatically refetches with updated `meals[]` and `plan_items[]`. The `assignNutritionPlan` mutation also invalidates the `Client` tag to refresh client-specific plan lists.

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
- **From client detail page:** "Assign Plan" button in the top nav bar reveals an inline `NutritionPlanPicker` within the Nutrition Plans section. The coach searches plan templates and assigns one.

Both use the same `assignNutritionPlan` mutation (`POST /nutrition_plans/:id/assign`). The API creates a copy of the plan for the client (the original template remains unchanged).

### 8. Library listing shows templates only

The nutrition plans list screen (`/library/nutrition-plans`) client-side filters out plans where `client_id !== null`. Only template plans (unassigned) appear in the library. Client-assigned copies are shown on the client detail page in the "Nutrition Plans" section.

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
| `GET /v1/coach/nutrition_plans?client_id=X`     | `useListNutritionPlansQuery`      | List plans assigned to a client    |
| `GET /v1/coach/foods`                           | `useListFoodsQuery`               | Food search in picker              |
| `GET /v1/coach/recipes`                         | `useListRecipesQuery`             | Recipe search in picker            |
| `GET /v1/coach/clients`                         | `useListClientsQuery`             | Client search in ClientPicker      |

---

## What's Not Built Yet

- **Meal reordering** -- `reorderNutritionPlanMeals` mutation exists but drag-and-drop UI is deferred
- **Meal item reordering** -- position field exists but no drag-and-drop
- **Plan duplication** -- `duplicateNutritionPlan` mutation exists, UI deferred (separate from assignment which is built)
- **Shopping list** -- `getNutritionPlanShoppingList` endpoint exists, UI deferred
- **Tags management** -- tags field exists on plan, not exposed in form yet
