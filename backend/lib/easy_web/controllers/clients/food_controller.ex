defmodule EasyWeb.Clients.FoodController do
  use EasyWeb, :controller

  alias Easy.Nutrition.Foods

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    %{business_id: business_id} = conn.assigns.claims

    search = Map.get(params, "search", "")
    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 50)

    with {:ok, %{foods: foods, count: count}} <-
           Foods.list_visible_foods(business_id, search, offset, limit) do
      render(conn, :index, foods: foods, count: count)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, food} <- Foods.fetch_visible_food(business_id, id) do
      render(conn, :show, food: food)
    end
  end
end
