defmodule EasyWeb.Clients.TrainingPlanController do
  use EasyWeb, :controller

  alias Easy.TrainingPlans, as: Plans
  alias Easy.Training.TrainingPlan

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 50)
    status = parse_enum(params, "status", TrainingPlan.statuses())

    with {:ok, %{plans: plans, count: count}} <-
           Plans.list_client_plans_for_user(business_id, user_id, status, offset, limit) do
      render(conn, :index, plans: plans, count: count)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, plan} <- Plans.get_client_plan_full_for_user(business_id, user_id, id) do
      render(conn, :show, plan: plan)
    end
  end
end
