defmodule Easy.Repo.Migrations.CreateNutritionMealItems do
  use Ecto.Migration

  def change do
    create table(:meal_items, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :weight_g, :float
      add :amount, :float
      add :unit, :string
      add :position, :integer, default: 0

      add :recipe_id, references(:recipes, type: :binary_id, on_delete: :nilify_all)
      add :food_id, references(:foods, type: :binary_id, on_delete: :nilify_all)
      add :meal_id, references(:meals, type: :binary_id, on_delete: :delete_all)
      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing)

      timestamps(type: :utc_datetime)
    end

    create index(:meal_items, [:meal_id])
    create index(:meal_items, [:business_id])
    create unique_index(:meal_items, [:meal_id, :position])
  end
end
