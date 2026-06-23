defmodule EasyWeb.Coaches.WorkoutElementController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Workouts
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    ErrorResponse,
    TrainingWorkoutExerciseRequest,
    TrainingWorkoutExerciseResponse
  }

  plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:create, :update]

  tags ["coach workout elements"]

  operation :create,
    summary: "Create workout element",
    description: "Creates a workout element with planned sets.",
    operation_id: "createWorkoutElement",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:workout_id, :path, :string, "Workout id")
    ],
    request_body: {"Workout element request", "application/json", TrainingWorkoutExerciseRequest, required: true},
    responses: [
      created: {"Workout element created", "application/json", TrainingWorkoutExerciseResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Update workout element",
    description: "Updates a workout element and its planned sets.",
    operation_id: "updateWorkoutElement",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Workout element id")
    ],
    request_body: {"Workout element request", "application/json", TrainingWorkoutExerciseRequest, required: true},
    responses: [
      ok: {"Workout element updated", "application/json", TrainingWorkoutExerciseResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :delete,
    summary: "Delete workout element",
    description: "Deletes a workout element.",
    operation_id: "deleteWorkoutElement",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Workout element id")
    ],
    responses: [
      no_content: "Workout element deleted",
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    workout_id = conn.path_params["workout_id"]

    with {:ok, element} <- Workouts.create_workout_element(conn.assigns.ctx, workout_id, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:show, element: element)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, updated} <- Workouts.update_workout_element(conn.assigns.ctx, id, conn.body_params) do
      render(conn, :show, element: updated)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    with {:ok, _element} <- Workouts.delete_workout_element(conn.assigns.ctx, id) do
      send_resp(conn, :no_content, "")
    end
  end
end
