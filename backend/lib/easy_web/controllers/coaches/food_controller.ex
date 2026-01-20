defmodule EasyWeb.Coaches.FoodController do
  alias Easy.Orgs.Coaches
  use EasyWeb, :controller

  alias Easy.Nutrition.Foods
  alias Easy.Nutrition.Library.Food
  alias EasyWeb.FallbackController

  def create(conn, params) do
    claims = conn.assigns.claims

    with {:ok, coach} <- Coaches.get_by_user_id(claims.user_id, claims.business_id),
         {:ok, food} <- Foods.create(claims.business_id, coach.id, params) do
      conn
      |> put_status(:created)
      |> render(:show, food: food)
    end
  end

  def show(conn, %{"id" => food_id}) do
    claims = conn.assigns.claims

    case Foods.get_by_id(food_id, claims.business_id) do
      %Food{} = food ->
        conn
        |> put_status(:ok)
        |> render(:show, food: food)

      _ ->
        FallbackController.not_found_response(conn, "Food not found.")
    end
  end

  def update(conn, %{"id" => food_id}) do
    claims = conn.assigns.claims

    case Foods.get_by_id(food_id, claims.business_id) do
      %Food{} = food ->
        with {:ok, updated_food} <- Foods.update(food, conn.body_params) do
          conn
          |> put_status(:ok)
          |> render(:show, food: updated_food)
        end

      _ ->
        FallbackController.not_found_response(conn, "Food not found.")
    end
  end

  def index(conn, params) do
    claims = conn.assigns.claims

    search_opts = %{
      search: Map.get(params, "search", ""),
      offset: String.to_integer(Map.get(params, "offset", "0")),
      limit: String.to_integer(Map.get(params, "limit", "10"))
    }

    with {:ok, count, foods} <- Foods.list_for_business(claims, search_opts) do
      conn
      |> put_status(:ok)
      |> render(:index, count: count, foods: foods)
    end
  end
end
