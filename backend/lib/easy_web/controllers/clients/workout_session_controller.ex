defmodule EasyWeb.Clients.WorkoutSessionController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Sessions
  alias Easy.Training.Execution

  alias EasyWeb.OpenApi.Schemas.{
    ActiveTrainingSessionResponse,
    ErrorResponse,
    TrainingSessionListResponse,
    TrainingSessionRequest,
    TrainingSessionResponse,
    TrainingSessionUpdateRequest
  }

  alias OpenApiSpex.Operation

  plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:create, :update]

  tags ["client training sessions"]

  operation :index,
    summary: "List client training sessions",
    operation_id: "listClientTrainingSessions",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:from, :query, :string, "Start date (YYYY-MM-DD)", required: false),
      Operation.parameter(:to, :query, :string, "End date (YYYY-MM-DD)", required: false),
      Operation.parameter(:offset, :query, :integer, "Number of training sessions to skip", required: false),
      Operation.parameter(:limit, :query, :integer, "Maximum training sessions to return (max 20)", required: false)
    ],
    responses: [
      ok: {"Training sessions", "application/json", TrainingSessionListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse}
    ]

  operation :create,
    summary: "Start a training session",
    operation_id: "createClientTrainingSession",
    security: [%{"bearerAuth" => []}],
    request_body: {"Training session request", "application/json", TrainingSessionRequest, required: true},
    responses: [
      created: {"Training session created", "application/json", TrainingSessionResponse},
      conflict: {"A training session is already active", "application/json", ErrorResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :show,
    summary: "Get a training session",
    operation_id: "getClientTrainingSession",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Training session id")],
    responses: [
      ok: {"Training session", "application/json", TrainingSessionResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :active,
    summary: "Get the active client Training Session",
    operation_id: "getClientActiveTrainingSession",
    security: [%{"bearerAuth" => []}],
    responses: [
      ok: {"Active Training Session", "application/json", ActiveTrainingSessionResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Update a training session (complete/discard/notes)",
    operation_id: "updateClientTrainingSession",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Training session id")],
    request_body: {"Training session update request", "application/json", TrainingSessionUpdateRequest, required: true},
    responses: [
      ok: {"Training session updated", "application/json", TrainingSessionResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    opts = [
      from: Easy.Utils.safe_date(params["from"]),
      to: Easy.Utils.safe_date(params["to"]),
      offset: parse_integer(params, "offset", 0),
      limit: parse_integer(params, "limit", 20)
    ]

    with {:ok, %{sessions: sessions, count: count}} <- Sessions.list_client_sessions(conn.assigns.ctx, opts) do
      render(conn, :index, sessions: sessions, count: count)
    end
  end

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    workout_id = conn.body_params[:training_workout_id]
    attrs = Map.delete(conn.body_params, :training_workout_id)

    with {:ok, session} <- Execution.start_client_session(conn.assigns.ctx, workout_id, attrs) do
      conn
      |> put_status(:created)
      |> render(:show, session: session)
    end
  end

  @spec active(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def active(conn, _params) do
    with {:ok, session} <- Execution.get_client_active_session(conn.assigns.ctx) do
      render(conn, :active, session: session)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, session} <- Sessions.get_client_session(conn.assigns.ctx, id) do
      render(conn, :show, session: session)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, updated} <- Sessions.update_client_session(conn.assigns.ctx, id, conn.body_params) do
      render(conn, :show, session: updated)
    end
  end
end
