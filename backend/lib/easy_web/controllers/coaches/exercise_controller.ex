defmodule EasyWeb.Coaches.ExerciseController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Exercises
  alias EasyWeb.OpenApi.Schemas.{ErrorResponse, ExerciseCreateRequest, ExerciseResponse}

  plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:create]

  tags ["coach exercises"]

  operation :show, false
  operation :update, false
  operation :delete, false
  operation :duplicate, false
  operation :index, false

  operation :create,
    summary: "Create exercise",
    description:
      "Creates an exercise in the coach library so the frontend can immediately offer it in workout builders and exercise pickers. Frontend pattern - optimistically insert into local lists, then reconcile with the 201 payload or rollback on validation failure.",
    operation_id: "createExercise",
    security: [%{"bearerAuth" => []}],
    request_body: {"Exercise create request", "application/json", ExerciseCreateRequest, required: true},
    responses: [
      created: {"Exercise created", "application/json", ExerciseResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _) do
    ctx = conn.assigns.ctx

    with {:ok, exercise} <- Exercises.create_exercise(ctx, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:show, exercise: exercise)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, exercise} <- Exercises.get_exercise(business_id, id) do
      render(conn, :show, exercise: exercise)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, updated} <- Exercises.update_exercise(business_id, id, conn.body_params) do
      render(conn, :show, exercise: updated)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, _deleted} <- Exercises.delete_exercise(business_id, id) do
      send_resp(conn, :no_content, "")
    end
  end

  @spec duplicate(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def duplicate(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, duplicated} <- Exercises.duplicate_exercise(business_id, id) do
      conn
      |> put_status(:created)
      |> render(:show, exercise: duplicated)
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    %{business_id: business_id} = conn.assigns.claims

    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 50)
    search = Map.get(params, "search", "")
    muscle_ids = parse_list(params, "muscle_ids")

    with {:ok, %{exercises: exercises, count: count}} <-
           Exercises.list_exercises(business_id, search, muscle_ids, offset, limit) do
      render(conn, :index, exercises: exercises, count: count)
    end
  end
end
