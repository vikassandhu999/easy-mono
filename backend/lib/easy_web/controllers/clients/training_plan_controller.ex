defmodule EasyWeb.Clients.TrainingPlanController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.TrainingPlans, as: Plans
  alias Easy.Training.TrainingPlan
  alias OpenApiSpex.{Operation, Schema}

  alias EasyWeb.OpenApi.Schemas.{
    ClientTrainingPlanListResponse,
    ClientTrainingPlanResponse,
    ErrorResponse
  }

  tags ["client training plans"]

  operation :today,
    summary: "Get today's training plan day",
    description: "Returns the active training plan and today's scheduled workout for the authenticated client.",
    operation_id: "getClientTrainingPlanToday",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:date, :query, :string, "Date (YYYY-MM-DD), defaults to today", required: false)
    ],
    responses: [
      ok: {"Today's training plan day", "application/json", ClientTrainingPlanResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"No active plan for today", "application/json", ErrorResponse}
    ]

  operation :index,
    summary: "List client training plans",
    description: "Lists training plans assigned to the authenticated client in the current business.",
    operation_id: "listClientTrainingPlans",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:offset, :query, :integer, "Number of training plans to skip", required: false),
      Operation.parameter(:limit, :query, :integer, "Maximum training plans to return", required: false),
      Operation.parameter(
        :status,
        :query,
        %Schema{type: :string, enum: ["active", "archived"]},
        "Only training plans with this status",
        required: false
      )
    ],
    responses: [
      ok: {"Training plans", "application/json", ClientTrainingPlanListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Client not found", "application/json", ErrorResponse}
    ]

  operation :show,
    summary: "Get client training plan",
    description: "Loads one training plan assigned to the authenticated client with workouts, workout elements, and plan items.",
    operation_id: "getClientTrainingPlan",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Training plan id")
    ],
    responses: [
      ok: {"Training plan", "application/json", ClientTrainingPlanResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  @spec today(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def today(conn, params) do
    date = Easy.Utils.safe_date(params["date"]) || Date.utc_today()

    with {:ok, result} <- Plans.get_my_active_plan_day(conn.assigns.ctx, date) do
      render(conn, :today, result)
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 50)
    status = parse_enum(params, "status", TrainingPlan.statuses())

    with {:ok, %{plans: plans, count: count}} <-
           Plans.list_my_plans(conn.assigns.ctx, status, offset, limit) do
      render(conn, :index, plans: plans, count: count)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    with {:ok, plan} <- Plans.get_my_plan_full(conn.assigns.ctx, id) do
      render(conn, :show, plan: plan)
    end
  end
end
