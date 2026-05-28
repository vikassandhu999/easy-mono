defmodule EasyWeb.Coaches.ClientPlanController do
  use EasyWeb, :controller

  alias Easy.Nutrition.Plan
  alias Easy.NutritionPlans, as: NutritionPlans
  alias Easy.TrainingPlans, as: TrainingPlans
  alias Easy.Training.TrainingPlan

  @spec training_plans(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def training_plans(conn, %{"client_id" => client_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 50)
    status = parse_enum(params, "status", TrainingPlan.statuses())

    with {:ok, %{plans: plans, count: count}} <-
           TrainingPlans.list_client_plans_for_client(
             business_id,
             client_id,
             status,
             offset,
             limit
           ) do
      render(conn, :training_plans, plans: plans, count: count)
    end
  end

  @spec nutrition_plans(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def nutrition_plans(conn, %{"client_id" => client_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 10)
    status = parse_enum(params, "status", Plan.statuses())

    with {:ok, %{plans: plans, count: count}} <-
           NutritionPlans.list_client_plans_full_for_client(
             business_id,
             client_id,
             status,
             offset,
             limit
           ) do
      render(conn, :nutrition_plans, plans: plans, count: count)
    end
  end
end
