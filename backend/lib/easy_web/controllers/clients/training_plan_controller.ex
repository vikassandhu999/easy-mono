defmodule EasyWeb.Clients.TrainingPlanController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Training.Programming

  alias EasyWeb.OpenApi.Schemas.{
    ClientTrainingPlanListResponse,
    ClientTrainingPlanResponse,
    ClientTrainingCoverageResponse,
    ErrorResponse
  }

  alias OpenApiSpex.{Operation, Schema}

  plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:coverage]

  tags ["client training plans"]

  operation :coverage,
    summary: "Resolve client training Coverage",
    description:
      "Returns the authenticated client's unarchived Client Plan supplying Coverage on a UTC date and the scheduled workout guidance. Data is null when no plan supplies Coverage.",
    operation_id: "resolveClientTrainingCoverage",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(
        :date,
        :query,
        %Schema{type: :string, format: :date},
        "UTC date, defaults to today",
        required: false
      )
    ],
    responses: [
      ok: {"Resolved training Coverage", "application/json", ClientTrainingCoverageResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      unprocessable_entity: {"Invalid UTC date", "application/json", ErrorResponse}
    ]

  operation :index,
    summary: "List client training plans",
    description: "Lists the authenticated client's incomplete, upcoming, current, and ended unarchived Client Plans.",
    operation_id: "listClientTrainingPlans",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:offset, :query, :integer, "Number of training plans to skip", required: false),
      Operation.parameter(:limit, :query, :integer, "Page size (default 20, max 100)", required: false)
    ],
    responses: [
      ok: {"Training plans", "application/json", ClientTrainingPlanListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Client not found", "application/json", ErrorResponse}
    ]

  operation :show,
    summary: "Get client training plan",
    description: "Loads one training plan assigned to the authenticated client with workouts, workout elements, and the weekday schedule.",
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

  @spec coverage(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def coverage(conn, params) do
    date = params["date"] || Date.utc_today()

    with {:ok, result} <- Programming.resolve_client_coverage(conn.assigns.ctx, date) do
      render(conn, :coverage, coverage: result)
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 20)

    with {:ok, %{plans: plans, count: count}} <-
           Programming.list_client_plans(conn.assigns.ctx, offset: offset, limit: limit) do
      render(conn, :index, plans: plans, count: count)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, plan} <- Programming.get_client_plan(conn.assigns.ctx, id) do
      render(conn, :show, plan: plan)
    end
  end
end
