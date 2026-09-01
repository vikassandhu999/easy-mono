defmodule EasyWeb.Coaches.RecipeController do
  use EasyWeb, :typed_controller

  alias Easy.Nutrition.Library
  alias EasyWeb.Types.Nutrition.Recipe
  alias EasyWeb.Types.Revision

  typed(:create, body: Recipe.create(), ok: {201, data(Recipe.t())})
  typed(:show, ok: {200, data(Recipe.t())})
  typed(:update, body: Recipe.update(), ok: {200, data(Recipe.t())})
  typed(:delete, query: Revision.t(), ok: {204, nil})
  typed(:index, query: Recipe.list_query(), ok: {200, page(Recipe.t())})
  typed(:impact, ok: {200, Recipe.impact()})
  typed(:copy, ok: {201, data(Recipe.t())})

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    with {:ok, recipe} <- Library.create_recipe(conn.assigns.ctx, conn.body_params) do
      ok(conn, %{data: recipe})
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => recipe_id}) do
    with {:ok, recipe} <- Library.get_recipe(conn.assigns.ctx, recipe_id) do
      ok(conn, %{data: recipe})
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    recipe_id = conn.path_params["id"]
    {expected_revision, attrs} = Map.pop!(conn.body_params, :expected_revision)

    with {:ok, recipe} <- Library.update_recipe(conn.assigns.ctx, recipe_id, expected_revision, attrs) do
      ok(conn, %{data: recipe})
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, _params) do
    recipe_id = conn.path_params["id"]
    expected_revision = conn.query_params["expected_revision"]

    with {:ok, _recipe} <- Library.delete_recipe(conn.assigns.ctx, recipe_id, expected_revision) do
      ok(conn)
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    params = conn.query_params

    opts = [
      search: Map.get(params, "search", ""),
      offset: Map.get(params, "offset", 0),
      limit: Map.get(params, "limit", 20)
    ]

    with {:ok, %{count: count, recipes: recipes}} <- Library.list_recipes(conn.assigns.ctx, opts) do
      ok(conn, %{data: recipes, count: count})
    end
  end

  @spec impact(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def impact(conn, %{"id" => id}) do
    with {:ok, impact} <- Library.get_recipe_impact(conn.assigns.ctx, id) do
      ok(conn, %{data: impact})
    end
  end

  @spec copy(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def copy(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, recipe} <- Library.copy_recipe(conn.assigns.ctx, id) do
      ok(conn, %{data: recipe})
    end
  end
end
