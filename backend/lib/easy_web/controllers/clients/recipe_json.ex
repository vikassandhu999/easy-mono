defmodule EasyWeb.Clients.RecipeJSON do
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

  defp data(%Recipe{} = recipe), do: RecipePayload.data(recipe)
end
