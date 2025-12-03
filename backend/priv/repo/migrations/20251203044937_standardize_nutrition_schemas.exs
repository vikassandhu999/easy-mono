defmodule Easy.Repo.Migrations.StandardizeNutritionSchemas do
  use Ecto.Migration

  def change do
    # =================================================================
    # Standardize field naming across Training and Nutrition domains
    # =================================================================

    # 1. Rename creator_id to author_id in nutrition_plans
    rename table(:nutrition_plans), :creator_id, to: :author_id

    # 2. Rename original_plan_id to original_template_id in nutrition_plans
    rename table(:nutrition_plans), :original_plan_id, to: :original_template_id

    # 3. Rename creator_id to author_id in recipes
    rename table(:recipes), :creator_id, to: :author_id

    # 4. Rename creator_id to author_id in ingredients
    rename table(:ingredients), :creator_id, to: :author_id

    # 5. Rename sort_order to position in meals
    rename table(:meals), :sort_order, to: :position

    # 6. Rename sort_order to position in meal_items
    rename table(:meal_items), :sort_order, to: :position

    # 7. Rename order to position in recipe_ingredients
    rename table(:recipe_ingredients), :order, to: :position

    # 8. Add status field to training_plans for lifecycle parity
    alter table(:training_plans) do
      add :status, :string, default: "active", null: false
    end

    # 9. Convert measurement_units.system from string to enum-compatible format
    # (The field remains a string in the database, but Ecto.Enum handles the conversion)
    # No migration needed for this - Ecto.Enum works with existing string columns
  end
end
