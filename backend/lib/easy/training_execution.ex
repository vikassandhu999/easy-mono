defmodule Easy.Training.Execution do
  import Ecto.Query
  import Ecto.Changeset
  alias Easy.ChatRecordNotes
  alias Easy.ClientAccess
  alias Easy.ClientAccount
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.CursorPage
  alias Easy.Plans.Plan, as: TrainingPlan
  alias Easy.Plans.Reader, as: PlanReader
  alias Easy.Plans.Revision, as: PlanRevision
  alias Easy.RecordJournal
  alias Easy.Repo
  alias Easy.Revision
  alias Easy.Training.TrainingExercise
  alias Easy.Training.TrainingPerformedSet
  alias Easy.Training.TrainingSession
  alias Easy.Utils

  @spec start_client_session(Ctx.t(), map()) :: {:ok, TrainingSession.t()} | {:error, term()}
  def start_client_session(%Ctx{} = ctx, attrs) do
    with {:ok, attrs} <- start_input(attrs) do
      RecordJournal.write(ctx, &start_locked(ctx, &1, attrs))
    end
  end

  defp start_input(attrs) do
    types = %{
      plan_revision_id: Ecto.UUID,
      workout_id: Ecto.UUID,
      schedule_entry_id: Ecto.UUID,
      occurrence_date: :date,
      request_id: Ecto.UUID,
      notes: :string
    }

    {%{}, types} |> cast(attrs, Map.keys(types)) |> apply_action(:validate)
  end

  defp start_locked(ctx, client, attrs) do
    request = field(attrs, :request_id)

    existing =
      if request,
        do: Repo.one(from(s in TrainingSession.for_client(ctx.business_id, client.id), where: s.request_id == ^request))

    if existing do
      replay_start(existing, attrs)
    else
      now = DateTime.utc_now(:second)
      today = Client.local_date(client, now)

      with {:ok, source} <- resolve_source(ctx, attrs, today),
           {:ok, session} <-
             TrainingSession.insert_changeset(
               ctx.business_id,
               client.id,
               RecordJournal.actor(ctx),
               Map.merge(
                 string_keys(attrs),
                 Map.merge(source, %{
                   "local_date" => today,
                   "timezone" => Client.applied_timezone(client),
                   "started_at" => now
                 })
               )
             )
             |> Repo.insert() do
        {:ok, load(session), [RecordJournal.change(session.id, "session", nil, session)]}
      end
    end
  end

  defp replay_start(existing, attrs) do
    cs = cast(existing, attrs, [:plan_revision_id, :workout_id, :schedule_entry_id, :occurrence_date, :notes])
    if cs.valid? and cs.changes == %{}, do: {:ok, load(existing), []}, else: {:error, :conflict}
  end

  defp resolve_source(ctx, attrs, today) do
    revision_id = field(attrs, :plan_revision_id)
    workout_id = field(attrs, :workout_id)
    entry_id = field(attrs, :schedule_entry_id)
    occurrence = field(attrs, :occurrence_date)

    cond do
      is_nil(revision_id) and is_nil(workout_id) and is_nil(entry_id) and is_nil(occurrence) ->
        {:ok, %{}}

      is_nil(revision_id) or is_nil(workout_id) or is_nil(entry_id) != is_nil(occurrence) ->
        {:error, :invalid_prescription}

      true ->
        validate_source(ctx, revision_id, workout_id, entry_id, occurrence, today)
    end
  end

  defp validate_source(ctx, revision_id, workout_id, entry_id, occurrence, today) do
    with {:ok, date} <- PlanReader.local_date(ctx, occurrence || today),
         true <- Date.compare(date, today) != :gt || {:error, :invalid_occurrence} do
      row =
        Repo.one(
          from(r in PlanRevision,
            join: p in TrainingPlan,
            on: r.plan_id == p.id,
            where:
              p.domain == :training and r.id == ^revision_id and p.client_id == ^ctx.client_id and
                p.business_id == ^ctx.business_id and
                fragment("plan_covers(?,?)", p.id, type(^date, :date)),
            select: r
          )
        )

      validate_revision(ctx, row, workout_id, entry_id, date, revision_id)
    end
  end

  defp validate_revision(ctx, row, workout_id, entry_id, date, revision_id) do
    with true <- not is_nil(row) || {:error, :not_found},
         current <- PlanReader.revision_on(ctx, :training, row.plan_id, date),
         true <- current.id == row.id || {:error, :conflict},
         true <- Enum.any?(row.content["workouts"], &(&1["id"] == workout_id)) || {:error, :not_found},
         :ok <- validate_occurrence(row, workout_id, entry_id, date) do
      {:ok,
       %{
         "plan_revision_id" => revision_id,
         "workout_id" => workout_id,
         "schedule_entry_id" => entry_id,
         "occurrence_date" => if(entry_id, do: date)
       }}
    end
  end

  defp validate_occurrence(_row, _workout, nil, _date), do: :ok

  defp validate_occurrence(row, workout, entry, date) do
    result =
      Repo.query!(
        "SELECT EXISTS(SELECT 1 FROM expected_workouts(ARRAY[(SELECT client_id FROM plans WHERE id=$1)]::uuid[],$2,$2) e WHERE e.plan_id=$1 AND e.plan_revision_id=$3 AND e.schedule_entry_id=$4 AND e.workout_id=$5)",
        [Ecto.UUID.dump!(row.plan_id), date, Ecto.UUID.dump!(row.id), Ecto.UUID.dump!(entry), Ecto.UUID.dump!(workout)]
      )

    if result.rows == [[true]], do: :ok, else: {:error, :invalid_occurrence}
  end

  @spec get_client_active_session(Ctx.t()) :: {:ok, TrainingSession.t() | nil} | {:error, term()}
  def get_client_active_session(%Ctx{} = ctx) do
    with {:ok, id} <- Ctx.fetch_client_id(ctx) do
      row = Repo.one(from(s in TrainingSession.for_client(ctx.business_id, id), where: s.state == :active))
      {:ok, if(row, do: load(row))}
    end
  end

  @spec get_client_session(Ctx.t(), String.t()) :: {:ok, TrainingSession.t()} | {:error, term()}
  def get_client_session(%Ctx{} = ctx, id) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx), do: fetch(ctx, client_id, id)
  end

  @spec get_session_for_client(Ctx.t(), String.t(), String.t()) :: {:ok, TrainingSession.t()} | {:error, term()}
  def get_session_for_client(%Ctx{} = ctx, client_id, id) do
    with :ok <- ClientAccess.authorize_client_id(ctx, client_id), do: fetch(ctx, client_id, id)
  end

  defp fetch(ctx, client_id, id) do
    case Repo.get(TrainingSession.for_client(ctx.business_id, client_id), id) do
      nil -> {:error, :not_found}
      row -> {:ok, load(row)}
    end
  end

  @spec update_client_session(Ctx.t(), String.t(), map()) :: {:ok, TrainingSession.t()} | {:error, term()}
  def update_client_session(%Ctx{} = ctx, id, attrs), do: mutate(ctx, id, attrs, nil)
  @spec complete_client_session(Ctx.t(), String.t(), map()) :: {:ok, TrainingSession.t()} | {:error, term()}
  def complete_client_session(%Ctx{} = ctx, id, attrs), do: mutate(ctx, id, attrs, :completed)
  @spec discard_client_session(Ctx.t(), String.t()) :: {:ok, TrainingSession.t()} | {:error, term()}
  def discard_client_session(%Ctx{} = ctx, id), do: mutate(ctx, id, %{}, :discarded)

  defp mutate(ctx, id, attrs, state) do
    RecordJournal.write(ctx, &mutate_locked(ctx, &1, id, attrs, state)) |> then(&ChatRecordNotes.notify_result(ctx, &1))
  end

  defp mutate_locked(ctx, client, id, attrs, state) do
    with {:ok, row} <- fetch(ctx, client.id, id) do
      mutate_session(ctx, client, row, attrs, state)
    end
  end

  defp mutate_session(_ctx, _client, %{state: state} = row, attrs, state) when state in [:completed, :discarded] do
    cs = cast(row, attrs, [:local_date, :notes])
    if cs.valid? and cs.changes == %{}, do: {:ok, row, []}, else: {:error, :conflict}
  end

  defp mutate_session(ctx, client, row, attrs, state) do
    today = Client.local_date(client, DateTime.utc_now())
    cs = row |> TrainingSession.update_changeset(attrs) |> close(state)

    with :ok <- Revision.check(row, field(attrs, :expected_revision) || :any),
         :ok <- mutable(row, state),
         :ok <- validate_execution_date(cs, today),
         {:ok, updated} <- Repo.update(cs),
         {:ok, _} <- share_note(ctx, row, updated) do
      if state == :completed, do: ClientAccount.record_client_activity(ctx, updated.ended_at)
      {:ok, load(updated), [RecordJournal.change(row.id, "session", row, updated)]}
    end
  end

  defp validate_execution_date(cs, today) do
    date = get_field(cs, :local_date)
    if date && Date.after?(date, today), do: {:error, :future_date}, else: :ok
  end

  defp share_note(ctx, before, %{state: :completed} = after_row) do
    if before.state != :completed or before.notes != after_row.notes do
      ChatRecordNotes.share(ctx, :training_session, after_row, after_row.notes)
    else
      {:ok, :quiet}
    end
  end

  defp share_note(_ctx, _before, _after), do: {:ok, :quiet}

  defp mutable(%{state: :discarded}, _), do: {:error, :conflict}
  defp mutable(%{state: :completed}, :discarded), do: {:error, :conflict}
  defp mutable(_, _), do: :ok
  defp close(cs, nil), do: cs

  defp close(cs, state),
    do: cs |> put_change(:state, state) |> put_change(:ended_at, get_field(cs, :ended_at) || DateTime.utc_now(:second))

  @spec list_client_session_page(Ctx.t(), keyword()) :: {:ok, map()} | {:error, term()}
  def list_client_session_page(%Ctx{} = ctx, opts \\ []) do
    with {:ok, id} <- Ctx.fetch_client_id(ctx), do: page(ctx, id, opts)
  end

  @spec list_session_page_for_client(Ctx.t(), String.t(), keyword()) :: {:ok, map()} | {:error, term()}
  def list_session_page_for_client(%Ctx{} = ctx, id, opts \\ []) do
    with :ok <- ClientAccess.authorize_client_id(ctx, id), do: page(ctx, id, opts)
  end

  defp page(ctx, id, opts) do
    query = TrainingSession.for_client(ctx.business_id, id)
    query = Enum.reduce([:from, :to], query, fn key, q -> filter_date(q, key, Keyword.get(opts, key)) end)
    query = if Keyword.get(opts, :state), do: where(query, [s], s.state == ^Keyword.get(opts, :state)), else: query
    query = search(query, Keyword.get(opts, :search))
    limit = CursorPage.limit(opts)

    with :ok <- validate_cursor_options(opts),
         {:ok, paged} <- CursorPage.query(query, Keyword.get(opts, :cursor) || "start", limit) do
      paged = apply_offset(paged, opts)
      rows = Repo.all(paged) |> Enum.map(&load/1)
      {:ok, CursorPage.finish(rows, limit, Repo.aggregate(query, :count))}
    end
  end

  defp search(q, term) when term in [nil, ""], do: q

  defp search(q, term) do
    pattern = Easy.Search.like_pattern(term)

    from(s in q,
      where:
        ilike(
          fragment(
            "coalesce((SELECT w->>'name' FROM plan_revisions r, jsonb_array_elements(r.content->'workouts') w WHERE r.id=? AND w->>'id'=?::text),'Free session')",
            s.plan_revision_id,
            s.workout_id
          ),
          ^pattern
        )
    )
  end

  defp validate_cursor_options(opts) do
    if Keyword.get(opts, :cursor), do: CursorPage.validate_options(opts), else: :ok
  end

  defp apply_offset(query, opts) do
    if Keyword.get(opts, :cursor) do
      query
    else
      {position, _} = Utils.pagination_bounds(opts, 1)
      offset(query, ^position)
    end
  end

  defp filter_date(q, _key, nil), do: q
  defp filter_date(q, :from, d), do: where(q, [s], s.local_date >= ^d)
  defp filter_date(q, :to, d), do: where(q, [s], s.local_date <= ^d)

  @spec load(TrainingSession.t()) :: TrainingSession.t()
  def load(row) do
    row =
      Repo.preload(
        row,
        [
          :plan_revision,
          performed_sets:
            from(s in TrainingPerformedSet,
              where: s.business_id == ^row.business_id and is_nil(s.deleted_at),
              order_by: [asc: s.position],
              preload: [exercise: ^exercise_query(row.business_id)]
            )
        ],
        force: true
      )

    prescription =
      if row.plan_revision, do: Enum.find(row.plan_revision.content["workouts"], &(&1["id"] == row.workout_id))

    %{row | prescription: prescription, performed_sets: Enum.map(row.performed_sets, &set_name(&1, prescription))}
  end

  @spec exercise_query(String.t()) :: Ecto.Query.t()
  def exercise_query(business_id),
    do: from(e in TrainingExercise, where: is_nil(e.business_id) or e.business_id == ^business_id)

  @spec set_name(TrainingPerformedSet.t(), map() | nil) :: TrainingPerformedSet.t()
  def set_name(%{exercise_id: nil} = set, _prescription), do: set

  def set_name(set, prescription) do
    items = if prescription, do: for(b <- prescription["blocks"], i <- b["items"], do: i), else: []
    prescribed = Enum.find(items, &(&1["id"] == set.item_id))

    name = if prescribed, do: prescribed["exercise_name"], else: set.exercise.name

    %{set | exercise_name: name}
  end

  defp field(attrs, key), do: Map.get(string_keys(attrs), to_string(key))
  defp string_keys(attrs), do: Map.new(attrs, fn {k, v} -> {to_string(k), v} end)
end
