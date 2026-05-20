defmodule EasyWeb.Coaches.WorkoutController do
  use EasyWeb, :controller

  alias Easy.Training.PlanReads
  alias Easy.Training.Workout
  alias Easy.Training.WorkoutReads

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, %{"plan_id" => plan_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, _plan} <- PlanReads.fetch_plan(business_id, plan_id),
         {:ok, workout} <- Workout.create(plan_id, business_id, params) do
      conn
      |> put_status(:created)
      |> render(:show, workout: workout)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, workout} <- WorkoutReads.fetch_workout_with_elements(business_id, id) do
      render(conn, :show, workout: workout)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, workout} <- WorkoutReads.fetch_workout(business_id, id),
         {:ok, updated} <- Workout.update(workout, conn.body_params) do
      render(conn, :show, workout: updated)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, workout} <- WorkoutReads.fetch_workout(business_id, id),
         {:ok, _workout} <- Workout.delete(workout) do
      send_resp(conn, :no_content, "")
    end
  end

  @spec duplicate(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def duplicate(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, workout} <- WorkoutReads.fetch_workout(business_id, id),
         {:ok, duplicated} <- Workout.duplicate(workout) do
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
           WorkoutReads.list_workouts(business_id, plan_id, offset, limit) do
      render(conn, :index, workouts: workouts, count: count)
    end
  end
end
