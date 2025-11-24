defmodule Easy.Repo.Migrations.RenameNutritionFieldsToPer100g do
  use Ecto.Migration

  def change do
    rename table(:ingredients), :calories, to: :calories_per_100g
    rename table(:ingredients), :protein, to: :protein_per_100g
    rename table(:ingredients), :carbohydrates, to: :carbohydrates_per_100g
    rename table(:ingredients), :fats, to: :fats_per_100g
    rename table(:ingredients), :fiber, to: :fiber_per_100g
  end
end
