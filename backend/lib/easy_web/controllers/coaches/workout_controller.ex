defmodule EasyWeb.Coaches.WorkoutController do
  use EasyWeb, :typed_controller
  alias Easy.Workouts
  alias EasyWeb.Types.{Workout, WorkoutIndex}
  typed(:index, query: Workout.list_query(), ok: {200, WorkoutIndex.t()})
  typed(:show, ok: {200, data(Workout.t())})
  typed(:create, body: Workout.create(), ok: {201, data(Workout.t())})
  typed(:update, body: Workout.update(), ok: {200, data(Workout.t())})
  typed(:copy, ok: {201, data(Workout.t())})
  typed(:delete, ok: {204, nil})
  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params), do: with({:ok, result} <- Workouts.list_workouts(conn.assigns.ctx, opts(conn.query_params)), do: ok(conn, result))

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params), do: with({:ok, result} <- Workouts.get_workout(conn.assigns.ctx, conn.path_params["id"]), do: ok(conn, %{data: result}))

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params), do: with({:ok, result} <- Workouts.create_workout(conn.assigns.ctx, conn.body_params), do: ok(conn, %{data: result}))

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params), do: with({:ok, result} <- Workouts.update_workout(conn.assigns.ctx, conn.path_params["id"], conn.body_params), do: ok(conn, %{data: result}))

  @spec copy(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def copy(conn, _params), do: with({:ok, result} <- Workouts.copy_workout(conn.assigns.ctx, conn.path_params["id"]), do: ok(conn, %{data: result}))

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, _params), do: with({:ok, _result} <- Workouts.delete_workout(conn.assigns.ctx, conn.path_params["id"]), do: ok(conn))

  defp opts(q), do: Enum.map([:search, :kind, :goal, :place, :equipment, :muscle, :type, :cursor, :limit], &{&1, q[to_string(&1)]})
end
