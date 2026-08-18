defmodule Easy.Repo.Migrations.DropLegacyNutritionTables do
  use Ecto.Migration

  def up do
    drop_if_exists table(:nutrition_food_log_entries)
    drop_if_exists table(:nutrition_meal_logs)
    drop_if_exists table(:nutrition_day_meals)
    drop_if_exists table(:nutrition_weekday_assignments)
    drop_if_exists table(:nutrition_plan_days)
  end

  def down do
    raise "irreversible — leftover Programming and Diary tables were replaced"
  end
end
