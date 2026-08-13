defmodule EasyWeb.NutritionDayJSON do
  alias Easy.Nutrition.FoodLogEntry

  @spec index(map()) :: map()
  def index(%{days: days}) do
    %{data: Enum.map(days, &day_data/1)}
  end

  defp day_data(day) do
    %{
      date: day.date,
      plan_id: day.plan_id,
      targets: day.targets,
      slots: Enum.map(day.slots, &slot_data/1)
    }
  end

  defp slot_data(slot) do
    %{
      meal_slot: slot.meal_slot,
      meal_id: slot.meal_id,
      planned_calories: slot.planned_calories,
      logged_calories: slot.logged_calories,
      options: slot.options,
      rows: Enum.map(slot.rows, &row_data/1)
    }
  end

  defp row_data(%{status: status, planned: planned, entry: entry}) do
    %{
      status: status,
      planned: planned,
      entry: entry && entry_data(entry)
    }
  end

  defp entry_data(%FoodLogEntry{} = entry) do
    %{
      id: entry.id,
      food_name: entry.food_name,
      amount: entry.amount,
      unit: entry.unit,
      weight_g: entry.weight_g,
      calories: entry.calories,
      protein_g: entry.protein_g,
      carbs_g: entry.carbs_g,
      fat_g: entry.fat_g,
      fiber_g: entry.fiber_g,
      notes: entry.notes,
      planned_item_id: entry.planned_item_id,
      food_id: entry.food_id,
      recipe_id: entry.recipe_id,
      nutrition_meal_log_id: entry.nutrition_meal_log_id,
      inserted_at: entry.inserted_at,
      updated_at: entry.updated_at
    }
  end
end
