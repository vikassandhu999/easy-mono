defmodule Easy.Training.Execution do
  alias Easy.ClientAccess
  alias Easy.ClientAccount
  alias Easy.Ctx
  alias Easy.CursorPage
  alias Easy.Repo
  alias Easy.Training.{PlanReader, PrescriptionSnapshot, TrainingSession}
  alias Easy.Utils

  import Ecto.Changeset
  import Ecto.Query

  @active_session_constraint "training_sessions_one_active_client_index"
  @history_types %{from: :date, to: :date}

  @spec start_client_session(Ctx.t(), String.t() | nil, map()) ::
          {:ok, TrainingSession.t()} | {:error, :not_found | :conflict | Ecto.Changeset.t()}
  def start_client_session(%Ctx{} = ctx, workout_id, attrs) do
    started_at = DateTime.utc_now(:second)

    with {:ok, client_id} <- Ctx.fetch_client_id(ctx),
         {:ok, %{local_date: date}} <- ClientAccount.get_client_calendar(ctx, started_at),
         {:ok, start} <- resolve_start(ctx, workout_id, date, started_at) do
      ctx.business_id
      |> TrainingSession.insert_changeset(client_id, start, attrs)
      |> Repo.insert()
      |> normalize_start_result(ctx.business_id)
    end
  end

  @spec get_client_active_session(Ctx.t()) ::
          {:ok, TrainingSession.t() | nil} | {:error, :not_found}
  def get_client_active_session(%Ctx{} = ctx) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      session =
        TrainingSession
        |> TrainingSession.for_client(ctx.business_id, client_id)
        |> TrainingSession.for_state(:active)
        |> TrainingSession.include_sets(ctx.business_id)
        |> Repo.one()

      {:ok, session}
    end
  end

  @spec update_client_session(Ctx.t(), String.t(), map()) ::
          {:ok, TrainingSession.t()} | {:error, :not_found | :conflict | Ecto.Changeset.t()}
  def update_client_session(%Ctx{} = ctx, session_id, attrs) do
    mutate_client_session(ctx, session_id, fn
      %TrainingSession{state: :active} = session ->
        session |> TrainingSession.update_changeset(attrs) |> Repo.update()

      %TrainingSession{} ->
        {:error, :conflict}
    end)
  end

  @spec complete_client_session(Ctx.t(), String.t(), map()) ::
          {:ok, TrainingSession.t()} | {:error, :not_found | :conflict | Ecto.Changeset.t()}
  def complete_client_session(%Ctx{} = ctx, session_id, attrs) do
    mutate_client_session(ctx, session_id, &close_client_session(ctx, &1, :completed, attrs))
  end

  @spec discard_client_session(Ctx.t(), String.t()) ::
          {:ok, TrainingSession.t()} | {:error, :not_found | :conflict | Ecto.Changeset.t()}
  def discard_client_session(%Ctx{} = ctx, session_id) do
    mutate_client_session(ctx, session_id, &close_client_session(ctx, &1, :discarded, %{}))
  end

  @spec get_client_session(Ctx.t(), String.t()) ::
          {:ok, TrainingSession.t()} | {:error, :not_found}
  def get_client_session(%Ctx{} = ctx, session_id) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      fetch_client_session(ctx.business_id, client_id, session_id)
    end
  end

  @spec get_session_for_client(Ctx.t(), String.t(), String.t()) ::
          {:ok, TrainingSession.t()} | {:error, :not_found}
  def get_session_for_client(%Ctx{} = ctx, client_id, session_id) do
    with :ok <- ClientAccess.authorize_client_id(ctx, client_id) do
      fetch_client_session(ctx.business_id, client_id, session_id)
    end
  end

  @spec list_client_sessions(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), sessions: [TrainingSession.t()]}}
          | {:error, :not_found | Ecto.Changeset.t()}
  def list_client_sessions(%Ctx{} = ctx, opts \\ []) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx),
         {:ok, filters} <- history_filters(opts) do
      {:ok, paginated_sessions(ctx.business_id, client_id, filters)}
    end
  end

  @spec list_sessions_for_client(Ctx.t(), String.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), sessions: [TrainingSession.t()]}}
          | {:error, :not_found | Ecto.Changeset.t()}
  def list_sessions_for_client(%Ctx{} = ctx, client_id, opts \\ []) do
    with :ok <- ClientAccess.authorize_client_id(ctx, client_id),
         {:ok, filters} <- history_filters(opts) do
      {:ok, paginated_sessions(ctx.business_id, client_id, filters)}
    end
  end

  @spec list_session_page_for_client(Ctx.t(), String.t(), keyword()) ::
          {:ok, CursorPage.t(TrainingSession.t())} | {:error, :not_found | :invalid_cursor | Ecto.Changeset.t()}
  def list_session_page_for_client(%Ctx{} = ctx, client_id, opts \\ []) do
    with :ok <- ClientAccess.authorize_client_id(ctx, client_id) do
      client_session_page(ctx, client_id, opts)
    end
  end

  @spec list_client_session_page(Ctx.t(), keyword()) ::
          {:ok, CursorPage.t(TrainingSession.t())} | {:error, :not_found | :invalid_cursor | Ecto.Changeset.t()}
  def list_client_session_page(%Ctx{} = ctx, opts \\ []) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      client_session_page(ctx, client_id, opts)
    end
  end

  defp client_session_page(ctx, client_id, opts) do
    with {:ok, filters} <- history_filters(opts),
         :ok <- compatible_pagination(opts) do
      base =
        TrainingSession
        |> TrainingSession.for_client(ctx.business_id, client_id)
        |> TrainingSession.for_date_range(filters.from, filters.to)
        |> TrainingSession.for_state(Keyword.get(opts, :state))
        |> TrainingSession.for_search(Keyword.get(opts, :search))

      session_page(base, ctx.business_id, filters, Keyword.get(opts, :cursor))
    end
  end

  defp compatible_pagination(opts) do
    if Keyword.get(opts, :cursor) && Keyword.has_key?(opts, :offset), do: {:error, :invalid_cursor}, else: :ok
  end

  defp session_page(base, business_id, filters, nil) do
    rows =
      base
      |> TrainingSession.newest()
      |> Utils.paginate(filters.offset, filters.limit)
      |> TrainingSession.include_sets(business_id)
      |> Repo.all()

    {:ok, %{data: rows, count: Repo.aggregate(base, :count, :id), next_cursor: nil}}
  end

  defp session_page(base, business_id, filters, cursor) do
    with {:ok, query} <- CursorPage.query(base, cursor, filters.limit) do
      rows = query |> TrainingSession.include_sets(business_id) |> Repo.all()
      {:ok, CursorPage.finish(rows, filters.limit, Repo.aggregate(base, :count, :id))}
    end
  end

  defp mutate_client_session(%Ctx{} = ctx, session_id, mutation) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      result =
        Repo.transact(fn -> apply_client_session_mutation(ctx.business_id, client_id, session_id, mutation) end)

      preload_session(result, ctx.business_id)
    end
  end

  defp apply_client_session_mutation(business_id, client_id, session_id, mutation) do
    with {:ok, session} <- lock_client_session(business_id, client_id, session_id) do
      mutation.(session)
    end
  end

  defp close_client_session(_ctx, %TrainingSession{state: state} = session, state, _attrs), do: {:ok, session}

  defp close_client_session(_ctx, %TrainingSession{state: current}, _state, _attrs)
       when current in [:completed, :discarded],
       do: {:error, :conflict}

  defp close_client_session(ctx, %TrainingSession{} = session, :completed, attrs) do
    closed_at = DateTime.utc_now(:second)

    with {:ok, updated} <- session |> TrainingSession.update_changeset(:completed, closed_at, attrs) |> Repo.update(),
         {:ok, :recorded} <- ClientAccount.record_client_activity(ctx, closed_at) do
      {:ok, updated}
    end
  end

  defp close_client_session(_ctx, %TrainingSession{} = session, :discarded, _attrs) do
    session
    |> TrainingSession.update_changeset(:discarded, DateTime.utc_now(:second), %{})
    |> Repo.update()
  end

  defp lock_client_session(business_id, client_id, session_id) do
    TrainingSession
    |> TrainingSession.for_client(business_id, client_id)
    |> lock("FOR UPDATE")
    |> Repo.get(session_id)
    |> ok_or_not_found()
  end

  defp resolve_start(_ctx, nil, date, started_at) do
    {:ok,
     %{
       kind: :freestyle,
       date: date,
       started_at: started_at
     }}
  end

  defp resolve_start(ctx, workout_id, date, started_at) do
    with {:ok, %{plan: plan, workout: workout}} <-
           PlanReader.resolve_client_startable_prescription(ctx, workout_id, date) do
      snapshot = PrescriptionSnapshot.build(plan, workout)

      {:ok,
       %{
         kind: :planned,
         date: date,
         started_at: started_at,
         snapshot_version: snapshot["version"],
         prescription_snapshot: snapshot,
         source_plan_id: plan.id,
         source_workout_id: workout.id
       }}
    end
  end

  defp normalize_start_result({:ok, session}, business_id), do: preload_session({:ok, session}, business_id)

  defp normalize_start_result({:error, changeset}, _business_id) do
    if active_session_conflict?(changeset), do: {:error, :conflict}, else: {:error, changeset}
  end

  defp active_session_conflict?(changeset) do
    Enum.any?(changeset.errors, fn {_field, {_message, metadata}} ->
      Keyword.get(metadata, :constraint_name) == @active_session_constraint
    end)
  end

  defp fetch_client_session(business_id, client_id, session_id) do
    TrainingSession
    |> TrainingSession.for_client(business_id, client_id)
    |> TrainingSession.include_sets(business_id)
    |> Repo.get(session_id)
    |> ok_or_not_found()
  end

  defp paginated_sessions(business_id, client_id, filters) do
    base =
      TrainingSession
      |> TrainingSession.for_client(business_id, client_id)
      |> TrainingSession.for_date_range(filters.from, filters.to)

    %{
      count: Repo.aggregate(base, :count, :id),
      sessions:
        base
        |> TrainingSession.newest()
        |> Utils.paginate(filters.offset, filters.limit)
        |> TrainingSession.include_sets(business_id)
        |> Repo.all()
    }
  end

  defp history_filters(opts) do
    {%{}, @history_types}
    |> cast(%{from: Keyword.get(opts, :from), to: Keyword.get(opts, :to)}, [:from, :to])
    |> validate_inclusive_range()
    |> case do
      %{valid?: true} = changeset -> {:ok, pagination(changeset, opts)}
      changeset -> {:error, %{changeset | action: :validate}}
    end
  end

  defp validate_inclusive_range(changeset) do
    from = get_field(changeset, :from)
    to = get_field(changeset, :to)

    if from && to && Date.compare(from, to) == :gt do
      add_error(changeset, :to, "must be on or after from")
    else
      changeset
    end
  end

  defp pagination(changeset, opts) do
    {offset, limit} = Easy.Utils.pagination_bounds(opts, 1)

    %{
      from: get_field(changeset, :from),
      to: get_field(changeset, :to),
      offset: offset,
      limit: limit
    }
  end

  defp preload_session({:ok, %TrainingSession{} = session}, business_id) do
    fetch_client_session(business_id, session.client_id, session.id)
  end

  defp preload_session(error, _business_id), do: error

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
