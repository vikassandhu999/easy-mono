defmodule Easy.Repo.Migrations.ResetNutritionDiary do
  use Ecto.Migration

  def up do
    execute("DELETE FROM nutrition_food_log_entries")
    execute("DELETE FROM nutrition_meal_logs")
  end

  def down do
    :ok
  end
end
