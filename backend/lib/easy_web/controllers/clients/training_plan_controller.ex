defmodule EasyWeb.Clients.TrainingPlanController do
  use EasyWeb, :controller

  alias Easy.Clients.Client
  alias Easy.Training.PlanReads
  alias Easy.Training.TrainingPlan

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id) do
      offset = parse_integer(params, "offset", 0)
      limit = parse_integer(params, "limit", 50)
      status = parse_enum(params, "status", TrainingPlan.statuses())

      with {:ok, %{plans: plans, count: count}} <-
             PlanReads.list_client_plans(business_id, client.id, status, offset, limit) do
        render(conn, :index, plans: plans, count: count)
      end
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id),
         {:ok, plan} <- PlanReads.fetch_client_plan_full(business_id, client.id, id) do
      render(conn, :show, plan: plan)
    end
  end
end
