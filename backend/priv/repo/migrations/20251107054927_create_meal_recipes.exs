defmodule Easy.Repo.Migrations.CreateMealRecipes do
  use Ecto.Migration

  def change do
    create table(:meal_recipes, primary_key: false) do
      add :id, :uuid, primary_key: true, default: fragment("gen_random_uuid()")
      add :servings, :decimal, precision: 10, scale: 2, null: false, default: 1.0
      add :notes, :text

      # Foreign keys
      add :meal_id, references(:meals, type: :uuid, on_delete: :delete_all), null: false
      add :recipe_id, references(:recipes, type: :uuid, on_delete: :nothing), null: false

      timestamps()
    end

    # Indexes
    create index(:meal_recipes, [:meal_id])
    create index(:meal_recipes, [:recipe_id])

    # Unique constraint to prevent duplicate recipes in same meal
    create unique_index(:meal_recipes, [:meal_id, :recipe_id])
  end
end
