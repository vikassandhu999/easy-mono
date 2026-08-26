defmodule EasyWeb.Clients.WorkoutSessionController do
  use EasyWeb, :controller
  use EasyWeb.TypedRoute

  alias Easy.Training.Execution
  alias EasyWeb.Types.Training.Session

  typed(:index, query: Session.list_query(), ok: {200, page(Session.t())})
  typed(:create, body: Session.create(), ok: {201, data(Session.t())})
  typed(:show, ok: {200, data(Session.t())})
  typed(:active, ok: {200, data(Session.t() | nil)})
  typed(:update, body: Session.update(), ok: {200, data(Session.t())})
  typed(:complete, body: Session.update(), ok: {200, data(Session.t())})
  typed(:discard, ok: {200, data(Session.t())})

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    with {:ok, %{sessions: sessions, count: count}} <-
           Execution.list_client_sessions(conn.assigns.ctx, history_opts(conn.query_params)) do
      ok(conn, %{data: Enum.map(sessions, &Session.client_format/1), count: count})
    end
  end

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    workout_id = conn.body_params[:training_workout_id]
    attrs = Map.delete(conn.body_params, :training_workout_id)

    with {:ok, session} <- Execution.start_client_session(conn.assigns.ctx, workout_id, attrs) do
      ok(conn, %{data: Session.client_format(session)})
    end
  end

  @spec active(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def active(conn, _params) do
    with {:ok, session} <- Execution.get_client_active_session(conn.assigns.ctx) do
      ok(conn, %{data: client_session(session)})
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, session} <- Execution.get_client_session(conn.assigns.ctx, id) do
      ok(conn, %{data: Session.client_format(session)})
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, updated} <- Execution.update_client_session(conn.assigns.ctx, id, conn.body_params) do
      ok(conn, %{data: Session.client_format(updated)})
    end
  end

  @spec complete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def complete(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, session} <- Execution.complete_client_session(conn.assigns.ctx, id, conn.body_params) do
      ok(conn, %{data: Session.client_format(session)})
    end
  end

  @spec discard(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def discard(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, session} <- Execution.discard_client_session(conn.assigns.ctx, id) do
      ok(conn, %{data: Session.client_format(session)})
    end
  end

  defp client_session(nil), do: nil
  defp client_session(session), do: Session.client_format(session)

  defp history_opts(query) do
    [
      from: query["from"],
      to: query["to"],
      offset: query["offset"] || 0,
      limit: query["limit"] || 20
    ]
  end
end
