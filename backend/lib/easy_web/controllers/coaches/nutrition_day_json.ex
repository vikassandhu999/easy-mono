defmodule EasyWeb.Coaches.NutritionDayJSON do
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
      fiber_g: e.fiber_g,
      notes: e.notes,
      planned_item_id: e.planned_item_id,
      food_id: e.food_id,
      recipe_id: e.recipe_id,
      nutrition_meal_log_id: e.nutrition_meal_log_id,
      inserted_at: e.inserted_at,
      updated_at: e.updated_at
    }
  end
end
