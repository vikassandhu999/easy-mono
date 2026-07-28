defmodule EasyWeb.Coaches.PlanDayJSON do
  alias EasyWeb.Coaches.MealJSON

  @spec show(map()) :: map()
  def show(%{day: day}) do
    %{
      data: %{
        id: day.id,
        name: day.name,
        position: day.position,
        weekdays: day.weekdays,
        day_meals: Enum.map(day.day_meals, &option_data/1)
      }
    }
  end

  @spec option(map()) :: map()
  def option(%{day_meal: dm}) do
    %{data: option_data(dm)}
  end

  @spec day_meal(map()) :: map()
  def day_meal(%{day_meal: dm}) do
    %{data: Map.put(option_data(dm), :meal, MealJSON.meal_data(dm.meal))}
  end

  @spec schedule(map()) :: map()
  def schedule(%{schedule: schedule}) do
    %{data: schedule}
  end

  defp option_data(dm) do
    %{
      id: dm.id,
      meal_slot: dm.meal_slot,
      position: dm.position,
      nutrition_meal_id: dm.nutrition_meal_id,
      nutrition_plan_day_id: dm.nutrition_plan_day_id
    }
  end
end
