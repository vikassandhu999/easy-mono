defmodule EasyWeb.Coaches.TrainingPlanItemController do
  use EasyWeb, :controller

  alias Easy.Orgs.Coaches
  alias Easy.Repo
  alias Easy.Training.{PlanItem, TrainingPlan, Workout}

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, %{"plan_id" => plan_id} = params) do
    claims = conn.assigns.claims
    workout_id = Map.get(params, "workout_id")

    with {:ok, coach} <- Coaches.get_by_user_id(claims.user_id, claims.business_id),
         plan when not is_nil(plan) <-
           TrainingPlan |> TrainingPlan.for_business(claims.business_id) |> Repo.get(plan_id),
         :ok <- check_workout_in_plan(plan.id, claims.business_id, workout_id),
         {:ok, plan_item} <- PlanItem.create(plan.id, claims.business_id, coach.id, params) do
      conn
      |> put_status(:created)
      |> render(:show, plan_item: plan_item)
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  # nil workout_id is handled by PlanItem.insert_changeset's validate_required.
  # Non-nil must belong to the plan within the caller's business.
  defp check_workout_in_plan(_plan_id, _business_id, nil), do: :ok

  defp check_workout_in_plan(plan_id, business_id, workout_id) do
    if Workout.accessible_for_plan?(plan_id, business_id, workout_id),
      do: :ok,
      else: {:error, :not_found}
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => plan_item_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with plan_item when not is_nil(plan_item) <-
           PlanItem |> PlanItem.for_business(business_id) |> Repo.get(plan_item_id),
         {:ok, updated_plan_item} <- PlanItem.update(plan_item, conn.body_params) do
      render(conn, :show, plan_item: updated_plan_item)
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
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

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, %{"plan_id" => plan_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with plan when not is_nil(plan) <-
           TrainingPlan |> TrainingPlan.for_business(business_id) |> Repo.get(plan_id) do
      plan_items =
        PlanItem
        |> PlanItem.for_business(business_id)
        |> PlanItem.for_plan(plan.id)
        |> PlanItem.with_workout()
        |> Repo.all()

      conn
      |> put_status(:ok)
      |> render(:index, plan_items: plan_items)
    else
      nil -> {:error, :not_found}
    end
  end
end
