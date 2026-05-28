defmodule EasyWeb.Coaches.WorkoutSessionController do
  use EasyWeb, :controller

  alias Easy.Training.Sessions
  alias Easy.Training.WorkoutSession

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, %{"client_id" => client_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, session} <- Sessions.create_workout_session(business_id, client_id, params) do
      conn
      |> put_status(:created)
      |> render(:show, session: session)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, session} <- Sessions.fetch_session_with_sets(business_id, id) do
      render(conn, :show, session: session)
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    %{business_id: business_id} = conn.assigns.claims

    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 50)
    client_id = Map.get(params, "client_id")
    state = parse_enum(params, "state", WorkoutSession.states())

    with {:ok, %{sessions: sessions, count: count}} <-
           Sessions.list_sessions(business_id, client_id, state, offset, limit) do
      render(conn, :index, sessions: sessions, count: count)
    end
  end

  @spec complete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def complete(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, completed} <- Sessions.complete_workout_session(business_id, id, conn.body_params) do
      render(conn, :show, session: completed)
    end
  end

  @spec discard(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def discard(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, discarded} <- Sessions.discard_workout_session(business_id, id) do
      render(conn, :show, session: discarded)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, _session} <- Sessions.delete_workout_session(business_id, id) do
      send_resp(conn, :no_content, "")
    end
  end
end
