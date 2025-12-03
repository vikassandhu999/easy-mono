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
      position: meal.position,
      inserted_at: meal.inserted_at,
      updated_at: meal.updated_at
    }
    |> maybe_put_meal_items(meal.meal_items)
  end

  defp maybe_put_meal_items(output, %Ecto.Association.NotLoaded{}), do: output
  defp maybe_put_meal_items(output, nil), do: output

  defp maybe_put_meal_items(output, meal_items) when is_list(meal_items) do
    Map.put(output, :meal_items, Enum.map(meal_items, &render_meal_item/1))
  end

  defp render_meal_item(meal_item) do
    %{
      id: meal_item.id,
      position: meal_item.position,
      servings: meal_item.servings,
      recipe_id: meal_item.recipe_id,
      recipe: render_nested_recipe(meal_item.recipe)
    }
  end

  defp render_nested_recipe(%Ecto.Association.NotLoaded{}), do: nil
  defp render_nested_recipe(nil), do: nil

  defp render_nested_recipe(recipe) do
    %{
      id: recipe.id,
      name: recipe.name
    }
  end
end
