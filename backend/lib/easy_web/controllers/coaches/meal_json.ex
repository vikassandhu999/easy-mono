defmodule EasyWeb.Coaches.MealJSON do
  alias Easy.Nutrition.Meal
  alias Easy.Nutrition.MealItem

  @spec show(map()) :: map()
  def show(%{meal: meal}) do
    %{data: data(meal)}
  end

  @spec index(map()) :: map()
  def index(%{meals: meals, count: count}) do
    %{data: Enum.map(meals, &data/1), count: count}
  end

  defp data(%Meal{} = meal) do
    %{
      id: meal.id,
      name: meal.name,
      macros: meal.macros,
      meal_items: meal_items_data(meal.meal_items),
      creator_id: meal.creator_id,
      business_id: meal.business_id,
      plan_id: meal.plan_id,
      inserted_at: meal.inserted_at,
      updated_at: meal.updated_at
    }
  end

  defp meal_items_data(meal_items) when is_list(meal_items) do
    Enum.map(meal_items, &meal_item_data/1)
  end

  defp meal_items_data(_), do: []

  defp meal_item_data(%MealItem{} = meal_item) do
    %{
      id: meal_item.id,
      weight_g: meal_item.weight_g,
      amount: meal_item.amount,
      unit: meal_item.unit,
      position: meal_item.position,
      recipe_id: meal_item.recipe_id,
      food_id: meal_item.food_id,
      meal_id: meal_item.meal_id,
      business_id: meal_item.business_id,
      inserted_at: meal_item.inserted_at,
      updated_at: meal_item.updated_at
    }
  end

  defp meal_item_data(_), do: nil
end
