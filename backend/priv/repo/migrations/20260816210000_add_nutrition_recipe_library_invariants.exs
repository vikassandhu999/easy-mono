defmodule Easy.Repo.Migrations.AddNutritionRecipeLibraryInvariants do
  use Ecto.Migration

  def up do
    execute(
      "UPDATE nutrition_recipes SET cooked_weight_g = NULL WHERE cooked_weight_g IS NOT NULL AND cooked_weight_g <= 0"
    )

    alter table(:nutrition_recipes) do
      add :revision, :integer, null: false, default: 1
    end

    create constraint(:nutrition_recipes, :nutrition_recipes_revision_positive,
             check: "revision > 0"
           )

    create constraint(:nutrition_recipes, :nutrition_recipes_cooked_weight_positive,
             check: "cooked_weight_g IS NULL OR cooked_weight_g > 0"
           )

    execute("""
    WITH ordered AS (
      SELECT
        id,
        ROW_NUMBER() OVER (PARTITION BY recipe_id ORDER BY position, id) - 1 AS new_position
      FROM nutrition_recipe_ingredients
    )
    UPDATE nutrition_recipe_ingredients AS ingredient
    SET position = ordered.new_position
    FROM ordered
    WHERE ingredient.id = ordered.id
    """)

    create constraint(
             :nutrition_recipe_ingredients,
             :nutrition_recipe_ingredients_position_nonnegative, check: "position >= 0")

    create unique_index(:nutrition_recipe_ingredients, [:recipe_id, :position],
             name: :nutrition_recipe_ingredients_recipe_id_position_index
           )
  end

  def down do
    drop index(
           :nutrition_recipe_ingredients,
           :nutrition_recipe_ingredients_recipe_id_position_index
         )

    drop constraint(
           :nutrition_recipe_ingredients,
           :nutrition_recipe_ingredients_position_nonnegative
         )

    drop constraint(:nutrition_recipes, :nutrition_recipes_cooked_weight_positive)
    drop constraint(:nutrition_recipes, :nutrition_recipes_revision_positive)

    alter table(:nutrition_recipes) do
      remove :revision
    end
  end
end
