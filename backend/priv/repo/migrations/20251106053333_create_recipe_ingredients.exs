defmodule Easy.Repo.Migrations.CreateRecipeIngredients do
  use Ecto.Migration

  def change do
    create table(:recipe_ingredients, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :order, :integer, null: false
      add :quantity, :decimal
      add :quantity_as_text, :string

      add :recipe_id, references(:recipes, on_delete: :delete_all, type: :binary_id), null: false

      add :ingredient_id, references(:ingredients, on_delete: :delete_all, type: :binary_id),
        null: false

      add :unit_id, references(:weight_units, on_delete: :nilify_all, type: :binary_id)

      timestamps()
    end

    create index(:recipe_ingredients, [:recipe_id])
    create index(:recipe_ingredients, [:ingredient_id])
    create index(:recipe_ingredients, [:unit_id])
  end
end
