defmodule Easy.Repo.Migrations.CreateMealIngredients do
  use Ecto.Migration

  def change do
    create table(:meal_ingredients, primary_key: false) do
      add :id, :uuid, primary_key: true, default: fragment("gen_random_uuid()")
      add :quantity, :decimal, precision: 10, scale: 2, null: false
      add :unit, :string, size: 50, null: false
      add :notes, :text

      # Foreign keys
      add :meal_id, references(:meals, type: :uuid, on_delete: :delete_all), null: false
      add :ingredient_id, references(:ingredients, type: :uuid, on_delete: :nothing), null: false

      timestamps()
    end

    # Indexes
    create index(:meal_ingredients, [:meal_id])
    create index(:meal_ingredients, [:ingredient_id])
  end
end
