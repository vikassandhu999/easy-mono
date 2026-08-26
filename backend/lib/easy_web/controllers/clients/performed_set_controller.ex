defmodule EasyWeb.Clients.PerformedSetController do
  use EasyWeb, :controller
  use EasyWeb.TypedRoute

  alias Easy.Training.Execution
  alias EasyWeb.Types.Training.PerformedSet

  typed(:create, body: PerformedSet.create(), ok: {201, data(PerformedSet.t())})
  typed(:update, body: PerformedSet.update(), ok: {200, data(PerformedSet.t())})
  typed(:delete, ok: {204, nil})

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    session_id = conn.path_params["session_id"]

    with {:ok, set} <- Execution.create_client_performed_set(conn.assigns.ctx, session_id, conn.body_params) do
      ok(conn, %{data: set})
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, updated} <- Execution.update_client_performed_set(conn.assigns.ctx, id, conn.body_params) do
      ok(conn, %{data: updated})
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, _set} <- Execution.delete_client_performed_set(conn.assigns.ctx, id) do
      ok(conn)
    end
  end
end
