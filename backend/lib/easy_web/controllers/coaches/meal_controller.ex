defmodule EasyWeb.Coaches.MealController do
  use EasyWeb, :controller

  alias Easy.Nutrition.Meals

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, %{"plan_id" => plan_id} = params) do
    claims = conn.assigns.claims

    with {:ok, meal} <-
           Meals.create_meal_for_coach_user(claims.business_id, claims.user_id, plan_id, params) do
      conn
      |> put_status(:created)
      |> render(:show, meal: meal)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => meal_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, meal} <- Meals.fetch_meal_with_items(business_id, meal_id) do
      render(conn, :show, meal: meal)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => meal_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, updated_meal} <- Meals.update_meal(business_id, meal_id, conn.body_params) do
      render(conn, :show, meal: updated_meal)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => meal_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, _deleted} <- Meals.delete_meal(business_id, meal_id) do
      send_resp(conn, :no_content, "")
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, %{"plan_id" => plan_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 50)

    with {:ok, %{count: count, meals: meals}} <-
           Meals.list_meals(business_id, plan_id, offset, limit) do
      conn
      |> put_status(:ok)
      |> render(:index, count: count, meals: meals)
    end
  end
end
