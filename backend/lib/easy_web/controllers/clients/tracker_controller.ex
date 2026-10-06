defmodule EasyWeb.Clients.TrackerController do
  alias Easy.Trackers
  alias EasyWeb.Types.Tracker
  alias EasyWeb.Types.TrackerIndex
  use EasyWeb, :typed_controller

  typed(:index, query: Tracker.list_query(), ok: {200, TrackerIndex.t()})
  typed(:show, ok: {200, data(Tracker.t())})
  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    with {:ok, result} <- Trackers.list_trackers(conn.assigns.ctx, opts(conn)) do
      ok(conn, result)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    with {:ok, result} <- Trackers.describe_tracker(conn.assigns.ctx, conn.path_params["id"]) do
      ok(conn, %{data: result})
    end
  end

  @query_keys [:cursor, :offset, :limit, :search, :kind, :archived, :tracker_id, :from, :to, :previous_date]
  defp opts(conn),
    do:
      Enum.flat_map(@query_keys, fn key ->
        case Map.fetch(conn.query_params, to_string(key)) do
          {:ok, value} -> [{key, value}]
          :error -> []
        end
      end)
end
