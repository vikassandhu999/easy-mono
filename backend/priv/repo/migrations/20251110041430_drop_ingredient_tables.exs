defmodule Easy.Repo.Migrations.DropIngredientTables do
  use Ecto.Migration

  def up do
    # Drop join tables first (they have foreign keys to ingredients table)
    drop table(:meal_ingredients)
    drop table(:recipe_ingredients)

    # Drop ingredients table last
    drop table(:ingredients)
  end

  def down do
    # Rollback not supported - would require recreating tables and data
    raise "Migration rollback not supported"
  end
end
