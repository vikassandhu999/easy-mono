defmodule EasyWeb.Clients.WorkoutSessionController do
  use EasyWeb, :controller

  alias Easy.Clients.Client
  alias Easy.Training.SessionReads
  alias Easy.Training.WorkoutSession

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id),
         :ok <- WorkoutSession.ensure_no_active(business_id, client.id),
         {:ok, session} <- WorkoutSession.client_create(business_id, client.id, params) do
      conn
      |> put_status(:created)
      |> render(:show, session: session)
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id) do
      offset = parse_integer(params, "offset", 0)
      limit = parse_integer(params, "limit", 50)
      state = parse_enum(params, "state", WorkoutSession.states())

      with {:ok, %{sessions: sessions, count: count}} <-
             SessionReads.list_sessions(business_id, client.id, state, offset, limit) do
        render(conn, :index, sessions: sessions, count: count)
      end
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id),
         {:ok, session} <- SessionReads.fetch_client_session_with_sets(business_id, client.id, id) do
      render(conn, :show, session: session)
    end
  end

  @spec active(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def active(conn, _params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id),
         {:ok, session} <- SessionReads.fetch_active_client_session(business_id, client.id) do
      render(conn, :show, session: session)
    end
  end

  @spec complete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def complete(conn, %{"id" => id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id),
         {:ok, session} <- SessionReads.fetch_client_session_with_sets(business_id, client.id, id),
         {:ok, completed} <- WorkoutSession.complete(session, conn.body_params) do
      render(conn, :show, session: completed)
    end
  end

  @spec discard(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def discard(conn, %{"id" => id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id),
         {:ok, session} <- SessionReads.fetch_client_session_with_sets(business_id, client.id, id),
         {:ok, discarded} <- WorkoutSession.discard(session) do
      render(conn, :show, session: discarded)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id),
         {:ok, session} <- SessionReads.fetch_client_session_with_sets(business_id, client.id, id),
         {:ok, updated} <- WorkoutSession.client_update(session, conn.body_params) do
      render(conn, :show, session: updated)
    end
  end
end
