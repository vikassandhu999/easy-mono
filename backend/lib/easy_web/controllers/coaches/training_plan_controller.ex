defmodule EasyWeb.Coaches.TrainingPlanController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.TrainingPlans, as: Plans
  alias Easy.Training.TrainingPlan
  alias OpenApiSpex.{Operation, Schema}

  alias EasyWeb.OpenApi.Schemas.{
    ErrorResponse,
    TrainingPlanAssignRequest,
    TrainingPlanCreateRequest,
    TrainingPlanListResponse,
    TrainingPlanResponse,
    TrainingPlanUpdateRequest
  }

  tags ["coach training plans"]

  operation :index,
    summary: "List training plan templates",
    description: "Lists coach training plan templates for planning screens. Only unassigned templates from the authenticated business are returned.",
    operation_id: "listTrainingPlans",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:offset, :query, :integer, "Number of training plans to skip", required: false),
      Operation.parameter(:limit, :query, :integer, "Maximum training plans to return", required: false),
      Operation.parameter(:search, :query, :string, "Case-insensitive training plan name search", required: false),
      Operation.parameter(
        :status,
        :query,
        %Schema{type: :string, enum: ["active", "archived"]},
        "Only training plans with this status",
        required: false
      )
    ],
    responses: [
      ok: {"Training plans", "application/json", TrainingPlanListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse}
    ]

  operation :create,
    summary: "Create training plan",
    description: "Creates a coach-owned training plan template in the authenticated business. The server sets business and author ownership from trusted auth context.",
    operation_id: "createTrainingPlan",
    security: [%{"bearerAuth" => []}],
    request_body: {"Training plan create request", "application/json", TrainingPlanCreateRequest, required: true},
    responses: [
      created: {"Training plan created", "application/json", TrainingPlanResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :show,
    summary: "Get training plan",
    description: "Loads one training plan from the authenticated business with workouts, workout elements, plan items, and assigned client summary.",
    operation_id: "getTrainingPlan",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Training plan id")
    ],
    responses: [
      ok: {"Training plan", "application/json", TrainingPlanResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Update training plan",
    description: "Updates coach-editable training plan metadata. Relationship ids and tenant ownership are not accepted from the request body.",
    operation_id: "updateTrainingPlan",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Training plan id")
    ],
    request_body: {"Training plan update request", "application/json", TrainingPlanUpdateRequest, required: true},
    responses: [
      ok: {"Training plan updated", "application/json", TrainingPlanResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :delete,
    summary: "Delete training plan",
    description: "Deletes one training plan from the authenticated business.",
    operation_id: "deleteTrainingPlan",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Training plan id")
    ],
    responses: [
      no_content: "Training plan deleted",
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :assign,
    summary: "Assign training plan",
    description: "Copies a template training plan to a client in the authenticated business and returns the assigned copy.",
    operation_id: "assignTrainingPlan",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Training plan id")
    ],
    request_body: {"Training plan assign request", "application/json", TrainingPlanAssignRequest, required: true},
    responses: [
      created: {"Training plan assigned", "application/json", TrainingPlanResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :duplicate,
    summary: "Duplicate training plan",
    description: "Copies a training plan template in the authenticated business, including workouts and scheduled plan items.",
    operation_id: "duplicateTrainingPlan",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Training plan id")
    ],
    responses: [
      created: {"Training plan duplicated", "application/json", TrainingPlanResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, params) do
    claims = conn.assigns.claims

    with {:ok, plan} <-
           Plans.create_training_plan_for_coach_user(claims.business_id, claims.user_id, params) do
      conn
      |> put_status(:created)
      |> render(:show, plan: plan)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, plan} <- Plans.get_plan_full(business_id, id) do
      render(conn, :show, plan: plan)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, updated} <- Plans.update_training_plan(business_id, id, conn.body_params) do
      render(conn, :show, plan: updated)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, _plan} <- Plans.delete_training_plan(business_id, id) do
      send_resp(conn, :no_content, "")
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    %{business_id: business_id} = conn.assigns.claims

    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 50)
    search = Map.get(params, "search", "")
    status = parse_enum(params, "status", TrainingPlan.statuses())

    with {:ok, %{plans: plans, count: count}} <-
           Plans.list_template_plans(business_id, search, status, offset, limit) do
      render(conn, :index, plans: plans, count: count)
    end
  end

  @spec duplicate(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def duplicate(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, duplicated} <- Plans.duplicate_training_plan(business_id, id) do
      conn
      |> put_status(:created)
      |> render(:show, plan: duplicated)
    end
  end

  @spec assign(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def assign(conn, %{"id" => id, "client_id" => client_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, assigned} <-
           Plans.assign_training_plan_to_client(
             business_id,
             id,
             client_id,
             params
           ) do
      conn
      |> put_status(:created)
      |> render(:show, plan: assigned)
    end
  end
end
