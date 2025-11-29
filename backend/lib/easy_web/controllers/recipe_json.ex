defmodule EasyWeb.RecipeJSON do
  alias Easy.Nutrition.Recipe
  alias Ecto.Association.NotLoaded

  def index(%{recipes: recipes, meta: meta}) do
    %{
      data: Enum.map(recipes, &render_recipe/1),
      meta: meta
    }
  end

  def show(%{recipe: recipe}) do
    %{data: render_recipe(recipe)}
  end

  def create(%{recipe: recipe}), do: show(%{recipe: recipe})
  def update(%{recipe: recipe}), do: show(%{recipe: recipe})
  def duplicate(%{recipe: recipe}), do: show(%{recipe: recipe})

  defp render_recipe(%Recipe{} = recipe) do
    %{
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      image_url: recipe.image_url,
      instructions: recipe.instructions,
      instructions_as_text: recipe.instructions_as_text,
      prep_time_minutes: recipe.prep_time_minutes,
      cook_time_minutes: recipe.cook_time_minutes,
      servings: recipe.servings,
      total_calories: recipe.total_calories,
      total_protein: recipe.total_protein,
      total_carbohydrates: recipe.total_carbohydrates,
      total_fats: recipe.total_fats,
      total_fiber: recipe.total_fiber,
      status: recipe.status,
      creator_id: recipe.creator_id,
      inserted_at: recipe.inserted_at,
      updated_at: recipe.updated_at
    }
    |> render_recipe_ingredients(recipe.recipe_ingredients)
  end

  defp render_recipe_ingredients(output, %NotLoaded{}), do: output
  defp render_recipe_ingredients(output, nil), do: output

  defp render_recipe_ingredients(output, ingredients) do
    output |> Map.put(:recipe_ingredients, Enum.map(ingredients, &render_recipe_ingredient/1))
  end

  defp render_recipe_ingredient(ingredient) do
    %{
      id: ingredient.id,
      order: ingredient.order,
      quantity: ingredient.quantity,
      quantity_as_text: ingredient.quantity_as_text,
      ingredient_id: ingredient.ingredient_id,
      unit_id: ingredient.unit_id,
      ingredient: render_nested_ingredient(ingredient.ingredient),
      unit: render_nested_unit(ingredient.unit)
    }
  end

  defp render_nested_ingredient(%NotLoaded{}), do: nil
  defp render_nested_ingredient(nil), do: nil

  defp render_nested_ingredient(ingredient) do
    %{
      id: ingredient.id,
      name: ingredient.name
    }
  end

  defp render_nested_unit(%NotLoaded{}), do: nil
  defp render_nested_unit(nil), do: nil

  defp render_nested_unit(unit) do
    %{
      id: unit.id,
      name: unit.name,
      abbreviation: unit.abbreviation
    }
  end
end
