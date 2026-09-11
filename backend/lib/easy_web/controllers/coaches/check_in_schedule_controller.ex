defmodule EasyWeb.Coaches.CheckInScheduleController do
  use EasyWeb, :typed_controller

  alias Easy.CheckIns
  alias EasyWeb.Types.CheckInSchedule
  alias EasyWeb.Types.CheckInScheduleIndex

  typed(:index, query: CheckInSchedule.list_query(), ok: {200, CheckInScheduleIndex.t()})
  typed(:create, body: CheckInSchedule.create(), ok: {201, data(CheckInSchedule.t())})
  typed(:update, body: CheckInSchedule.update(), ok: {200, data(CheckInSchedule.t())})
  typed(:delete, ok: {204, nil})

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, %{"client_id" => client_id}) do
    params = conn.query_params
    opts = [cursor: params["cursor"], limit: params["limit"], search: params["search"], active: params["active"]]

    with {:ok, page} <- CheckIns.list_check_in_schedule_page_for_client(conn.assigns.ctx, client_id, opts) do
      ok(conn, page)
    end
  end

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    client_id = conn.path_params["client_id"]

    with {:ok, schedule} <-
           CheckIns.create_check_in_schedule_for_client(conn.assigns.ctx, client_id, conn.body_params) do
      ok(conn, %{data: schedule})
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    with {:ok, schedule} <-
           CheckIns.update_check_in_schedule(conn.assigns.ctx, conn.path_params["id"], conn.body_params) do
      ok(conn, %{data: schedule})
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, _params) do
    with {:ok, _schedule} <- CheckIns.delete_check_in_schedule(conn.assigns.ctx, conn.path_params["id"]) do
      ok(conn)
    end
  end
end
