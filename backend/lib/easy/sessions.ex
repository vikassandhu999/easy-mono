defmodule Easy.Sessions do
  alias Easy.Clients
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Repo
  alias Easy.Training.TrainingPerformedSet
  alias Easy.Training.TrainingSession

  # ---------------------------------------------------------------------------
  # Coach read fns (Case-2: Ctx-first, client_id from path)
  # ---------------------------------------------------------------------------

  @spec list_sessions_for_client(Ctx.t(), String.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), sessions: [TrainingSession.t()]}} | {:error, :not_found}
  def list_sessions_for_client(%Ctx{} = ctx, client_id, opts \\ []) do
    with :ok <- Clients.authorize_client_id(ctx, client_id) do
      {:ok, paginated_sessions(ctx.business_id, client_id, opts)}
    end
  end

  @spec get_session_for_client(Ctx.t(), String.t(), String.t()) ::
          {:ok, TrainingSession.t()} | {:error, :not_found}
  def get_session_for_client(%Ctx{} = ctx, client_id, session_id) do
    with :ok <- Clients.authorize_client_id(ctx, client_id) do
      TrainingSession
      |> TrainingSession.for_client(ctx.business_id, client_id)
      |> TrainingSession.include_sets(ctx.business_id)
      |> Repo.get(session_id)
      |> ok_or_not_found()
    end
  end

  # ---------------------------------------------------------------------------
  # Client self fns (Case-3: Ctx-first, target from ctx.client_id)
  # ---------------------------------------------------------------------------

  @spec list_client_sessions(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), sessions: [TrainingSession.t()]}} | {:error, :not_found}
  def list_client_sessions(%Ctx{} = ctx, opts \\ []) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      {:ok, paginated_sessions(ctx.business_id, client_id, opts)}
    end
  end

  @spec get_client_session(Ctx.t(), String.t()) ::
          {:ok, TrainingSession.t()} | {:error, :not_found}
  def get_client_session(%Ctx{} = ctx, session_id) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      fetch_client_session_preloaded(ctx.business_id, client_id, session_id)
    end
  end

  @spec update_client_session(Ctx.t(), String.t(), map()) ::
          {:ok, TrainingSession.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_client_session(%Ctx{} = ctx, session_id, attrs) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx),
         {:ok, session} <- fetch_client_session_preloaded(ctx.business_id, client_id, session_id) do
      case to_string(attrs[:state] || "") do
        "completed" when session.state == :completed -> update_client_workout_session(session, attrs)
        "completed" -> complete_workout_session(session, attrs)
        "discarded" -> discard_workout_session(session)
        _ -> update_client_workout_session(session, attrs)
      end
    end
  end

  # ---------------------------------------------------------------------------
  # Private helpers
  # ---------------------------------------------------------------------------

  defp paginated_sessions(business_id, client_id, opts) do
    offset = Keyword.get(opts, :offset, 0)
    limit = min(Keyword.get(opts, :limit, 20), 20)

    base =
      TrainingSession
      |> TrainingSession.for_client(business_id, client_id)
      |> maybe_for_date_range(Keyword.get(opts, :from), Keyword.get(opts, :to))

    %{
      count: Repo.aggregate(base, :count, :id),
      sessions:
        base
        |> TrainingSession.newest()
        |> Easy.Utils.paginate(offset, limit)
        |> TrainingSession.include_sets(business_id)
        |> Repo.all()
    }
  end

  defp fetch_client_session_preloaded(business_id, client_id, session_id) do
    TrainingSession
    |> TrainingSession.for_client(business_id, client_id)
    |> TrainingSession.include_sets(business_id)
    |> Repo.get(session_id)
    |> ok_or_not_found()
  end

  defp update_client_workout_session(%TrainingSession{} = session, attrs) do
    session
    |> TrainingSession.update_changeset(attrs, :client)
    |> Repo.update()
    |> preload_session()
  end

  defp complete_workout_session(%TrainingSession{} = session, attrs) do
    occurred_at = DateTime.utc_now(:second)
    attrs = Map.merge(attrs, %{ended_at: occurred_at, state: :completed})

    Repo.transaction(fn ->
      with {:ok, updated} <- session |> TrainingSession.update_changeset(attrs) |> Repo.update(),
           :ok <- stamp_client_activity(session.business_id, session.client_id, occurred_at) do
        updated
      else
        {:error, reason} -> Repo.rollback(reason)
      end
    end)
    |> preload_session()
  end

  defp stamp_client_activity(business_id, client_id, occurred_at) do
    Client
    |> Client.last_active_stamp(business_id, client_id, occurred_at)
    |> Repo.update_all([])
    |> case do
      {1, nil} -> :ok
      {0, nil} -> {:error, :not_found}
    end
  end

  defp discard_workout_session(%TrainingSession{} = session) do
    session
    |> TrainingSession.update_changeset(%{state: :discarded, ended_at: DateTime.utc_now(:second)})
    |> Repo.update()
    |> preload_session()
  end

  defp maybe_for_date_range(query, nil, nil), do: query
  defp maybe_for_date_range(query, from, nil), do: TrainingSession.for_date_from(query, from)
  defp maybe_for_date_range(query, nil, to), do: TrainingSession.for_date_to(query, to)
  defp maybe_for_date_range(query, from, to), do: TrainingSession.for_date_range(query, from, to)

  defp preload_session({:ok, %TrainingSession{} = session}) do
    business_id = session.business_id

    set_query =
      TrainingPerformedSet
      |> TrainingPerformedSet.for_business(business_id)
      |> TrainingPerformedSet.by_position()
      |> TrainingPerformedSet.include_exercise(business_id)

    {:ok, Repo.preload(session, performed_sets: set_query)}
  end

  defp preload_session(error), do: error

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
