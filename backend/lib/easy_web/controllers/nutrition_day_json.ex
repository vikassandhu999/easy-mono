defmodule EasyWeb.NutritionDayJSON do
  alias Easy.Nutrition.{FoodLogEntry, NutrientTotals}

  @spec index(map()) :: map()
  def index(%{days: days}) do
    %{data: Enum.map(days, &day_data/1)}
  end

  defp day_data(day) do
    %{
      date: day.date,
      plan_id: day.plan_id,
      write_eligible: day.write_eligible,
      targets: round_targets(day.targets),
      slots: Enum.map(day.slots, &slot_data/1)
    }
  end

  defp slot_data(slot) do
    %{
      meal_slot: slot.meal_slot,
      meal_id: slot.meal_id,
      planned_calories: round_one(slot.planned_calories),
      logged_calories: round_one(slot.logged_calories),
      options: Enum.map(slot.options, &option_data/1),
      rows: Enum.map(slot.rows, &row_data/1)
    }
  end

  defp option_data(option) do
    %{
      meal_id: option.meal_id,
      meal_name: option.meal_name,
      position: option.position,
      items: Enum.map(option.items, &item_data/1)
    }
  end

  defp item_data(item) do
    %{
      meal_item_id: item.meal_item_id,
      kind: item.kind,
      name: item.name,
      food_id: item.food_id,
      recipe_id: item.recipe_id,
      position: item.position,
      portion: item.portion,
      nutrients: NutrientTotals.round(item.nutrients)
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
      calories: round_one(entry.calories),
      protein_g: round_one(entry.protein_g),
      carbs_g: round_one(entry.carbs_g),
      fat_g: round_one(entry.fat_g),
      fiber_g: round_one(entry.fiber_g),
      notes: entry.notes,
      planned_item_id: entry.planned_item_id,
      food_id: entry.food_id,
      recipe_id: entry.recipe_id,
      nutrition_meal_log_id: entry.nutrition_meal_log_id,
      inserted_at: entry.inserted_at,
      updated_at: entry.updated_at
    }
  end

  defp round_targets(targets) do
    %{
      calories: round_one(targets.calories),
      protein_g: round_one(targets.protein_g),
      carbs_g: round_one(targets.carbs_g),
      fat_g: round_one(targets.fat_g),
      fiber_g: round_one(targets.fiber_g)
    }
  end

  defp round_one(nil), do: nil
  defp round_one(value) when is_number(value), do: Float.round(value / 1, 1)
end
