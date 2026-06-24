# Coachapp API Kebab Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all of coachapp-v2 work against the current KEBAB backend by migrating every DEAD hand-written API file (pointing at pre-kebab routes) to the generated RTK Query hooks (+ hand-written infinite queries where lists need them), so the app is testable end-to-end.

**Architecture:** Same pattern as the just-completed nutrition-plans migration. Delete each dead legacy `src/api/*.ts` file, repoint its importing screens to the generated hooks from `src/api/generated.ts` (kebab routes), and add hand-written `build.infiniteQuery` files for paginated lists (codegen can't emit those) reusing generated TYPES. The legacy files COLLIDE by endpoint name with generated (both inject into the `api` slice → RTK first-wins), so deleting them removes the collision AND fixes the dead routes AND fixes arg-shape drift.

**Tech Stack:** React/TypeScript, HeroUI v3.2, Redux Toolkit 2.9 / RTK Query; generated client from backend OpenApiSpex.

## Global Constraints

- **Generated hooks are the target.** Import from `@/api/generated`. Verify every hook name + arg-wrapper shape against `generated.ts` before using — DO NOT invent. Legacy call shapes differ (legacy often `{id, body}`; generated is `{id, <resource>Request: …}`) — every call site must be updated to the generated arg shape.
- **Delete-then-use per slice:** when a slice migrates a feature, switch its components to generated AND delete the dead legacy api file in the same slice. Never leave a dead file importing nothing.
- **Infinite lists stay hand-written** `build.infiniteQuery` reusing generated request/response TYPES. Reuse the existing ones where they fit: `training-exercises.ts` (`useCoachTrainingExercisesInfiniteQuery`), `nutrition-foods.ts` (`useCoachFoodsInfiniteQuery`, `useCoachRecipesInfiniteQuery`), `nutrition-plans-list.ts` (`useCoachNutritionPlansInfiniteQuery`). New ones needed: `training-plans-list.ts`, `client-training-sessions.ts` (see slices).
- **`tag:false` on generated endpoints** → mutating features must manually refresh their query (optimistic `api.util.updateQueryData(...)` + `patch.undo()` + `toast.danger`, or refetch). Match the discipline already in the two builders. For library list/detail screens that just read, no special cache work beyond what the hand-written infinite queries already provide (`pageTags`).
- **`normalizeMacros` transform:** legacy `foods.ts`/`recipes.ts` applied `normalizeMacros` in `transformResponse` to canonicalize macro keys (`macros: {calories_per_100g, protein_g, carbs_g, fats_g}`). Generated hooks DON'T transform — `Food` exposes top-level `calories_per_100g`/`protein_g_per_100g`/… and `Recipe` exposes `nutrition`. Components reading the legacy `.macros` shape must be updated to read the generated fields directly (or a small local adapter). Do NOT re-introduce a global transform.
- **No backend invention.** Two endpoints have NO kebab equivalent (coach `meal_logs/summary`; flat cross-client `workout_sessions` list/get) — handle per the slice's stated strategy; do NOT fabricate a route.
- **`clients.ts`, `auth.ts`, `business.ts`, `profile.ts` are LIVE** — out of scope; leave them. (They collide by name with generated but hit live routes; a later cleanup can dedupe. `clients.ts`'s infinite `clients` query has no generated collision and stays.)
- **Gate per slice:** `pnpm --filter coachapp-v2 build` (tsc + vite, 0 errors) + `pnpm --filter clientapp-v2 build` (0 errors, no cross-app breakage) + Biome clean on touched files. No FE test runner — add the smallest assert only for non-trivial pure logic (e.g. an FE-computed summary). Manual end-to-end needs the backend running (out of scope per task, but this migration is what makes it possible).

---

### Task 1: Training plans + sessions (CRITICAL — fixes the live plan-builder)

**Delete:** `src/api/trainingPlans.ts`, `src/api/workoutSessions.ts`.
**Create:** `src/api/training-plans-list.ts` (infinite), `src/api/client-training-sessions.ts` (infinite).

**Generated replacements (verify in generated.ts):**
- `createTrainingPlan` → `useCreateTrainingPlanMutation({trainingPlanCreateRequest})`
- `listTrainingPlans` → `useListTrainingPlansQuery({offset?,limit?,search?,status?})` (non-infinite, for pickers)
- `trainingPlans` (infinite) → NEW `training-plans-list.ts` `useCoachTrainingPlansInfiniteQuery` against `GET /v1/coach/training-plans`, reusing `TrainingPlanListResponse`+`ListTrainingPlansApiArg`. Clone `nutrition-plans-list.ts`.
- `listClientTrainingPlans` → `useListCoachClientTrainingPlansQuery({clientId,offset?,limit?,status?})`
- `getTrainingPlan` → `useGetTrainingPlanQuery({id})`
- `updateTrainingPlan` → `useUpdateTrainingPlanMutation({id, trainingPlanUpdateRequest})` — **call sites currently pass `{id, body}` → change to `{id, trainingPlanUpdateRequest: body}`** (plan-header.tsx, plan-actions.tsx).
- `deleteTrainingPlan` → `useDeleteTrainingPlanMutation({id})`
- `assignTrainingPlan` → `useAssignTrainingPlanMutation({id, trainingPlanAssignRequest})`
- Sessions: flat `listWorkoutSessions`/`getWorkoutSession` have NO flat equivalent — use client-scoped `useListCoachClientTrainingSessionsQuery({clientId,from?,to?})` + `useGetCoachClientTrainingSessionQuery({clientId,id})`. NEW `client-training-sessions.ts` `useCoachClientTrainingSessionsInfiniteQuery` against `GET /v1/coach/clients/:client_id/training-sessions` reusing `TrainingSessionListResponse`+`ListCoachClientTrainingSessionsApiArg`.

**Importers to repoint:** training-plans: `training-plan-picker`, `create-training-plan`, `edit-training-plan`, `list-training-plans`, `plan-builder/{plan-actions,plan-add-to-client,plan-builder,plan-delete-alert-dialog,plan-header}`, `training-plan-form`, `training-plan-list-item`. clients: `client-detail` (assign + list-client-plans), `clients/lib/client.ts`. shared: `@components/client-plan-banner.tsx` (legacy `PlanClient` → generated `TrainingPlanClient`). sessions: `clients/client-workout-history-page` (infinite), `clients/components/client-workout-history` (list, now needs clientId), `clients/session-detail` (now needs clientId), `clients/lib/session.ts`, `domain/workout-sessions.ts` (retype `WorkoutSession`→`TrainingSession`: `performed_sets: TrainingPerformedSet[]`, `training_workout_id`).

**Type swaps:** legacy `TrainingPlan` (with `plan_items`/`workouts`/`client`) → generated `TrainingPlan` (`TrainingPlanItem.day_of_week`, `TrainingPlanClient`); `WorkoutSession`→`TrainingSession`. The plan-builder already reads workouts via `useListWorkoutsQuery` so its plan-detail usage is mostly the plan meta — verify `plan-builder.tsx`/`plan-header.tsx`/`training-plan-form.tsx` compile against the generated `TrainingPlan` and fix field refs.

- [ ] **Step 1:** Create `training-plans-list.ts` (clone nutrition-plans-list.ts) + `client-training-sessions.ts` (clone, client-scoped arg).
- [ ] **Step 2:** Repoint training-plans screens to generated CRUD + the new infinite; fix `updateTrainingPlan` call shape in plan-header/plan-actions; swap types.
- [ ] **Step 3:** Repoint session screens to client-scoped generated hooks + the new session infinite (thread `clientId` from the route/props where the flat call was used).
- [ ] **Step 4:** Repoint clients/shared importers (client-detail assign/list, client-plan-banner `TrainingPlanClient`); retype domain/workout-sessions + clients/lib/session.
- [ ] **Step 5:** Delete `trainingPlans.ts` + `workoutSessions.ts`. `pnpm --filter coachapp-v2 build` + `pnpm --filter clientapp-v2 build` + Biome — all green.
- [ ] **Step 6:** Commit: `git commit -m "refactor(coachapp): migrate training-plans + sessions to generated kebab hooks"`

---

### Task 2: Exercises library

**Delete:** `src/api/exercises.ts`.

**Generated replacements:** `createExercise`→`useCreateExerciseMutation({trainingExerciseCreateRequest})` (prefer `useCreateCoachTrainingExerciseMutation` from `training-exercises.ts` for list invalidation); `getExercise`→`useGetExerciseQuery({id})`; `exercises` infinite→`useCoachTrainingExercisesInfiniteQuery` (training-exercises.ts, already exists); `updateExercise`→`useUpdateExerciseMutation({id, trainingExerciseUpdateRequest})`; `deleteExercise`→`useDeleteExerciseMutation({id})`; `duplicateExercise`→`useCopyExerciseMutation({id, trainingExerciseCopyRequest: {name}})` — **the copy now REQUIRES a `{name}` body; `exercise-detail.tsx` currently calls with no name → add a small UI affordance (prompt/sheet) to collect the new name, or default to `"<name> (copy)"`.**

**Importers:** `exercises/{create-exercise,edit-exercise,exercise-detail,exercise-list-item,list-exercises}`, `exercises/exercise-form/exercise-form.tsx`.
**Type swap:** legacy `Exercise.business_id` (used in `exercise-detail.tsx:100` to gate edit/delete) → generated `TrainingExercise` has NO `business_id`; gate on `source === 'system'` (system = read-only) instead. Swap `Exercise`/`ExerciseMechanics`/`ExerciseForce`/`ExerciseCreateRequest`/`ExerciseUpdateRequest` types to the generated `TrainingExercise*` equivalents (verify names).

- [ ] **Step 1:** Repoint `list-exercises` → `useCoachTrainingExercisesInfiniteQuery`; the form + list-item + detail to generated types (`TrainingExercise`), gating on `source` not `business_id`.
- [ ] **Step 2:** Repoint create/edit/get/update/delete to generated; rework duplicate→copy with a name.
- [ ] **Step 3:** Delete `exercises.ts`. Both apps build + Biome green.
- [ ] **Step 4:** Commit: `git commit -m "refactor(coachapp): migrate exercises library to generated training-exercise hooks"`

---

### Task 3: Foods library

**Delete:** `src/api/foods.ts`.

**Generated replacements:** `createFood`→prefer `useCreateCoachFoodMutation` (nutrition-foods.ts, invalidates list); `getFood`→`useGetFoodQuery({id})`; `listFoods`→`useListFoodsQuery({offset?,limit?,search?})`; `deleteFood`→`useDeleteFoodMutation({id})`; `foods` infinite→`useCoachFoodsInfiniteQuery` (nutrition-foods.ts); `updateFood`→`useUpdateFoodMutation({id, foodUpdateRequest})`.
**normalizeMacros:** components reading `food.macros` (`food-detail`, `food-form`, `food-picker`, `food-list-item`, `ingredient-list`) must read the generated `Food` fields directly (`calories_per_100g`, `protein_g_per_100g`, `carbs_g_per_100g`, `fat_g_per_100g`, `fiber_g_per_100g`). Add a tiny local helper if a `Macros`-shaped object is genuinely needed (e.g. for `computeMacrosFromSnapshot`), but no global transform.

**Importers:** `foods/{create-food,edit-food,food-detail,food-list-item,list-foods}`, `foods/components/{food-picker,ingredient-list}`, `foods/food-form/food-form.tsx`. Cross-feature TYPE importers of `Food` from `@/api/foods`: `nutrition-plans/plan-builder/meal-item-row.tsx`, `recipes/recipe-form/recipe-form.tsx`, `domain/recipes.ts` (+ `api/recipes.ts` which is deleted in Task 4) → switch these to `import type {Food} from '@/api/generated'`.

- [ ] **Step 1:** Repoint `list-foods`→`useCoachFoodsInfiniteQuery`; `food-picker`→generated `useListFoodsQuery`; food types→generated `Food`.
- [ ] **Step 2:** Repoint create/edit/detail/delete to generated; update macro-field reads (drop `.macros`).
- [ ] **Step 3:** Switch cross-feature `Food` type imports to generated. Delete `foods.ts`. Both apps build + Biome green.
- [ ] **Step 4:** Commit: `git commit -m "refactor(coachapp): migrate foods library to generated nutrition-food hooks"`

---

### Task 4: Recipes library

**Delete:** `src/api/recipes.ts`.

**Generated replacements:** `createRecipe`→`useCreateRecipeMutation({recipeRequest})`; `getRecipe`→`useGetRecipeQuery({id})`; `listRecipes`→`useListRecipesQuery({offset?,limit?,search?})`; `deleteRecipe`→`useDeleteRecipeMutation({id})`; `recipes` infinite→`useCoachRecipesInfiniteQuery` (nutrition-foods.ts); `updateRecipe`→`useUpdateRecipeMutation({id, recipeRequest})`.
**normalizeMacros:** same as foods — read generated `Recipe.nutrition` directly.
**`foodFromApi`:** `recipes.ts` imported `foodFromApi` from `foods.ts` (deleted in Task 3). If recipe-form still needs to map a food, read the generated `Food` directly or move a small helper to a shared module.

**Importers:** `recipes/{create-recipe,edit-recipe,list-recipes,recipe-detail,recipe-list-item}`, `recipes/recipe-form/recipe-form.tsx`. Cross-feature `Recipe` TYPE importer: `nutrition-plans/plan-builder/meal-item-row.tsx` → `import type {Recipe} from '@/api/generated'`.

- [ ] **Step 1:** Repoint `list-recipes`→`useCoachRecipesInfiniteQuery`; recipe types→generated `Recipe`.
- [ ] **Step 2:** Repoint create/edit/detail/delete to generated; macro reads via `Recipe.nutrition`; resolve `foodFromApi`.
- [ ] **Step 3:** Switch cross-feature `Recipe` type imports to generated. Delete `recipes.ts`. Both apps build + Biome green.
- [ ] **Step 4:** Commit: `git commit -m "refactor(coachapp): migrate recipes library to generated nutrition-recipe hooks"`

---

### Task 5: Meal logs / client nutrition adherence

**Delete:** `src/api/mealLogs.ts`.

**Generated replacements:** `listCoachMealLogs` → `useListCoachMealLogsQuery({clientId, date?, from?, to?})` — **URL/arg change:** old flat `{client_id, from, to}` query → generated client-scoped path (`/clients/:clientId/nutrition-meal-logs`). `client-nutrition-detail.tsx` switches `client_id`→`clientId`.
**`getCoachMealLogSummary` — NO backend route.** Strategy: **compute the daily summary client-side** from the `listCoachMealLogs` data (aggregate logged macros per day) in `client-nutrition-adherence.tsx` (or a `domain/client-nutrition.ts` helper). If the meal-log list response lacks the fields needed to aggregate (inspect `CoachMealLog`/the generated meal-log type), DO NOT fake it — instead render a graceful "summary unavailable" state and REPORT that the backend needs a summary endpoint (a follow-up), so the rest of the nutrition view still works. Add one assert for the FE aggregation if implemented.

**Importers:** `clients/components/{client-nutrition-adherence,client-nutrition-detail}`, `domain/client-nutrition.ts` (retype `CoachMealLog`/`DailyNutritionSummary`/`FoodLogEntry`/`PlannedSnapshotItem` against generated where available).

- [ ] **Step 1:** Repoint `client-nutrition-detail` list to `useListCoachMealLogsQuery({clientId,…})`; retype domain helpers to generated meal-log types.
- [ ] **Step 2:** Replace `getCoachMealLogSummary` usage in `client-nutrition-adherence` with an FE aggregation over the log list (assert it) OR a graceful unavailable-state + a reported backend follow-up — decide based on the actual log fields and document.
- [ ] **Step 3:** Delete `mealLogs.ts`. Both apps build + Biome green.
- [ ] **Step 4:** Commit: `git commit -m "refactor(coachapp): migrate meal-logs/adherence to generated kebab hooks (+ summary strategy)"`

---

## Self-Review

**Coverage:** all 6 dead files (trainingPlans, workoutSessions, exercises, foods, recipes, mealLogs) migrated across 5 slices; live files (clients/auth/business/profile) left as-is. New infinite queries: training-plans-list, client-training-sessions (exercises/foods/recipes/nutrition-plans infinite already exist and are reused).

**Risk register (called out per slice):** (1) generated arg-shape ≠ legacy `{id,body}` — every mutation call site updated; (2) `updateTrainingPlan` call-shape fix unbreaks the live training plan-header; (3) sessions + meal-logs are now client-scoped (clientId path param) — flat callers must supply clientId; (4) `copyExercise` requires a name; (5) `normalizeMacros` dropped → components read generated macro fields; (6) NO backend equivalent for meal-log summary (FE-compute or graceful-defer + flag) and flat cross-client session list (use client-scoped); (7) type swaps (Exercise.business_id→source, WorkoutSession→TrainingSession, TrainingPlanItem.day→day_of_week, PlanClient→TrainingPlanClient).

**Type/name consistency:** all generated hook + type names are taken from the audit against `generated.ts`; the implementer re-verifies each before use (do not invent). Endpoint-name collisions are resolved by DELETING the legacy file in the same slice.
