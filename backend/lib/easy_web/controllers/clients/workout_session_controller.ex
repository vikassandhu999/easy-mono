defmodule EasyWeb.Clients.WorkoutSessionController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Sessions
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    ErrorResponse,
    TrainingSessionUpdateRequest,
    TrainingSessionListResponse,
    TrainingSessionRequest,
    TrainingSessionResponse
  }

  plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:create, :update]

  tags ["client training sessions"]

  operation :index,
    summary: "List client training sessions",
    operation_id: "listClientTrainingSessions",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:from, :query, :string, "Start date (YYYY-MM-DD)", required: false),
      Operation.parameter(:to, :query, :string, "End date (YYYY-MM-DD)", required: false)
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
    from = Easy.Utils.safe_date(params["from"])
    to = Easy.Utils.safe_date(params["to"])

    with {:ok, sessions} <- Sessions.list_my_sessions(conn.assigns.ctx, from, to) do
      render(conn, :index, sessions: sessions, count: length(sessions))
    end
  end

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    with {:ok, session} <- Sessions.create_my_session(conn.assigns.ctx, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:show, session: session)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    with {:ok, session} <- Sessions.get_my_session_with_sets(conn.assigns.ctx, id) do
      render(conn, :show, session: session)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, updated} <- Sessions.update_my_session(conn.assigns.ctx, id, conn.body_params) do
      render(conn, :show, session: updated)
    end
  end
end
