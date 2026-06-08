defmodule EasyWeb.Coaches.WorkoutController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Workouts
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    ErrorResponse,
    WorkoutListResponse,
    WorkoutRequest,
    WorkoutResponse,
    WorkoutUpdateRequest
  }

  tags ["coach workouts"]

  operation :index,
    summary: "List workouts",
    description: "Lists workouts in a training plan.",
    operation_id: "listWorkouts",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:plan_id, :path, :string, "Training plan id"),
      Operation.parameter(:offset, :query, :integer, "Number of workouts to skip", required: false),
      Operation.parameter(:limit, :query, :integer, "Maximum workouts to return", required: false)
    ],
    responses: [
      ok: {"Workouts", "application/json", WorkoutListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :create,
    summary: "Create workout",
    description: "Creates a workout in a training plan.",
    operation_id: "createWorkout",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:plan_id, :path, :string, "Training plan id")
    ],
    request_body: {"Workout create request", "application/json", WorkoutRequest, required: true},
    responses: [
      created: {"Workout created", "application/json", WorkoutResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :show,
    summary: "Get workout",
    description: "Loads one workout with workout elements.",
    operation_id: "getWorkout",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Workout id")
    ],
    responses: [
      ok: {"Workout", "application/json", WorkoutResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Update workout",
    description: "Updates a workout.",
    operation_id: "updateWorkout",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Workout id")
    ],
    request_body: {"Workout update request", "application/json", WorkoutUpdateRequest, required: true},
    responses: [
      ok: {"Workout updated", "application/json", WorkoutResponse},
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

  operation :duplicate,
    summary: "Duplicate workout",
    description: "Copies a workout with its elements and planned sets.",
    operation_id: "duplicateWorkout",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Workout id")
    ],
    responses: [
      created: {"Workout duplicated", "application/json", WorkoutResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, %{"plan_id" => plan_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, workout} <- Workouts.create_workout(plan_id, business_id, params) do
      conn
      |> put_status(:created)
      |> render(:show, workout: workout)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, workout} <- Workouts.get_workout_with_elements(business_id, id) do
      render(conn, :show, workout: workout)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, updated} <- Workouts.update_workout(business_id, id, conn.body_params) do
      render(conn, :show, workout: updated)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, _workout} <- Workouts.delete_workout(business_id, id) do
      send_resp(conn, :no_content, "")
    end
  end

  @spec duplicate(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def duplicate(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, duplicated} <- Workouts.duplicate_workout(business_id, id) do
      conn
      |> put_status(:created)
      |> render(:show, workout: duplicated)
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, %{"plan_id" => plan_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 50)

    with {:ok, %{workouts: workouts, count: count}} <-
           Workouts.list_workouts(business_id, plan_id, offset, limit) do
      render(conn, :index, workouts: workouts, count: count)
    end
  end
end
