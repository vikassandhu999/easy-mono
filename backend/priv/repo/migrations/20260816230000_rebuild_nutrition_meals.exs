defmodule Easy.Repo.Migrations.RebuildNutritionMeals do
  use Ecto.Migration

  def up do
    execute("DELETE FROM nutrition_meal_items")
    execute("DELETE FROM nutrition_day_meals")
    execute("DELETE FROM nutrition_meals")

    drop_if_exists constraint(:nutrition_meals, :nutrition_meals_nutrition_plan_id_fkey)
    drop_if_exists constraint(:nutrition_meals, :nutrition_meals_business_id_fkey)
    drop_if_exists index(:nutrition_meals, [:nutrition_plan_id])
    drop_if_exists index(:nutrition_meals, [:business_id])

    alter table(:nutrition_meals) do
      add :position, :integer, null: false, default: 0
    end

    create unique_index(:nutrition_meals, [:id, :nutrition_plan_id, :business_id])
    create unique_index(:nutrition_meals, [:id, :business_id])
    create unique_index(:nutrition_meals, [:nutrition_plan_id, :position])
    create index(:nutrition_meals, [:business_id])

    create constraint(:nutrition_meals, :nutrition_meals_position_check, check: "position >= 0")

    execute("""
    ALTER TABLE nutrition_meals
    ADD CONSTRAINT nutrition_meals_plan_business_id_fkey
    FOREIGN KEY (nutrition_plan_id, business_id)
    REFERENCES nutrition_plans(id, business_id)
    ON DELETE CASCADE
    """)

    drop_if_exists constraint(:nutrition_meal_items, :nutrition_meal_items_nutrition_meal_id_fkey)
    drop_if_exists constraint(:nutrition_meal_items, :nutrition_meal_items_business_id_fkey)
    drop_if_exists constraint(:nutrition_meal_items, :nutrition_meal_items_food_id_fkey)
    drop_if_exists constraint(:nutrition_meal_items, :nutrition_meal_items_recipe_id_fkey)
    drop_if_exists constraint(:nutrition_meal_items, :nutrition_meal_items_weight_positive)
    drop_if_exists index(:nutrition_meal_items, [:nutrition_meal_id])
    drop_if_exists index(:nutrition_meal_items, [:nutrition_meal_id, :position])
    drop_if_exists unique_index(:nutrition_meal_items, [:nutrition_meal_id, :position])
    drop_if_exists index(:nutrition_meal_items, [:business_id])

    alter table(:nutrition_meal_items) do
      add :nutrition_plan_id, :binary_id, null: false
      add :portion_kind, :string, null: false
      add :serving_label, :string
      add :calories, :float
      add :protein, :float
      add :carbohydrates, :float
      add :fat, :float
      add :fiber, :float
      add :complete, :boolean, null: false, default: false
    end

    create unique_index(:nutrition_meal_items, [
             :id,
             :nutrition_meal_id,
             :nutrition_plan_id,
             :business_id
           ])

    create unique_index(:nutrition_meal_items, [:nutrition_meal_id, :position])
    create index(:nutrition_meal_items, [:business_id])
    create index(:nutrition_meal_items, [:food_id])
    create index(:nutrition_meal_items, [:recipe_id])

    create constraint(:nutrition_meal_items, :nutrition_meal_items_position_check,
             check: "position >= 0"
           )

    create constraint(:nutrition_meal_items, :nutrition_meal_items_portion_kind_check,
             check: "portion_kind in ('gram','serving')"
           )

    create constraint(:nutrition_meal_items, :nutrition_meal_items_portion_check,
             check: """
             (portion_kind = 'gram' AND weight_g IS NOT NULL AND weight_g > 0
               AND amount IS NULL AND unit IS NULL AND serving_label IS NULL)
             OR
             (portion_kind = 'serving' AND amount IS NOT NULL AND amount > 0
               AND (weight_g IS NULL OR weight_g > 0))
             """
           )

    create constraint(:nutrition_meal_items, :nutrition_meal_items_nutrients_check,
             check: """
             (calories IS NULL OR calories >= 0) AND
             (protein IS NULL OR protein >= 0) AND
             (carbohydrates IS NULL OR carbohydrates >= 0) AND
             (fat IS NULL OR fat >= 0) AND
             (fiber IS NULL OR fiber >= 0)
             """
           )

    execute("""
    ALTER TABLE nutrition_meal_items
    ADD CONSTRAINT nutrition_meal_items_meal_plan_business_id_fkey
    FOREIGN KEY (nutrition_meal_id, nutrition_plan_id, business_id)
    REFERENCES nutrition_meals(id, nutrition_plan_id, business_id)
    ON DELETE CASCADE
    """)

    execute("""
    ALTER TABLE nutrition_meal_items
    ADD CONSTRAINT nutrition_meal_items_food_id_fkey
    FOREIGN KEY (food_id) REFERENCES nutrition_foods(id)
    """)

    execute("""
    ALTER TABLE nutrition_meal_items
    ADD CONSTRAINT nutrition_meal_items_recipe_id_fkey
    FOREIGN KEY (recipe_id) REFERENCES nutrition_recipes(id)
    """)
  end

  def down do
    drop_if_exists constraint(:nutrition_meal_items, :nutrition_meal_items_recipe_id_fkey)
    drop_if_exists constraint(:nutrition_meal_items, :nutrition_meal_items_food_id_fkey)

    drop_if_exists constraint(
                     :nutrition_meal_items,
                     :nutrition_meal_items_meal_plan_business_id_fkey
                   )

    drop_if_exists constraint(:nutrition_meal_items, :nutrition_meal_items_nutrients_check)
    drop_if_exists constraint(:nutrition_meal_items, :nutrition_meal_items_portion_check)
    drop_if_exists constraint(:nutrition_meal_items, :nutrition_meal_items_portion_kind_check)
    drop_if_exists constraint(:nutrition_meal_items, :nutrition_meal_items_position_check)
    drop_if_exists index(:nutrition_meal_items, [:recipe_id])
    drop_if_exists index(:nutrition_meal_items, [:food_id])
    drop_if_exists index(:nutrition_meal_items, [:business_id])
    drop_if_exists unique_index(:nutrition_meal_items, [:nutrition_meal_id, :position])

    drop_if_exists unique_index(:nutrition_meal_items, [
                     :id,
                     :nutrition_meal_id,
                     :nutrition_plan_id,
                     :business_id
                   ])

    alter table(:nutrition_meal_items) do
      remove :nutrition_plan_id
      remove :portion_kind
      remove :serving_label
      remove :calories
      remove :protein
      remove :carbohydrates
      remove :fat
      remove :fiber
      remove :complete
    end

    create constraint(:nutrition_meal_items, :nutrition_meal_items_weight_positive,
             check: "weight_g > 0"
           )

    execute("""
    ALTER TABLE nutrition_meal_items
    ADD CONSTRAINT nutrition_meal_items_nutrition_meal_id_fkey
    FOREIGN KEY (nutrition_meal_id) REFERENCES nutrition_meals(id) ON DELETE CASCADE
    """)

    execute("""
    ALTER TABLE nutrition_meal_items
    ADD CONSTRAINT nutrition_meal_items_business_id_fkey
    FOREIGN KEY (business_id) REFERENCES businesses(id)
    """)

    execute("""
    ALTER TABLE nutrition_meal_items
    ADD CONSTRAINT nutrition_meal_items_food_id_fkey
    FOREIGN KEY (food_id) REFERENCES nutrition_foods(id) ON DELETE SET NULL
    """)

    execute("""
    ALTER TABLE nutrition_meal_items
    ADD CONSTRAINT nutrition_meal_items_recipe_id_fkey
    FOREIGN KEY (recipe_id) REFERENCES nutrition_recipes(id) ON DELETE SET NULL
    """)

    create index(:nutrition_meal_items, [:nutrition_meal_id])

    drop_if_exists constraint(:nutrition_meals, :nutrition_meals_plan_business_id_fkey)
    drop_if_exists constraint(:nutrition_meals, :nutrition_meals_position_check)
    drop_if_exists unique_index(:nutrition_meals, [:nutrition_plan_id, :position])
    drop_if_exists unique_index(:nutrition_meals, [:id, :business_id])
    drop_if_exists unique_index(:nutrition_meals, [:id, :nutrition_plan_id, :business_id])
    drop_if_exists index(:nutrition_meals, [:business_id])

    alter table(:nutrition_meals) do
      remove :position
    end

    execute("""
    ALTER TABLE nutrition_meals
    ADD CONSTRAINT nutrition_meals_nutrition_plan_id_fkey
    FOREIGN KEY (nutrition_plan_id) REFERENCES nutrition_plans(id) ON DELETE CASCADE
    """)

    execute("""
    ALTER TABLE nutrition_meals
    ADD CONSTRAINT nutrition_meals_business_id_fkey
    FOREIGN KEY (business_id) REFERENCES businesses(id)
    """)

    create index(:nutrition_meals, [:nutrition_plan_id])
  end
end
