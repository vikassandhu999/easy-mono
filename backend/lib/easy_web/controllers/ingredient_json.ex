defmodule EasyWeb.IngredientJSON do
  alias Easy.Nutrition.Ingredient

  def index(%{ingredients: ingredients, meta: meta}) do
    %{
      data: Enum.map(ingredients, &render_ingredient/1),
      meta: meta
    }
  end

  def show(%{ingredient: ingredient}) do
    %{data: render_ingredient(ingredient)}
  end

  def create(assigns), do: show(assigns)
  def update(assigns), do: show(assigns)

  defp render_ingredient(%Ingredient{} = ingredient) do
    %{
      id: ingredient.id,
      name: ingredient.name,
      description: ingredient.description,
      image_url: ingredient.image_url,
      source: ingredient.source,
      calories: ingredient.calories,
      protein: ingredient.protein,
      carbohydrates: ingredient.carbohydrates,
      fats: ingredient.fats,
      fiber: ingredient.fiber,
      meta_info: ingredient.meta_info,
      business_id: ingredient.business_id,
      creator_id: ingredient.creator_id,
      inserted_at: ingredient.inserted_at,
      updated_at: ingredient.updated_at
    }
  end
end
