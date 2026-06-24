# Coach Nutrition Plan Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A one-page, mobile-first coach nutrition plan builder in `coachapp-v2` — Meals library (build meals from foods/recipes with live macro math) + hybrid Schedule (assign meals to day × slot) — reusing the shared `builder-kit` shipped with the training builder.

**Architecture:** Mirror the just-merged training plan builder (`src/training-plans/plan-builder/`) under a new `src/nutrition-plans/plan-builder/`. Use the GENERATED kebab RTK Query hooks (`generated.ts`) for plan/meal/meal-item/schedule ops, and a fresh hand-written infinite query for the foods/recipes picker (mirroring `src/api/training-exercises.ts`). The legacy hand-written nutrition API layer (`nutritionPlans.ts`, `meals.ts`, `foods.ts`, `recipes.ts`) targets DEAD underscore routes and MUST NOT be used — it is out-of-scope dead code. Macros come from server-computed snapshots: the meal already exposes `NutritionMeal.nutrition`, and Task 1 adds a per-item `nutrition` snapshot to `NutritionMealItem` so item rows, meal totals, and day-vs-target all read snapshots; the amount-sheet's live per-keystroke preview is computed client-side from the picked `Food`'s per-100g macros.

**Tech Stack:** React/TypeScript, HeroUI v3.2 (`@heroui/react`), Tailwind v4, Redux Toolkit 2.9 / RTK Query; backend Elixir/Phoenix/Ecto + OpenApiSpex. Macro helpers: `@easy/utils` (`computeMacrosFromSnapshot`, `sumMacros`, `normalizeMacros`, `formatMacroValue`).

## Global Constraints

- **QUALITY BAR (user directive):** build GOOD code fresh to the UX spec + clean FE architecture. Legacy nutrition builder code (`nutrition-plan-detail.tsx`, `day-planner.tsx`, `meal-item-picker.tsx`, the `macros_goal`/`macros` legacy shape) must NOT drive structure — it is app-fit reference only. Reviewers flag legacy-mimicry, sloppy structure, or low quality as a DEFECT, not just spec-coverage gaps.
- **Spec + mockups are the source of truth:** `docs/superpowers/specs/2026-06-20-nutrition-plan-builder-ux-design.md` + validated HTML in `docs/superpowers/specs/assets/nutrition-plan-builder/` (`02-meal-editor.html`, `04-schedule-hybrid.html`, etc.). Inherits Layout A, width discipline, keyboard-aware sheets, the search picker, autosave-per-action from the training builder.
- **Reuse the builder-kit as-is:** `src/builder-kit/{use-visual-viewport,keyboard-sheet,search-picker-sheet}` + `src/hooks/use-debounce.ts` + `src/training-plans/plan-builder/hooks/use-workout-accordion.ts` (generic single-open accordion — import it directly; do not duplicate). If the kit needs a change for nutrition, make it generic in the kit, not a fork.
- **API layer = GENERATED kebab hooks** from `src/api/generated.ts`, injected into the `api` base slice, `tag:false` (NO cache tags). EVERY mutation MUST manually refresh its query — optimistic `api.util.updateQueryData(<query>, <arg>, draft => …)` + `patch.undo()` rollback on failure, matching the training builder. NEVER import `generated.ts` where a hand-written endpoint for the same op still exists; the foods/recipes infinite picker is the only hand-written endpoint we add (it has no generated-list collision because infinite lists stay hand-written and reuse generated TYPES).
- **Cache-key consistency:** every `updateQueryData('getNutritionPlan', {id}, …)` and `updateQueryData('getNutritionPlanSchedule', {planId}, …)` call across the builder MUST use the identical arg object, or optimistic writes miss the cache. Pick the canonical args once (`{id: planId}` for the plan detail; `{planId}` for the schedule) and use them everywhere.
- **Failure UX:** on any mutation catch, `patch.undo()` (if optimistic) AND `toast.danger("Couldn't save …")` (the `toast` from `@heroui/react`, per `nutrition-plan-detail.tsx`/the training builder). No silent catches.
- **Width discipline:** indent once + a 2px accent rule (`#6c8cff`), never stack padding, numeric fields span full width. Accent `#6c8cff`; dark theme.
- **Gate per task:** `pnpm --filter coachapp-v2 build` (tsc + vite, 0 errors) + Biome clean on touched files. FE has no unit-test runner — do not add one; add the smallest assert-style check only where pure logic is genuinely fragile (macro rollups). Backend tasks run `mix precommit` + `mix test`.

---

## File Structure

New (mirrors `src/training-plans/plan-builder/`):
- `src/api/nutrition-foods.ts` — hand-written infinite queries for foods + recipes (mirrors `training-exercises.ts`), reusing generated `Food`/`Recipe`/`ListFoodsApiArg`/`ListRecipesApiArg` types.
- `src/nutrition-plans/plan-builder/food-recipe-picker-sheet.tsx` — picker (mirrors `exercise-picker-sheet.tsx`).
- `src/nutrition-plans/plan-builder/amount-sheet.tsx` — keyboard-docked amount editor with live preview (mirrors `set-sheet.tsx`).
- `src/nutrition-plans/plan-builder/meal-item-row.tsx` — full-width item row with per-item macro contribution (mirrors `exercise-row.tsx`/`set-row.tsx`).
- `src/nutrition-plans/plan-builder/meal-card.tsx` — meal accordion (mirrors `workout-card.tsx`).
- `src/nutrition-plans/plan-builder/meals-list.tsx` — MEALS section (mirrors `workout-list.tsx`).
- `src/nutrition-plans/plan-builder/nutrition-schedule.tsx` — hybrid schedule: daily template + customize-days + read-only week grid (mirrors `week-schedule.tsx`).
- `src/nutrition-plans/plan-builder/pinned-schedule-bar.tsx` — sticky condensed schedule/macro bar (mirrors `pinned-week-bar.tsx`).
- `src/nutrition-plans/plan-builder/plan-header.tsx` — inline name + macro targets autosave (mirrors training `plan-header.tsx`).
- `src/nutrition-plans/plan-builder/nutrition-plan-builder.tsx` — assembled screen (mirrors training `plan-builder.tsx`).
- `src/nutrition-plans/plan-builder/macro-math.ts` — thin wrappers over `@easy/utils` for item/meal/day rollups (only if the utils don't cover a rollup directly).

Backend (Task 1): `backend/lib/easy/easy_web/controllers/.../meal_item` view/serializer + the OpenApiSpex `NutritionMealItem` schema + a controller/serializer test.

Modify: `src/router.tsx` (point `NUTRITION_PLAN_DETAIL` at the new builder), `src/api/base.ts` (add any new tag types if the picker's create-custom-food needs invalidation).

---

### Task 1: Backend — per-item nutrition snapshot (cross-stack)

**Files:**
- Modify the nutrition meal-item serializer/view (find it: `grep -rl "NutritionMealItem\|meal_item" backend/lib/easy/easy_web` — the view that renders a meal item for the coach plan-detail/meal responses) to add a computed `nutrition` map per item.
- Modify the OpenApiSpex schema for `NutritionMealItem` (under `backend/lib/easy_web/open_api/`) to declare the new `nutrition` object (`calories`, `protein_g`, `carbs_g`, `fat_g`, `fiber_g`, each `number | null`), mirroring the existing `NutritionMeal.nutrition` schema.
- Test: extend the relevant controller/serializer test under `backend/test/easy_web/controllers/coaches/` (the nutrition plan or meal controller test).

**Interfaces:**
- Produces: each meal item in the plan-detail/meal responses gains `nutrition: %{calories, protein_g, carbs_g, fat_g, fiber_g}`, computed the same way the meal-level snapshot is (resolve `weight_g` for a food item → `per_100g × weight_g/100`; recipe item → recipe per-serving/per-100g × resolved amount). If `weight_g`/macros can't resolve, emit `null` fields (do not crash). Reuse the existing macro-calc context function the meal snapshot already uses — do NOT duplicate the math.

- [ ] **Step 1:** Locate how `NutritionMeal.nutrition` is computed (the context fn / `MacroCalc`-style helper) and how the meal-item view currently renders. Confirm the item already has the resolved `weight_g` and the food/recipe macros available in the preload.
- [ ] **Step 2:** Write a failing controller test: GET a coach nutrition plan with a meal containing one food item (known `weight_g` + known per-100g macros) and assert `data...meal_items[0].nutrition.calories` equals the expected resolved value; add a recipe-item case and a null-weight case (nutrition fields null).
- [ ] **Step 3:** Add the per-item `nutrition` to the serializer by calling the existing macro helper for a single item; add the field to the OpenApiSpex schema (NOT in a `required` list — nullable).
- [ ] **Step 4:** `cd backend && mix test <the test file>` green; then `mix precommit`.
- [ ] **Step 5:** Regenerate the FE client: `cd backend && mix openapi.spec.json --spec EasyWeb.ApiSpec --pretty=true ../frontend/openapi/easy-openapi.json` then from `frontend/`: `node scripts/split-openapi.mjs && pnpm --filter coachapp-v2 gen:api && pnpm --filter clientapp-v2 gen:api` (or `just gen-api`). Confirm `NutritionMealItem.nutrition` now appears in `coachapp-v2/src/api/generated.ts`. `pnpm --filter coachapp-v2 build` green.
- [ ] **Step 6:** Commit (backend + regenerated clients together): `git commit -m "feat(nutrition): per-item macro snapshot on meal items + regen client"`

---

### Task 2: FE data layer — foods/recipes infinite picker queries

**Files:** Create `src/api/nutrition-foods.ts`. Modify `src/api/base.ts` only if a new tag type is needed for create-custom-food list refresh.

**Interfaces:**
- Consumes: generated TYPES `Food`, `Recipe`, `ListFoodsApiArg`, `ListRecipesApiArg`, `FoodListResponse`, `RecipeListResponse` from `generated.ts` (import types only — do NOT import the generated hooks for these, infinite lists stay hand-written).
- Produces: `useCoachFoodsInfiniteQuery` and `useCoachRecipesInfiniteQuery` — `build.infiniteQuery` mirroring `src/api/training-exercises.ts` exactly (same page-size, `getNextPageParam` by offset, `transformResponse` returning the generated list shape, debounced `search` arg threaded from the picker). Each provides list tags so `useCreateFoodMutation` (generated) invalidation refreshes the foods list (wire a `Food` list tag like training-exercises did for `TrainingExercise`).

- [ ] **Step 1:** Read `src/api/training-exercises.ts` and replicate its `build.infiniteQuery` structure for foods against `GET /v1/coach/nutrition-foods` (arg `{search?, offset, limit}` → `ListFoodsApiArg`), reusing `Food`/`FoodListResponse` types.
- [ ] **Step 2:** Add the analogous recipes infinite query against `GET /v1/coach/nutrition-recipes` reusing `Recipe`/`RecipeListResponse`.
- [ ] **Step 3:** Wire list tags + register the tag in `base.ts` if missing, so creating a custom food refreshes the picker (mirror training-exercises' tag handling).
- [ ] **Step 4:** `pnpm --filter coachapp-v2 build` + Biome.
- [ ] **Step 5:** Commit: `git commit -m "feat(coachapp): nutrition foods/recipes infinite picker queries"`

---

### Task 3: Food/recipe picker sheet

**Files:** Create `src/nutrition-plans/plan-builder/food-recipe-picker-sheet.tsx`.

**Interfaces:**
- Consumes: `SearchPickerSheet` (builder-kit), `useDebounce`, `useCoachFoodsInfiniteQuery`/`useCoachRecipesInfiniteQuery` (Task 2), `useCreateFoodMutation` (generated).
- Produces: `<FoodRecipePickerSheet open onClose onPick>` — composes `SearchPickerSheet`; a **Foods | Recipes toggle** (segmented control or two filter chips) switches the active infinite query; each row shows name + a macro badge (e.g. `380/100g · 80P` for foods from per-100g; recipes show per-serving from `Recipe.nutrition`); supports multi-select OR single-pick (see note); no-match → `+ Create food` (POST via `useCreateFoodMutation`, then pick it). `onPick(selection)` returns the chosen `Food`/`Recipe` object(s) WITH their macros so the amount sheet can preview without a refetch.
  - **Note (deviation from training multi-add):** the spec's amount sheet edits ONE item at a time with a live preview. Choose: multi-select foods that then open the amount sheet sequentially, OR single-pick → amount sheet. Mirror the spec mockup `02-meal-editor.html` (picker → amount sheet). Implementer: pick the simplest that matches the mockup; document the choice.

- [ ] **Step 1:** Read `exercise-picker-sheet.tsx` (the SearchPickerSheet consumer) + `02-meal-editor.html`. Build the Foods/Recipes toggle driving which infinite query feeds `SearchPickerSheet.items` (debounced search).
- [ ] **Step 2:** Render macro badges per item; recipes render per-serving macro line. Create-custom-food on no-match.
- [ ] **Step 3:** `onPick` hands the full picked object(s) up. `pnpm --filter coachapp-v2 build` + Biome.
- [ ] **Step 4:** Commit: `git commit -m "feat(coachapp): nutrition food/recipe picker sheet"`

---

### Task 4: Amount sheet + meal-item row (weight_g resolve + live preview)

**Files:** Create `src/nutrition-plans/plan-builder/amount-sheet.tsx`, `meal-item-row.tsx`, and `macro-math.ts` (thin `@easy/utils` wrappers if needed).

**Interfaces:**
- Consumes: `KeyboardSheet` (builder-kit), generated `useCreateMealItemMutation` / `useUpdateMealItemMutation` / `useDeleteMealItemMutation` (arg `{mealId, nutritionMealItemRequest}` / `{id, nutritionMealItemRequest}` / `{id}`; `NutritionMealItemRequest = {amount?, food_id?, recipe_id?, unit?, weight_g?, position?}`), `computeMacrosFromSnapshot`/`normalizeMacros`/`formatMacroValue` from `@easy/utils`, `Food.serving_sizes` (`{label, unit, amount, weight_g, is_default}`).
- Produces:
  - `<AmountSheet food|recipe mealId existingItem? onClose>` — KeyboardSheet-docked: serving-size taps (from `serving_sizes`) + a grams field → resolves to `weight_g` (a tap sets `weight_g` from the serving size × count; grams sets it directly). Live preview per keystroke: `computeMacrosFromSnapshot(food per-100g, weight_g)` → kcal + P/C/F. "✓ Add to meal" (or autosave-on-change for an existing item) PATCHes/POSTs the item. **If `weight_g` can't resolve, the add is rejected** (disable confirm; per schema). Flush a pending debounced save on close/unmount (no dropped edit — copy the training set-sheet flush pattern).
  - `<MealItemRow item onTap onDelete>` — full-width (single 10px indent + 2px accent rule): food/recipe name + amount (e.g. `Rolled Oats 80g`) + the per-item macro contribution from `item.nutrition` (Task 1's snapshot) shown compact (`300 · 28/63/15` or kcal + P). Tap opens AmountSheet on it.
- Cache: after item create/update/delete, optimistically update `getNutritionPlan` (`{id: planId}`) — insert/patch/remove the item in the right `meals[].meal_items[]`. Because the meal/day macro snapshots are SERVER-computed, also refetch the plan-detail query after the mutation settles so `meal.nutrition` + the new item's `nutrition` snapshot reconcile (optimistic row for snappiness, refetch for authoritative totals). `patch.undo()` + `toast.danger` on failure.

- [ ] **Step 1:** `meal-item-row.tsx` — presentational, width-discipline, reads `item.nutrition` for the contribution. (If `item.nutrition` absent for legacy data, show amount only.)
- [ ] **Step 2:** `amount-sheet.tsx` — serving-size taps + grams → weight_g resolver; live preview via `computeMacrosFromSnapshot`; reject when weight_g unresolved; create vs edit modes; flush-on-close.
- [ ] **Step 3:** Cache wiring: optimistic item insert/patch/remove in `getNutritionPlan` + reconciling refetch; failure rollback + toast.
- [ ] **Step 4:** Smallest assert check for the weight_g resolver + `computeMacrosFromSnapshot` usage if non-trivial. `pnpm --filter coachapp-v2 build` + Biome.
- [ ] **Step 5:** Commit: `git commit -m "feat(coachapp): nutrition amount sheet + meal-item row with macro preview"`

---

### Task 5: Meal card + meals library list

**Files:** Create `src/nutrition-plans/plan-builder/meal-card.tsx`, `meals-list.tsx`.

**Interfaces:**
- Consumes: `FoodRecipePickerSheet` (T3), `AmountSheet` + `MealItemRow` (T4), `use-workout-accordion` (import the generic single-open hook), generated `useGetNutritionPlanQuery` (`{id: planId}`), `useListMealsQuery`? (prefer reading meals off the plan-detail response to keep one source of truth), `useCreateMealMutation` (`{planId, nutritionMealRequest:{name, default_meal_slot?}}`), `useUpdateMealMutation` (`{id, nutritionMealRequest}`), `useDeleteMealMutation` (`{id}`).
- Produces:
  - `<MealCard meal planId open onToggle>` — accordion header: inline name rename (PATCH meal, optimistic + rollback) + meal total from `meal.nutrition` (kcal + P/C/F) + chevron; body = `MealItemRow` per `meal.meal_items` + `+ Add food or recipe` (opens picker → amount sheet → create item); delete-meal in a menu. Empty meal → "Add foods". Width discipline: body adds no nested horizontal padding around rows (rows own their indent).
  - `<MealsList planId>` — "MEALS" header + collapse-all; `MealCard`s (single-open accordion); `+ Add meal` (POST meal → opens it); empty state "Add your first meal". Reads meals from the `getNutritionPlan` cache.
- Cache: create/delete/rename meal → optimistic `updateQueryData('getNutritionPlan', {id: planId}, …)` + refetch for the recomputed snapshot; rollback + toast on failure. Same cache-key as Task 4.

- [ ] **Step 1:** `meal-card.tsx` — header rename + total + body rows + add/delete wiring (picker → amount sheet).
- [ ] **Step 2:** `meals-list.tsx` — list + collapse-all + add meal + empty state, reading from plan-detail.
- [ ] **Step 3:** Cache coherence with Task 4 (same query/arg). `pnpm --filter coachapp-v2 build` + Biome.
- [ ] **Step 4:** Commit: `git commit -m "feat(coachapp): nutrition meal card + meals library list"`

---

### Task 6a: Schedule — daily template ("Every day") + day total bar

**Files:** Create `src/nutrition-plans/plan-builder/nutrition-schedule.tsx` (the "Every day" template + day total; Task 6b adds customize-days + week grid).

**Interfaces:**
- Consumes: generated `useGetNutritionPlanScheduleQuery` (`{planId}` → `NutritionScheduleResponse {data?: {[day]: {[meal_slot]: …}}}`), `useSetNutritionPlanDayScheduleMutation` (`{planId, day, nutritionDayScheduleRequest}` where `NutritionDayScheduleRequest` = 6 optional slot keys → `NutritionScheduleSlot {meal_id}`), the meals from `getNutritionPlan` (for the meal dropdown options + their `meal.nutrition` for the day total), `@easy/utils` `sumMacros`.
- Produces: `<NutritionSchedule planId>` (the template view): the 6 meal slots (`breakfast, morning_snack, lunch, afternoon_snack, dinner, evening_snack`) each a HeroUI `Select` of library meals + "Unassigned"/clear. **"Every day" semantics:** assigning a slot writes that slot for ALL 7 days — PUT `schedule/:day` for each day with the merged whole-day slot map (the PUT replaces a day's slots, so read the current day map from the schedule cache, set/clear the one slot, send the full map; repeat per day). A **daily total bar**: Σ assigned meals' `meal.nutrition` vs the plan `target_*`, with a progress bar + %. Empty slot = nothing scheduled.
  - **Single-select pattern:** mirror training `week-schedule.tsx` Select usage (`selectedKey` + `onSelectionChange` → `key as string`, the codebase's single-select idiom).
- Cache: optimistic `updateQueryData('getNutritionPlanSchedule', {planId}, …)` for every affected day before the PUTs; `patch.undo()` + `toast.danger` on failure. Canonical arg `{planId}` everywhere.

- [ ] **Step 1:** Read training `week-schedule.tsx` for the optimistic-PUT pattern. Build the 6-slot template column with meal `Select`s.
- [ ] **Step 2:** "Every day" write: merge the chosen slot into each day's slot map and PUT all 7 days (optimistic cache write first, rollback all on any failure).
- [ ] **Step 3:** Daily total bar (Σ meal.nutrition vs target_* + %). Smallest assert check for the day-total sum if non-trivial.
- [ ] **Step 4:** `pnpm --filter coachapp-v2 build` + Biome.
- [ ] **Step 5:** Commit: `git commit -m "feat(coachapp): nutrition schedule — daily template + day total"`

---

### Task 6b: Schedule — customize-days overrides + read-only week grid + pinned bar

**Files:** Extend `nutrition-schedule.tsx`; create `src/nutrition-plans/plan-builder/pinned-schedule-bar.tsx`.

**Interfaces:**
- Produces:
  - `[Every day] [Customize]` toggle in `NutritionSchedule`. **Customize-days:** reveals day tabs (Mon–Sun); editing a day writes ONLY that day's slot map (single PUT `schedule/:day`). Overridden days are visually marked (amber) in the week grid; untouched days keep showing the template values.
  - **Read-only week overview:** a compact 6×7 grid (slots × days) projecting `schedule_entries`/the schedule map; tapping a cell jumps to that day's override editor. Editing never happens in the grid.
  - `<PinnedScheduleBar planId>` — sticky condensed bar (e.g. `Bfast Oats · Lunch Chicken…` or the day total) per the page-anatomy mockup; placed in the assembled screen's content column so `sticky top-0 z-10` works (NOT inside an overflow-hidden ancestor — see training fix).
- Cache: same `getNutritionPlanSchedule` `{planId}` optimistic pattern; override PUT updates only its day.

- [ ] **Step 1:** Every-day vs Customize toggle + day tabs; per-day override editor reusing the slot-row component from 6a.
- [ ] **Step 2:** Read-only 6×7 week grid projection; amber mark for overridden days; tap-cell → jump to that day.
- [ ] **Step 3:** `pinned-schedule-bar.tsx` (sticky condensed projection).
- [ ] **Step 4:** `pnpm --filter coachapp-v2 build` + Biome.
- [ ] **Step 5:** Commit: `git commit -m "feat(coachapp): nutrition schedule — customize-days + week grid + pinned bar"`

---

### Task 7: Plan header (name + macro targets) + assemble screen + route

**Files:** Create `src/nutrition-plans/plan-builder/plan-header.tsx`, `nutrition-plan-builder.tsx`; modify `src/router.tsx`. Reuse/mirror training `plan-actions.tsx` + `plan-add-to-client.tsx` + delete dialog (assess for direct reuse vs a thin nutrition variant using generated nutrition hooks — verify generated `useUpdateNutritionPlanMutation` / assign / delete names).

**Interfaces:**
- Consumes: `PlanHeader`, `PinnedScheduleBar` (6b), `MealsList` (5), `NutritionSchedule` (6a/6b); generated `useGetNutritionPlanQuery` (`{id: planId}`), `useUpdateNutritionPlanMutation` (`{id, nutritionPlanRequest}` — `target_calories/target_protein_g/target_carbs_g/target_fat_g/target_fiber_g/name`).
- Produces:
  - `<PlanHeader plan>` — inline-editable plan name + the macro TARGET fields (calories, P, C, F; fiber optional), autosave-on-blur via `useUpdateNutritionPlanMutation` (optimistic update of the `getNutritionPlan` cache + rollback + toast). Header shows the targets per the mockup (`Target 2100 · 180P 200C 60F`).
  - `<NutritionPlanBuilder>` — the screen at `NUTRITION_PLAN_DETAIL`: keep `Page.Header`/`Content` shell + plan actions; `max-w-2xl` Layout-A column: `PlanHeader` → `PinnedScheduleBar` → `MealsList` → `NutritionSchedule`. Loading/error guards (use the `getNutritionPlan` query state).
- Router: replace the `NutritionPlanDetail` import/route target with `NutritionPlanBuilder` (route const `ROUTES.NUTRITION_PLAN_DETAIL`).

- [ ] **Step 1:** `plan-header.tsx` — name + target fields, autosave + optimistic cache + toast.
- [ ] **Step 2:** `nutrition-plan-builder.tsx` — compose the screen (Layout A, sticky bar placement correct), loading/error guard, plan actions.
- [ ] **Step 3:** Point the route at the new builder. Verify the old `nutrition-plan-detail.tsx` is no longer routed (leave it as dead code for a later cleanup sweep; do not spend scope deleting the whole legacy nutrition surface).
- [ ] **Step 4:** `pnpm --filter coachapp-v2 build` + `pnpm --filter clientapp-v2 build` (no cross-app breakage) + Biome. Manual end-to-end (needs backend): create/open plan → set targets → add meals/items with live macros → schedule the week → everything autosaves + rolls up; matches the mockup.
- [ ] **Step 5:** Commit: `git commit -m "feat(coachapp): assemble nutrition plan builder screen + plan header + route"`

---

## Self-Review

**Spec coverage:** two-section Meals-library + Schedule (T5, T6a/b); meal editor with items + live meal total (T4, T5); food/recipe picker with Foods/Recipes toggle + create-custom (T3); amount sheet resolving to weight_g with live preview (T4); three-level macro rollup item→meal→day-vs-target (T1 item snapshot, T5 meal total, T6a day bar, T7 targets); hybrid schedule daily-template + customize-days overrides + read-only week grid (T6a/b); pinned schedule bar (T6b); plan header with targets (T7); autosave-per-action (every task); empty states (T5, T6, T7). Out-of-scope (schedule-centric model, editable grid, multi-week cycles, recipe authoring, client logging UI) excluded.

**Per-item macros decision (locked, user 2026-06-24):** backend per-item `nutrition` snapshot (T1) — meal totals + day rollups + item rows read server snapshots; amount-sheet preview computed client-side from the picked Food. NOT FE-hydration, NOT deferred.

**API decision (forced):** generated kebab hooks only; the hand-written legacy nutrition layer (underscore routes) is DEAD and excluded; foods/recipes picker uses a fresh hand-written infinite query (T2) reusing generated types.

**Type/name consistency:** generated hook + type names taken from `generated.ts` (`useGetNutritionPlanQuery {id}`, `useUpdateNutritionPlanMutation {id, nutritionPlanRequest}`, `useCreateMealMutation {planId, nutritionMealRequest}`, `useCreateMealItemMutation {mealId, nutritionMealItemRequest}`, `useSetNutritionPlanDayScheduleMutation {planId, day, nutritionDayScheduleRequest}`); `NutritionMealItemRequest` keys `{amount, food_id, recipe_id, unit, weight_g, position}`; meal_slot ∈ {breakfast, morning_snack, lunch, afternoon_snack, dinner, evening_snack}; day_of_week ∈ monday..sunday. Implementer verifies each against `generated.ts` (do not invent).

**Canonical cache args:** plan detail `getNutritionPlan {id: planId}`; schedule `getNutritionPlanSchedule {planId}` — identical across all `updateQueryData` call sites.
