defmodule EasyWeb.NutritionDayJSON do
  alias Easy.Nutrition.NutrientTotals

  @spec index(map()) :: map()
  def index(%{days: days, count: count}) do
    %{data: Enum.map(days, &day_data/1), count: count}
  end

  @spec show(map()) :: map()
  def show(%{day: day}) do
    %{data: day_data(day)}
  end

  defp day_data(day) do
    %{
      date: day.date,
      plan_id: day.plan_id,
      write_eligible: day.write_eligible,
      applied_timezone: day.applied_timezone,
      targets: round_targets(day.targets),
      summary: summary_data(day.summary),
      slots: Enum.map(day.slots, &slot_data/1)
    }
  end

  defp summary_data(summary) do
    %{
      logged: NutrientTotals.round(summary.logged),
      planned: NutrientTotals.round(summary.planned),
      counts: summary.counts,
      has_intake: summary.has_intake,
      adherence: summary.adherence
    }
  end

  defp slot_data(slot) do
    %{
      meal_slot: slot.meal_slot,
      meal_id: slot.meal_id,
      revision: slot.revision,
      applied_timezone: slot.applied_timezone,
      write_eligible: slot.write_eligible,
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
      planned_item_ref: item.planned_item_ref,
      kind: item.kind,
      name: item.name,
      food_id: item.food_id,
      recipe_id: item.recipe_id,
      position: item.position,
      portion: item.portion,
      nutrients: NutrientTotals.round(item.nutrients)
    }
  end

  defp row_data(row) do
    %{
      status: row.status,
      planned: row.planned && item_data(row.planned),
      entry: row.entry && entry_data(row.entry)
    }
  end

  defp entry_data(entry) do
    %{
      id: entry.id,
      kind: entry.kind,
      name: entry.name,
      food_id: entry.food_id,
      recipe_id: entry.recipe_id,
      portion: entry.portion,
      nutrients: NutrientTotals.round(entry.nutrients),
      notes: entry.notes,
      revision: entry.revision,
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
