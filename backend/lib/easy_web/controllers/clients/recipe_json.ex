defmodule EasyWeb.Clients.RecipeJSON do
  alias Easy.Nutrition.Food
  alias Easy.Nutrition.Recipe
  alias Easy.Nutrition.RecipeIngredient

  @spec show(map()) :: map()
  def show(%{recipe: recipe}) do
    %{data: data(recipe)}
  end

  @spec index(map()) :: map()
  def index(%{recipes: recipes, count: count}) do
    %{data: Enum.map(recipes, &data/1), count: count}
  end

  defp data(%Recipe{} = recipe) do
    %{
      id: recipe.id,
      name: recipe.name,
      macros: recipe.macros,
      source: recipe.source,
      category: recipe.category,
      tags: recipe.tags || [],
      instructions: recipe.instructions,
      image_url: recipe.image_url,
      cooked_weight_g: recipe.cooked_weight_g,
      service_size_type: recipe.service_size_type,
      serving_sizes: serving_sizes_data(recipe.serving_sizes),
      recipe_ingredients: recipe_ingredients_data(recipe.recipe_ingredients),
      inserted_at: recipe.inserted_at,
      updated_at: recipe.updated_at
    }
  end

  defp serving_sizes_data(sizes) when is_list(sizes) do
    Enum.map(sizes, fn s -> %{unit: s.unit, weight_g: s.weight_g, amount: s.amount} end)
  end

  defp serving_sizes_data(_), do: []

  defp recipe_ingredients_data(ingredients) when is_list(ingredients) do
    Enum.map(ingredients, &recipe_ingredient_data/1)
  end

  defp recipe_ingredients_data(_), do: []

  defp recipe_ingredient_data(%RecipeIngredient{} = ri) do
    %{
      food_id: ri.food_id,
      food: food_data(ri.food),
      unit: ri.unit,
      amount: ri.amount,
      weight_g: ri.weight_g
    }
  end

  defp food_data(%Food{} = food) do
    %{
      id: food.id,
      name: food.name,
      macros: food.macros
    }
  end

  defp food_data(_), do: nil
end
