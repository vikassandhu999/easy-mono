defmodule EasyWeb.Coaches.MealController do
  use EasyWeb, :controller

  alias Easy.Nutrition.Meal
  alias Easy.Nutrition.Plan
  alias Easy.Orgs.Coaches
  alias Easy.Repo

  def create(conn, %{"plan_id" => plan_id} = params) do
    claims = conn.assigns.claims

    with {:ok, coach} <- Coaches.get_by_user_id(claims.user_id, claims.business_id),
         plan when not is_nil(plan) <-
           Plan |> Plan.for_business(claims.business_id) |> Repo.get(plan_id),
         {:ok, meal} <- Meal.create(plan.id, claims.business_id, coach.id, params) do
      conn
      |> put_status(:created)
      |> render(:show, meal: meal)
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  def show(conn, %{"id" => meal_id}) do
    %{business_id: business_id} = conn.assigns.claims

    case Meal
         |> Meal.for_business(business_id)
         |> Meal.with_items()
         |> Repo.get(meal_id) do
      nil -> {:error, :not_found}
      meal -> render(conn, :show, meal: meal)
    end
  end

  def update(conn, %{"id" => meal_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with meal when not is_nil(meal) <- Meal |> Meal.for_business(business_id) |> Repo.get(meal_id),
         {:ok, updated_meal} <- Meal.update(meal, conn.body_params) do
      render(conn, :show, meal: updated_meal)
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  def delete(conn, %{"id" => meal_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with meal when not is_nil(meal) <- Meal |> Meal.for_business(business_id) |> Repo.get(meal_id),
         {:ok, _deleted} <- Meal.delete(meal) do
      send_resp(conn, :no_content, "")
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  def index(conn, %{"plan_id" => plan_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 50)

    with plan when not is_nil(plan) <- Plan |> Plan.for_business(business_id) |> Repo.get(plan_id) do
      base = Meal |> Meal.for_plan(plan.id)

      count = Repo.aggregate(base, :count, :id)

      meals =
        base
        |> Meal.ordered()
        |> Easy.Utils.paginate(offset, limit)
        |> Meal.with_items()
        |> Repo.all()

      conn
      |> put_status(:ok)
      |> render(:index, count: count, meals: meals)
    else
      nil -> {:error, :not_found}
    end
  end
end
