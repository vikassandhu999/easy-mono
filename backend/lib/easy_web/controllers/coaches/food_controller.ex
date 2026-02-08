defmodule EasyWeb.Coaches.FoodController do
  use EasyWeb, :controller

  alias Easy.Nutrition.Food
  alias Easy.Orgs.Coaches
  alias EasyWeb.FallbackController

  def create(conn, params) do
    claims = conn.assigns.claims

    with {:ok, coach} <- Coaches.get_by_user_id(claims.user_id, claims.business_id),
         {:ok, food} <- Food.create(claims.business_id, coach.id, params) do
      conn
      |> put_status(:created)
      |> render(:show, food: food)
    end
  end

  def show(conn, %{"id" => food_id}) do
    claims = conn.assigns.claims

    case Food.get(food_id, claims.business_id) do
      %Food{} = food ->
        conn
        |> put_status(:ok)
        |> render(:show, food: food)

      nil ->
        FallbackController.not_found_response(conn, "Food not found.")
    end
  end

  def update(conn, %{"id" => food_id}) do
    claims = conn.assigns.claims

    case Food.get(food_id, claims.business_id) do
      %Food{} = food ->
        with {:ok, updated_food} <- Food.update(food, conn.body_params) do
          conn
          |> put_status(:ok)
          |> render(:show, food: updated_food)
        end

      nil ->
        FallbackController.not_found_response(conn, "Food not found.")
    end
  end

  def delete(conn, %{"id" => food_id}) do
    claims = conn.assigns.claims

    with food when not is_nil(food) <- Food.get(food_id, claims.business_id),
         {:ok, _deleted} <- Food.delete(food) do
      send_resp(conn, :no_content, "")
    else
      nil -> FallbackController.not_found_response(conn, "Food not found.")
      error -> error
    end
  end

  def index(conn, params) do
    claims = conn.assigns.claims

    search_opts = %{
      search: Map.get(params, "search", ""),
      offset: String.to_integer(Map.get(params, "offset", "0")),
      limit: String.to_integer(Map.get(params, "limit", "10"))
    }

    {:ok, count, foods} = Food.list(claims.business_id, search_opts)

    conn
    |> put_status(:ok)
    |> render(:index, count: count, foods: foods)
  end
end
