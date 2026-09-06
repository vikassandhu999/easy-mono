defmodule EasyWeb.Coaches.FoodController do
  use EasyWeb, :typed_controller

  alias Easy.Nutrition.Library
  alias EasyWeb.Types.Nutrition.Food

  typed(:create, body: Food.create(), ok: {201, data(Food.t())})
  typed(:show, ok: {200, data(Food.t())})
  typed(:update, body: Food.update(), ok: {200, data(Food.t())})
  typed(:delete, ok: {204, nil})
  typed(:index, query: Food.list_query(), ok: {200, page(Food.t())})
  typed(:categories, ok: {200, Food.category_list()})
  typed(:impact, ok: {200, Food.impact()})
  typed(:copy, ok: {201, data(Food.t())})

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    with {:ok, food} <- Library.create_food(conn.assigns.ctx, conn.body_params) do
      ok(conn, %{data: food})
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => food_id}) do
    with {:ok, food} <- Library.get_food(conn.assigns.ctx, food_id) do
      ok(conn, %{data: food})
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    food_id = conn.path_params["id"]
    {expected_revision, attrs} = Map.pop!(conn.body_params, :expected_revision)

    with {:ok, food} <- Library.update_food(conn.assigns.ctx, food_id, expected_revision, attrs) do
      ok(conn, %{data: food})
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, _params) do
    food_id = conn.path_params["id"]

    with {:ok, _food} <- Library.delete_food(conn.assigns.ctx, food_id) do
      ok(conn)
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    params = conn.query_params

    opts = [
      search: Map.get(params, "search", ""),
      categories: Map.get(params, "categories", []),
      offset: Map.get(params, "offset", 0),
      limit: Map.get(params, "limit", 20)
    ]

    with {:ok, %{count: count, foods: foods}} <- Library.list_foods(conn.assigns.ctx, opts) do
      ok(conn, %{data: foods, count: count})
    end
  end

  @spec categories(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def categories(conn, _params) do
    with {:ok, categories} <- Library.list_food_categories(conn.assigns.ctx) do
      ok(conn, %{data: categories})
    end
  end

  @spec impact(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def impact(conn, %{"id" => id}) do
    with {:ok, impact} <- Library.get_food_impact(conn.assigns.ctx, id) do
      ok(conn, %{data: impact})
    end
  end

  @spec copy(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def copy(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, food} <- Library.copy_food(conn.assigns.ctx, id) do
      ok(conn, %{data: food})
    end
  end
end
