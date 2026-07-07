defmodule Easy.Repo.Migrations.AddNutritionDayIndexes do
  use Ecto.Migration

  def change do
    create index(:nutrition_weekday_assignments, [:nutrition_plan_day_id])
    create index(:nutrition_meal_logs, [:nutrition_meal_id])
  end
end
