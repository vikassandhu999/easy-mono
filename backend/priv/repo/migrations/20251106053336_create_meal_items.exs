defmodule Easy.Repo.Migrations.CreateMealItems do
  use Ecto.Migration

  def change do
    create table(:meal_items, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :sort_order, :integer, default: 0

      add :recipe_id, references(:recipes, on_delete: :delete_all, type: :binary_id), null: false

      add :meal_id, references(:meals, on_delete: :delete_all, type: :binary_id), null: false

      timestamps()
    end

    create index(:meal_items, [:meal_id])
    create index(:meal_items, [:recipe_id])
    create unique_index(:meal_items, [:meal_id, :recipe_id], name: :meal_recipe_unique_idx)
  end
end
