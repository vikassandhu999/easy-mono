defmodule EasyWeb.Coaches.FoodController do
  use EasyWeb, :controller

  alias Easy.Nutrition.Food
  alias Easy.Orgs.Coaches
  alias Easy.Repo
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

    case Food |> Food.for_business(claims.business_id) |> Repo.get(food_id) do
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

    case Food |> Food.for_business(claims.business_id) |> Repo.get(food_id) do
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

    with food when not is_nil(food) <-
           Food |> Food.for_business(claims.business_id) |> Repo.get(food_id),
         {:ok, _deleted} <- Food.delete(food) do
      send_resp(conn, :no_content, "")
    else
      nil -> FallbackController.not_found_response(conn, "Food not found.")
      error -> error
    end
  end

  def index(conn, params) do
    claims = conn.assigns.claims

    search_term = Map.get(params, "search", "")
    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 10)

    base = Food |> Food.for_business(claims.business_id) |> Food.search(search_term)

    count = Repo.aggregate(base, :count, :id)
    foods = base |> Food.newest() |> Easy.Utils.paginate(offset, limit) |> Repo.all()

    conn
    |> put_status(:ok)
    |> render(:index, count: count, foods: foods)
  end
end
