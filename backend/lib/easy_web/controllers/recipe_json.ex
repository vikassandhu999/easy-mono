defmodule EasyWeb.RecipeJSON do
  alias Easy.Nutrition.Recipe

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

  defp render_recipe(%Recipe{} = recipe) do
    %{
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      instructions: recipe.instructions,
      prep_time_minutes: recipe.prep_time_minutes,
      servings: recipe.servings,
      ingredients: recipe.ingredients || [],
      total_calories: recipe.total_calories,
      total_protein: recipe.total_protein,
      total_carbohydrates: recipe.total_carbohydrates,
      total_fats: recipe.total_fats,
      total_fiber: recipe.total_fiber,
      status: recipe.status,
      created_by_id: recipe.created_by_id,
      inserted_at: recipe.inserted_at,
      updated_at: recipe.updated_at
    }
  end
end
