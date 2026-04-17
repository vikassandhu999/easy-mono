defmodule EasyWeb.Clients.WorkoutSessionController do
  use EasyWeb, :controller

  alias Easy.Clients.Client
  alias Easy.Repo
  alias Easy.Training.LastPerformed
  alias Easy.Training.SessionSummary
  alias Easy.Training.WorkoutSession

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims
    planned_workout_id = Map.get(params, "planned_workout_id")

    with {:ok, client} <- Client.get_for_user(business_id, user_id),
         :ok <- WorkoutSession.ensure_no_active(business_id, client.id),
         true <- WorkoutSession.accessible_workout?(business_id, planned_workout_id),
         {:ok, session} <- WorkoutSession.create(business_id, client.id, params) do
      conn
      |> put_status(:created)
      |> render_show(session)
    else
      false -> {:error, :not_found}
      error -> error
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id) do
      offset = parse_integer(params, "offset", 0)
      limit = parse_integer(params, "limit", 50)
      state = parse_enum(params, "state", WorkoutSession.states())

      base =
        WorkoutSession
        |> WorkoutSession.for_business(business_id)
        |> WorkoutSession.for_client(client.id)
        |> WorkoutSession.with_state(state)

      count = Repo.aggregate(base, :count, :id)

      sessions =
        base
        |> WorkoutSession.newest()
        |> Easy.Utils.paginate(offset, limit)
        |> WorkoutSession.with_sets()
        |> Repo.all()

      render(conn, :index, sessions: sessions, count: count)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id) do
      case WorkoutSession
           |> WorkoutSession.for_business(business_id)
           |> WorkoutSession.for_client(client.id)
           |> WorkoutSession.with_sets()
           |> Repo.get(id) do
        nil -> {:error, :not_found}
        session -> render_show(conn, session)
      end
    end
  end

  @spec active(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def active(conn, _params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id) do
      case WorkoutSession
           |> WorkoutSession.for_business(business_id)
           |> WorkoutSession.for_client(client.id)
           |> WorkoutSession.with_state(:active)
           |> WorkoutSession.with_sets()
           |> Repo.one() do
        nil -> {:error, :not_found}
        session -> render_show(conn, session)
      end
    end
  end

  @spec complete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def complete(conn, %{"id" => id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id),
         {:ok, session} <- get_client_session(business_id, client.id, id),
         {:ok, completed} <- WorkoutSession.complete(session, conn.body_params) do
      summary = SessionSummary.build(completed)

      render(conn, :show,
        session: completed,
        last_performed_by_element: LastPerformed.for_session(completed),
        summary: summary
      )
    end
  end

  @spec discard(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def discard(conn, %{"id" => id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id),
         {:ok, session} <- get_client_session(business_id, client.id, id),
         {:ok, discarded} <- WorkoutSession.discard(session) do
      render_show(conn, discarded)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id),
         {:ok, session} <- get_client_session(business_id, client.id, id),
         {:ok, updated} <- WorkoutSession.update(session, conn.body_params) do
      render_show(conn, updated)
    end
  end

  defp render_show(conn, session) do
    render(conn, :show,
      session: session,
      last_performed_by_element: LastPerformed.for_session(session)
    )
  end

  defp get_client_session(business_id, client_id, session_id) do
    case WorkoutSession
         |> WorkoutSession.for_business(business_id)
         |> WorkoutSession.for_client(client_id)
         |> WorkoutSession.with_sets()
         |> Repo.get(session_id) do
      nil -> {:error, :not_found}
      session -> {:ok, session}
    end
  end
end
