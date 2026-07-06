defmodule EasyWeb.Coaches.PlanDayJSON do
  @spec show(map()) :: map()
  def show(%{day: day}) do
    %{data: %{id: day.id, name: day.name, position: day.position}}
  end

  @spec option(map()) :: map()
  def option(%{day_meal: dm}) do
    %{
      data: %{
        id: dm.id,
        meal_slot: dm.meal_slot,
        position: dm.position,
        nutrition_meal_id: dm.nutrition_meal_id,
        nutrition_plan_day_id: dm.nutrition_plan_day_id
      }
    }
  end

  @spec assignment(map()) :: map()
  def assignment(%{assignment: wa}) do
    %{data: %{day_of_week: wa.day_of_week, nutrition_plan_day_id: wa.nutrition_plan_day_id}}
  end
end
