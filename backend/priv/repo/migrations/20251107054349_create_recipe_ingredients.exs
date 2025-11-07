defmodule Easy.Repo.Migrations.CreateRecipeIngredients do
  use Ecto.Migration

  def change do
    create table(:recipe_ingredients, primary_key: false) do
      add :id, :uuid, primary_key: true, default: fragment("gen_random_uuid()")
      add :quantity, :decimal, precision: 10, scale: 2, null: false
      add :unit, :string, size: 50, null: false
      add :notes, :text

      # Foreign keys
      add :recipe_id, references(:recipes, type: :uuid, on_delete: :delete_all), null: false
      add :ingredient_id, references(:ingredients, type: :uuid, on_delete: :nothing), null: false

      timestamps()
    end

    # Indexes
    create index(:recipe_ingredients, [:recipe_id])
    create index(:recipe_ingredients, [:ingredient_id])

    # Unique constraint to prevent duplicate ingredients in same recipe
    create unique_index(:recipe_ingredients, [:recipe_id, :ingredient_id])
  end
end
