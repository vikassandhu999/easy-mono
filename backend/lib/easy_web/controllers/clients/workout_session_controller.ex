defmodule EasyWeb.Clients.WorkoutSessionController do
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

  tags ["client workout sessions"]

  operation :active,
    summary: "Get active workout session",
    operation_id: "getActiveTrainingSession",
    security: [%{"bearerAuth" => []}],
    responses: [
      ok: {"Workout session", "application/json", TrainingSessionResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :index,
    summary: "List client workout sessions",
    operation_id: "listClientTrainingSessions",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:offset, :query, :integer, "Number of sessions to skip", required: false),
      Operation.parameter(:limit, :query, :integer, "Maximum sessions to return", required: false),
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
    summary: "Create client workout session",
    operation_id: "createClientTrainingSession",
    security: [%{"bearerAuth" => []}],
    request_body: {"Workout session request", "application/json", TrainingSessionRequest, required: true},
    responses: [
      created: {"Workout session created", "application/json", TrainingSessionResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :show,
    summary: "Get client workout session",
    operation_id: "getClientTrainingSession",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Workout session id")],
    responses: [
      ok: {"Workout session", "application/json", TrainingSessionResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Update client workout session",
    operation_id: "updateClientTrainingSession",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Workout session id")],
    request_body: {"Workout session update request", "application/json", TrainingSessionUpdateRequest, required: true},
    responses: [
      ok: {"Workout session updated", "application/json", TrainingSessionResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :complete,
    summary: "Complete client workout session",
    operation_id: "completeClientTrainingSession",
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
    summary: "Discard client workout session",
    operation_id: "discardClientTrainingSession",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Workout session id")],
    responses: [
      ok: {"Workout session discarded", "application/json", TrainingSessionResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, params) do
    with {:ok, session} <- Sessions.create_my_session(conn.assigns.ctx, params) do
      conn
      |> put_status(:created)
      |> render(:show, session: session)
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 50)
    state = parse_enum(params, "state", TrainingSession.states())

    with {:ok, %{sessions: sessions, count: count}} <-
           Sessions.list_my_sessions_paginated(conn.assigns.ctx, state, offset, limit) do
      render(conn, :index, sessions: sessions, count: count)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    with {:ok, session} <- Sessions.get_my_session_with_sets(conn.assigns.ctx, id) do
      render(conn, :show, session: session)
    end
  end

  @spec active(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def active(conn, _params) do
    with {:ok, session} <- Sessions.get_my_active_session(conn.assigns.ctx) do
      render(conn, :show, session: session)
    end
  end

  @spec complete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def complete(conn, %{"id" => id}) do
    attrs = Map.merge(conn.body_params, %{"state" => "completed"})

    with {:ok, completed} <- Sessions.update_my_session(conn.assigns.ctx, id, attrs) do
      render(conn, :show, session: completed)
    end
  end

  @spec discard(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def discard(conn, %{"id" => id}) do
    with {:ok, discarded} <-
           Sessions.update_my_session(conn.assigns.ctx, id, %{"state" => "discarded"}) do
      render(conn, :show, session: discarded)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => id}) do
    # Drop state so PATCH cannot change session state; use complete/discard actions for that
    attrs = Map.drop(conn.body_params, ["state", :state])

    with {:ok, updated} <- Sessions.update_my_session(conn.assigns.ctx, id, attrs) do
      render(conn, :show, session: updated)
    end
  end
end
