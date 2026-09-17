defmodule EasyWeb.Coaches.WorkbenchController do
  use EasyWeb, :typed_controller

  alias Easy.Workbench
  alias EasyWeb.Types.Workbench, as: WorkbenchType
  alias EasyWeb.Types.WorkbenchItems

  typed(:items, query: WorkbenchItems.query(), ok: {200, WorkbenchItems.t()})
  typed(:index, ok: {200, data(WorkbenchType.t())})
  typed(:onboarding, query: WorkbenchType.list_query(), ok: {200, WorkbenchType.onboarding_page()})

  typed(:programming,
    query: WorkbenchType.programming_query(),
    ok: {200, WorkbenchType.programming_page()}
  )

  typed(:expiring, query: WorkbenchType.list_query(), ok: {200, WorkbenchType.expiring_page()})
  typed(:quiet, query: WorkbenchType.list_query(), ok: {200, WorkbenchType.quiet_page()})
  typed(:check_ins, query: WorkbenchType.list_query(), ok: {200, WorkbenchType.check_in_page()})
  typed(:replies, query: WorkbenchType.list_query(), ok: {200, WorkbenchType.replies_page()})
  typed(:snooze, path: %{id: Ecto.UUID.t()}, body: WorkbenchType.snooze(), ok: {204, nil})

  @spec items(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def items(conn, _params) do
    opts =
      [
        view: conn.query_params["view"],
        search: conn.query_params["search"],
        cursor: conn.query_params["cursor"],
        limit: conn.query_params["limit"],
        include_count: conn.query_params["include_count"]
      ]
      |> Enum.reject(fn {_key, value} -> is_nil(value) end)

    with {:ok, page} <- Workbench.list_items(conn.assigns.ctx, opts) do
      ok(conn, %{data: page.items, count: page.count, next_cursor: page.next_cursor})
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    with {:ok, counts} <- Workbench.counts(conn.assigns.ctx) do
      ok(conn, %{data: counts})
    end
  end

  @spec onboarding(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def onboarding(conn, _params) do
    with {:ok, page} <- Workbench.list_onboarding_queue(conn.assigns.ctx, pagination_opts(conn.query_params)) do
      ok(conn, %{data: page.items, count: page.count, next_cursor: Map.get(page, :next_cursor)})
    end
  end

  @spec programming(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def programming(conn, _params) do
    opts = Keyword.put(pagination_opts(conn.query_params), :service, conn.query_params["service"] || :all)

    with {:ok, page} <- Workbench.list_programming_queue(conn.assigns.ctx, opts) do
      ok(conn, %{data: page.items, count: page.count, next_cursor: Map.get(page, :next_cursor)})
    end
  end

  @spec expiring(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def expiring(conn, _params) do
    with {:ok, page} <- Workbench.list_expiring_queue(conn.assigns.ctx, pagination_opts(conn.query_params)) do
      ok(conn, %{data: page.items, count: page.count, next_cursor: Map.get(page, :next_cursor)})
    end
  end

  @spec quiet(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def quiet(conn, _params) do
    with {:ok, page} <- Workbench.list_quiet_queue(conn.assigns.ctx, pagination_opts(conn.query_params)) do
      ok(conn, %{data: page.items, count: page.count, next_cursor: Map.get(page, :next_cursor)})
    end
  end

  @spec check_ins(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def check_ins(conn, _params) do
    with {:ok, page} <- Workbench.list_check_in_queue(conn.assigns.ctx, pagination_opts(conn.query_params)) do
      ok(conn, %{data: page.items, count: page.count, next_cursor: Map.get(page, :next_cursor)})
    end
  end

  @spec replies(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def replies(conn, _params) do
    with {:ok, page} <- Workbench.list_replies_queue(conn.assigns.ctx, pagination_opts(conn.query_params)) do
      ok(conn, %{data: page.items, count: page.count, next_cursor: Map.get(page, :next_cursor)})
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
    [offset: query["offset"], limit: query["limit"], cursor: query["cursor"], search: query["search"]]
    |> Enum.reject(fn {_key, value} -> is_nil(value) end)
  end
end
