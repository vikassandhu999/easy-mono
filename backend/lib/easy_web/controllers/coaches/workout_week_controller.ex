defmodule EasyWeb.Coaches.WorkoutWeekController do
  use EasyWeb, :typed_controller
  alias Easy.Workouts
  alias EasyWeb.Types.{WorkoutSchedule, WorkoutWeek}
  typed(:show, query: WorkoutWeek.query(), ok: {200, data(WorkoutWeek.t())})
  typed(:create_schedule, body: WorkoutSchedule.create(), ok: {201, WorkoutSchedule.mutation()})
  typed(:update_schedule, body: WorkoutSchedule.update(), ok: {200, WorkoutSchedule.mutation()})
  typed(:remove_schedule, query: WorkoutSchedule.remove_query(), ok: {200, WorkoutWeek.mutation()})
  typed(:undo, body: WorkoutWeek.undo(), ok: {200, data(WorkoutWeek.t())})
  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params),
    do: with({:ok, result} <- Workouts.read_week_for_client(conn.assigns.ctx, conn.path_params["client_id"], on: conn.query_params["on"]), do: ok(conn, %{data: result}))

  @spec create_schedule(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create_schedule(conn, _params),
    do: with({:ok, result} <- Workouts.add_schedule_for_client(conn.assigns.ctx, conn.path_params["client_id"], conn.body_params), do: ok(conn, result))

  @spec update_schedule(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update_schedule(conn, _params),
    do: with({:ok, result} <- Workouts.update_schedule_for_client(conn.assigns.ctx, conn.path_params["client_id"], conn.path_params["id"], conn.body_params), do: ok(conn, result))

  @spec remove_schedule(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def remove_schedule(conn, _params),
    do:
      with(
        {:ok, result} <- Workouts.remove_schedule_for_client(conn.assigns.ctx, conn.path_params["client_id"], conn.path_params["id"], conn.query_params["weekday"]),
        do: ok(conn, result)
      )

  @spec undo(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def undo(conn, _params),
    do: with({:ok, result} <- Workouts.undo_for_client(conn.assigns.ctx, conn.path_params["client_id"], conn.body_params.token), do: ok(conn, %{data: result}))
end
