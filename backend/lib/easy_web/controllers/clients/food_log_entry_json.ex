defmodule EasyWeb.Clients.FoodLogEntryJSON do
  alias Easy.Nutrition.FoodLogEntry

  @spec show(map()) :: map()
  def show(%{food_log_entry: entry}) do
    %{data: data(entry)}
  end

  @spec bulk(map()) :: map()
  def bulk(%{food_log_entries: entries}) do
    %{data: Enum.map(entries, &data/1)}
  end

  defp data(%FoodLogEntry{} = e) do
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
