defmodule EasyWeb.Coaches.MealItemJSON do
  alias Easy.Nutrition.MealItem

  @spec show(map()) :: map()
  def show(%{meal_item: meal_item}) do
    %{data: data(meal_item)}
  end

  defp data(%MealItem{} = meal_item) do
    %{
      id: meal_item.id,
      weight_g: meal_item.weight_g,
      amount: meal_item.amount,
      unit: meal_item.unit,
      position: meal_item.position,
      recipe_id: meal_item.recipe_id,
      food_id: meal_item.food_id,
      nutrition_meal_id: meal_item.nutrition_meal_id,
      inserted_at: meal_item.inserted_at,
      updated_at: meal_item.updated_at
    }
  end

  defp data(_), do: nil
end
