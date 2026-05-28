defmodule EasyWeb.Clients.WorkoutSessionController do
  use EasyWeb, :controller

  alias Easy.Sessions
  alias Easy.Training.WorkoutSession

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, session} <-
           Sessions.create_client_workout_session_for_user(business_id, user_id, params) do
      conn
      |> put_status(:created)
      |> render(:show, session: session)
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 50)
    state = parse_enum(params, "state", WorkoutSession.states())

    with {:ok, %{sessions: sessions, count: count}} <-
           Sessions.list_sessions_for_user(business_id, user_id, state, offset, limit) do
      render(conn, :index, sessions: sessions, count: count)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, session} <-
           Sessions.fetch_client_session_with_sets_for_user(business_id, user_id, id) do
      render(conn, :show, session: session)
    end
  end

  @spec active(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def active(conn, _params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, session} <- Sessions.fetch_active_client_session_for_user(business_id, user_id) do
      render(conn, :show, session: session)
    end
  end

  @spec complete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def complete(conn, %{"id" => id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, completed} <-
           Sessions.complete_client_workout_session_for_user(
             business_id,
             user_id,
             id,
             conn.body_params
           ) do
      render(conn, :show, session: completed)
    end
  end

  @spec discard(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def discard(conn, %{"id" => id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, discarded} <-
           Sessions.discard_client_workout_session_for_user(business_id, user_id, id) do
      render(conn, :show, session: discarded)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, updated} <-
           Sessions.update_client_workout_session_for_user(
             business_id,
             user_id,
             id,
             conn.body_params
           ) do
      render(conn, :show, session: updated)
    end
  end
end
