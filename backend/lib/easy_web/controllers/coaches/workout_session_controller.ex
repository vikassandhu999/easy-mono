defmodule EasyWeb.Coaches.WorkoutSessionController do
  use EasyWeb, :controller

  alias Easy.Clients.Client
  alias Easy.Repo
  alias Easy.Training.WorkoutSession

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, %{"client_id" => client_id} = params) do
    %{business_id: business_id} = conn.assigns.claims
    planned_workout_id = Map.get(params, "planned_workout_id")

    with true <- Client.accessible?(business_id, client_id),
         true <- WorkoutSession.accessible_workout?(business_id, planned_workout_id),
         {:ok, session} <- WorkoutSession.create(business_id, client_id, params) do
      conn
      |> put_status(:created)
      |> render(:show, session: session)
    else
      false -> {:error, :not_found}
      error -> error
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case WorkoutSession
         |> WorkoutSession.for_business(business_id)
         |> WorkoutSession.with_sets()
         |> Repo.get(id) do
      nil -> {:error, :not_found}
      session -> render(conn, :show, session: session)
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    %{business_id: business_id} = conn.assigns.claims

    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 50)
    client_id = Map.get(params, "client_id")
    state = parse_enum(params, "state", WorkoutSession.states())

    base =
      WorkoutSession
      |> WorkoutSession.for_business(business_id)
      |> WorkoutSession.with_state(state)
      |> maybe_for_client(client_id)

    count = Repo.aggregate(base, :count, :id)

    sessions =
      base
      |> WorkoutSession.newest()
      |> Easy.Utils.paginate(offset, limit)
      |> WorkoutSession.with_sets()
      |> Repo.all()

    render(conn, :index, sessions: sessions, count: count)
  end

  @spec complete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def complete(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case WorkoutSession
         |> WorkoutSession.for_business(business_id)
         |> WorkoutSession.with_sets()
         |> Repo.get(id) do
      nil ->
        {:error, :not_found}

      session ->
        with {:ok, completed} <- WorkoutSession.complete(session, conn.body_params) do
          render(conn, :show, session: completed)
        end
    end
  end

  @spec discard(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def discard(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case WorkoutSession
         |> WorkoutSession.for_business(business_id)
         |> WorkoutSession.with_sets()
         |> Repo.get(id) do
      nil ->
        {:error, :not_found}

      session ->
        with {:ok, discarded} <- WorkoutSession.discard(session) do
          render(conn, :show, session: discarded)
        end
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case WorkoutSession
         |> WorkoutSession.for_business(business_id)
         |> WorkoutSession.with_sets()
         |> Repo.get(id) do
      nil ->
        {:error, :not_found}

      session ->
        with {:ok, _session} <- WorkoutSession.delete(session) do
          send_resp(conn, :no_content, "")
        end
    end
  end

  defp maybe_for_client(query, nil), do: query
  defp maybe_for_client(query, ""), do: query
  defp maybe_for_client(query, client_id), do: WorkoutSession.for_client(query, client_id)
end
