# Nutrition API Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reshape the nutrition HTTP API to the spec (`docs/superpowers/specs/2026-06-20-coaching-profile-nutrition-schema-api-design.md`, "Nutrition API" section): kebab-case `nutrition-`-prefixed paths, the `GET /schedule` + `PUT /schedule/:day` desired-state endpoints (replacing `plan_items` CRUD), coach meal-logs under `/clients/:client_id/...`, food/recipe `impact` + `copy` endpoints, strict request validation, and the `Easy.Nutrition.PlanItem` → `Easy.Nutrition.ScheduleEntry` module rename.

**Architecture:** This is **Plan 2 of 2** for the nutrition slice. Plan 1 (the data layer) is complete and merged onto branch `refactor/coachapp-api-simplify` (commits `107d5cf`..`3008e37`); the nine `nutrition_*` tables, canonical macro vocabulary, derived recipe/meal nutrition via `Easy.MacroCalc`, and the DB-guarantee constraints already exist. Plan 2 changes **only the HTTP/API surface and the schedule write-model** — no migrations, no schema-column changes. The dependency direction stays router → controller → context → schema → Repo (per `backend/AGENTS.md`).

**Tech Stack:** Phoenix controllers + JSON views, OpenApiSpex operations/schemas, `OpenApiSpex.Plug.CastAndValidate` for strict request validation, Ecto query composition, ExUnit controller tests.

## Global Constraints

Copied from the spec; every task implicitly includes these.

- **Public paths are kebab-case with `nutrition-` resource prefixes.** Target endpoint set (spec "Nutrition API"):
  - Coach plans: `GET/POST /v1/coach/nutrition-plans`, `GET/PATCH/DELETE /v1/coach/nutrition-plans/:id`, `POST /v1/coach/nutrition-plans/:id/duplicate`, `POST /v1/coach/nutrition-plans/:id/assign`.
  - Client plans: `GET /v1/client/nutrition-plans`, `GET /v1/client/nutrition-plans/:id`, `GET /v1/client/nutrition-plans/today?date=YYYY-MM-DD`.
  - Coach meals/schedule: `GET/POST /v1/coach/nutrition-plans/:plan_id/meals`, `GET/PATCH/DELETE /v1/coach/nutrition-meals/:id`, `POST /v1/coach/nutrition-meals/:meal_id/items`, `PATCH/DELETE /v1/coach/nutrition-meal-items/:id`, `GET /v1/coach/nutrition-plans/:plan_id/schedule`, `PUT /v1/coach/nutrition-plans/:plan_id/schedule/:day`.
  - Coach foods/recipes: `GET/POST /v1/coach/nutrition-foods`, `GET/PATCH/DELETE /v1/coach/nutrition-foods/:id`, `GET /v1/coach/nutrition-foods/:id/impact`, `POST /v1/coach/nutrition-foods/:id/copy`; same shape for `nutrition-recipes`.
  - Client foods/recipes: `GET /v1/client/nutrition-foods`, `GET /v1/client/nutrition-foods/:id`, `GET /v1/client/nutrition-recipes`, `GET /v1/client/nutrition-recipes/:id`.
  - Client logging: `GET /v1/client/nutrition-meal-logs?date=` or `?from=&to=`, `POST /v1/client/nutrition-food-log-entries`, `PATCH/DELETE /v1/client/nutrition-food-log-entries/:id`, `POST /v1/client/nutrition-food-log-entries/log-meal`, `POST /v1/client/nutrition-food-log-entries/log-day`.
  - Coach logging (read-only): `GET /v1/coach/clients/:client_id/nutrition-meal-logs?date=` or `?from=&to=`.
- **`PUT /schedule/:day` is desired-state.** Body is keyed by meal slot, e.g. `{"breakfast": {"meal_id": "..."}, "lunch": {"meal_id": "..."}}`. Omitted slots are emptied for that day. One schedule entry per plan/day/slot (already a DB unique constraint).
- **Meal slots:** `breakfast`, `morning_snack`, `lunch`, `afternoon_snack`, `dinner`, `evening_snack`. **Weekdays:** `monday`..`sunday`.
- **Strict request validation:** public request bodies must reject alternate macro names (e.g. `protein` instead of `protein_g`) and loose maps. The mechanism is `OpenApiSpex.Plug.CastAndValidate` on write actions + `additionalProperties: false` request schemas.
- **Foods `source` ∈ {system, imported, custom}. System/imported foods are read-only;** editing them is done by `POST /nutrition-foods/:id/copy`, which creates a business-owned (`source: custom`) copy. Recipes have no `source` and are always business-owned/mutable; `copy` exists for cloning.
- **Impact** (`GET .../:id/impact`) returns which plan **templates** (`client_id IS NULL`) and which **active assigned client plans** (`client_id` set, `status = active`) reference the food/recipe — so a coach sees what a live-reference edit affects (foods/recipes are live references per the spec).
- **Coach access to logs is read-only** (no create/update/delete of logs by coaches).
- **Decisions taken for endpoints not in the spec** (confirmed with the product owner):
  - Keep the coach per-client plan list, kebab-renamed to `GET /v1/coach/clients/:client_id/nutrition-plans`.
  - Drop: `GET /v1/coach/meal_logs/summary`, `DELETE /v1/coach/food_log_entries/:id` (coach is read-only), `GET /v1/coach/meals/:meal_id/items` (items are embedded in the meal show), `GET /v1/client/meal_logs/:id` (logs come from the index).
- `backend/AGENTS.md` rules: tenant-scope every query by `business_id`; controllers never call `Repo` or build queries; contexts expose verbs and own transactions; `@spec` on public functions; no `@moduledoc`/`@doc`; `lib/easy/nutrition/` holds only Ecto schemas (enforced by `test/easy/nutrition/schema_boundary_test.exs`).

## Starting state (Plan 1 facts the implementer must rely on)

- The schedule table is `nutrition_schedule_entries`; its Ecto module is still named `Easy.Nutrition.PlanItem` with fields `day_of_week`, `meal_slot`, FKs `nutrition_plan_id`/`nutrition_meal_id`, no `creator_id`. Query builders: `for_business/2`, `for_plan/2`, `for_day/2`, `for_meal_slot/2`; `insert_changeset/3 (plan_id, business_id, attrs)`, `update_changeset/2`; `meal_slots/0`, `days/0`. The unique index name (Postgres-truncated, used in `unique_constraint`) is `:nutrition_schedule_entries_nutrition_plan_id_day_of_week_meal_s`.
- `Easy.NutritionPlans` plan-item functions: `list_plan_items/2`, `create_plan_item/3`, `create_plan_item_for_coach_user/4`, `update_plan_item/3`, `delete_plan_item/2` (all to be removed in Task 2), plus private `copy_plan_items/4`, `get_active_plan_day/3`, `ensure_meal_for_plan/3`, `with_meal/2`, `with_full_preloads/2`. Routes are still snake_case. `OpenApiSpex.Plug.CastAndValidate` is wired into NO nutrition controller (only `Coaches.ExerciseController` uses it — copy that pattern).
- Coach controllers obtain `business_id`/coach the same way across the nutrition controllers — **match the existing sibling controller** (e.g. `nutrition_plan_controller.ex`) for how `business_id` and the coach user id are read from `conn.assigns`; do not invent a new accessor.

## Build order and checkpoints

Task 1 is a global mechanical rename and leaves the full suite green. Tasks 2–5 are cohesive vertical slices (each updates its routes + controller + JSON + context + OpenApiSpex + tests together), so the app compiles and the relevant tests pass at the end of each. Task 6 verifies the whole surface and runs the branch review.

## File structure

**Create:**
- `backend/lib/easy/nutrition/schedule_entry.ex` (renamed from `plan_item.ex`).
- `backend/lib/easy_web/controllers/coaches/schedule_controller.ex`, `schedule_json.ex`.
- OpenApiSpex schema modules (in `backend/lib/easy_web/open_api/schemas/nutrition.ex` and `nutrition_food.ex`): `NutritionScheduleSlot`, `NutritionDayScheduleRequest`, `NutritionScheduleDayResponse`, `NutritionScheduleResponse`, `RecipeImpactResponse`, `FoodImpactResponse`.
- `backend/test/easy_web/controllers/coaches/schedule_controller_test.exs`.

**Delete:**
- `backend/lib/easy/nutrition/plan_item.ex` (→ renamed).
- `backend/lib/easy_web/controllers/coaches/plan_item_controller.ex`, `plan_item_json.ex`.
- `backend/lib/easy_web/controllers/coaches/food_log_entry_controller.ex`.
- `backend/test/easy_web/controllers/coaches/plan_item_controller_test.exs`.

**Modify:** `router.ex`; coach controllers/JSON (`nutrition_plan`, `meal`, `meal_item`, `food`, `recipe`, `meal_log`, `nutrition_plan_json`); client controllers/JSON (`nutrition_plan`, `food`, `recipe`, `meal_log`, `food_log_entry`); contexts (`nutrition_plans.ex`, `foods.ex`, `recipes.ex`, `meal_log.ex`, `meal_logs.ex`, `plan.ex`); `fallback_controller.ex`; OpenApiSpex `nutrition.ex`, `nutrition_food.ex`; `test/support/factory.ex`; the nutrition controller test files; `schema_boundary_test.exs`; `nutrition_controller_boundary_test.exs`.

---

## Task 1: Rename `Easy.Nutrition.PlanItem` → `Easy.Nutrition.ScheduleEntry`

A pure, behavior-preserving rename of the Elixir schema module (the table is already `nutrition_schedule_entries`). The `plan_items` CRUD endpoints keep working (snake_case) after this task; Task 2 replaces them. The OpenApiSpex `NutritionPlanItem*` schema modules are standalone `%Schema{}` definitions that do not reference the Ecto module, so they stay untouched here (Task 2 reshapes them).

**Files:**
- Rename: `backend/lib/easy/nutrition/plan_item.ex` → `backend/lib/easy/nutrition/schedule_entry.ex`
- Modify: `backend/lib/easy/nutrition_plans.ex`, `backend/lib/easy/meal_logs.ex`, `backend/lib/easy/nutrition/plan.ex`, `backend/lib/easy/nutrition/meal_log.ex`, `backend/lib/easy_web/controllers/coaches/plan_item_json.ex`, `backend/lib/easy_web/controllers/coaches/nutrition_plan_json.ex`, `backend/lib/easy_web/controllers/clients/nutrition_plan_json.ex`, `backend/test/support/factory.ex`, `backend/test/easy/nutrition/schema_boundary_test.exs`, `backend/test/easy_web/controllers/nutrition_controller_boundary_test.exs`

**Interfaces (produced):** `Easy.Nutrition.ScheduleEntry` with identical fields/changesets/query-builders as the old `PlanItem` (`for_business/2`, `for_plan/2`, `for_day/2`, `for_meal_slot/2`, `insert_changeset/3`, `update_changeset/2`, `meal_slots/0`, `days/0`). The Plan association name stays `:plan_items` and the JSON wire key stays `plan_items` in this task (Task 2 finalizes the schedule representation).

- [ ] **Step 1: Rename the file and module**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono/backend
git mv lib/easy/nutrition/plan_item.ex lib/easy/nutrition/schedule_entry.ex
```
In `schedule_entry.ex`, change `defmodule Easy.Nutrition.PlanItem do` → `defmodule Easy.Nutrition.ScheduleEntry do`. Leave everything else (the `schema "nutrition_schedule_entries"`, fields, changesets, query builders, `meal_slots/0`, `days/0`) unchanged.

- [ ] **Step 2: Update every reference to the module**

Apply these replacements (each is `alias` + bare-module references):
- `nutrition_plans.ex`: `alias Easy.Nutrition.PlanItem` → `alias Easy.Nutrition.ScheduleEntry`; replace every `PlanItem.` and `%PlanItem{}` with `ScheduleEntry.` / `%ScheduleEntry{}`. Functions and the `:plan_items` association name stay.
- `meal_logs.ex`: same alias + reference replacement (`PlanItem.for_plan/for_business/for_day/for_meal_slot`).
- `plan.ex`: `has_many :plan_items, Easy.Nutrition.PlanItem, foreign_key: :nutrition_plan_id` → `has_many :plan_items, Easy.Nutrition.ScheduleEntry, foreign_key: :nutrition_plan_id` (association name `:plan_items` unchanged).
- `meal_log.ex`: `alias Easy.Nutrition.PlanItem` → `ScheduleEntry`; `PlanItem.meal_slots()` → `ScheduleEntry.meal_slots()`.
- `coaches/plan_item_json.ex`: `alias Easy.Nutrition.PlanItem` → `ScheduleEntry`; `%PlanItem{}` pattern → `%ScheduleEntry{}`. (This file is deleted in Task 2; the rename here is only to keep the app compiling.)
- `coaches/nutrition_plan_json.ex` and `clients/nutrition_plan_json.ex`: `alias Easy.Nutrition.PlanItem` → `ScheduleEntry`; `%PlanItem{}` patterns → `%ScheduleEntry{}`.

- [ ] **Step 3: Update the factory and boundary tests**

- `test/support/factory.ex`: `alias Easy.Nutrition.PlanItem` → `alias Easy.Nutrition.ScheduleEntry`; rename `def plan_item_factory` → `def schedule_entry_factory` and `def plan_item_attrs_factory` → `def schedule_entry_attrs_factory`; `%PlanItem{}` → `%ScheduleEntry{}`. (Do NOT touch `alias Easy.Training.PlanItem, as: TrainingPlanItem` — different domain.)
- Update all test references `insert(:plan_item` / `build(:plan_item` / `params_for(:plan_item` → `:schedule_entry`, and `:plan_item_attrs` → `:schedule_entry_attrs`. Find them:
  ```bash
  grep -rln ':plan_item\b\|:plan_item_attrs' test
  ```
- `test/easy/nutrition/schema_boundary_test.exs`: change `"lib/easy/nutrition/plan_item.ex"` → `"lib/easy/nutrition/schedule_entry.ex"`.
- `test/easy_web/controllers/nutrition_controller_boundary_test.exs`: in the regex that lists schema modules, replace `PlanItem` with `ScheduleEntry`.

- [ ] **Step 4: Confirm no stale references remain**

Run:
```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono/backend
grep -rn 'Easy\.Nutrition\.PlanItem\|%PlanItem{\|\bPlanItem\.' lib test | grep -v 'Training'
```
Expected: no output (all nutrition `PlanItem` references renamed; only `TrainingPlanItem`/`Training.PlanItem` may remain, which is a different domain and must be left alone).

- [ ] **Step 5: Compile and run the full suite**

Run:
```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono/backend && mix compile --warnings-as-errors && mix test
```
Expected: exit 0; full suite green (pure rename — same counts as before, e.g. 606/0).

- [ ] **Step 6: Commit**

```bash
git add backend/lib/easy backend/test
git commit -m "refactor: rename Nutrition.PlanItem to Nutrition.ScheduleEntry"
```

---

## Task 2: Plans + schedule API (kebab paths, schedule endpoints replace plan_items CRUD)

**Files:**
- Modify: `backend/lib/easy_web/router.ex`, `backend/lib/easy/nutrition_plans.ex`, `backend/lib/easy_web/controllers/coaches/nutrition_plan_controller.ex`, `backend/lib/easy_web/open_api/schemas/nutrition.ex`
- Create: `backend/lib/easy_web/controllers/coaches/schedule_controller.ex`, `backend/lib/easy_web/controllers/coaches/schedule_json.ex`, `backend/test/easy_web/controllers/coaches/schedule_controller_test.exs`
- Delete: `backend/lib/easy_web/controllers/coaches/plan_item_controller.ex`, `backend/lib/easy_web/controllers/coaches/plan_item_json.ex`, `backend/test/easy_web/controllers/coaches/plan_item_controller_test.exs`
- Modify (tests): `backend/test/easy_web/controllers/coaches/nutrition_plan_controller_test.exs`, `backend/test/easy_web/controllers/clients/nutrition_plan_controller_test.exs`, `backend/test/easy_web/controllers/coaches/client_plan_controller_test.exs`

**Interfaces:**
- Consumes `Easy.Nutrition.ScheduleEntry` (Task 1).
- Produces: `NutritionPlans.get_schedule/2`, `NutritionPlans.set_day_schedule/4` (signatures below); the coach `ScheduleController` (`show`, `update`).

- [ ] **Step 1: Add schedule context functions**

In `backend/lib/easy/nutrition_plans.ex`, add these public functions (place near the other plan functions). They reuse the existing private `get_plan/2`, `with_meal/2`, and `ensure_meal_for_plan/3`:

```elixir
@spec get_schedule(String.t(), String.t()) ::
        {:ok, %{optional(String.t()) => %{optional(String.t()) => ScheduleEntry.t()}}}
        | {:error, :not_found}
def get_schedule(business_id, plan_id) do
  with {:ok, plan} <- get_plan(business_id, plan_id) do
    grouped =
      ScheduleEntry
      |> ScheduleEntry.for_business(business_id)
      |> ScheduleEntry.for_plan(plan.id)
      |> with_meal(business_id)
      |> Repo.all()
      |> Enum.group_by(& &1.day_of_week)
      |> Map.new(fn {day, entries} ->
        {day, Map.new(entries, fn entry -> {entry.meal_slot, entry} end)}
      end)

    {:ok, grouped}
  end
end

@spec set_day_schedule(String.t(), String.t(), String.t(), map()) ::
        {:ok, %{optional(String.t()) => ScheduleEntry.t()}}
        | {:error, :not_found | :invalid_day | Ecto.Changeset.t()}
def set_day_schedule(business_id, plan_id, day, slots) when is_map(slots) do
  with {:ok, plan} <- get_plan(business_id, plan_id),
       :ok <- validate_schedule_day(day) do
    Repo.transaction(fn ->
      ScheduleEntry
      |> ScheduleEntry.for_business(business_id)
      |> ScheduleEntry.for_plan(plan.id)
      |> ScheduleEntry.for_day(day)
      |> Repo.delete_all()

      Enum.reduce(slots, %{}, fn {slot, slot_value}, acc ->
        meal_id = slot_value["meal_id"] || slot_value[:meal_id]

        with {:ok, :valid} <- ensure_meal_for_plan(plan.id, business_id, meal_id),
             attrs = %{"day_of_week" => day, "meal_slot" => to_string(slot), "nutrition_meal_id" => meal_id},
             {:ok, entry} <- plan.id |> ScheduleEntry.insert_changeset(business_id, attrs) |> Repo.insert() do
          Map.put(acc, to_string(slot), entry)
        else
          {:error, reason} -> Repo.rollback(reason)
        end
      end)
    end)
  end
end

defp validate_schedule_day(day) do
  if day in ScheduleEntry.days(), do: :ok, else: {:error, :invalid_day}
end
```

- [ ] **Step 2: Remove the plan_item CRUD context functions**

Delete these public functions and their `@spec`s from `nutrition_plans.ex`: `list_plan_items/2`, `create_plan_item/3`, `create_plan_item_for_coach_user/4`, `update_plan_item/3`, `delete_plan_item/2`. Delete the now-unused private `get_plan_item/2`. **Keep** `copy_plan_items/4` (rename it to `copy_schedule_entries/4` for clarity, updating its single call site in `copy_plan/3`), `ensure_meal_for_plan/3`, `with_meal/2`, `get_active_plan_day/3`, and `with_full_preloads/2`.

- [ ] **Step 3: Write the schedule controller test (failing)**

Create `backend/test/easy_web/controllers/coaches/schedule_controller_test.exs`:

```elixir
defmodule EasyWeb.Coaches.ScheduleControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    plan = insert(:plan, business: coach.business, creator: coach)
    breakfast = insert(:meal, plan: plan, creator: coach, business: coach.business)
    lunch = insert(:meal, plan: plan, creator: coach, business: coach.business)
    conn = build_conn() |> authenticate_coach(coach)
    %{conn: conn, coach: coach, plan: plan, breakfast: breakfast, lunch: lunch}
  end

  describe "PUT /v1/coach/nutrition-plans/:plan_id/schedule/:day" do
    test "sets a day's schedule as desired state", %{conn: conn, plan: plan, breakfast: b, lunch: l} do
      conn =
        put(conn, "/v1/coach/nutrition-plans/#{plan.id}/schedule/monday", %{
          "breakfast" => %{"meal_id" => b.id},
          "lunch" => %{"meal_id" => l.id}
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert data["breakfast"]["meal_id"] == b.id
      assert data["breakfast"]["meal_slot"] == "breakfast"
      assert data["lunch"]["meal_id"] == l.id
    end

    test "replacing a day removes omitted slots", %{conn: conn, plan: plan, breakfast: b, lunch: l} do
      put(conn, "/v1/coach/nutrition-plans/#{plan.id}/schedule/monday", %{
        "breakfast" => %{"meal_id" => b.id},
        "lunch" => %{"meal_id" => l.id}
      })

      conn = put(conn, "/v1/coach/nutrition-plans/#{plan.id}/schedule/monday", %{"breakfast" => %{"meal_id" => b.id}})
      assert %{"data" => data} = json_response(conn, 200)
      assert Map.keys(data) == ["breakfast"]
    end

    test "rejects an invalid weekday", %{conn: conn, plan: plan, breakfast: b} do
      conn = put(conn, "/v1/coach/nutrition-plans/#{plan.id}/schedule/funday", %{"breakfast" => %{"meal_id" => b.id}})
      assert json_response(conn, 422)
    end
  end

  describe "GET /v1/coach/nutrition-plans/:plan_id/schedule" do
    test "returns the schedule grouped by day then slot", %{conn: conn, plan: plan, breakfast: b} do
      put(conn, "/v1/coach/nutrition-plans/#{plan.id}/schedule/monday", %{"breakfast" => %{"meal_id" => b.id}})
      conn = get(conn, "/v1/coach/nutrition-plans/#{plan.id}/schedule")
      assert %{"data" => %{"monday" => %{"breakfast" => entry}}} = json_response(conn, 200)
      assert entry["meal_id"] == b.id
    end
  end
end
```

Run it (expect fail — routes/controller missing):
```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono/backend && mix test test/easy_web/controllers/coaches/schedule_controller_test.exs
```

- [ ] **Step 4: Add the OpenApiSpex schedule schemas**

In `backend/lib/easy_web/open_api/schemas/nutrition.ex`: **rename** `NutritionPlanItem` → `NutritionScheduleEntry` (and its `title`), and `NutritionPlanItemResponse` → `NutritionScheduleEntryResponse`. **Delete** `NutritionPlanItemRequest`, `NutritionPlanItemUpdateRequest`, `NutritionPlanItemListResponse`. In the `NutritionPlan` response schema, rename the `plan_items` property key to `schedule_entries` and point its items at `NutritionScheduleEntry`. Then **add**:

```elixir
defmodule EasyWeb.OpenApi.Schemas.NutritionScheduleSlot do
  require OpenApiSpex
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "NutritionScheduleSlot",
    type: :object,
    properties: %{meal_id: %Schema{type: :string, format: :uuid}},
    required: [:meal_id],
    additionalProperties: false
  })
end

defmodule EasyWeb.OpenApi.Schemas.NutritionDayScheduleRequest do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.NutritionScheduleSlot

  OpenApiSpex.schema(%{
    title: "NutritionDayScheduleRequest",
    type: :object,
    properties: %{
      breakfast: NutritionScheduleSlot,
      morning_snack: NutritionScheduleSlot,
      lunch: NutritionScheduleSlot,
      afternoon_snack: NutritionScheduleSlot,
      dinner: NutritionScheduleSlot,
      evening_snack: NutritionScheduleSlot
    },
    additionalProperties: false,
    example: %{"breakfast" => %{"meal_id" => "11111111-1111-1111-1111-111111111111"}}
  })
end

defmodule EasyWeb.OpenApi.Schemas.NutritionScheduleDayResponse do
  require OpenApiSpex
  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.NutritionScheduleEntry

  OpenApiSpex.schema(%{
    title: "NutritionScheduleDayResponse",
    type: :object,
    properties: %{data: %Schema{type: :object, additionalProperties: NutritionScheduleEntry}}
  })
end

defmodule EasyWeb.OpenApi.Schemas.NutritionScheduleResponse do
  require OpenApiSpex
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "NutritionScheduleResponse",
    type: :object,
    properties: %{
      data: %Schema{
        type: :object,
        additionalProperties: %Schema{type: :object, additionalProperties: true}
      }
    }
  })
end
```

- [ ] **Step 5: Create the schedule controller and JSON view**

`backend/lib/easy_web/controllers/coaches/schedule_controller.ex` — match the sibling coach controllers for how `business_id` is read from `conn.assigns` (use the same accessor `nutrition_plan_controller.ex` uses):

```elixir
defmodule EasyWeb.Coaches.ScheduleController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.NutritionPlans
  alias EasyWeb.OpenApi.Schemas.{NutritionDayScheduleRequest, NutritionScheduleDayResponse, NutritionScheduleResponse, ErrorResponse}

  plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:update]

  tags ["coach nutrition schedule"]

  operation :show,
    summary: "Get a plan's weekly schedule",
    operation_id: "getNutritionPlanSchedule",
    security: [%{"bearerAuth" => []}],
    parameters: [plan_id: [in: :path, type: :string, required: true]],
    responses: [
      ok: {"Schedule", "application/json", NutritionScheduleResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Replace a day's schedule (desired state)",
    operation_id: "setNutritionPlanDaySchedule",
    security: [%{"bearerAuth" => []}],
    parameters: [
      plan_id: [in: :path, type: :string, required: true],
      day: [in: :path, type: :string, required: true]
    ],
    request_body: {"Day schedule", "application/json", NutritionDayScheduleRequest, required: true},
    responses: [
      ok: {"Updated day", "application/json", NutritionScheduleDayResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"plan_id" => plan_id}) do
    business_id = conn.assigns.claims.business_id

    with {:ok, schedule} <- NutritionPlans.get_schedule(business_id, plan_id) do
      render(conn, :show, schedule: schedule)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"plan_id" => plan_id, "day" => day}) do
    business_id = conn.assigns.claims.business_id
    slots = Map.drop(conn.body_params, ["plan_id", "day"])

    with {:ok, entries} <- NutritionPlans.set_day_schedule(business_id, plan_id, day, slots) do
      render(conn, :day, entries: entries)
    end
  end
end
```

> The accessor is confirmed: all coach nutrition controllers read `conn.assigns.claims` and take `business_id`/`user_id` from it (e.g. `%{business_id: business_id} = conn.assigns.claims`). `conn.assigns.claims.business_id` above is correct.

`backend/lib/easy_web/controllers/coaches/schedule_json.ex`:

```elixir
defmodule EasyWeb.Coaches.ScheduleJSON do
  alias Easy.Nutrition.ScheduleEntry

  @spec show(map()) :: map()
  def show(%{schedule: schedule}) do
    %{data: Map.new(schedule, fn {day, slots} -> {day, Map.new(slots, fn {slot, e} -> {slot, entry(e)} end)} end)}
  end

  @spec day(map()) :: map()
  def day(%{entries: entries}) do
    %{data: Map.new(entries, fn {slot, e} -> {slot, entry(e)} end)}
  end

  defp entry(%ScheduleEntry{} = e) do
    %{
      id: e.id,
      day_of_week: e.day_of_week,
      meal_slot: e.meal_slot,
      meal_id: e.nutrition_meal_id,
      meal_name: meal_name(e.meal)
    }
  end

  defp meal_name(%Easy.Nutrition.Meal{name: name}), do: name
  defp meal_name(_), do: nil
end
```

- [ ] **Step 6: Update the router**

In `backend/lib/easy_web/router.ex`, coach scope: rename plan path segments to kebab and reshape:
```elixir
get    "/nutrition-plans", NutritionPlanController, :index
post   "/nutrition-plans", NutritionPlanController, :create
get    "/nutrition-plans/:id", NutritionPlanController, :show
patch  "/nutrition-plans/:id", NutritionPlanController, :update
delete "/nutrition-plans/:id", NutritionPlanController, :delete
post   "/nutrition-plans/:id/assign", NutritionPlanController, :assign
post   "/nutrition-plans/:id/duplicate", NutritionPlanController, :duplicate
get    "/nutrition-plans/:plan_id/meals", MealController, :index
post   "/nutrition-plans/:plan_id/meals", MealController, :create
get    "/nutrition-plans/:plan_id/schedule", ScheduleController, :show
put    "/nutrition-plans/:plan_id/schedule/:day", ScheduleController, :update
get    "/clients/:client_id/nutrition-plans", ClientPlanController, :nutrition_plans
```
Remove the four `plan_items` routes (`POST`/`GET /nutrition_plans/:plan_id/plan_items`, `PATCH`/`DELETE /plan_items/:id`). (The meals routes are finalized in Task 4; here just ensure the two meals lines use the kebab `nutrition-plans` prefix.)

- [ ] **Step 7: Wire CastAndValidate + finalize coach plan controller/JSON**

- In `nutrition_plan_controller.ex`, add the plug `plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:create, :update, :assign]`. Confirm the create/update/assign actions read the validated `conn.body_params`.
- Delete `backend/lib/easy_web/controllers/coaches/plan_item_controller.ex` and `plan_item_json.ex`.
- In `coaches/nutrition_plan_json.ex` and `clients/nutrition_plan_json.ex`: rename the inline plan key `plan_items` → `schedule_entries` and update the `plan_item_data/1` helper name → `schedule_entry_data/1` (keep the inline schedule in the plan show — it is data, not an endpoint). Keep the `:plan_items` association preload working OR rename the association to `:schedule_entries`; if you rename the association in `plan.ex`, update every `plan_items:` preload key in `nutrition_plans.ex` and both renderers to `schedule_entries:`. (Renaming the association is optional polish; the minimal change is to keep `:plan_items` as the association name and only change the rendered JSON key.)

- [ ] **Step 8: Add the FallbackController clause for `:invalid_day`**

In `backend/lib/easy_web/controllers/fallback_controller.ex`, add this clause **above** the catch-all `def call(conn, {:error, reason})` (clauses match in order; the catch-all must stay last):

```elixir
def call(conn, {:error, :invalid_day}) do
  call(conn, {:error, Easy.Error.unprocessable(%{fields: %{day: ["is invalid"]}})})
end
```
(CastAndValidate handles the body; `:invalid_day` comes from the context guard on the `:day` path segment.)

- [ ] **Step 9: Update plan tests for kebab paths + schedule**

- Delete `test/easy_web/controllers/coaches/plan_item_controller_test.exs`.
- In `coaches/nutrition_plan_controller_test.exs`, `clients/nutrition_plan_controller_test.exs`, `coaches/client_plan_controller_test.exs`: replace `/v1/coach/nutrition_plans` → `/v1/coach/nutrition-plans` (and `/v1/client/...`, `/clients/:client_id/nutrition_plans` → `nutrition-plans`); update any assertion on the plan-show `plan_items` key → `schedule_entries`.

- [ ] **Step 10: Run and commit**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono/backend && mix compile --warnings-as-errors && \
  mix test test/easy_web/controllers/coaches/schedule_controller_test.exs \
           test/easy_web/controllers/coaches/nutrition_plan_controller_test.exs \
           test/easy_web/controllers/clients/nutrition_plan_controller_test.exs \
           test/easy_web/controllers/coaches/client_plan_controller_test.exs
```
Expected: all pass.
```bash
git add backend && git commit -m "feat: nutrition plan schedule endpoints replace plan_items CRUD; kebab plan paths"
```

---

## Task 3: Foods + recipes (kebab paths, impact + copy, read-only guard, strict validation)

**Files:**
- Modify: `backend/lib/easy_web/router.ex`, `backend/lib/easy/foods.ex`, `backend/lib/easy/recipes.ex`, `backend/lib/easy_web/controllers/coaches/food_controller.ex`, `food_json.ex`, `recipe_controller.ex`, `recipe_json.ex`, `backend/lib/easy_web/controllers/fallback_controller.ex`, `backend/lib/easy_web/open_api/schemas/nutrition_food.ex`, `nutrition.ex`
- Modify (tests): `coaches/food_controller_test.exs`, `coaches/recipe_controller_test.exs`, `clients/food_controller_test.exs`, `clients/recipe_controller_test.exs`

**Interfaces:**
- Produces: `Foods.get_food_impact/2`, `Foods.copy_food/3`, `Recipes.get_recipe_impact/2`, `Recipes.copy_recipe/3`, and a read-only guard on `Foods.update_food/3`/`delete_food/2`.

- [ ] **Step 1: Add impact + copy + read-only guard to `Easy.Foods`**

In `backend/lib/easy/foods.ex`, add `import Ecto.Query` and `alias Easy.Nutrition.{Food, Meal, MealItem, Plan}` (extend the existing aliases). Add:

```elixir
@spec get_food_impact(String.t(), String.t()) ::
        {:ok, %{templates: [map()], active_client_plans: [map()]}} | {:error, :not_found}
def get_food_impact(business_id, food_id) do
  with {:ok, _food} <- get_visible_food(business_id, food_id) do
    plans =
      from(p in Plan,
        join: m in Meal, on: m.nutrition_plan_id == p.id,
        join: mi in MealItem, on: mi.nutrition_meal_id == m.id,
        where: p.business_id == ^business_id and mi.food_id == ^food_id,
        distinct: p.id,
        select: %{id: p.id, name: p.name, client_id: p.client_id, status: p.status}
      )
      |> Repo.all()

    {:ok, split_plan_impact(plans)}
  end
end

@spec split_plan_impact([map()]) :: %{templates: [map()], active_client_plans: [map()]}
def split_plan_impact(plans) do
  %{
    templates: for(p <- plans, is_nil(p.client_id), do: %{id: p.id, name: p.name}),
    active_client_plans:
      for(p <- plans, not is_nil(p.client_id), p.status == :active,
          do: %{id: p.id, name: p.name, client_id: p.client_id})
  }
end

@spec copy_food_for_coach_user(String.t(), String.t(), String.t()) ::
        {:ok, Food.t()} | {:error, :not_found | Ecto.Changeset.t()}
def copy_food_for_coach_user(business_id, user_id, food_id) do
  with {:ok, coach} <- get_coach_for_user(business_id, user_id) do
    copy_food(business_id, food_id, coach.id)
  end
end

@spec copy_food(String.t(), String.t(), String.t()) ::
        {:ok, Food.t()} | {:error, :not_found | Ecto.Changeset.t()}
def copy_food(business_id, food_id, coach_id) do
  with {:ok, food} <- get_visible_food(business_id, food_id) do
    attrs = %{
      "name" => food.name,
      "brand" => food.brand,
      "barcode" => food.barcode,
      "category" => food.category,
      "source" => "custom",
      "calories_per_100g" => food.calories_per_100g,
      "protein_g_per_100g" => food.protein_g_per_100g,
      "carbs_g_per_100g" => food.carbs_g_per_100g,
      "fat_g_per_100g" => food.fat_g_per_100g,
      "fiber_g_per_100g" => food.fiber_g_per_100g,
      "allergens" => food.allergens,
      "dietary_tags" => food.dietary_tags,
      "notes" => food.notes,
      "image_url" => food.image_url,
      "serving_sizes" => Enum.map(food.serving_sizes, &serving_size_attrs/1)
    }

    create_food(business_id, coach_id, attrs)
  end
end

defp serving_size_attrs(s) do
  %{"label" => s.label, "amount" => s.amount, "unit" => s.unit, "weight_g" => s.weight_g, "is_default" => s.is_default}
end

defp ensure_editable(%Food{source: source}) when source in ["system", "imported"],
  do: {:error, :read_only_source}

defp ensure_editable(_food), do: :ok
```

Change `update_food/3` and `delete_food/2` to load via `get_visible_food/2` and guard with `ensure_editable/1` (so system/imported foods return `:read_only_source` instead of silently failing, and other businesses' foods stay invisible):

```elixir
def update_food(business_id, food_id, attrs) do
  with {:ok, food} <- get_visible_food(business_id, food_id),
       :ok <- ensure_editable(food) do
    food |> Food.update_changeset(attrs) |> Repo.update()
  end
end

def delete_food(business_id, food_id) do
  with {:ok, food} <- get_visible_food(business_id, food_id),
       :ok <- ensure_editable(food) do
    Repo.delete(food)
  end
end
```

- [ ] **Step 2: Add impact + copy to `Easy.Recipes`**

In `backend/lib/easy/recipes.ex`, extend aliases with `alias Easy.Nutrition.{Meal, MealItem, Plan}`. Add:

```elixir
@spec get_recipe_impact(String.t(), String.t()) ::
        {:ok, %{templates: [map()], active_client_plans: [map()]}} | {:error, :not_found}
def get_recipe_impact(business_id, recipe_id) do
  with {:ok, _recipe} <- get_recipe_plain(business_id, recipe_id) do
    plans =
      from(p in Plan,
        join: m in Meal, on: m.nutrition_plan_id == p.id,
        join: mi in MealItem, on: mi.nutrition_meal_id == m.id,
        where: p.business_id == ^business_id and mi.recipe_id == ^recipe_id,
        distinct: p.id,
        select: %{id: p.id, name: p.name, client_id: p.client_id, status: p.status}
      )
      |> Repo.all()

    {:ok, Easy.Foods.split_plan_impact(plans)}
  end
end

@spec copy_recipe_for_coach_user(String.t(), String.t(), String.t()) ::
        {:ok, Recipe.t()} | {:error, :not_found | Ecto.Changeset.t()}
def copy_recipe_for_coach_user(business_id, user_id, recipe_id) do
  with {:ok, coach} <- get_coach_for_user(business_id, user_id) do
    copy_recipe(business_id, recipe_id, coach.id)
  end
end

@spec copy_recipe(String.t(), String.t(), String.t()) ::
        {:ok, Recipe.t()} | {:error, :not_found | Ecto.Changeset.t()}
def copy_recipe(business_id, recipe_id, coach_id) do
  with {:ok, recipe} <- get_recipe(business_id, recipe_id) do
    attrs = %{
      "name" => recipe.name,
      "description" => recipe.description,
      "instructions" => recipe.instructions,
      "servings_count" => recipe.servings_count,
      "cooked_weight_g" => recipe.cooked_weight_g,
      "allergens" => recipe.allergens,
      "dietary_tags" => recipe.dietary_tags,
      "serving_sizes" =>
        Enum.map(recipe.serving_sizes, fn s ->
          %{"label" => s.label, "amount" => s.amount, "unit" => s.unit, "weight_g" => s.weight_g, "is_default" => s.is_default}
        end),
      "recipe_ingredients" =>
        Enum.map(recipe.recipe_ingredients, fn ri ->
          %{"food_id" => ri.food_id, "amount" => ri.amount, "unit" => ri.unit, "weight_g" => ri.weight_g, "position" => ri.position}
        end)
    }

    create_recipe(business_id, coach_id, attrs)
  end
end
```

(`create_recipe/3` already runs `validate_ingredient_foods` and, per the Plan 1 fix, reloads via `get_recipe/2` so the copied recipe returns with derived nutrition + ingredients.)

- [ ] **Step 3: Add the FallbackController clause for `:read_only_source`**

In `fallback_controller.ex`, add this clause **above** the catch-all `def call(conn, {:error, reason})` (so it isn't swallowed by the 500 catch-all):

```elixir
def call(conn, {:error, :read_only_source}) do
  call(conn, {:error, Easy.Error.unprocessable(%{fields: %{source: ["system and imported foods are read-only; use the copy endpoint"]}})})
end
```
(This mirrors the existing `{:error, :not_found}` / changeset clauses, which all delegate to `Easy.Error` + the existing `%Easy.Error{}` renderer.)

- [ ] **Step 4: Add controller actions + operations + impact JSON**

`coaches/food_controller.ex`: add the validation plug `plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:create, :update]`. Add `impact/2` and `copy/2`:
```elixir
operation :impact,
  summary: "Show plans/templates affected by a food",
  operation_id: "getNutritionFoodImpact",
  security: [%{"bearerAuth" => []}],
  parameters: [id: [in: :path, type: :string, required: true]],
  responses: [
    ok: {"Impact", "application/json", FoodImpactResponse},
    not_found: {"Not found", "application/json", ErrorResponse}
  ]

operation :copy,
  summary: "Copy a food into the coach's business",
  operation_id: "copyNutritionFood",
  security: [%{"bearerAuth" => []}],
  parameters: [id: [in: :path, type: :string, required: true]],
  responses: [
    created: {"Food", "application/json", FoodResponse},
    not_found: {"Not found", "application/json", ErrorResponse}
  ]

@spec impact(Plug.Conn.t(), map()) :: Plug.Conn.t()
def impact(conn, %{"id" => id}) do
  business_id = conn.assigns.claims.business_id

  with {:ok, impact} <- Foods.get_food_impact(business_id, id) do
    render(conn, :impact, impact)
  end
end

@spec copy(Plug.Conn.t(), map()) :: Plug.Conn.t()
def copy(conn, %{"id" => id}) do
  %{business_id: business_id, user_id: user_id} = conn.assigns.claims

  with {:ok, food} <- Foods.copy_food_for_coach_user(business_id, user_id, id) do
    conn |> put_status(:created) |> render(:show, food: food)
  end
end
```
Add `alias EasyWeb.OpenApi.Schemas.FoodImpactResponse` (and `ErrorResponse`/`FoodResponse` if not already aliased). In `food_json.ex` add:
```elixir
@spec impact(map()) :: map()
def impact(%{templates: templates, active_client_plans: active_client_plans}) do
  %{data: %{templates: templates, active_client_plans: active_client_plans}}
end
```
Do the analogous changes in `recipe_controller.ex` (operations `getNutritionRecipeImpact` / `copyNutritionRecipe`; `impact/2` calls `Recipes.get_recipe_impact/2`; `copy/2` reads `%{business_id: business_id, user_id: user_id} = conn.assigns.claims` and calls `Recipes.copy_recipe_for_coach_user(business_id, user_id, id)`) and `recipe_json.ex` (`impact/1`).

- [ ] **Step 5: Add the impact OpenApiSpex schemas**

In `nutrition_food.ex`:
```elixir
defmodule EasyWeb.OpenApi.Schemas.FoodImpactResponse do
  require OpenApiSpex
  alias OpenApiSpex.Schema

  @plan_ref %Schema{type: :object, properties: %{id: %Schema{type: :string}, name: %Schema{type: :string}, client_id: %Schema{type: :string, nullable: true}}}

  OpenApiSpex.schema(%{
    title: "FoodImpactResponse",
    type: :object,
    properties: %{
      data: %Schema{
        type: :object,
        properties: %{
          templates: %Schema{type: :array, items: @plan_ref},
          active_client_plans: %Schema{type: :array, items: @plan_ref}
        }
      }
    }
  })
end
```
Add an identical `RecipeImpactResponse` in `nutrition.ex` (same shape).

- [ ] **Step 6: Router — kebab + impact/copy routes**

In `router.ex`, coach scope:
```elixir
get    "/nutrition-foods", FoodController, :index
post   "/nutrition-foods", FoodController, :create
get    "/nutrition-foods/:id", FoodController, :show
patch  "/nutrition-foods/:id", FoodController, :update
delete "/nutrition-foods/:id", FoodController, :delete
get    "/nutrition-foods/:id/impact", FoodController, :impact
post   "/nutrition-foods/:id/copy", FoodController, :copy

get    "/nutrition-recipes", RecipeController, :index
post   "/nutrition-recipes", RecipeController, :create
get    "/nutrition-recipes/:id", RecipeController, :show
patch  "/nutrition-recipes/:id", RecipeController, :update
delete "/nutrition-recipes/:id", RecipeController, :delete
get    "/nutrition-recipes/:id/impact", RecipeController, :impact
post   "/nutrition-recipes/:id/copy", RecipeController, :copy
```
Client scope: `/foods` → `/nutrition-foods`, `/recipes` → `/nutrition-recipes` (index + show only).

- [ ] **Step 7: Tests**

- Update path strings in `coaches/food_controller_test.exs`, `coaches/recipe_controller_test.exs`, `clients/food_controller_test.exs`, `clients/recipe_controller_test.exs` to kebab `nutrition-foods`/`nutrition-recipes`.
- Add tests: food impact (a food used in a template plan and an active client plan returns both buckets; an unused food returns empty buckets); food copy (copying a `source: system` food returns a 201 with `source == "custom"` and the same per-100g values, owned by the coach business); food read-only guard (PATCH on a `source: system` food returns 422). Add the recipe analogues (impact + copy). Representative:
```elixir
test "copy of a system food creates an editable business copy", %{conn: conn} do
  system_food = insert(:food, business: nil, creator: nil, source: "system", calories_per_100g: 120.0)
  conn = post(conn, "/v1/coach/nutrition-foods/#{system_food.id}/copy")
  assert %{"data" => data} = json_response(conn, 201)
  assert data["source"] == "custom"
  assert data["calories_per_100g"] == 120.0
  refute data["id"] == system_food.id
end

test "patching a system food is rejected", %{conn: conn} do
  system_food = insert(:food, business: nil, creator: nil, source: "system")
  conn = patch(conn, "/v1/coach/nutrition-foods/#{system_food.id}", %{"name" => "Renamed"})
  assert json_response(conn, 422)
end
```
(If the `:food` factory requires a business, build the system food with `business: nil` and `source: "system"`; ensure `get_visible_food/2` returns `is_nil(business_id)` foods — it does.)

- [ ] **Step 8: Run and commit**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono/backend && mix compile --warnings-as-errors && \
  mix test test/easy_web/controllers/coaches/food_controller_test.exs \
           test/easy_web/controllers/coaches/recipe_controller_test.exs \
           test/easy_web/controllers/clients/food_controller_test.exs \
           test/easy_web/controllers/clients/recipe_controller_test.exs
git add backend && git commit -m "feat: nutrition food/recipe kebab paths, impact + copy endpoints, read-only sources"
```

---

## Task 4: Meals + meal items (kebab paths, drop standalone items index, strict validation)

**Files:**
- Modify: `router.ex`, `coaches/meal_controller.ex`, `coaches/meal_item_controller.ex`, `coaches/meal_item_json.ex`, `backend/lib/easy/meals.ex`
- Modify (tests): `coaches/meal_controller_test.exs`, `coaches/meal_item_controller_test.exs`

- [ ] **Step 1: Router**

Replace the meals/meal-items coach routes with kebab paths and drop the standalone items index:
```elixir
post   "/nutrition-plans/:plan_id/meals", MealController, :create   # (kept from Task 2)
get    "/nutrition-plans/:plan_id/meals", MealController, :index    # (kept from Task 2)
get    "/nutrition-meals/:id", MealController, :show
patch  "/nutrition-meals/:id", MealController, :update
delete "/nutrition-meals/:id", MealController, :delete
post   "/nutrition-meals/:meal_id/items", MealItemController, :create
patch  "/nutrition-meal-items/:id", MealItemController, :update
delete "/nutrition-meal-items/:id", MealItemController, :delete
```
Remove `get "/meals/:meal_id/items", MealItemController, :index`.

- [ ] **Step 2: Drop the items index action + dead context fn**

- `coaches/meal_item_controller.ex`: delete the `:index` action and its `operation :index`. Add `plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:create, :update]`.
- `coaches/meal_item_json.ex`: delete `index/1` (keep `show/1` + `data/1`).
- `backend/lib/easy/meals.ex`: delete `list_meal_items/2` (now unreferenced — confirm with `grep -rn list_meal_items lib test`).
- `coaches/meal_controller.ex`: add `plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:create, :update]`.

- [ ] **Step 3: Tests**

- Update path strings in `coaches/meal_controller_test.exs` (`/v1/coach/nutrition-plans/:plan_id/meals`, `/v1/coach/nutrition-meals/:id`) and `coaches/meal_item_controller_test.exs` (`/v1/coach/nutrition-meals/:meal_id/items`, `/v1/coach/nutrition-meal-items/:id`).
- Remove any test exercising `GET /meals/:meal_id/items` (the standalone items index).

- [ ] **Step 4: Run and commit**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono/backend && mix compile --warnings-as-errors && \
  mix test test/easy_web/controllers/coaches/meal_controller_test.exs \
           test/easy_web/controllers/coaches/meal_item_controller_test.exs
git add backend && git commit -m "feat: nutrition meals/meal-items kebab paths; drop standalone items index"
```

---

## Task 5: Logging (kebab paths, coach meal-logs under /clients/:id, drops, from/to, strict validation)

**Files:**
- Modify: `router.ex`, `coaches/meal_log_controller.ex`, `coaches/meal_log_json.ex`, `clients/meal_log_controller.ex`, `clients/meal_log_json.ex`, `clients/food_log_entry_controller.ex`
- Delete: `backend/lib/easy_web/controllers/coaches/food_log_entry_controller.ex`
- Modify (tests): `coaches/meal_log_controller_test.exs`, `clients/meal_log_controller_test.exs`, `clients/food_log_entry_controller_test.exs`

- [ ] **Step 1: Router**

Coach scope — replace the flat meal-log routes:
```elixir
get "/clients/:client_id/nutrition-meal-logs", MealLogController, :index
```
Remove `get "/meal_logs", ...`, `get "/meal_logs/summary", ...`, and `delete "/food_log_entries/:id", ...`.

Client scope:
```elixir
get    "/nutrition-meal-logs", MealLogController, :index
post   "/nutrition-food-log-entries", FoodLogEntryController, :create
post   "/nutrition-food-log-entries/log-meal", FoodLogEntryController, :log_meal
post   "/nutrition-food-log-entries/log-day", FoodLogEntryController, :log_day
patch  "/nutrition-food-log-entries/:id", FoodLogEntryController, :update
delete "/nutrition-food-log-entries/:id", FoodLogEntryController, :delete
```
Remove `get "/meal_logs/:id", ...` (client meal-log show). Keep the static `log-meal`/`log-day` routes declared **before** the `:id` route.

- [ ] **Step 2: Coach meal-log controller**

- Delete the `:summary` action + `operation :summary`; remove `summary/1` from `coaches/meal_log_json.ex`.
- In `operation :index`, change the `client_id` parameter from `:query` to `:path`. The `index/2` body already reads `%{"client_id" => client_id}` (now from the path) — no logic change.
- Delete the entire file `backend/lib/easy_web/controllers/coaches/food_log_entry_controller.ex` (its only action, coach delete, is dropped per the spec's read-only rule).

- [ ] **Step 3: Client meal-log + food-log controllers**

- `clients/meal_log_controller.ex`: delete the `:show` action + `operation :show`; remove `show/1` from `clients/meal_log_json.ex`. In `operation :index`, add `from`/`to` query parameters and pass them through to `MealLogs.list_meal_logs_for_user/5` (the context already supports `date` OR `from`+`to`). Representative index body:
  ```elixir
  def index(conn, params) do
    business_id = conn.assigns.claims.business_id
    user_id = conn.assigns.claims.user_id
    date = parse_date(params["date"])
    from_date = parse_date(params["from"])
    to_date = parse_date(params["to"])

    with {:ok, logs} <- MealLogs.list_meal_logs_for_user(business_id, user_id, date, from_date, to_date) do
      render(conn, :index, meal_logs: logs)
    end
  end
  ```
  (Match the existing accessor names for `business_id`/`user_id`; reuse the controller's existing date-parsing helper if present.)
- `clients/food_log_entry_controller.ex`: add `plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:create, :update, :log_meal, :log_day]`. No action-body changes; the five actions map 1:1 to the spec endpoints.

- [ ] **Step 4: Tests**

- `coaches/meal_log_controller_test.exs`: change requests to `GET /v1/coach/clients/#{client_id}/nutrition-meal-logs?date=...` (and `?from=&to=`); remove any `summary` and coach-`DELETE food_log_entries` tests.
- `clients/meal_log_controller_test.exs`: kebab `/v1/client/nutrition-meal-logs`; remove the `show`-by-id test; add a `?from=&to=` range test.
- `clients/food_log_entry_controller_test.exs`: kebab `/v1/client/nutrition-food-log-entries`, `/log-meal`, `/log-day`.

- [ ] **Step 5: Run and commit**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono/backend && mix compile --warnings-as-errors && \
  mix test test/easy_web/controllers/coaches/meal_log_controller_test.exs \
           test/easy_web/controllers/clients/meal_log_controller_test.exs \
           test/easy_web/controllers/clients/food_log_entry_controller_test.exs
git add backend && git commit -m "feat: nutrition logging kebab paths; coach meal-logs under /clients/:id; read-only coach logs"
```

---

## Task 6: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Full compile + full suite**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono/backend && mix compile --warnings-as-errors && mix test
```
Expected: exit 0; all tests pass.

- [ ] **Step 2: Confirm the API surface in the generated OpenAPI document**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono/backend && MIX_ENV=test mix run -e '
spec = EasyWeb.ApiSpec.spec() |> OpenApiSpex.OpenApi.to_map()
paths = spec |> Map.fetch!("paths") |> Map.keys() |> Enum.sort()
nutri = Enum.filter(paths, &String.contains?(&1, "nutrition"))
IO.puts("nutrition paths:"); Enum.each(nutri, &IO.puts/1)
snake = Enum.filter(paths, &(String.contains?(&1, "nutrition_") or String.contains?(&1, "/foods") or String.contains?(&1, "/recipes") or String.contains?(&1, "/meal_logs") or String.contains?(&1, "/plan_items") or String.contains?(&1, "/food_log_entries") or String.contains?(&1, "/meal_items")))
IO.puts("LEFTOVER SNAKE/UNPREFIXED (should be []): #{inspect(snake)}")
want = ["/v1/coach/nutrition-plans/{plan_id}/schedule", "/v1/coach/nutrition-plans/{plan_id}/schedule/{day}", "/v1/coach/nutrition-foods/{id}/impact", "/v1/coach/nutrition-foods/{id}/copy", "/v1/coach/nutrition-recipes/{id}/impact", "/v1/coach/nutrition-recipes/{id}/copy", "/v1/coach/clients/{client_id}/nutrition-meal-logs"]
IO.puts("MISSING TARGET PATHS (should be []): #{inspect(want -- paths)}")
gone = Enum.filter(paths, &(String.contains?(&1, "plan_items") or String.ends_with?(&1, "/meal_logs/summary") or String.ends_with?(&1, "/meals/{meal_id}/items")))
IO.puts("DROPPED PATHS STILL PRESENT (should be []): #{inspect(gone)}")
'
```
Expected: leftover-snake `[]`, missing-target `[]`, dropped-still-present `[]`, and the nutrition paths list shows the full kebab surface.

- [ ] **Step 3: Spot-check strict validation is active**

Confirm an alternate macro name is rejected on a write endpoint (CastAndValidate + `additionalProperties: false`):
```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono/backend && mix test test/easy_web/controllers/coaches/food_controller_test.exs
```
Add (if not already present from Task 3) a test asserting `POST /v1/coach/nutrition-foods` with a body using `"protein": 10` (instead of `"protein_g_per_100g"`) returns 422. If it passes silently, CastAndValidate is not wired on that controller — fix before proceeding.

- [ ] **Step 4: Diff hygiene**

```bash
git diff --check && git status --short
```
Expected: no whitespace errors; only intended files changed.

- [ ] **Step 5: Whole-branch review**

This is the final review checkpoint of the subagent-driven workflow — run it per the executing skill (a single whole-feature review over Plan 2's commits), then address Critical/Important findings before declaring done.

---

## Self-review

**Spec coverage (Nutrition API):**
- Kebab `nutrition-` paths for plans, meals, meal-items, foods, recipes, meal-logs, food-log-entries — Tasks 2–5; verified in Task 6 Step 2.
- `GET /schedule` + `PUT /schedule/:day` desired-state, replacing `plan_items` CRUD — Task 2 (`get_schedule/2`, `set_day_schedule/4`, `ScheduleController`, schedule OpenApiSpex schemas).
- Coach meal-logs read-only under `/clients/:client_id/nutrition-meal-logs` (path param), client logs with `date` or `from/to` — Task 5.
- Food/recipe `impact` (templates + active client plans) and `copy` (system/imported → business-owned `custom`), read-only system/imported foods — Task 3.
- Strict request validation (reject alternate macro names / loose maps) via `CastAndValidate` on write actions — Tasks 2–5; spot-checked in Task 6 Step 3.
- `PlanItem` → `ScheduleEntry` module rename — Task 1.
- Confirmed product decisions: coach per-client plan list kept (kebab) — Task 2; the four out-of-spec routes dropped — Tasks 4–5.

**Type consistency:** `NutritionPlans.get_schedule/2` returns day→slot→`ScheduleEntry`; `set_day_schedule/4` returns slot→`ScheduleEntry`; the `ScheduleJSON` renders them with `meal_id` = `nutrition_meal_id`. `Foods.split_plan_impact/1` is the shared impact shaper reused by `Recipes.get_recipe_impact/2`. The `NutritionScheduleEntry` OpenApiSpex schema (renamed from `NutritionPlanItem`) is referenced by the schedule response schemas and the inline plan `schedule_entries` field. `CastAndValidate` reads validated `conn.body_params`; controllers consume that, not raw params.

**No schema/DB changes:** Plan 2 touches no migration and no `nutrition_*` table column — it is HTTP-surface + the schedule write-model only.
