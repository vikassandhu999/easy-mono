defmodule EasyWeb.Clients.RecipeController do
  use EasyWeb, :controller

  alias Easy.Recipes

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    %{business_id: business_id} = conn.assigns.claims

    search = Map.get(params, "search", "")
    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 50)

    with {:ok, %{recipes: recipes, count: count}} <-
           Recipes.list_recipes(business_id, search, offset, limit) do
      render(conn, :index, recipes: recipes, count: count)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, recipe} <- Recipes.get_recipe(business_id, id) do
      render(conn, :show, recipe: recipe)
    end
  end
end
