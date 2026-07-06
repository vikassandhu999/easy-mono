# Nutrition Day-Types + Meal Options per Slot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inferred Everyday/Customize nutrition schedule with persisted day-types (1..N named days per plan, weekday→day assignments) and let each (day, slot) hold up to 3 whole-meal options where option position 0 is the default.

**Architecture:** Three new tables (`nutrition_plan_days`, `nutrition_day_meals`, `nutrition_weekday_assignments`) replace `nutrition_schedule_entries` via a staged cutover: create+backfill first, add new context/HTTP surface, then delete the old pathway wholesale. Client logging pins the chosen option on `nutrition_meal_logs.nutrition_meal_id`; reconciliation stays keyed by `planned_item_index` against the chosen meal's item positions. FE: coach builder's schedule section is replaced by a days section; client Today gets an option switcher.

**Tech Stack:** Elixir/Phoenix/Ecto + OpenApiSpex (backend), React 19 + HeroUI v3 + RTK Query generated clients (frontend).

**Spec:** `docs/superpowers/specs/2026-07-06-nutrition-day-types-meal-options-design.md` (read it for rationale; this plan is self-contained for execution).

## Global Constraints

- Max **3** options per (day, slot). Exceeding returns bare atom `:max_options`. Constant `@max_options_per_slot 3` in `Easy.NutritionPlans`.
- A fresh plan gets exactly one day named **"Everyday"** at position 0 with all 7 weekdays assigned. A plan's last day cannot be deleted → bare atom `:last_day`.
- Every plan has exactly 7 weekday-assignment rows at all times. Deleting a day reassigns its weekdays to the plan's position-0 day in the same transaction.
- Option position 0 = default. All macro totals/previews use the default option only.
- Error reasons are bare atoms or changesets (`:not_found`, `:last_day`, `:max_options`) — never tagged tuples. `FallbackController` maps them.
- Public context functions take `%Easy.Ctx{}` first. Changesets are Ctx-ignorant; trusted ids are positional params via `put_change` (canonical order: business_id, actor, parent, attrs). Every tenant query scoped by `business_id`.
- New route segments are kebab-case: `/nutrition-days`, `/nutrition-day-meals`, `/weekday-assignments`, `/switch-option`.
- Every new/changed public JSON endpoint: OpenApiSpex operation + `CastAndValidate` on writes; update schemas in `lib/easy_web/open_api/schemas/nutrition.ex`. After editing OpenApiSpex schemas, a running dev `phx.server` must be **fully restarted** (code reload does not bust the cached spec).
- Backend finishing gate per task: the named test files pass; Task 5 additionally runs `mix precommit`. Baseline: 8 pre-existing failures exist in food/exercise search-ordering tests on main — those are not yours; every suite you touch must be at 0 failures.
- Frontend: never hand-edit `src/api/generated.ts` (regen with `just gen-api` from repo root); delete-then-use when replacing hand-written endpoints; codegen is `tag:false` so add cache-tag wiring per feature; error copy "Couldn't load X" never "Failed to load X"; `NumberInput` not react-aria NumberField; run `bash scripts/check-rm.sh` (via `just lint` or directly) before finishing FE tasks.
- Client-facing copy (verbatim): builder caption **"Totals use default options."**; switch-confirm body **"Switching clears what you've logged for this meal"**; option row tag **"Default"**.
- Backend tests use factories from `backend/test/support/factory.ex` (`insert(:plan)`, `insert(:meal, plan: plan, creator: plan.creator)`, etc.). `Easy.Utils.weekday_name/1` returns a lowercase **string** ("monday").

---

## File Structure

Backend create:
- `backend/lib/easy/nutrition/plan_day.ex` — PlanDay schema + query builders
- `backend/lib/easy/nutrition/day_meal.ex` — DayMeal schema (slot option row)
- `backend/lib/easy/nutrition/weekday_assignment.ex` — WeekdayAssignment schema
- `backend/priv/repo/migrations/20260706120000_create_nutrition_plan_days.exs` — 3 tables + backfill
- `backend/priv/repo/migrations/20260706130000_add_meal_id_to_meal_logs.exs`
- `backend/priv/repo/migrations/20260706140000_drop_nutrition_schedule_entries.exs`
- `backend/lib/easy_web/controllers/coaches/plan_day_controller.ex` + `plan_day_json.ex`
- `backend/test/easy/nutrition_plan_days_test.exs`, `backend/test/easy_web/controllers/coaches/plan_day_controller_test.exs`

Backend modify: `nutrition/plan.ex`, `nutrition/meal_log.ex`, `nutrition_plans.ex`, `meal_logs.ex`, coach+client `nutrition_plan_controller/json`, client `food_log_entry_controller`, `open_api/schemas/nutrition.ex`, `router.ex`, `test/support/factory.ex`.

Backend delete (Task 5): `nutrition/schedule_entry.ex`, `coaches/schedule_controller.ex`, `coaches/schedule_json.ex`, `test/easy_web/controllers/coaches/schedule_controller_test.exs`, schedule OpenAPI schemas.

Frontend: replace `coachapp-v2/src/nutrition-plans/plan-builder/nutrition-schedule.tsx` with `plan-days.tsx`; modify `nutrition-plan-builder.tsx`, `coachapp-v2/src/api/` wiring; clientapp `src/api/nutrition.ts`, `src/nutrition/nutrition-today.tsx`, `nutrition-utils.ts`.

---

### Task 1: Schemas + create/backfill migration + default day on plan create

**Files:**
- Create: `backend/lib/easy/nutrition/plan_day.ex`
- Create: `backend/lib/easy/nutrition/day_meal.ex`
- Create: `backend/lib/easy/nutrition/weekday_assignment.ex`
- Create: `backend/priv/repo/migrations/20260706120000_create_nutrition_plan_days.exs`
- Modify: `backend/lib/easy/nutrition/plan.ex` (add assocs)
- Modify: `backend/lib/easy/nutrition_plans.ex` (`create_plan` seeds Everyday day + assignments; `copy_plan` copies new structure)
- Modify: `backend/test/support/factory.ex` (add `plan_day_factory`, `day_meal_factory`, `weekday_assignment_factory`)
- Test: `backend/test/easy/nutrition_plan_days_test.exs`

**Interfaces:**
- Produces: `Easy.Nutrition.PlanDay` (fields `name`, `position`, belongs_to `plan`/`business`, has_many `day_meals`; `insert_changeset(business_id, plan_id, attrs)`, `update_changeset/2`, `for_business/2`, `for_plan/2`, `by_position/1`, `include_day_meals(q, business_id)`).
- Produces: `Easy.Nutrition.DayMeal` (fields `meal_slot`, `position`, belongs_to `plan_day`/`meal`/`business`; `insert_changeset(business_id, plan_day_id, attrs)`; `for_business/2`, `for_plan_day/2`, `for_meal_slot/2`, `by_slot_position/1`, `include_meal(q, business_id)`; `meal_slots/0` returning the 6-slot list).
- Produces: `Easy.Nutrition.WeekdayAssignment` (fields `day_of_week`, belongs_to `plan`/`plan_day`/`business`; `insert_changeset(business_id, plan_id, plan_day_id, attrs)`; `for_business/2`, `for_plan/2`; `days/0`).
- Produces: `Plan` has `has_many :days, PlanDay` and `has_many :weekday_assignments, WeekdayAssignment`; `NutritionPlans.create_plan/2` returns a plan that already has 1 "Everyday" day + 7 assignments.

- [ ] **Step 1: Write the three schema modules**

`backend/lib/easy/nutrition/plan_day.ex`:

```elixir
defmodule Easy.Nutrition.PlanDay do
  use Ecto.Schema

  alias Easy.Nutrition.DayMeal
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "nutrition_plan_days" do
    field :name, :string
    field :position, :integer

    belongs_to :business, Orgs.Business
    belongs_to :plan, Easy.Nutrition.Plan, foreign_key: :nutrition_plan_id
    has_many :day_meals, DayMeal, foreign_key: :nutrition_plan_day_id

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, plan_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:name, :position])
    |> put_change(:business_id, business_id)
    |> put_change(:nutrition_plan_id, plan_id)
    |> validate_required([:name, :position, :nutrition_plan_id, :business_id])
    |> unique_constraint([:nutrition_plan_id, :position],
      name: :nutrition_plan_days_nutrition_plan_id_position_index
    )
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(day, attrs) do
    day
    |> cast(attrs, [:name])
    |> validate_required([:name])
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(d in query, where: d.business_id == ^business_id)
  end

  @spec for_plan(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_plan(query \\ __MODULE__, plan_id) do
    from(d in query, where: d.nutrition_plan_id == ^plan_id)
  end

  @spec by_position(Ecto.Queryable.t()) :: Ecto.Query.t()
  def by_position(query \\ __MODULE__) do
    from(d in query, order_by: [asc: d.position])
  end

  @spec include_day_meals(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_day_meals(query \\ __MODULE__, business_id) do
    from(d in query,
      where: d.business_id == ^business_id,
      preload: [day_meals: ^DayMeal.include_meal(DayMeal.by_slot_position(), business_id)]
    )
  end
end
```

`backend/lib/easy/nutrition/day_meal.ex`:

```elixir
defmodule Easy.Nutrition.DayMeal do
  use Ecto.Schema

  alias Easy.Nutrition.Meal
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @meal_slots [:breakfast, :morning_snack, :lunch, :afternoon_snack, :dinner, :evening_snack]

  @spec meal_slots() :: [atom()]
  def meal_slots, do: @meal_slots

  schema "nutrition_day_meals" do
    field :meal_slot, Ecto.Enum, values: @meal_slots
    field :position, :integer

    belongs_to :business, Orgs.Business
    belongs_to :plan_day, Easy.Nutrition.PlanDay, foreign_key: :nutrition_plan_day_id
    belongs_to :meal, Meal, foreign_key: :nutrition_meal_id

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, plan_day_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:meal_slot, :position, :nutrition_meal_id])
    |> put_change(:business_id, business_id)
    |> put_change(:nutrition_plan_day_id, plan_day_id)
    |> validate_required([:meal_slot, :position, :nutrition_meal_id, :nutrition_plan_day_id, :business_id])
    |> unique_constraint([:nutrition_plan_day_id, :meal_slot, :position],
      name: :nutrition_day_meals_day_slot_position_index
    )
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(dm in query, where: dm.business_id == ^business_id)
  end

  @spec for_plan_day(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_plan_day(query \\ __MODULE__, plan_day_id) do
    from(dm in query, where: dm.nutrition_plan_day_id == ^plan_day_id)
  end

  @spec for_meal_slot(Ecto.Queryable.t(), atom() | String.t() | nil) :: Ecto.Query.t()
  def for_meal_slot(query \\ __MODULE__, meal_slot)
  def for_meal_slot(query, nil), do: query
  def for_meal_slot(query, meal_slot), do: from(dm in query, where: dm.meal_slot == ^meal_slot)

  @spec by_slot_position(Ecto.Queryable.t()) :: Ecto.Query.t()
  def by_slot_position(query \\ __MODULE__) do
    from(dm in query, order_by: [asc: dm.meal_slot, asc: dm.position])
  end

  @spec include_meal(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_meal(query \\ __MODULE__, business_id) do
    from(dm in query,
      where: dm.business_id == ^business_id,
      preload: [meal: ^Meal.include_items(Meal, business_id)]
    )
  end
end
```

`backend/lib/easy/nutrition/weekday_assignment.ex`:

```elixir
defmodule Easy.Nutrition.WeekdayAssignment do
  use Ecto.Schema

  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @days [:monday, :tuesday, :wednesday, :thursday, :friday, :saturday, :sunday]

  @spec days() :: [atom()]
  def days, do: @days

  schema "nutrition_weekday_assignments" do
    field :day_of_week, Ecto.Enum, values: @days

    belongs_to :business, Orgs.Business
    belongs_to :plan, Easy.Nutrition.Plan, foreign_key: :nutrition_plan_id
    belongs_to :plan_day, Easy.Nutrition.PlanDay, foreign_key: :nutrition_plan_day_id

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, plan_id, plan_day_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:day_of_week])
    |> put_change(:business_id, business_id)
    |> put_change(:nutrition_plan_id, plan_id)
    |> put_change(:nutrition_plan_day_id, plan_day_id)
    |> validate_required([:day_of_week, :nutrition_plan_id, :nutrition_plan_day_id, :business_id])
    |> unique_constraint([:nutrition_plan_id, :day_of_week],
      name: :nutrition_weekday_assignments_plan_day_of_week_index
    )
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(wa in query, where: wa.business_id == ^business_id)
  end

  @spec for_plan(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_plan(query \\ __MODULE__, plan_id) do
    from(wa in query, where: wa.nutrition_plan_id == ^plan_id)
  end

  @spec for_day(Ecto.Queryable.t(), atom() | String.t()) :: Ecto.Query.t()
  def for_day(query \\ __MODULE__, day) do
    from(wa in query, where: wa.day_of_week == ^day)
  end
end
```

- [ ] **Step 2: Write the migration (create 3 tables + backfill; do NOT drop `nutrition_schedule_entries`)**

`backend/priv/repo/migrations/20260706120000_create_nutrition_plan_days.exs`:

```elixir
defmodule Easy.Repo.Migrations.CreateNutritionPlanDays do
  use Ecto.Migration

  def up do
    create table(:nutrition_plan_days, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :position, :integer, null: false
      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all), null: false
      add :nutrition_plan_id, references(:nutrition_plans, type: :binary_id, on_delete: :delete_all), null: false
      timestamps(type: :utc_datetime)
    end

    create unique_index(:nutrition_plan_days, [:nutrition_plan_id, :position])
    create index(:nutrition_plan_days, [:business_id])

    create table(:nutrition_day_meals, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :meal_slot, :string, null: false
      add :position, :integer, null: false
      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all), null: false
      add :nutrition_plan_day_id, references(:nutrition_plan_days, type: :binary_id, on_delete: :delete_all), null: false
      add :nutrition_meal_id, references(:nutrition_meals, type: :binary_id, on_delete: :delete_all), null: false
      timestamps(type: :utc_datetime)
    end

    create unique_index(:nutrition_day_meals, [:nutrition_plan_day_id, :meal_slot, :position],
             name: :nutrition_day_meals_day_slot_position_index
           )

    create index(:nutrition_day_meals, [:business_id])
    create index(:nutrition_day_meals, [:nutrition_meal_id])

    create table(:nutrition_weekday_assignments, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :day_of_week, :string, null: false
      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all), null: false
      add :nutrition_plan_id, references(:nutrition_plans, type: :binary_id, on_delete: :delete_all), null: false
      add :nutrition_plan_day_id, references(:nutrition_plan_days, type: :binary_id, on_delete: :delete_all), null: false
      timestamps(type: :utc_datetime)
    end

    create unique_index(:nutrition_weekday_assignments, [:nutrition_plan_id, :day_of_week],
             name: :nutrition_weekday_assignments_plan_day_of_week_index
           )

    create index(:nutrition_weekday_assignments, [:business_id])

    flush()
    backfill()
  end

  def down do
    drop table(:nutrition_weekday_assignments)
    drop table(:nutrition_day_meals)
    drop table(:nutrition_plan_days)
  end

  @weekdays ~w(monday tuesday wednesday thursday friday saturday sunday)

  # Group each plan's weekdays by identical (slot -> meal_id) signature.
  # One group -> a single "Everyday" day; N groups -> "Day 1".."Day N".
  # Weekdays with no entries join the largest group. Plans with no entries
  # get one "Everyday" day owning all 7 weekdays.
  defp backfill do
    %{rows: plans} =
      repo().query!("SELECT id, business_id FROM nutrition_plans", [])

    Enum.each(plans, fn [plan_id, business_id] ->
      %{rows: entries} =
        repo().query!(
          "SELECT day_of_week, meal_slot, nutrition_meal_id FROM nutrition_schedule_entries WHERE nutrition_plan_id = $1",
          [plan_id]
        )

      by_day = Enum.group_by(entries, fn [day, _slot, _meal] -> day end)

      signature = fn day ->
        by_day
        |> Map.get(day, [])
        |> Enum.map(fn [_d, slot, meal] -> {slot, meal} end)
        |> Enum.sort()
      end

      groups =
        @weekdays
        |> Enum.group_by(signature)
        |> Enum.sort_by(fn {_sig, days} -> -length(days) end)

      groups =
        case groups do
          [{[], empty_days} | [{sig, days} | rest]] ->
            # merge empty weekdays into the largest non-empty group
            [{sig, days ++ empty_days} | rest]

          other ->
            other
        end

      groups
      |> Enum.with_index()
      |> Enum.each(fn {{sig, days}, idx} ->
        name = if length(groups) == 1, do: "Everyday", else: "Day #{idx + 1}"

        %{rows: [[day_id]]} =
          repo().query!(
            """
            INSERT INTO nutrition_plan_days (id, name, position, business_id, nutrition_plan_id, inserted_at, updated_at)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, now(), now()) RETURNING id
            """,
            [name, idx, business_id, plan_id]
          )

        Enum.each(sig, fn {slot, meal_id} ->
          repo().query!(
            """
            INSERT INTO nutrition_day_meals (id, meal_slot, position, business_id, nutrition_plan_day_id, nutrition_meal_id, inserted_at, updated_at)
            VALUES (gen_random_uuid(), $1, 0, $2, $3, $4, now(), now())
            """,
            [slot, business_id, day_id, meal_id]
          )
        end)

        Enum.each(days, fn day ->
          repo().query!(
            """
            INSERT INTO nutrition_weekday_assignments (id, day_of_week, business_id, nutrition_plan_id, nutrition_plan_day_id, inserted_at, updated_at)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, now(), now())
            """,
            [day, business_id, plan_id, day_id]
          )
        end)
      end)
    end)
  end
end
```

- [ ] **Step 3: Add assocs to `Plan`**

In `backend/lib/easy/nutrition/plan.ex`, next to the existing `has_many :plan_items` line, add (keep `plan_items` for now — Task 5 removes it):

```elixir
    has_many :days, Easy.Nutrition.PlanDay, foreign_key: :nutrition_plan_id
    has_many :weekday_assignments, Easy.Nutrition.WeekdayAssignment, foreign_key: :nutrition_plan_id
```

And extend `include_full/2`'s preload list:

```elixir
      preload: [
        meals: ^Meal.include_items(Meal, business_id),
        plan_items: ^ScheduleEntry.include_meal(ScheduleEntry, business_id),
        days: ^Easy.Nutrition.PlanDay.include_day_meals(Easy.Nutrition.PlanDay.by_position(), business_id),
        weekday_assignments: ^Easy.Nutrition.WeekdayAssignment.for_business(Easy.Nutrition.WeekdayAssignment, business_id),
        client: ^Client.for_business(business_id)
      ]
```

- [ ] **Step 4: Write failing tests for schemas + default-day-on-create + copy**

`backend/test/easy/nutrition_plan_days_test.exs` (add to it in later tasks too):

```elixir
defmodule Easy.NutritionPlanDaysTest do
  use Easy.DataCase, async: true

  alias Easy.Nutrition.DayMeal
  alias Easy.Nutrition.PlanDay
  alias Easy.Nutrition.WeekdayAssignment
  alias Easy.NutritionPlans
  alias Easy.Repo

  defp ctx_for(plan) do
    coach = plan.creator
    %Easy.Ctx{business_id: plan.business_id, user_id: coach.user_id, role: :coach}
  end

  describe "create_plan/2 seeds day structure" do
    test "new plan has one Everyday day owning all 7 weekdays" do
      plan = insert(:plan)
      ctx = ctx_for(plan)

      {:ok, created} = NutritionPlans.create_plan(ctx, params_for_plan())

      [day] = PlanDay |> PlanDay.for_plan(created.id) |> Repo.all()
      assert day.name == "Everyday"
      assert day.position == 0

      assignments = WeekdayAssignment |> WeekdayAssignment.for_plan(created.id) |> Repo.all()
      assert length(assignments) == 7
      assert Enum.all?(assignments, &(&1.nutrition_plan_day_id == day.id))
    end
  end

  describe "changesets" do
    test "day_meal position unique per (day, slot)" do
      day = insert(:plan_day)
      meal = insert(:meal, plan: day.plan, creator: day.plan.creator)
      attrs = %{"meal_slot" => "breakfast", "position" => 0, "nutrition_meal_id" => meal.id}

      assert {:ok, _} = DayMeal.insert_changeset(day.business_id, day.id, attrs) |> Repo.insert()
      assert {:error, cs} = DayMeal.insert_changeset(day.business_id, day.id, attrs) |> Repo.insert()
      refute cs.valid?
    end

    test "weekday unique per plan" do
      day = insert(:plan_day)
      attrs = %{"day_of_week" => "monday"}
      base = WeekdayAssignment.insert_changeset(day.business_id, day.nutrition_plan_id, day.id, attrs)

      assert {:ok, _} = Repo.insert(base)
      assert {:error, _} =
               WeekdayAssignment.insert_changeset(day.business_id, day.nutrition_plan_id, day.id, attrs)
               |> Repo.insert()
    end

    test "trusted ids are not cast from attrs" do
      day = insert(:plan_day)
      other = insert(:plan_day)
      meal = insert(:meal, plan: day.plan, creator: day.plan.creator)

      attrs = %{
        "meal_slot" => "lunch",
        "position" => 0,
        "nutrition_meal_id" => meal.id,
        "business_id" => other.business_id,
        "nutrition_plan_day_id" => other.id
      }

      {:ok, dm} = DayMeal.insert_changeset(day.business_id, day.id, attrs) |> Repo.insert()
      assert dm.business_id == day.business_id
      assert dm.nutrition_plan_day_id == day.id
    end
  end

  defp params_for_plan do
    %{"name" => "Cut plan", "status" => "active"}
  end
end
```

- [ ] **Step 5: Add factories**

In `backend/test/support/factory.ex`, after `schedule_entry_attrs_factory`, add (alias `Easy.Nutrition.PlanDay`, `Easy.Nutrition.DayMeal`, `Easy.Nutrition.WeekdayAssignment` at the top with the other Nutrition aliases):

```elixir
  def plan_day_factory do
    plan = build(:plan)

    %PlanDay{
      name: "Everyday",
      position: sequence(:plan_day_position, & &1),
      business: plan.business,
      plan: plan
    }
  end

  def day_meal_factory do
    day = build(:plan_day)
    meal = build(:meal, plan: day.plan, creator: day.plan.creator)

    %DayMeal{
      meal_slot: "breakfast",
      position: 0,
      business: day.plan.business,
      plan_day: day,
      meal: meal
    }
  end

  def weekday_assignment_factory do
    day = build(:plan_day)

    %WeekdayAssignment{
      day_of_week: "monday",
      business: day.plan.business,
      plan: day.plan,
      plan_day: day
    }
  end
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `cd backend && mix test test/easy/nutrition_plan_days_test.exs`
Expected: FAIL (tables/modules don't exist yet before migration; after migration+schemas, the create_plan test fails because seeding isn't implemented).

- [ ] **Step 7: Implement `create_plan` seeding and `copy_plan` extension in `nutrition_plans.ex`**

Add aliases `Easy.Nutrition.PlanDay`, `Easy.Nutrition.DayMeal`, `Easy.Nutrition.WeekdayAssignment`. Replace `create_plan_for/3`:

```elixir
  defp create_plan_for(business_id, creator_id, attrs) do
    Repo.transaction(fn ->
      with {:ok, plan} <- business_id |> Plan.insert_changeset(creator_id, attrs) |> Repo.insert(),
           {:ok, _day} <- seed_everyday(plan) do
        plan
      else
        {:error, reason} -> Repo.rollback(reason)
      end
    end)
  end

  defp seed_everyday(plan) do
    with {:ok, day} <-
           PlanDay.insert_changeset(plan.business_id, plan.id, %{"name" => "Everyday", "position" => 0})
           |> Repo.insert() do
      Enum.each(WeekdayAssignment.days(), fn weekday ->
        {:ok, _} =
          WeekdayAssignment.insert_changeset(plan.business_id, plan.id, day.id, %{"day_of_week" => weekday})
          |> Repo.insert()
      end)

      {:ok, day}
    end
  end
```

Extend `copy_plan/3`: preload `days` (with `day_meals`) and `weekday_assignments` alongside meals; after `copy_meals`, copy days then assignments, remapping meal ids via `meal_map` and day ids via a `day_map`:

```elixir
  defp copy_days(days, new_plan, meal_map) do
    Enum.reduce_while(days, {:ok, %{}}, fn day, {:ok, acc} ->
      with {:ok, new_day} <-
             PlanDay.insert_changeset(new_plan.business_id, new_plan.id, %{
               "name" => day.name,
               "position" => day.position
             })
             |> Repo.insert(),
           :ok <- copy_day_meals(day.day_meals, new_day, meal_map) do
        {:cont, {:ok, Map.put(acc, day.id, new_day)}}
      else
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end

  defp copy_day_meals(day_meals, new_day, meal_map) do
    Enum.reduce_while(day_meals, :ok, fn dm, :ok ->
      case Map.get(meal_map, dm.nutrition_meal_id) do
        nil ->
          {:halt, {:error, :meal_not_found_in_plan}}

        new_meal ->
          attrs = %{"meal_slot" => to_string(dm.meal_slot), "position" => dm.position, "nutrition_meal_id" => new_meal.id}

          case DayMeal.insert_changeset(new_day.business_id, new_day.id, attrs) |> Repo.insert() do
            {:ok, _} -> {:cont, :ok}
            {:error, reason} -> {:halt, {:error, reason}}
          end
      end
    end)
  end

  defp copy_assignments(assignments, new_plan, day_map) do
    Enum.reduce_while(assignments, :ok, fn wa, :ok ->
      case Map.get(day_map, wa.nutrition_plan_day_id) do
        nil ->
          {:halt, {:error, :day_not_found_in_plan}}

        new_day ->
          case WeekdayAssignment.insert_changeset(new_plan.business_id, new_plan.id, new_day.id, %{
                 "day_of_week" => to_string(wa.day_of_week)
               })
               |> Repo.insert() do
            {:ok, _} -> {:cont, :ok}
            {:error, reason} -> {:halt, {:error, reason}}
          end
      end
    end)
  end
```

Wire into `copy_plan`'s `with` chain after `copy_schedule_entries` (which stays until Task 5):

```elixir
           {:ok, day_map} <- copy_days(plan.days, new_plan, meal_map),
           :ok <- copy_assignments(plan.weekday_assignments, new_plan, day_map) do
```

and add to the preload at the top of `copy_plan`:

```elixir
      plan =
        Repo.preload(plan,
          meals: meal_query,
          plan_items: plan_item_query,
          days: PlanDay.include_day_meals(PlanDay.by_position(), plan.business_id),
          weekday_assignments: WeekdayAssignment.for_business(WeekdayAssignment, plan.business_id)
        )
```

Add a copy test to `nutrition_plan_days_test.exs`:

```elixir
  describe "duplicate_plan/2 copies day structure" do
    test "days, options, assignments are deep-copied with remapped meal ids" do
      plan = insert(:plan)
      ctx = ctx_for(plan)
      {:ok, created} = NutritionPlans.create_plan(ctx, %{"name" => "Base"})
      meal = insert(:meal, plan: created, creator: plan.creator, business: plan.business)
      [day] = PlanDay |> PlanDay.for_plan(created.id) |> Repo.all()

      {:ok, _} =
        DayMeal.insert_changeset(created.business_id, day.id, %{
          "meal_slot" => "breakfast",
          "position" => 0,
          "nutrition_meal_id" => meal.id
        })
        |> Repo.insert()

      {:ok, copy} = NutritionPlans.duplicate_plan(ctx, created.id)

      [copied_day] = PlanDay |> PlanDay.for_plan(copy.id) |> Repo.all()
      assert copied_day.name == "Everyday"
      [copied_dm] = DayMeal |> DayMeal.for_plan_day(copied_day.id) |> Repo.all()
      refute copied_dm.nutrition_meal_id == meal.id
      assert length(WeekdayAssignment |> WeekdayAssignment.for_plan(copy.id) |> Repo.all()) == 7
    end
  end
```

- [ ] **Step 8: Run migration + tests**

Run: `cd backend && mix ecto.migrate && mix test test/easy/nutrition_plan_days_test.exs test/easy/nutrition`
Expected: PASS. Also run the full plan-related suites to catch regressions from the `create_plan` transaction change:
`mix test test/easy_web/controllers/coaches/nutrition_plan_controller_test.exs test/easy_web/controllers/clients/nutrition_plan_controller_test.exs`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add -A backend && git commit -m "feat(nutrition): plan days, day meals, weekday assignments — schema + backfill"
```

---

### Task 2: Context — day CRUD, weekday assignment, slot options, today via new model

**Files:**
- Modify: `backend/lib/easy/nutrition_plans.ex`
- Test: `backend/test/easy/nutrition_plan_days_test.exs` (extend)

**Interfaces:**
- Consumes: Task 1 schemas.
- Produces (all `{:ok, _} | {:error, atom | changeset}`, Ctx-first):
  - `create_plan_day(ctx, plan_id, attrs)` → `{:ok, PlanDay.t()}` (position = max+1; name from attrs, default `"Day N"`)
  - `update_plan_day(ctx, day_id, attrs)` → rename
  - `delete_plan_day(ctx, day_id)` → `{:error, :last_day}` if plan has 1 day; else reassigns its weekdays to the plan's position-0 day (or the lowest-position remaining day) and deletes, in one transaction
  - `assign_weekday(ctx, plan_id, attrs)` (attrs: `day_of_week`, `nutrition_plan_day_id`) → upserts the row
  - `add_slot_option(ctx, day_id, attrs)` (attrs: `meal_slot`, `nutrition_meal_id`) → appends at next position; `{:error, :max_options}` at 3; validates meal belongs to the same plan
  - `remove_slot_option(ctx, day_meal_id)` → deletes + compacts positions (0..n-1)
  - `make_default_option(ctx, day_meal_id)` → moves row to position 0, shifts others up
  - `get_client_active_plan_day/2` NEW return: `{:ok, %{plan, date, day, slots: [%{meal_slot, options: [DayMeal.t() with meal+items preloaded]}], chosen: %{meal_slot_string => meal_id}}}` — options ordered by position; `chosen` read from that date's MealLogs (`nutrition_meal_id` non-nil).

- [ ] **Step 1: Write failing context tests** (append to `nutrition_plan_days_test.exs`)

```elixir
  describe "day CRUD + assignment" do
    setup do
      plan = insert(:plan)
      ctx = ctx_for(plan)
      {:ok, plan} = NutritionPlans.create_plan(ctx, %{"name" => "P"})
      [day] = PlanDay |> PlanDay.for_plan(plan.id) |> Repo.all()
      %{ctx: ctx, plan: plan, day: day}
    end

    test "create_plan_day appends at next position", %{ctx: ctx, plan: plan} do
      {:ok, d2} = NutritionPlans.create_plan_day(ctx, plan.id, %{"name" => "Training day"})
      assert d2.position == 1
    end

    test "delete_plan_day on last day returns :last_day", %{ctx: ctx, day: day} do
      assert {:error, :last_day} = NutritionPlans.delete_plan_day(ctx, day.id)
    end

    test "delete_plan_day reassigns weekdays to remaining day", %{ctx: ctx, plan: plan, day: day} do
      {:ok, d2} = NutritionPlans.create_plan_day(ctx, plan.id, %{"name" => "Training day"})
      {:ok, _} = NutritionPlans.assign_weekday(ctx, plan.id, %{"day_of_week" => "monday", "nutrition_plan_day_id" => d2.id})

      {:ok, _} = NutritionPlans.delete_plan_day(ctx, d2.id)

      assignments = WeekdayAssignment |> WeekdayAssignment.for_plan(plan.id) |> Repo.all()
      assert length(assignments) == 7
      assert Enum.all?(assignments, &(&1.nutrition_plan_day_id == day.id))
    end

    test "assign_weekday moves one weekday", %{ctx: ctx, plan: plan} do
      {:ok, d2} = NutritionPlans.create_plan_day(ctx, plan.id, %{"name" => "T"})
      {:ok, wa} = NutritionPlans.assign_weekday(ctx, plan.id, %{"day_of_week" => "friday", "nutrition_plan_day_id" => d2.id})
      assert wa.nutrition_plan_day_id == d2.id
      assert length(WeekdayAssignment |> WeekdayAssignment.for_plan(plan.id) |> Repo.all()) == 7
    end

    test "cross-tenant day is not found", %{ctx: ctx} do
      foreign = insert(:plan_day)
      assert {:error, :not_found} = NutritionPlans.update_plan_day(ctx, foreign.id, %{"name" => "X"})
    end
  end

  describe "slot options" do
    setup do
      plan = insert(:plan)
      ctx = ctx_for(plan)
      {:ok, plan} = NutritionPlans.create_plan(ctx, %{"name" => "P"})
      [day] = PlanDay |> PlanDay.for_plan(plan.id) |> Repo.all()

      meals =
        for _ <- 1..4 do
          insert(:meal, plan: plan, creator: insert(:coach, business: plan.business), business: plan.business)
        end

      %{ctx: ctx, plan: plan, day: day, meals: meals}
    end

    test "add_slot_option appends and caps at 3", %{ctx: ctx, day: day, meals: [m1, m2, m3, m4]} do
      {:ok, o1} = NutritionPlans.add_slot_option(ctx, day.id, %{"meal_slot" => "breakfast", "nutrition_meal_id" => m1.id})
      {:ok, o2} = NutritionPlans.add_slot_option(ctx, day.id, %{"meal_slot" => "breakfast", "nutrition_meal_id" => m2.id})
      {:ok, _o3} = NutritionPlans.add_slot_option(ctx, day.id, %{"meal_slot" => "breakfast", "nutrition_meal_id" => m3.id})
      assert o1.position == 0
      assert o2.position == 1
      assert {:error, :max_options} =
               NutritionPlans.add_slot_option(ctx, day.id, %{"meal_slot" => "breakfast", "nutrition_meal_id" => m4.id})
    end

    test "meal from another plan is rejected", %{ctx: ctx, day: day} do
      other_plan_meal = insert(:meal)
      assert {:error, :not_found} =
               NutritionPlans.add_slot_option(ctx, day.id, %{"meal_slot" => "lunch", "nutrition_meal_id" => other_plan_meal.id})
    end

    test "remove_slot_option compacts positions", %{ctx: ctx, day: day, meals: [m1, m2, _m3, _m4]} do
      {:ok, o1} = NutritionPlans.add_slot_option(ctx, day.id, %{"meal_slot" => "dinner", "nutrition_meal_id" => m1.id})
      {:ok, o2} = NutritionPlans.add_slot_option(ctx, day.id, %{"meal_slot" => "dinner", "nutrition_meal_id" => m2.id})
      {:ok, _} = NutritionPlans.remove_slot_option(ctx, o1.id)
      assert Repo.get(DayMeal, o2.id).position == 0
    end

    test "make_default_option moves to position 0", %{ctx: ctx, day: day, meals: [m1, m2, _m3, _m4]} do
      {:ok, o1} = NutritionPlans.add_slot_option(ctx, day.id, %{"meal_slot" => "lunch", "nutrition_meal_id" => m1.id})
      {:ok, o2} = NutritionPlans.add_slot_option(ctx, day.id, %{"meal_slot" => "lunch", "nutrition_meal_id" => m2.id})
      {:ok, _} = NutritionPlans.make_default_option(ctx, o2.id)
      assert Repo.get(DayMeal, o2.id).position == 0
      assert Repo.get(DayMeal, o1.id).position == 1
    end
  end
```

Plus a today test (client plan via `assign_plan_to_client`, then `get_client_active_plan_day` resolves the assigned weekday's day and returns options in position order; write it against a fixed date, e.g. `~D[2026-07-06]` is a Monday).

- [ ] **Step 2: Run to verify failure**

Run: `mix test test/easy/nutrition_plan_days_test.exs`
Expected: FAIL with undefined-function errors.

- [ ] **Step 3: Implement in `nutrition_plans.ex`**

```elixir
  @max_options_per_slot 3

  @spec create_plan_day(Ctx.t(), String.t(), map()) ::
          {:ok, PlanDay.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_plan_day(%Ctx{} = ctx, plan_id, attrs) do
    with {:ok, plan} <- get_plan(ctx.business_id, plan_id) do
      position = (max_day_position(plan.id) || -1) + 1
      name = attrs["name"] || attrs[:name] || "Day #{position + 1}"

      PlanDay.insert_changeset(ctx.business_id, plan.id, %{"name" => name, "position" => position})
      |> Repo.insert()
    end
  end

  @spec update_plan_day(Ctx.t(), String.t(), map()) ::
          {:ok, PlanDay.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_plan_day(%Ctx{} = ctx, day_id, attrs) do
    with {:ok, day} <- get_plan_day(ctx.business_id, day_id) do
      day |> PlanDay.update_changeset(attrs) |> Repo.update()
    end
  end

  @spec delete_plan_day(Ctx.t(), String.t()) ::
          {:ok, PlanDay.t()} | {:error, :not_found | :last_day | Ecto.Changeset.t()}
  def delete_plan_day(%Ctx{} = ctx, day_id) do
    with {:ok, day} <- get_plan_day(ctx.business_id, day_id) do
      fallback =
        PlanDay
        |> PlanDay.for_business(ctx.business_id)
        |> PlanDay.for_plan(day.nutrition_plan_id)
        |> PlanDay.by_position()
        |> where([d], d.id != ^day.id)
        |> limit(1)
        |> Repo.one()

      case fallback do
        nil ->
          {:error, :last_day}

        fallback ->
          Repo.transaction(fn ->
            WeekdayAssignment
            |> WeekdayAssignment.for_business(ctx.business_id)
            |> WeekdayAssignment.for_plan(day.nutrition_plan_id)
            |> where([wa], wa.nutrition_plan_day_id == ^day.id)
            |> Repo.update_all(set: [nutrition_plan_day_id: fallback.id])

            case Repo.delete(day) do
              {:ok, deleted} -> deleted
              {:error, reason} -> Repo.rollback(reason)
            end
          end)
      end
    end
  end

  @spec assign_weekday(Ctx.t(), String.t(), map()) ::
          {:ok, WeekdayAssignment.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def assign_weekday(%Ctx{} = ctx, plan_id, attrs) do
    day_id = attrs["nutrition_plan_day_id"] || attrs[:nutrition_plan_day_id]
    weekday = to_string(attrs["day_of_week"] || attrs[:day_of_week])

    with {:ok, plan} <- get_plan(ctx.business_id, plan_id),
         {:ok, day} <- get_plan_day(ctx.business_id, day_id),
         :ok <- ensure_day_in_plan(day, plan.id),
         :ok <- validate_schedule_day(weekday) do
      existing =
        WeekdayAssignment
        |> WeekdayAssignment.for_business(ctx.business_id)
        |> WeekdayAssignment.for_plan(plan.id)
        |> WeekdayAssignment.for_day(weekday)
        |> Repo.one()

      case existing do
        nil ->
          WeekdayAssignment.insert_changeset(ctx.business_id, plan.id, day.id, %{"day_of_week" => weekday})
          |> Repo.insert()

        wa ->
          wa |> change(nutrition_plan_day_id: day.id) |> Repo.update()
      end
    end
  end

  @spec add_slot_option(Ctx.t(), String.t(), map()) ::
          {:ok, DayMeal.t()} | {:error, :not_found | :max_options | Ecto.Changeset.t()}
  def add_slot_option(%Ctx{} = ctx, day_id, attrs) do
    meal_id = attrs["nutrition_meal_id"] || attrs[:nutrition_meal_id]
    slot = to_string(attrs["meal_slot"] || attrs[:meal_slot])

    with {:ok, day} <- get_plan_day(ctx.business_id, day_id),
         {:ok, :valid} <- ensure_meal_for_plan(day.nutrition_plan_id, ctx.business_id, meal_id) do
      existing =
        DayMeal
        |> DayMeal.for_business(ctx.business_id)
        |> DayMeal.for_plan_day(day.id)
        |> DayMeal.for_meal_slot(slot)
        |> Repo.aggregate(:count, :id)

      if existing >= @max_options_per_slot do
        {:error, :max_options}
      else
        DayMeal.insert_changeset(ctx.business_id, day.id, %{
          "meal_slot" => slot,
          "position" => existing,
          "nutrition_meal_id" => meal_id
        })
        |> Repo.insert()
      end
    end
  end

  @spec remove_slot_option(Ctx.t(), String.t()) ::
          {:ok, DayMeal.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def remove_slot_option(%Ctx{} = ctx, day_meal_id) do
    with {:ok, dm} <- get_day_meal(ctx.business_id, day_meal_id) do
      Repo.transaction(fn ->
        case Repo.delete(dm) do
          {:ok, deleted} ->
            compact_slot_positions(ctx.business_id, dm.nutrition_plan_day_id, dm.meal_slot)
            deleted

          {:error, reason} ->
            Repo.rollback(reason)
        end
      end)
    end
  end

  @spec make_default_option(Ctx.t(), String.t()) ::
          {:ok, DayMeal.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def make_default_option(%Ctx{} = ctx, day_meal_id) do
    with {:ok, dm} <- get_day_meal(ctx.business_id, day_meal_id) do
      Repo.transaction(fn ->
        siblings =
          DayMeal
          |> DayMeal.for_business(ctx.business_id)
          |> DayMeal.for_plan_day(dm.nutrition_plan_day_id)
          |> DayMeal.for_meal_slot(dm.meal_slot)
          |> DayMeal.by_slot_position()
          |> Repo.all()

        reordered = [dm.id | siblings |> Enum.map(& &1.id) |> Enum.reject(&(&1 == dm.id))]

        # two-phase renumber: bump out of the unique index's way, then set final
        reordered
        |> Enum.with_index()
        |> Enum.each(fn {id, idx} ->
          from(x in DayMeal, where: x.id == ^id) |> Repo.update_all(set: [position: idx + 100])
        end)

        reordered
        |> Enum.with_index()
        |> Enum.each(fn {id, idx} ->
          from(x in DayMeal, where: x.id == ^id) |> Repo.update_all(set: [position: idx])
        end)

        Repo.get(DayMeal, dm.id)
      end)
    end
  end

  defp compact_slot_positions(business_id, day_id, slot) do
    DayMeal
    |> DayMeal.for_business(business_id)
    |> DayMeal.for_plan_day(day_id)
    |> DayMeal.for_meal_slot(slot)
    |> DayMeal.by_slot_position()
    |> Repo.all()
    |> Enum.with_index()
    |> Enum.each(fn {row, idx} ->
      if row.position != idx do
        from(x in DayMeal, where: x.id == ^row.id) |> Repo.update_all(set: [position: idx])
      end
    end)
  end

  defp max_day_position(plan_id) do
    PlanDay |> PlanDay.for_plan(plan_id) |> Repo.aggregate(:max, :position)
  end

  defp get_plan_day(_business_id, nil), do: {:error, :not_found}

  defp get_plan_day(business_id, day_id) do
    PlanDay |> PlanDay.for_business(business_id) |> Repo.get(day_id) |> ok_or_not_found()
  end

  defp get_day_meal(business_id, day_meal_id) do
    DayMeal |> DayMeal.for_business(business_id) |> Repo.get(day_meal_id) |> ok_or_not_found()
  end

  defp ensure_day_in_plan(%PlanDay{nutrition_plan_id: plan_id}, plan_id), do: :ok
  defp ensure_day_in_plan(_, _), do: {:error, :not_found}
```

Replace `get_active_plan_day/3`'s ScheduleEntry lookup with the new model (keep the function name and callers):

```elixir
  defp get_active_plan_day(business_id, client_id, date) do
    case active_plan(business_id, client_id, date) do
      nil ->
        {:error, :not_found}

      plan ->
        day_name = Easy.Utils.weekday_name(date)

        assignment =
          WeekdayAssignment
          |> WeekdayAssignment.for_business(business_id)
          |> WeekdayAssignment.for_plan(plan.id)
          |> WeekdayAssignment.for_day(day_name)
          |> Repo.one()

        slots =
          case assignment do
            nil ->
              []

            wa ->
              DayMeal
              |> DayMeal.for_business(business_id)
              |> DayMeal.for_plan_day(wa.nutrition_plan_day_id)
              |> DayMeal.by_slot_position()
              |> preload(meal: ^Meal.include_items(Meal, business_id))
              |> Repo.all()
              |> Enum.group_by(& &1.meal_slot)
              |> Enum.map(fn {slot, options} ->
                %{meal_slot: slot, options: Enum.sort_by(options, & &1.position)}
              end)
              |> Enum.sort_by(fn %{options: [first | _]} -> first.meal_slot end)
          end

        chosen =
          Easy.Nutrition.MealLog
          |> Easy.Nutrition.MealLog.for_client(business_id, client_id)
          |> Easy.Nutrition.MealLog.for_date(date)
          |> where([ml], not is_nil(ml.nutrition_meal_id))
          |> Repo.all()
          |> Map.new(fn ml -> {to_string(ml.meal_slot), ml.nutrition_meal_id} end)

        {:ok, %{plan: plan, slots: slots, chosen: chosen, date: date, day: day_name}}
    end
  end
```

Note: `chosen` needs `MealLog.nutrition_meal_id`, added in Task 3. For THIS task, ship `chosen: %{}` with the query commented out is NOT allowed (no placeholders) — instead order Task 3's migration first? No: simplest is to keep Task 2's `chosen` computed from a field that doesn't exist yet. **Resolution: implement `get_active_plan_day` here WITHOUT the `chosen` map (return `chosen: %{}` literal), and Task 3 Step 6 replaces the literal with the MealLog query above.** The `today` controller keeps rendering `plan_items:`-based JSON until Task 4, so update its call site now: `EasyWeb.Clients.NutritionPlanController.today/2` destructures `%{plan: plan, plan_items: plan_items, day: day}` — change the context to ALSO return `plan_items: []`? No. **Do this instead:** update the client controller + JSON `today` in THIS task to the new shape (it's a small view change and keeps every commit green):

In `backend/lib/easy_web/controllers/clients/nutrition_plan_controller.ex`:

```elixir
  def today(conn, params) do
    date = Easy.Utils.safe_date(params["date"]) || Date.utc_today()

    with {:ok, %{plan: plan, slots: slots, chosen: chosen, day: day}} <-
           Plans.get_client_active_plan_day(conn.assigns.ctx, date) do
      render(conn, :today, plan: plan, slots: slots, chosen: chosen, date: date, day: day)
    end
  end
```

In `backend/lib/easy_web/controllers/clients/nutrition_plan_json.ex` replace `today/1` (+ its `today_meal_items` helper pattern-matching ScheduleEntry) with:

```elixir
  @spec today(map()) :: map()
  def today(%{plan: plan, slots: slots, chosen: chosen, date: date, day: day}) do
    %{
      data: %{
        date: date,
        day: day,
        plan_id: plan.id,
        slots:
          Enum.map(slots, fn %{meal_slot: slot, options: options} ->
            %{
              meal_slot: slot,
              chosen_meal_id: Map.get(chosen, to_string(slot)),
              options: Enum.map(options, &option_data/1)
            }
          end)
      }
    }
  end

  defp option_data(day_meal) do
    %{
      meal_id: day_meal.nutrition_meal_id,
      meal_name: if(Ecto.assoc_loaded?(day_meal.meal), do: day_meal.meal.name, else: nil),
      position: day_meal.position,
      items: today_meal_items(day_meal.meal)
    }
  end

  defp today_meal_items(%Meal{meal_items: items}) when is_list(items) do
    Enum.map(items, &today_item_data/1)
  end

  defp today_meal_items(_), do: []
```

(`today_item_data/1` stays as-is.) Also update `@spec today` docs in the client controller operation description if needed — the OpenAPI response is the opaque `NutritionMapResponse`, so no schema change is required yet (Task 4 tightens docs).

Update the existing `today` test in `test/easy_web/controllers/clients/nutrition_plan_controller_test.exs` to assert the new `slots` shape (it will fail loudly; rewrite assertions to `data["slots"]` with `options` arrays).

`update_plan_day`'s attrs come string-keyed from controllers; `cast` is key-agnostic — fine.

- [ ] **Step 4: Run tests**

Run: `mix test test/easy/nutrition_plan_days_test.exs test/easy_web/controllers/clients/nutrition_plan_controller_test.exs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A backend && git commit -m "feat(nutrition): day CRUD, weekday assignment, slot options; today reads day model"
```

---

### Task 3: MealLogs — chosen-option pinning, snapshots via chosen meal, switch-option, log-day via defaults

**Files:**
- Create: `backend/priv/repo/migrations/20260706130000_add_meal_id_to_meal_logs.exs`
- Modify: `backend/lib/easy/nutrition/meal_log.ex`
- Modify: `backend/lib/easy/meal_logs.ex`
- Modify: `backend/lib/easy/nutrition_plans.ex` (fill in `chosen` map from Task 2 note)
- Test: `backend/test/easy/nutrition/meal_log_test.exs` (extend) and existing `test/easy_web/controllers/clients/meal_log_controller_test.exs` / food-log tests stay green

**Interfaces:**
- Consumes: Task 2 `get_active_plan_day` day-model resolution.
- Produces:
  - `nutrition_meal_logs.nutrition_meal_id` column (nullable, nilify on meal delete)
  - `MealLogs.log_client_meal(ctx, attrs)` — unchanged signature (`date`, `meal_slot`, `meal_id`); now pins `nutrition_meal_id = meal_id` on the MealLog and snapshots THAT meal
  - `MealLogs.create_client_food_log_entry(ctx, attrs)` — accepts optional `meal_id`; pins on first write; snapshot from pinned/chosen meal, falling back to the slot's default option
  - `MealLogs.log_client_day(ctx, attrs)` — logs each slot using its pinned meal if a MealLog pin exists for that date+slot, else the slot's default option (position 0), via the day model
  - `MealLogs.switch_client_meal_option(ctx, attrs)` (attrs: `date`, `meal_slot`, `meal_id`) → `{:ok, MealLog.t()}`; deletes that log's `planned` + `replacement` entries (unplanned survive), re-pins, re-snapshots, recalculates

- [ ] **Step 1: Migration + schema field**

```elixir
defmodule Easy.Repo.Migrations.AddMealIdToMealLogs do
  use Ecto.Migration

  def change do
    alter table(:nutrition_meal_logs) do
      add :nutrition_meal_id, references(:nutrition_meals, type: :binary_id, on_delete: :nilify_all)
    end
  end
end
```

In `meal_log.ex` add to the schema block:

```elixir
    belongs_to(:meal, Easy.Nutrition.Meal, foreign_key: :nutrition_meal_id)
```

(Do NOT add it to `insert_changeset`'s cast — it's pinned via `put_change` from context code.)

- [ ] **Step 2: Write failing tests** (extend `test/easy/nutrition/meal_log_test.exs`; use a client plan created via `NutritionPlans.create_plan` + `assign_plan_to_client`, with two meals as breakfast options). Cover:

```elixir
  # sketch of the required cases — write them fully:
  # 1. log_client_meal pins nutrition_meal_id and snapshot.meal_name == chosen meal's name
  # 2. create_client_food_log_entry with meal_id: pins; without meal_id and no pin: snapshot uses default option (position 0)
  # 3. switch_client_meal_option: after logging option A's items + one unplanned extra,
  #    switching to option B deletes planned/replacement entries, keeps the extra,
  #    updates pin + planned_snapshot, and logged_calories reflects only the extra
  # 4. switch to a meal not in the client's plan -> {:error, :not_found}
  # 5. log_client_day with a pinned non-default option logs the pinned meal's items for that slot
```

Each case asserts through public context functions only (no Repo writes to logs). Use a fixed Monday date (`~D[2026-07-06]`).

- [ ] **Step 3: Run to verify failure**

Run: `mix test test/easy/nutrition/meal_log_test.exs`
Expected: FAIL.

- [ ] **Step 4: Implement in `meal_logs.ex`**

Replace ScheduleEntry-based snapshot resolution with chosen/default-option resolution. Alias `Easy.Nutrition.DayMeal` and `Easy.Nutrition.WeekdayAssignment`; remove nothing yet (ScheduleEntry alias dies in Task 5). Key edits:

```elixir
  # chosen meal for a slot: explicit meal_id > existing pin > default option
  defp resolve_slot_meal_id(business_id, client_id, date, meal_slot, explicit_meal_id) do
    explicit_meal_id ||
      pinned_meal_id(business_id, client_id, date, meal_slot) ||
      default_option_meal_id(business_id, client_id, date, meal_slot)
  end

  defp pinned_meal_id(business_id, client_id, date, meal_slot) do
    case get_existing_meal_log(business_id, client_id, date, meal_slot) do
      %MealLog{nutrition_meal_id: id} -> id
      nil -> nil
    end
  end

  defp default_option_meal_id(business_id, client_id, date, meal_slot) do
    with %Plan{} = plan <- active_plan(business_id, client_id, date),
         %{} = wa <- weekday_assignment(business_id, plan.id, date) do
      DayMeal
      |> DayMeal.for_business(business_id)
      |> DayMeal.for_plan_day(wa.nutrition_plan_day_id)
      |> DayMeal.for_meal_slot(meal_slot)
      |> DayMeal.by_slot_position()
      |> limit(1)
      |> Repo.one()
      |> case do
        nil -> nil
        dm -> dm.nutrition_meal_id
      end
    else
      _ -> nil
    end
  end

  defp weekday_assignment(business_id, plan_id, date) do
    day = Easy.Utils.weekday_name(date)

    WeekdayAssignment
    |> WeekdayAssignment.for_business(business_id)
    |> WeekdayAssignment.for_plan(plan_id)
    |> WeekdayAssignment.for_day(day)
    |> Repo.one()
  end

  defp active_plan(business_id, client_id, date) do
    Plan
    |> Plan.for_business(business_id)
    |> Plan.active_for_client(client_id, date)
    |> Plan.newest()
    |> limit(1)
    |> Repo.one()
  end
```

Rework `build_planned_snapshot/4` → `build_planned_snapshot(business_id, meal_id)`: snapshot directly from the meal (reuse existing `do_snapshot`'s meal-loading body, taking a meal_id instead of a schedule entry). `snapshot_meal/3` and the ScheduleEntry lookup inside it are deleted; `do_snapshot/1` becomes:

```elixir
  defp build_planned_snapshot(_business_id, nil), do: nil

  defp build_planned_snapshot(business_id, meal_id) do
    case Meal |> Meal.for_business(business_id) |> Repo.get(meal_id) do
      nil ->
        nil

      meal ->
        meal = Repo.preload(meal, meal_items: MealItem.include_food_and_recipe(MealItem, business_id))
        items = meal.meal_items |> Enum.sort_by(& &1.position) |> Enum.map(&snapshot_item/1)

        %{
          meal_name: meal.name,
          items: items,
          total_calories: sum_field(items, :calories),
          total_protein_g: sum_field(items, :protein_g),
          total_carbs_g: sum_field(items, :carbs_g),
          total_fat_g: sum_field(items, :fat_g),
          total_fiber_g: sum_field(items, :fiber_g)
        }
    end
  end
```

`find_or_create_meal_log/5` gains a `meal_id` param and pins it (`put_change(:nutrition_meal_id, meal_id)`); when an existing log has a nil pin and `meal_id` is non-nil, update the pin:

```elixir
  defp find_or_create_meal_log(business_id, client_id, date, meal_slot, snapshot, meal_id) do
    case get_existing_meal_log(business_id, client_id, date, meal_slot) do
      %MealLog{nutrition_meal_id: nil} = existing when not is_nil(meal_id) ->
        existing
        |> change(nutrition_meal_id: meal_id, planned_snapshot: snapshot)
        |> put_change(:planned_calories, snapshot && (snapshot[:total_calories] || 0.0) * 1.0)
        |> Repo.update()

      %MealLog{} = existing ->
        {:ok, existing}

      nil ->
        # ... existing insert path, plus:
        # |> put_change(:nutrition_meal_id, meal_id)
    end
  end
```

Update call sites: `log_entry/3` resolves `meal_id = resolve_slot_meal_id(business_id, client_id, date, attrs[:meal_id], …)` then `snapshot = build_planned_snapshot(business_id, meal_id)`; `do_log_meal/5` uses its explicit `meal_id` for both pin and snapshot. `log_day/4` iterates the assigned day's slots:

```elixir
  defp log_day(business_id, client_id, date, plan_id) do
    plan =
      Plan
      |> Plan.for_business(business_id)
      |> Plan.for_client(business_id, client_id)
      |> Repo.get(plan_id)

    case plan do
      nil ->
        {:error, :not_found}

      _ ->
        wa = weekday_assignment(business_id, plan.id, date)

        slot_meals =
          case wa do
            nil ->
              []

            wa ->
              DayMeal
              |> DayMeal.for_business(business_id)
              |> DayMeal.for_plan_day(wa.nutrition_plan_day_id)
              |> DayMeal.by_slot_position()
              |> Repo.all()
              |> Enum.group_by(& &1.meal_slot)
              |> Enum.map(fn {slot, [default | _]} ->
                {slot, pinned_meal_id(business_id, client_id, date, slot) || default.nutrition_meal_id}
              end)
          end

        Repo.transaction(fn ->
          Enum.flat_map(slot_meals, fn {slot, meal_id} ->
            do_log_meal(business_id, client_id, date, slot, meal_id)
          end)
        end)
    end
  end
```

New public function:

```elixir
  @spec switch_client_meal_option(Ctx.t(), map()) ::
          {:ok, MealLog.t()} | {:error, any()}
  def switch_client_meal_option(%Ctx{} = ctx, attrs) do
    meal_id = attrs[:meal_id]
    meal_slot = attrs[:meal_slot]

    with {:ok, client} <- get_client(ctx),
         {:ok, date} <- parse_required_date(to_string_date(attrs[:date])),
         meal when not is_nil(meal) <- load_meal_with_items(ctx.business_id, client.id, meal_id) do
      snapshot = build_planned_snapshot(ctx.business_id, meal_id)

      Repo.transaction(fn ->
        meal_log =
          case find_or_create_meal_log(ctx.business_id, client.id, date, meal_slot, snapshot, meal_id) do
            {:ok, ml} -> ml
            {:error, reason} -> Repo.rollback(reason)
          end

        FoodLogEntry
        |> FoodLogEntry.for_meal_log(meal_log.id)
        |> where([e], e.source in [:planned, :replacement])
        |> Repo.delete_all()

        {:ok, meal_log} =
          meal_log
          |> change(nutrition_meal_id: meal_id, planned_snapshot: snapshot)
          |> put_change(:planned_calories, snapshot && (snapshot[:total_calories] || 0.0) * 1.0)
          |> Repo.update()

        case recalculate_logged_calories(meal_log) do
          {:ok, ml} -> Repo.preload(%MealLog{ml | id: meal_log.id} |> Map.merge(meal_log) |> Map.put(:logged_calories, ml.logged_calories), food_log_entries: FoodLogEntry.by_position())
          {:error, reason} -> Repo.rollback(reason)
        end
      end)
    else
      nil -> {:error, :not_found}
      {:error, reason} -> {:error, reason}
    end
  end
```

(Simplify that last preload as you see fit — the requirement is: return the updated MealLog with `food_log_entries` preloaded and fresh `logged_calories`. Reload with `Repo.get` + `MealLog.include_entries()` is fine and clearer.)

Check `FoodLogEntry` has a `by_position/0`/`for_meal_log` builder (it does — used in `do_log_meal` / `include_entries`). `source` values are the existing `:planned | :replacement | :unplanned` enum.

- [ ] **Step 5: Fill in Task 2's `chosen` map** in `nutrition_plans.ex` `get_active_plan_day` (replace the `chosen: %{}` literal with the MealLog query shown in Task 2 Step 3 — the column now exists).

- [ ] **Step 6: Run tests**

Run: `mix test test/easy/nutrition/meal_log_test.exs test/easy/nutrition_plan_days_test.exs test/easy_web/controllers/clients/`
Expected: PASS (rewrite any old assertions that relied on schedule-entry snapshots).

- [ ] **Step 7: Commit**

```bash
git add -A backend && git commit -m "feat(nutrition): meal logs pin chosen option; switch-option; log-day via day model"
```

---

### Task 4: HTTP surface — coach day/option endpoints, client switch-option, plan JSON, OpenAPI

**Files:**
- Create: `backend/lib/easy_web/controllers/coaches/plan_day_controller.ex`
- Create: `backend/lib/easy_web/controllers/coaches/plan_day_json.ex`
- Modify: `backend/lib/easy_web/router.ex`
- Modify: `backend/lib/easy_web/controllers/coaches/nutrition_plan_json.ex` (+ client `nutrition_plan_json.ex`) — plan payload gains `days` + `weekday_assignments`
- Modify: `backend/lib/easy_web/controllers/clients/food_log_entry_controller.ex` (+ its JSON if needed) — `switch-option` action
- Modify: `backend/lib/easy_web/open_api/schemas/nutrition.ex` — new schemas
- Test: `backend/test/easy_web/controllers/coaches/plan_day_controller_test.exs`; extend client food-log controller test

**Interfaces:**
- Consumes: Task 2/3 context functions.
- Produces routes (coach scope, after the existing nutrition-meals block):

```elixir
    post "/nutrition-plans/:plan_id/days", PlanDayController, :create
    patch "/nutrition-days/:id", PlanDayController, :update
    delete "/nutrition-days/:id", PlanDayController, :delete
    put "/nutrition-plans/:plan_id/weekday-assignments", PlanDayController, :assign_weekday
    post "/nutrition-days/:day_id/options", PlanDayController, :add_option
    delete "/nutrition-day-meals/:id", PlanDayController, :remove_option
    post "/nutrition-day-meals/:id/make-default", PlanDayController, :make_default
```

Client scope: `post "/nutrition-food-log-entries/switch-option", FoodLogEntryController, :switch_option`.

- Produces JSON: plan `show` responses (coach + client) gain
  `days: [%{id, name, position, day_meals: [%{id, meal_slot, position, nutrition_meal_id}]}]` and
  `weekday_assignments: %{"monday" => day_id, ...}` (keep `schedule_entries` in the payload until Task 5 removes it).

- [ ] **Step 1: Write failing controller tests**

`backend/test/easy_web/controllers/coaches/plan_day_controller_test.exs` — mirror the setup style of `test/easy_web/controllers/coaches/schedule_controller_test.exs` (read it for the auth/conn helpers). Cover: create day (201, position 1, default name "Day 2" when body has no name), rename, delete last day → 422/409 per FallbackController's mapping of `:last_day` (see Step 3), delete non-last reassigns, assign weekday (200), add option ×3 then 4th → error `:max_options` mapping, add option with foreign meal → 404, remove option compacts, make-default reorders, cross-tenant 404s for every mutating route, and plan `show` includes `days` + `weekday_assignments`.

Extend `test/easy_web/controllers/clients/` food-log tests: `POST /v1/client/nutrition-food-log-entries/switch-option` happy path (200, returns meal log with entries cleared) and unknown meal → 404.

- [ ] **Step 2: Run to verify failure**

Run: `mix test test/easy_web/controllers/coaches/plan_day_controller_test.exs`
Expected: FAIL (routes missing).

- [ ] **Step 3: FallbackController mapping**

In `backend/lib/easy_web/controllers/fallback_controller.ex`, add clauses following the existing bare-atom pattern (inspect the file for exact form; the billing feature added similar ones):

```elixir
  def call(conn, {:error, :last_day}) do
    render_error(conn, :conflict, :last_day, "A plan must keep at least one day.")
  end

  def call(conn, {:error, :max_options}) do
    render_error(conn, :conflict, :max_options, "A meal slot can hold at most 3 options.")
  end
```

(Adapt to the file's actual helper — the envelope is flat `error_code`/`error_message`/`error_detail`; both map to HTTP 409.)

- [ ] **Step 4: Implement controller + JSON + routes + OpenAPI**

`plan_day_controller.ex` — one action per context function, `CastAndValidate` on writes, ops co-located. Request schemas (add to `open_api/schemas/nutrition.ex`):

```elixir
  defmodule NutritionPlanDayCreateRequest do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "NutritionPlanDayCreateRequest",
      type: :object,
      properties: %{name: %Schema{type: :string, nullable: true}}
    })
  end

  defmodule NutritionPlanDayUpdateRequest do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "NutritionPlanDayUpdateRequest",
      type: :object,
      properties: %{name: %Schema{type: :string}},
      required: [:name]
    })
  end

  defmodule NutritionWeekdayAssignRequest do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "NutritionWeekdayAssignRequest",
      type: :object,
      properties: %{
        day_of_week: %Schema{type: :string, enum: ~w(monday tuesday wednesday thursday friday saturday sunday)},
        nutrition_plan_day_id: %Schema{type: :string}
      },
      required: [:day_of_week, :nutrition_plan_day_id]
    })
  end

  defmodule NutritionSlotOptionCreateRequest do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "NutritionSlotOptionCreateRequest",
      type: :object,
      properties: %{
        meal_slot: %Schema{type: :string, enum: ~w(breakfast morning_snack lunch afternoon_snack dinner evening_snack)},
        nutrition_meal_id: %Schema{type: :string}
      },
      required: [:meal_slot, :nutrition_meal_id]
    })
  end

  defmodule NutritionPlanDayResponse do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "NutritionPlanDayResponse",
      type: :object,
      properties: %{
        data: %Schema{
          type: :object,
          properties: %{
            id: %Schema{type: :string},
            name: %Schema{type: :string},
            position: %Schema{type: :integer},
            day_meals: %Schema{type: :array, items: %Schema{type: :object, additionalProperties: true}}
          }
        }
      }
    })
  end

  defmodule NutritionDayMealResponse do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "NutritionDayMealResponse",
      type: :object,
      properties: %{data: %Schema{type: :object, additionalProperties: true}}
    })
  end

  defmodule NutritionSwitchOptionRequest do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "NutritionSwitchOptionRequest",
      type: :object,
      properties: %{
        date: %Schema{type: :string, format: :date},
        meal_slot: %Schema{type: :string, enum: ~w(breakfast morning_snack lunch afternoon_snack dinner evening_snack)},
        meal_id: %Schema{type: :string}
      },
      required: [:date, :meal_slot, :meal_id]
    })
  end
```

Controller shape (write all seven actions; `assign_weekday`, `add_option`, `remove_option`, `make_default` follow the same pattern):

```elixir
defmodule EasyWeb.Coaches.PlanDayController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.NutritionPlans

  alias EasyWeb.OpenApi.Schemas.{
    ErrorResponse,
    NutritionDayMealResponse,
    NutritionPlanDayCreateRequest,
    NutritionPlanDayResponse,
    NutritionPlanDayUpdateRequest,
    NutritionSlotOptionCreateRequest,
    NutritionWeekdayAssignRequest
  }

  plug OpenApiSpex.Plug.CastAndValidate,
       [json_render_error_v2: true]
       when action in [:create, :update, :assign_weekday, :add_option]

  tags ["coach nutrition plan days"]

  operation :create,
    summary: "Add a day to a nutrition plan",
    operation_id: "createNutritionPlanDay",
    security: [%{"bearerAuth" => []}],
    parameters: [plan_id: [in: :path, type: :string, required: true]],
    request_body: {"Day", "application/json", NutritionPlanDayCreateRequest, required: true},
    responses: [
      created: {"Day", "application/json", NutritionPlanDayResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  def create(conn, _params) do
    %{"plan_id" => plan_id} = conn.path_params

    with {:ok, day} <- NutritionPlans.create_plan_day(conn.assigns.ctx, plan_id, conn.body_params) do
      conn |> put_status(:created) |> render(:show, day: day)
    end
  end

  # ... update, delete, assign_weekday, add_option, remove_option, make_default
  # each: co-located operation + single context call + render/FallbackController
end
```

`plan_day_json.ex`:

```elixir
defmodule EasyWeb.Coaches.PlanDayJSON do
  @spec show(map()) :: map()
  def show(%{day: day}) do
    %{data: %{id: day.id, name: day.name, position: day.position}}
  end

  @spec option(map()) :: map()
  def option(%{day_meal: dm}) do
    %{
      data: %{
        id: dm.id,
        meal_slot: dm.meal_slot,
        position: dm.position,
        nutrition_meal_id: dm.nutrition_meal_id,
        nutrition_plan_day_id: dm.nutrition_plan_day_id
      }
    }
  end

  @spec assignment(map()) :: map()
  def assignment(%{assignment: wa}) do
    %{data: %{day_of_week: wa.day_of_week, nutrition_plan_day_id: wa.nutrition_plan_day_id}}
  end
end
```

Plan JSON (`coaches/nutrition_plan_json.ex` and `clients/nutrition_plan_json.ex`): in `data/1` add

```elixir
      days: days_data(plan.days),
      weekday_assignments: assignments_data(plan.weekday_assignments)
```

```elixir
  defp days_data(days) when is_list(days), do: Enum.map(days, &day_data/1)
  defp days_data(_), do: []

  defp day_data(day) do
    %{
      id: day.id,
      name: day.name,
      position: day.position,
      day_meals:
        Enum.map(day.day_meals, fn dm ->
          %{id: dm.id, meal_slot: dm.meal_slot, position: dm.position, nutrition_meal_id: dm.nutrition_meal_id}
        end)
    }
  end

  defp assignments_data(assignments) when is_list(assignments) do
    Map.new(assignments, fn wa -> {to_string(wa.day_of_week), wa.nutrition_plan_day_id} end)
  end

  defp assignments_data(_), do: %{}
```

Also add `days`/`weekday_assignments` properties to the `NutritionPlan` OpenAPI response schema in `open_api/schemas/nutrition.ex` (loose `additionalProperties: true` objects are acceptable; the FE hand-types details it needs). **Do not mark them required** (RM: response schemas — new fields optional).

Client `switch_option` action in `clients/food_log_entry_controller.ex` (mirror `log_meal`'s shape; render via the controller's existing meal-log/entry JSON — inspect `meal_log_json.ex` and reuse its meal-log rendering):

```elixir
  def switch_option(conn, _params) do
    with {:ok, meal_log} <- Easy.MealLogs.switch_client_meal_option(conn.assigns.ctx, conn.body_params) do
      render(conn, :switched, meal_log: meal_log)
    end
  end
```

- [ ] **Step 5: Run tests + regenerate check**

Run: `mix test test/easy_web/controllers/coaches/plan_day_controller_test.exs test/easy_web/controllers/clients/ test/easy_web/controllers/coaches/nutrition_plan_controller_test.exs`
Expected: PASS. Also `mix test test/easy_web/open_api` if spec render tests exist (`grep -r "ApiSpec" test/ --include="*render*"` — run whatever validates the spec renders).

- [ ] **Step 6: Commit**

```bash
git add -A backend && git commit -m "feat(nutrition): day/option/assignment endpoints, switch-option, plan JSON days"
```

---

### Task 5: Delete the schedule-entry pathway

**Files:**
- Create: `backend/priv/repo/migrations/20260706140000_drop_nutrition_schedule_entries.exs`
- Delete: `backend/lib/easy/nutrition/schedule_entry.ex`, `backend/lib/easy_web/controllers/coaches/schedule_controller.ex`, `schedule_json.ex`, `backend/test/easy_web/controllers/coaches/schedule_controller_test.exs`
- Modify: `router.ex` (remove 3 schedule routes), `nutrition_plans.ex` (remove `get_schedule`, `set_schedule`, `set_day_schedule`, `validate_schedule_days`, `insert_schedule_entry!`, `grouped_schedule`, `copy_schedule_entries`, `plan_item_query` preload), `nutrition/plan.ex` (remove `plan_items` assoc + preload + alias), both `nutrition_plan_json.ex` (remove `schedule_entries` + helpers), `open_api/schemas/nutrition.ex` (remove `NutritionScheduleRequest`, `NutritionDayScheduleRequest`, `NutritionScheduleResponse`, `NutritionScheduleDayResponse` and any `schedule_entries` property), `meal_logs.ex` (remove ScheduleEntry alias — usage went in Task 3), `test/support/factory.ex` (remove `schedule_entry_factory` + attrs + alias), any remaining test references (`grep -rn "ScheduleEntry\|schedule_entries\|setNutritionPlanSchedule" backend/lib backend/test`).

Migration:

```elixir
defmodule Easy.Repo.Migrations.DropNutritionScheduleEntries do
  use Ecto.Migration

  def up do
    drop table(:nutrition_schedule_entries)
  end

  def down do
    raise "irreversible — schedule entries were replaced by nutrition_plan_days"
  end
end
```

- [ ] **Step 1: Delete + fix all references** (grep listed above until clean)
- [ ] **Step 2: Migrate + full backend suite**

Run: `cd backend && mix ecto.migrate && mix test`
Expected: 0 NEW failures (the 8 pre-existing food/exercise-search failures are baseline; list them in the report).

- [ ] **Step 3: `mix precommit`**

Run: `mix precommit`
Expected: format/compile/credo clean (test step may show only the 8 baseline failures).

- [ ] **Step 4: Commit**

```bash
git add -A backend && git commit -m "refactor(nutrition): drop schedule entries — day model is the only pathway"
```

---

### Task 6: Coach builder — days section replaces schedule

**Files:**
- Regenerate: `just gen-api` (from repo root; requires a FRESH `phx.server`/spec dump — the task runs the just recipe which dumps from code, no server needed; check `just --list`)
- Delete: `frontend/apps/coachapp-v2/src/nutrition-plans/plan-builder/nutrition-schedule.tsx`
- Create: `frontend/apps/coachapp-v2/src/nutrition-plans/plan-builder/plan-days.tsx`
- Modify: `nutrition-plan-builder.tsx` (swap `<NutritionSchedule/>` for `<PlanDays/>`), `frontend/apps/coachapp-v2/src/api/nutrition-plans-list.ts` or a small new `src/api/nutrition-days.ts` for tag wiring.

**Interfaces:**
- Consumes generated hooks (names come from operation_ids): `useCreateNutritionPlanDayMutation`, `useUpdateNutritionPlanDayMutation`, `useDeleteNutritionPlanDayMutation`, `useAssignNutritionWeekdayMutation`, `useAddNutritionSlotOptionMutation`, `useRemoveNutritionSlotOptionMutation`, `useMakeDefaultNutritionSlotOptionMutation` — verify exact generated names in `src/api/generated.ts` after regen; plan payload now carries `days` + `weekday_assignments`.
- Produces: `<PlanDays plan={plan} />` — the days section.

**Behavior spec for `plan-days.tsx`** (follow coachapp AGENTS.md canonical components; look at the deleted `nutrition-schedule.tsx` in git history and `meals-list.tsx` for visual language):

1. Data: everything renders from `plan.days` (sorted by `position`) + `plan.weekday_assignments` + `plan.meals` (for names/calories via existing meal `nutrition` totals in the payload). Mutations invalidate the plan detail (`getNutritionPlan` tag or `updateQueryData` refetch — simplest: wire `invalidatesTags` for all 7 mutations to the plan detail tag used by the builder; check how `meals-list.tsx` refreshes after meal mutations and copy that mechanism exactly).
2. Single day (`days.length === 1`): render NO tabs, NO weekday strip, NO day name. Just the six slot groups.
3. Slot group: heading = slot label (reuse `MEAL_SLOT_LABELS` from `@easy/utils`), then option rows ordered by `position`. Row: meal name + kcal + (position 0 only) a small "Default" `Chip`; overflow/inline actions: "Make default" (hidden on position 0), "Remove". Below rows: "Add option" button (hidden when 3 options) opening the same meal picker used previously (a simple HeroUI `Select`/ListBox over `plan.meals` is acceptable — mirror what `nutrition-schedule.tsx` used for its per-slot meal select, retrievable via `git show HEAD~1:...nutrition-schedule.tsx` — reuse its select component pattern).
4. Multiple days: day tabs (HeroUI `Tabs` or `ToggleButtonGroup`) with day names + an "Add day" button; active day is local state. Weekday strip under the tabs: 7 chips `M T W T F S S`; chip filled when `weekday_assignments[weekday] === activeDay.id`; tapping an unfilled chip calls assign-weekday `{day_of_week, nutrition_plan_day_id: activeDay.id}`. Rename: inline editable day name (mirror `plan-header.tsx` inline-name pattern). Delete day: overflow action with HeroUI confirm dialog stating "Mon, Wed will use Everyday" style copy (compute from assignments); hidden when `days.length === 1`.
5. "Add day" calls create-day with no name (backend defaults "Day N"), then selects it.
6. Day totals: per-day summary line summing default options' meal `nutrition.calories` (meals found by `nutrition_meal_id` in `plan.meals`); when any slot has >1 option append caption text exactly: `Totals use default options.`
7. All interactive targets `min-h-11`; mobile-first; works at 375px and 1280px.

- [ ] **Step 1: `just gen-api`** — regenerates both apps' `generated.ts`. Verify new hooks exist: `grep -n "NutritionPlanDay\|SlotOption\|SwitchOption\|WeekdayAssign" frontend/apps/coachapp-v2/src/api/generated.ts | head`.
- [ ] **Step 2: Delete `nutrition-schedule.tsx`; write `plan-days.tsx` per the behavior spec; swap into `nutrition-plan-builder.tsx`** (update the section comment). Remove any now-dead schedule API wiring (`grep -rn "setNutritionPlanSchedule\|ScheduleMutation" frontend/apps/coachapp-v2/src`).
- [ ] **Step 3: Verify**

Run: `pnpm -C frontend/apps/coachapp-v2 build`
Expected: PASS (tsc clean).
Run: `bash frontend/scripts/check-rm.sh` (or `cd frontend && just check-rm` — use whatever `just lint` invokes)
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A frontend && git commit -m "feat(coachapp): plan days section — day tabs, weekday strip, slot options"
```

---

### Task 7: Client Today — option switcher + switch-after-log confirm

**Files:**
- Modify: `frontend/apps/clientapp-v2/src/api/nutrition.ts` (new today types + `useSwitchOptionMutation` export + tag wiring)
- Modify: `frontend/apps/clientapp-v2/src/nutrition/nutrition-utils.ts` (`buildSlots` consumes the new `slots`/options shape)
- Modify: `frontend/apps/clientapp-v2/src/nutrition/nutrition-today.tsx` (switcher UI + confirm)
- Check: `frontend/apps/clientapp-v2/src/nutrition/nutrition-history.tsx` still compiles (it shares `nutrition-utils`)

**Interfaces:**
- Consumes: new `today` payload `{date, day, plan_id, slots: [{meal_slot, chosen_meal_id, options: [{meal_id, meal_name, position, items: TodayPlanItem[]}]}]}` and generated `useSwitchOptionMutation` (verify generated name from operation_id, e.g. `switchOption` → `useSwitchOptionMutation`).

**Behavior:**
1. New hand-typed view model in `api/nutrition.ts`:

```ts
export type TodayPlanOption = {
  items: TodayPlanItem[];
  meal_id: string;
  meal_name: null | string;
  position: number;
};
export type TodayPlanSlot = {
  chosen_meal_id: null | string;
  meal_slot: string;
  options: TodayPlanOption[];
};
export type TodayPlan = {
  date: string;
  day: string;
  plan_id: string;
  slots: TodayPlanSlot[];
};
```

(`TodayPlanMeal` is deleted — update all imports.)

2. `buildSlots(today, mealLogs, selections)` — the active option per slot resolves as: local selection (a `Record<string, string>` of slot→meal_id kept in `nutrition-today.tsx` state) > `chosen_meal_id` from the payload > `options[0]`. The `SlotView` gains `options: TodayPlanOption[]` and `activeMealId: null | string`; `planned` rows and `plannedCalories` come from the active option's items. Reconciliation logic (byIndex/extras) is unchanged.
3. Slot card in `nutrition-today.tsx`: when `options.length > 1`, show a switcher affordance in the card header (e.g. a `Button` variant showing the active option name + "2 more options" / chevron) opening a bottom sheet (`KeyboardSheet`/existing sheet component in the app — mirror whatever the amount/replace sheets use) listing each option with name + kcal, active one marked.
4. Selecting an option:
   - If the slot has NO logged entries (`!hasLog`): set local selection only (planned rows re-render from the new option). First subsequent log action must send `meal_id` (the log-meal mutation already takes `meal_id`; for single-item check via `createFoodLogEntry`, include `meal_id` in the body — backend accepts it per Task 3).
   - If the slot HAS entries: open a HeroUI confirm dialog, body text exactly: **"Switching clears what you've logged for this meal"**, confirm calls `switchOption({date, meal_slot, meal_id})`, which invalidates `MealLog` LIST + `NutritionPlan` TODAY tags (wire in `enhanceEndpoints` like the other log mutations).
5. Future dates stay read-only (existing rule) — switcher hidden/disabled there.

- [ ] **Step 1: Implement; keep the diff minimal.**
- [ ] **Step 2: Verify**

Run: `pnpm -C frontend/apps/clientapp-v2 build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add -A frontend && git commit -m "feat(clientapp): meal option switcher on Today with switch-after-log confirm"
```

---

### Task 8: Whole-feature verification

**Files:** none new (fixes only).

- [ ] **Step 1: Backend full suite + precommit**: `cd backend && mix test && mix precommit` — 0 new failures vs the 8 baseline.
- [ ] **Step 2: FE builds**: `pnpm -C frontend/apps/coachapp-v2 build && pnpm -C frontend/apps/clientapp-v2 build` + check-rm script.
- [ ] **Step 3: Live smoke** (dev servers; use chrome-devtools-axi):
  1. Coach: create a nutrition plan → builder shows six slots, no tabs/strip. Add 2 meals to library, add both as breakfast options → "Default" chip on first, totals caption appears.
  2. Add day → tabs + weekday strip appear; move Saturday+Sunday to it; rename it "Weekend"; delete it → confirm copy mentions reassignment; strip disappears.
  3. Assign plan to a client. Client Today (Monday): breakfast shows default option + "2 options" affordance; switch before logging (free), log an item, switch again → confirm dialog with exact copy → entries cleared.
  4. Verify migrated pre-existing plans render (open one created before the migration).
- [ ] **Step 4: Commit any fixes; report residual issues.**

---

## Self-review notes (already applied)

- Task 2's `chosen` map depends on Task 3's column — resolved by shipping `chosen: %{}` in Task 2 and filling it in Task 3 Step 5 (explicitly, not a placeholder: both steps contain the final code).
- `log_meal` API already carried `meal_id`; no client-side breaking change for logging, only for the `today` read shape (Task 7 lands immediately after regen).
- `schedule_entries` stays in plan JSON until Task 5 so pre-cutover FE keeps working between backend tasks.
