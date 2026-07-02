defmodule EasyWeb.Coaches.ScheduleJSON do
  alias Easy.Nutrition.ScheduleEntry

  @spec show(map()) :: map()
  def show(%{schedule: schedule}) do
    %{data: Map.new(schedule, fn {day, slots} -> {day, Map.new(slots, fn {slot, e} -> {slot, entry(e)} end)} end)}
  end

  @spec day(map()) :: map()
  def day(%{entries: entries}) do
    %{data: Map.new(entries, fn {slot, e} -> {slot, entry(e)} end)}
  end

  # Must match EasyWeb.OpenApi.Schemas.NutritionScheduleEntry — the frontend
  # reads nutrition_meal_id; emitting a different key breaks the schedule UI.
  defp entry(%ScheduleEntry{} = e) do
    %{
      id: e.id,
      day_of_week: e.day_of_week,
      meal_slot: e.meal_slot,
      nutrition_meal_id: e.nutrition_meal_id,
      nutrition_plan_id: e.nutrition_plan_id,
      inserted_at: e.inserted_at,
      updated_at: e.updated_at
    }
  end
end
