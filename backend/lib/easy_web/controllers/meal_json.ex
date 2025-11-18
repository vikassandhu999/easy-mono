defmodule EasyWeb.MealJSON do
  alias Easy.Nutrition.Meal

  def show(%{meal: meal}) do
    %{data: render_meal(meal)}
  end

  defp render_meal(%Meal{} = meal) do
    %{
      id: meal.id,
      day_number: meal.day_number,
      daytime: meal.daytime,
      label: meal.label,
      time: meal.time,
      notes: meal.notes,
      inserted_at: meal.inserted_at,
      updated_at: meal.updated_at
    }
  end
end
