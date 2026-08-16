defmodule EasyWeb.Coaches.RecipeJSON do
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

  @spec impact(map()) :: map()
  def impact(%{templates: templates, active_client_plans: active_client_plans}) do
    %{data: %{templates: templates, active_client_plans: active_client_plans}}
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
      foods: foods_data(recipe.foods),
      creator_id: recipe.creator_id,
      inserted_at: recipe.inserted_at,
      updated_at: recipe.updated_at
    }
  end

  defp recipe_ingredients_data(recipe_ingredients) when is_list(recipe_ingredients) do
    for recipe_ingredient <- recipe_ingredients do
      recipe_ingredient_data(recipe_ingredient)
    end
  end

  defp recipe_ingredients_data(_), do: []

  defp recipe_ingredient_data(%RecipeIngredient{} = recipe_ingredient) do
    %{
      food_id: recipe_ingredient.food_id,
      food: food_data(recipe_ingredient.food),
      unit: recipe_ingredient.unit,
      amount: recipe_ingredient.amount,
      weight_g: recipe_ingredient.weight_g,
      position: recipe_ingredient.position
    }
  end

  defp foods_data(foods) when is_list(foods) do
    for food <- foods do
      food_data(food)
    end
  end

  defp foods_data(_), do: []

  defp food_data(%Food{} = food) do
    food
    |> FoodPayload.data()
    |> Map.put(:creator_id, food.creator_id)
  end

  defp food_data(_), do: nil
end
