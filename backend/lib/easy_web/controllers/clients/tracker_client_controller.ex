defmodule EasyWeb.Clients.TrackerClientController do
  alias Easy.Trackers.Assignments
  alias Easy.Trackers.Reader
  alias Easy.Trackers.Records
  alias EasyWeb.Types.Revision
  alias EasyWeb.Types.TrackerAssignment
  alias EasyWeb.Types.TrackerEntry
  alias EasyWeb.Types.TrackerEntryIndex
  alias EasyWeb.Types.TrackerMetrics
  alias EasyWeb.Types.TrackerRequest
  alias EasyWeb.Types.TrackerToday
  use EasyWeb, :typed_controller

  typed(:assignments, ok: {200, data([TrackerAssignment.t()])})
  typed(:entries, query: TrackerEntry.list_query(), ok: {200, TrackerEntryIndex.t()})
  typed(:create_entry, body: TrackerEntry.create(), ok: {201, data(TrackerEntry.t())})
  typed(:update_entry, body: TrackerEntry.update(), ok: {200, data(TrackerEntry.t())})
  typed(:remove_entry, query: Revision.t(), ok: {204, nil})
  typed(:today, ok: {200, data(TrackerToday.t())})
  typed(:prompts, query: TrackerToday.prompt_query(), ok: {200, data([TrackerAssignment.t()])})
  typed(:requests, ok: {200, data([TrackerRequest.t()])})
  typed(:metrics, query: TrackerMetrics.query(), ok: {200, data(TrackerMetrics.t())})
  @spec assignments(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def assignments(conn, _params) do
    with {:ok, result} <- Assignments.list_for_client(conn.assigns.ctx, conn.assigns.ctx.client_id) do
      ok(conn, %{data: result})
    end
  end

  @spec entries(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def entries(conn, _params) do
    with {:ok, result} <- Reader.entries_for_client(conn.assigns.ctx, conn.assigns.ctx.client_id, opts(conn)) do
      ok(conn, result)
    end
  end

  @spec create_entry(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create_entry(conn, _params) do
    with {:ok, result} <- Records.create_for_client(conn.assigns.ctx, conn.assigns.ctx.client_id, conn.body_params) do
      ok(conn, %{data: result})
    end
  end

  @spec update_entry(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update_entry(conn, _params) do
    with {:ok, result} <- Records.update_for_client(conn.assigns.ctx, conn.assigns.ctx.client_id, conn.path_params["id"], conn.body_params) do
      ok(conn, %{data: result})
    end
  end

  @spec remove_entry(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def remove_entry(conn, _params) do
    with {:ok, _result} <- Records.remove_for_client(conn.assigns.ctx, conn.assigns.ctx.client_id, conn.path_params["id"], conn.query_params["expected_revision"]) do
      ok(conn)
    end
  end

  @spec today(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def today(conn, _params) do
    with {:ok, result} <- Reader.today_for_client(conn.assigns.ctx, conn.assigns.ctx.client_id) do
      ok(conn, %{data: result})
    end
  end

  @spec prompts(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def prompts(conn, _params) do
    with {:ok, result} <- Reader.prompts_for_client(conn.assigns.ctx, conn.assigns.ctx.client_id, conn.query_params) do
      ok(conn, %{data: result})
    end
  end

  @spec requests(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def requests(conn, _params) do
    with {:ok, result} <- Reader.requests_for_client(conn.assigns.ctx, conn.assigns.ctx.client_id) do
      ok(conn, %{data: result})
    end
  end

  @spec metrics(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def metrics(conn, _params) do
    with {:ok, result} <- Reader.metrics_for_client(conn.assigns.ctx, conn.assigns.ctx.client_id, conn.path_params["id"], opts(conn)) do
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
