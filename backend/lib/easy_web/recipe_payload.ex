defmodule EasyWeb.RecipePayload do
  alias Easy.Nutrition.{Food, NutrientTotals, Recipe, RecipeIngredient}
  alias EasyWeb.FoodPayload

  @spec data(Recipe.t()) :: map()
  def data(%Recipe{} = recipe) do
    %{
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      instructions: recipe.instructions,
      servings_count: recipe.servings_count,
      cooked_weight_g: recipe.cooked_weight_g,
      revision: recipe.revision,
      allergens: recipe.allergens || [],
      dietary_tags: recipe.dietary_tags || [],
      nutrients: NutrientTotals.round(NutrientTotals.from_recipe(recipe)),
      recipe_ingredients: ingredients_data(recipe.recipe_ingredients),
      inserted_at: recipe.inserted_at,
      updated_at: recipe.updated_at
    }
  end

  defp ingredients_data(ingredients) when is_list(ingredients), do: Enum.map(ingredients, &ingredient_data/1)
  defp ingredients_data(_), do: []

  defp ingredient_data(%RecipeIngredient{} = ingredient) do
    %{
      food_id: ingredient.food_id,
      food: food_data(ingredient.food),
      unit: ingredient.unit,
      amount: ingredient.amount,
      weight_g: ingredient.weight_g,
      position: ingredient.position
    }
  end

  defp food_data(%Food{} = food), do: FoodPayload.data(food)
  defp food_data(_), do: nil
end
