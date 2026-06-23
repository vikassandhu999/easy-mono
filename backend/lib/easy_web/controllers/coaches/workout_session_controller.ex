defmodule EasyWeb.Coaches.WorkoutSessionController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Sessions
  alias Easy.Training.TrainingSession
  alias OpenApiSpex.{Operation, Schema}

  alias EasyWeb.OpenApi.Schemas.{
    ErrorResponse,
    TrainingSessionUpdateRequest,
    TrainingSessionListResponse,
    TrainingSessionRequest,
    TrainingSessionResponse
  }

  tags ["coach workout sessions"]

  operation :index,
    summary: "List workout sessions",
    operation_id: "listTrainingSessions",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:offset, :query, :integer, "Number of sessions to skip", required: false),
      Operation.parameter(:limit, :query, :integer, "Maximum sessions to return", required: false),
      Operation.parameter(:client_id, :query, :string, "Client id", required: false),
      Operation.parameter(
        :state,
        :query,
        %Schema{type: :string, enum: ["active", "completed", "discarded"]},
        "Only sessions with this state",
        required: false
      )
    ],
    responses: [ok: {"Workout sessions", "application/json", TrainingSessionListResponse}, unauthorized: {"Unauthorized", "application/json", ErrorResponse}]

  operation :create,
    summary: "Create workout session",
    operation_id: "createTrainingSession",
    security: [%{"bearerAuth" => []}],
    request_body: {"Workout session request", "application/json", TrainingSessionRequest, required: true},
    responses: [
      created: {"Workout session created", "application/json", TrainingSessionResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :show,
    summary: "Get workout session",
    operation_id: "getTrainingSession",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Workout session id")],
    responses: [
      ok: {"Workout session", "application/json", TrainingSessionResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :complete,
    summary: "Complete workout session",
    operation_id: "completeTrainingSession",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Workout session id")],
    request_body: {"Workout session completion request", "application/json", TrainingSessionUpdateRequest, required: true},
    responses: [
      ok: {"Workout session completed", "application/json", TrainingSessionResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :discard,
    summary: "Discard workout session",
    operation_id: "discardTrainingSession",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Workout session id")],
    responses: [
      ok: {"Workout session discarded", "application/json", TrainingSessionResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :delete,
    summary: "Delete workout session",
    operation_id: "deleteTrainingSession",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Workout session id")],
    responses: [
      no_content: "Workout session deleted",
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, %{"client_id" => client_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, session} <- Sessions.create_workout_session(business_id, client_id, params) do
      conn
      |> put_status(:created)
      |> render(:show, session: session)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, session} <- Sessions.get_session_with_sets(business_id, id) do
      render(conn, :show, session: session)
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    %{business_id: business_id} = conn.assigns.claims

    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 50)
    client_id = Map.get(params, "client_id")
    state = parse_enum(params, "state", TrainingSession.states())

    with {:ok, %{sessions: sessions, count: count}} <-
           Sessions.list_sessions(business_id, client_id, state, offset, limit) do
      render(conn, :index, sessions: sessions, count: count)
    end
  end

  @spec complete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def complete(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, completed} <- Sessions.complete_workout_session(business_id, id, conn.body_params) do
      render(conn, :show, session: completed)
    end
  end

  @spec discard(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def discard(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, discarded} <- Sessions.discard_workout_session(business_id, id) do
      render(conn, :show, session: discarded)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, _session} <- Sessions.delete_workout_session(business_id, id) do
      send_resp(conn, :no_content, "")
    end
  end
end
