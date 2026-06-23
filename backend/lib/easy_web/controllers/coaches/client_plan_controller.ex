defmodule EasyWeb.Coaches.ClientPlanController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Nutrition.Plan
  alias Easy.NutritionPlans, as: NutritionPlans
  alias Easy.TrainingPlans, as: TrainingPlans
  alias Easy.Training.TrainingPlan
  alias OpenApiSpex.{Operation, Schema}

  alias EasyWeb.Coaches.{NutritionPlanJSON, TrainingPlanJSON}

  alias EasyWeb.OpenApi.Schemas.{
    ClientTrainingPlanListResponse,
    ErrorResponse,
    NutritionPlanListResponse
  }

  tags ["coach client plans"]

  operation :training_plans,
    summary: "List client training plans",
    operation_id: "listCoachClientTrainingPlans",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:client_id, :path, :string, "Client id"),
      Operation.parameter(:offset, :query, :integer, "Number of plans to skip", required: false),
      Operation.parameter(:limit, :query, :integer, "Maximum plans to return", required: false),
      Operation.parameter(
        :status,
        :query,
        %Schema{type: :string, enum: ["active", "archived"]},
        "Only plans with this status",
        required: false
      )
    ],
    responses: [
      ok: {"Training plans", "application/json", ClientTrainingPlanListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :nutrition_plans,
    summary: "List client nutrition plans",
    operation_id: "listCoachClientNutritionPlans",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:client_id, :path, :string, "Client id"),
      Operation.parameter(:offset, :query, :integer, "Number of plans to skip", required: false),
      Operation.parameter(:limit, :query, :integer, "Maximum plans to return", required: false),
      Operation.parameter(
        :status,
        :query,
        %Schema{type: :string, enum: ["active", "archived"]},
        "Only plans with this status",
        required: false
      )
    ],
    responses: [
      ok: {"Nutrition plans", "application/json", NutritionPlanListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  @spec training_plans(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def training_plans(conn, %{"client_id" => client_id} = params) do
    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 50)
    status = parse_enum(params, "status", TrainingPlan.statuses())

    with {:ok, %{plans: plans, count: count}} <-
           TrainingPlans.list_client_plans(
             conn.assigns.ctx,
             client_id,
             status,
             offset,
             limit
           ) do
      conn
      |> put_view(json: TrainingPlanJSON)
      |> render(:index, plans: plans, count: count)
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
      conn
      |> put_view(json: NutritionPlanJSON)
      |> render(:index, plans: plans, count: count)
    end
  end
end
