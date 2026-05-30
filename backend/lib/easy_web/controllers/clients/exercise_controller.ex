defmodule EasyWeb.Clients.ExerciseController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Exercises
  alias OpenApiSpex.{Operation, Schema}
  alias EasyWeb.OpenApi.Schemas.{ErrorResponse, ExerciseListResponse, ExerciseResponse}

  tags ["client exercises"]

  operation :index,
    summary: "List client exercises",
    description:
      "Lists system and business exercises available to the authenticated client for exercise pickers and workout history screens. Frontend pattern - cache by query params and refresh when coach-library exercise data changes.",
    operation_id: "listClientExercises",
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
      )
    ],
    responses: [
      ok: {"Exercises", "application/json", ExerciseListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse}
    ]

  operation :show,
    summary: "Get client exercise",
    description:
      "Loads one exercise available to the authenticated client with muscles and equipment for detail views and active workout screens. Frontend pattern - cache by id and reuse across workout/session views.",
    operation_id: "getClientExercise",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Exercise id")
    ],
    responses: [
      ok: {"Exercise", "application/json", ExerciseResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 50)
    search = Map.get(params, "search", "")
    muscle_ids = parse_list(params, "muscle_ids")

    with {:ok, %{exercises: exercises, count: count}} <-
           Exercises.list_exercises(conn.assigns.ctx, search, muscle_ids, offset, limit) do
      render(conn, :index, exercises: exercises, count: count)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    with {:ok, exercise} <- Exercises.get_exercise(conn.assigns.ctx, id) do
      render(conn, :show, exercise: exercise)
    end
  end
end
