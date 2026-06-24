defmodule EasyWeb.Coaches.ExerciseController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Exercises
  alias OpenApiSpex.{Operation, Schema}

  alias EasyWeb.OpenApi.Schemas.{
    ErrorResponse,
    TrainingExerciseCreateRequest,
    TrainingExerciseCopyRequest,
    TrainingExerciseListResponse,
    TrainingExerciseUpdateRequest,
    TrainingExerciseResponse
  }

  plug OpenApiSpex.Plug.CastAndValidate,
       [json_render_error_v2: true]
       when action in [:create, :update, :copy]

  tags ["coach exercises"]

  operation :index,
    summary: "List exercises",
    description:
      "Lists system and coach-library exercises for picker dialogs and exercise management screens. Frontend pattern - cache by query params and refresh after create, update, delete, or duplicate mutations.",
    operation_id: "listCoachExercises",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:offset, :query, :integer, "Number of exercises to skip", required: false),
      Operation.parameter(:limit, :query, :integer, "Maximum exercises to return", required: false),
      Operation.parameter(:search, :query, :string, "Case-insensitive exercise name search", required: false),
      Operation.parameter(
        :muscle_ids,
        :query,
        %Schema{type: :array, items: %Schema{type: :string, format: :uuid}},
        "Only exercises linked to any of these muscle ids",
        required: false
      ),
      Operation.parameter(
        :equipment_ids,
        :query,
        %Schema{type: :array, items: %Schema{type: :string, format: :uuid}},
        "Only exercises linked to any of these equipment ids",
        required: false
      )
    ],
    responses: [
      ok: {"Exercises", "application/json", TrainingExerciseListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse}
    ]

  operation :show,
    summary: "Get exercise",
    description:
      "Loads one system or coach-library exercise with muscles and equipment for detail pages and edit forms. Frontend pattern - cache by id and refetch after mutations.",
    operation_id: "getExercise",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Exercise id")
    ],
    responses: [
      ok: {"Exercise", "application/json", TrainingExerciseResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Update exercise",
    description:
      "Updates a coach-owned exercise for library management and edit screens. Frontend pattern - optimistically update the edited exercise, rollback on validation errors, and refetch dependent lists.",
    operation_id: "updateExercise",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Exercise id")
    ],
    request_body: {"Exercise update request", "application/json", TrainingExerciseUpdateRequest, required: true},
    responses: [
      ok: {"Exercise updated", "application/json", TrainingExerciseResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :delete,
    summary: "Delete exercise",
    description:
      "Deletes a coach-owned exercise from the coach library. Frontend pattern - confirm first, optimistically remove from lists, and restore if the server rejects the request.",
    operation_id: "deleteExercise",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Exercise id")
    ],
    responses: [
      no_content: "Exercise deleted",
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :create,
    summary: "Create exercise",
    description:
      "Creates an exercise in the coach library so the frontend can immediately offer it in workout builders and exercise pickers. Frontend pattern - optimistically insert into local lists, then reconcile with the 201 payload or rollback on validation failure.",
    operation_id: "createExercise",
    security: [%{"bearerAuth" => []}],
    request_body: {"Exercise create request", "application/json", TrainingExerciseCreateRequest, required: true},
    responses: [
      created: {"Exercise created", "application/json", TrainingExerciseResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :copy,
    summary: "Copy exercise",
    description:
      "Creates a named copy of a system or coach exercise in the coach library. Frontend pattern - ask the coach for the new exercise name before calling this endpoint, then append the returned copy to local exercise lists.",
    operation_id: "copyExercise",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Exercise id")
    ],
    request_body: {"Exercise copy request", "application/json", TrainingExerciseCopyRequest, required: true},
    responses: [
      created: {"Exercise copied", "application/json", TrainingExerciseResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _) do
    with {:ok, exercise} <- Exercises.create_exercise(conn.assigns.ctx, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:show, exercise: exercise)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    with {:ok, exercise} <- Exercises.get_exercise(conn.assigns.ctx, id) do
      render(conn, :show, exercise: exercise)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, updated} <- Exercises.update_exercise(conn.assigns.ctx, id, conn.body_params) do
      render(conn, :show, exercise: updated)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    with {:ok, _deleted} <- Exercises.delete_exercise(conn.assigns.ctx, id) do
      send_resp(conn, :no_content, "")
    end
  end

  @spec copy(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def copy(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, duplicated} <- Exercises.duplicate_exercise(conn.assigns.ctx, id, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:show, exercise: duplicated)
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    opts = [
      offset: parse_integer(params, "offset", 0),
      limit: parse_integer(params, "limit", 20),
      search: Map.get(params, "search", ""),
      muscle_ids: parse_list(params, "muscle_ids"),
      equipment_ids: parse_list(params, "equipment_ids")
    ]

    with {:ok, res} <- Exercises.list_exercises(conn.assigns.ctx, opts) do
      render(conn, :index, exercises: res.exercises, count: res.count)
    end
  end
end
