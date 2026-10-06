defmodule EasyWeb.Clients.WorkoutSessionController do
  use EasyWeb, :typed_controller

  alias Easy.Training.Execution
  alias EasyWeb.Types.Training.{Session, SessionIndex}

  typed(:index, query: Session.list_query(), ok: {200, SessionIndex.t()})
  typed(:create, body: Session.create(), ok: {201, data(Session.t())})
  typed(:show, ok: {200, data(Session.t())})
  typed(:active, ok: {200, data(Session.t() | nil)})
  typed(:update, body: Session.update(), ok: {200, data(Session.t())})
  typed(:complete, body: Session.update(), ok: {200, data(Session.t())})
  typed(:discard, ok: {200, data(Session.t())})

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    with {:ok, page} <- Execution.list_client_session_page(conn.assigns.ctx, history_opts(conn.query_params)) do
      ok(conn, page)
    end
  end

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    with {:ok, session} <- Execution.start_client_session(conn.assigns.ctx, conn.body_params) do
      ok(conn, %{data: session})
    end
  end

  @spec active(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def active(conn, _params) do
    with {:ok, session} <- Execution.get_client_active_session(conn.assigns.ctx) do
      ok(conn, %{data: session})
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, session} <- Execution.get_client_session(conn.assigns.ctx, id) do
      ok(conn, %{data: session})
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, updated} <- Execution.update_client_session(conn.assigns.ctx, id, conn.body_params) do
      ok(conn, %{data: updated})
    end
  end

  @spec complete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def complete(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, session} <- Execution.complete_client_session(conn.assigns.ctx, id, conn.body_params) do
      ok(conn, %{data: session})
    end
  end

  @spec discard(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def discard(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, session} <- Execution.discard_client_session(conn.assigns.ctx, id) do
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
