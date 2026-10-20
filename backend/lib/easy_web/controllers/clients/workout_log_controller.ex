defmodule EasyWeb.Clients.WorkoutLogController do
  use EasyWeb, :typed_controller

  alias Easy.WorkoutLogs
  alias EasyWeb.Types.{ExerciseLog, ExerciseSet, Measurements, WorkoutLog, WorkoutLogIndex}

  typed(:index, query: WorkoutLog.list_query(), ok: {200, WorkoutLogIndex.t()})
  typed(:start, body: WorkoutLog.start(), replay_status: 200, ok: {201, data(WorkoutLog.t())})
  typed(:show, path: %{id: Ecto.UUID.t()}, ok: {200, data(WorkoutLog.t())})
  typed(:update, path: %{id: Ecto.UUID.t()}, body: WorkoutLog.update(), ok: {200, data(WorkoutLog.t())})
  typed(:finish, path: %{id: Ecto.UUID.t()}, body: WorkoutLog.feedback(), ok: {200, data(WorkoutLog.t())})
  typed(:discard, path: %{id: Ecto.UUID.t()}, ok: {200, data(WorkoutLog.t())})
  typed(:reopen, path: %{id: Ecto.UUID.t()}, ok: {200, data(WorkoutLog.t())})

  typed(:start_activity,
    path: %{id: Ecto.UUID.t()},
    body: ExerciseLog.start(),
    replay_status: 200,
    ok: {201, data(WorkoutLog.t())}
  )

  typed(:update_activity,
    path: %{id: Ecto.UUID.t(), activity_id: Ecto.UUID.t()},
    body: ExerciseLog.update(),
    ok: {200, data(WorkoutLog.t())}
  )

  typed(:complete_activity,
    path: %{id: Ecto.UUID.t(), activity_id: Ecto.UUID.t()},
    body: Measurements.t(),
    ok: {200, data(WorkoutLog.t())}
  )

  typed(:skip_activity, path: %{id: Ecto.UUID.t(), activity_id: Ecto.UUID.t()}, ok: {200, data(WorkoutLog.t())})
  typed(:reopen_activity, path: %{id: Ecto.UUID.t(), activity_id: Ecto.UUID.t()}, ok: {200, data(WorkoutLog.t())})

  typed(:replace_activity,
    path: %{id: Ecto.UUID.t(), activity_id: Ecto.UUID.t()},
    body: ExerciseLog.replace(),
    ok: {200, data(WorkoutLog.t())}
  )

  typed(:record_set,
    path: %{id: Ecto.UUID.t(), activity_id: Ecto.UUID.t()},
    body: ExerciseSet.record(),
    replay_status: 200,
    ok: {201, data(WorkoutLog.t())}
  )

  typed(:correct_set,
    path: %{id: Ecto.UUID.t(), activity_id: Ecto.UUID.t(), set_id: Ecto.UUID.t()},
    body: ExerciseSet.correct(),
    ok: {200, data(WorkoutLog.t())}
  )

  typed(:remove_set,
    path: %{id: Ecto.UUID.t(), activity_id: Ecto.UUID.t(), set_id: Ecto.UUID.t()},
    ok: {200, data(WorkoutLog.t())}
  )

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    with {:ok, result} <- WorkoutLogs.list_client_workout_logs(conn.assigns.ctx, opts(conn.query_params)) do
      ok(conn, result)
    end
  end

  @spec start(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def start(conn, _params) do
    with {:ok, result} <- WorkoutLogs.start_client_workout_log(conn.assigns.ctx, conn.body_params) do
      payload = if result.replayed?, do: {:replay, %{data: result}}, else: %{data: result}
      ok(conn, payload)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    with {:ok, result} <- WorkoutLogs.get_client_workout_log(conn.assigns.ctx, conn.path_params["id"]) do
      ok(conn, %{data: result})
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    with {:ok, result} <- WorkoutLogs.update_client_workout_log(conn.assigns.ctx, conn.path_params["id"], conn.body_params) do
      ok(conn, %{data: result})
    end
  end

  @spec finish(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def finish(conn, _params) do
    with {:ok, result} <- WorkoutLogs.finish_client_workout_log(conn.assigns.ctx, conn.path_params["id"], conn.body_params) do
      ok(conn, %{data: result})
    end
  end

  @spec discard(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def discard(conn, _params) do
    with {:ok, result} <- WorkoutLogs.discard_client_workout_log(conn.assigns.ctx, conn.path_params["id"]) do
      ok(conn, %{data: result})
    end
  end

  @spec reopen(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def reopen(conn, _params) do
    with {:ok, result} <- WorkoutLogs.reopen_client_workout_log(conn.assigns.ctx, conn.path_params["id"]) do
      ok(conn, %{data: result})
    end
  end

  @spec start_activity(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def start_activity(conn, _params) do
    with {:ok, result} <- WorkoutLogs.start_client_activity(conn.assigns.ctx, conn.path_params["id"], conn.body_params) do
      payload = if result.replayed?, do: {:replay, %{data: result}}, else: %{data: result}
      ok(conn, payload)
    end
  end

  @spec update_activity(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update_activity(conn, _params) do
    with {:ok, result} <- WorkoutLogs.update_client_activity(conn.assigns.ctx, conn.path_params["id"], conn.path_params["activity_id"], conn.body_params) do
      ok(conn, %{data: result})
    end
  end

  @spec complete_activity(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def complete_activity(conn, _params) do
    with {:ok, result} <- WorkoutLogs.complete_client_activity(conn.assigns.ctx, conn.path_params["id"], conn.path_params["activity_id"], conn.body_params) do
      ok(conn, %{data: result})
    end
  end

  @spec skip_activity(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def skip_activity(conn, _params) do
    with {:ok, result} <- WorkoutLogs.skip_client_activity(conn.assigns.ctx, conn.path_params["id"], conn.path_params["activity_id"]) do
      ok(conn, %{data: result})
    end
  end

  @spec reopen_activity(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def reopen_activity(conn, _params) do
    with {:ok, result} <- WorkoutLogs.reopen_client_activity(conn.assigns.ctx, conn.path_params["id"], conn.path_params["activity_id"]) do
      ok(conn, %{data: result})
    end
  end

  @spec replace_activity(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def replace_activity(conn, _params) do
    with {:ok, result} <- WorkoutLogs.replace_client_activity(conn.assigns.ctx, conn.path_params["id"], conn.path_params["activity_id"], conn.body_params) do
      ok(conn, %{data: result})
    end
  end

  @spec record_set(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def record_set(conn, _params) do
    with {:ok, result} <- WorkoutLogs.record_client_set(conn.assigns.ctx, conn.path_params["id"], conn.path_params["activity_id"], conn.body_params) do
      payload = if result.replayed?, do: {:replay, %{data: result}}, else: %{data: result}
      ok(conn, payload)
    end
  end

  @spec correct_set(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def correct_set(conn, _params) do
    with {:ok, result} <- WorkoutLogs.correct_client_set(conn.assigns.ctx, conn.path_params["id"], conn.path_params["activity_id"], conn.path_params["set_id"], conn.body_params) do
      ok(conn, %{data: result})
    end
  end

  @spec remove_set(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def remove_set(conn, _params) do
    with {:ok, result} <- WorkoutLogs.remove_client_set(conn.assigns.ctx, conn.path_params["id"], conn.path_params["activity_id"], conn.path_params["set_id"]) do
      ok(conn, %{data: result})
    end
  end

  defp opts(query) do
    Enum.flat_map([:date, :scheduled_date, :state, :offset, :limit], fn key ->
      case Map.fetch(query, to_string(key)) do
        {:ok, value} -> [{key, value}]
        :error -> []
      end
    end)
  end
end
