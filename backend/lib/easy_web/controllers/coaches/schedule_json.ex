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

  defp entry(%ScheduleEntry{} = e) do
    %{
      id: e.id,
      day_of_week: e.day_of_week,
      meal_slot: e.meal_slot,
      meal_id: e.nutrition_meal_id,
      meal_name: meal_name(e.meal)
    }
  end

  defp meal_name(%Easy.Nutrition.Meal{name: name}), do: name
  defp meal_name(_), do: nil
end
