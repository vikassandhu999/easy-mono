defmodule EasyWeb.Clients.FoodController do
  use EasyWeb, :typed_controller

  alias Easy.Nutrition.Library
  alias EasyWeb.Types.Nutrition.{Food, FoodIndex}

  typed(:index, query: Food.client_list_query(), ok: {200, FoodIndex.t()})
  typed(:show, ok: {200, data(Food.t())})

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    params = conn.query_params

    opts = [
      search: Map.get(params, "search", ""),
      offset: Map.get(params, "offset", 0),
      limit: Map.get(params, "limit", 20)
    ]

    if Map.has_key?(params, "cursor") do
      with {:ok, page} <- Library.list_food_page(conn.assigns.ctx, Keyword.put(opts, :cursor, params["cursor"])) do
        ok(conn, page)
      end
    else
      with {:ok, %{foods: foods, count: count}} <- Library.list_foods(conn.assigns.ctx, opts) do
        ok(conn, %{data: foods, count: count, next_cursor: nil})
      end
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    with {:ok, food} <- Library.get_food(conn.assigns.ctx, id) do
      ok(conn, %{data: food})
    end
  end
end
