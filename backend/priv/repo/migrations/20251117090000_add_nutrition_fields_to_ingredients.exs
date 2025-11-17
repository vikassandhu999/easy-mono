defmodule Easy.Repo.Migrations.AddNutritionFieldsToIngredients do
  use Ecto.Migration

  def change do
    alter table(:ingredients) do
      add :description, :text
      add :source, :string
      add :calories, :decimal, precision: 10, scale: 2
      add :protein, :decimal, precision: 10, scale: 2
      add :carbohydrates, :decimal, precision: 10, scale: 2
      add :fats, :decimal, precision: 10, scale: 2
      add :fiber, :decimal, precision: 10, scale: 2
    end
  end
end
