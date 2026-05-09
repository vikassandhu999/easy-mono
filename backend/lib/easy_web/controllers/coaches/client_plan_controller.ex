defmodule EasyWeb.Coaches.ClientPlanController do
  use EasyWeb, :controller

  alias Easy.Clients.Client
  alias Easy.Nutrition
  alias Easy.Nutrition.Plan
  alias Easy.Training
  alias Easy.Training.TrainingPlan

  @spec training_plans(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def training_plans(conn, %{"client_id" => client_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    with true <- Client.accessible?(business_id, client_id) do
      offset = parse_integer(params, "offset", 0)
      limit = parse_integer(params, "limit", 50)
      status = parse_enum(params, "status", TrainingPlan.statuses())

      with {:ok, %{plans: plans, count: count}} <-
             Training.Reads.list_client_plans(business_id, client_id, status, offset, limit) do
        render(conn, :training_plans, plans: plans, count: count)
      end
    else
      false -> {:error, :not_found}
    end
  end

  @spec nutrition_plans(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def nutrition_plans(conn, %{"client_id" => client_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    with true <- Client.accessible?(business_id, client_id) do
      offset = parse_integer(params, "offset", 0)
      limit = parse_integer(params, "limit", 10)
      status = parse_enum(params, "status", Plan.statuses())

      with {:ok, %{plans: plans, count: count}} <-
             Nutrition.Reads.list_client_plans_full(business_id, client_id, status, offset, limit) do
        render(conn, :nutrition_plans, plans: plans, count: count)
      end
    else
      false -> {:error, :not_found}
    end
  end
end
