defmodule EasyWeb.Coaches.MealJSON do
  alias Easy.MacroCalc
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
      notes: meal.notes,
      default_meal_slot: meal.default_meal_slot,
      nutrition: MacroCalc.meal_totals(meal.meal_items),
      meal_items: meal_items_data(meal.meal_items),
      creator_id: meal.creator_id,
      nutrition_plan_id: meal.nutrition_plan_id,
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
      name: meal_item_name(meal_item),
      weight_g: meal_item.weight_g,
      amount: meal_item.amount,
      unit: meal_item.unit,
      position: meal_item.position,
      recipe_id: meal_item.recipe_id,
      food_id: meal_item.food_id,
      nutrition_meal_id: meal_item.nutrition_meal_id,
      nutrition: MacroCalc.for_meal_item(meal_item),
      inserted_at: meal_item.inserted_at,
      updated_at: meal_item.updated_at
    }
  end

  defp meal_item_data(_), do: nil

  defp meal_item_name(%MealItem{food: %{name: name}}), do: name
  defp meal_item_name(%MealItem{recipe: %{name: name}}), do: name
  defp meal_item_name(_), do: nil
end
