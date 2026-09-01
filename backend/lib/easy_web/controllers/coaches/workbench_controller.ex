defmodule EasyWeb.Coaches.WorkbenchController do
  use EasyWeb, :typed_controller

  alias Easy.Workbench
  alias EasyWeb.Types.Workbench, as: WorkbenchType
  alias EasyWeb.Types.WorkbenchCheckInQueueItem
  alias EasyWeb.Types.WorkbenchExpiringQueueItem
  alias EasyWeb.Types.WorkbenchOnboardingQueueItem
  alias EasyWeb.Types.WorkbenchProgrammingQueueItem
  alias EasyWeb.Types.WorkbenchQuietQueueItem
  alias EasyWeb.Types.WorkbenchRepliesQueueItem

  typed(:index, ok: {200, data(WorkbenchType.t())})
  typed(:onboarding, query: WorkbenchType.list_query(), ok: {200, page(WorkbenchOnboardingQueueItem.t())})

  typed(:programming,
    query: WorkbenchType.programming_query(),
    ok: {200, page(WorkbenchProgrammingQueueItem.t())}
  )

  typed(:expiring, query: WorkbenchType.list_query(), ok: {200, page(WorkbenchExpiringQueueItem.t())})
  typed(:quiet, query: WorkbenchType.list_query(), ok: {200, page(WorkbenchQuietQueueItem.t())})
  typed(:check_ins, query: WorkbenchType.list_query(), ok: {200, page(WorkbenchCheckInQueueItem.t())})
  typed(:replies, query: WorkbenchType.list_query(), ok: {200, page(WorkbenchRepliesQueueItem.t())})
  typed(:snooze, path: %{id: String.t()}, body: WorkbenchType.snooze(), ok: {204, nil})

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    with {:ok, counts} <- Workbench.counts(conn.assigns.ctx) do
      ok(conn, %{data: counts})
    end
  end

  @spec onboarding(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def onboarding(conn, _params) do
    with {:ok, page} <- Workbench.list_onboarding_queue(conn.assigns.ctx, pagination_opts(conn.query_params)) do
      ok(conn, %{data: page.items, count: page.count})
    end
  end

  @spec programming(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def programming(conn, _params) do
    opts = Keyword.put(pagination_opts(conn.query_params), :service, conn.query_params["service"] || :all)

    with {:ok, page} <- Workbench.list_programming_queue(conn.assigns.ctx, opts) do
      ok(conn, %{data: page.items, count: page.count})
    end
  end

  @spec expiring(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def expiring(conn, _params) do
    with {:ok, page} <- Workbench.list_expiring_queue(conn.assigns.ctx, pagination_opts(conn.query_params)) do
      ok(conn, %{data: page.items, count: page.count})
    end
  end

  @spec quiet(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def quiet(conn, _params) do
    with {:ok, page} <- Workbench.list_quiet_queue(conn.assigns.ctx, pagination_opts(conn.query_params)) do
      ok(conn, %{data: page.items, count: page.count})
    end
  end

  @spec check_ins(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def check_ins(conn, _params) do
    with {:ok, page} <- Workbench.list_check_in_queue(conn.assigns.ctx, pagination_opts(conn.query_params)) do
      ok(conn, %{data: page.items, count: page.count})
    end
  end

  @spec replies(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def replies(conn, _params) do
    with {:ok, page} <- Workbench.list_replies_queue(conn.assigns.ctx, pagination_opts(conn.query_params)) do
      ok(conn, %{data: page.items, count: page.count})
    end
  end

  @spec snooze(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def snooze(conn, _params) do
    with {:ok, _snooze} <-
           Workbench.snooze_queue_for_client(
             conn.assigns.ctx,
             conn.path_params["id"],
             conn.body_params
           ) do
      ok(conn)
    end
  end

  defp pagination_opts(query) do
    [offset: query["offset"], limit: query["limit"]]
    |> Enum.reject(fn {_key, value} -> is_nil(value) end)
  end
end
