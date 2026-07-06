defmodule Easy.Repo.Migrations.AddMealIdToMealLogs do
  use Ecto.Migration

  def change do
    alter table(:nutrition_meal_logs) do
      add :nutrition_meal_id,
          references(:nutrition_meals, type: :binary_id, on_delete: :nilify_all)
    end
  end
end
