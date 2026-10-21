defmodule Easy.Repo.Migrations.CreateNutrition do
  use Ecto.Migration

  def change do
    create table(:nutrition_foods, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :business_id, references(:businesses, type: :binary_id)
      add :name, :string, null: false
      add :brand, :string
      add :source, :string
      add :category, :string
      add :calories_per_100g, :float
      add :protein_g_per_100g, :float
      add :carbs_g_per_100g, :float
      add :fat_g_per_100g, :float
      add :fiber_g_per_100g, :float
      add :serving_sizes, {:array, :map}, default: []
      add :allergens, {:array, :string}, default: []
      add :dietary_tags, {:array, :string}, default: []
      add :notes, :text
      add :creator_id, references(:coaches, type: :binary_id, on_delete: :nilify_all)

      add :search_vector, :tsvector,
        generated: "ALWAYS AS (to_tsvector('simple', coalesce(name, ''))) STORED"

      add :media_id, references(:library_media, type: :binary_id, on_delete: :nilify_all)
      add :sugar_g_per_100g, :float
      add :revision, :integer, null: false, default: 1

      timestamps(type: :utc_datetime)
    end

    create index(:nutrition_foods, [:business_id])
    create index(:nutrition_foods, [:business_id, :inserted_at, :id])

    create index(:nutrition_foods, [:business_id, "lower(name)"],
             name: :nutrition_foods_business_id_lower_name_index
           )

    create index(:nutrition_foods, [:media_id])

    create index(:nutrition_foods, [:search_vector],
             name: :nutrition_foods_search_vector_idx,
             using: :gin
           )

    create constraint(:nutrition_foods, :nutrition_foods_nutrients_nonnegative,
             check: """
             (calories_per_100g IS NULL OR calories_per_100g >= 0)
             AND (protein_g_per_100g IS NULL OR protein_g_per_100g >= 0)
             AND (carbs_g_per_100g IS NULL OR carbs_g_per_100g >= 0)
             AND (fat_g_per_100g IS NULL OR fat_g_per_100g >= 0)
             AND (fiber_g_per_100g IS NULL OR fiber_g_per_100g >= 0)
             AND (sugar_g_per_100g IS NULL OR sugar_g_per_100g >= 0)
             """
           )

    create constraint(:nutrition_foods, :nutrition_foods_revision_positive, check: "revision > 0")

    create table(:nutrition_recipes, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :business_id, references(:businesses, type: :binary_id)
      add :name, :string, null: false
      add :description, :text
      add :instructions, :text
      add :servings_count, :integer, null: false
      add :cooked_weight_g, :float
      add :allergens, {:array, :string}, default: []
      add :dietary_tags, {:array, :string}, default: []
      add :creator_id, references(:coaches, type: :binary_id, on_delete: :nilify_all)
      add :revision, :integer, null: false, default: 1

      timestamps(type: :utc_datetime)
    end

    create index(:nutrition_recipes, [:business_id])
    create index(:nutrition_recipes, [:business_id, :inserted_at, :id])

    create constraint(:nutrition_recipes, :nutrition_recipes_cooked_weight_positive,
             check: "cooked_weight_g IS NULL OR cooked_weight_g > 0"
           )

    create constraint(:nutrition_recipes, :nutrition_recipes_revision_positive,
             check: "revision > 0"
           )

    create constraint(:nutrition_recipes, :nutrition_recipes_servings_count_positive,
             check: "servings_count > 0"
           )

    create table(:nutrition_recipe_ingredients, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :position, :integer, null: false, default: 0

      add :recipe_id, references(:nutrition_recipes, type: :binary_id, on_delete: :delete_all),
        null: false

      add :food_id, references(:nutrition_foods, type: :binary_id, on_delete: :restrict),
        null: false

      add :portion, :map, null: false
    end

    create index(:nutrition_recipe_ingredients, [:business_id])
    create index(:nutrition_recipe_ingredients, [:recipe_id])

    create unique_index(:nutrition_recipe_ingredients, [:recipe_id, :position],
             name: :nutrition_recipe_ingredients_recipe_id_position_index
           )

    create constraint(:nutrition_recipe_ingredients, :nutrition_recipe_ingredients_portion_check,
             check: """
             (jsonb_typeof(portion) = 'object' AND (
               (portion->>'kind' = 'gram' AND jsonb_typeof(portion->'grams') = 'number' AND (portion->>'grams')::float > 0)
               OR (portion->>'kind' = 'serving' AND jsonb_typeof(portion->'amount') = 'number'
                   AND (portion->>'amount')::float > 0 AND jsonb_typeof(portion->'unit') = 'string'
                   AND length(portion->>'unit') > 0
                   AND (NOT portion ? 'label' OR jsonb_typeof(portion->'label') IN ('string','null'))
                   AND (NOT portion ? 'grams' OR jsonb_typeof(portion->'grams') = 'null'
                        OR (jsonb_typeof(portion->'grams') = 'number' AND (portion->>'grams')::float > 0)))
             )) IS TRUE
             """
           )

    create constraint(
             :nutrition_recipe_ingredients,
             :nutrition_recipe_ingredients_position_nonnegative,
             check: "position >= 0"
           )

    create table(:nutrition_plans, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :name, :string, null: false
      add :description, :text
      add :start_date, :date
      add :end_date, :date
      add :target_calories, :float
      add :target_protein_g, :float
      add :target_carbs_g, :float
      add :target_fat_g, :float
      add :target_fiber_g, :float
      add :creator_id, references(:users, type: :binary_id, on_delete: :nilify_all)

      add :client_id,
          references(:clients,
            type: :binary_id,
            with: [business_id: :business_id],
            name: :nutrition_plans_client_business_id_fkey,
            on_delete: :delete_all
          )

      add :source_template_id, :binary_id
      add :kind, :string, null: false
      add :revision, :integer, null: false, default: 1
      add :archived_at, :utc_datetime
      add :menu, :map, null: false

      timestamps(type: :utc_datetime)
    end

    create index(:nutrition_plans, [:business_id, :client_id, :start_date, :end_date],
             name: :nutrition_plans_active_client_coverage_index,
             where: "kind = 'client_plan' AND archived_at IS NULL AND start_date IS NOT NULL"
           )

    create index(:nutrition_plans, [:business_id, :client_id])
    create index(:nutrition_plans, [:business_id])
    create index(:nutrition_plans, [:business_id, :kind, :archived_at])
    create index(:nutrition_plans, [:business_id, :kind, :inserted_at, :id])
    create unique_index(:nutrition_plans, [:id, :business_id])
    create index(:nutrition_plans, [:menu], using: :gin)

    create unique_index(:nutrition_plans, [:business_id, :client_id],
             name: :nutrition_plans_one_incomplete_client_plan_index,
             where: "kind = 'client_plan' AND archived_at IS NULL AND start_date IS NULL"
           )

    execute(
      """
      ALTER TABLE nutrition_plans ADD CONSTRAINT nutrition_plans_source_template_business_id_fkey
      FOREIGN KEY (source_template_id, business_id)
      REFERENCES nutrition_plans(id, business_id) ON DELETE SET NULL (source_template_id)
      """,
      "ALTER TABLE nutrition_plans DROP CONSTRAINT nutrition_plans_source_template_business_id_fkey"
    )

    create constraint(:nutrition_plans, :nutrition_plans_kind_check,
             check: "kind in ('template','client_plan')"
           )

    create constraint(:nutrition_plans, :nutrition_plans_kind_fields_check,
             check: """
             (kind = 'template' AND client_id IS NULL AND source_template_id IS NULL
               AND start_date IS NULL AND end_date IS NULL)
             OR
             (kind = 'client_plan' AND client_id IS NOT NULL)
             """
           )

    create constraint(:nutrition_plans, :nutrition_plans_menu_shape,
             check: """
             (jsonb_typeof(menu) = 'object'
             AND jsonb_typeof(menu->'meals') = 'array'
             AND jsonb_typeof(menu->'day_patterns') = 'array'
             AND jsonb_typeof(menu->'schedule') = 'object') IS TRUE
             """
           )

    create constraint(:nutrition_plans, :nutrition_plans_period_check,
             check: "start_date IS NULL OR end_date IS NULL OR start_date <= end_date"
           )

    create constraint(:nutrition_plans, :nutrition_plans_revision_check, check: "revision > 0")

    create constraint(:nutrition_plans, :nutrition_plans_targets_check,
             check: """
             (target_calories IS NULL OR target_calories >= 0) AND
             (target_protein_g IS NULL OR target_protein_g >= 0) AND
             (target_carbs_g IS NULL OR target_carbs_g >= 0) AND
             (target_fat_g IS NULL OR target_fat_g >= 0) AND
             (target_fiber_g IS NULL OR target_fiber_g >= 0)
             """
           )

    create table(:nutrition_diary_days, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :client_id,
          references(:clients,
            type: :binary_id,
            with: [business_id: :business_id],
            name: :nutrition_diary_days_client_business_fkey,
            on_delete: :delete_all
          ),
          null: false

      add :local_date, :date, null: false
      add :target_calories, :float
      add :target_protein_g, :float
      add :target_carbs_g, :float
      add :target_fat_g, :float
      add :target_fiber_g, :float

      timestamps(type: :utc_datetime)
    end

    create unique_index(:nutrition_diary_days, [:business_id, :client_id, :local_date])
    create unique_index(:nutrition_diary_days, [:id, :business_id, :client_id, :local_date])

    execute(
      """
      ALTER TABLE nutrition_diary_days ADD CONSTRAINT nutrition_diary_days_client_id_fkey
      FOREIGN KEY (client_id)
      REFERENCES clients(id) ON DELETE CASCADE
      """,
      "ALTER TABLE nutrition_diary_days DROP CONSTRAINT nutrition_diary_days_client_id_fkey"
    )

    create constraint(:nutrition_diary_days, :nutrition_diary_days_targets_check,
             check: """
             (target_calories IS NULL OR target_calories >= 0) AND
             (target_protein_g IS NULL OR target_protein_g >= 0) AND
             (target_carbs_g IS NULL OR target_carbs_g >= 0) AND
             (target_fat_g IS NULL OR target_fat_g >= 0) AND
             (target_fiber_g IS NULL OR target_fiber_g >= 0)
             """
           )

    create table(:nutrition_diary_slots, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :local_date, :date, null: false
      add :meal_slot, :string, null: false
      add :applied_timezone, :string, null: false
      add :has_coverage, :boolean, null: false
      add :revision, :integer, null: false, default: 1

      add :client_id,
          references(:clients,
            type: :binary_id,
            with: [business_id: :business_id],
            name: :nutrition_diary_slots_client_business_id_fkey,
            on_delete: :delete_all
          ),
          null: false

      add :nutrition_diary_day_id,
          references(:nutrition_diary_days,
            type: :binary_id,
            with: [business_id: :business_id, client_id: :client_id, local_date: :local_date],
            name: :nutrition_diary_slots_day_identity_fkey,
            on_delete: :delete_all
          ),
          null: false

      add :document, :map, null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:nutrition_diary_slots, [:id, :client_id, :business_id],
             name: :nutrition_diary_slots_id_client_business_index
           )

    create unique_index(
             :nutrition_diary_slots,
             [:business_id, :client_id, :local_date, :meal_slot],
             name: :nutrition_diary_slots_identity_index
           )

    create constraint(:nutrition_diary_slots, :nutrition_diary_slots_document_check,
             check: """
             (jsonb_typeof(document) = 'object' AND document ?& ARRAY['meal_id','options','entries']
               AND jsonb_typeof(document->'options') = 'array' AND jsonb_typeof(document->'entries') = 'array'
               AND jsonb_typeof(document->'meal_id') IN ('string','null')) IS TRUE
             """
           )

    create constraint(:nutrition_diary_slots, :nutrition_diary_slots_meal_slot_check,
             check:
               "meal_slot in ('early_morning','breakfast','mid_morning','lunch','afternoon','evening','dinner','pre_sleep','pre_workout','during_workout','post_workout')"
           )

    create constraint(:nutrition_diary_slots, :nutrition_diary_slots_revision_check,
             check: "revision > 0"
           )
  end
end
