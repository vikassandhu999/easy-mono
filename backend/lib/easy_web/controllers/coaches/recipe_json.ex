defmodule EasyWeb.Coaches.RecipeJSON do
  alias Easy.Nutrition.Library.Food
  alias Easy.Nutrition.Library.Recipe
  alias Easy.Nutrition.Library.RecipeIngredient

  def show(%{recipe: recipe}) do
    %{data: data(recipe)}
  end

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
      foods: foods_data(recipe.foods),
      creator_id: recipe.creator_id,
      inserted_at: recipe.inserted_at,
      updated_at: recipe.updated_at
    }
  end

  defp serving_sizes_data(serving_sizes) when is_list(serving_sizes) do
    for serving_size <- serving_sizes do
      %{
        unit: serving_size.unit,
        weight_g: serving_size.weight_g,
        amount: serving_size.amount
      }
    end
  end

  defp serving_sizes_data(_), do: []

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
      weight_g: recipe_ingredient.weight_g
    }
  end

  defp foods_data(foods) when is_list(foods) do
    for food <- foods do
      food_data(food)
    end
  end

  defp foods_data(_), do: []

  defp food_data(%Food{} = food) do
    %{
      id: food.id,
      name: food.name,
      macros: food.macros,
      source: food.source,
      category: food.category,
      tags: food.tags || [],
      notes: food.notes,
      image_url: food.image_url,
      serving_sizes: serving_sizes_data(food.serving_sizes),
      creator_id: food.creator_id,
      inserted_at: food.inserted_at,
      updated_at: food.updated_at
    }
  end

  defp food_data(_), do: nil
end
