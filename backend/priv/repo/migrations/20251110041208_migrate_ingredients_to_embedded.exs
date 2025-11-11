defmodule Easy.Repo.Migrations.MigrateIngredientsToEmbedded do
  use Ecto.Migration

  def up do
    # Migrate recipe_ingredients to embedded ingredient names as text array
    # This query aggregates ingredient names from the join table into the recipes.ingredients array
    execute """
    UPDATE recipes r
    SET ingredients = COALESCE(
      (
        SELECT ARRAY_AGG(COALESCE(i.name, 'Unknown Ingredient') ORDER BY ri.inserted_at)
        FROM recipe_ingredients ri
        LEFT JOIN ingredients i ON i.id = ri.ingredient_id
        WHERE ri.recipe_id = r.id
      ),
      ARRAY[]::TEXT[]
    )
    """
  end

  def down do
    # Rollback not supported - would require recreating ingredient tables and relationships
    # The old tables still exist at this point, so we can clear the embedded ingredients
    execute """
    UPDATE recipes
    SET ingredients = ARRAY[]::TEXT[]
    """
  end
end
