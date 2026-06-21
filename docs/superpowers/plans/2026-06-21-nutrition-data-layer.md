# Nutrition Data Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reshape the existing Elixir nutrition layer to match `docs/superpowers/specs/2026-06-20-coaching-profile-nutrition-schema-api-design.md`: `nutrition_`-prefixed tables, the canonical macro vocabulary (per-100g columns on foods, `target_*` on plans, `calories/protein_g/carbs_g/fat_g/fiber_g` on logs, derived totals for meals/recipes), the `nutrition_schedule_entries` table, and the spec's database guarantees.

**Architecture:** This is **Plan 1 of 2** for the nutrition slice. Plan 1 is the **data + computation layer**: it drops and recreates the nutrition tables cleanly (no data preserved — pre-production), rewrites the Ecto schemas and the `Easy.MacroCalc` computation module, updates the five contexts (`Easy.NutritionPlans`, `Easy.MealLogs`, `Easy.Meals`, `Easy.Foods`, `Easy.Recipes`), and updates the web layer (renderers, OpenApiSpex field schemas) only as much as needed to keep the app compiling and the existing test suite green. **Routes stay snake_case.** The kebab-case path restructure, the `GET/PUT /schedule/:day` endpoints, and the new `impact`/`copy` endpoints are **Plan 2**.

The existing coach endpoints not in the spec — `copy-day`, `shopping-list`, `macros` — are **removed** in this plan (routes, controller actions, context functions, and tests).

**Tech Stack:** Phoenix controllers/JSON views, Ecto schemas/migrations, Postgres constraints (unique indexes, CHECK constraints, a `btree_gist` EXCLUDE constraint), OpenApiSpex schemas, ExMachina factories, ExUnit.

## Global Constraints

Copied verbatim from the spec; every task's requirements implicitly include these.

- **Table names** are nutrition-prefixed: `nutrition_plans`, `nutrition_meals`, `nutrition_meal_items`, `nutrition_schedule_entries`, `nutrition_foods`, `nutrition_recipes`, `nutrition_recipe_ingredients`, `nutrition_meal_logs`, `nutrition_food_log_entries`.
- **One nutrition vocabulary.** Food reference data stores per-100g values: `calories_per_100g`, `protein_g_per_100g`, `carbs_g_per_100g`, `fat_g_per_100g`, `fiber_g_per_100g`. Targets, planned amounts, logged amounts, and snapshots store actual totals: `calories`, `protein_g`, `carbs_g`, `fat_g`, `fiber_g`. Do not accept alternate names like `protein`, `protein_per_100g`, or loose macro maps. Micronutrients are out of scope.
- **All nutrition math resolves to grams.** `amount` and `unit` are display/input fields. `weight_g` is the calculation value. If the backend cannot resolve `weight_g`, reject the write.
- **Database guarantees** (must survive concurrent writes): one active assigned nutrition plan per client/date range; one `nutrition_schedule_entries` row per plan/day/slot; exactly one of `food_id` or `recipe_id` on meal items and food log entries; positive `weight_g` where nutrition math is required; one `nutrition_meal_logs` row per client/date/meal slot.
- **Meal slots:** `breakfast`, `morning_snack`, `lunch`, `afternoon_snack`, `dinner`, `evening_snack`.
- **Weekdays:** `monday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday`, `sunday`.
- **Fixed allergen enum:** `dairy`, `egg`, `fish`, `shellfish`, `tree_nuts`, `peanuts`, `wheat`, `soy`, `sesame`.
- **Fixed dietary tag enum:** `vegan`, `vegetarian`, `halal`, `kosher`, `gluten_free`, `dairy_free`, `low_fodmap`, `keto`, `high_protein`.
- **Food `source` enum:** `system`, `imported`, `custom`.
- **Plan `status` enum:** `active`, `archived`. `client_id IS NULL` means template; set means assigned client copy.
- **Food log entry `source` enum:** `planned`, `replacement`, `unplanned`.
- Backend rules from `backend/AGENTS.md`: every tenant-owned query scoped by `business_id`; controllers never call `Repo`; schemas never call `Repo`; trusted IDs set with `put_change/3`, never `cast`; `@spec` on every public function; no `@moduledoc`/`@doc`; the `lib/easy/nutrition/` directory holds **only Ecto schemas** (enforced by `test/easy/nutrition/schema_boundary_test.exs`).

---

## Build order and compile expectations

Because Elixir compiles the whole app, a half-renamed tree does not compile. This refactor goes red across the suite mid-flight and returns green at the end. The reliable checkpoints are:

- **End of Task 1:** `Easy.MacroCalc` + its unit test pass in isolation.
- **End of Task 2:** the migration runs; the new tables exist (verified by SQL).
- **End of Task 5:** first full `mix compile --warnings-as-errors` success.
- **End of Task 6:** full nutrition test suite green.
- **Task 7:** whole-suite verification + OpenAPI render.

Tasks 3–5 are written so the executor changes schemas → contexts → web layer in that order; do not expect a clean compile until Task 5 completes.

## File structure

**Create:**
- `backend/priv/repo/migrations/20260621120000_recreate_nutrition_tables.exs` — drops the old unprefixed tables and creates the spec-shaped `nutrition_*` tables with all constraints/indexes.
- `backend/test/easy/macro_calc_test.exs` — unit tests for the rewritten computation module.

**Modify (rewrite):**
- `backend/lib/easy/macro_calc.ex` — per-100g + derivation computation; canonical vocabulary only.
- `backend/lib/easy/nutrition/food.ex`, `recipe.ex`, `recipe_ingredient.ex`, `serving_size.ex`, `plan.ex`, `meal.ex`, `meal_item.ex`, `plan_item.ex`, `meal_log.ex`, `food_log_entry.ex` — new table names, fields, enums, constraints.

**Modify (edit):**
- Contexts: `backend/lib/easy/nutrition_plans.ex`, `backend/lib/easy/meal_logs.ex`, `backend/lib/easy/meals.ex`, `backend/lib/easy/recipes.ex` (preload only).
- Web: `backend/lib/easy_web/router.ex`; coach controllers/JSON `nutrition_plan_controller.ex`, `nutrition_plan_json.ex`, `food_json.ex`, `recipe_json.ex`, `meal_json.ex`, `meal_item_json.ex`, `plan_item_json.ex`; client controllers/JSON `nutrition_plan_json.ex`, `food_json.ex`, `recipe_json.ex`, `meal_log_json.ex`, `food_log_entry_json.ex`; OpenApiSpex `nutrition.ex`, `nutrition_food.ex`.
- Tests + factory: `backend/test/support/factory.ex` and the nutrition test files listed in Task 6.

**Module-name note:** Plan 1 keeps the existing Elixir module names (`Easy.Nutrition.PlanItem`, `Easy.Nutrition.Plan`, etc.) and only changes the `schema "..."` table strings, fields, and columns. Renaming `PlanItem` → `ScheduleEntry` (module/file) is deferred to Plan 2 so this plan's churn stays mechanical and the schema-boundary test paths stay valid.

---

## Task 1: Rewrite `Easy.MacroCalc` to the canonical vocabulary

Replace the loose-map computation (which accepted both `protein` and `protein_g`) with computation from a food's per-100g columns, plus derivation of recipe and meal totals. This is the only genuinely new logic; everything else in the plan is rename/mechanical.

**Files:**
- Modify: `backend/lib/easy/macro_calc.ex`
- Test: `backend/test/easy/macro_calc_test.exs`

**Interfaces:**
- Consumes: `Easy.Nutrition.Food` (fields `*_per_100g`), `Easy.Nutrition.Recipe` (`recipe_ingredients` → `food`, `cooked_weight_g`), `Easy.Nutrition.MealItem` (`food`/`recipe`/`weight_g`) — all defined in Task 3. This task is written first so the contexts/renderers in Tasks 4–5 can call it, but it only **compiles** once Task 3's schemas exist. Run its test after Task 3 if compilation fails standalone.
- Produces (used by Tasks 4 and 5):
  - `MacroCalc.for_food(%Food{}, weight_g :: float()) :: %{calories: float(), protein_g: float(), carbs_g: float(), fat_g: float(), fiber_g: float()}`
  - `MacroCalc.recipe_totals(%Recipe{}) :: macro_map` (sum of ingredient contributions)
  - `MacroCalc.for_recipe(%Recipe{}, weight_g :: float()) :: macro_map`
  - `MacroCalc.for_meal_item(%MealItem{}) :: macro_map`
  - `MacroCalc.meal_totals([%MealItem{}]) :: macro_map`
  - `MacroCalc.macro_keys() :: [atom()]`

- [ ] **Step 1: Write the failing test**

Create `backend/test/easy/macro_calc_test.exs`:

```elixir
defmodule Easy.MacroCalcTest do
  use ExUnit.Case, async: true

  alias Easy.MacroCalc
  alias Easy.Nutrition.Food
  alias Easy.Nutrition.MealItem
  alias Easy.Nutrition.Recipe
  alias Easy.Nutrition.RecipeIngredient

  defp food(attrs) do
    struct(
      %Food{
        calories_per_100g: 0.0,
        protein_g_per_100g: 0.0,
        carbs_g_per_100g: 0.0,
        fat_g_per_100g: 0.0,
        fiber_g_per_100g: 0.0
      },
      attrs
    )
  end

  test "for_food scales per-100g values by weight" do
    chicken = food(calories_per_100g: 165.0, protein_g_per_100g: 31.0, fiber_g_per_100g: 0.0)

    assert MacroCalc.for_food(chicken, 200.0) == %{
             calories: 330.0,
             protein_g: 62.0,
             carbs_g: 0.0,
             fat_g: 0.0,
             fiber_g: 0.0
           }
  end

  test "for_food treats nil weight as zero" do
    assert MacroCalc.for_food(food(calories_per_100g: 100.0), nil) ==
             %{calories: 0.0, protein_g: 0.0, carbs_g: 0.0, fat_g: 0.0, fiber_g: 0.0}
  end

  test "recipe_totals sums ingredient contributions" do
    rice = food(calories_per_100g: 130.0, carbs_g_per_100g: 28.0, fiber_g_per_100g: 0.4)
    chicken = food(calories_per_100g: 165.0, protein_g_per_100g: 31.0)

    recipe = %Recipe{
      cooked_weight_g: 300.0,
      recipe_ingredients: [
        %RecipeIngredient{food: rice, weight_g: 100.0},
        %RecipeIngredient{food: chicken, weight_g: 200.0}
      ]
    }

    assert MacroCalc.recipe_totals(recipe) == %{
             calories: 460.0,
             protein_g: 62.0,
             carbs_g: 28.0,
             fat_g: 0.0,
             fiber_g: 0.4
           }
  end

  test "for_recipe scales totals by weight over cooked_weight_g" do
    recipe = %Recipe{
      cooked_weight_g: 300.0,
      recipe_ingredients: [
        %RecipeIngredient{food: food(calories_per_100g: 130.0), weight_g: 300.0}
      ]
    }

    # totals = 390 cal over 300 g cooked → 150 g serving = 195 cal
    assert MacroCalc.for_recipe(recipe, 150.0).calories == 195.0
  end

  test "for_meal_item dispatches on food vs recipe" do
    item = %MealItem{food: food(calories_per_100g: 200.0), recipe: nil, weight_g: 50.0}
    assert MacroCalc.for_meal_item(item).calories == 100.0
  end

  test "meal_totals sums items" do
    items = [
      %MealItem{food: food(calories_per_100g: 100.0), weight_g: 100.0},
      %MealItem{food: food(calories_per_100g: 200.0), weight_g: 100.0}
    ]

    assert MacroCalc.meal_totals(items).calories == 300.0
  end
end
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && mix test test/easy/macro_calc_test.exs`
Expected: FAIL — `MacroCalc.for_food/2` is undefined (and/or `Food` fields do not exist yet). If it fails to compile because the schema fields are missing, that is expected; re-run after Task 3.

- [ ] **Step 3: Rewrite `macro_calc.ex`**

Replace the entire contents of `backend/lib/easy/macro_calc.ex` with:

```elixir
defmodule Easy.MacroCalc do
  alias Easy.Nutrition.Food
  alias Easy.Nutrition.MealItem
  alias Easy.Nutrition.Recipe
  alias Easy.Nutrition.RecipeIngredient

  @macros [:calories, :protein_g, :carbs_g, :fat_g, :fiber_g]
  @zero %{calories: 0.0, protein_g: 0.0, carbs_g: 0.0, fat_g: 0.0, fiber_g: 0.0}

  @type macros :: %{
          calories: float(),
          protein_g: float(),
          carbs_g: float(),
          fat_g: float(),
          fiber_g: float()
        }

  @spec macro_keys() :: [atom()]
  def macro_keys, do: @macros

  @spec for_food(Food.t(), float() | nil) :: macros()
  def for_food(%Food{} = food, weight_g) do
    factor = num(weight_g) / 100.0

    %{
      calories: round1(num(food.calories_per_100g) * factor),
      protein_g: round1(num(food.protein_g_per_100g) * factor),
      carbs_g: round1(num(food.carbs_g_per_100g) * factor),
      fat_g: round1(num(food.fat_g_per_100g) * factor),
      fiber_g: round1(num(food.fiber_g_per_100g) * factor)
    }
  end

  @spec recipe_totals(Recipe.t()) :: macros()
  def recipe_totals(%Recipe{recipe_ingredients: ingredients}) when is_list(ingredients) do
    ingredients
    |> Enum.reduce(@zero, fn
      %RecipeIngredient{food: %Food{} = food, weight_g: weight_g}, acc ->
        add(acc, for_food(food, weight_g))

      _ingredient_without_loaded_food, acc ->
        acc
    end)
    |> round_all()
  end

  def recipe_totals(_recipe), do: @zero

  @spec for_recipe(Recipe.t(), float() | nil) :: macros()
  def for_recipe(%Recipe{} = recipe, weight_g) do
    totals = recipe_totals(recipe)

    case recipe.cooked_weight_g do
      cooked when is_number(cooked) and cooked > 0 ->
        round_all(scale(totals, num(weight_g) / cooked))

      # ponytail: without cooked_weight_g we cannot resolve per-gram macros,
      # so return the whole-recipe totals. Plan 2 / UX should require cooked_weight_g.
      _ ->
        totals
    end
  end

  @spec for_meal_item(MealItem.t()) :: macros()
  def for_meal_item(%MealItem{food: %Food{} = food, weight_g: weight_g}), do: for_food(food, weight_g)

  def for_meal_item(%MealItem{recipe: %Recipe{} = recipe, weight_g: weight_g}),
    do: for_recipe(recipe, weight_g)

  def for_meal_item(_item), do: @zero

  @spec meal_totals([MealItem.t()]) :: macros()
  def meal_totals(items) when is_list(items) do
    items
    |> Enum.reduce(@zero, fn item, acc -> add(acc, for_meal_item(item)) end)
    |> round_all()
  end

  def meal_totals(_), do: @zero

  defp add(a, b), do: Map.new(@macros, fn k -> {k, Map.fetch!(a, k) + Map.fetch!(b, k)} end)
  defp scale(m, factor), do: Map.new(@macros, fn k -> {k, Map.fetch!(m, k) * factor} end)
  defp round_all(m), do: Map.new(@macros, fn k -> {k, round1(Map.fetch!(m, k))} end)
  defp round1(value), do: Float.round(value * 1.0, 1)
  defp num(nil), do: 0.0
  defp num(value) when is_number(value), do: value * 1.0
end
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && mix test test/easy/macro_calc_test.exs`
Expected: PASS once Task 3's schemas are in place. (If `Food`/`Recipe`/`MealItem` fields are not yet defined, this test compiles and passes only after Task 3 — note this and proceed; the final gate is Task 7.)

- [ ] **Step 5: Commit**

```bash
git add backend/lib/easy/macro_calc.ex backend/test/easy/macro_calc_test.exs
git commit -m "feat: rewrite MacroCalc to canonical per-100g vocabulary"
```

---

## Task 2: Recreate the nutrition tables (migration)

Drop the old unprefixed tables and create the spec-shaped `nutrition_*` tables. No data is preserved (pre-production, drop & recreate).

**Files:**
- Create: `backend/priv/repo/migrations/20260621120000_recreate_nutrition_tables.exs`

**Interfaces:**
- Produces the table/column/constraint names the Task 3 schemas bind to. Constraint names referenced later: `nutrition_meal_items_food_xor_recipe`, `nutrition_meal_items_weight_positive`, `nutrition_food_log_entries_food_xor_recipe`, `nutrition_food_log_entries_weight_positive`, `nutrition_recipe_ingredients_weight_positive`, `nutrition_plans_no_overlapping_active`, and the unique indexes `nutrition_schedule_entries_nutrition_plan_id_day_of_week_meal_slot_index`, `nutrition_meal_logs_client_id_date_meal_slot_index`, `nutrition_meal_items_nutrition_meal_id_position_index`.

- [ ] **Step 1: Write the migration**

Create `backend/priv/repo/migrations/20260621120000_recreate_nutrition_tables.exs`:

```elixir
defmodule Easy.Repo.Migrations.RecreateNutritionTables do
  use Ecto.Migration

  def up do
    # Drop old tables (dependents first). Drop & recreate clean — no data preserved.
    drop_if_exists table(:food_log_entries)
    drop_if_exists table(:meal_logs)
    drop_if_exists table(:meal_items)
    drop_if_exists table(:plan_items)
    drop_if_exists table(:recipe_ingredients)
    drop_if_exists table(:meals)
    drop_if_exists table(:recipes)
    drop_if_exists table(:foods)
    drop_if_exists table(:plans)

    execute "CREATE EXTENSION IF NOT EXISTS btree_gist"

    # --- nutrition_foods ---
    create table(:nutrition_foods, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :brand, :string
      add :barcode, :string
      add :source, :string
      add :category, :string

      add :calories_per_100g, :float
      add :protein_g_per_100g, :float
      add :carbs_g_per_100g, :float
      add :fat_g_per_100g, :float
      add :fiber_g_per_100g, :float

      add :serving_sizes, {:array, :jsonb}, default: []
      add :allergens, {:array, :string}, default: []
      add :dietary_tags, {:array, :string}, default: []

      add :notes, :text
      add :image_url, :string
      add :import_id, :string

      add :creator_id, references(:coaches, type: :binary_id, on_delete: :nilify_all)
      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing)

      timestamps(type: :utc_datetime)
    end

    create index(:nutrition_foods, [:business_id])
    create index(:nutrition_foods, [:business_id, "lower(name)"])

    execute """
    ALTER TABLE nutrition_foods
    ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (to_tsvector('simple', coalesce(name, ''))) STORED
    """

    execute "CREATE INDEX nutrition_foods_search_vector_idx ON nutrition_foods USING gin (search_vector)"

    # --- nutrition_recipes ---
    create table(:nutrition_recipes, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :description, :text
      add :instructions, :text
      add :servings_count, :integer
      add :cooked_weight_g, :float

      add :serving_sizes, {:array, :jsonb}, default: []
      add :allergens, {:array, :string}, default: []
      add :dietary_tags, {:array, :string}, default: []

      add :creator_id, references(:coaches, type: :binary_id, on_delete: :nilify_all)
      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing)

      timestamps(type: :utc_datetime)
    end

    create index(:nutrition_recipes, [:business_id])

    # --- nutrition_recipe_ingredients ---
    create table(:nutrition_recipe_ingredients, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :amount, :float
      add :unit, :string
      add :weight_g, :float, null: false
      add :position, :integer, default: 0, null: false

      add :recipe_id, references(:nutrition_recipes, type: :binary_id, on_delete: :delete_all),
        null: false

      add :food_id, references(:nutrition_foods, type: :binary_id, on_delete: :nilify_all)
    end

    create index(:nutrition_recipe_ingredients, [:recipe_id])

    create constraint(:nutrition_recipe_ingredients, :nutrition_recipe_ingredients_weight_positive,
             check: "weight_g > 0"
           )

    # --- nutrition_plans ---
    create table(:nutrition_plans, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :description, :text
      add :tags, {:array, :string}, default: []
      add :status, :string, null: false, default: "active"
      add :start_date, :date
      add :end_date, :date

      add :target_calories, :float
      add :target_protein_g, :float
      add :target_carbs_g, :float
      add :target_fat_g, :float
      add :target_fiber_g, :float

      add :creator_id, references(:coaches, type: :binary_id, on_delete: :nilify_all)
      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing), null: false
      add :client_id, references(:clients, type: :binary_id, on_delete: :delete_all)

      add :source_template_id,
          references(:nutrition_plans, type: :binary_id, on_delete: :nilify_all)

      timestamps(type: :utc_datetime)
    end

    create index(:nutrition_plans, [:business_id])
    create index(:nutrition_plans, [:business_id, :client_id])

    # One active assigned plan per client/date range (DB guarantee).
    execute """
    ALTER TABLE nutrition_plans
    ADD CONSTRAINT nutrition_plans_no_overlapping_active
    EXCLUDE USING gist (
      client_id WITH =,
      daterange(start_date, end_date, '[]') WITH &&
    )
    WHERE (client_id IS NOT NULL AND status = 'active')
    """

    # --- nutrition_meals ---
    create table(:nutrition_meals, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :notes, :text
      add :default_meal_slot, :string

      add :nutrition_plan_id,
          references(:nutrition_plans, type: :binary_id, on_delete: :delete_all),
          null: false

      add :creator_id, references(:coaches, type: :binary_id, on_delete: :nilify_all)
      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing), null: false

      timestamps(type: :utc_datetime)
    end

    create index(:nutrition_meals, [:business_id])
    create index(:nutrition_meals, [:nutrition_plan_id])

    # --- nutrition_meal_items ---
    create table(:nutrition_meal_items, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :amount, :float
      add :unit, :string
      add :weight_g, :float, null: false
      add :position, :integer, default: 0, null: false

      add :nutrition_meal_id,
          references(:nutrition_meals, type: :binary_id, on_delete: :delete_all),
          null: false

      add :food_id, references(:nutrition_foods, type: :binary_id, on_delete: :nilify_all)
      add :recipe_id, references(:nutrition_recipes, type: :binary_id, on_delete: :nilify_all)
      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing), null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:nutrition_meal_items, [:nutrition_meal_id, :position])
    create index(:nutrition_meal_items, [:business_id])

    create constraint(:nutrition_meal_items, :nutrition_meal_items_food_xor_recipe,
             check: "num_nonnulls(food_id, recipe_id) = 1"
           )

    create constraint(:nutrition_meal_items, :nutrition_meal_items_weight_positive,
             check: "weight_g > 0"
           )

    # --- nutrition_schedule_entries ---
    create table(:nutrition_schedule_entries, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :day_of_week, :string, null: false
      add :meal_slot, :string, null: false

      add :nutrition_plan_id,
          references(:nutrition_plans, type: :binary_id, on_delete: :delete_all),
          null: false

      add :nutrition_meal_id,
          references(:nutrition_meals, type: :binary_id, on_delete: :delete_all),
          null: false

      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing), null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:nutrition_schedule_entries, [:nutrition_plan_id, :day_of_week, :meal_slot])
    create index(:nutrition_schedule_entries, [:business_id])

    # --- nutrition_meal_logs ---
    create table(:nutrition_meal_logs, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :date, :date, null: false
      add :meal_slot, :string, null: false
      add :planned_snapshot, :map
      add :planned_calories, :float
      add :logged_calories, :float, default: 0

      add :client_id, references(:clients, type: :binary_id, on_delete: :delete_all), null: false
      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing), null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:nutrition_meal_logs, [:client_id, :date, :meal_slot])
    create index(:nutrition_meal_logs, [:business_id, :client_id])

    # --- nutrition_food_log_entries ---
    create table(:nutrition_food_log_entries, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :food_name, :string, null: false
      add :amount, :float
      add :unit, :string
      add :weight_g, :float, null: false

      add :calories, :float
      add :protein_g, :float
      add :carbs_g, :float
      add :fat_g, :float
      add :fiber_g, :float

      add :notes, :string
      add :source, :string, null: false, default: "planned"
      add :planned_item_index, :integer

      add :nutrition_meal_log_id,
          references(:nutrition_meal_logs, type: :binary_id, on_delete: :delete_all),
          null: false

      add :food_id, references(:nutrition_foods, type: :binary_id, on_delete: :nilify_all)
      add :recipe_id, references(:nutrition_recipes, type: :binary_id, on_delete: :nilify_all)

      timestamps(type: :utc_datetime)
    end

    create index(:nutrition_food_log_entries, [:nutrition_meal_log_id])

    create constraint(:nutrition_food_log_entries, :nutrition_food_log_entries_food_xor_recipe,
             check: "num_nonnulls(food_id, recipe_id) = 1"
           )

    create constraint(:nutrition_food_log_entries, :nutrition_food_log_entries_weight_positive,
             check: "weight_g > 0"
           )
  end

  def down do
    drop_if_exists table(:nutrition_food_log_entries)
    drop_if_exists table(:nutrition_meal_logs)
    drop_if_exists table(:nutrition_schedule_entries)
    drop_if_exists table(:nutrition_meal_items)
    drop_if_exists table(:nutrition_meals)
    drop_if_exists table(:nutrition_recipe_ingredients)
    drop_if_exists table(:nutrition_recipes)
    drop_if_exists table(:nutrition_foods)
    drop_if_exists table(:nutrition_plans)
    # Not reversible to the old unprefixed schema. Use `mix ecto.reset` in dev.
  end
end
```

- [ ] **Step 2: Run the migration**

Run: `cd backend && mix ecto.migrate`
Expected: migration runs without error. (If `btree_gist` cannot be created, the Postgres role lacks `CREATE EXTENSION`; run `CREATE EXTENSION btree_gist;` as a superuser once, then re-run.)

- [ ] **Step 3: Verify the tables and key constraints exist**

Run:

```bash
cd backend && mix run --no-start -e '
{:ok, _} = Application.ensure_all_started(:easy)
q = "SELECT tablename FROM pg_tables WHERE tablename LIKE '"'"'nutrition\\_%'"'"' ESCAPE '"'"'\\'"'"' ORDER BY 1"
Easy.Repo.query!(q).rows |> List.flatten() |> IO.inspect(label: "nutrition tables")
'
```

Expected output lists all nine tables:
```text
["nutrition_food_log_entries", "nutrition_foods", "nutrition_meal_items",
 "nutrition_meal_logs", "nutrition_meals", "nutrition_plans",
 "nutrition_recipe_ingredients", "nutrition_recipes", "nutrition_schedule_entries"]
```

- [ ] **Step 4: Commit**

```bash
git add backend/priv/repo/migrations/20260621120000_recreate_nutrition_tables.exs
git commit -m "feat: recreate nutrition tables with canonical schema"
```

---

## Task 3: Rewrite the Ecto schemas

Rewrite all ten schema modules to bind to the new tables, columns, enums, and constraints. The app will not compile fully until Task 4 (contexts) — that is expected.

**Files:**
- Modify: `backend/lib/easy/nutrition/serving_size.ex`, `food.ex`, `recipe.ex`, `recipe_ingredient.ex`, `plan.ex`, `meal.ex`, `meal_item.ex`, `plan_item.ex`, `meal_log.ex`, `food_log_entry.ex`

**Interfaces (produced — relied on by Tasks 4–6):**
- `Food`: fields `calories_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g, fiber_g_per_100g, name, brand, barcode, source, category, allergens, dietary_tags, notes, image_url, import_id`, `embeds_many :serving_sizes`. Query builders unchanged: `for_business/2`, `for_business_or_system/2`, `search/2`, `newest/1`.
- `Recipe`: fields `name, description, instructions, servings_count, cooked_weight_g, allergens, dietary_tags`, `embeds_many :serving_sizes`, `has_many :recipe_ingredients`, `has_many :foods, through:`. Builders: `for_business/2`, `search/2`, `newest/1`.
- `RecipeIngredient`: real `id` PK; fields `amount, unit, weight_g, position`; `belongs_to :recipe`, `belongs_to :food`. `changeset/2`.
- `Plan`: fields `name, description, tags, status, start_date, end_date, target_calories, target_protein_g, target_carbs_g, target_fat_g, target_fiber_g`; `belongs_to :client/:business/:creator/:source_template`; `has_many :meals`, `has_many :plan_items` (→ `nutrition_schedule_entries`). Builders unchanged. Changesets add `exclusion_constraint`.
- `Meal`: fields `name, notes, default_meal_slot`; `belongs_to :plan` via FK `:nutrition_plan_id`; `has_many :meal_items`. `insert_changeset(plan_id, business_id, creator_id, attrs)`, `update_changeset/2`. Builders `for_plan/2` (filters `nutrition_plan_id`), `for_business/2`, `ordered/1`.
- `MealItem`: fields `amount, unit, weight_g, position`; `belongs_to :meal` via FK `:nutrition_meal_id`; `belongs_to :food/:recipe/:business`. `insert_changeset(meal_id, business_id, attrs)`, `update_changeset/2`. Builders `for_meal/2` (filters `nutrition_meal_id`), `for_business/2`, `ordered/1`.
- `PlanItem` (table `nutrition_schedule_entries`): fields `day_of_week, meal_slot`; `belongs_to :plan` via `:nutrition_plan_id`, `belongs_to :meal` via `:nutrition_meal_id`, `belongs_to :business`. `insert_changeset(plan_id, business_id, attrs)` (no creator), `update_changeset/2`. Builders `for_plan/2`, `for_business/2`, `for_day/2` (filters `day_of_week`), `for_meal_slot/2` (filters `meal_slot`). `meal_slots/0`, `days/0`.
- `MealLog` (table `nutrition_meal_logs`): unchanged field set; `has_many :food_log_entries`. Builders unchanged.
- `FoodLogEntry` (table `nutrition_food_log_entries`): add field `fiber_g`; `belongs_to :meal_log` via FK `:nutrition_meal_log_id`. Builder `for_meal_log/2` (filters `nutrition_meal_log_id`); `for_client/3` and `for_business/2` join on `nutrition_meal_log_id`. `insert_changeset(meal_log_id, attrs)`, `update_changeset/2`, `ordered/1`, `planned_indices/1`.

- [ ] **Step 1: Rewrite `serving_size.ex`**

```elixir
defmodule Easy.Nutrition.ServingSize do
  use Ecto.Schema

  @type t() :: %__MODULE__{}

  embedded_schema do
    field :label, :string
    field :amount, :float
    field :unit, :string
    field :weight_g, :float
    field :is_default, :boolean, default: false
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(serving_size, attrs) do
    serving_size
    |> Ecto.Changeset.cast(attrs, [:label, :amount, :unit, :weight_g, :is_default])
    |> Ecto.Changeset.validate_required([:unit, :weight_g])
  end
end
```

- [ ] **Step 2: Rewrite `food.ex`**

Keep the `search/2`, `newest/1`, `to_tsquery/1`, `sanitize_tsquery_token/1`, `for_business/2`, `for_business_or_system/2` functions exactly as they are today. Replace the schema, cast fields, allergen/dietary validation, and changesets:

```elixir
defmodule Easy.Nutrition.Food do
  use Ecto.Schema

  alias Easy.Nutrition
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @sources ["system", "imported", "custom"]
  @allergens ~w(dairy egg fish shellfish tree_nuts peanuts wheat soy sesame)
  @dietary_tags ~w(vegan vegetarian halal kosher gluten_free dairy_free low_fodmap keto high_protein)

  @spec allergens() :: [String.t()]
  def allergens, do: @allergens

  @spec dietary_tags() :: [String.t()]
  def dietary_tags, do: @dietary_tags

  schema "nutrition_foods" do
    field :name, :string
    field :brand, :string
    field :barcode, :string
    field :source, :string
    field :category, :string

    field :calories_per_100g, :float
    field :protein_g_per_100g, :float
    field :carbs_g_per_100g, :float
    field :fat_g_per_100g, :float
    field :fiber_g_per_100g, :float

    field :allergens, {:array, :string}, default: []
    field :dietary_tags, {:array, :string}, default: []

    field :notes, :string
    field :image_url, :string
    field :import_id, :string

    embeds_many :serving_sizes, Nutrition.ServingSize, on_replace: :delete

    belongs_to :creator, Orgs.Coach, foreign_key: :creator_id
    belongs_to :business, Orgs.Business

    timestamps(type: :utc_datetime)
  end

  @cast_fields [
    :name,
    :brand,
    :barcode,
    :source,
    :category,
    :calories_per_100g,
    :protein_g_per_100g,
    :carbs_g_per_100g,
    :fat_g_per_100g,
    :fiber_g_per_100g,
    :allergens,
    :dietary_tags,
    :notes,
    :image_url
  ]

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, coach_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:business_id, business_id)
    |> put_change(:creator_id, coach_id)
    |> validate_required([:name, :creator_id, :business_id])
    |> validate_macros()
    |> validate_enums()
    |> cast_embed(:serving_sizes, with: &Nutrition.ServingSize.changeset/2)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(food, attrs) do
    food
    |> cast(attrs, @cast_fields)
    |> validate_required([:name])
    |> validate_macros()
    |> validate_enums()
    |> cast_embed(:serving_sizes, with: &Nutrition.ServingSize.changeset/2)
  end

  defp validate_macros(changeset) do
    Enum.reduce(
      [:calories_per_100g, :protein_g_per_100g, :carbs_g_per_100g, :fat_g_per_100g, :fiber_g_per_100g],
      changeset,
      fn field, acc -> validate_number(acc, field, greater_than_or_equal_to: 0) end
    )
  end

  defp validate_enums(changeset) do
    changeset
    |> validate_inclusion(:source, @sources)
    |> validate_subset(:allergens, @allergens)
    |> validate_subset(:dietary_tags, @dietary_tags)
  end

  # for_business/2, for_business_or_system/2, search/2, newest/1,
  # to_tsquery/1, sanitize_tsquery_token/1 — UNCHANGED, copy verbatim from the
  # current file (they reference only `name` and `search_vector`).
end
```

Then re-add the unchanged query/helper functions (`for_business`, `for_business_or_system`, `search`, `newest`, `to_tsquery`, `sanitize_tsquery_token`) exactly as they exist in the current `food.ex`.

- [ ] **Step 3: Rewrite `recipe.ex`**

```elixir
defmodule Easy.Nutrition.Recipe do
  use Ecto.Schema

  alias Easy.Nutrition
  alias Easy.Nutrition.RecipeIngredient
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @allergens ~w(dairy egg fish shellfish tree_nuts peanuts wheat soy sesame)
  @dietary_tags ~w(vegan vegetarian halal kosher gluten_free dairy_free low_fodmap keto high_protein)

  schema "nutrition_recipes" do
    field :name, :string
    field :description, :string
    field :instructions, :string
    field :servings_count, :integer
    field :cooked_weight_g, :float

    field :allergens, {:array, :string}, default: []
    field :dietary_tags, {:array, :string}, default: []

    embeds_many :serving_sizes, Nutrition.ServingSize, on_replace: :delete

    belongs_to :creator, Orgs.Coach, foreign_key: :creator_id
    belongs_to :business, Orgs.Business
    has_many :recipe_ingredients, RecipeIngredient, on_delete: :delete_all, on_replace: :delete
    has_many :foods, through: [:recipe_ingredients, :food]

    timestamps(type: :utc_datetime)
  end

  @cast_fields [
    :name,
    :description,
    :instructions,
    :servings_count,
    :cooked_weight_g,
    :allergens,
    :dietary_tags
  ]

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, coach_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:business_id, business_id)
    |> put_change(:creator_id, coach_id)
    |> validate_required([:name, :creator_id, :business_id])
    |> validate_subset(:allergens, @allergens)
    |> validate_subset(:dietary_tags, @dietary_tags)
    |> cast_embed(:serving_sizes, with: &Nutrition.ServingSize.changeset/2)
    |> cast_assoc(:recipe_ingredients, with: &RecipeIngredient.changeset/2)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(recipe, attrs) do
    recipe
    |> cast(attrs, @cast_fields)
    |> validate_subset(:allergens, @allergens)
    |> validate_subset(:dietary_tags, @dietary_tags)
    |> cast_embed(:serving_sizes, with: &Nutrition.ServingSize.changeset/2)
    |> cast_assoc(:recipe_ingredients, with: &RecipeIngredient.changeset/2)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(r in query, where: r.business_id == ^business_id)
  end

  @spec search(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def search(query \\ __MODULE__, term)
  def search(query, nil), do: query
  def search(query, ""), do: query
  def search(query, term), do: from(r in query, where: ilike(r.name, ^"%#{term}%"))

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__) do
    from(r in query, order_by: [desc: r.inserted_at])
  end
end
```

- [ ] **Step 4: Rewrite `recipe_ingredient.ex`**

```elixir
defmodule Easy.Nutrition.RecipeIngredient do
  use Ecto.Schema
  alias Easy.Nutrition

  import Ecto.Changeset

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "nutrition_recipe_ingredients" do
    field :amount, :float
    field :unit, :string
    field :weight_g, :float
    field :position, :integer, default: 0

    belongs_to :recipe, Nutrition.Recipe
    belongs_to :food, Nutrition.Food
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(recipe_ingredient, attrs) do
    recipe_ingredient
    |> cast(attrs, [:food_id, :amount, :unit, :weight_g, :position])
    |> validate_required([:food_id, :weight_g])
    |> validate_number(:weight_g, greater_than: 0)
    |> check_constraint(:weight_g,
      name: :nutrition_recipe_ingredients_weight_positive,
      message: "must be greater than 0"
    )
  end
end
```

- [ ] **Step 5: Rewrite `plan.ex`**

Keep `for_business/2`, `for_client/2`, `with_status/2`, `templates/1`, `newest/1`, `active_for_client/3`, `validate_date_range/1` exactly as they are. Change the schema fields (`macros_goal` → five `target_*`), the `@cast_fields`, and add an exclusion constraint to both changesets:

```elixir
  schema "nutrition_plans" do
    field :name, :string
    field :description, :string
    field :tags, {:array, :string}, default: []

    field :target_calories, :float
    field :target_protein_g, :float
    field :target_carbs_g, :float
    field :target_fat_g, :float
    field :target_fiber_g, :float

    field :status, Ecto.Enum, values: @plan_statuses, default: :active

    field :start_date, :date
    field :end_date, :date

    belongs_to :creator, Orgs.Coach, foreign_key: :creator_id
    belongs_to :business, Orgs.Business
    belongs_to :client, Client
    belongs_to :source_template, __MODULE__, foreign_key: :source_template_id
    has_many :meals, Meal
    has_many :plan_items, Easy.Nutrition.PlanItem

    timestamps(type: :utc_datetime)
  end

  @cast_fields [
    :name,
    :description,
    :tags,
    :target_calories,
    :target_protein_g,
    :target_carbs_g,
    :target_fat_g,
    :target_fiber_g,
    :status,
    :start_date,
    :end_date
  ]
```

In `insert_changeset/3` and `update_changeset/2`, add this line after `validate_date_range()`:

```elixir
    |> exclusion_constraint(:start_date,
      name: :nutrition_plans_no_overlapping_active,
      message: "overlaps an existing active plan for this client"
    )
```

(The `has_many :plan_items, Easy.Nutrition.PlanItem` association name stays `:plan_items`; only the underlying table changed.)

- [ ] **Step 6: Rewrite `meal.ex`**

```elixir
defmodule Easy.Nutrition.Meal do
  use Ecto.Schema

  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @meal_slots [
    "breakfast",
    "morning_snack",
    "lunch",
    "afternoon_snack",
    "dinner",
    "evening_snack"
  ]

  schema "nutrition_meals" do
    field :name, :string
    field :notes, :string
    field :default_meal_slot, :string

    belongs_to :creator, Orgs.Coach, foreign_key: :creator_id
    belongs_to :business, Orgs.Business
    belongs_to :plan, Easy.Nutrition.Plan, foreign_key: :nutrition_plan_id
    has_many :meal_items, Easy.Nutrition.MealItem

    timestamps(type: :utc_datetime)
  end

  @cast_fields [:name, :notes, :default_meal_slot]

  @spec insert_changeset(String.t(), String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(plan_id, business_id, creator_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:nutrition_plan_id, plan_id)
    |> put_change(:business_id, business_id)
    |> put_change(:creator_id, creator_id)
    |> validate_required([:name, :nutrition_plan_id, :business_id, :creator_id])
    |> validate_inclusion(:default_meal_slot, @meal_slots)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(meal, attrs) do
    meal
    |> cast(attrs, @cast_fields)
    |> validate_inclusion(:default_meal_slot, @meal_slots)
  end

  @spec for_plan(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_plan(query \\ __MODULE__, plan_id) do
    from(m in query, where: m.nutrition_plan_id == ^plan_id)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(m in query, where: m.business_id == ^business_id)
  end

  @spec ordered(Ecto.Queryable.t()) :: Ecto.Query.t()
  def ordered(query \\ __MODULE__) do
    from(m in query, order_by: [asc: m.inserted_at])
  end
end
```

(`validate_inclusion` on a `nil` value is a no-op, so an unset `default_meal_slot` is allowed.)

- [ ] **Step 7: Rewrite `meal_item.ex`**

```elixir
defmodule Easy.Nutrition.MealItem do
  use Ecto.Schema

  alias Easy.Nutrition
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "nutrition_meal_items" do
    field :weight_g, :float
    field :amount, :float
    field :unit, :string
    field :position, :integer, default: 0

    belongs_to :business, Orgs.Business
    belongs_to :recipe, Nutrition.Recipe
    belongs_to :food, Nutrition.Food
    belongs_to :meal, Nutrition.Meal, foreign_key: :nutrition_meal_id

    timestamps(type: :utc_datetime)
  end

  @cast_fields [:weight_g, :amount, :unit, :position, :recipe_id, :food_id]

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(meal_id, business_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:nutrition_meal_id, meal_id)
    |> put_change(:business_id, business_id)
    |> validate_required([:nutrition_meal_id, :business_id, :weight_g])
    |> validate_number(:weight_g, greater_than: 0)
    |> validate_food_or_recipe()
    |> check_constraint(:weight_g,
      name: :nutrition_meal_items_weight_positive,
      message: "must be greater than 0"
    )
    |> check_constraint(:food_id,
      name: :nutrition_meal_items_food_xor_recipe,
      message: "exactly one of food_id or recipe_id must be set"
    )
    |> unique_constraint(:position, name: :nutrition_meal_items_nutrition_meal_id_position_index)
  end

  @update_fields [:weight_g, :amount, :unit, :position]

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(meal_item, attrs) do
    meal_item
    |> cast(attrs, @update_fields)
    |> validate_number(:weight_g, greater_than: 0)
    |> unique_constraint(:position, name: :nutrition_meal_items_nutrition_meal_id_position_index)
  end

  defp validate_food_or_recipe(changeset) do
    food_id = get_field(changeset, :food_id)
    recipe_id = get_field(changeset, :recipe_id)

    cond do
      is_nil(food_id) and is_nil(recipe_id) ->
        add_error(changeset, :food_id, "either food_id or recipe_id must be present")

      not is_nil(food_id) and not is_nil(recipe_id) ->
        add_error(changeset, :recipe_id, "cannot set both food_id and recipe_id")

      true ->
        changeset
    end
  end

  @spec for_meal(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_meal(query \\ __MODULE__, meal_id) do
    from(m in query, where: m.nutrition_meal_id == ^meal_id)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(m in query, where: m.business_id == ^business_id)
  end

  @spec ordered(Ecto.Queryable.t()) :: Ecto.Query.t()
  def ordered(query \\ __MODULE__) do
    from(m in query, order_by: [asc: m.position, asc: m.inserted_at])
  end
end
```

- [ ] **Step 8: Rewrite `plan_item.ex`** (table `nutrition_schedule_entries`)

```elixir
defmodule Easy.Nutrition.PlanItem do
  use Ecto.Schema

  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @days ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
  @meal_slots [
    "breakfast",
    "morning_snack",
    "lunch",
    "afternoon_snack",
    "dinner",
    "evening_snack"
  ]

  @spec meal_slots() :: [String.t()]
  def meal_slots, do: @meal_slots

  @spec days() :: [String.t()]
  def days, do: @days

  schema "nutrition_schedule_entries" do
    field :day_of_week, :string
    field :meal_slot, :string

    belongs_to :business, Orgs.Business
    belongs_to :meal, Easy.Nutrition.Meal, foreign_key: :nutrition_meal_id
    belongs_to :plan, Easy.Nutrition.Plan, foreign_key: :nutrition_plan_id

    timestamps(type: :utc_datetime)
  end

  @cast_fields [:day_of_week, :meal_slot, :nutrition_meal_id]

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(plan_id, business_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:nutrition_plan_id, plan_id)
    |> put_change(:business_id, business_id)
    |> validate_required([:day_of_week, :meal_slot, :nutrition_meal_id, :nutrition_plan_id, :business_id])
    |> validate_inclusion(:day_of_week, @days)
    |> validate_inclusion(:meal_slot, @meal_slots)
    |> unique_constraint([:nutrition_plan_id, :day_of_week, :meal_slot],
      name: :nutrition_schedule_entries_nutrition_plan_id_day_of_week_meal_slot_index
    )
  end

  @update_fields [:day_of_week, :meal_slot]

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(entry, attrs) do
    entry
    |> cast(attrs, @update_fields)
    |> validate_inclusion(:day_of_week, @days)
    |> validate_inclusion(:meal_slot, @meal_slots)
    |> unique_constraint([:nutrition_plan_id, :day_of_week, :meal_slot],
      name: :nutrition_schedule_entries_nutrition_plan_id_day_of_week_meal_slot_index
    )
  end

  @spec for_meal_slot(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_meal_slot(query \\ __MODULE__, meal_slot) do
    from(p in query, where: p.meal_slot == ^meal_slot)
  end

  @spec for_plan(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_plan(query \\ __MODULE__, plan_id) do
    from(p in query, where: p.nutrition_plan_id == ^plan_id)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(p in query, where: p.business_id == ^business_id)
  end

  @spec for_day(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_day(query \\ __MODULE__, day) do
    from(p in query, where: p.day_of_week == ^day)
  end
end
```

Note: the unique-index name `nutrition_schedule_entries_nutrition_plan_id_day_of_week_meal_slot_index` exceeds Postgres's 63-char identifier limit and will be truncated. After Task 2 runs, get the actual name with:

```bash
cd backend && mix run --no-start -e '
{:ok, _} = Application.ensure_all_started(:easy)
Easy.Repo.query!("SELECT indexname FROM pg_indexes WHERE tablename = '"'"'nutrition_schedule_entries'"'"'").rows |> IO.inspect()
'
```

Use the returned name verbatim in both `unique_constraint` calls (and in the migration's `create unique_index` if you prefer to pin it explicitly with `name:`).

- [ ] **Step 9: Rewrite `meal_log.ex`** (table `nutrition_meal_logs`)

Change only the `schema "meal_logs"` line to `schema "nutrition_meal_logs"`. Everything else stays, except `with_entries/1` and `validate_inclusion(:meal_slot, PlanItem.meal_types())` — change `PlanItem.meal_types()` to `PlanItem.meal_slots()` (renamed in Step 8). Full file:

```elixir
defmodule Easy.Nutrition.MealLog do
  use Ecto.Schema

  alias Easy.Clients.Client
  alias Easy.Nutrition.FoodLogEntry
  alias Easy.Nutrition.PlanItem
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "nutrition_meal_logs" do
    field(:date, :date)
    field(:meal_slot, :string)
    field(:planned_snapshot, :map)
    field(:planned_calories, :float)
    field(:logged_calories, :float, default: 0.0)

    belongs_to(:client, Client)
    belongs_to(:business, Orgs.Business)

    has_many(:food_log_entries, FoodLogEntry)

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:date, :meal_slot])
    |> put_change(:business_id, business_id)
    |> put_change(:client_id, client_id)
    |> validate_required([:date, :meal_slot, :business_id, :client_id])
    |> validate_inclusion(:meal_slot, PlanItem.meal_slots())
    |> unique_constraint([:client_id, :date, :meal_slot],
      name: :nutrition_meal_logs_client_id_date_meal_slot_index
    )
  end

  @spec for_client(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, business_id, client_id) do
    from(ml in query, where: ml.business_id == ^business_id and ml.client_id == ^client_id)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(ml in query, where: ml.business_id == ^business_id)
  end

  @spec for_date(Ecto.Queryable.t(), Date.t()) :: Ecto.Query.t()
  def for_date(query \\ __MODULE__, date) do
    from(ml in query, where: ml.date == ^date)
  end

  @spec for_date_range(Ecto.Queryable.t(), Date.t(), Date.t()) :: Ecto.Query.t()
  def for_date_range(query \\ __MODULE__, from_date, to_date) do
    from(ml in query, where: ml.date >= ^from_date and ml.date <= ^to_date)
  end

  @spec for_meal_slot(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_meal_slot(query \\ __MODULE__, meal_slot) do
    from(ml in query, where: ml.meal_slot == ^meal_slot)
  end

  @spec ordered(Ecto.Queryable.t()) :: Ecto.Query.t()
  def ordered(query \\ __MODULE__) do
    from(ml in query, order_by: [asc: ml.date, asc: ml.meal_slot])
  end

  @spec with_entries(Ecto.Queryable.t()) :: Ecto.Query.t()
  def with_entries(query \\ __MODULE__) do
    from(ml in query, preload: [food_log_entries: ^FoodLogEntry.ordered()])
  end
end
```

- [ ] **Step 10: Rewrite `food_log_entry.ex`** (table `nutrition_food_log_entries`)

Add the `fiber_g` field and cast, and rename the `meal_log` FK to `nutrition_meal_log_id` (updating `for_meal_log/2`, `for_client/3`, `for_business/2`):

```elixir
defmodule Easy.Nutrition.FoodLogEntry do
  use Ecto.Schema

  alias Easy.Nutrition.Food
  alias Easy.Nutrition.MealLog
  alias Easy.Nutrition.Recipe

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @sources [:planned, :replacement, :unplanned]

  schema "nutrition_food_log_entries" do
    field :food_name, :string
    field :amount, :float
    field :unit, :string
    field :weight_g, :float
    field :calories, :float
    field :protein_g, :float
    field :carbs_g, :float
    field :fat_g, :float
    field :fiber_g, :float
    field :notes, :string
    field :source, Ecto.Enum, values: @sources, default: :planned
    field :planned_item_index, :integer

    belongs_to :meal_log, MealLog, foreign_key: :nutrition_meal_log_id
    belongs_to :food, Food
    belongs_to :recipe, Recipe

    timestamps(type: :utc_datetime)
  end

  @cast_fields [
    :food_name,
    :amount,
    :unit,
    :weight_g,
    :notes,
    :source,
    :planned_item_index,
    :food_id,
    :recipe_id
  ]

  @spec insert_changeset(String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(meal_log_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:nutrition_meal_log_id, meal_log_id)
    |> validate_required([:source, :nutrition_meal_log_id, :weight_g])
    |> validate_inclusion(:source, @sources)
    |> validate_number(:weight_g, greater_than: 0)
    |> validate_food_or_recipe()
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(entry, attrs) do
    entry
    |> cast(attrs, [:amount, :unit, :weight_g, :notes])
    |> validate_number(:weight_g, greater_than: 0)
  end

  defp validate_food_or_recipe(changeset) do
    food_id = get_field(changeset, :food_id)
    recipe_id = get_field(changeset, :recipe_id)

    cond do
      is_nil(food_id) and is_nil(recipe_id) ->
        add_error(changeset, :food_id, "either food_id or recipe_id must be present")

      not is_nil(food_id) and not is_nil(recipe_id) ->
        add_error(changeset, :recipe_id, "cannot set both food_id and recipe_id")

      true ->
        changeset
    end
  end

  @spec for_meal_log(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_meal_log(query \\ __MODULE__, meal_log_id) do
    from(e in query, where: e.nutrition_meal_log_id == ^meal_log_id)
  end

  @spec ordered(Ecto.Queryable.t()) :: Ecto.Query.t()
  def ordered(query \\ __MODULE__) do
    from(e in query, order_by: [asc: e.planned_item_index, asc: e.inserted_at])
  end

  @spec for_client(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, business_id, client_id) do
    from(e in query,
      join: ml in MealLog,
      on: e.nutrition_meal_log_id == ml.id,
      where: ml.business_id == ^business_id,
      where: ml.client_id == ^client_id
    )
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(e in query,
      join: ml in MealLog,
      on: e.nutrition_meal_log_id == ml.id,
      where: ml.business_id == ^business_id
    )
  end

  @spec planned_indices(Ecto.Queryable.t()) :: Ecto.Query.t()
  def planned_indices(query \\ __MODULE__) do
    from(e in query,
      where: not is_nil(e.planned_item_index),
      select: e.planned_item_index
    )
  end
end
```

- [ ] **Step 11: Compile the schemas**

Run: `cd backend && mix compile 2>&1 | head -40`
Expected: compilation errors only in the **context** files (`nutrition_plans.ex`, `meal_logs.ex`) and web layer that still reference old fields (`macros`, `meal_type`, `meal_id`, `plan_id`, `macros_goal`, `shopping_list`, etc.). The `lib/easy/nutrition/*` schema files themselves must not be the source of errors. Fix those in Tasks 4–5.

- [ ] **Step 12: Commit**

```bash
git add backend/lib/easy/nutrition
git commit -m "feat: reshape nutrition Ecto schemas to spec vocabulary"
```

---

## Task 4: Update the contexts

Update the contexts to the new field names, the new computation module, and remove the dropped functions. After this task the schemas + contexts are consistent; the web layer (Task 5) finishes the compile.

**Files:**
- Modify: `backend/lib/easy/nutrition_plans.ex`
- Modify: `backend/lib/easy/meal_logs.ex`
- Modify: `backend/lib/easy/meals.ex`
- Modify: `backend/lib/easy/recipes.ex`

**Interfaces:**
- Consumes Task 1 (`MacroCalc`) and Task 3 (schemas).
- Removes public functions `NutritionPlans.shopping_list/2`, `NutritionPlans.macros/2`, `NutritionPlans.copy_day_for_coach_user/6`. All other public function names/arities are preserved.

- [ ] **Step 1: `recipes.ex` — preload ingredients with their food**

The recipe macro derivation needs each ingredient's `food` loaded. The existing `with_ingredients/2` already does this (`preload: [foods: ^food_query, recipe_ingredients: ^ingredient_query]` where `ingredient_query` preloads `food`). **No change needed** — verify `with_ingredients/2` still preloads `recipe_ingredients: [food: ...]`. It does. Leave `recipes.ex` unchanged.

- [ ] **Step 2: `meals.ex` — preload recipe ingredients inside meal items**

Meal-item recipes must carry their ingredients so `MacroCalc.for_recipe/2` can derive totals. Change `meal_items_with_food_and_recipe/1`:

Replace:
```elixir
  defp meal_items_with_food_and_recipe(business_id) do
    food_query = Food.for_business_or_system(Food, business_id)
    recipe_query = Recipe.for_business(Recipe, business_id)

    MealItem
    |> MealItem.for_business(business_id)
    |> MealItem.ordered()
    |> preload(food: ^food_query, recipe: ^recipe_query)
  end
```
With:
```elixir
  defp meal_items_with_food_and_recipe(business_id) do
    food_query = Food.for_business_or_system(Food, business_id)

    recipe_query =
      from(r in Recipe.for_business(Recipe, business_id),
        preload: [recipe_ingredients: ^from(ri in Easy.Nutrition.RecipeIngredient, preload: [food: ^food_query])]
      )

    MealItem
    |> MealItem.for_business(business_id)
    |> MealItem.ordered()
    |> preload(food: ^food_query, recipe: ^recipe_query)
  end
```
Add `alias Easy.Nutrition.RecipeIngredient` to the module aliases if you prefer the short name. The rest of `meals.ex` is unchanged (it never referenced `macros`, and the schema query builders keep their names).

- [ ] **Step 3: `nutrition_plans.ex` — remove dropped functions**

Delete these public functions and their `@spec`s entirely:
- `shopping_list/2`
- `macros/2`
- `copy_day_for_coach_user/6`

Delete these private helpers (only used by the above):
- `copy_day/5`
- `validate_copy_day/2` (all clauses)
- `build_shopping_item/1`
- `add_number/2`
- `merge_macros/2`

- [ ] **Step 4: `nutrition_plans.ex` — apply field renames**

Apply these mechanical renames throughout the remaining file:
- `plan_item.meal_type` → `plan_item.meal_slot`
- `plan_item.meal_id` → `plan_item.nutrition_meal_id`
- `plan_item.day` → `plan_item.day_of_week`
- In `copy_plan_items/5`, the attrs map becomes:
  ```elixir
  attrs = %{
    day_of_week: plan_item.day_of_week,
    meal_slot: plan_item.meal_slot,
    nutrition_meal_id: new_meal.id
  }
  ```
- `PlanItem.insert_changeset(new_plan_id, business_id, creator_id, attrs)` → `PlanItem.insert_changeset(new_plan_id, business_id, attrs)` (the schema dropped `creator_id` — Step 8 of Task 3). Apply the same arity change in `create_plan_item/4`:
  ```elixir
  plan.id
  |> PlanItem.insert_changeset(business_id, attrs)
  |> Repo.insert()
  ```
  `create_plan_item_for_coach_user/4` still resolves the coach but passes nothing to `insert_changeset`; keep the coach lookup only if `creator_id` is still wanted elsewhere — it is not, so simplify to call `create_plan_item(plan_id, business_id, attrs)` and drop the unused `creator_id` argument. Update `create_plan_item/4` to `create_plan_item/3` `(plan_id, business_id, attrs)` and its callers accordingly.
- In `copy_meals/4`, the meal attrs lose `macros`:
  ```elixir
  attrs = %{name: meal.name, notes: meal.notes, default_meal_slot: meal.default_meal_slot}
  ```
- In `copy_plan/3`, the plan attrs map replaces `macros_goal:` with the five targets:
  ```elixir
  attrs = %{
    name: Keyword.get(opts, :name, plan.name),
    description: plan.description,
    tags: plan.tags,
    target_calories: plan.target_calories,
    target_protein_g: plan.target_protein_g,
    target_carbs_g: plan.target_carbs_g,
    target_fat_g: plan.target_fat_g,
    target_fiber_g: plan.target_fiber_g,
    status: Keyword.get(opts, :status, plan.status),
    start_date: Keyword.get(opts, :start_date),
    end_date: Keyword.get(opts, :end_date)
  }
  ```
- `ensure_meal_for_plan/3` is called with `Map.get(attrs, "meal_id")`. The schedule entry request now sends the meal reference; keep accepting `"nutrition_meal_id"` (and fall back to `"meal_id"` for transitional clients):
  ```elixir
  meal_ref = Map.get(attrs, "nutrition_meal_id") || Map.get(attrs, "meal_id")
  ```
  Use `meal_ref` in the `ensure_meal_for_plan` calls within `create_plan_item` and `update_plan_item`.
- In `meal_items_with_food_and_recipe/1` (this context has its own copy), apply the same recipe-ingredient preload change as Task 4 Step 2.
- `with_meal_and_items/2` preloads `meal: ^meals_with_items(business_id)` — leave as is (now carries ingredients via the updated helper).

- [ ] **Step 5: `meal_logs.ex` — swap macro computation to `MacroCalc` and rename fields**

Replace `put_computed_macros/4` and the two resolvers:

Replace:
```elixir
  defp resolve_food(changeset, food_id, business_id, weight_g) do
    case Food |> Food.for_business_or_system(business_id) |> Repo.get(food_id) do
      nil ->
        add_error(changeset, :food_id, "food not found")

      food ->
        changeset
        |> put_change(:food_name, get_field(changeset, :food_name) || food.name)
        |> put_computed_macros(food.macros || %{}, weight_g, nil)
    end
  end

  defp resolve_recipe(changeset, recipe_id, business_id, weight_g) do
    case Recipe |> Recipe.for_business(business_id) |> Repo.get(recipe_id) do
      nil ->
        add_error(changeset, :recipe_id, "recipe not found")

      recipe ->
        changeset
        |> put_change(:food_name, get_field(changeset, :food_name) || recipe.name)
        |> put_computed_macros(recipe.macros || %{}, weight_g, recipe.cooked_weight_g)
    end
  end

  defp put_computed_macros(changeset, macros, weight_g, cooked_weight_g) do
    computed = MacroCalc.compute_all(macros, weight_g, cooked_weight_g)

    changeset
    |> put_change(:calories, computed.calories)
    |> put_change(:protein_g, computed.protein_g)
    |> put_change(:carbs_g, computed.carbs_g)
    |> put_change(:fat_g, computed.fat_g)
  end
```
With:
```elixir
  defp resolve_food(changeset, food_id, business_id, weight_g) do
    case Food |> Food.for_business_or_system(business_id) |> Repo.get(food_id) do
      nil ->
        add_error(changeset, :food_id, "food not found")

      food ->
        changeset
        |> put_change(:food_name, get_field(changeset, :food_name) || food.name)
        |> put_macros(MacroCalc.for_food(food, weight_g))
    end
  end

  defp resolve_recipe(changeset, recipe_id, business_id, weight_g) do
    case load_recipe_with_ingredients(business_id, recipe_id) do
      nil ->
        add_error(changeset, :recipe_id, "recipe not found")

      recipe ->
        changeset
        |> put_change(:food_name, get_field(changeset, :food_name) || recipe.name)
        |> put_macros(MacroCalc.for_recipe(recipe, weight_g))
    end
  end

  defp load_recipe_with_ingredients(business_id, recipe_id) do
    food_query = Food.for_business_or_system(Food, business_id)

    Recipe
    |> Recipe.for_business(business_id)
    |> preload(recipe_ingredients: ^from(ri in RecipeIngredient, preload: [food: ^food_query]))
    |> Repo.get(recipe_id)
  end

  defp put_macros(changeset, macros) do
    changeset
    |> put_change(:calories, macros.calories)
    |> put_change(:protein_g, macros.protein_g)
    |> put_change(:carbs_g, macros.carbs_g)
    |> put_change(:fat_g, macros.fat_g)
    |> put_change(:fiber_g, macros.fiber_g)
  end
```
Add `alias Easy.Nutrition.RecipeIngredient` to the module's aliases.

- [ ] **Step 6: `meal_logs.ex` — update `maybe_recompute_macros/4`**

Replace:
```elixir
      case {entry.food, entry.recipe} do
        {%Food{} = food, _} ->
          put_computed_macros(changeset, food.macros || %{}, weight_g, nil)

        {_, %Recipe{} = recipe} ->
          put_computed_macros(changeset, recipe.macros || %{}, weight_g, recipe.cooked_weight_g)

        _ ->
          changeset
      end
```
With:
```elixir
      case {entry.food, entry.recipe} do
        {%Food{} = food, _} ->
          put_macros(changeset, MacroCalc.for_food(food, weight_g))

        {_, %Recipe{} = recipe} ->
          recipe = load_recipe_with_ingredients(business_id, recipe.id)
          put_macros(changeset, MacroCalc.for_recipe(recipe, weight_g))

        _ ->
          changeset
      end
```

- [ ] **Step 7: `meal_logs.ex` — update snapshot computation (`snapshot_item`, `do_snapshot`, `resolve_food_or_recipe`)**

Replace `snapshot_item/1` and `resolve_food_or_recipe/1`:
```elixir
  defp snapshot_item(%MealItem{} = item) do
    macros = MacroCalc.for_meal_item(item)
    {name, _} = item_name(item)

    %{
      food_name: name,
      amount: item.amount,
      unit: item.unit,
      weight_g: item.weight_g || 0.0,
      calories: macros.calories,
      protein_g: macros.protein_g,
      carbs_g: macros.carbs_g,
      fat_g: macros.fat_g,
      fiber_g: macros.fiber_g
    }
  end

  defp item_name(%MealItem{food: %Food{} = f}), do: {f.name, :food}
  defp item_name(%MealItem{recipe: %Recipe{} = r}), do: {r.name, :recipe}
  defp item_name(_), do: {nil, :unknown}
```
Delete the old `resolve_food_or_recipe/1` clauses (no longer used).

In `do_snapshot/1`, add the fiber total:
```elixir
      %{
        meal_name: meal.name,
        items: items,
        total_calories: sum_field(items, :calories),
        total_protein_g: sum_field(items, :protein_g),
        total_carbs_g: sum_field(items, :carbs_g),
        total_fat_g: sum_field(items, :fat_g),
        total_fiber_g: sum_field(items, :fiber_g)
      }
```
`meal_items_with_food_and_recipe/1` (this context's copy) gets the same recipe-ingredient preload change as Step 2.

- [ ] **Step 8: `meal_logs.ex` — rename PlanItem fields and fix raw SQL table name**

- In `snapshot_meal/2`: `PlanItem.for_meal_type(meal_slot)` → `PlanItem.for_meal_slot(meal_slot)`.
- In `do_snapshot/1`: `plan_item.meal_id` → `plan_item.nutrition_meal_id`; `Meal.for_business(plan_item.business_id) |> Repo.get(plan_item.nutrition_meal_id)`.
- In `log_day/4`: `plan_item.meal_type` → `plan_item.meal_slot`; `plan_item.meal_id` → `plan_item.nutrition_meal_id`.
- In `recalculate_entry_meal_log/2`: `entry.meal_log_id` → `entry.nutrition_meal_log_id`.
- In `do_recalculate_logged_calories/1`, the raw SQL references the old table and column. Replace both `fragment(...)` strings:
  ```elixir
  "(SELECT coalesce(sum(calories), 0.0) FROM nutrition_food_log_entries WHERE nutrition_meal_log_id = ?)"
  ```

- [ ] **Step 9: Compile**

Run: `cd backend && mix compile 2>&1 | head -40`
Expected: remaining errors are only in the **web layer** (`lib/easy_web/...` renderers/controllers/OpenApiSpex) referencing old fields. Contexts and schemas compile clean.

- [ ] **Step 10: Commit**

```bash
git add backend/lib/easy/nutrition_plans.ex backend/lib/easy/meal_logs.ex backend/lib/easy/meals.ex backend/lib/easy/recipes.ex
git commit -m "feat: update nutrition contexts to canonical vocabulary"
```

---

## Task 5: Update the web layer (renderers, routes, controllers, OpenApiSpex)

Bring renderers and OpenApiSpex field schemas onto the new vocabulary, and remove the three dropped endpoints. Paths stay snake_case. After this task the app compiles cleanly with `--warnings-as-errors`.

**Files:**
- Modify: `backend/lib/easy_web/router.ex`
- Modify: `backend/lib/easy_web/controllers/coaches/nutrition_plan_controller.ex`
- Modify (coach JSON): `nutrition_plan_json.ex`, `food_json.ex`, `recipe_json.ex`, `meal_json.ex`, `meal_item_json.ex`, `plan_item_json.ex`
- Modify (client JSON): `nutrition_plan_json.ex`, `food_json.ex`, `recipe_json.ex`, `meal_log_json.ex`, `food_log_entry_json.ex`
- Modify (OpenApiSpex): `backend/lib/easy_web/open_api/schemas/nutrition.ex`, `backend/lib/easy_web/open_api/schemas/nutrition_food.ex`

- [ ] **Step 1: Remove the dropped routes**

In `backend/lib/easy_web/router.ex`, delete these three lines from the coach scope:
```elixir
post "/nutrition_plans/:id/copy-day", NutritionPlanController, :copy_day
get "/nutrition_plans/:id/shopping-list", NutritionPlanController, :shopping_list
get "/nutrition_plans/:id/macros", NutritionPlanController, :macros
```

- [ ] **Step 2: Remove the dropped controller actions**

In `backend/lib/easy_web/controllers/coaches/nutrition_plan_controller.ex`, delete the `copy_day`, `shopping_list`, and `macros` action functions and their `operation :copy_day` / `operation :shopping_list` / `operation :macros` specs. Remove any now-unused alias of `NutritionPlanCopyDayRequest`.

- [ ] **Step 3: Coach `food_json.ex` — per-100g fields**

Replace the `data/1` body and `serving_sizes_data/1`:
```elixir
  defp data(%Food{} = food) do
    %{
      id: food.id,
      name: food.name,
      brand: food.brand,
      barcode: food.barcode,
      source: food.source,
      category: food.category,
      calories_per_100g: food.calories_per_100g,
      protein_g_per_100g: food.protein_g_per_100g,
      carbs_g_per_100g: food.carbs_g_per_100g,
      fat_g_per_100g: food.fat_g_per_100g,
      fiber_g_per_100g: food.fiber_g_per_100g,
      allergens: food.allergens || [],
      dietary_tags: food.dietary_tags || [],
      notes: food.notes,
      image_url: food.image_url,
      serving_sizes: serving_sizes_data(food.serving_sizes),
      creator_id: food.creator_id,
      inserted_at: food.inserted_at,
      updated_at: food.updated_at
    }
  end

  defp serving_sizes_data(serving_sizes) when is_list(serving_sizes) do
    for serving_size <- serving_sizes do
      %{
        label: serving_size.label,
        amount: serving_size.amount,
        unit: serving_size.unit,
        weight_g: serving_size.weight_g,
        is_default: serving_size.is_default
      }
    end
  end

  defp serving_sizes_data(_), do: []
```

- [ ] **Step 4: Coach `recipe_json.ex` — derived totals + new fields**

Add `alias Easy.MacroCalc`. Replace `data/1`'s `recipe` body to drop `macros/source/category/tags/image_url/service_size_type`, add `description/servings_count/allergens/dietary_tags`, and add a derived `nutrition` map; update `serving_sizes_data/1` to the label/is_default shape (as in Step 3); update `recipe_ingredient_data/1` to include `position`; update the embedded `food_data/1` to the per-100g shape (as in Step 3):
```elixir
  defp data(%Recipe{} = recipe) do
    %{
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      instructions: recipe.instructions,
      servings_count: recipe.servings_count,
      cooked_weight_g: recipe.cooked_weight_g,
      allergens: recipe.allergens || [],
      dietary_tags: recipe.dietary_tags || [],
      nutrition: MacroCalc.recipe_totals(recipe),
      serving_sizes: serving_sizes_data(recipe.serving_sizes),
      recipe_ingredients: recipe_ingredients_data(recipe.recipe_ingredients),
      foods: foods_data(recipe.foods),
      creator_id: recipe.creator_id,
      inserted_at: recipe.inserted_at,
      updated_at: recipe.updated_at
    }
  end
```
`recipe_ingredient_data/1` adds `position: recipe_ingredient.position`. `food_data/1` uses the per-100g shape from Step 3.

- [ ] **Step 5: Coach `meal_json.ex` and `meal_item_json.ex`**

`meal_json.ex`: add `alias Easy.MacroCalc`; replace `macros: meal.macros` with `notes: meal.notes, default_meal_slot: meal.default_meal_slot, nutrition: MacroCalc.meal_totals(meal.meal_items)`; change `plan_id: meal.plan_id` → `nutrition_plan_id: meal.nutrition_plan_id`. In `meal_item_data/1`, change `meal_id: meal_item.meal_id` → `nutrition_meal_id: meal_item.nutrition_meal_id`.

`meal_item_json.ex`: in `data/1`, change `meal_id: meal_item.meal_id` → `nutrition_meal_id: meal_item.nutrition_meal_id`.

- [ ] **Step 6: Coach `plan_item_json.ex`**

Replace `data/1`:
```elixir
  defp data(%PlanItem{} = plan_item) do
    %{
      id: plan_item.id,
      day_of_week: plan_item.day_of_week,
      meal_slot: plan_item.meal_slot,
      nutrition_meal_id: plan_item.nutrition_meal_id,
      nutrition_plan_id: plan_item.nutrition_plan_id,
      inserted_at: plan_item.inserted_at,
      updated_at: plan_item.updated_at
    }
  end
```

- [ ] **Step 7: Coach `nutrition_plan_json.ex`**

- Add `alias Easy.MacroCalc`.
- Delete the `shopping_list/1` and `macros/1` render functions.
- In `summary_data/1`, replace `macros_goal: plan.macros_goal` with:
  ```elixir
  target_calories: plan.target_calories,
  target_protein_g: plan.target_protein_g,
  target_carbs_g: plan.target_carbs_g,
  target_fat_g: plan.target_fat_g,
  target_fiber_g: plan.target_fiber_g,
  ```
- In `meal_data/1`, replace `macros: meal.macros` with `notes: meal.notes, default_meal_slot: meal.default_meal_slot, nutrition: MacroCalc.meal_totals(meal.meal_items)`, and `plan_id: meal.plan_id` → `nutrition_plan_id: meal.nutrition_plan_id`.
- In `meal_item_data/1`, `meal_id` → `nutrition_meal_id`.
- In `plan_item_data/1`, use the shape from Step 6 (`day_of_week`, `meal_slot`, `nutrition_meal_id`, `nutrition_plan_id`; drop `creator_id`).

- [ ] **Step 8: Client renderers**

Apply the same field changes to the client JSON views:
- `clients/food_json.ex` → per-100g shape (Step 3).
- `clients/recipe_json.ex` → derived totals + new fields (Step 4).
- `clients/nutrition_plan_json.ex` → mirror Step 7 (whatever subset it renders: targets, meal `nutrition`, `nutrition_meal_id`, schedule-entry fields). Read the file and apply the analogous renames.
- `clients/food_log_entry_json.ex` → add `fiber_g: entry.fiber_g` to the rendered entry map.
- `clients/meal_log_json.ex` → if it renders the planned snapshot, the snapshot now carries `total_fiber_g`; surface it if the others are surfaced.

- [ ] **Step 9: OpenApiSpex `nutrition_food.ex`**

Rewrite the food schemas to the new field set. `FoodServingSize` properties become `label` (string), `amount` (number), `unit` (string), `weight_g` (number), `is_default` (boolean). `FoodRequest`, `FoodUpdateRequest`, and `Food` replace the `macros` object property with the five numeric per-100g properties and add `brand`, `barcode`, `allergens` (array of string), `dietary_tags` (array of string); drop `tags`. Use this property map for the macro/identity fields in all three (response `Food` also keeps `id`, `creator_id`, `inserted_at`, `updated_at`):

```elixir
name: %Schema{type: :string},
brand: %Schema{type: :string, nullable: true},
barcode: %Schema{type: :string, nullable: true},
source: %Schema{type: :string, enum: ["system", "imported", "custom"], nullable: true},
category: %Schema{type: :string, nullable: true},
calories_per_100g: %Schema{type: :number, nullable: true},
protein_g_per_100g: %Schema{type: :number, nullable: true},
carbs_g_per_100g: %Schema{type: :number, nullable: true},
fat_g_per_100g: %Schema{type: :number, nullable: true},
fiber_g_per_100g: %Schema{type: :number, nullable: true},
allergens: %Schema{type: :array, items: %Schema{type: :string}},
dietary_tags: %Schema{type: :array, items: %Schema{type: :string}},
notes: %Schema{type: :string, nullable: true},
image_url: %Schema{type: :string, nullable: true},
serving_sizes: %Schema{type: :array, items: FoodServingSize}
```
Update the `example:` blocks to use the per-100g keys (e.g. `"calories_per_100g" => 97, "protein_g_per_100g" => 10`).

- [ ] **Step 10: OpenApiSpex `nutrition.ex`**

Apply these per-module changes (open the file, edit each `OpenApiSpex.schema` block):
- **RecipeRequest / Recipe:** drop `macros`, `source`, `category`, `tags`, `image_url`, `service_size_type`. Add `description` (string), `servings_count` (integer), `cooked_weight_g` (number), `allergens` (array string), `dietary_tags` (array string). On the response `Recipe`, add `nutrition` (object with the five numeric macro keys). `RecipeIngredient`/`RecipeIngredientRequest` add `position` (integer).
- **NutritionMealRequest / NutritionMeal:** drop `macros`. Add `notes` (string), `default_meal_slot` (string enum of the six slots). On response add `nutrition` (object, five macro keys) and `nutrition_plan_id`.
- **NutritionMealItem (response):** rename `meal_id` → `nutrition_meal_id`. (`NutritionMealItemRequest` keeps `food_id`, `recipe_id`, `amount`, `unit`, `weight_g`, `position`.)
- **NutritionPlanRequest / NutritionPlan:** replace `macros_goal` with `target_calories`, `target_protein_g`, `target_carbs_g`, `target_fat_g`, `target_fiber_g` (all `%Schema{type: :number}`). Update the example.
- **NutritionPlanItemRequest / NutritionPlanItemUpdateRequest / NutritionPlanItem:** rename `day` → `day_of_week`, `meal_type` → `meal_slot`. On the response item, rename `meal_id` → `nutrition_meal_id` and drop `creator_id`. Update the enum/examples.
- **NutritionPlanCopyDayRequest:** delete this schema module entirely (its endpoint is removed).

- [ ] **Step 11: Compile with warnings as errors**

Run: `cd backend && mix compile --warnings-as-errors 2>&1 | tail -20`
Expected: exit 0, no warnings. (Fix any leftover references the previous steps missed — typically an old `meal_id`/`plan_id`/`macros` reference in a renderer.)

- [ ] **Step 12: Commit**

```bash
git add backend/lib/easy_web
git commit -m "feat: update nutrition web layer to canonical vocabulary"
```

---

## Task 6: Update factories and tests

Bring the factory and the nutrition tests onto the new vocabulary, remove tests for the dropped endpoints, and get the suite green.

**Files:**
- Modify: `backend/test/support/factory.ex`
- Modify (schema tests): `test/easy/nutrition/meal_item_test.exs`, `test/easy/nutrition/meal_log_test.exs`, `test/easy/nutrition/recipe_test.exs`
- Modify (controller tests): `test/easy_web/controllers/coaches/{food,recipe,meal,meal_item,plan_item,nutrition_plan,meal_log}_controller_test.exs`, `test/easy_web/controllers/coaches/client_plan_controller_test.exs`, `test/easy_web/controllers/clients/{food,recipe,nutrition_plan,meal_log,food_log_entry}_controller_test.exs`

- [ ] **Step 1: Update the nutrition factories**

In `backend/test/support/factory.ex`, rewrite the nutrition factories. `food_factory` / `food_attrs_factory`:
```elixir
  def food_factory do
    %Easy.Nutrition.Food{
      name: sequence(:food_name, &"Food #{&1}"),
      source: "custom",
      category: "protein",
      calories_per_100g: 200.0,
      protein_g_per_100g: 20.0,
      carbs_g_per_100g: 30.0,
      fat_g_per_100g: 5.0,
      fiber_g_per_100g: 2.0,
      allergens: [],
      dietary_tags: ["high_protein"],
      notes: "Test food",
      serving_sizes: [],
      creator: build(:coach),
      business: build(:business)
    }
  end

  def food_attrs_factory do
    %{
      "name" => sequence(:food_attr_name, &"New Food #{&1}"),
      "source" => "custom",
      "calories_per_100g" => 150.0,
      "protein_g_per_100g" => 10.0,
      "carbs_g_per_100g" => 20.0,
      "fat_g_per_100g" => 3.0,
      "fiber_g_per_100g" => 1.0,
      "serving_sizes" => [
        %{"label" => "1 cup", "unit" => "cup", "weight_g" => 100.0, "amount" => 1.0, "is_default" => true}
      ]
    }
  end
```
(Keep the existing `creator`/`business` wiring this factory used; the snippet shows the standard build wiring — match the surrounding factory style.)

`recipe_factory` / `recipe_attrs_factory`: drop `macros`/`service_size_type`; add `description`, `servings_count`, `cooked_weight_g`, `allergens`, `dietary_tags`:
```elixir
  def recipe_factory do
    %Easy.Nutrition.Recipe{
      name: sequence(:recipe_name, &"Recipe #{&1}"),
      description: "Test recipe",
      instructions: "Mix and serve",
      servings_count: 2,
      cooked_weight_g: 400.0,
      allergens: [],
      dietary_tags: [],
      serving_sizes: [],
      recipe_ingredients: [],
      creator: build(:coach),
      business: build(:business)
    }
  end

  def recipe_attrs_factory do
    %{
      "name" => sequence(:recipe_attr_name, &"New Recipe #{&1}"),
      "description" => "New recipe",
      "instructions" => "Cook",
      "servings_count" => 2,
      "cooked_weight_g" => 400.0,
      "serving_sizes" => [
        %{"label" => "1 serving", "unit" => "serving", "weight_g" => 200.0, "amount" => 1.0, "is_default" => true}
      ]
    }
  end
```

`recipe_ingredient_factory`: add `weight_g`, `amount`, `unit`, `position`:
```elixir
  def recipe_ingredient_factory do
    %Easy.Nutrition.RecipeIngredient{
      food: build(:food),
      amount: 1.0,
      unit: "g",
      weight_g: 50.0,
      position: 0
    }
  end
```

`plan_factory` / `plan_attrs_factory`: replace `macros_goal` with `target_*`:
```elixir
  # in plan_factory, replace macros_goal: %{...} with:
  target_calories: 2000.0,
  target_protein_g: 150.0,
  target_carbs_g: 200.0,
  target_fat_g: 60.0,
  target_fiber_g: 30.0,

  # in plan_attrs_factory, replace "macros_goal" => %{...} with:
  "target_calories" => 1800.0,
  "target_protein_g" => 120.0,
  "target_carbs_g" => 180.0,
  "target_fat_g" => 50.0,
  "target_fiber_g" => 25.0,
```

`meal_factory` / `meal_attrs_factory`: drop `macros`; add `notes`, `default_meal_slot`. The factory must use `nutrition_plan` (the `belongs_to :plan` now has FK `nutrition_plan_id`, association name still `:plan`):
```elixir
  def meal_factory do
    plan = build(:plan)

    %Easy.Nutrition.Meal{
      name: sequence(:meal_name, &"Meal #{&1}"),
      notes: nil,
      default_meal_slot: "breakfast",
      creator: plan.creator,
      business: plan.business,
      plan: plan
    }
  end

  def meal_attrs_factory do
    %{
      "name" => sequence(:meal_attr_name, &"New Meal #{&1}"),
      "default_meal_slot" => "lunch"
    }
  end
```

`meal_item_factory` / `meal_item_attrs_factory`: ensure `weight_g` is set (NOT NULL + CHECK > 0):
```elixir
  def meal_item_factory do
    meal = build(:meal)
    food = build(:food, business: meal.plan.business, creator: meal.creator)

    %Easy.Nutrition.MealItem{
      weight_g: 100.0,
      amount: 1.0,
      unit: "serving",
      position: 0,
      food: food,
      business: meal.plan.business,
      meal: meal
    }
  end
```
(`meal_item_attrs_factory` must include `"weight_g" => 100.0`.)

`plan_item_factory` / `plan_item_attrs_factory`: rename to schedule-entry vocabulary; drop `creator` (the schema no longer has `creator_id`):
```elixir
  def plan_item_factory do
    plan = build(:plan)
    meal = build(:meal, plan: plan, creator: plan.creator)

    %Easy.Nutrition.PlanItem{
      day_of_week: "monday",
      meal_slot: "breakfast",
      business: plan.business,
      plan: plan,
      meal: meal
    }
  end

  def plan_item_attrs_factory do
    %{
      "day_of_week" => "monday",
      "meal_slot" => "breakfast"
    }
  end
```

- [ ] **Step 2: Update the schema tests**

`test/easy/nutrition/recipe_test.exs`: replace any `macros`/`service_size_type` assertions with the new fields; if it tested macro storage, change to assert `MacroCalc.recipe_totals/1` over built ingredients, or drop that assertion. `test/easy/nutrition/meal_item_test.exs`: ensure built items set `weight_g`; the food/recipe XOR test stays. `test/easy/nutrition/meal_log_test.exs`: update any `meal_log_id` reference to `nutrition_meal_log_id`. Read each file and apply the renames; keep the behavioral intent.

- [ ] **Step 3: Update controller/context tests for vocabulary**

Across the nutrition controller tests, apply these response/request renames:
- food create/show bodies: `macros` map → per-100g keys; assertions on `data["macros"]` → `data["calories_per_100g"]` etc.
- recipe: drop `macros`/`service_size_type`; assert `data["nutrition"]` for derived totals where a macro assertion existed.
- meal: `data["macros"]` → `data["nutrition"]`; `plan_id` → `nutrition_plan_id`.
- meal item: `meal_id` → `nutrition_meal_id`; ensure request bodies send `weight_g`.
- plan: `macros_goal` → `target_*`.
- plan item: request `day`/`meal_type` → `day_of_week`/`meal_slot`; response `meal_id` → `nutrition_meal_id`.
- food log entry: assert `fiber_g` present where macro fields are asserted.

- [ ] **Step 4: Remove tests for dropped endpoints**

In `test/easy_web/controllers/coaches/nutrition_plan_controller_test.exs`, delete the `describe`/`test` blocks covering `copy-day`, `shopping-list`, and `macros`.

- [ ] **Step 5: Run the full nutrition suite**

Run:
```bash
cd backend && mix test \
  test/easy/macro_calc_test.exs \
  test/easy/nutrition \
  test/easy_web/controllers/coaches/food_controller_test.exs \
  test/easy_web/controllers/coaches/recipe_controller_test.exs \
  test/easy_web/controllers/coaches/meal_controller_test.exs \
  test/easy_web/controllers/coaches/meal_item_controller_test.exs \
  test/easy_web/controllers/coaches/plan_item_controller_test.exs \
  test/easy_web/controllers/coaches/nutrition_plan_controller_test.exs \
  test/easy_web/controllers/coaches/meal_log_controller_test.exs \
  test/easy_web/controllers/coaches/client_plan_controller_test.exs \
  test/easy_web/controllers/clients/food_controller_test.exs \
  test/easy_web/controllers/clients/recipe_controller_test.exs \
  test/easy_web/controllers/clients/nutrition_plan_controller_test.exs \
  test/easy_web/controllers/clients/meal_log_controller_test.exs \
  test/easy_web/controllers/clients/food_log_entry_controller_test.exs \
  test/easy_web/controllers/nutrition_controller_boundary_test.exs
```
Expected: all pass. Fix failures by following the error to the specific renamed field.

- [ ] **Step 6: Commit**

```bash
git add backend/test
git commit -m "test: update nutrition factories and tests to canonical vocabulary"
```

---

## Task 7: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Reset the database from scratch**

Run: `cd backend && MIX_ENV=test mix ecto.reset`
Expected: drops, recreates, runs all migrations including `20260621120000_recreate_nutrition_tables.exs` without error.

- [ ] **Step 2: Full compile, warnings as errors**

Run: `cd backend && mix compile --warnings-as-errors`
Expected: exit 0.

- [ ] **Step 3: Whole test suite**

Run: `cd backend && mix test`
Expected: all pass. Pay attention to any non-nutrition test that touched the old tables/fields (e.g. seeds or cross-context tests) and fix the reference.

- [ ] **Step 4: Verify the OpenAPI document renders and nutrition paths resolve**

Run:
```bash
cd backend && mix run --no-start -e '
spec = EasyWeb.ApiSpec.spec() |> OpenApiSpex.OpenApi.to_map()
spec |> Map.fetch!("paths") |> Map.keys() |> Enum.filter(&String.contains?(&1, "nutrition")) |> Enum.sort() |> IO.inspect(limit: :infinity)
'
```
Expected: it renders without raising, the `copy-day`/`shopping-list`/`macros` paths are gone, and the remaining nutrition paths are present (still snake_case — kebab is Plan 2).

- [ ] **Step 5: Diff hygiene**

Run:
```bash
git diff --check
git status --short
```
Expected: no whitespace errors; only files intended by this plan changed.

- [ ] **Step 6: Commit any verification-only fixes**

If Steps 1–5 required a fix, commit it; otherwise do not create an empty commit.
```bash
git add backend
git commit -m "fix: resolve nutrition data-layer verification issues"
```

---

## Self-review

**Spec coverage (nutrition data-layer slice):**
- Nutrition-prefixed tables — Task 2 (all nine), Task 3 (schemas bind to them).
- One macro vocabulary (per-100g foods, `target_*` plans, `calories/protein_g/carbs_g/fat_g/fiber_g` logs/snapshots, derived meals/recipes; no loose maps; `fiber_g` everywhere) — Task 1 (MacroCalc), Task 3 (schema fields), Task 4 (contexts), Task 5 (renderers + OpenApiSpex).
- All math resolves to grams; reject if `weight_g` unresolved — Task 2 (CHECK `weight_g > 0`, NOT NULL on meal items / food log entries / recipe ingredients), Task 3 (`validate_required`/`validate_number`).
- Database guarantees: one active assigned plan per client/date range (Task 2 EXCLUDE constraint + Task 3 `exclusion_constraint`); one schedule entry per plan/day/slot (Task 2 unique index + Task 3 `unique_constraint`); food XOR recipe (Task 2 CHECK + Task 3 validation/`check_constraint`); positive `weight_g` (above); one meal log per client/date/slot (Task 2 unique index, preserved).
- `nutrition_schedule_entries` model (`day_of_week`/`meal_slot`/`nutrition_plan_id`/`nutrition_meal_id`, no creator) — Task 2, Task 3 Step 8.
- Food library: `source` enum, `serving_sizes` with `label`/`is_default`, fixed allergen + dietary-tag enums, brand/barcode — Task 2, Task 3 Steps 1–2.
- Recipes derive nutrition from ingredients (compute-on-read) — Task 1 (`recipe_totals`/`for_recipe`), Task 5 (`nutrition` in renderers).
- Removed out-of-spec endpoints `copy-day`/`shopping-list`/`macros` — Task 4 (context), Task 5 (routes/controllers/OpenApiSpex), Task 6 (tests).

**Type consistency check:** MacroCalc functions (`for_food/2`, `recipe_totals/1`, `for_recipe/2`, `for_meal_item/1`, `meal_totals/1`) are defined in Task 1 and consumed with matching arities in Tasks 4–5. The `PlanItem.insert_changeset/3` arity change (dropping `creator_id`) is applied consistently in Task 3 Step 8 and Task 4 Step 4. Renamed query builders (`for_meal_slot`, `for_day` filtering `day_of_week`, `for_meal`/`for_plan` filtering the `nutrition_*_id` columns) are defined in Task 3 and used in Task 4. The schedule-entry unique-index name is verified against Postgres in Task 3 Step 8 to avoid the 63-char truncation mismatch.

**Deferred to Plan 2 (nutrition API restructure):** kebab-case paths and `nutrition-` route prefixes; `GET /schedule` + `PUT /schedule/:day` (desired-state) replacing the transitional `plan_items` CRUD; coach meal-logs under `/clients/:client_id/...`; `impact` and `copy` endpoints on foods/recipes; strict request-validation rejection of alternate macro names; renaming the `PlanItem` module → `ScheduleEntry`. Threads and the attention endpoint remain separate plans entirely.
