defmodule EasyWeb.Coaches.WorkoutSessionController do
  use EasyWeb, :typed_controller

  alias Easy.Training.Execution
  alias EasyWeb.Types.Training.{Session, SessionIndex}

  typed(:index, path: %{client_id: Ecto.UUID.t()}, query: Session.coach_list_query(), ok: {200, SessionIndex.t()})
  typed(:show, path: %{client_id: Ecto.UUID.t(), id: Ecto.UUID.t()}, ok: {200, data(Session.t())})

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    client_id = conn.path_params["client_id"]

    with {:ok, page} <-
           Execution.list_session_page_for_client(conn.assigns.ctx, client_id, history_opts(conn.query_params)) do
      ok(conn, page)
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
      offset: query["offset"],
      limit: query["limit"],
      cursor: query["cursor"],
      state: query["state"],
      search: query["search"]
    ]
    |> Enum.reject(fn {_key, value} -> is_nil(value) end)
  end
end
