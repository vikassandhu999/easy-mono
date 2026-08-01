defmodule Easy.Repo.Migrations.UniquePlannedFoodLogEntries do
  use Ecto.Migration

  def change do
    create unique_index(
             :nutrition_food_log_entries,
             [:nutrition_meal_log_id, :nutrition_meal_item_id],
             where: "nutrition_meal_item_id IS NOT NULL",
             name: :nutrition_food_log_entries_meal_log_item_index
           )
  end
end
