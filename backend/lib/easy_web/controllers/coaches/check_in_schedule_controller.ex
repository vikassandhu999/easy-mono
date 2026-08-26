defmodule EasyWeb.Coaches.CheckInScheduleController do
  use EasyWeb, :controller
  use EasyWeb.TypedRoute

  alias Easy.Forms
  alias EasyWeb.Types.CheckInSchedule

  typed(:index, ok: {200, data([CheckInSchedule.t()])})
  typed(:create, body: CheckInSchedule.create(), ok: {201, data(CheckInSchedule.t())})
  typed(:update, body: CheckInSchedule.update(), ok: {200, data(CheckInSchedule.t())})
  typed(:delete, ok: {204, nil})

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, %{"client_id" => client_id}) do
    with {:ok, schedules} <- Forms.list_check_in_schedules_for_client(conn.assigns.ctx, client_id) do
      ok(conn, %{data: schedules})
    end
  end

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    client_id = conn.path_params["client_id"]

    with {:ok, schedule} <-
           Forms.create_check_in_schedule_for_client(conn.assigns.ctx, client_id, conn.body_params) do
      ok(conn, %{data: schedule})
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    with {:ok, schedule} <-
           Forms.update_check_in_schedule(conn.assigns.ctx, conn.path_params["id"], conn.body_params) do
      ok(conn, %{data: schedule})
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, _params) do
    with {:ok, _schedule} <- Forms.delete_check_in_schedule(conn.assigns.ctx, conn.path_params["id"]) do
      ok(conn)
    end
  end
end
