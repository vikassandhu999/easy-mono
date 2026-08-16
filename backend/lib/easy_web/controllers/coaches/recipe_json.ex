defmodule EasyWeb.Coaches.RecipeJSON do
  alias Easy.Nutrition.Recipe
  alias EasyWeb.RecipePayload

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
    recipe
    |> RecipePayload.data()
    |> Map.put(:creator_id, recipe.creator_id)
  end
end
