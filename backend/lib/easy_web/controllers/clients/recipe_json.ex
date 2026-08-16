defmodule EasyWeb.Clients.RecipeJSON do
  alias Easy.MacroCalc
  alias Easy.Nutrition.Food
  alias Easy.Nutrition.Recipe
  alias Easy.Nutrition.RecipeIngredient
  alias EasyWeb.FoodPayload

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
      recipe_ingredients: recipe_ingredients_data(recipe.recipe_ingredients),
      inserted_at: recipe.inserted_at,
      updated_at: recipe.updated_at
    }
  end

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

  defp food_data(%Food{} = food), do: FoodPayload.data(food)
  defp food_data(_), do: nil
end
