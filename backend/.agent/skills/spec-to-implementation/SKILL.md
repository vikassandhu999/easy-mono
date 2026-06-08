# Skill: Spec to Implementation

## When to use

- A spec or design doc describes backend changes (new entities, fields, endpoints, behaviors).
- The user says "implement this spec," "build the backend for X," or shares a UX/product spec that implies data model changes.
- A frontend-facing spec mentions data shapes, schema changes, or new API surfaces.

## When NOT to use

- A bug fix in existing code with no spec — just fix it.
- A refactor with no behavior change — use the refactor skill (separate).
- A pure frontend task with no backend impact.

---

## Phase 1: Plan

### Read the spec end-to-end first

Never start implementing from the first paragraph. Specs are written narratively but executed in dependency order. Read everything before writing a task list.

### Decompose into task categories

Every spec change maps to one or more of these categories. Walk the spec and tag each change.

| Category | What to look for | Output |
|----------|-----------------|--------|
| Schema | New entities, renames, field add/remove/rename, relationship changes | Migration + schema module changes |
| Data migration | Renames, type changes, splits/merges of existing data | Backfill in the migration |
| Domain logic | New changesets, new queries, new actions on a schema | Functions in the schema module |
| Service workflow | Cross-schema operations, transactions spanning entities | New service module function |
| Endpoint | New routes, request/response shape changes, status code changes | Controller + router + JSON view |
| Contract | Any endpoint or schema type change | `docs/api_contract.yaml` update |
| Tests | Every behavior change, every new function | Schema/service/controller tests |

A single spec sentence often spans multiple categories. "Add a `rest_days` field to TrainingPlan" = schema change + migration + changeset update + JSON view update + contract update + tests.

### Sequence tasks by dependency

Order is fixed:

1. Migrations (database structure)
2. Schema modules (fields, relationships, changesets, queries)
3. Service modules (cross-schema workflows — only if needed)
4. Controllers (thin, call schema/service)
5. Router (new routes)
6. JSON views (response shapes)
7. Contract update (`docs/api_contract.yaml`)
8. Tests (write last, but THINK about them throughout)

You can't write a controller that calls a function that doesn't exist. You can't write a query that references a column that hasn't been added.

### Identify breaking changes upfront

Mark each task as breaking or non-breaking. Breaking includes:
- Renamed columns or tables
- Removed fields from API responses
- Changed request shapes (required → optional doesn't break, optional → required does)
- Changed status codes
- Changed status enum values

Breaking changes cluster together — surface them in the plan output so the human sees the blast radius.

### Surface ambiguities before coding

If the spec doesn't answer:
- What happens to existing data when a field is renamed/removed?
- What's the validation for a new field?
- What's the response shape for a new endpoint?
- Should X cascade on delete?

Don't guess. Ask the human. One round of clarifying questions is cheaper than implementing the wrong thing.

### Plan output format

Print the plan before implementing. Format:

```
PLAN

Migrations (1)
  M1. Rename planned_workouts → workouts, drop day_number, add training_plan_items table.
      Data migration: backfill PlanItems from old day_number values.
      BREAKING.

Schemas (3)
  S1. Rename Easy.Training.PlannedWorkout → Easy.Training.Workout. Drop day_number field.
  S2. New module Easy.Training.PlanItem (mirrors Easy.Nutrition.PlanItem).
  S3. Update Easy.Training.TrainingPlan: change rest_days from integer[] to string[].

Endpoints (5)
  E1. POST /v1/coach/training_plans/:plan_id/plan_items — create assignment.
  E2. PATCH /v1/coach/training_plan_items/:id — update assignment.
  E3. DELETE /v1/coach/training_plan_items/:id — remove assignment.
  E4. POST /v1/coach/training_plans/:plan_id/plan_items/copy_day — copy day's items.
  E5. Existing PUT/POST routes for planned_workouts → renamed to workouts. BREAKING.

Contract (1)
  C1. Update docs/api_contract.yaml: rename PlannedWorkout schema → Workout, add TrainingPlanItem,
      update all training endpoints. BREAKING.

Tests (4)
  T1. Schema test: Easy.Training.Workout (replaces planned_workout_test.exs)
  T2. Schema test: Easy.Training.PlanItem
  T3. Updated tests: Easy.Training.TrainingPlan (new rest_days type, plan_items relation)
  T4. Controller test: PlanItem CRUD endpoints

Order: M1 → S1 → S2 → S3 → E1-E5 → C1 → T1-T4
```

Wait for human confirmation before executing if the plan has 5+ tasks or any breaking changes. For small plans (1-2 tasks), proceed directly.

---

## Phase 2: Execute

Apply AGENTS.md throughout — every rule there applies here. This section covers task-specific patterns the AGENTS.md doesn't cover.

### Migrations

- One migration per logical change. Don't bundle "add column X" with "rename table Y" in the same migration unless they're truly atomic.
- Sequence inside a single migration matters: create new tables → backfill data → drop old columns → rename. Never the reverse.
- Data migration in the migration itself, not in a separate seed file. Rolling back the migration must roll back the data too.
- For renames that move data between columns: read FROM the old column, write TO the new column, THEN drop the old column. Never drop first.
- After a column rename or drop, also update `priv/repo/structure.sql` is regenerated by Ecto — don't hand-edit.

```elixir
# GOOD: data backfill before drop
def change do
  create table(:training_plan_items, primary_key: false) do
    add :id, :binary_id, primary_key: true
    add :day, :string, null: false
    add :workout_type, :string, null: false
    # ...
  end

  flush()

  execute("""
    INSERT INTO training_plan_items (id, day, workout_type, workout_id, ...)
    SELECT gen_random_uuid(),
           CASE day_number WHEN 1 THEN 'monday' WHEN 2 THEN 'tuesday' ... END,
           'primary', id, ...
    FROM planned_workouts
  """, "DELETE FROM training_plan_items")

  alter table(:planned_workouts) do
    remove :day_number
  end

  rename table(:planned_workouts), to: table(:workouts)
end
```

### Schema modules

Follow the AGENTS.md ordering: fields → relationships → changesets → queries → actions.

For a NEW schema:
1. Define fields (match the spec exactly — same names, same types).
2. Define relationships (`belongs_to`, `has_many`).
3. Write `insert_changeset/N` and `update_changeset/2`. Never write a generic `changeset/2`.
4. Write atomic, composable query functions. Each one does ONE thing.
5. Write actions for non-trivial operations (transactions, cross-schema work).

For a RENAMED schema:
1. Update the module name in the file.
2. Update the `schema "table_name"` line.
3. Update every `alias` and reference across the codebase. Use grep — don't trust IDE refactoring alone.
4. Update test module name.
5. Don't keep the old name as an alias for "compatibility." Breaking changes are clean.

### Service modules

Only when:
- The operation spans multiple schemas in a transaction.
- The operation has business logic that doesn't belong on any single schema.
- The operation orchestrates multiple changesets with rollback.

For everything else, the schema module handles it.

```elixir
# GOOD: schema action for single-entity operation
defmodule Easy.Training.Workout do
  def duplicate(workout) do
    workout
    |> Repo.preload(:workout_elements)
    |> # ... duplicate logic
  end
end

# GOOD: service for cross-schema operation
defmodule Easy.Training do
  def copy_day(plan, source_day, target_day) do
    Repo.transaction(fn ->
      # touches PlanItem, may touch Workout, validates against TrainingPlan
    end)
  end
end
```

### Controllers

Per AGENTS.md: thin, no Repo, no business logic. Only:
- Pull params from `conn.body_params` and `conn.assigns.claims`.
- Call schema or service function.
- Render the response.
- Translate domain errors to HTTP errors via `Easy.Error`.

```elixir
# GOOD
def create(conn, %{"plan_id" => plan_id} = params) do
  business_id = conn.assigns.claims.business_id
  user_id = conn.assigns.claims.user_id

  with {:ok, item} <- Training.PlanItem.create(plan_id, business_id, user_id, params) do
    conn |> put_status(:created) |> render(:show, plan_item: item)
  end
end
```

If you find yourself writing more than 10 lines in a controller action, the logic belongs in the schema or service.

### Router

- Group routes by resource and scope (`/v1/coach/...`, `/v1/client/...`).
- Use Phoenix's `resources` macro when CRUD is uniform; explicit routes when it isn't.
- New routes go alongside existing related routes — don't scatter them.

### JSON views

- One view module per resource (`ResourceJSON`).
- Functions: `index/1`, `show/1`, plus any spec-specific responses (`summary/1`).
- Pure data shaping — no DB calls, no logic beyond formatting (dates, decimals, nil handling).
- Match the field names in `docs/api_contract.yaml` exactly.

### Contract update (`docs/api_contract.yaml`)

Per AGENTS.md, mandatory for any endpoint or schema type change. Read `docs/api_contract_rules.md` first if you haven't recently — its rules supersede anything in this skill.

Common updates after a spec change:
- New schema type → add to `components.schemas`
- Renamed schema type → rename in `components.schemas` AND every `$ref` that points to it
- New endpoint → add to `paths` with full request/response definition
- Renamed endpoint → remove the old path entry, add the new one (no aliases)
- Field added to a response → add to the schema definition with type and example
- Field removed → remove from the schema (BREAKING — flag in the plan)

### Tests

Per AGENTS.md: SchemaCase, factories, both success and failure paths.

- One test file per schema/controller/service module.
- Schema tests cover: each changeset (valid + invalid cases), each query (composability), each action (happy path + key failure).
- Controller tests cover: each endpoint (auth, success, common errors).
- For breaking changes: delete the old test file, write a fresh one. Don't keep dead tests "for reference."
- Use factories for setup. Never `Repo.insert!` with raw structs.

```elixir
# GOOD: per-changeset test
describe "insert_changeset/3" do
  test "valid with required fields" do
    cs = Workout.insert_changeset(plan_id, business_id, %{name: "Push Day"})
    assert cs.valid?
  end

  test "invalid without name" do
    cs = Workout.insert_changeset(plan_id, business_id, %{})
    refute cs.valid?
    assert "can't be blank" in errors_on(cs).name
  end
end
```

---

## Verification checklist

Before declaring the implementation complete, walk this list:

### Schema
- [ ] All public functions have `@spec`.
- [ ] No `@moduledoc` or `@doc`.
- [ ] No generic `changeset/2` — operation-specific only.
- [ ] Queries take `Ecto.Query` as first arg, return `Ecto.Query`. No `Repo` calls inside.
- [ ] No `list/get/paginate` wrappers in the schema.
- [ ] `business_id` and `user_id` set via `put_change`, never in `cast`.

### Migration
- [ ] `mix ecto.migrate` succeeds on a fresh DB.
- [ ] `mix ecto.rollback` undoes cleanly.
- [ ] Data migration backfills BEFORE any column is dropped.
- [ ] `priv/repo/structure.sql` regenerated and committed.

### Endpoint
- [ ] Controller is thin (no `Repo`, no business logic, < 15 lines per action).
- [ ] Every query that loads tenant data filters by `business_id`.
- [ ] Associations preloaded — no N+1.
- [ ] Returns `{:ok, _} | {:error, _}` from the layer below.
- [ ] User input never passed to `String.to_atom/1`.

### Contract
- [ ] `docs/api_contract.yaml` updated for every endpoint and schema change.
- [ ] Contract validates (per `docs/api_contract_rules.md`).
- [ ] No orphaned `$ref` pointers to deleted schemas.

### Tests
- [ ] New tests pass.
- [ ] Old tests for renamed/deleted modules removed.
- [ ] Both success AND failure paths covered for each changeset.
- [ ] Factories used (no raw `Repo.insert!`).

### Cross-cutting
- [ ] All renamed entities updated everywhere — `grep` for old names returns nothing in `lib/` and `test/`.
- [ ] No `HTTPoison`, `Tesla`, `:httpc` introduced — use `Req`.
- [ ] `mix compile --warnings-as-errors` clean.
- [ ] `mix format --check-formatted` clean.
- [ ] `mix credo --strict` clean (or document any deferred items).

---

## Common pitfalls

**Treating the spec as gospel on field names.** Specs use product language. Backend uses code language. "Workout" in the spec might mean `Easy.Training.Workout` the module, but the URL path might be `/workouts`, the JSON key might be `workouts`, the table might be `workouts`. Validate the naming consistency BEFORE implementing.

**Missing the data migration.** A field rename without backfill loses data. A type change (`integer[]` → `string[]`) without conversion loses data. Always check: "what happens to existing rows?"

**Implementing in spec order, not dependency order.** The spec might describe the controller change first because that's what the user sees. The implementation order is migration → schema → controller. Resist following the spec's narrative order.

**Assuming the spec is complete.** Specs describe the happy path well, edge cases poorly. List the edge cases the spec DIDN'T cover (delete cascade, validation rules, conflict handling) and either ask the human or apply project conventions consistently.

**Skipping the contract update.** Easy to forget because it doesn't affect runtime behavior. AGENTS.md mandates it. The frontend coder reads the contract — outdated contract means broken integration.

**Keeping deleted code "for reference."** When a spec is breaking (the user says so), commit fully to the new design. Don't leave commented-out old changesets or aliases. The git history is the reference.

**Bundling unrelated changes.** A spec might describe 5 separate features. Implementing them all in one commit makes review impossible. One logical change per commit, even if you do them in sequence.