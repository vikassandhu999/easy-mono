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

  tags ["coach workout elements"]

  operation :create,
    summary: "Create workout element",
    description: "Creates a workout element with planned sets.",
    operation_id: "createWorkoutElement",
    security: [%{"bearerAuth" => []}],
    request_body: {"Workout element request", "application/json", TrainingWorkoutExerciseRequest, required: true},
    responses: [
      created: {"Workout element created", "application/json", TrainingWorkoutExerciseResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :show,
    summary: "Get workout element",
    description: "Loads one workout element with exercise and planned sets.",
    operation_id: "getWorkoutElement",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Workout element id")
    ],
    responses: [
      ok: {"Workout element", "application/json", TrainingWorkoutExerciseResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
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
  def create(conn, %{"workout_id" => workout_id} = params) do
    with {:ok, element} <- Workouts.create_workout_element(conn.assigns.ctx, workout_id, params) do
      conn
      |> put_status(:created)
      |> render(:show, element: element)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    with {:ok, element} <- Workouts.get_workout_element_with_exercise(conn.assigns.ctx, id) do
      render(conn, :show, element: element)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => id}) do
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
