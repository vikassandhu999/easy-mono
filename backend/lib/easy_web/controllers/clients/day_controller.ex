defmodule EasyWeb.Clients.DayController do
  use EasyWeb, :typed_controller
  alias Easy.ClientDays
  alias EasyWeb.Types.{ClientDay, ClientExerciseQuery, ExerciseIndex, WeekMarker}

  typed(:show, path: %{date: Date.t()}, ok: {200, data(ClientDay.t())})
  typed(:markers, query: WeekMarker.query(), ok: {200, WeekMarker.index()})
  typed(:exercises, query: ClientExerciseQuery.t(), ok: {200, ExerciseIndex.t()})

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    with {:ok, day} <- ClientDays.read_client_day(conn.assigns.ctx, conn.path_params["date"]) do
      ok(conn, %{data: day})
    end
  end

  @spec markers(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def markers(conn, _params) do
    with {:ok, markers} <- ClientDays.list_client_week_markers(conn.assigns.ctx, conn.query_params["from"]) do
      ok(conn, markers)
    end
  end

  @spec exercises(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def exercises(conn, _params) do
    opts =
      Enum.flat_map([:search, :cursor, :limit], fn key ->
        case Map.fetch(conn.query_params, to_string(key)) do
          {:ok, value} -> [{key, value}]
          :error -> []
        end
      end)

    with {:ok, page} <- ClientDays.list_client_exercises(conn.assigns.ctx, opts) do
      ok(conn, page)
    end
  end
end
