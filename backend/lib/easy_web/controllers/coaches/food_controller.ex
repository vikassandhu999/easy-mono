defmodule EasyWeb.Coaches.FoodController do
  use EasyWeb, :typed_controller
  alias Easy.Nutrition
  alias EasyWeb.Types.Nutrition.{Food, FoodIndex, Nutrient}
  typed(:index, query: Food.list_query(), ok: {200, FoodIndex.t()})
  typed(:show, ok: {200, data(Food.t())})
  typed(:create, body: Food.create(), ok: {201, data(Food.t())})
  typed(:update, body: Food.update(), ok: {200, data(Food.t())})
  typed(:nutrients, ok: {200, Nutrient.index()})
  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    q = conn.query_params

    with {:ok, page} <-
           Nutrition.list_foods(conn.assigns.ctx,
             search: q["search"],
             kind: q["kind"],
             cursor: q["cursor"],
             limit: q["limit"]
           ),
         do: ok(conn, page)
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    with {:ok, food} <- Nutrition.get_food(conn.assigns.ctx, conn.path_params["id"]), do: ok(conn, %{data: food})
  end

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    with {:ok, food} <- Nutrition.create_food(conn.assigns.ctx, conn.body_params), do: ok(conn, %{data: food})
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    with {:ok, food} <- Nutrition.update_food(conn.assigns.ctx, conn.path_params["id"], conn.body_params),
         do: ok(conn, %{data: food})
  end

  @spec nutrients(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def nutrients(conn, _params) do
    ok(conn, %{data: Nutrition.list_nutrients()})
  end
end
