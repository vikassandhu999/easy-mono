defmodule EasyWeb.Coaches.TrainingPlanController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Training.Programming
  alias Easy.TrainingPlans, as: Plans

  alias EasyWeb.OpenApi.Schemas.{
    ErrorResponse,
    TrainingPlanAssignRequest,
    TrainingPlanCreateRequest,
    TrainingPlanListResponse,
    TrainingPlanRevisionRequest,
    TrainingPlanResponse,
    TrainingPlanStaleRevisionError,
    TrainingPlanUpdateRequest
  }

  alias OpenApiSpex.{Operation, Schema}

  plug OpenApiSpex.Plug.CastAndValidate,
       [json_render_error_v2: true]
       when action in [:create, :update, :delete, :archive, :restore, :assign, :duplicate]

  tags ["coach training plans"]

  operation :index,
    summary: "List Training Templates",
    description: "Lists reusable Training Templates from the authenticated business for Programming screens.",
    operation_id: "listTrainingPlans",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:offset, :query, :integer, "Number of training plans to skip", required: false),
      Operation.parameter(:limit, :query, :integer, "Page size (default 20, max 100)", required: false),
      Operation.parameter(:search, :query, :string, "Case-insensitive training plan name search", required: false),
      Operation.parameter(
        :archived,
        :query,
        %Schema{type: :boolean},
        "Filter by whether the Training Template is archived",
        required: false
      )
    ],
    responses: [
      ok: {"Training Templates", "application/json", TrainingPlanListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse}
    ]

  operation :create,
    summary: "Create a Training Template",
    description: "Creates a reusable Training Template in the authenticated business. The server sets business and creator ownership from trusted auth context.",
    operation_id: "createTrainingPlan",
    security: [%{"bearerAuth" => []}],
    request_body: {"Training Template create request", "application/json", TrainingPlanCreateRequest, required: true},
    responses: [
      created: {"Training Template created", "application/json", TrainingPlanResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :show,
    summary: "Get a Training Template or visible Client Plan",
    description: "Loads one Training Template or authorized Client Plan with its complete Prescription.",
    operation_id: "getTrainingPlan",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Training plan id")
    ],
    responses: [
      ok: {"Training Template or Client Plan", "application/json", TrainingPlanResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Update a Training Template or visible Client Plan",
    description: "Updates revisioned metadata and, for a Client Plan, its Coverage dates. Relationship ids and tenant ownership are never accepted.",
    operation_id: "updateTrainingPlan",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Training plan id")
    ],
    request_body: {"Training Template or Client Plan update request", "application/json", TrainingPlanUpdateRequest, required: true},
    responses: [
      ok: {"Training Template or Client Plan updated", "application/json", TrainingPlanResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      conflict: {"Stale revision", "application/json", TrainingPlanStaleRevisionError},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :delete,
    summary: "Delete a Training Template or visible Client Plan",
    description: "Deletes one revisioned Training Template or authorized Client Plan.",
    operation_id: "deleteTrainingPlan",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Training plan id"),
      Operation.parameter(
        :expected_revision,
        :query,
        %Schema{type: :integer, minimum: 1},
        "Revision observed by the deleting client",
        required: true
      )
    ],
    responses: [
      no_content: "Training Template or Client Plan deleted",
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      conflict: {"Stale revision", "application/json", TrainingPlanStaleRevisionError}
    ]

  operation :archive,
    summary: "Archive a Training Template or visible Client Plan",
    description: "Archives a revisioned Training Template or authorized Client Plan without deleting its history.",
    operation_id: "archiveTrainingPlan",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Training Template or Client Plan id")],
    request_body: {"Expected revision", "application/json", TrainingPlanRevisionRequest, required: true},
    responses: [
      ok: {"Training Template or Client Plan archived", "application/json", TrainingPlanResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      conflict: {"Stale revision", "application/json", TrainingPlanStaleRevisionError},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :restore,
    summary: "Restore a Training Template or visible Client Plan",
    description: "Restores a revisioned Training Template or authorized Client Plan.",
    operation_id: "restoreTrainingPlan",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Training Template or Client Plan id")],
    request_body: {"Expected revision", "application/json", TrainingPlanRevisionRequest, required: true},
    responses: [
      ok: {"Training Template or Client Plan restored", "application/json", TrainingPlanResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      conflict: {"Stale revision", "application/json", TrainingPlanStaleRevisionError},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
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
    description: "Copies a training plan template in the authenticated business, including workouts and their weekdays.",
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
  def create(conn, _params) do
    with {:ok, plan} <- Programming.create_template(conn.assigns.ctx, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:show, plan: plan)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, plan} <- Programming.get_plan(conn.assigns.ctx, id) do
      render(conn, :show, plan: plan)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    id = conn.path_params["id"]

    expected_revision = conn.body_params[:expected_revision]
    attrs = Map.delete(conn.body_params, :expected_revision)

    with {:ok, updated} <-
           Programming.update_plan(conn.assigns.ctx, id, expected_revision, attrs) do
      render(conn, :show, plan: updated)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, _params) do
    id = conn.path_params["id"]

    expected_revision = parse_integer(conn.query_params, "expected_revision", 0)

    with {:ok, _plan} <-
           Programming.delete_plan(conn.assigns.ctx, id, expected_revision) do
      send_resp(conn, :no_content, "")
    end
  end

  @spec archive(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def archive(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, plan} <-
           Programming.archive_plan(conn.assigns.ctx, id, conn.body_params[:expected_revision]) do
      render(conn, :show, plan: plan)
    end
  end

  @spec restore(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def restore(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, plan} <-
           Programming.restore_plan(conn.assigns.ctx, id, conn.body_params[:expected_revision]) do
      render(conn, :show, plan: plan)
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 20)
    search = Map.get(params, "search", "")
    archived = parse_optional_boolean(Map.get(params, "archived"))

    with {:ok, %{templates: plans, count: count}} <-
           Programming.list_templates(conn.assigns.ctx,
             search: search,
             archived: archived,
             offset: offset,
             limit: limit
           ) do
      render(conn, :index, plans: plans, count: count)
    end
  end

  defp parse_optional_boolean(true), do: true
  defp parse_optional_boolean("true"), do: true
  defp parse_optional_boolean(false), do: false
  defp parse_optional_boolean("false"), do: false
  defp parse_optional_boolean(_value), do: nil

  @spec duplicate(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def duplicate(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, duplicated} <- Plans.duplicate_plan(conn.assigns.ctx, id) do
      conn
      |> put_status(:created)
      |> render(:show, plan: duplicated)
    end
  end

  @spec assign(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def assign(conn, _params) do
    id = conn.path_params["id"]
    client_id = conn.body_params[:client_id]

    with {:ok, assigned} <-
           Plans.assign_plan_to_client(conn.assigns.ctx, client_id, id, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:show, plan: assigned)
    end
  end
end
