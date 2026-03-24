# ADR-001: Nutrition Plan Builder

**Date:** 2026-03-24  
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

The detail page has four sections:

1. **Header** -- plan name, status/type chips, edit/delete navigation
2. **Macros Goal** -- daily target grid (if set)
3. **Meals Builder** -- add/remove meals, add foods/recipes to meals
4. **Weekly Schedule** (Day Planner) -- assign meals to day+meal_type slots

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
| Copy day                | No, select+tap    | **INLINE**   | Native select + button                            |
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
| `meal-section.tsx`          | Single meal card: items list + tabbed picker + delete       | detail screen        |
| `meal-item-row.tsx`         | Food/recipe row with image, name, amounts, remove           | meal-section         |
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
  ├── MealSection (per meal)
  │   ├── useCreateMealItemMutation    → add food/recipe to meal
  │   ├── useDeleteMealItemMutation    → remove item from meal
  │   └── useDeleteMealMutation        → delete entire meal
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

### 1. MealItem includes resolved food/recipe objects

The `MealItem` type includes `food: Food | null` and `recipe: Recipe | null` (server returns them). This avoids a separate lookup/query to display item names and images in `MealItemRow`.

### 2. Tabbed item picker (Foods + Recipes)

`MealItemPicker` has two tabs with independent server-side searches rather than a combined search. This keeps the UX clear (coach knows which type they're adding) and avoids type ambiguity in results.

### 3. MealPicker with "New meal" as first option

The day planner's `MealPicker` always shows "New meal" as the first autocomplete option. When text is typed, it becomes "Create [name]". This enables creating a meal and assigning it to a day slot in one action rather than requiring the coach to create a meal in the Meals section first. If no name is typed, the meal defaults to the slot's meal_type label (e.g., "Breakfast").

### 4. Auto-scroll on meal creation

After creating a meal (from either the inline "Add Meal" or the day planner), the detail page scrolls to the new `MealSection` in the Meals builder. Implemented via a callback ref pattern: `scrollToMealId` state + callback ref that fires `scrollIntoView()` and then clears itself.

### 5. Day values use named days, not numbers

The API uses `"monday"` through `"sunday"` for the `day` field, and `"breakfast"`, `"lunch"`, `"dinner"`, `"snack"` for `meal_type`. These are displayed as shortened labels (Mon-Sun) in the day tabs.

### 6. Copy day is inline, not a dialog

Copying a day's assignments to another day uses a native `<select>` + "Copy" button inline below the day slots. This is a simple select+tap interaction with no keyboard involvement.

### 7. Plan assignment works from both directions

A plan can be assigned to a client from two entry points:

- **From plan detail page:** "Copy to Client" button in the top nav bar reveals an inline `ClientPicker` panel below the nav bar. The coach searches for a client, and the API copies the plan template to that client.
- **From client detail page:** "Assign Plan" button in the top nav bar reveals an inline `NutritionPlanPicker` within the Nutrition Plans section. The coach searches plan templates and assigns one.

Both use the same `assignNutritionPlan` mutation (`POST /nutrition_plans/:id/assign`). The API creates a copy of the plan for the client (the original template remains unchanged).

### 8. Library listing shows templates only

The nutrition plans list screen (`/library/nutrition-plans`) client-side filters out plans where `client_id !== null`. Only template plans (unassigned) appear in the library. Client-assigned copies are shown on the client detail page in the "Nutrition Plans" section.

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
| `DELETE /v1/coach/meal_items/:id`               | `useDeleteMealItemMutation`       | Remove item from meal              |
| `POST /v1/coach/nutrition_plans/:id/plan_items` | `useCreatePlanItemMutation`       | Assign meal to day slot            |
| `DELETE /v1/coach/plan_items/:id`               | `useDeletePlanItemMutation`       | Remove day assignment              |
| `POST /v1/coach/nutrition_plans/:id/copy-day`   | `useCopyNutritionPlanDayMutation` | Copy day assignments               |
| `POST /v1/coach/nutrition_plans/:id/assign`     | `useAssignNutritionPlanMutation`  | Copy plan to a client              |
| `GET /v1/coach/nutrition_plans?client_id=X`     | `useListNutritionPlansQuery`      | List plans assigned to a client    |
| `GET /v1/coach/foods`                           | `useListFoodsQuery`               | Food search in picker              |
| `GET /v1/coach/recipes`                         | `useListRecipesQuery`             | Recipe search in picker            |
| `GET /v1/coach/clients`                         | `useListClientsQuery`             | Client search in ClientPicker      |

---

## What's Not Built Yet

- **Meal reordering** -- `reorderNutritionPlanMeals` mutation exists but drag-and-drop UI is deferred
- **Meal item reordering** -- position field exists but no drag-and-drop
- **Meal name editing** -- `updateMeal` mutation exists, inline rename not yet implemented
- **Meal item editing** -- `updateMealItem` mutation exists, editing amounts not yet implemented
- **Plan duplication** -- `duplicateNutritionPlan` mutation exists, UI deferred (separate from assignment which is built)
- **Shopping list** -- `getNutritionPlanShoppingList` endpoint exists, UI deferred
- **Computed macros** -- `getNutritionPlanMacros` endpoint exists, UI deferred
- **Tags management** -- tags field exists on plan, not exposed in form yet
