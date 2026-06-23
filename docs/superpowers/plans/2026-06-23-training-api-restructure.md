# Training API Restructure (Plan 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the training HTTP surface to the spec: kebab `training-` paths, schedule GET/PUT replacing plan-item CRUD, `training-sessions` logging with merged end/discard, coach read-only client sessions, exercise `copy`, plus the `Easy.Training.*` module renames, OpenApiSpex renames, Ctx-first context conversion, and strict request validation.

**Architecture:** This is Plan 2 — the API restructure layered on the completed training data layer (Plan 1, commits `543c8ec`..`15118a5`). It does NOT touch migrations or table columns. Three phases: (A) mechanical module/schema renames that keep behavior identical and the suite green; (B) Ctx-first conversion of the four contexts; (C) endpoint restructure (kebab routes, schedule, sessions, copy, strict validation). It is the sibling of the already-executed nutrition Plan 2 (`docs/superpowers/plans/2026-06-21-nutrition-api-restructure.md`) — mirror its files where noted.

**Tech Stack:** Elixir / Phoenix / Ecto / OpenApiSpex, Postgres.

## Global Constraints

- **Context functions take `%Easy.Ctx{} = ctx` as their FIRST parameter** (read `ctx.business_id` / `ctx.user_id` internally), never separate `business_id`/`user_id` args. Reference: `lib/easy/exercises.ex`, `lib/easy/foods.ex`. Controllers pass `conn.assigns.ctx`. Schema-module functions (changesets, query builders) still take plain ids.
- The `create_x(business_id, coach_id, attrs)` + `create_x_for_coach_user(business_id, user_id, attrs)` PAIR collapses to a single `create_x(%Ctx{} = ctx, attrs)` resolving the coach via a private `get_coach(ctx)`. Same for client-side pairs via private `get_client(ctx)`. The `_for_user` / `_for_coach_user` / `_for_client` wrappers are deleted.
- **`business_id` MUST NOT appear in any API response** (enforced by `test/easy_web/controllers/business_id_response_test.exs`). Keep it out of OpenApiSpex entity schemas and JSON views.
- Strict request validation = `plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:create, :update, ...]` per write controller; request schemas use `struct?: false` + `additionalProperties: false`.
- Tenant-scope every query by `ctx.business_id`; controllers never call `Repo`; schemas hold no `@moduledoc`/`@doc`; `@spec` on public fns; enums as `:string` + DB check + `validate_inclusion`; binary_id PKs.
- Coach controllers scope by `ctx.business_id`; client controllers resolve via the context's private `get_client(ctx)`.
- Tests: `use Easy.ConnCase`, `authenticate_coach/2` / `authenticate_client/2`, set `content-type: application/json` for any CastAndValidate'd action, build clients with explicit `user: insert(:user)` to dodge `users_email_index` sandbox collisions.
- After EVERY task: `mix compile --warnings-as-errors` exits 0 and `mix test` is fully green before committing.

## Module rename map (applies across Phase A)

`Easy.Training.` namespace. **`TrainingPlan` and `PlannedSet` KEEP their names.**

| Old module | New module | Old file | New file |
|---|---|---|---|
| `Exercise` | `TrainingExercise` | `lib/easy/training/exercise.ex` | `training_exercise.ex` |
| `Muscle` | `TrainingMuscle` | `muscle.ex` | `training_muscle.ex` |
| `Equipment` | `TrainingEquipment` | `equipment.ex` | `training_equipment.ex` |
| `Workout` | `TrainingWorkout` | `workout.ex` | `training_workout.ex` |
| `WorkoutElement` | `TrainingWorkoutExercise` | `workout_element.ex` | `training_workout_exercise.ex` |
| `PlanItem` | `ScheduleEntry` | `plan_item.ex` | `schedule_entry.ex` |
| `WorkoutSession` | `TrainingSession` | `workout_session.ex` | `training_session.ex` |
| `PerformedSet` | `TrainingPerformedSet` | `performed_set.ex` | `training_performed_set.ex` |

OpenApiSpex schema renames (under `lib/easy_web/open_api/schemas/`), titles change with module names:

| Old schema | New schema |
|---|---|
| `Exercise*` (`ExerciseCreateRequest`, `ExerciseUpdateRequest`, `ExerciseDuplicateRequest`, `ExerciseRelation`, `Exercise`, `ExerciseListResponse`, `ExerciseResponse`) | `TrainingExercise*` (and `ExerciseDuplicateRequest` → `TrainingExerciseCopyRequest`) |
| `Muscle`, `MuscleListResponse` | `TrainingMuscle`, `TrainingMuscleListResponse` |
| `Equipment`, `EquipmentListResponse` | `TrainingEquipment`, `TrainingEquipmentListResponse` |
| `Workout*`, `WorkoutElement*` | `TrainingWorkout*`, `TrainingWorkoutExercise*` |
| `PlanItem*`, `TrainingPlanItem*` | (removed in Task 8 — schedule schemas replace them) |
| `WorkoutSession*` | `TrainingSession*` |
| `PerformedSet*` | `TrainingPerformedSet*` |

`ErrorResponse` currently lives in `exercise.ex` — leave it there (do not move; out of scope).

---

## Task 1: Rename reference + exercise modules (TrainingExercise, TrainingMuscle, TrainingEquipment)

Mechanical, behavior-preserving. The suite must stay green; this is pure renaming.

**Files:**
- Rename: `lib/easy/training/exercise.ex` → `training_exercise.ex`; `muscle.ex` → `training_muscle.ex`; `equipment.ex` → `training_equipment.ex`
- Modify (struct/alias refs — full list from discovery): `lib/easy/exercises.ex`, `lib/easy/sessions.ex`, `lib/easy/workouts.ex`, `lib/easy/training_plans.ex`, `lib/easy/training/{performed_set,workout_element,workout,training_plan,workout_session}.ex`, all `*_json.ex` under `lib/easy_web/controllers/{coaches,clients}/` that reference these structs (`exercise_json`, `performed_set_json`, `training_plan_json`, `workout_session_json`, `workout_element_json`, `workout_json`, `muscle_json`, `equipment_json`), `lib/easy_web/open_api/schemas/{exercise,training_reference,activity,training_plan,training_children}.ex`, `test/support/factory.ex`
- Modify (OpenApiSpex schema module + title renames): `lib/easy_web/open_api/schemas/exercise.ex` (`Exercise*`→`TrainingExercise*`, `ExerciseDuplicateRequest`→`TrainingExerciseCopyRequest`), `training_reference.ex` (`Muscle`→`TrainingMuscle`, `Equipment`→`TrainingEquipment` + their list responses), and every controller's `alias`/`operation` reference to those schemas
- Modify (boundary test path list): `test/easy/training/schema_boundary_test.exs` — in `@schema_paths`, replace `exercise.ex`→`training_exercise.ex`, `muscle.ex`→`training_muscle.ex`, `equipment.ex`→`training_equipment.ex`
- Modify (open-api title assertions): `test/easy_web/controllers/exercise_open_api_test.exs`, `training_reference_open_api_test.exs` — update any asserted schema titles/`operation_id`s that include the old names
- Test: `test/easy/training/*`, `test/easy_web/controllers/{coaches,clients}/exercise_controller_test.exs`

**Interfaces:**
- Produces: modules `Easy.Training.TrainingExercise`, `Easy.Training.TrainingMuscle`, `Easy.Training.TrainingEquipment`; OpenApiSpex `TrainingExercise*`, `TrainingExerciseCopyRequest`, `TrainingMuscle*`, `TrainingEquipment*`. Public context fn signatures in `Easy.Exercises` are UNCHANGED (already Ctx-first) — only the structs they return are renamed.
- Consumes: nothing new.

- [ ] **Step 1: Rename the three schema files and their `defmodule` lines**

```bash
cd backend
git mv lib/easy/training/exercise.ex lib/easy/training/training_exercise.ex
git mv lib/easy/training/muscle.ex lib/easy/training/training_muscle.ex
git mv lib/easy/training/equipment.ex lib/easy/training/training_equipment.ex
```

In each renamed file change the module name: `defmodule Easy.Training.Exercise` → `defmodule Easy.Training.TrainingExercise` (and Muscle/Equipment likewise). Inside `training_exercise.ex` the join-table assocs reference `TrainingExerciseMuscle`/`TrainingExerciseEquipment` and `Muscle`/`Equipment` — update the `Muscle`/`Equipment` aliases to `TrainingMuscle`/`TrainingEquipment`.

- [ ] **Step 2: Update every reference repo-wide**

For the schema struct/alias references, replace `Easy.Training.Exercise` → `Easy.Training.TrainingExercise`, `Easy.Training.Muscle` → `Easy.Training.TrainingMuscle`, `Easy.Training.Equipment` → `Easy.Training.TrainingEquipment` across all `lib/` and `test/` files, AND the bare `Exercise`/`Muscle`/`Equipment` forms used after `alias Easy.Training.{...}` (update those alias groupings and the local usages). Use grep to find them all, then edit:

```bash
grep -rln "Training.Exercise\b\|Training\.Muscle\b\|Training\.Equipment\b\|alias Easy.Training" lib test
```

Verify NO stale references remain (the rename is complete only when these return nothing but the new names):

```bash
grep -rn "Easy.Training.Exercise\b\|Easy.Training.Muscle\b\|Easy.Training.Equipment\b" lib test   # expect: empty
```

- [ ] **Step 3: Rename the OpenApiSpex schema modules + titles**

In `lib/easy_web/open_api/schemas/exercise.ex`: rename each `EasyWeb.OpenApi.Schemas.Exercise*` module and its `title:` to `TrainingExercise*`; rename `ExerciseDuplicateRequest` module + title to `TrainingExerciseCopyRequest`. In `training_reference.ex`: `Muscle`→`TrainingMuscle`, `Equipment`→`TrainingEquipment`, `MuscleListResponse`→`TrainingMuscleListResponse`, `EquipmentListResponse`→`TrainingEquipmentListResponse`. Update every `alias`/`operation` reference in the controllers (`coaches/exercise_controller.ex`, `clients/exercise_controller.ex`, `coaches/muscle_controller.ex`, `coaches/equipment_controller.ex`) and in `training_plan.ex`/`activity.ex`/`training_children.ex` if they reference `ExerciseRelation` etc.

- [ ] **Step 4: Update the boundary-test path list and open-api title assertions**

Edit `test/easy/training/schema_boundary_test.exs` `@schema_paths` entries as listed in Files. Update `exercise_open_api_test.exs` and `training_reference_open_api_test.exs` for any renamed titles/operation_ids.

- [ ] **Step 5: Compile and test**

Run: `mix compile --warnings-as-errors && mix test`
Expected: 0 warnings, full suite green (behavior unchanged).

- [ ] **Step 6: Commit**

```bash
git add -A lib/easy/training lib/easy lib/easy_web test
git commit -m "refactor(training): rename Exercise/Muscle/Equipment modules to Training* (no behavior change)"
```

---

## Task 2: Rename plan-structure modules (TrainingWorkout, TrainingWorkoutExercise, ScheduleEntry)

Mechanical, behavior-preserving. Same procedure as Task 1.

**Files:**
- Rename: `lib/easy/training/workout.ex` → `training_workout.ex`; `workout_element.ex` → `training_workout_exercise.ex`; `plan_item.ex` → `schedule_entry.ex`
- Modify (refs from discovery): `lib/easy/{workouts,training_plans,sessions}.ex`, `lib/easy/training/{training_plan,workout_session,performed_set,planned_set}.ex` and the renamed files' cross-refs, all `*_json.ex` referencing these structs, `lib/easy_web/open_api/schemas/{training_children,training_plan}.ex`, `test/support/factory.ex`
- Modify (OpenApiSpex module+title): `training_children.ex` — `Workout*`→`TrainingWorkout*`, `WorkoutElement*`→`TrainingWorkoutExercise*`; `training_plan.ex` — `TrainingPlanWorkout`/`TrainingPlanWorkoutElement`/`TrainingPlanExercise`/`TrainingPlanPlannedSet` stay (they are nested view schemas of `TrainingPlan`), but rename `TrainingPlanWorkoutElement`→`TrainingPlanWorkoutExercise` for vocabulary consistency. (`PlanItemRequest`/`TrainingPlanItem*` are handled in Task 8 — leave them this task.)
- Modify (boundary test): `test/easy/training/schema_boundary_test.exs` `@schema_paths` — `workout.ex`→`training_workout.ex`, `workout_element.ex`→`training_workout_exercise.ex`, `plan_item.ex`→`schedule_entry.ex`
- Modify: `test/easy/training/plan_item_test.exs` (struct alias `PlanItem`→`ScheduleEntry`)
- Test: `test/easy/training/*`, `test/easy_web/controllers/coaches/{workout,workout_element}_controller_test.exs`, `training_plan_controller_test.exs`

**Interfaces:**
- Produces: modules `Easy.Training.TrainingWorkout`, `Easy.Training.TrainingWorkoutExercise`, `Easy.Training.ScheduleEntry` (note: `ScheduleEntry` already exposes `day_of_week`, `for_business/2`, `for_plan/2`, `for_day/2`, `days/0`, `insert_changeset/4`, `with_workout/2` from Plan 1). Context fn signatures unchanged this task.
- Consumes: Task 1 module names.

- [ ] **Step 1: Rename files + `defmodule` lines**

```bash
cd backend
git mv lib/easy/training/workout.ex lib/easy/training/training_workout.ex
git mv lib/easy/training/workout_element.ex lib/easy/training/training_workout_exercise.ex
git mv lib/easy/training/plan_item.ex lib/easy/training/schedule_entry.ex
```

Change `defmodule Easy.Training.Workout` → `TrainingWorkout`, `WorkoutElement` → `TrainingWorkoutExercise`, `PlanItem` → `ScheduleEntry`.

- [ ] **Step 2: Update every reference repo-wide; verify none stale**

```bash
grep -rn "Training.Workout\b\|Training.WorkoutElement\b\|Training.PlanItem\b" lib test   # find
# ...edit all hits to TrainingWorkout / TrainingWorkoutExercise / ScheduleEntry...
grep -rn "Easy.Training.Workout\b\|Easy.Training.WorkoutElement\b\|Easy.Training.PlanItem\b" lib test   # expect: empty
```

Watch `workout_session.ex`/`training_session.ex` which alias `Workout` (foreign_key) and `PlanItem` (schedule_entry assoc) — update both. `belongs_to :schedule_entry, ScheduleEntry, foreign_key: :training_schedule_entry_id`; `belongs_to :workout, TrainingWorkout, foreign_key: :training_workout_id`.

- [ ] **Step 3: Rename OpenApiSpex modules/titles** in `training_children.ex` (`WorkoutRequest`→`TrainingWorkoutRequest`, `WorkoutUpdateRequest`→`TrainingWorkoutUpdateRequest`, `WorkoutElementRequest`→`TrainingWorkoutExerciseRequest`, `WorkoutResponse`→`TrainingWorkoutResponse`, `WorkoutListResponse`→`TrainingWorkoutListResponse`, `WorkoutElementResponse`→`TrainingWorkoutExerciseResponse`) and `TrainingPlanWorkoutElement`→`TrainingPlanWorkoutExercise` in `training_plan.ex`. Update `alias`/`operation` refs in `coaches/{workout,workout_element}_controller.ex`. Leave `PlanItemRequest`/`TrainingPlanItem*` for Task 8.

- [ ] **Step 4: Update boundary-test path list + plan_item_test alias** (see Files).

- [ ] **Step 5: Compile and test**

Run: `mix compile --warnings-as-errors && mix test`
Expected: 0 warnings, green.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(training): rename Workout/WorkoutElement/PlanItem modules (no behavior change)"
```

---

## Task 3: Rename activity modules (TrainingSession, TrainingPerformedSet)

Mechanical, behavior-preserving.

**Files:**
- Rename: `lib/easy/training/workout_session.ex` → `training_session.ex`; `performed_set.ex` → `training_performed_set.ex`
- Modify (refs): `lib/easy/sessions.ex`, `lib/easy/training/training_session.ex`/`training_performed_set.ex` cross-refs, `lib/easy_web/controllers/coaches/workout_session_controller.ex`, `clients/workout_session_controller.ex`, the session/performed-set `*_json.ex`, `lib/easy_web/open_api/schemas/activity.ex`, `test/support/factory.ex`
- Modify (OpenApiSpex module+title in `activity.ex`): `PerformedSetRequest`→`TrainingPerformedSetRequest`, `PerformedSet`→`TrainingPerformedSet`, `WorkoutSessionRequest`→`TrainingSessionRequest`, `WorkoutSessionCompleteRequest`→`TrainingSessionUpdateRequest` (renamed now; semantics broadened in Task 9), `WorkoutSession`→`TrainingSession`, `WorkoutSessionResponse`→`TrainingSessionResponse`, `WorkoutSessionListResponse`→`TrainingSessionListResponse`, `PerformedSetResponse`→`TrainingPerformedSetResponse`
- Modify (boundary test): `schema_boundary_test.exs` `@schema_paths` — `performed_set.ex`→`training_performed_set.ex`, `workout_session.ex`→`training_session.ex`
- Modify: `test/easy/training/performed_set_test.exs` (alias)
- Test: `test/easy/training/*`, `test/easy_web/controllers/{coaches,clients}/{workout_session,performed_set}_controller_test.exs`

**Interfaces:**
- Produces: `Easy.Training.TrainingSession` (keeps `states/0`, `insert_changeset/3`, `update_changeset/2`, `client_update_changeset/2`, `for_business/2`, `for_client/2`, `with_state/2`, `active/1`, `with_sets/1`, `for_date_range/3`, `newest/1`); `Easy.Training.TrainingPerformedSet` (keeps `insert_changeset/3`, `for_session/2`, `ordered/1`, `with_exercise/2`). OpenApiSpex `TrainingSession*`, `TrainingPerformedSet*`.
- Consumes: Task 1–2 module names.

- [ ] **Step 1: Rename files + defmodule**

```bash
cd backend
git mv lib/easy/training/workout_session.ex lib/easy/training/training_session.ex
git mv lib/easy/training/performed_set.ex lib/easy/training/training_performed_set.ex
```

`defmodule Easy.Training.WorkoutSession` → `TrainingSession`; `PerformedSet` → `TrainingPerformedSet`. Update the `has_many :performed_sets, TrainingPerformedSet` and `belongs_to :training_session` cross-refs.

- [ ] **Step 2: Update refs repo-wide; verify none stale**

```bash
grep -rn "Training.WorkoutSession\b\|Training.PerformedSet\b" lib test   # find + edit
grep -rn "Easy.Training.WorkoutSession\b\|Easy.Training.PerformedSet\b" lib test   # expect: empty
```

- [ ] **Step 3: Rename OpenApiSpex modules/titles in `activity.ex`** (see Files) + update `alias`/`operation` refs in the four session/performed-set controllers.

- [ ] **Step 4: Update boundary-test path list + performed_set_test alias.**

- [ ] **Step 5: Compile and test** — `mix compile --warnings-as-errors && mix test` → green.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(training): rename WorkoutSession/PerformedSet modules to Training* (no behavior change)"
```

---

## Task 4: Ctx-first conversion — Easy.Workouts

Pure signature change: every public fn takes `%Easy.Ctx{}` first. No coach resolver needed (workouts store no `creator_id`). Normalize `create_workout` arg order.

**Files:**
- Modify: `lib/easy/workouts.ex`
- Modify: `lib/easy_web/controllers/coaches/workout_controller.ex`, `coaches/workout_element_controller.ex` (pass `conn.assigns.ctx`)
- Test: `test/easy_web/controllers/coaches/{workout,workout_element}_controller_test.exs` (no path changes yet; behavior identical)

**Interfaces:**
- Produces (new signatures):
  - `get_workout(%Ctx{}, id)`, `get_workout_for_plan(%Ctx{}, plan_id, id)`, `get_workout_with_elements(%Ctx{}, id)`, `list_workouts(%Ctx{}, plan_id, offset, limit)`, `get_workout_element(%Ctx{}, id)`, `get_workout_element_with_exercise(%Ctx{}, id)`, `create_workout(%Ctx{}, plan_id, attrs)`, `update_workout(%Ctx{}, id, attrs)`, `delete_workout(%Ctx{}, id)`, `duplicate_workout(%Ctx{}, id)`, `create_workout_element(%Ctx{}, workout_id, attrs)`, `update_workout_element(%Ctx{}, id, attrs)`, `delete_workout_element(%Ctx{}, id)`
- Consumes: `%Easy.Ctx{}` from `conn.assigns.ctx`.

- [ ] **Step 1: Convert `Easy.Workouts`**

Replace the leading `business_id :: String.t()` param with `%Ctx{} = ctx` in every public fn and read `ctx.business_id` internally; for `create_workout` swap to `create_workout(%Ctx{} = ctx, plan_id, attrs)` (was `(plan_id, business_id, attrs)`); for `create_workout_element` to `create_workout_element(%Ctx{} = ctx, workout_id, attrs)`. Add `alias Easy.Ctx`. Drop the `duplicate_workout/1` struct overload if it becomes unused (it is removed from the API in Task 7 — keep the fn for now to stay green; Task 7 deletes it). Private query helpers keep taking `business_id` — pass `ctx.business_id` down.

- [ ] **Step 2: Update the two coach controllers** to call `Workouts.fn(conn.assigns.ctx, ...)` instead of destructuring `conn.assigns.claims.business_id`.

- [ ] **Step 3: Test** — `mix compile --warnings-as-errors && mix test test/easy_web/controllers/coaches/workout_controller_test.exs test/easy_web/controllers/coaches/workout_element_controller_test.exs` then full `mix test`. Expected green.

- [ ] **Step 4: Commit**

```bash
git add lib/easy/workouts.ex lib/easy_web/controllers/coaches/workout_controller.ex lib/easy_web/controllers/coaches/workout_element_controller.ex
git commit -m "refactor(training): Ctx-first Easy.Workouts"
```

---

## Task 5: Ctx-first conversion — Easy.TrainingPlans

Collapse the `_for_coach_user`/`_for_user`/`_for_client` wrapper pairs into single Ctx-first fns; add private `get_coach(ctx)` + `get_client(ctx)`; populate `creator_id` on duplicate/assign from the calling coach.

**Files:**
- Modify: `lib/easy/training_plans.ex`
- Modify: `lib/easy_web/controllers/coaches/training_plan_controller.ex`, `clients/training_plan_controller.ex`, `coaches/client_plan_controller.ex`
- Test: `test/easy_web/controllers/coaches/training_plan_controller_test.exs`, `clients/training_plan_controller_test.exs`, `coaches/client_plan_controller_test.exs`, `test/easy/training/training_plan_test.exs`

**Interfaces:**
- Produces (new signatures):
  - `get_plan_full(%Ctx{}, id)`, `list_template_plans(%Ctx{}, search, offset, limit)`, `create_training_plan(%Ctx{}, attrs)` (resolves `creator_id` via `get_coach`), `update_training_plan(%Ctx{}, id, attrs)`, `delete_training_plan(%Ctx{}, id)`, `duplicate_training_plan(%Ctx{}, id)` (new plan's `creator_id` = caller's coach), `assign_training_plan_to_client(%Ctx{}, plan_id, client_id, attrs)` (cloned plan's `creator_id` = caller's coach), `list_client_plans(%Ctx{}, client_id, ...)` for the coach per-client list, `list_client_plans(%Ctx{}, ...)` + `get_client_plan_full(%Ctx{}, id)` for the client-self views (resolve client via `get_client(ctx)`), `get_active_plan_day(%Ctx{}, date)` (backs client `/today`)
- Consumes: `%Easy.Ctx{}`. Keep two distinct public read paths — coach-side (scope by `ctx.business_id`, explicit `client_id` arg) and client-self (resolve `client_id` from `get_client(ctx)`); name them so the controllers stay unambiguous (e.g. coach `list_client_plans/4`, client `list_my_plans/3`, `get_my_plan_full/2`, `get_my_active_plan_day/2`).

- [ ] **Step 1: Add private resolvers** to `Easy.TrainingPlans` (mirror `lib/easy/foods.ex:138`):

```elixir
defp get_coach(%Ctx{} = ctx) do
  Coach |> Coach.for_business(ctx.business_id) |> Coach.for_user(ctx.user_id) |> Repo.one() |> ok_or_not_found()
end

defp get_client(%Ctx{} = ctx) do
  Client |> Client.for_business(ctx.business_id) |> Client.for_user(ctx.user_id) |> Repo.one() |> ok_or_not_found()
end
```

Remove the old `get_coach_for_user/2`, `get_client_for_user/2`. Keep `get_client(business_id, client_id)` private for the coach per-client list (rename to avoid the arity clash, e.g. `fetch_client(business_id, client_id)`).

- [ ] **Step 2: Collapse the write fns.** `create_training_plan_for_coach_user/3` + `create_training_plan/3` → `create_training_plan(%Ctx{} = ctx, attrs)` resolving `coach.id` via `get_coach(ctx)`. `duplicate_training_plan(%Ctx{} = ctx, plan_id)`: resolve `get_coach`, fetch plan via `ctx.business_id`, clone with `creator_id: coach.id` (FIX the current behavior that reuses `plan.creator_id`). `assign_training_plan_to_client(%Ctx{} = ctx, plan_id, client_id, attrs)`: resolve coach, set cloned plan's `creator_id: coach.id`. Drop the `business_id`-first `assign_training_plan_to_client/4` overload.

- [ ] **Step 3: Collapse the read fns.** Replace `list_client_plans_for_user/5`, `get_client_plan_full_for_user/3`, `get_active_plan_day_for_user/3` with client-self fns taking `%Ctx{}` and resolving `get_client(ctx)`. Keep `list_client_plans_for_client/5` as the coach per-client list → `list_client_plans(%Ctx{}, client_id, search, offset, limit)`. Convert `get_plan_full/2`, `list_template_plans/5`, `update/delete` to Ctx-first.

- [ ] **Step 4: Update controllers.** Coach `training_plan_controller` + `client_plan_controller` + client `training_plan_controller` pass `conn.assigns.ctx`. (Client `/today` route is added in Task 9 — wire the action there; the context fn `get_my_active_plan_day/2` exists now.)

- [ ] **Step 5: Test** — `mix compile --warnings-as-errors && mix test`. Expected green (creator_id-on-duplicate is the one behavior change; update `training_plan_test.exs`/`training_plan_controller_test.exs` to assert the new owned `creator_id` if any test pinned the old value).

- [ ] **Step 6: Commit**

```bash
git add lib/easy/training_plans.ex lib/easy_web/controllers/coaches/training_plan_controller.ex lib/easy_web/controllers/clients/training_plan_controller.ex lib/easy_web/controllers/coaches/client_plan_controller.ex test
git commit -m "refactor(training): Ctx-first Easy.TrainingPlans; own creator_id on duplicate/assign"
```

---

## Task 6: Ctx-first conversion — Easy.Sessions; merge complete/discard into update

Collapse the `_for_user` wrappers; add private `get_client(ctx)`. Fold `complete`/`discard` into a single client-update dispatch keyed on `state`.

**Files:**
- Modify: `lib/easy/sessions.ex`
- Modify: `lib/easy_web/controllers/coaches/{workout_session,performed_set}_controller.ex`, `clients/{workout_session,performed_set}_controller.ex`
- Test: `test/easy_web/controllers/{coaches,clients}/{workout_session,performed_set}_controller_test.exs`

**Interfaces:**
- Produces:
  - Coach read-only: `list_sessions(%Ctx{}, client_id, from, to)` (date-range) and `get_client_session_with_sets(%Ctx{}, client_id, id)` — these back the coach read-only endpoints in Task 9.
  - Client-self: `list_my_sessions(%Ctx{}, from, to)`, `get_my_session_with_sets(%Ctx{}, id)`, `create_my_session(%Ctx{}, attrs)`, `update_my_session(%Ctx{}, id, attrs)` (dispatches end/discard/notes on `attrs["state"]`), `create_my_performed_set(%Ctx{}, session_id, attrs)`, `update_my_performed_set(%Ctx{}, set_id, attrs)`, `delete_my_performed_set(%Ctx{}, set_id)`
- Consumes: `%Easy.Ctx{}`; `TrainingSession.states/0` (`[:active, :completed, :discarded]`).

- [ ] **Step 1: Add private `get_client(%Ctx{})`** (same body as Task 5) and remove `get_client_for_user/2`. Keep a private `fetch_client(business_id, client_id)` for the coach path.

- [ ] **Step 2: Collapse `_for_user` wrappers.** Convert each `*_for_user` to the `my_*` Ctx-first fn resolving `get_client(ctx)`; drop the duplicate `list_sessions_for_user` arities (keep one coach `list_sessions(%Ctx{}, client_id, from, to)` date-range + the client `list_my_sessions(%Ctx{}, from, to)`).

- [ ] **Step 3: Merge complete/discard into `update_my_session/3`:**

```elixir
@spec update_my_session(Ctx.t(), String.t(), map()) ::
        {:ok, TrainingSession.t()} | {:error, :not_found | Ecto.Changeset.t()}
def update_my_session(%Ctx{} = ctx, session_id, attrs) do
  with {:ok, client} <- get_client(ctx),
       {:ok, session} <- get_client_session_with_sets(ctx.business_id, client.id, session_id) do
    case to_string(attrs["state"] || attrs[:state] || "") do
      "completed" -> complete_workout_session(session, attrs)
      "discarded" -> discard_workout_session(session)
      _ -> update_client_workout_session(session, attrs)
    end
  end
end
```

Keep `complete_workout_session/2`, `discard_workout_session/1`, `update_client_workout_session/2` as private helpers (or `defp`-ify the struct overloads). Delete the now-unused `*_client_*_for_user` complete/discard/update wrappers and the coach-side `create_workout_session/3`, `update_workout_session/3`, `complete_workout_session/3`, `discard_workout_session/2`, `delete_workout_session/2`, `create_performed_set` coach path, etc. — i.e. all coach WRITE paths (coach is read-only per spec). Verify nothing else references them.

- [ ] **Step 4: Update the four controllers** to Ctx-first calls. (Coach session/performed-set controllers lose their write actions in Task 9 when routes are removed — for now keep actions compiling by pointing reads at the new fns; Task 9 deletes the dead coach write actions + routes.)

- [ ] **Step 5: Test** — `mix compile --warnings-as-errors && mix test`. Expected green.

- [ ] **Step 6: Commit**

```bash
git add lib/easy/sessions.ex lib/easy_web/controllers/coaches/workout_session_controller.ex lib/easy_web/controllers/coaches/performed_set_controller.ex lib/easy_web/controllers/clients/workout_session_controller.ex lib/easy_web/controllers/clients/performed_set_controller.ex test
git commit -m "refactor(training): Ctx-first Easy.Sessions; merge complete/discard into update_my_session"
```

---

## Task 7: Kebab routes for stable resources + exercise copy + workout-exercise path + strict validation

Rename all non-restructured training routes to kebab `training-` paths, move workout-exercise create under the workout, rename exercise `duplicate`→`copy`, remove `/workouts/:id/duplicate` and `/workout_elements/:id` show, and add `CastAndValidate` to the coach write controllers that lack it.

**Files:**
- Modify: `lib/easy_web/router.ex` (coach + client training blocks — the routes that are NOT schedule/sessions, which Tasks 8–9 own)
- Modify: `lib/easy_web/controllers/coaches/exercise_controller.ex` (`duplicate`→`copy` action; operation_id `copyExercise`), `clients/exercise_controller.ex` (no change beyond path)
- Modify: `lib/easy_web/controllers/coaches/workout_element_controller.ex` (read `workout_id` from path params for `:create`; delete `:show`), `coaches/workout_controller.ex` (delete `:duplicate`), and delete `Workouts.duplicate_workout` from `lib/easy/workouts.ex`
- Modify (strict validation): add `plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [...]` to `coaches/training_plan_controller.ex` (`:create, :update, :assign`), `coaches/workout_controller.ex` (`:create, :update`), `coaches/workout_element_controller.ex` (`:create, :update`). Ensure those request schemas use `struct?: false` + `additionalProperties: false`.
- Modify (boundary test): `test/easy_web/controllers/training_controller_boundary_test.exs` (no controller files renamed here; keep list in sync if any are deleted)
- Test: `test/easy_web/controllers/{coaches,clients}/{exercise,workout,workout_element}_controller_test.exs`, `training_plan_controller_test.exs`, `client_plan_controller_test.exs`

**Interfaces:**
- Produces: kebab routes (verbatim below). Consumes: Ctx-first context fns from Tasks 4–6.

Target route lines (coach scope, `EasyWeb.Coaches`):

```elixir
get    "/clients/:client_id/training-plans",            ClientPlanController, :training_plans

get    "/training-exercises",                           ExerciseController, :index
post   "/training-exercises",                           ExerciseController, :create
get    "/training-exercises/:id",                       ExerciseController, :show
patch  "/training-exercises/:id",                       ExerciseController, :update
delete "/training-exercises/:id",                       ExerciseController, :delete
post   "/training-exercises/:id/copy",                  ExerciseController, :copy

get    "/training-muscles",                             MuscleController, :index
get    "/training-equipment",                           EquipmentController, :index

get    "/training-plans",                               TrainingPlanController, :index
post   "/training-plans",                               TrainingPlanController, :create
get    "/training-plans/:id",                           TrainingPlanController, :show
patch  "/training-plans/:id",                           TrainingPlanController, :update
delete "/training-plans/:id",                           TrainingPlanController, :delete
post   "/training-plans/:id/assign",                    TrainingPlanController, :assign
post   "/training-plans/:id/duplicate",                 TrainingPlanController, :duplicate

get    "/training-plans/:plan_id/training-workouts",    WorkoutController, :index
post   "/training-plans/:plan_id/training-workouts",    WorkoutController, :create
get    "/training-workouts/:id",                        WorkoutController, :show
patch  "/training-workouts/:id",                        WorkoutController, :update
delete "/training-workouts/:id",                        WorkoutController, :delete

post   "/training-workouts/:workout_id/exercises",      WorkoutElementController, :create
patch  "/training-workout-exercises/:id",               WorkoutElementController, :update
delete "/training-workout-exercises/:id",               WorkoutElementController, :delete
```

Client scope (`EasyWeb.Clients`), the non-session routes:

```elixir
get    "/training-plans",        TrainingPlanController, :index
get    "/training-plans/:id",    TrainingPlanController, :show
get    "/training-exercises",    ExerciseController, :index
get    "/training-exercises/:id", ExerciseController, :show
```

(Client `/training-plans/today` + all session routes are Task 9; schedule routes are Task 8.)

- [ ] **Step 1: Rewrite the coach + client router training blocks** to the kebab lines above. Delete `POST /workouts/:id/duplicate`, `GET /workout_elements/:id`. Leave the `training_plan_items`, `workout_sessions`, `performed_sets` lines in place for now (Tasks 8–9 replace them).

- [ ] **Step 2: Rename exercise `duplicate`→`copy`.** In `coaches/exercise_controller.ex` rename the action `def copy` (still calls `Exercises.duplicate_exercise(conn.assigns.ctx, id, attrs)` — context fn name unchanged), `operation :copy` with `operation_id: "copyExercise"`, request schema `TrainingExerciseCopyRequest`.

- [ ] **Step 3: Promote workout-exercise create to path param.** In `workout_element_controller.ex` `:create`, read `%{"workout_id" => workout_id}` from `conn.path_params` and call `Workouts.create_workout_element(conn.assigns.ctx, workout_id, attrs)`. Delete the `:show` action. Delete `coaches/workout_controller.ex` `:duplicate` action and `Workouts.duplicate_workout/1,2` from `lib/easy/workouts.ex`.

- [ ] **Step 4: Add `CastAndValidate`** to the three coach controllers listed in Files; confirm their request schemas are `struct?: false` + `additionalProperties: false`.

- [ ] **Step 5: Update controller tests** — replace snake paths with kebab, `duplicate`→`copy` for exercise, workout-exercise create now `POST /training-workouts/:id/exercises`, drop workout-duplicate + workout-element-show test cases, add `content-type: application/json` to the newly-validated coach writes.

- [ ] **Step 6: Test** — `mix compile --warnings-as-errors && mix test`. Expected green.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(training): kebab routes; exercise copy; workout-scoped exercise create; strict validation"
```

---

## Task 8: Schedule — GET /schedule + PUT /schedule/:day (replace plan-item CRUD)

Replace the four `training_plan_items` routes/controller/context fns with desired-state schedule endpoints. Training is **slot-less** (one workout per day) — simpler than nutrition's slot map.

**Files:**
- Create: `lib/easy_web/controllers/coaches/training_schedule_controller.ex`, `coaches/training_schedule_json.ex`
- Delete: `lib/easy_web/controllers/coaches/training_plan_item_controller.ex`, its JSON view (`training_plan_item_json.ex`), and the `PlanItemRequest`/`TrainingPlanItem*` OpenApiSpex schemas in `training_children.ex`
- Modify: `lib/easy/training_plans.ex` (remove `list_plan_items`, `get_plan_item`, `create_plan_item`, `create_plan_item_for_coach_user`, `update_plan_item`, `delete_plan_item`; add `get_schedule/2`, `set_day_schedule/4`)
- Modify: `lib/easy_web/router.ex` (replace the 4 plan-item routes with 2 schedule routes)
- Modify: `lib/easy_web/open_api/schemas/training_children.ex` (add `TrainingScheduleEntry`, `TrainingDayScheduleRequest`, `TrainingScheduleResponse`, `TrainingScheduleDayResponse`)
- Modify (boundary test): `training_controller_boundary_test.exs` — replace `coaches/training_plan_item_controller.ex` with `coaches/training_schedule_controller.ex` in `@training_controllers`
- Delete/replace test: `test/easy_web/controllers/coaches/training_plan_item_controller_test.exs` → `training_schedule_controller_test.exs`

**Interfaces:**
- Produces:
  - `get_schedule(%Ctx{}, plan_id) :: {:ok, %{day_of_week :: String.t() => ScheduleEntry.t()}} | {:error, :not_found}`
  - `set_day_schedule(%Ctx{}, plan_id, day, attrs) :: {:ok, ScheduleEntry.t() | nil} | {:error, :not_found | :invalid_day | Ecto.Changeset.t()}` — desired state for one day; `attrs["training_workout_id"]` sets the workout, absent/nil clears (rest day)
  - Routes: `GET /coach/training-plans/:plan_id/schedule`, `PUT /coach/training-plans/:plan_id/schedule/:day`
- Consumes: `ScheduleEntry.{for_business/2, for_plan/2, for_day/2, days/0, with_workout/2, insert_changeset/4}` (from Plan 1; note `insert_changeset(plan_id, business_id, creator_id, attrs)`).

- [ ] **Step 1: Add context fns** to `Easy.TrainingPlans` (mirror `lib/easy/nutrition_plans.ex:148,168`, collapsing the slot map to a single entry):

```elixir
@spec get_schedule(Ctx.t(), String.t()) ::
        {:ok, %{optional(String.t()) => ScheduleEntry.t()}} | {:error, :not_found}
def get_schedule(%Ctx{} = ctx, plan_id) do
  with {:ok, plan} <- get_plan(ctx.business_id, plan_id) do
    schedule =
      ScheduleEntry
      |> ScheduleEntry.for_business(ctx.business_id)
      |> ScheduleEntry.for_plan(plan.id)
      |> ScheduleEntry.with_workout(ctx.business_id)
      |> Repo.all()
      |> Map.new(fn entry -> {entry.day_of_week, entry} end)

    {:ok, schedule}
  end
end

@spec set_day_schedule(Ctx.t(), String.t(), String.t(), map()) ::
        {:ok, ScheduleEntry.t() | nil} | {:error, :not_found | :invalid_day | Ecto.Changeset.t()}
def set_day_schedule(%Ctx{} = ctx, plan_id, day, attrs) when is_map(attrs) do
  with {:ok, coach} <- get_coach(ctx),
       {:ok, plan} <- get_plan(ctx.business_id, plan_id),
       :ok <- validate_schedule_day(day) do
    workout_id = attrs["training_workout_id"] || attrs[:training_workout_id]

    Repo.transaction(fn ->
      ScheduleEntry
      |> ScheduleEntry.for_business(ctx.business_id)
      |> ScheduleEntry.for_plan(plan.id)
      |> ScheduleEntry.for_day(day)
      |> Repo.delete_all()

      if workout_id do
        with {:ok, :valid} <- ensure_workout_for_plan(plan.id, ctx.business_id, workout_id),
             entry_attrs = %{"day_of_week" => day, "training_workout_id" => workout_id},
             {:ok, entry} <-
               plan.id
               |> ScheduleEntry.insert_changeset(ctx.business_id, coach.id, entry_attrs)
               |> Repo.insert() do
          Repo.preload(entry, workout: TrainingWorkout.for_business(TrainingWorkout, ctx.business_id))
        else
          {:error, reason} -> Repo.rollback(reason)
        end
      else
        nil
      end
    end)
  end
end

defp validate_schedule_day(day) do
  if day in ScheduleEntry.days(), do: :ok, else: {:error, :invalid_day}
end

defp ensure_workout_for_plan(plan_id, business_id, workout_id) do
  case TrainingWorkout |> TrainingWorkout.for_business(business_id) |> TrainingWorkout.for_plan(plan_id) |> Repo.get(workout_id) do
    nil -> {:error, :not_found}
    _ -> {:ok, :valid}
  end
end
```

Confirm `ScheduleEntry.insert_changeset/4` arg order from Plan 1 (`insert_changeset(plan_id, business_id, creator_id, attrs)`); adjust the call if it differs. Confirm `TrainingWorkout.for_plan/2` exists (it does — used by `list_workouts`). Remove the six `*plan_item*` fns and any now-unused helpers.

- [ ] **Step 2: Add OpenApiSpex schemas** to `training_children.ex`:

```elixir
defmodule EasyWeb.OpenApi.Schemas.TrainingScheduleEntry do
  require OpenApiSpex
  alias OpenApiSpex.Schema
  OpenApiSpex.schema(%{
    title: "TrainingScheduleEntry",
    type: :object,
    properties: %{
      id: %Schema{type: :string},
      day_of_week: %Schema{type: :string},
      training_workout_id: %Schema{type: :string, nullable: true},
      workout_name: %Schema{type: :string, nullable: true}
    }
  })
end

defmodule EasyWeb.OpenApi.Schemas.TrainingDayScheduleRequest do
  require OpenApiSpex
  alias OpenApiSpex.Schema
  OpenApiSpex.schema(%{
    title: "TrainingDayScheduleRequest",
    type: :object,
    additionalProperties: false,
    properties: %{training_workout_id: %Schema{type: :string, nullable: true}}
  })
end

defmodule EasyWeb.OpenApi.Schemas.TrainingScheduleResponse do
  require OpenApiSpex
  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.TrainingScheduleEntry
  OpenApiSpex.schema(%{
    title: "TrainingScheduleResponse",
    type: :object,
    properties: %{data: %Schema{type: :object, additionalProperties: TrainingScheduleEntry}}
  })
end

defmodule EasyWeb.OpenApi.Schemas.TrainingScheduleDayResponse do
  require OpenApiSpex
  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.TrainingScheduleEntry
  OpenApiSpex.schema(%{
    title: "TrainingScheduleDayResponse",
    type: :object,
    properties: %{data: %Schema{type: :object, nullable: true, allOf: [TrainingScheduleEntry]}}
  })
end
```

Delete the `PlanItemRequest`, `TrainingPlanItemResponse`, `TrainingPlanItemListResponse` schemas.

- [ ] **Step 3: Create the controller** `coaches/training_schedule_controller.ex` (mirror `coaches/schedule_controller.ex`, Ctx-first, slot-less):

```elixir
defmodule EasyWeb.Coaches.TrainingScheduleController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.TrainingPlans
  alias EasyWeb.OpenApi.Schemas.{TrainingDayScheduleRequest, TrainingScheduleDayResponse, TrainingScheduleResponse, ErrorResponse}

  plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:update]

  tags ["coach training schedule"]

  operation :show,
    summary: "Get a training plan's weekly schedule",
    operation_id: "getTrainingPlanSchedule",
    security: [%{"bearerAuth" => []}],
    parameters: [plan_id: [in: :path, type: :string, required: true]],
    responses: [
      ok: {"Schedule", "application/json", TrainingScheduleResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Set a day's workout (desired state)",
    operation_id: "setTrainingPlanDaySchedule",
    security: [%{"bearerAuth" => []}],
    parameters: [
      plan_id: [in: :path, type: :string, required: true],
      day: [in: :path, type: :string, required: true]
    ],
    request_body: {"Day schedule", "application/json", TrainingDayScheduleRequest, required: true},
    responses: [
      ok: {"Updated day", "application/json", TrainingScheduleDayResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"plan_id" => plan_id}) do
    with {:ok, schedule} <- TrainingPlans.get_schedule(conn.assigns.ctx, plan_id) do
      render(conn, :show, schedule: schedule)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    %{"plan_id" => plan_id, "day" => day} = conn.path_params
    attrs = Map.drop(conn.body_params, [:plan_id, :day, "plan_id", "day"])

    with {:ok, entry} <- TrainingPlans.set_day_schedule(conn.assigns.ctx, plan_id, day, attrs) do
      render(conn, :day, entry: entry)
    end
  end
end
```

JSON view `coaches/training_schedule_json.ex`:

```elixir
defmodule EasyWeb.Coaches.TrainingScheduleJSON do
  alias Easy.Training.{ScheduleEntry, TrainingWorkout}

  @spec show(map()) :: map()
  def show(%{schedule: schedule}), do: %{data: Map.new(schedule, fn {day, e} -> {day, entry(e)} end)}

  @spec day(map()) :: map()
  def day(%{entry: nil}), do: %{data: nil}
  def day(%{entry: %ScheduleEntry{} = e}), do: %{data: entry(e)}

  defp entry(%ScheduleEntry{} = e) do
    %{id: e.id, day_of_week: e.day_of_week, training_workout_id: e.training_workout_id, workout_name: workout_name(e.workout)}
  end

  defp workout_name(%TrainingWorkout{name: name}), do: name
  defp workout_name(_), do: nil
end
```

- [ ] **Step 4: Swap the routes** in `router.ex` coach block:

```elixir
get "/training-plans/:plan_id/schedule",       TrainingScheduleController, :show
put "/training-plans/:plan_id/schedule/:day",  TrainingScheduleController, :update
```

Delete the four `training_plan_items` route lines. Delete the controller + JSON + test for plan items. Update `@training_controllers` in the boundary test.

- [ ] **Step 5: Write the controller test** `coaches/training_schedule_controller_test.exs` (mirror the nutrition `schedule_controller_test.exs`): GET returns day→entry map; PUT with `{"training_workout_id": id}` sets the day and returns the entry; PUT `{}` clears the day (returns `data: null`); PUT with a foreign workout id → 404/422; PUT invalid day → 422; auth required.

- [ ] **Step 6: Test** — `mix compile --warnings-as-errors && mix test`. Expected green.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(training): GET/PUT schedule replacing plan-item CRUD"
```

---

## Task 9: training-sessions logging endpoints + coach read-only + client today

Kebab the session/performed-set surface, make coach read-only, fold complete/discard into client PATCH, scope performed-set create under the session, add client `/training-plans/today`.

**Files:**
- Modify: `lib/easy_web/router.ex` (coach: remove session/performed-set writes, add read-only client-sessions; client: replace session/performed-set routes; add `/training-plans/today`)
- Modify: `lib/easy_web/controllers/clients/workout_session_controller.ex` (actions: `index` with `from`/`to`, `show`, `create`, `update` (merged), drop `active`/`complete`/`discard`; add `CastAndValidate` on `:create, :update`)
- Modify: `lib/easy_web/controllers/clients/performed_set_controller.ex` (`create` reads `session_id` from path; `update`/`delete`; add `CastAndValidate`)
- Modify: `lib/easy_web/controllers/coaches/workout_session_controller.ex` → make read-only (`index` for `:client_id`, `show`); delete coach `performed_set_controller.ex` (no coach performed-set routes) OR strip it to nothing — prefer delete + drop from boundary list
- Modify: `lib/easy_web/controllers/clients/training_plan_controller.ex` (add `today` action → `TrainingPlans.get_my_active_plan_day(ctx, date)`; reuse/extend the existing `today` JSON shape from the client plan JSON, mirroring nutrition `NutritionPlanController.today`)
- Modify: `lib/easy_web/open_api/schemas/activity.ex` (broaden `TrainingSessionUpdateRequest` to allow `state` ∈ {completed, discarded}, `ended_at`, `soreness_rating`, `notes`; keep `TrainingSessionRequest` for create; performed-set request keeps its fields but the session id moves to the path)
- Modify (boundary test): `training_controller_boundary_test.exs` `@training_controllers` — drop `coaches/performed_set_controller.ex` if deleted; coach `workout_session_controller.ex` stays (read-only)
- Test: `test/easy_web/controllers/{coaches,clients}/{workout_session,performed_set}_controller_test.exs`, `clients/training_plan_controller_test.exs`

**Interfaces:**
- Produces routes:
  - Coach: `GET /clients/:client_id/training-sessions` (`?from=&to=`), `GET /clients/:client_id/training-sessions/:id`
  - Client: `GET /training-plans/today` (`?date=`), `GET /training-sessions` (`?from=&to=`), `GET /training-sessions/:id`, `POST /training-sessions`, `PATCH /training-sessions/:id`, `POST /training-sessions/:id/performed-sets`, `PATCH /training-performed-sets/:id`, `DELETE /training-performed-sets/:id`
- Consumes: Task 6 fns (`list_sessions/4`, `get_client_session_with_sets/3`, `list_my_sessions/3`, `get_my_session_with_sets/2`, `create_my_session/2`, `update_my_session/3`, `create_my_performed_set/3`, `update_my_performed_set/3`, `delete_my_performed_set/2`); Task 5 `get_my_active_plan_day/2`.

- [ ] **Step 1: Rewrite the coach session controller to read-only.** Coach `workout_session_controller.ex`: keep `index(conn, %{"client_id" => cid} = params)` → `Sessions.list_sessions(conn.assigns.ctx, cid, from, to)` (parse `from`/`to` as `Date` like the nutrition meal-logs reader) and `show` → `Sessions.get_client_session_with_sets(conn.assigns.ctx, cid, id)`. Delete `create`/`complete`/`discard`/`delete`. Delete `coaches/performed_set_controller.ex` entirely.

- [ ] **Step 2: Rewrite the client session controller.** `index` → `Sessions.list_my_sessions(ctx, from, to)`; `show` → `get_my_session_with_sets(ctx, id)`; `create` → `create_my_session(ctx, body)`; `update` → `update_my_session(ctx, id, body)` (handles notes/end/discard). Delete `active`, `complete`, `discard` actions. Add `plug CastAndValidate ... when action in [:create, :update]`.

- [ ] **Step 3: Rewrite the client performed-set controller.** `create` reads `%{"session_id" => sid}` from `conn.path_params` → `Sessions.create_my_performed_set(ctx, sid, body)`; `update` → `update_my_performed_set(ctx, id, body)`; `delete` → `delete_my_performed_set(ctx, id)`. Add `CastAndValidate` on `:create, :update`.

- [ ] **Step 4: Add client `today`.** In `clients/training_plan_controller.ex` add `today(conn, params)` parsing `date` (default today) → `TrainingPlans.get_my_active_plan_day(conn.assigns.ctx, date)`, rendering with the existing client-plan `today`/day JSON (mirror `NutritionPlanController`/its JSON). If no plan JSON `today` clause exists, add one to the client `training_plan_json.ex`.

- [ ] **Step 5: Rewrite the router blocks.**

Coach (add, after the client-scoped training-plans line):

```elixir
get "/clients/:client_id/training-sessions",      WorkoutSessionController, :index
get "/clients/:client_id/training-sessions/:id",  WorkoutSessionController, :show
```

Delete all coach `workout_sessions` + `performed_sets` lines.

Client:

```elixir
get    "/training-plans/today",                       TrainingPlanController, :today
get    "/training-sessions",                          WorkoutSessionController, :index
post   "/training-sessions",                          WorkoutSessionController, :create
get    "/training-sessions/:id",                      WorkoutSessionController, :show
patch  "/training-sessions/:id",                      WorkoutSessionController, :update
post   "/training-sessions/:id/performed-sets",       PerformedSetController, :create
patch  "/training-performed-sets/:id",                PerformedSetController, :update
delete "/training-performed-sets/:id",                PerformedSetController, :delete
```

Delete the client `workout_sessions/active|complete|discard` + flat `performed_sets` lines. Ensure `/training-plans/today` is registered BEFORE `/training-plans/:id`.

- [ ] **Step 6: Broaden the update OpenApiSpex schema** in `activity.ex`:

```elixir
defmodule EasyWeb.OpenApi.Schemas.TrainingSessionUpdateRequest do
  require OpenApiSpex
  alias OpenApiSpex.Schema
  OpenApiSpex.schema(%{
    title: "TrainingSessionUpdateRequest",
    type: :object,
    additionalProperties: false,
    properties: %{
      state: %Schema{type: :string, enum: ["completed", "discarded"]},
      ended_at: %Schema{type: :string, format: :"date-time"},
      soreness_rating: %Schema{type: :integer, minimum: 1, maximum: 5},
      notes: %Schema{type: :string}
    }
  })
end
```

- [ ] **Step 7: Update tests.** Coach: only read-only session tests remain (list by `from`/`to`, show; assert writes are 404 — route gone). Client: create starts a session (snapshot), PATCH with `{"state":"completed"}` completes, `{"state":"discarded"}` discards, PATCH notes-only updates; `POST /training-sessions/:id/performed-sets` adds a set; PATCH/DELETE `/training-performed-sets/:id`; `GET /training-sessions?from&to` filters; `GET /training-plans/today`. Add `content-type: application/json` to validated writes.

- [ ] **Step 8: Test** — `mix compile --warnings-as-errors && mix test`. Expected green.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(training): training-sessions logging, coach read-only sessions, client today"
```

---

## Task 10: OpenApiSpex coverage + whole-branch verification

Final consistency pass: route-coverage test, boundary tests, full reset.

**Files:**
- Modify (if failing): `test/easy_web/controllers/open_api_route_coverage_test.exs`, `training_plan_open_api_test.exs`, `training_reference_open_api_test.exs`, `exercise_open_api_test.exs`
- Verify: `test/easy/training/schema_boundary_test.exs`, `training_controller_boundary_test.exs` reflect every renamed/added/removed file

- [ ] **Step 1: Run the OpenApiSpex route-coverage test**

Run: `mix test test/easy_web/controllers/open_api_route_coverage_test.exs`
Expected: every training route has an `operation`. Fix any controller missing an `operation` for a new/renamed action (schedule show/update, session index/show/create/update, performed-set create/update/delete, exercise copy, client today, coach read-only sessions).

- [ ] **Step 2: Run the boundary tests**

Run: `mix test test/easy/training/schema_boundary_test.exs test/easy_web/controllers/training_controller_boundary_test.exs`
Expected: pass — `@schema_paths` lists the 8 renamed + 2 kept schema files; `@training_controllers` lists current controllers (with `training_schedule_controller.ex`, without `training_plan_item_controller.ex` and the deleted coach `performed_set_controller.ex`).

- [ ] **Step 3: Full reset + suite + warnings**

```bash
mix ecto.reset && mix run priv/repo/seeds.exs
mix compile --warnings-as-errors
mix test
```
Expected: reset+seeds clean, 0 warnings, full suite green.

- [ ] **Step 4: Commit any fixups**

```bash
git add -A
git commit -m "test(training): OpenApiSpex coverage + boundary consistency for Plan 2"
```

---

## Self-Review

**Spec coverage (Training API section):** coach `/training-plans` CRUD+duplicate+assign (Task 7), `/training-plans/:plan_id/training-workouts` + `/training-workouts/:id` (Task 7), `/training-workouts/:workout_id/exercises` + `/training-workout-exercises/:id` (Task 7), `/training-plans/:plan_id/schedule` GET + `/schedule/:day` PUT (Task 8), `/training-exercises` CRUD+copy + `/training-muscles` + `/training-equipment` (Tasks 1,7), coach read-only `/clients/:client_id/training-sessions[/:id]` (Task 9); client `/training-plans[/:id]` + `/today` (Tasks 7,9), `/training-exercises[/:id]` (Task 7), `/training-sessions` (GET ?from&to, GET :id, POST, PATCH), `/training-sessions/:id/performed-sets` POST, `/training-performed-sets/:id` PATCH/DELETE (Task 9). Module renames (Tasks 1–3), Ctx-first (Tasks 4–6), strict validation (Tasks 7–9), `creator_id` population (Task 5). All covered.

**Removed out-of-spec endpoints:** `/workouts/:id/duplicate` (Task 7), `/workout_elements/:id` show (Task 7), `training_plan_items` CRUD (Task 8), coach session/performed-set writes (Task 9), client `workout_sessions/active|complete|discard` (Task 9), flat `performed_sets` (Task 9), exercise `duplicate`→`copy` (Task 7).

**Type consistency:** `set_day_schedule` returns a single `ScheduleEntry | nil`; its JSON `day/1` and OpenApiSpex `TrainingScheduleDayResponse` both model `data` as nullable single entry (not a map) — consistent. `update_my_session/3` dispatch matches `TrainingSessionUpdateRequest` enum. `ScheduleEntry.insert_changeset/4` arg order is flagged for confirmation against Plan 1 in Task 8 Step 1.

**Open confirmations for the implementer (verify against Plan-1 code, adjust call sites — not blockers):** exact arg order of `ScheduleEntry.insert_changeset`; presence of `TrainingWorkout.for_plan/2`; whether the client `training_plan_json` already has a `today` clause.
