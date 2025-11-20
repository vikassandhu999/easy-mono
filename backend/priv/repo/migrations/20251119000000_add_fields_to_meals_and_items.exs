defmodule Easy.Repo.Migrations.AddFieldsToMealsAndItems do
  use Ecto.Migration

  def change do
    alter table(:meals) do
      add :sort_order, :integer, default: 0
    end

    alter table(:meal_items) do
      add :servings, :decimal
    end
  end
end
