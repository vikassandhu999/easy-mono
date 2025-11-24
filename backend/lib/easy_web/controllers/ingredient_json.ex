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
      calories_per_100g: ingredient.calories_per_100g,
      protein_per_100g: ingredient.protein_per_100g,
      carbohydrates_per_100g: ingredient.carbohydrates_per_100g,
      fats_per_100g: ingredient.fats_per_100g,
      fiber_per_100g: ingredient.fiber_per_100g,
      meta_info: ingredient.meta_info,
      serving_sizes: render_serving_sizes(ingredient.serving_sizes),
      business_id: ingredient.business_id,
      creator_id: ingredient.creator_id,
      inserted_at: ingredient.inserted_at,
      updated_at: ingredient.updated_at
    }
  end

  defp render_serving_sizes(serving_sizes) when is_list(serving_sizes) do
    Enum.map(serving_sizes, fn serving_size ->
      %{
        id: serving_size.id,
        name: serving_size.name,
        gram_weight: serving_size.gram_weight
      }
    end)
  end

  defp render_serving_sizes(_), do: []
end
