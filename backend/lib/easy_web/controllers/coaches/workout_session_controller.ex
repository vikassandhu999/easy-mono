defmodule EasyWeb.Coaches.WorkoutSessionController do
  use EasyWeb, :typed_controller

  alias Easy.Training.Execution
  alias EasyWeb.Types.Training.Session

  typed(:index, query: Session.list_query(), ok: {200, page(Session.t())})
  typed(:show, ok: {200, data(Session.t())})

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    client_id = conn.path_params["client_id"]

    with {:ok, %{sessions: sessions, count: count}} <-
           Execution.list_sessions_for_client(conn.assigns.ctx, client_id, history_opts(conn.query_params)) do
      ok(conn, %{data: sessions, count: count})
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    client_id = conn.path_params["client_id"]
    id = conn.path_params["id"]

    with {:ok, session} <- Execution.get_session_for_client(conn.assigns.ctx, client_id, id) do
      ok(conn, %{data: session})
    end
  end

  defp history_opts(query) do
    [
      from: query["from"],
      to: query["to"],
      offset: query["offset"] || 0,
      limit: query["limit"] || 20
    ]
  end
end
