defmodule Easy.Repo.Migrations.RestrictLibraryStructuralReferences do
  use Ecto.Migration

  def up do
    execute("DELETE FROM nutrition_recipe_ingredients WHERE food_id IS NULL")

    drop_if_exists constraint(
                     :nutrition_recipe_ingredients,
                     :nutrition_recipe_ingredients_food_id_fkey
                   )

    execute("""
    ALTER TABLE nutrition_recipe_ingredients
    ALTER COLUMN food_id SET NOT NULL
    """)

    execute("""
    ALTER TABLE nutrition_recipe_ingredients
    ADD CONSTRAINT nutrition_recipe_ingredients_food_id_fkey
    FOREIGN KEY (food_id) REFERENCES nutrition_foods(id)
    ON DELETE RESTRICT
    """)

    drop_if_exists constraint(:nutrition_meal_items, :nutrition_meal_items_food_id_fkey)
    drop_if_exists constraint(:nutrition_meal_items, :nutrition_meal_items_recipe_id_fkey)

    execute("""
    ALTER TABLE nutrition_meal_items
    ADD CONSTRAINT nutrition_meal_items_food_id_fkey
    FOREIGN KEY (food_id) REFERENCES nutrition_foods(id)
    ON DELETE RESTRICT
    """)

    execute("""
    ALTER TABLE nutrition_meal_items
    ADD CONSTRAINT nutrition_meal_items_recipe_id_fkey
    FOREIGN KEY (recipe_id) REFERENCES nutrition_recipes(id)
    ON DELETE RESTRICT
    """)
  end

  def down do
    drop_if_exists constraint(
                     :nutrition_recipe_ingredients,
                     :nutrition_recipe_ingredients_food_id_fkey
                   )

    execute("""
    ALTER TABLE nutrition_recipe_ingredients
    ALTER COLUMN food_id DROP NOT NULL
    """)

    execute("""
    ALTER TABLE nutrition_recipe_ingredients
    ADD CONSTRAINT nutrition_recipe_ingredients_food_id_fkey
    FOREIGN KEY (food_id) REFERENCES nutrition_foods(id)
    ON DELETE SET NULL
    """)

    drop_if_exists constraint(:nutrition_meal_items, :nutrition_meal_items_food_id_fkey)
    drop_if_exists constraint(:nutrition_meal_items, :nutrition_meal_items_recipe_id_fkey)

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
end
