defmodule EasyWeb.Coaches.MealLogJSON do
  alias Easy.Nutrition.FoodLogEntry
  alias Easy.Nutrition.MealLog

  @spec index(map()) :: map()
  def index(%{meal_logs: meal_logs}) do
    %{data: Enum.map(meal_logs, &data/1)}
  end

  @spec summary(map()) :: map()
  def summary(%{summaries: summaries}) do
    %{data: summaries}
  end

  defp data(%MealLog{} = ml) do
    %{
      id: ml.id,
      date: ml.date,
      meal_slot: ml.meal_slot,
      planned_snapshot: ml.planned_snapshot,
      planned_calories: ml.planned_calories,
      logged_calories: ml.logged_calories,
      client_id: ml.client_id,
      food_log_entries: Enum.map(ml.food_log_entries, &entry_data/1),
      inserted_at: ml.inserted_at,
      updated_at: ml.updated_at
    }
  end

  defp entry_data(%FoodLogEntry{} = e) do
    %{
      id: e.id,
      food_name: e.food_name,
      amount: e.amount,
      unit: e.unit,
      weight_g: e.weight_g,
      calories: e.calories,
      protein_g: e.protein_g,
      carbs_g: e.carbs_g,
      fat_g: e.fat_g,
      notes: e.notes,
      source: e.source,
      planned_item_index: e.planned_item_index,
      food_id: e.food_id,
      recipe_id: e.recipe_id,
      meal_log_id: e.meal_log_id,
      inserted_at: e.inserted_at,
      updated_at: e.updated_at
    }
  end
end
