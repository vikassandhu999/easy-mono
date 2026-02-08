defmodule EasyWeb.Coaches.PlanItemController do
  use EasyWeb, :controller

  alias Easy.Nutrition.Meal
  alias Easy.Nutrition.Plan
  alias Easy.Nutrition.PlanItem
  alias Easy.Orgs.Coaches
  alias Easy.Repo

  def create(conn, %{"plan_id" => plan_id} = params) do
    claims = conn.assigns.claims
    meal_id = Map.get(params, "meal_id")

    with {:ok, coach} <- Coaches.get_by_user_id(claims.user_id, claims.business_id),
         plan when not is_nil(plan) <-
           Plan |> Plan.for_business(claims.business_id) |> Repo.get(plan_id),
         :ok <- ensure_meal_for_plan(plan.id, claims.business_id, meal_id),
         {:ok, plan_item} <- PlanItem.create(plan.id, claims.business_id, coach.id, params) do
      conn
      |> put_status(:created)
      |> render(:show, plan_item: plan_item)
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  def update(conn, %{"id" => plan_item_id}) do
    %{business_id: business_id} = conn.assigns.claims
    meal_id = Map.get(conn.body_params, "meal_id")

    with plan_item when not is_nil(plan_item) <-
           PlanItem |> PlanItem.for_business(business_id) |> Repo.get(plan_item_id),
         :ok <- ensure_meal_for_plan(plan_item.plan_id, business_id, meal_id),
         {:ok, updated_plan_item} <- PlanItem.update(plan_item, conn.body_params) do
      render(conn, :show, plan_item: updated_plan_item)
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  def delete(conn, %{"id" => plan_item_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with plan_item when not is_nil(plan_item) <-
           PlanItem |> PlanItem.for_business(business_id) |> Repo.get(plan_item_id),
         {:ok, _deleted} <- PlanItem.delete(plan_item) do
      send_resp(conn, :no_content, "")
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  def index(conn, %{"plan_id" => plan_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with plan when not is_nil(plan) <- Plan |> Plan.for_business(business_id) |> Repo.get(plan_id) do
      plan_items =
        PlanItem
        |> PlanItem.for_plan(plan.id)
        |> PlanItem.with_meal()
        |> Repo.all()

      conn
      |> put_status(:ok)
      |> render(:index, plan_items: plan_items)
    else
      nil -> {:error, :not_found}
    end
  end

  defp ensure_meal_for_plan(_plan_id, _business_id, nil), do: :ok

  defp ensure_meal_for_plan(plan_id, business_id, meal_id) do
    case Meal
         |> Meal.for_plan(plan_id)
         |> Meal.for_business(business_id)
         |> Repo.get(meal_id) do
      nil -> {:error, :not_found}
      _meal -> :ok
    end
  end
end
