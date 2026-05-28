defmodule EasyWeb.Coaches.FoodController do
  use EasyWeb, :controller

  alias Easy.Foods

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, params) do
    claims = conn.assigns.claims

    with {:ok, food} <-
           Foods.create_food_for_coach_user(claims.business_id, claims.user_id, params) do
      conn
      |> put_status(:created)
      |> render(:show, food: food)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => food_id}) do
    claims = conn.assigns.claims

    with {:ok, food} <- Foods.fetch_visible_food(claims.business_id, food_id) do
      conn
      |> put_status(:ok)
      |> render(:show, food: food)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => food_id}) do
    claims = conn.assigns.claims

    with {:ok, updated_food} <- Foods.update_food(claims.business_id, food_id, conn.body_params) do
      conn
      |> put_status(:ok)
      |> render(:show, food: updated_food)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => food_id}) do
    claims = conn.assigns.claims

    with {:ok, _deleted} <- Foods.delete_food(claims.business_id, food_id) do
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
           Foods.list_visible_foods(claims.business_id, search_term, offset, limit) do
      conn
      |> put_status(:ok)
      |> render(:index, count: count, foods: foods)
    end
  end
end
