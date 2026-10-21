defmodule EasyWeb.Coaches.ClientWorkoutController do
  use EasyWeb, :typed_controller
  alias Easy.Workouts
  alias EasyWeb.Types.{Workout, WorkoutIndex, WorkoutWeek}
  typed(:index, query: Workout.list_query(), ok: {200, WorkoutIndex.t()})
  typed(:show, ok: {200, data(Workout.t())})
  typed(:create, body: Workout.create(), ok: {201, Workout.mutation()})
  typed(:update, body: Workout.update(), ok: {200, Workout.mutation()})
  typed(:copy, ok: {201, Workout.mutation()})
  typed(:delete, ok: {200, WorkoutWeek.mutation()})
  typed(:assign, ok: {201, Workout.mutation()})
  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params),
    do: with({:ok, result} <- Workouts.list_workouts_for_client(conn.assigns.ctx, conn.path_params["client_id"], opts(conn.query_params)), do: ok(conn, result))

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params),
    do: with({:ok, result} <- Workouts.get_workout_for_client(conn.assigns.ctx, conn.path_params["client_id"], conn.path_params["id"]), do: ok(conn, %{data: result}))

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params), do: with({:ok, result} <- Workouts.create_workout_for_client(conn.assigns.ctx, conn.path_params["client_id"], conn.body_params), do: ok(conn, result))

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params),
    do: with({:ok, result} <- Workouts.update_workout_for_client(conn.assigns.ctx, conn.path_params["client_id"], conn.path_params["id"], conn.body_params), do: ok(conn, result))

  @spec copy(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def copy(conn, _params),
    do: with({:ok, result} <- Workouts.copy_workout_for_client(conn.assigns.ctx, conn.path_params["client_id"], conn.path_params["id"]), do: ok(conn, result))

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, _params),
    do: with({:ok, result} <- Workouts.delete_workout_for_client(conn.assigns.ctx, conn.path_params["client_id"], conn.path_params["id"]), do: ok(conn, result))

  @spec assign(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def assign(conn, _params),
    do: with({:ok, result} <- Workouts.assign_workout_to_client(conn.assigns.ctx, conn.path_params["client_id"], conn.path_params["id"]), do: ok(conn, result))

  defp opts(q), do: Enum.map([:search, :kind, :goal, :place, :equipment, :muscle, :type, :cursor, :limit], &{&1, q[to_string(&1)]})
end
