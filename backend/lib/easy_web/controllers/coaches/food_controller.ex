defmodule EasyWeb.Coaches.FoodController do
  use EasyWeb, :controller

  alias Easy.Nutrition.Food
  alias Easy.Orgs.Coaches
  alias Easy.Repo

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

    case Food |> Food.for_business_or_system(claims.business_id) |> Repo.get(food_id) do
      %Food{} = food ->
        conn
        |> put_status(:ok)
        |> render(:show, food: food)

      nil ->
        {:error, :not_found}
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
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
        {:error, :not_found}
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => food_id}) do
    claims = conn.assigns.claims

    with food when not is_nil(food) <-
           Food |> Food.for_business(claims.business_id) |> Repo.get(food_id),
         {:ok, _deleted} <- Food.delete(food) do
      send_resp(conn, :no_content, "")
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    claims = conn.assigns.claims

    search_term = params |> Map.get("search", "") |> String.trim()
    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 10)

    base = Food |> Food.for_business_or_system(claims.business_id) |> Food.search(search_term)

    count = Repo.aggregate(base, :count, :id)

    ordered = if search_term == "", do: Food.newest(base), else: base
    foods = ordered |> Easy.Utils.paginate(offset, limit) |> Repo.all()

    conn
    |> put_status(:ok)
    |> render(:index, count: count, foods: foods)
  end
end
