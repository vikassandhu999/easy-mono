defmodule EasyWeb.Coaches.MealItemJSON do
  alias Easy.Nutrition.MealItem

  def index(%{meal_items: meal_items}) do
    %{data: for(item <- meal_items, do: data(item))}
  end

  def show(%{meal_item: meal_item}) do
    %{data: data(meal_item)}
  end

  def data(%MealItem{} = item) do
    %{
      id: item.id,
      position: item.position,
      servings: item.servings,
      recipe_id: item.recipe_id,
      meal_id: item.meal_id,
      recipe:
        if(Ecto.assoc_loaded?(item.recipe) and item.recipe,
          do: EasyWeb.Coaches.RecipeJSON.show(%{recipe: item.recipe}).data,
          else: nil
        )
    }
  end
end
