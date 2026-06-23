defmodule EasyWeb.Coaches.WorkoutSessionController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Sessions
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    ErrorResponse,
    TrainingSessionListResponse,
    TrainingSessionResponse
  }

  tags ["coach training sessions"]

  operation :index,
    summary: "List client training sessions",
    operation_id: "listCoachClientTrainingSessions",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:client_id, :path, :string, "Client id"),
      Operation.parameter(:from, :query, :string, "Start date (YYYY-MM-DD)", required: false),
      Operation.parameter(:to, :query, :string, "End date (YYYY-MM-DD)", required: false)
    ],
    responses: [
      ok: {"Training sessions", "application/json", TrainingSessionListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse}
    ]

  operation :show,
    summary: "Get client training session",
    operation_id: "getCoachClientTrainingSession",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:client_id, :path, :string, "Client id"),
      Operation.parameter(:id, :path, :string, "Training session id")
    ],
    responses: [
      ok: {"Training session", "application/json", TrainingSessionResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    client_id = conn.path_params["client_id"]

    opts = [
      from: Easy.Utils.safe_date(params["from"]),
      to: Easy.Utils.safe_date(params["to"])
    ]

    with {:ok, sessions} <- Sessions.list_sessions_for_client(conn.assigns.ctx, client_id, opts) do
      render(conn, :index, sessions: sessions, count: length(sessions))
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    client_id = conn.path_params["client_id"]
    id = conn.path_params["id"]

    with {:ok, session} <- Sessions.get_session_for_client(conn.assigns.ctx, client_id, id) do
      render(conn, :show, session: session)
    end
  end
end
