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
