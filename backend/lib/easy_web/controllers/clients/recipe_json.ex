defmodule EasyWeb.Clients.RecipeJSON do
  alias Easy.MacroCalc
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
      description: recipe.description,
      instructions: recipe.instructions,
      servings_count: recipe.servings_count,
      cooked_weight_g: recipe.cooked_weight_g,
      allergens: recipe.allergens || [],
      dietary_tags: recipe.dietary_tags || [],
      nutrition: MacroCalc.recipe_totals(recipe),
      serving_sizes: serving_sizes_data(recipe.serving_sizes),
      recipe_ingredients: recipe_ingredients_data(recipe.recipe_ingredients),
      inserted_at: recipe.inserted_at,
      updated_at: recipe.updated_at
    }
  end

  defp serving_sizes_data(serving_sizes) when is_list(serving_sizes) do
    for serving_size <- serving_sizes do
      %{
        label: serving_size.label,
        amount: serving_size.amount,
        unit: serving_size.unit,
        weight_g: serving_size.weight_g,
        is_default: serving_size.is_default
      }
    end
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
      weight_g: ri.weight_g,
      position: ri.position
    }
  end

  defp food_data(%Food{} = food) do
    %{
      id: food.id,
      name: food.name,
      calories_per_100g: food.calories_per_100g,
      protein_g_per_100g: food.protein_g_per_100g,
      carbs_g_per_100g: food.carbs_g_per_100g,
      fat_g_per_100g: food.fat_g_per_100g,
      fiber_g_per_100g: food.fiber_g_per_100g
    }
  end

  defp food_data(_), do: nil
end
