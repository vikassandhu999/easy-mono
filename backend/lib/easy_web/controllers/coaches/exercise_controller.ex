defmodule EasyWeb.Coaches.ExerciseController do
  use EasyWeb, :typed_controller
  alias Easy.Workouts
  alias EasyWeb.Types.{Exercise, ExerciseIndex}
  typed(:index, query: Exercise.list_query(), ok: {200, ExerciseIndex.t()})
  typed(:show, ok: {200, data(Exercise.t())})
  typed(:create, body: Exercise.create(), ok: {201, data(Exercise.t())})
  typed(:update, body: Exercise.update(), ok: {200, data(Exercise.t())})
  typed(:copy, ok: {201, data(Exercise.t())})
  typed(:delete, ok: {204, nil})
  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params), do: with({:ok, result} <- Workouts.list_exercises(conn.assigns.ctx, opts(conn.query_params)), do: ok(conn, result))

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params), do: with({:ok, result} <- Workouts.get_exercise(conn.assigns.ctx, conn.path_params["id"]), do: ok(conn, %{data: result}))

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params), do: with({:ok, result} <- Workouts.create_exercise(conn.assigns.ctx, conn.body_params), do: ok(conn, %{data: result}))

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params), do: with({:ok, result} <- Workouts.update_exercise(conn.assigns.ctx, conn.path_params["id"], conn.body_params), do: ok(conn, %{data: result}))

  @spec copy(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def copy(conn, _params), do: with({:ok, result} <- Workouts.copy_exercise(conn.assigns.ctx, conn.path_params["id"]), do: ok(conn, %{data: result}))

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, _params), do: with({:ok, _result} <- Workouts.delete_exercise(conn.assigns.ctx, conn.path_params["id"]), do: ok(conn))

  defp opts(q), do: Enum.map([:search, :kind, :goal, :place, :equipment, :muscle, :type, :cursor, :limit], &{&1, q[to_string(&1)]})
end
