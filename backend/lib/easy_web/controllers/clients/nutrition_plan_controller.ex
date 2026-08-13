defmodule EasyWeb.Clients.NutritionPlanController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Nutrition.Plan
  alias Easy.NutritionPlans, as: Plans
  alias OpenApiSpex.{Operation, Schema}

  alias EasyWeb.OpenApi.Schemas.{
    ErrorResponse,
    NutritionPlanListResponse,
    NutritionPlanResponse
  }

  tags ["client nutrition plans"]

  operation :index,
    summary: "List client nutrition plans",
    description: "Lists nutrition plans assigned to the authenticated client.",
    operation_id: "listClientNutritionPlans",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:offset, :query, :integer, "Number of nutrition plans to skip", required: false),
      Operation.parameter(:limit, :query, :integer, "Page size (default 20, max 20)", required: false),
      Operation.parameter(
        :status,
        :query,
        %Schema{type: :string, enum: ["active", "archived"]},
        "Only nutrition plans with this status",
        required: false
      )
    ],
    responses: [
      ok: {"Nutrition plans", "application/json", NutritionPlanListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Client not found", "application/json", ErrorResponse}
    ]

  operation :show,
    summary: "Get client nutrition plan",
    description: "Loads one nutrition plan assigned to the authenticated client.",
    operation_id: "getClientNutritionPlan",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Nutrition plan id")],
    responses: [
      ok: {"Nutrition plan", "application/json", NutritionPlanResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    offset = parse_integer(params, "offset", 0)
    lim = parse_integer(params, "limit", 20)
    status = parse_enum(params, "status", Plan.statuses())

    with {:ok, %{plans: plans, count: count}} <-
           Plans.list_client_plans(conn.assigns.ctx, status: status, offset: offset, limit: lim) do
      render(conn, :index, plans: plans, count: count)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    with {:ok, plan} <- Plans.get_client_plan_full(conn.assigns.ctx, id) do
      render(conn, :show, plan: plan)
    end
  end
end
