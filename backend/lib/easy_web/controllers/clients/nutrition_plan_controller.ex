defmodule EasyWeb.Clients.NutritionPlanController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Nutrition.Plan
  alias Easy.NutritionPlans, as: Plans
  alias OpenApiSpex.{Operation, Schema}

  alias EasyWeb.OpenApi.Schemas.{
    ErrorResponse,
    NutritionMapResponse,
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
      Operation.parameter(:limit, :query, :integer, "Maximum nutrition plans to return", required: false),
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

  operation :today,
    summary: "Get today's nutrition plan",
    description: "Loads the active nutrition plan day for the authenticated client.",
    operation_id: "getTodayNutritionPlan",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:date, :query, :string, "Date to load, defaults to today", required: false)
    ],
    responses: [
      ok: {"Nutrition plan day", "application/json", NutritionMapResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Plan not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
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
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    offset = parse_integer(params, "offset", 0)
    lim = parse_integer(params, "limit", 50)
    status = parse_enum(params, "status", Plan.statuses())

    with {:ok, %{plans: plans, count: count}} <-
           Plans.list_client_plans_for_user(business_id, user_id, status, offset, lim) do
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

  @spec today(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def today(conn, params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    date = Easy.Utils.safe_date(params["date"]) || Date.utc_today()

    with {:ok, %{plan: plan, plan_items: plan_items, day: day}} <-
           Plans.get_active_plan_day_for_user(business_id, user_id, date) do
      render(conn, :today, plan: plan, plan_items: plan_items, date: date, day: day)
    end
  end
end
