defmodule EasyWeb.Coaches.FoodLogJSON do
  alias Easy.Nutrition.Food
  alias Easy.Nutrition.FoodLog
  alias Easy.Nutrition.Recipe

  @spec index(map()) :: map()
  def index(%{food_logs: food_logs}) do
    %{data: Enum.map(food_logs, &data/1)}
  end

  @spec summary(map()) :: map()
  def summary(%{summaries: summaries}) do
    %{data: summaries}
  end

  defp data(%FoodLog{} = log) do
    %{
      id: log.id,
      date: log.date,
      meal_slot: log.meal_slot,
      amount: log.amount,
      unit: log.unit,
      weight_g: log.weight_g,
      notes: log.notes,
      macros_snapshot: log.macros_snapshot,
      food_name_snapshot: log.food_name_snapshot,
      food_id: log.food_id,
      recipe_id: log.recipe_id,
      meal_item_id: log.meal_item_id,
      client_id: log.client_id,
      food: food_data(log.food),
      recipe: recipe_data(log.recipe),
      inserted_at: log.inserted_at,
      updated_at: log.updated_at
    }
  end

  defp food_data(%Food{} = food) do
    %{id: food.id, name: food.name, macros: food.macros}
  end

  defp food_data(_), do: nil

  defp recipe_data(%Recipe{} = recipe) do
    %{id: recipe.id, name: recipe.name, macros: recipe.macros}
  end

  defp recipe_data(_), do: nil
end
