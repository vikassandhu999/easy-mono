# Training Data Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reshape the existing Elixir training layer to match `docs/superpowers/specs/2026-06-20-coaching-profile-training-schema-api-design.md`: `training_`-prefixed tables, the single planned/performed **set vocabulary** (set-per-row), `training_schedule_entries`, `training_sessions` with a frozen `planned_snapshot`, and the spec's database guarantees.

**Architecture:** This is **Plan 1 of 2** for the training slice (sibling to the nutrition split). Plan 1 is the **data + computation layer**: drop & recreate the training tables cleanly (pre-production, no data preserved), rewrite the Ecto schemas, and update the four contexts (`Easy.Exercises`, `Easy.TrainingPlans`, `Easy.Workouts`, `Easy.Sessions`) plus the web layer **only enough to keep the app compiling and the test suite green**. Routes stay snake_case.

**Deferred to Plan 2 (training API restructure)** — do NOT do these here: kebab-case `training-` paths; `GET/PUT /schedule/:day`; exercise `copy` endpoint; the `training-sessions` logging endpoints + coach read-only client sessions; removal of the out-of-spec endpoints (`/workouts/:id/duplicate`, standalone `/workout_elements` CRUD, `/training_plan_items` CRUD, session `/complete` + `/discard`, `/exercises/:id/duplicate`); **Ctx-first conversion** of the four contexts; the Elixir **module renames** (`PlanItem`→`ScheduleEntry`, `WorkoutElement`→`TrainingWorkoutExercise`, `WorkoutSession`→`TrainingSession`, `PerformedSet`→`TrainingPerformedSet`, `Exercise`→`TrainingExercise`, etc.); OpenApiSpex schema renames; strict request validation. Bundling Ctx-first + module renames into Plan 2 mirrors how nutrition was done (Plan 1 data, Plan 2 API+Ctx).

**Tech Stack:** Ecto schemas/migration, Postgres constraints (unique indexes, CHECK, a `btree_gist` EXCLUDE), ExMachina factories, ExUnit.

## Global Constraints

Copied from the spec; every task implicitly includes these.

- **Table names** are `training_`-prefixed: `training_plans`, `training_schedule_entries`, `training_workouts`, `training_workout_exercises`, `training_exercises`, `training_muscles`, `training_equipment`, `training_exercise_muscles`, `training_exercise_equipment`, `training_sessions`, `training_performed_sets`.
- **Structural FKs keep the prefix** (`training_plan_id`, `training_workout_id`, `training_session_id`, `training_schedule_entry_id`); the **library FK stays bare** (`exercise_id`).
- **One set vocabulary, set-per-row.** Each row/embedded element is one physical set. `planned_sets` (embedded in `training_workout_exercises`, no `position` — array order is order): `set_type, reps, load_value, load_unit, duration_seconds, distance_value, distance_unit, rpe, rest_seconds, notes`. `training_performed_sets` (flat table under session): the same fields minus `rest_seconds`, plus `position, completed, exercise_id, exercise_name, training_session_id`. `rpe` is the one effort field (1–10), planned + performed. `rest_seconds` planned-only. `position`/`completed`/snapshot fields performed-only. Advice (tempo, cues, %1RM) goes in `notes`, not columns.
- **Enums:** `set_type` ∈ {working, warmup, dropset}; `load_unit` ∈ {kg, lbs, bodyweight, none}; `distance_unit` ∈ {meters, km, miles, none}; exercise `source` ∈ {system, imported, custom}; `tracking_type` ∈ {weight_reps, bodyweight_reps, weighted_bodyweight, assisted_bodyweight, reps_only, duration, weight_duration, distance_duration, weight_distance}; `mechanics` ∈ {compound, isolation, isometric}; `force` ∈ {push, pull, static}; plan `status` ∈ {active, archived}; session `state` ∈ {active, completed, discarded}; `day_of_week` ∈ {monday..sunday}.
- **AMRAP/failure** are expressed in the `reps` string (`"AMRAP"`, `"Max"`, `"Failure"`), not set types. `bodyweight` load_unit = load added to (or, negative, assisted from) bodyweight.
- **Plans are personalized copies** (`source_template_id`; template edits don't propagate). `client_id IS NULL` = template. One repeating week; **one workout per weekday; a day with no schedule entry is a rest day — no `rest_days` field, no `workout_type`.**
- **System/imported exercises are read-only**; editing creates a business-owned copy (the copy endpoint is Plan 2; Plan 1 stores `source` and keeps the existing owned-only update guard). **No `/impact` for exercises.**
- **Sessions snapshot at log time.** `training_sessions.planned_snapshot` = prescribed workout as names+values only (no references), captured **once at session start, never re-built**; each `training_performed_sets` row carries `exercise_name`. `exercise_id` is a soft ref (`on_delete: :nilify_all`).
- **Database guarantees** (real Postgres constraints): one active assigned `training_plans` per client over overlapping date range (`btree_gist` EXCLUDE); unique `(training_plan_id, day_of_week)` on schedule entries; unique `(name, business_id)` on `training_exercises`; unique `(training_workout_id, position)` on workout exercises; one active `training_sessions` per client (partial unique on `(business_id, client_id) WHERE state = 'active'`); unique `(training_session_id, position)` on performed sets.
- Backend rules (`backend/AGENTS.md`): tenant-scope queries by `business_id`; controllers never call `Repo`; schemas never call `Repo`; trusted ids via `put_change` not `cast`; `@spec` on public fns; no `@moduledoc`/`@doc`; `lib/easy/training/` holds only Ecto schemas (enforced by `test/easy/training/schema_boundary_test.exs`).

## Plan-1 scope notes / decisions

- **Module names unchanged in Plan 1.** Keep `Easy.Training.{Exercise, Muscle, Equipment, TrainingPlan, PlanItem, Workout, WorkoutElement, WorkoutSession, PerformedSet, PlannedSet}` and their file names — only the `schema "..."` table strings, fields, and enums change. (So `PlanItem` maps to table `training_schedule_entries`, `WorkoutElement`→`training_workout_exercises`, `WorkoutSession`→`training_sessions`, `PerformedSet`→`training_performed_sets`.) The boundary-test schema-path list stays valid. Plan 2 does the module/file renames.
- **Contexts stay `business_id`-first in Plan 1.** Internals are rewritten for the new schema; public signatures keep their current shape so the (snake-route) controllers keep compiling. Ctx-first conversion is Plan 2.
- **`tracking_type`-driven required-set-field validation is deferred** (it needs the parent exercise's `tracking_type` at set-write time — a cross-entity check). Plan 1 stores `tracking_type` and keeps set fields individually optional. `// ponytail:` — strict per-type field requirements belong in Plan 2's request validation / UX.
- **Decimal types preserved:** `load_value`, `distance_value`, `rpe` stay `:decimal` (the current training convention).

## Build order and checkpoints

Elixir compiles the whole app, so a half-renamed tree won't compile; this refactor goes red across the suite mid-flight and returns green at the end. Checkpoints: Task 1 migration runs (tables exist); after the schema tasks (2–3) `mix compile` errors are confined to contexts/web; after the context tasks (4–5) errors confined to web; after Task 6 `mix compile --warnings-as-errors` is the first full green; after Task 7 the full suite is green; Task 8 verifies.

## File structure

**Create:** `backend/priv/repo/migrations/20260623000000_recreate_training_tables.exs`.
**Modify (schemas):** all of `backend/lib/easy/training/*.ex` (exercise, muscle, equipment, planned_set, performed_set, training_plan, plan_item, workout, workout_element, workout_session).
**Modify (contexts):** `backend/lib/easy/{exercises,training_plans,workouts,sessions}.ex`.
**Modify (web keep-green):** the coach/client training JSON views + any controller referencing renamed fields (`coaches/{training_plan,workout,workout_element,workout_session,training_plan_item,exercise}_json.ex`, `clients/{training_plan,workout_session,exercise}_json.ex`, and the session/performed-set controllers that pass `workout_element_id`); OpenApiSpex `open_api/schemas/{training_plan,training_children,exercise,training_reference}.ex` field names.
**Modify (tests/factory):** `backend/test/support/factory.ex`; `test/easy/training/*`; the training controller tests listed in Task 7.

---

## Task 1: Recreate the training tables (migration)

Drop the old unprefixed training tables and create the spec-shaped `training_*` tables. No data preserved.

**Files:** Create `backend/priv/repo/migrations/20260623000000_recreate_training_tables.exs`.

**Interfaces (produced):** the table/column/constraint names the Task 2–3 schemas bind to. Constraint names referenced later: `training_exercises_name_business_id_index`, `training_schedule_entries_training_plan_id_day_of_week_index`, `training_workout_exercises_training_workout_id_position_index`, `training_sessions_active_client_index`, `training_performed_sets_training_session_id_position_index`, `training_plans_no_overlapping_active`, plus the enum CHECK constraints.

- [ ] **Step 1: Write the migration**

Create the file with `def up`/`def down`. Drop old tables dependents-first, enable `btree_gist`, then create the new tables:

```elixir
defmodule Easy.Repo.Migrations.RecreateTrainingTables do
  use Ecto.Migration

  def up do
    # Drop old (dependents first). Drop & recreate clean — no data preserved.
    drop_if_exists table(:performed_sets)
    drop_if_exists table(:workout_sessions)
    drop_if_exists table(:workout_elements)
    drop_if_exists table(:training_plan_items)
    drop_if_exists table(:exercise_muscles)
    drop_if_exists table(:exercise_equipment)
    drop_if_exists table(:workouts)
    drop_if_exists table(:exercises)
    drop_if_exists table(:muscles)
    drop_if_exists table(:equipment)
    drop_if_exists table(:training_plans)

    execute "CREATE EXTENSION IF NOT EXISTS btree_gist"

    # --- reference data ---
    create table(:training_muscles, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :description, :text
      timestamps(type: :utc_datetime)
    end

    create unique_index(:training_muscles, [:name])

    create table(:training_equipment, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :description, :text
      timestamps(type: :utc_datetime)
    end

    create unique_index(:training_equipment, [:name])

    # --- exercises ---
    create table(:training_exercises, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :source, :string, null: false, default: "custom"
      add :tracking_type, :string, null: false, default: "weight_reps"
      add :name, :string, null: false
      add :description, :text
      add :instructions, :text
      add :mechanics, :string
      add :force, :string
      add :images, {:array, :string}, default: []
      add :import_id, :string

      add :creator_id, references(:coaches, type: :binary_id, on_delete: :nilify_all)
      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing)

      timestamps(type: :utc_datetime)
    end

    create unique_index(:training_exercises, [:name, :business_id])
    create index(:training_exercises, [:business_id])

    create constraint(:training_exercises, :training_exercises_source_check,
             check: "source in ('system','imported','custom')")

    create constraint(:training_exercises, :training_exercises_tracking_type_check,
             check:
               "tracking_type in ('weight_reps','bodyweight_reps','weighted_bodyweight','assisted_bodyweight','reps_only','duration','weight_duration','distance_duration','weight_distance')")

    create constraint(:training_exercises, :training_exercises_mechanics_check,
             check: "mechanics is null or mechanics in ('compound','isolation','isometric')")

    create constraint(:training_exercises, :training_exercises_force_check,
             check: "force is null or force in ('push','pull','static')")

    create table(:training_exercise_muscles, primary_key: false) do
      add :exercise_id, references(:training_exercises, type: :binary_id, on_delete: :delete_all),
        null: false

      add :muscle_id, references(:training_muscles, type: :binary_id, on_delete: :delete_all),
        null: false
    end

    create unique_index(:training_exercise_muscles, [:exercise_id, :muscle_id])

    create table(:training_exercise_equipment, primary_key: false) do
      add :exercise_id, references(:training_exercises, type: :binary_id, on_delete: :delete_all),
        null: false

      add :equipment_id,
          references(:training_equipment, type: :binary_id, on_delete: :delete_all),
          null: false
    end

    create unique_index(:training_exercise_equipment, [:exercise_id, :equipment_id])

    # --- plans ---
    create table(:training_plans, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :description, :text
      add :status, :string, null: false, default: "active"
      add :start_date, :date
      add :end_date, :date

      add :creator_id, references(:coaches, type: :binary_id, on_delete: :nilify_all)
      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing), null: false
      add :client_id, references(:clients, type: :binary_id, on_delete: :delete_all)

      add :source_template_id,
          references(:training_plans, type: :binary_id, on_delete: :nilify_all)

      timestamps(type: :utc_datetime)
    end

    create index(:training_plans, [:business_id])
    create index(:training_plans, [:business_id, :client_id])

    execute """
    ALTER TABLE training_plans
    ADD CONSTRAINT training_plans_no_overlapping_active
    EXCLUDE USING gist (
      client_id WITH =,
      daterange(start_date, end_date, '[]') WITH &&
    )
    WHERE (client_id IS NOT NULL AND status = 'active')
    """

    # --- workouts ---
    create table(:training_workouts, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :notes, :text

      add :training_plan_id,
          references(:training_plans, type: :binary_id, on_delete: :delete_all),
          null: false

      add :creator_id, references(:coaches, type: :binary_id, on_delete: :nilify_all)
      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing), null: false

      timestamps(type: :utc_datetime)
    end

    create index(:training_workouts, [:business_id])
    create index(:training_workouts, [:training_plan_id])

    # --- schedule entries ---
    create table(:training_schedule_entries, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :day_of_week, :string, null: false

      add :training_plan_id,
          references(:training_plans, type: :binary_id, on_delete: :delete_all),
          null: false

      add :training_workout_id,
          references(:training_workouts, type: :binary_id, on_delete: :delete_all),
          null: false

      add :creator_id, references(:coaches, type: :binary_id, on_delete: :nilify_all)
      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing), null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:training_schedule_entries, [:training_plan_id, :day_of_week])
    create index(:training_schedule_entries, [:business_id])

    create constraint(:training_schedule_entries, :training_schedule_entries_day_check,
             check:
               "day_of_week in ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')")

    # --- workout exercises (with embedded planned_sets) ---
    create table(:training_workout_exercises, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :position, :integer, null: false, default: 0
      add :superset_group_id, :string
      add :notes, :text
      add :planned_sets, {:array, :jsonb}, default: []

      add :training_workout_id,
          references(:training_workouts, type: :binary_id, on_delete: :delete_all),
          null: false

      add :exercise_id, references(:training_exercises, type: :binary_id, on_delete: :nilify_all)
      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing), null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:training_workout_exercises, [:training_workout_id, :position])
    create index(:training_workout_exercises, [:business_id])

    # --- sessions ---
    create table(:training_sessions, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :date, :date
      add :started_at, :utc_datetime
      add :ended_at, :utc_datetime
      add :state, :string, null: false, default: "active"
      add :soreness_rating, :integer
      add :notes, :text
      add :planned_snapshot, :map

      add :client_id, references(:clients, type: :binary_id, on_delete: :delete_all), null: false
      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing), null: false

      add :training_workout_id,
          references(:training_workouts, type: :binary_id, on_delete: :nilify_all)

      add :training_schedule_entry_id,
          references(:training_schedule_entries, type: :binary_id, on_delete: :nilify_all)

      timestamps(type: :utc_datetime)
    end

    create index(:training_sessions, [:business_id, :client_id])
    create index(:training_sessions, [:client_id, :date])

    create unique_index(:training_sessions, [:business_id, :client_id],
             where: "state = 'active'",
             name: :training_sessions_active_client_index
           )

    create constraint(:training_sessions, :training_sessions_state_check,
             check: "state in ('active','completed','discarded')")

    # --- performed sets ---
    create table(:training_performed_sets, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :exercise_name, :string
      add :set_type, :string, null: false, default: "working"
      add :position, :integer, null: false, default: 0
      add :reps, :string
      add :load_value, :decimal
      add :load_unit, :string
      add :duration_seconds, :integer
      add :distance_value, :decimal
      add :distance_unit, :string
      add :rpe, :decimal
      add :completed, :boolean, null: false, default: false
      add :notes, :text

      add :training_session_id,
          references(:training_sessions, type: :binary_id, on_delete: :delete_all),
          null: false

      add :exercise_id, references(:training_exercises, type: :binary_id, on_delete: :nilify_all)
      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing), null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:training_performed_sets, [:training_session_id, :position])
    create index(:training_performed_sets, [:training_session_id])

    create constraint(:training_performed_sets, :training_performed_sets_set_type_check,
             check: "set_type in ('working','warmup','dropset')")

    create constraint(:training_performed_sets, :training_performed_sets_load_unit_check,
             check: "load_unit is null or load_unit in ('kg','lbs','bodyweight','none')")

    create constraint(:training_performed_sets, :training_performed_sets_distance_unit_check,
             check: "distance_unit is null or distance_unit in ('meters','km','miles','none')")
  end

  def down do
    drop_if_exists table(:training_performed_sets)
    drop_if_exists table(:training_sessions)
    drop_if_exists table(:training_workout_exercises)
    drop_if_exists table(:training_schedule_entries)
    drop_if_exists table(:training_workouts)
    drop_if_exists table(:training_exercise_equipment)
    drop_if_exists table(:training_exercise_muscles)
    drop_if_exists table(:training_exercises)
    drop_if_exists table(:training_muscles)
    drop_if_exists table(:training_equipment)
    drop_if_exists table(:training_plans)
    # Not reversible to the old schema (clean recreate). Use `mix ecto.reset` in dev.
  end
end
```

- [ ] **Step 2: Run the migration**

Run: `cd /Users/vikassandhu/Desktop/10x/easy-mono/backend && mix ecto.migrate`
Expected: runs cleanly. (If `btree_gist` can't be created, run `CREATE EXTENSION btree_gist;` as superuser once, then re-run.)

- [ ] **Step 3: Verify the tables exist**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono/backend && mix run --no-start -e '
{:ok, _} = Application.ensure_all_started(:easy)
q = "SELECT tablename FROM pg_tables WHERE tablename LIKE '"'"'training_%'"'"' ORDER BY 1"
Easy.Repo.query!(q).rows |> List.flatten() |> IO.inspect(label: "training tables", limit: :infinity)
'
```
Expected: the 11 `training_*` tables listed.

- [ ] **Step 4: Commit**

```bash
git add backend/priv/repo/migrations/20260623000000_recreate_training_tables.exs
git commit -m "feat: recreate training tables with canonical schema"
```

---

## Task 2: Rewrite the set-vocabulary + exercise/reference schemas

**Files:** Modify `backend/lib/easy/training/{planned_set,performed_set,exercise,muscle,equipment}.ex`.

**Interfaces (produced):**
- `PlannedSet` (embedded): fields `set_type, reps, load_value, load_unit, duration_seconds, distance_value, distance_unit, rpe, rest_seconds, notes`; `changeset/2`; `to_snapshot/1` returning a names+values map.
- `PerformedSet` (table `training_performed_sets`): fields `exercise_name, set_type, position, reps, load_value, load_unit, duration_seconds, distance_value, distance_unit, rpe, completed, notes`; `belongs_to :session` (FK `training_session_id`), `:exercise`, `:business`; `insert_changeset(session_id, business_id, attrs)`, `update_changeset/2`; `for_session/2`, `ordered/1`.
- `Exercise` (table `training_exercises`): add `source`, `tracking_type`; keep `name, description, instructions, mechanics, force, images, import_id`; `many_to_many :muscles`/`:equipment` via the renamed join tables; `insert_changeset(business_id, coach_id, attrs)`, `update_changeset/2`; builders `for_business/2`, `owned_or_system/2`, `search/2` (preserve existing), `load_muscles_and_equipment/1`.
- `Muscle` (table `training_muscles`), `Equipment` (table `training_equipment`): table-string change only.

- [ ] **Step 1: Rewrite `planned_set.ex`** (embedded — trim to the one vocabulary)

```elixir
defmodule Easy.Training.PlannedSet do
  use Ecto.Schema
  import Ecto.Changeset

  @type t() :: %__MODULE__{}

  @set_types ~w(working warmup dropset)
  @load_units ~w(kg lbs bodyweight none)
  @distance_units ~w(meters km miles none)

  @primary_key false
  embedded_schema do
    field :set_type, :string, default: "working"
    field :reps, :string
    field :load_value, :decimal
    field :load_unit, :string
    field :duration_seconds, :integer
    field :distance_value, :decimal
    field :distance_unit, :string
    field :rpe, :decimal
    field :rest_seconds, :integer
    field :notes, :string
  end

  @fields [:set_type, :reps, :load_value, :load_unit, :duration_seconds, :distance_value,
           :distance_unit, :rpe, :rest_seconds, :notes]

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(planned_set, attrs) do
    planned_set
    |> cast(attrs, @fields)
    |> validate_inclusion(:set_type, @set_types)
    |> validate_inclusion(:load_unit, @load_units)
    |> validate_inclusion(:distance_unit, @distance_units)
    |> validate_number(:rpe, greater_than_or_equal_to: 1, less_than_or_equal_to: 10)
  end

  @spec to_snapshot(t()) :: map()
  def to_snapshot(%__MODULE__{} = s) do
    %{
      "set_type" => s.set_type,
      "reps" => s.reps,
      "load_value" => s.load_value,
      "load_unit" => s.load_unit,
      "duration_seconds" => s.duration_seconds,
      "distance_value" => s.distance_value,
      "distance_unit" => s.distance_unit,
      "rpe" => s.rpe
    }
  end
end
```
(`validate_inclusion` on a `nil` value is a no-op, so unset units/set_type are allowed individually; `set_type` defaults to `"working"`.)

- [ ] **Step 2: Rewrite `performed_set.ex`** (table `training_performed_sets`, set-per-row)

```elixir
defmodule Easy.Training.PerformedSet do
  use Ecto.Schema

  alias Easy.Orgs
  alias Easy.Training.Exercise
  alias Easy.Training.WorkoutSession

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @set_types ~w(working warmup dropset)
  @load_units ~w(kg lbs bodyweight none)
  @distance_units ~w(meters km miles none)

  schema "training_performed_sets" do
    field :exercise_name, :string
    field :set_type, :string, default: "working"
    field :position, :integer, default: 0
    field :reps, :string
    field :load_value, :decimal
    field :load_unit, :string
    field :duration_seconds, :integer
    field :distance_value, :decimal
    field :distance_unit, :string
    field :rpe, :decimal
    field :completed, :boolean, default: false
    field :notes, :string

    belongs_to :session, WorkoutSession, foreign_key: :training_session_id
    belongs_to :exercise, Exercise
    belongs_to :business, Orgs.Business

    timestamps(type: :utc_datetime)
  end

  @cast_fields [:exercise_name, :set_type, :position, :reps, :load_value, :load_unit,
                :duration_seconds, :distance_value, :distance_unit, :rpe, :completed, :notes,
                :exercise_id]

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(session_id, business_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:training_session_id, session_id)
    |> put_change(:business_id, business_id)
    |> validate_required([:training_session_id, :business_id, :set_type, :position])
    |> validate_inclusion(:set_type, @set_types)
    |> validate_inclusion(:load_unit, @load_units)
    |> validate_inclusion(:distance_unit, @distance_units)
    |> validate_number(:rpe, greater_than_or_equal_to: 1, less_than_or_equal_to: 10)
    |> unique_constraint([:training_session_id, :position],
      name: :training_performed_sets_training_session_id_position_index)
  end

  @update_fields [:exercise_name, :set_type, :position, :reps, :load_value, :load_unit,
                  :duration_seconds, :distance_value, :distance_unit, :rpe, :completed, :notes]

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(performed_set, attrs) do
    performed_set
    |> cast(attrs, @update_fields)
    |> validate_inclusion(:set_type, @set_types)
    |> validate_inclusion(:load_unit, @load_units)
    |> validate_inclusion(:distance_unit, @distance_units)
    |> validate_number(:rpe, greater_than_or_equal_to: 1, less_than_or_equal_to: 10)
    |> unique_constraint([:training_session_id, :position],
      name: :training_performed_sets_training_session_id_position_index)
  end

  @spec for_session(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_session(query \\ __MODULE__, session_id),
    do: from(s in query, where: s.training_session_id == ^session_id)

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id),
    do: from(s in query, where: s.business_id == ^business_id)

  @spec ordered(Ecto.Queryable.t()) :: Ecto.Query.t()
  def ordered(query \\ __MODULE__), do: from(s in query, order_by: [asc: s.position])
end
```
(`belongs_to :session, WorkoutSession` — module stays `WorkoutSession`; table is `training_sessions`, see Task 3. The dropped fields `intensity_felt`, `rir`, `tempo_actual`, `workout_element_id` are gone; `actual_reps` → `reps`.)

- [ ] **Step 3: Rewrite `exercise.ex`** (table `training_exercises`, add `source`/`tracking_type`)

Keep the existing query builders (`for_business/2`, `owned_or_system/2`, `search/2`, `load_muscles_and_equipment/1`, `newest_first/1`, etc.) — only change the `schema` table string, the `many_to_many` join table names, add the two new fields + their casts/validations, and FIX the `create_changset` typo → `insert_changeset`. New schema + changesets:

```elixir
  @sources ~w(system imported custom)
  @tracking_types ~w(weight_reps bodyweight_reps weighted_bodyweight assisted_bodyweight
                     reps_only duration weight_duration distance_duration weight_distance)
  @mechanics ~w(compound isolation isometric)
  @forces ~w(push pull static)

  schema "training_exercises" do
    field :source, :string, default: "custom"
    field :tracking_type, :string, default: "weight_reps"
    field :name, :string
    field :description, :string
    field :instructions, :string
    field :mechanics, :string
    field :force, :string
    field :images, {:array, :string}, default: []
    field :import_id, :string

    belongs_to :creator, Easy.Orgs.Coach, foreign_key: :creator_id
    belongs_to :business, Easy.Orgs.Business

    many_to_many :muscles, Easy.Training.Muscle,
      join_through: "training_exercise_muscles", on_replace: :delete

    many_to_many :equipment, Easy.Training.Equipment,
      join_through: "training_exercise_equipment", on_replace: :delete

    timestamps(type: :utc_datetime)
  end

  @cast_fields [:source, :tracking_type, :name, :description, :instructions, :mechanics, :force, :images, :import_id]

  @spec insert_changeset(String.t(), String.t() | nil, map(), [Muscle.t()] | nil, [Equipment.t()] | nil) :: Ecto.Changeset.t()
  def insert_changeset(business_id, coach_id, attrs, muscles \\ nil, equipment \\ nil) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:business_id, business_id)
    |> put_change(:creator_id, coach_id)
    |> validate_required([:name])
    |> validate_enums()
    |> unique_constraint([:name, :business_id], name: :training_exercises_name_business_id_index)
    |> maybe_put_assoc(:muscles, muscles)
    |> maybe_put_assoc(:equipment, equipment)
  end

  @spec update_changeset(t(), map(), [Muscle.t()] | nil, [Equipment.t()] | nil) :: Ecto.Changeset.t()
  def update_changeset(exercise, attrs, muscles \\ nil, equipment \\ nil) do
    exercise
    |> cast(attrs, @cast_fields)
    |> validate_required([:name])
    |> validate_enums()
    |> unique_constraint([:name, :business_id], name: :training_exercises_name_business_id_index)
    |> maybe_put_assoc(:muscles, muscles)
    |> maybe_put_assoc(:equipment, equipment)
  end

  defp validate_enums(cs) do
    cs
    |> validate_inclusion(:source, @sources)
    |> validate_inclusion(:tracking_type, @tracking_types)
    |> validate_inclusion(:mechanics, @mechanics)
    |> validate_inclusion(:force, @forces)
  end

  defp maybe_put_assoc(cs, _key, nil), do: cs
  defp maybe_put_assoc(cs, key, records), do: put_assoc(cs, key, records)
```
> Reconcile with the current file: the current `create_changset/4`/`update_changeset/4` already take `(business_id, attrs, muscles, equipment)`-style args and `put_assoc` the loaded muscles/equipment. Keep that calling shape — the snippet above matches it (muscles/equipment passed in by the context, which loads them). Just rename `create_changset` → `insert_changeset` and update the call site in `Easy.Exercises.create_exercise` (Task 4). Keep the existing `owned_or_system/2`, `for_business/2`, `search/2`, `load_muscles_and_equipment/1` query builders verbatim (they only changed table via the `schema` line).

- [ ] **Step 4: Rewrite `muscle.ex` and `equipment.ex`** — change only the `schema "muscles"` → `schema "training_muscles"` and `schema "equipment"` → `schema "training_equipment"` lines; everything else (fields `name`/`description`, changesets, builders) unchanged.

- [ ] **Step 5: Compile-check the schema files**

Run: `cd /Users/vikassandhu/Desktop/10x/easy-mono/backend && mix compile 2>&1 | head -40`
Expected: errors only in the contexts/web that still reference old fields (`actual_reps`, `workout_element_id`, `create_changset`, etc.) — not internal errors in these five schema files.

- [ ] **Step 6: Commit**

```bash
git add backend/lib/easy/training/planned_set.ex backend/lib/easy/training/performed_set.ex backend/lib/easy/training/exercise.ex backend/lib/easy/training/muscle.ex backend/lib/easy/training/equipment.ex
git commit -m "feat: reshape training set-vocabulary + exercise schemas"
```

---

## Task 3: Rewrite the plan/workout/session schemas

**Files:** Modify `backend/lib/easy/training/{training_plan,plan_item,workout,workout_element,workout_session}.ex`.

**Interfaces (produced):**
- `TrainingPlan` (table `training_plans`): fields `name, description, status, start_date, end_date`; `belongs_to :creator` (FK `creator_id`), `:business`, `:client`, `:source_template` (FK `source_template_id`); `has_many :workouts`, `has_many :plan_items` (→ table `training_schedule_entries`); DROP `rest_days`. Changesets `create_changeset/3`, `update_changeset/2` + `exclusion_constraint`. Builders unchanged (`for_business/2`, `for_client/2`, `with_status/2`, `templates/1`, `newest/1`, `active_for_client/3`).
- `PlanItem` (table `training_schedule_entries`): fields `day_of_week`; `belongs_to :plan` (FK `training_plan_id`), `:workout` (FK `training_workout_id`), `:business`, `:creator`; DROP `workout_type`; `insert_changeset(plan_id, business_id, creator_id, attrs)`, `update_changeset/2`; `for_plan/2`, `for_day/2`, `days/0`.
- `Workout` (table `training_workouts`): fields `name, notes`; `belongs_to :plan` (FK `training_plan_id`), `:business`, `:creator`; `has_many :workout_elements`; DROP `has_many :plan_items`. `insert_changeset(plan_id, business_id, creator_id, attrs)`, `update_changeset/2`; builders `for_plan/2`, `for_business/2`, `ordered/1`.
- `WorkoutElement` (table `training_workout_exercises`): fields `position, superset_group_id, notes`, `embeds_many :planned_sets`; `belongs_to :workout` (FK `training_workout_id`), `:exercise`, `:business`; `insert_changeset(workout_id, business_id, attrs)`, `update_changeset/2` (cast_embed planned_sets); `for_workout/2`, `ordered/1`; unique on `(training_workout_id, position)`.
- `WorkoutSession` (table `training_sessions`): add `date`, `training_schedule_entry_id`; keep `started_at, ended_at, state, soreness_rating, notes, planned_snapshot`; `belongs_to :client`, `:business`, `:workout` (FK `training_workout_id`), `:schedule_entry` (FK `training_schedule_entry_id`); `has_many :performed_sets` (FK `training_session_id`). Changesets `insert_changeset/3`, `update_changeset/2`, `client_update_changeset/2`; builders `for_client/3`, `for_business/2`, `for_date_range/3`, `active/1`, `with_sets/1`.

- [ ] **Step 1: Rewrite `training_plan.ex`** — keep all query builders + `validate_date_range`. Change schema (drop `rest_days`, rename assocs) and add the exclusion constraint:

```elixir
  schema "training_plans" do
    field :name, :string
    field :description, :string
    field :status, Ecto.Enum, values: @plan_statuses, default: :active
    field :start_date, :date
    field :end_date, :date

    belongs_to :creator, Easy.Orgs.Coach, foreign_key: :creator_id
    belongs_to :business, Easy.Orgs.Business
    belongs_to :client, Easy.Clients.Client
    belongs_to :source_template, __MODULE__, foreign_key: :source_template_id
    has_many :workouts, Easy.Training.Workout, foreign_key: :training_plan_id
    has_many :plan_items, Easy.Training.PlanItem, foreign_key: :training_plan_id

    timestamps(type: :utc_datetime)
  end

  @cast_fields [:name, :description, :status, :start_date, :end_date]
```
In `create_changeset/3` and `update_changeset/2`: cast `@cast_fields` (drop `rest_days`), keep `put_change(:business_id, ...)`/`put_change(:creator_id, ...)` (rename `:author_id`→`:creator_id` everywhere), keep `validate_date_range`, and append:
```elixir
    |> exclusion_constraint(:start_date,
      name: :training_plans_no_overlapping_active,
      message: "overlaps an existing active plan for this client")
```
Delete the rest-day validators that referenced `rest_days`/`plan_items` if any live on this schema (`validate_day_is_not_rest_day`, `check_rest_days_do_not_overlap_plan_items`, `rest_day?`, `plan_items_on_days?` — per discovery these are on the plan or plan_item; remove them).

- [ ] **Step 2: Rewrite `plan_item.ex`** (table `training_schedule_entries`)

```elixir
defmodule Easy.Training.PlanItem do
  use Ecto.Schema
  alias Easy.Orgs
  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @days ~w(monday tuesday wednesday thursday friday saturday sunday)

  @spec days() :: [String.t()]
  def days, do: @days

  schema "training_schedule_entries" do
    field :day_of_week, :string

    belongs_to :business, Orgs.Business
    belongs_to :creator, Orgs.Coach, foreign_key: :creator_id
    belongs_to :plan, Easy.Training.TrainingPlan, foreign_key: :training_plan_id
    belongs_to :workout, Easy.Training.Workout, foreign_key: :training_workout_id

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(plan_id, business_id, creator_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:day_of_week, :training_workout_id])
    |> put_change(:training_plan_id, plan_id)
    |> put_change(:business_id, business_id)
    |> put_change(:creator_id, creator_id)
    |> validate_required([:day_of_week, :training_workout_id, :training_plan_id, :business_id])
    |> validate_inclusion(:day_of_week, @days)
    |> unique_constraint([:training_plan_id, :day_of_week],
      name: :training_schedule_entries_training_plan_id_day_of_week_index)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(entry, attrs) do
    entry
    |> cast(attrs, [:day_of_week, :training_workout_id])
    |> validate_inclusion(:day_of_week, @days)
    |> unique_constraint([:training_plan_id, :day_of_week],
      name: :training_schedule_entries_training_plan_id_day_of_week_index)
  end

  @spec for_plan(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_plan(query \\ __MODULE__, plan_id),
    do: from(p in query, where: p.training_plan_id == ^plan_id)

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id),
    do: from(p in query, where: p.business_id == ^business_id)

  @spec for_day(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_day(query \\ __MODULE__, day),
    do: from(p in query, where: p.day_of_week == ^day)
end
```

- [ ] **Step 3: Rewrite `workout.ex`** (table `training_workouts`)

```elixir
defmodule Easy.Training.Workout do
  use Ecto.Schema
  alias Easy.Orgs
  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "training_workouts" do
    field :name, :string
    field :notes, :string

    belongs_to :business, Orgs.Business
    belongs_to :creator, Orgs.Coach, foreign_key: :creator_id
    belongs_to :plan, Easy.Training.TrainingPlan, foreign_key: :training_plan_id
    has_many :workout_elements, Easy.Training.WorkoutElement, foreign_key: :training_workout_id

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(plan_id, business_id, creator_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:name, :notes])
    |> put_change(:training_plan_id, plan_id)
    |> put_change(:business_id, business_id)
    |> put_change(:creator_id, creator_id)
    |> validate_required([:name, :training_plan_id, :business_id])
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(workout, attrs), do: cast(workout, attrs, [:name, :notes])

  @spec for_plan(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_plan(query \\ __MODULE__, plan_id),
    do: from(w in query, where: w.training_plan_id == ^plan_id)

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id),
    do: from(w in query, where: w.business_id == ^business_id)

  @spec ordered(Ecto.Queryable.t()) :: Ecto.Query.t()
  def ordered(query \\ __MODULE__), do: from(w in query, order_by: [asc: w.inserted_at])
end
```
> If the current `Workout` insert_changeset takes `(plan_id, business_id, attrs)` (no creator), preserve that arity instead and add `creator_id` via `put_change` only if the context passes it — match the existing call sites in `Easy.Workouts`/`Easy.TrainingPlans` and adjust those call sites in Tasks 4–5. The point: add `creator_id` support and the `:training_plan_id` FK.

- [ ] **Step 4: Rewrite `workout_element.ex`** (table `training_workout_exercises`)

```elixir
defmodule Easy.Training.WorkoutElement do
  use Ecto.Schema
  alias Easy.Orgs
  alias Easy.Training.{Exercise, PlannedSet, Workout}
  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "training_workout_exercises" do
    field :position, :integer, default: 0
    field :superset_group_id, :string
    field :notes, :string

    embeds_many :planned_sets, PlannedSet, on_replace: :delete

    belongs_to :business, Orgs.Business
    belongs_to :workout, Workout, foreign_key: :training_workout_id
    belongs_to :exercise, Exercise

    timestamps(type: :utc_datetime)
  end

  @cast_fields [:position, :superset_group_id, :notes, :exercise_id]

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(workout_id, business_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:training_workout_id, workout_id)
    |> put_change(:business_id, business_id)
    |> validate_required([:training_workout_id, :business_id, :exercise_id])
    |> cast_embed(:planned_sets, with: &PlannedSet.changeset/2)
    |> unique_constraint([:training_workout_id, :position],
      name: :training_workout_exercises_training_workout_id_position_index)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(element, attrs) do
    element
    |> cast(attrs, [:position, :superset_group_id, :notes])
    |> cast_embed(:planned_sets, with: &PlannedSet.changeset/2)
    |> unique_constraint([:training_workout_id, :position],
      name: :training_workout_exercises_training_workout_id_position_index)
  end

  @spec for_workout(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_workout(query \\ __MODULE__, workout_id),
    do: from(e in query, where: e.training_workout_id == ^workout_id)

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id),
    do: from(e in query, where: e.business_id == ^business_id)

  @spec ordered(Ecto.Queryable.t()) :: Ecto.Query.t()
  def ordered(query \\ __MODULE__), do: from(e in query, order_by: [asc: e.position])
end
```

- [ ] **Step 5: Rewrite `workout_session.ex`** (table `training_sessions`) — add `date`, `training_schedule_entry_id`; rename `workout_id`→`training_workout_id`:

```elixir
  schema "training_sessions" do
    field :date, :date
    field :started_at, :utc_datetime
    field :ended_at, :utc_datetime
    field :state, Ecto.Enum, values: @states, default: :active
    field :soreness_rating, :integer
    field :notes, :string
    field :planned_snapshot, :map

    belongs_to :client, Easy.Clients.Client
    belongs_to :business, Easy.Orgs.Business
    belongs_to :workout, Easy.Training.Workout, foreign_key: :training_workout_id
    belongs_to :schedule_entry, Easy.Training.PlanItem, foreign_key: :training_schedule_entry_id
    has_many :performed_sets, Easy.Training.PerformedSet, foreign_key: :training_session_id

    timestamps(type: :utc_datetime)
  end
```
Update `insert_changeset/3`, `update_changeset/2`, `client_update_changeset/2` to cast `:date` (insert) and keep `:state`/`:ended_at`/`:soreness_rating`/`:notes` casting; `put_change` the `:business_id`/`:client_id`/`:training_workout_id`/`:training_schedule_entry_id`/`:planned_snapshot` (trusted) rather than casting. Add `with_sets/1` preload using `PerformedSet.ordered()`, `for_date_range/3`, and keep `active/1`/`for_client/3`/`for_business/2`. Keep the partial-unique active-session reliance (the DB constraint is `training_sessions_active_client_index`; add `unique_constraint(:client_id, name: :training_sessions_active_client_index)` to `insert_changeset`).

- [ ] **Step 6: Compile-check**

Run: `cd /Users/vikassandhu/Desktop/10x/easy-mono/backend && mix compile 2>&1 | head -40`
Expected: errors now only in the **contexts** (`training_plans.ex`, `workouts.ex`, `sessions.ex`, `exercises.ex`) and the web layer — not inside `lib/easy/training/*`.

- [ ] **Step 7: Commit**

```bash
git add backend/lib/easy/training/training_plan.ex backend/lib/easy/training/plan_item.ex backend/lib/easy/training/workout.ex backend/lib/easy/training/workout_element.ex backend/lib/easy/training/workout_session.ex
git commit -m "feat: reshape training plan/workout/session schemas"
```

---

## Task 4: Update `Easy.Exercises` and `Easy.Workouts` contexts

**Files:** Modify `backend/lib/easy/exercises.ex`, `backend/lib/easy/workouts.ex`.

- [ ] **Step 1: `exercises.ex`** — update the changeset call to the renamed `Exercise.insert_changeset/5` (was `create_changset`), pass `source`/`tracking_type` through `attrs` (they flow via `cast`). The `owned_or_system`/`for_business`/`search` builders are unchanged. `duplicate_exercise/3` already copies into a new owned record (Plan 2 renames the endpoint to `copy`; the context fn can keep its name for now). Keep the read-only guard (update/delete via `get_owned_exercise`). No signature changes. Confirm `list_muscles/1`/`list_equipment/1` query `Muscle`/`Equipment` (now `training_muscles`/`training_equipment` via the schema).

- [ ] **Step 2: `workouts.ex`** — apply field renames so it compiles against the new schemas:
  - `WorkoutElement` create/update call sites: the element now lives in table `training_workout_exercises`; `create_workout_element/3` calls `WorkoutElement.insert_changeset(workout_id, business_id, attrs)` and `update_workout_element/3` calls `WorkoutElement.update_changeset/2` (both with embedded `planned_sets` via cast_embed — already embedded).
  - `Workout` create call sites: pass `creator_id` if the new `Workout.insert_changeset/4` requires it (match Task 3 Step 3's chosen arity).
  - Preloads: `get_workout_with_elements/2` etc. preload `:workout_elements` (assoc unchanged name) → which now embeds `planned_sets`.
  - `validate_exercise_in_business/1`: the spec allows system exercises in workouts — widen to `Exercise.owned_or_system(business_id)` (was owned-only) so a coach can add system exercises to a workout. Confirm with the existing test expectations; if a test asserts owned-only, update it in Task 7.
  - `duplicate_workout/1`: copies workout + elements (with embedded planned_sets) — preserve; it stays an internal context fn (the `/workouts/:id/duplicate` route is removed in Plan 2, not here).

- [ ] **Step 3: Compile-check**

Run: `cd /Users/vikassandhu/Desktop/10x/easy-mono/backend && mix compile 2>&1 | head -40`
Expected: remaining errors only in `training_plans.ex`, `sessions.ex`, and the web layer.

- [ ] **Step 4: Commit**

```bash
git add backend/lib/easy/exercises.ex backend/lib/easy/workouts.ex
git commit -m "feat: update Exercises + Workouts contexts for training schema"
```

---

## Task 5: Update `Easy.TrainingPlans` and `Easy.Sessions` contexts

**Files:** Modify `backend/lib/easy/training_plans.ex`, `backend/lib/easy/sessions.ex`.

- [ ] **Step 1: `training_plans.ex` — schedule model + source_template**
  - Rename `original_template_id` → `source_template_id` everywhere (clone logic, `assign_*`, preloads).
  - Rename `author_id` → `creator_id` in `create_training_plan/3` (it now `put_change`s `creator_id`).
  - `PlanItem` is now the schedule entry: `create_plan_item/4` calls `PlanItem.insert_changeset(plan_id, business_id, creator_id, attrs)` casting `day_of_week`/`training_workout_id` (no `workout_type`). `list_plan_items/2` and `get_plan_item/2` unchanged in shape (query `PlanItem.for_plan`). Remove any `rest_days` handling and the rest-day overlap validators referenced from the context.
  - `get_plan_full/2` preload: `plan_items` (schedule entries) + `workouts` (with `workout_elements` embedding planned_sets).
  - Clone chain (`clone_plan/3`, `copy_workouts/2`, `copy_workout_into/2`, `copy_workout_elements/3`, `copy_plan_items/3`): copy `training_schedule_entries` (day_of_week + new workout id) and `training_workout_exercises` (embedded planned_sets copied as maps). Drop `rest_days` from the cloned plan attrs.
  - `assign_training_plan_to_client/4`: relies on the new DB EXCLUDE constraint for overlap — translate the constraint via `TrainingPlan`'s `exclusion_constraint` (added in Task 3) so a conflicting assign returns `{:error, changeset}` not a raw 23P01.
  - **Add `get_active_plan_day_for_client/3` (and `_for_user`)**: returns the active plan for a client on a date + that day's schedule entry/workout (mirrors nutrition `get_active_plan_day`). Use `TrainingPlan.active_for_client/3` + `PlanItem.for_plan |> for_day(weekday)`. This backs the Plan-2 `/today` endpoint; build it now as a context fn (data layer). Signature: `(business_id, client_id, date) :: {:ok, %{plan, schedule_entry, workout, date, day}} | {:error, :not_found}`.

- [ ] **Step 2: `sessions.ex` — snapshot-once, set-per-row, drop element coupling**
  - Rename `workout_id`→`training_workout_id` references; `WorkoutSession` table is now `training_sessions`.
  - **PerformedSet:** drop everything tied to `workout_element_id`: delete `validate_workout_element_matches_session/1`, `workout_element_matches_session?/4`, `element_in_session_workout?/4`, `element_in_snapshot?/3`, `usable_snapshot?/1`. `create_performed_set/3` now calls `PerformedSet.insert_changeset(session_id, business_id, attrs)` and must set `exercise_name` (snapshot): if `attrs` lacks `exercise_name` but has `exercise_id`, look up the exercise name (`Exercise.for_business_or_system`... use `Exercise.owned_or_system`) and put it in attrs. Keep `validate_exercise_in_business`/owned-or-system check on `exercise_id`.
  - **Snapshot once:** `build_snapshot` / `put_planned_snapshot` is called ONLY on session create, never on update. Remove the snapshot rebuild from `update_*` paths. Reshape the snapshot to the spec: `%{"exercises" => [%{"name" => ex_name, "position" => pos, "sets" => [PlannedSet.to_snapshot/1, ...]}, ...]}` — walk the workout's `workout_elements` (ordered by position), resolve each element's exercise name, map its embedded `planned_sets` via `PlannedSet.to_snapshot/1`.
  - **Session create:** set `date` (default to today or from attrs), `training_schedule_entry_id` (nullable — set when a scheduled workout; null for ad-hoc), `started_at`. Keep the one-active-per-client check (`ensure_no_active_workout_session/2`) AND rely on the DB partial-unique (translate via `WorkoutSession`'s `unique_constraint(:client_id, name: :training_sessions_active_client_index)`).
  - **`list_sessions`:** add a date-range variant `list_sessions_for_client(business_id, client_id, from, to)` and `_for_user` using `WorkoutSession.for_date_range/3` (the Plan-2 endpoints use `from`/`to`); keep the existing offset/limit fn if other callers use it, else replace. `complete_*`/`discard_*` keep working (they set `state`); Plan 2 will fold them into PATCH.

- [ ] **Step 3: Compile-check**

Run: `cd /Users/vikassandhu/Desktop/10x/easy-mono/backend && mix compile 2>&1 | head -40`
Expected: remaining errors only under `lib/easy_web/` (views/controllers/openapi referencing old fields).

- [ ] **Step 4: Commit**

```bash
git add backend/lib/easy/training_plans.ex backend/lib/easy/sessions.ex
git commit -m "feat: update TrainingPlans + Sessions contexts for training schema"
```

---

## Task 6: Web keep-green (renderers, controllers, OpenApiSpex field names)

Update the web layer ONLY to compile against the renamed fields. Routes stay snake_case; endpoints stay (Plan 2 restructures/removes them). First full `--warnings-as-errors` green.

**Files:** the training JSON views (coach: `training_plan_json`, `workout_json`, `workout_element_json`, `workout_session_json`, `training_plan_item_json`, `exercise_json`; client: `training_plan_json`, `workout_session_json`, `exercise_json`); any controller passing removed fields (session/performed-set controllers); OpenApiSpex `open_api/schemas/{training_plan,training_children,exercise,training_reference}.ex`.

- [ ] **Step 1: JSON views — field renames**
  - Plan views: `author_id`→`creator_id`; `original_template_id`→`source_template_id`; remove `rest_days`; `plan_items` rendering uses `day_of_week` (not `day`/`workout_type`).
  - Plan-item / schedule view: render `day_of_week`, `training_workout_id` (drop `workout_type`).
  - Workout-element view: render `position`, `superset_group_id`, `notes`, `planned_sets` (each set: `set_type, reps, load_value, load_unit, duration_seconds, distance_value, distance_unit, rpe, rest_seconds, notes` — drop `target_reps`/`intensity_target`/`tempo`; add `set_type`/`rpe`).
  - Session view: add `date`, `training_schedule_entry_id`; performed-set rendering uses `reps` (not `actual_reps`), adds `set_type`/`exercise_name`, drops `intensity_felt`/`rir`/`tempo_actual`/`workout_element_id`.
  - Exercise view: add `source`, `tracking_type`.
  - Confirm no `business_id` is rendered (it isn't today — keep it that way).

- [ ] **Step 2: Controllers — drop removed fields**
  - Wherever a controller passes `workout_element_id` into performed-set create, remove it (the field is gone). Otherwise controllers pass `conn.body_params`/params through unchanged — they keep calling the same (business_id-first) context fns with the same arities.

- [ ] **Step 3: OpenApiSpex — field/vocabulary renames**
  - `training_plan.ex`: drop `rest_days`, rename `author_id`→`creator_id`, `original_template_id`→`source_template_id`; the embedded set schema fields → the new vocabulary (`set_type`, `reps`, `rpe`, etc.); `plan_items` field renders `day_of_week`. (Module/title renames like `PlanItem`→`ScheduleEntry` are Plan 2 — keep module names here, just fix fields.)
  - `training_children.ex`: `WorkoutElement*`/`PlanItemRequest` field renames (`target_reps`→`reps`, add `set_type`/`rpe`, drop `intensity_target`/`tempo`; plan-item `day`→`day_of_week`, drop `workout_type`).
  - `exercise.ex`: add `source`/`tracking_type` properties.
  - Session/performed-set OpenApiSpex: `actual_reps`→`reps`, add `set_type`/`exercise_name`, drop `intensity_felt`/`rir`/`tempo_actual`/`workout_element_id`; session add `date`.

- [ ] **Step 4: Compile with warnings as errors**

Run: `cd /Users/vikassandhu/Desktop/10x/easy-mono/backend && mix compile --warnings-as-errors 2>&1 | tail -20`
Expected: exit 0. Fix any leftover stale reference (`actual_reps`, `workout_type`, `rest_days`, `author_id`, `original_template_id`, `workout_element_id`, `target_reps`, `intensity_target`).

- [ ] **Step 5: Commit**

```bash
git add backend/lib/easy_web
git commit -m "feat: update training web layer to canonical field names"
```

---

## Task 7: Update factories and tests

**Files:** `backend/test/support/factory.ex`; `test/easy/training/*`; the training controller tests; `test/easy/training/schema_boundary_test.exs`; `test/easy_web/controllers/training_controller_boundary_test.exs`.

- [ ] **Step 1: Factories** — update the training factories to the new fields:
  - `exercise_factory` / `exercise_attrs_factory`: add `source: "custom"`, `tracking_type: "weight_reps"`.
  - `training_plan_factory` / attrs: drop `rest_days`; `author`→`creator`; `original_template`→`source_template` (if referenced).
  - plan-item factory (`training_plan_item`/schedule): `day_of_week` (drop `workout_type`).
  - workout-element factory: `planned_sets` with new fields (`set_type`/`reps`/`rpe`/etc.).
  - performed-set factory: `reps` (not `actual_reps`), `set_type`, `exercise_name`, `position`; drop `intensity_felt`/`rir`/`tempo_actual`/`workout_element`.
  - session factory: add `date`; rename `workout`→`workout` (assoc unchanged) via `training_workout_id`.
  - Build clients with explicit `user: insert(:user)` where needed to avoid the `users_email_index` sandbox collision (the established pattern).

- [ ] **Step 2: Schema/boundary tests**
  - `test/easy/training/schema_boundary_test.exs`: the hardcoded `@schema_paths` list is unchanged (files keep their names in Plan 1) — verify it still lists the 10 `lib/easy/training/*.ex` files; no path change needed.
  - `test/easy_web/controllers/training_controller_boundary_test.exs`: controller file names are unchanged in Plan 1 — verify the list still matches; no change needed.
  - `performed_set_test.exs`, `plan_item_test.exs`, `training_plan_test.exs`: update to new fields/vocabulary (`reps`, `set_type`, `day_of_week`, `source`, `tracking_type`; drop `workout_type`/`rest_days`/`actual_reps`/`workout_element_id`).

- [ ] **Step 3: Controller tests** — update request/response assertions to the new field names across the coach/client training controller tests + the OpenApi tests (`exercise_open_api_test`, `training_plan_open_api_test`, `training_reference_open_api_test`). Adjust any test that asserted the old overlap/rest-day behavior or owned-only exercise-in-workout to the new behavior (DB overlap constraint; system exercises allowed in workouts).

- [ ] **Step 4: Run the training suite**

Run:
```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono/backend && mix test test/easy/training test/easy_web/controllers/coaches/training_plan_controller_test.exs test/easy_web/controllers/coaches/training_plan_item_controller_test.exs test/easy_web/controllers/coaches/workout_controller_test.exs test/easy_web/controllers/coaches/workout_element_controller_test.exs test/easy_web/controllers/coaches/workout_session_controller_test.exs test/easy_web/controllers/coaches/exercise_controller_test.exs test/easy_web/controllers/clients/training_plan_controller_test.exs test/easy_web/controllers/clients/workout_session_controller_test.exs test/easy_web/controllers/clients/exercise_controller_test.exs
```
Expected: all pass. Fix failures by following each to the renamed field.

- [ ] **Step 5: Commit**

```bash
git add backend/test
git commit -m "test: update training factories and tests to canonical schema"
```

---

## Task 8: Final verification

**Files:** none.

- [ ] **Step 1: Reset DB from scratch**

Run: `cd /Users/vikassandhu/Desktop/10x/easy-mono/backend && MIX_ENV=test mix ecto.reset`
Expected: all migrations (incl. `20260623000000_recreate_training_tables.exs`) run clean.

- [ ] **Step 2: Full compile + full suite**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono/backend && mix compile --warnings-as-errors && mix test
```
Expected: exit 0; all tests pass. Fix any non-training test that touched the old training tables/fields.

- [ ] **Step 3: Verify the DB guarantees exist**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono/backend && mix run --no-start -e '
{:ok, _} = Application.ensure_all_started(:easy)
q = "SELECT conname FROM pg_constraint WHERE conname LIKE '"'"'training_%'"'"' AND contype in ('"'"'x'"'"','"'"'u'"'"','"'"'c'"'"') ORDER BY 1"
Easy.Repo.query!(q).rows |> List.flatten() |> Enum.each(&IO.puts/1)
'
```
Expected: includes `training_plans_no_overlapping_active` (exclusion), the unique indexes (schedule day, workout-exercise position, performed-set position, active-session, exercise name/business), and the enum CHECK constraints.

- [ ] **Step 4: Diff hygiene**

```bash
git diff --check && git status --short
```
Expected: no whitespace errors; only intended files changed.

- [ ] **Step 5: Whole-branch review** — run the final whole-feature review (per the executing skill) over this plan's commits; address Critical/Important before declaring done.

---

## Self-review

**Spec coverage (training data layer):**
- `training_`-prefixed tables incl. join tables; structural FKs prefixed, `exercise_id` bare — Task 1, Tasks 2–3.
- Single set vocabulary, set-per-row (embedded `planned_sets` + `training_performed_sets`); `rpe` 1–10 both sides; `rest_seconds` planned-only; `position`/`completed`/`exercise_name` performed-only — Task 2.
- Enums (set_type/load_unit/distance_unit/source/tracking_type/mechanics/force/status/state/day_of_week) as `:string` + CHECK + `validate_inclusion`; trimmed `load_unit`/`distance_unit` — Tasks 1–3.
- `training_schedule_entries` (day_of_week, one-per-day), no `workout_type`/`rest_days`; `source_template_id` rename — Tasks 1, 3, 5.
- `training_workout_exercises` with embedded `planned_sets` — Tasks 1, 3.
- `training_sessions`: `date`, `training_schedule_entry_id`, snapshot-once + `{"exercises":[...]}` shape; `training_performed_sets` with `exercise_name` + soft `exercise_id` (`nilify_all`) — Tasks 1, 3, 5.
- Exercises `source` + read-only-via-copy (copy fn exists; endpoint Plan 2), `tracking_type`, muscles/equipment joins — Tasks 2, 4.
- DB guarantees (EXCLUDE active-overlap, unique schedule day, unique workout-exercise position, unique performed-set position, one active session, unique exercise name/business) — Task 1 + changeset translations in Tasks 3, 5.
- Active-plan-for-date read (`/today` backing) — Task 5.

**Type consistency:** `PlannedSet.changeset/2` + `to_snapshot/1` are produced in Task 2 and consumed by `WorkoutElement` (Task 3) + the Sessions snapshot builder (Task 5). `PerformedSet.insert_changeset/3` (Task 2) is called by `Sessions.create_performed_set` (Task 5). `PlanItem.insert_changeset/4` (Task 3) is called by `TrainingPlans.create_plan_item` (Task 5). Module names are unchanged throughout Plan 1 (tables differ); FK fields are the prefixed names (`training_*_id`) consistently across schemas, contexts, and the migration.

**Deferred to Plan 2 (training API restructure):** kebab `training-` paths; `GET/PUT /schedule/:day`; exercise `copy` endpoint; `training-sessions` logging endpoints + coach read-only client sessions; removing the out-of-spec endpoints (workout duplicate, standalone workout_elements CRUD, plan_items CRUD, session complete/discard, exercise duplicate); Ctx-first conversion of all four contexts; module renames; OpenApiSpex renames; strict request validation; `tracking_type`-driven required-set-field validation. Threads/attention reuse is in the nutrition spec (threads done; attention not built).
