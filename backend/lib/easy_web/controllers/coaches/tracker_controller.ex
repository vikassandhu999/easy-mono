defmodule EasyWeb.Coaches.TrackerController do
  alias Easy.Trackers
  alias EasyWeb.Types.Tracker
  alias EasyWeb.Types.TrackerIndex
  use EasyWeb, :typed_controller

  typed(:index, query: Tracker.list_query(), ok: {200, TrackerIndex.t()})
  typed(:show, ok: {200, data(Tracker.t())})
  typed(:create, body: Tracker.create(), ok: {201, data(Tracker.t())})
  typed(:update, body: Tracker.update(), ok: {200, data(Tracker.t())})
  typed(:delete, ok: {204, nil})
  typed(:archive, ok: {200, data(Tracker.t())})
  typed(:restore, ok: {200, data(Tracker.t())})
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

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    with {:ok, result} <- Trackers.create_tracker(conn.assigns.ctx, conn.body_params) do
      ok(conn, %{data: result})
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    with {:ok, result} <- Trackers.update_tracker(conn.assigns.ctx, conn.path_params["id"], conn.body_params) do
      ok(conn, %{data: result})
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, _params) do
    with {:ok, _result} <- Trackers.delete_tracker(conn.assigns.ctx, conn.path_params["id"]) do
      ok(conn)
    end
  end

  @spec archive(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def archive(conn, _params) do
    with {:ok, result} <- Trackers.archive_tracker(conn.assigns.ctx, conn.path_params["id"]) do
      ok(conn, %{data: result})
    end
  end

  @spec restore(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def restore(conn, _params) do
    with {:ok, result} <- Trackers.restore_tracker(conn.assigns.ctx, conn.path_params["id"]) do
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
