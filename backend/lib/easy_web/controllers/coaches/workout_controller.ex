defmodule EasyWeb.Coaches.WorkoutController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Workouts
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    ErrorResponse,
    TrainingWorkoutRequest,
    TrainingWorkoutResponse,
    TrainingWorkoutUpdateRequest
  }

  plug OpenApiSpex.Plug.CastAndValidate,
       [json_render_error_v2: true] when action in [:create, :update, :delete]

  tags ["coach workouts"]

  operation :create,
    summary: "Create workout",
    description: "Creates a workout in a training plan.",
    operation_id: "createWorkout",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:plan_id, :path, :string, "Training plan id")
    ],
    request_body: {"Workout create request", "application/json", TrainingWorkoutRequest, required: true},
    responses: [
      created: {"Workout created", "application/json", TrainingWorkoutResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Update workout",
    description: "Updates a workout.",
    operation_id: "updateWorkout",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Workout id")
    ],
    request_body: {"Workout update request", "application/json", TrainingWorkoutUpdateRequest, required: true},
    responses: [
      ok: {"Workout updated", "application/json", TrainingWorkoutResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :delete,
    summary: "Delete workout",
    description: "Deletes a workout.",
    operation_id: "deleteWorkout",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Workout id")
    ],
    responses: [
      no_content: "Workout deleted",
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    plan_id = conn.path_params["plan_id"]

    with {:ok, workout} <- Workouts.create_workout(conn.assigns.ctx, plan_id, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:show, workout: workout)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, updated} <- Workouts.update_workout(conn.assigns.ctx, id, conn.body_params) do
      render(conn, :show, workout: updated)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, _workout} <- Workouts.delete_workout(conn.assigns.ctx, id) do
      send_resp(conn, :no_content, "")
    end
  end
end
