defmodule EasyWeb.Clients.RecipeController do
  use EasyWeb, :typed_controller

  alias Easy.Nutrition.Library
  alias EasyWeb.Types.Nutrition.{Recipe, RecipeIndex}

  typed(:index, query: Recipe.list_query(), ok: {200, RecipeIndex.t()})
  typed(:show, ok: {200, data(Recipe.t())})

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    params = conn.query_params

    opts = [
      search: Map.get(params, "search", ""),
      offset: Map.get(params, "offset", 0),
      limit: Map.get(params, "limit", 20)
    ]

    if Map.has_key?(params, "cursor") do
      with {:ok, page} <- Library.list_recipe_page(conn.assigns.ctx, Keyword.put(opts, :cursor, params["cursor"])) do
        ok(conn, page)
      end
    else
      with {:ok, %{recipes: recipes, count: count}} <- Library.list_recipes(conn.assigns.ctx, opts) do
        ok(conn, %{data: recipes, count: count, next_cursor: nil})
      end
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    with {:ok, recipe} <- Library.get_recipe(conn.assigns.ctx, id) do
      ok(conn, %{data: recipe})
    end
  end
end
