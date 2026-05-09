defmodule EasyWeb.Coaches.FoodController do
  use EasyWeb, :controller

  alias Easy.Nutrition.Food
  alias Easy.Nutrition.Reads
  alias Easy.Orgs.Coaches

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, params) do
    claims = conn.assigns.claims

    with {:ok, coach} <- Coaches.get_by_user_id(claims.user_id, claims.business_id),
         {:ok, food} <- Food.create(claims.business_id, coach.id, params) do
      conn
      |> put_status(:created)
      |> render(:show, food: food)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => food_id}) do
    claims = conn.assigns.claims

    with {:ok, food} <- Reads.fetch_visible_food(claims.business_id, food_id) do
      conn
      |> put_status(:ok)
      |> render(:show, food: food)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => food_id}) do
    claims = conn.assigns.claims

    with {:ok, food} <- Reads.fetch_business_food(claims.business_id, food_id),
         {:ok, updated_food} <- Food.update(food, conn.body_params) do
      conn
      |> put_status(:ok)
      |> render(:show, food: updated_food)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => food_id}) do
    claims = conn.assigns.claims

    with {:ok, food} <- Reads.fetch_business_food(claims.business_id, food_id),
         {:ok, _deleted} <- Food.delete(food) do
      send_resp(conn, :no_content, "")
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    claims = conn.assigns.claims

    search_term = Map.get(params, "search", "")
    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 10)

    with {:ok, %{count: count, foods: foods}} <-
           Reads.list_visible_foods(claims.business_id, search_term, offset, limit) do
      conn
      |> put_status(:ok)
      |> render(:index, count: count, foods: foods)
    end
  end
end
