defmodule EasyWeb.Clients.WorkoutLogController do
  use EasyWeb, :typed_controller
  alias Easy.WorkoutLogs
  alias EasyWeb.Types.{LogRestore, WorkoutLog}

  typed(:show, path: %{id: Ecto.UUID.t()}, ok: {200, data(WorkoutLog.t())})
  typed(:start, body: WorkoutLog.start(), ok: {201, data(WorkoutLog.t())})
  typed(:update, path: %{id: Ecto.UUID.t()}, body: WorkoutLog.update(), ok: {200, WorkoutLog.mutation()})
  typed(:finish, path: %{id: Ecto.UUID.t()}, body: WorkoutLog.finish(), ok: {200, WorkoutLog.mutation()})
  typed(:discard, path: %{id: Ecto.UUID.t()}, ok: {200, WorkoutLog.mutation()})
  typed(:reopen, path: %{id: Ecto.UUID.t()}, ok: {200, WorkoutLog.mutation()})
  typed(:delete, path: %{id: Ecto.UUID.t()}, ok: {200, LogRestore.t()})
  typed(:restore, body: LogRestore.t(), ok: {200, data(WorkoutLog.t())})

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    with {:ok, row} <- WorkoutLogs.get_client_workout_log(conn.assigns.ctx, conn.path_params["id"]) do
      ok(conn, %{data: row})
    end
  end

  @spec start(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def start(conn, _params) do
    with {:ok, row} <- WorkoutLogs.start_client_workout_log(conn.assigns.ctx, conn.body_params) do
      ok(conn, %{data: row})
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    with {:ok, result} <- WorkoutLogs.update_client_workout_log(conn.assigns.ctx, conn.path_params["id"], conn.body_params) do
      ok(conn, result)
    end
  end

  @spec finish(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def finish(conn, _params) do
    with {:ok, result} <- WorkoutLogs.finish_client_workout_log(conn.assigns.ctx, conn.path_params["id"], conn.body_params) do
      ok(conn, result)
    end
  end

  @spec discard(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def discard(conn, _params) do
    with {:ok, result} <- WorkoutLogs.discard_client_workout_log(conn.assigns.ctx, conn.path_params["id"]) do
      ok(conn, result)
    end
  end

  @spec reopen(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def reopen(conn, _params) do
    with {:ok, result} <- WorkoutLogs.reopen_client_workout_log(conn.assigns.ctx, conn.path_params["id"]) do
      ok(conn, result)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, _params) do
    with {:ok, result} <- WorkoutLogs.delete_client_workout_log(conn.assigns.ctx, conn.path_params["id"]) do
      ok(conn, result)
    end
  end

  @spec restore(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def restore(conn, _params) do
    with {:ok, row} <- WorkoutLogs.restore_client_workout_log(conn.assigns.ctx, conn.body_params) do
      ok(conn, %{data: row})
    end
  end
end
