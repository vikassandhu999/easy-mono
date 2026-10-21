defmodule Easy.WorkoutLogs do
  import Ecto.Changeset
  import Ecto.Query

  alias Easy.ClientAccess
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Repo

  alias Easy.Workouts.{
    Content,
    ExerciseLog,
    ExerciseSet,
    Recording,
    Workout,
    WorkoutLog,
    WorkoutReplacementReceipt,
    WorkoutSchedule
  }

  @type failure :: {:error, atom() | Ecto.Changeset.t()}
  @type result :: {:ok, WorkoutLog.t()} | failure()
  @type list_result :: {:ok, %{count: non_neg_integer(), workout_logs: [WorkoutLog.t()]}} | failure()
  @set_identity_exclusions [
    :id,
    :business_id,
    :exercise_log_id,
    :workout_log_id,
    :workout_exercise_id,
    :exercise_id,
    :inserted_at,
    :updated_at
  ]

  @spec start_client_workout_log(Ctx.t(), map()) :: result()
  def start_client_workout_log(ctx, attrs),
    do: as_client(ctx, &start_log(ctx, &1, :client, attrs))

  @spec start_workout_log_for_client(Ctx.t(), String.t(), map()) :: result()
  def start_workout_log_for_client(ctx, client_id, attrs),
    do: as_coach(ctx, client_id, fn -> start_log(ctx, client_id, {:coach, ctx.coach_id}, attrs) end)

  @spec get_client_workout_log(Ctx.t(), String.t()) :: result()
  def get_client_workout_log(ctx, id), do: as_client(ctx, &read_log(ctx, &1, id))

  @spec get_workout_log_for_client(Ctx.t(), String.t(), String.t()) :: result()
  def get_workout_log_for_client(ctx, client_id, id),
    do: as_coach(ctx, client_id, fn -> read_log(ctx, client_id, id) end)

  @spec list_client_workout_logs(Ctx.t(), keyword()) :: list_result()
  def list_client_workout_logs(ctx, opts \\ []), do: as_client(ctx, &list_logs(ctx, &1, opts))

  @spec list_workout_logs_for_client(Ctx.t(), String.t(), keyword()) :: list_result()
  def list_workout_logs_for_client(ctx, client_id, opts \\ []),
    do: as_coach(ctx, client_id, fn -> list_logs(ctx, client_id, opts) end)

  @spec update_client_workout_log(Ctx.t(), String.t(), map()) :: result()
  def update_client_workout_log(ctx, id, attrs), do: as_client(ctx, &log_command(ctx, &1, id, attrs, :update))

  @spec update_workout_log_for_client(Ctx.t(), String.t(), String.t(), map()) :: result()
  def update_workout_log_for_client(ctx, client_id, id, attrs),
    do: as_coach(ctx, client_id, fn -> log_command(ctx, client_id, id, attrs, :update) end)

  @spec finish_client_workout_log(Ctx.t(), String.t(), map()) :: result()
  def finish_client_workout_log(ctx, id, attrs), do: as_client(ctx, &log_command(ctx, &1, id, attrs, :finish))

  @spec finish_workout_log_for_client(Ctx.t(), String.t(), String.t(), map()) :: result()
  def finish_workout_log_for_client(ctx, client_id, id, attrs),
    do: as_coach(ctx, client_id, fn -> log_command(ctx, client_id, id, attrs, :finish) end)

  @spec discard_client_workout_log(Ctx.t(), String.t()) :: result()
  def discard_client_workout_log(ctx, id), do: as_client(ctx, &log_command(ctx, &1, id, %{}, :discard))

  @spec discard_workout_log_for_client(Ctx.t(), String.t(), String.t()) :: result()
  def discard_workout_log_for_client(ctx, client_id, id),
    do: as_coach(ctx, client_id, fn -> log_command(ctx, client_id, id, %{}, :discard) end)

  @spec reopen_client_workout_log(Ctx.t(), String.t()) :: result()
  def reopen_client_workout_log(ctx, id), do: as_client(ctx, &log_command(ctx, &1, id, %{}, :reopen))

  @spec reopen_workout_log_for_client(Ctx.t(), String.t(), String.t()) :: result()
  def reopen_workout_log_for_client(ctx, client_id, id),
    do: as_coach(ctx, client_id, fn -> log_command(ctx, client_id, id, %{}, :reopen) end)

  @spec start_client_activity(Ctx.t(), String.t(), map()) :: result()
  def start_client_activity(ctx, log_id, attrs), do: as_client(ctx, &start_activity(ctx, &1, log_id, attrs))

  @spec start_activity_for_client(Ctx.t(), String.t(), String.t(), map()) :: result()
  def start_activity_for_client(ctx, client_id, log_id, attrs),
    do: as_coach(ctx, client_id, fn -> start_activity(ctx, client_id, log_id, attrs) end)

  @spec update_client_activity(Ctx.t(), String.t(), String.t(), map()) :: result()
  def update_client_activity(ctx, log_id, id, attrs),
    do: as_client(ctx, &activity_command(ctx, &1, log_id, id, attrs, :update))

  @spec update_activity_for_client(Ctx.t(), String.t(), String.t(), String.t(), map()) :: result()
  def update_activity_for_client(ctx, client_id, log_id, id, attrs),
    do: as_coach(ctx, client_id, fn -> activity_command(ctx, client_id, log_id, id, attrs, :update) end)

  @spec complete_client_activity(Ctx.t(), String.t(), String.t(), map()) :: result()
  def complete_client_activity(ctx, log_id, id, attrs \\ %{}),
    do: as_client(ctx, &activity_command(ctx, &1, log_id, id, attrs, :complete))

  @spec complete_activity_for_client(Ctx.t(), String.t(), String.t(), String.t(), map()) :: result()
  def complete_activity_for_client(ctx, client_id, log_id, id, attrs \\ %{}),
    do: as_coach(ctx, client_id, fn -> activity_command(ctx, client_id, log_id, id, attrs, :complete) end)

  @spec skip_client_activity(Ctx.t(), String.t(), String.t()) :: result()
  def skip_client_activity(ctx, log_id, id), do: as_client(ctx, &activity_command(ctx, &1, log_id, id, %{}, :skip))

  @spec skip_activity_for_client(Ctx.t(), String.t(), String.t(), String.t()) :: result()
  def skip_activity_for_client(ctx, client_id, log_id, id),
    do: as_coach(ctx, client_id, fn -> activity_command(ctx, client_id, log_id, id, %{}, :skip) end)

  @spec reopen_client_activity(Ctx.t(), String.t(), String.t()) :: result()
  def reopen_client_activity(ctx, log_id, id), do: as_client(ctx, &activity_command(ctx, &1, log_id, id, %{}, :reopen))

  @spec reopen_activity_for_client(Ctx.t(), String.t(), String.t(), String.t()) :: result()
  def reopen_activity_for_client(ctx, client_id, log_id, id),
    do: as_coach(ctx, client_id, fn -> activity_command(ctx, client_id, log_id, id, %{}, :reopen) end)

  @spec replace_client_activity(Ctx.t(), String.t(), String.t(), map()) :: result()
  def replace_client_activity(ctx, log_id, id, attrs), do: as_client(ctx, &replace_activity(ctx, &1, log_id, id, attrs))

  @spec replace_activity_for_client(Ctx.t(), String.t(), String.t(), String.t(), map()) :: result()
  def replace_activity_for_client(ctx, client_id, log_id, id, attrs),
    do: as_coach(ctx, client_id, fn -> replace_activity(ctx, client_id, log_id, id, attrs) end)

  @spec record_client_set(Ctx.t(), String.t(), String.t(), map()) :: result()
  def record_client_set(ctx, log_id, id, attrs), do: as_client(ctx, &record_set(ctx, &1, log_id, id, attrs))

  @spec record_set_for_client(Ctx.t(), String.t(), String.t(), String.t(), map()) :: result()
  def record_set_for_client(ctx, client_id, log_id, id, attrs),
    do: as_coach(ctx, client_id, fn -> record_set(ctx, client_id, log_id, id, attrs) end)

  @spec correct_client_set(Ctx.t(), String.t(), String.t(), String.t(), map()) :: result()
  def correct_client_set(ctx, log_id, activity_id, id, attrs),
    do: as_client(ctx, &correct_set(ctx, &1, log_id, activity_id, id, attrs))

  @spec correct_set_for_client(Ctx.t(), String.t(), String.t(), String.t(), String.t(), map()) :: result()
  def correct_set_for_client(ctx, client_id, log_id, activity_id, id, attrs),
    do: as_coach(ctx, client_id, fn -> correct_set(ctx, client_id, log_id, activity_id, id, attrs) end)

  @spec remove_client_set(Ctx.t(), String.t(), String.t(), String.t()) :: result()
  def remove_client_set(ctx, log_id, activity_id, id), do: as_client(ctx, &remove_set(ctx, &1, log_id, activity_id, id))

  @spec remove_set_for_client(Ctx.t(), String.t(), String.t(), String.t(), String.t()) :: result()
  def remove_set_for_client(ctx, client_id, log_id, activity_id, id),
    do: as_coach(ctx, client_id, fn -> remove_set(ctx, client_id, log_id, activity_id, id) end)

  defp as_client(ctx, operation) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx),
         {:ok, _client} <- client(ctx, client_id),
         do: operation.(client_id)
  end

  defp as_coach(ctx, client_id, operation) do
    with :ok <- Ctx.ensure_coach(ctx),
         :ok <- ClientAccess.authorize_client_id(ctx, client_id),
         do: operation.()
  end

  defp client(ctx, id, lock? \\ false) do
    query = Client.for_business(ctx.business_id) |> where([c], c.id == ^id) |> preload(:business)
    query = if lock?, do: lock(query, "FOR UPDATE"), else: query
    query |> Repo.one() |> found()
  end

  defp start_log(ctx, client_id, recorder, attrs) do
    attrs = params(attrs)

    Repo.transact(fn ->
      with {:ok, client} <- client(ctx, client_id, true),
           {:ok, id} <- create_id(attrs, WorkoutLog, false),
           {:ok, prescription} <- prescription(ctx, client_id, attrs) do
        insert_log(ctx, client, id, recorder, prescription, attrs)
      end
    end)
  end

  defp insert_log(ctx, client, id, recorder, prescription, attrs) do
    changeset =
      ctx.business_id
      |> WorkoutLog.insert_changeset(client.id, recorder, prescription, attrs, today(client))
      |> put_change(:id, id)

    with {:ok, proposed} <- apply_action(changeset, :insert) do
      case scoped_log(ctx, client.id, id, true) do
        nil -> insert_available_log(ctx, proposed, changeset)
        existing -> replay_log(ctx, existing, proposed)
      end
    end
  end

  defp insert_available_log(ctx, proposed, changeset) do
    with :ok <- available(proposed),
         {:ok, saved} <- persist(changeset, :insert),
         do: fetch_session(ctx, saved.client_id, saved.id)
  end

  defp replay_log(ctx, existing, proposed) do
    if same_fields?(WorkoutLog, existing, proposed, [:workout_id, :schedule_id, :scheduled_date]) do
      with {:ok, log} <- fetch_session(ctx, existing.client_id, existing.id), do: {:ok, %{log | replayed?: true}}
    else
      {:error, :conflict}
    end
  end

  defp read_log(ctx, client_id, id), do: Repo.snapshot(fn -> fetch_session(ctx, client_id, id) end)

  defp list_logs(ctx, client_id, opts) do
    Repo.snapshot(fn ->
      with {:ok, query} <- list_filters(WorkoutLog.for_client(ctx.business_id, client_id), opts) do
        count = Repo.aggregate(query, :count)
        limit = opts |> Keyword.get(:limit, 20) |> max(1) |> min(100)
        offset = max(Keyword.get(opts, :offset, 0), 0)

        logs =
          query
          |> order_by([l], desc: l.date, desc: l.id)
          |> limit(^limit)
          |> offset(^offset)
          |> WorkoutLog.include_content(ctx.business_id)
          |> Repo.all()
          |> enrich_logs(ctx.business_id)

        {:ok, %{count: count, workout_logs: logs}}
      end
    end)
  end

  defp list_filters(query, opts) do
    with {:ok, query} <- date_filter(query, :date, opts[:date]),
         {:ok, query} <- date_filter(query, :scheduled_date, opts[:scheduled_date]) do
      state_filter(query, opts[:state])
    end
  end

  defp date_filter(query, _field, value) when value in [nil, ""], do: {:ok, query}

  defp date_filter(query, key, value) do
    case Ecto.Type.cast(:date, value) do
      {:ok, date} -> {:ok, where(query, [l], field(l, ^key) == ^date)}
      :error -> {:error, add_error(change(%WorkoutLog{}), key, "must be a valid date")}
    end
  end

  defp state_filter(query, value) when value in [nil, ""], do: {:ok, query}

  defp state_filter(query, value) do
    case Ecto.Type.cast(WorkoutLog.__schema__(:type, :state), value) do
      {:ok, state} -> {:ok, where(query, [l], l.state == ^state)}
      _error -> {:error, add_error(change(%WorkoutLog{}), :state, "must be active, completed, or discarded")}
    end
  end

  defp in_session(ctx, client_id, id, requested_ids, operation, lock_client? \\ false) do
    Repo.transact(fn ->
      with {:ok, client} <- client(ctx, client_id, lock_client?),
           {:ok, log} <- fetch_session(ctx, client_id, id, true),
           log = %{log | client: client},
           lookup = Content.exercises_by_id(ctx.business_id, exercise_ids(log) ++ requested_ids),
           {:ok, status} <- operation.(log, lookup),
           {:ok, saved} <- fetch_session(ctx, client_id, id) do
        {:ok, %{saved | replayed?: status == :replayed}}
      end
    end)
  end

  defp log_command(ctx, client_id, id, attrs, command) do
    attrs = params(attrs)
    in_session(ctx, client_id, id, [], &apply_log_command(&1, &2, attrs, command), command == :reopen)
  end

  defp apply_log_command(log, lookup, attrs, command) do
    if log_transition_satisfied?(log, lookup, attrs, command) do
      {:ok, :unchanged}
    else
      with :ok <- reopening_available(log, command) do
        log
        |> log_changeset(lookup, attrs, command)
        |> persist(:update)
        |> changed()
      end
    end
  end

  defp log_transition_satisfied?(%{state: :completed} = log, lookup, attrs, :finish) do
    changeset = log_changeset(%{log | state: :active}, lookup, attrs, :finish)

    case apply_action(changeset, :update) do
      {:ok, proposed} -> same_fields?(WorkoutLog, log, proposed, [:date, :time, :effort, :pain, :text])
      {:error, _changeset} -> false
    end
  end

  defp log_transition_satisfied?(%{state: :discarded}, _lookup, _attrs, :discard), do: true
  defp log_transition_satisfied?(%{state: :active}, _lookup, _attrs, :reopen), do: true
  defp log_transition_satisfied?(_log, _lookup, _attrs, _command), do: false

  defp reopening_available(log, :reopen), do: available(log, log.id)
  defp reopening_available(_log, _command), do: :ok

  defp log_changeset(log, lookup, attrs, :update),
    do: WorkoutLog.update_changeset(log, attrs, today(log.client), log_prescription(log), lookup)

  defp log_changeset(log, lookup, attrs, :finish),
    do: WorkoutLog.finish_changeset(log, attrs, today(log.client), log_prescription(log), lookup)

  defp log_changeset(log, _lookup, _attrs, :discard), do: WorkoutLog.discard_changeset(log)
  defp log_changeset(log, _lookup, _attrs, :reopen), do: WorkoutLog.reopen_changeset(log)

  defp start_activity(ctx, client_id, log_id, attrs) do
    attrs = params(attrs)
    in_session(ctx, client_id, log_id, [attrs["exercise_id"]], &insert_activity(&1, &2, attrs))
  end

  defp insert_activity(log, lookup, attrs) do
    with {:ok, id} <- create_id(attrs, ExerciseLog),
         {:ok, source} <- activity_source(log, attrs["workout_exercise_id"]),
         {:ok, identity} <- activity_identity(attrs, source),
         {:ok, exercise} <- exercise(lookup, identity.exercise_id) do
      identity = %{identity | exercise_id: exercise.id}

      case Enum.find(log.exercise_logs, &(&1.id == id)) do
        nil ->
          log
          |> Recording.start_activity(exercise, recording_source(source), identity.side_mode)
          |> put_change(:id, id)
          |> persist(:insert)
          |> changed()

        existing ->
          replay_activity(existing, identity)
      end
    end
  end

  defp replay_activity(existing, identity) do
    if same_fields?(ExerciseLog, existing, identity, [:exercise_id, :workout_exercise_id, :side_mode]),
      do: {:ok, :replayed},
      else: {:error, :conflict}
  end

  defp activity_identity(attrs, source) do
    {exercise_id, entry_id, side_mode} = source_identity(attrs, source)

    %ExerciseLog{}
    |> cast(
      %{exercise_id: exercise_id, workout_exercise_id: entry_id, side_mode: side_mode},
      [:exercise_id, :workout_exercise_id, :side_mode],
      empty_values: []
    )
    |> validate_required([:exercise_id, :side_mode])
    |> apply_action(:insert)
  end

  defp source_identity(attrs, {_workout, entry}) do
    {Map.get(attrs, "exercise_id") || entry.exercise_id, entry.id, entry.side_mode}
  end

  defp source_identity(attrs, nil), do: {attrs["exercise_id"], nil, Map.get(attrs, "side_mode", :combined)}

  defp activity_source(_log, nil), do: {:ok, nil}

  defp activity_source(log, entry_id) do
    with {:ok, id} <- uuid(entry_id),
         %Workout{type: :prescribed} = workout <- log.workout,
         entry when not is_nil(entry) <- Enum.find(workout_entries(workout), &(&1.id == id)) do
      {:ok, {workout, entry}}
    else
      _ -> {:error, :not_found}
    end
  end

  defp activity_command(ctx, client_id, log_id, id, attrs, command) do
    attrs = params(attrs)
    in_session(ctx, client_id, log_id, [], &apply_activity_command(&1, &2, id, attrs, command))
  end

  defp apply_activity_command(log, lookup, id, attrs, command) do
    with {:ok, activity} <- activity(log, id),
         {:ok, exercise} <- exercise(lookup, activity.exercise_id) do
      apply_activity_transition(log, activity, exercise, attrs, command)
    end
  end

  defp apply_activity_transition(log, %{state: :completed} = activity, exercise, attrs, :complete) do
    changeset = activity_changeset(%{log | state: :active}, activity, exercise, attrs, :complete)
    fields = ExerciseLog.__schema__(:fields) -- [:inserted_at, :updated_at]

    case apply_action(changeset, :update) do
      {:ok, proposed} ->
        if same_fields?(ExerciseLog, activity, proposed, fields),
          do: {:ok, :unchanged},
          else: {:error, add_error(changeset, :state, "already completed; correct measurements with an update")}

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  defp apply_activity_transition(log, activity, exercise, attrs, command) do
    if activity_transition_satisfied?(activity, command) do
      {:ok, :unchanged}
    else
      log
      |> activity_changeset(activity, exercise, attrs, command)
      |> persist(:update)
      |> changed()
    end
  end

  defp activity_transition_satisfied?(%{state: :skipped}, :skip), do: true
  defp activity_transition_satisfied?(%{state: :active}, :reopen), do: true
  defp activity_transition_satisfied?(_activity, _command), do: false

  defp activity_changeset(log, activity, exercise, attrs, :update),
    do: Recording.update_activity(log, activity, exercise, attrs)

  defp activity_changeset(log, activity, exercise, attrs, :complete),
    do: Recording.complete_activity(log, activity, exercise, attrs)

  defp activity_changeset(log, activity, _exercise, _attrs, :skip), do: Recording.skip_activity(log, activity)
  defp activity_changeset(log, activity, _exercise, _attrs, :reopen), do: Recording.reopen_activity(log, activity)

  defp replace_activity(ctx, client_id, log_id, id, attrs) do
    attrs = params(attrs)
    in_session(ctx, client_id, log_id, [attrs["exercise_id"]], &apply_replacement(&1, &2, id, attrs))
  end

  defp apply_replacement(log, lookup, activity_id, attrs) do
    with {:ok, activity} <- activity(log, activity_id),
         {:ok, id} <- create_id(attrs, ExerciseLog),
         {:ok, exercise_id} <- uuid(attrs["exercise_id"]) do
      receipt = WorkoutReplacementReceipt.for_session(log.business_id, log.id) |> Repo.get(id)
      replace_or_replay(log, lookup, activity, id, exercise_id, receipt)
    end
  end

  defp replace_or_replay(_log, _lookup, activity, _id, exercise_id, %WorkoutReplacementReceipt{} = receipt) do
    if {receipt.source_activity_id, receipt.exercise_id} == {activity.id, exercise_id},
      do: {:ok, :replayed},
      else: {:error, :conflict}
  end

  defp replace_or_replay(log, lookup, activity, id, exercise_id, nil) do
    with {:ok, exercise} <- exercise(lookup, exercise_id),
         {:ok, source} <- activity_source(log, activity.workout_exercise_id) do
      source = recording_source(source)
      {operation, changeset} = Recording.replace_activity(log, activity, exercise, source)
      changeset = if operation == :insert, do: put_change(changeset, :id, id), else: changeset

      with {:ok, saved} <- persist(changeset, operation),
           {:ok, _receipt} <- insert_receipt(log, activity, exercise_id, saved.id, id),
           do: {:ok, :changed}
    end
  end

  defp insert_receipt(log, activity, exercise_id, result_id, id) do
    log.business_id
    |> WorkoutReplacementReceipt.insert_changeset(log.id, activity.id, exercise_id, result_id, id)
    |> persist(:insert)
  end

  defp record_set(ctx, client_id, log_id, id, attrs) do
    attrs = params(attrs)
    in_session(ctx, client_id, log_id, [], &insert_set(&1, &2, id, attrs))
  end

  defp insert_set(log, lookup, activity_id, attrs) do
    with {:ok, activity} <- activity(log, activity_id),
         {:ok, exercise} <- exercise(lookup, activity.exercise_id),
         {:ok, id} <- create_id(attrs, ExerciseSet),
         {:ok, state} <- outcome(attrs["state"]) do
      payload = Map.drop(attrs, ["id", "state"])

      case Enum.find(activity.sets, &(&1.id == id)) do
        nil ->
          log
          |> set_changeset(activity, exercise, payload, state, nil)
          |> put_change(:id, id)
          |> persist(:insert)
          |> changed()

        existing ->
          replay_set(existing, payload, state, exercise)
      end
    end
  end

  defp replay_set(existing, payload, state, exercise) do
    {slot, measurements} = Map.split(payload, ["round", "side"])
    base = change(existing, state: state)
    slot_changeset = cast(base, slot, [:round, :side], empty_values: [])
    measurement_changeset = ExerciseSet.measurements_changeset(base, measurements, exercise)
    changeset = merge(slot_changeset, measurement_changeset)

    fields = ExerciseSet.__schema__(:fields) -- @set_identity_exclusions

    cond do
      not same_fields?(ExerciseSet, existing, apply_changes(changeset), fields) -> {:error, :conflict}
      changeset.valid? -> {:ok, :replayed}
      true -> {:error, changeset}
    end
  end

  defp correct_set(ctx, client_id, log_id, activity_id, id, attrs) do
    attrs = params(attrs)
    in_session(ctx, client_id, log_id, [], &apply_set_correction(&1, &2, activity_id, id, attrs))
  end

  defp apply_set_correction(log, lookup, activity_id, id, attrs) do
    with {:ok, activity} <- activity(log, activity_id),
         {:ok, set} <- set(activity, id),
         {:ok, exercise} <- exercise(lookup, activity.exercise_id),
         {:ok, state} <- outcome(Map.get(attrs, "state", set.state)) do
      log
      |> set_changeset(activity, exercise, Map.delete(attrs, "state"), state, set)
      |> persist(:update)
      |> changed()
    end
  end

  defp set_changeset(log, activity, exercise, payload, :completed, existing),
    do: Recording.record_set(log, activity, exercise, payload, existing)

  defp set_changeset(log, activity, _exercise, payload, :skipped, existing),
    do: Recording.skip_set(log, activity, payload, existing)

  defp remove_set(ctx, client_id, log_id, activity_id, id) do
    in_session(ctx, client_id, log_id, [], fn log, _lookup ->
      with {:ok, activity} <- activity(log, activity_id),
           {:ok, id} <- uuid(id),
           do: remove_activity_set(log, activity, id)
    end)
  end

  defp remove_activity_set(log, activity, id) do
    case Enum.find(activity.sets, &(&1.id == id)) do
      nil ->
        query = from(s in ExerciseSet, where: s.business_id == ^log.business_id and s.id == ^id)
        if Repo.exists?(query), do: {:error, :not_found}, else: {:ok, :unchanged}

      set ->
        log |> Recording.remove_set(activity, set) |> Repo.delete() |> changed()
    end
  end

  defp outcome(value) do
    case Ecto.Type.cast(ExerciseSet.__schema__(:type, :state), value) do
      {:ok, state} when state in [:completed, :skipped] -> {:ok, state}
      _ -> {:error, add_error(change(%ExerciseSet{}), :state, "must be completed or skipped")}
    end
  end

  defp activity(log, id) do
    with {:ok, id} <- uuid(id), do: log.exercise_logs |> Enum.find(&(&1.id == id)) |> found()
  end

  defp set(activity, id) do
    with {:ok, id} <- uuid(id), do: activity.sets |> Enum.find(&(&1.id == id)) |> found()
  end

  defp exercise(lookup, id) do
    with {:ok, id} <- uuid(id), do: lookup |> Map.get(id) |> found()
  end

  defp prescription(ctx, client_id, attrs) do
    cond do
      attrs["schedule_id"] != nil -> scheduled_prescription(ctx, client_id, attrs)
      attrs["scheduled_date"] != nil -> {:error, add_error(change(%WorkoutLog{}), :scheduled_date, "requires a schedule")}
      attrs["workout_id"] != nil -> workout(ctx, client_id, attrs["workout_id"])
      true -> {:ok, nil}
    end
  end

  defp scheduled_prescription(ctx, client_id, attrs) do
    with {:ok, id} <- uuid(attrs["schedule_id"]),
         {:ok, schedule} <- WorkoutSchedule.for_client(ctx.business_id, client_id) |> Repo.get(id) |> found(),
         :ok <- matching_requested_workout(attrs["workout_id"], schedule.workout_id),
         {:ok, workout} <- workout(ctx, client_id, schedule.workout_id),
         {:ok, date} <- scheduled_date(attrs["scheduled_date"]) do
      {:ok, {workout, schedule, date}}
    end
  end

  defp matching_requested_workout(nil, _workout_id), do: :ok

  defp matching_requested_workout(value, workout_id) do
    if Ecto.UUID.cast(value) == {:ok, workout_id}, do: :ok, else: {:error, :not_found}
  end

  defp scheduled_date(value) do
    case Ecto.Type.cast(:date, value) do
      {:ok, date} -> {:ok, date}
      :error -> {:error, add_error(change(%WorkoutLog{}), :scheduled_date, "must be a valid date")}
    end
  end

  defp workout(ctx, client_id, id) do
    with {:ok, id} <- uuid(id) do
      Workout.for_owner(ctx.business_id, client_id)
      |> Workout.include_content(ctx.business_id)
      |> Repo.get(id)
      |> found()
    end
  end

  defp log_prescription(%{schedule_id: id} = log) when not is_nil(id),
    do: {log.workout, log.schedule, log.scheduled_date}

  defp log_prescription(%{workout_id: id} = log) when not is_nil(id), do: log.workout
  defp log_prescription(_log), do: nil

  defp recording_source(nil), do: nil
  defp recording_source({workout, entry}), do: {workout, entry.id}

  defp available(log, except_id \\ nil) do
    query = WorkoutLog.for_client(log.business_id, log.client_id)
    query = if except_id, do: where(query, [l], l.id != ^except_id), else: query
    active = Repo.exists?(where(query, [l], l.state == :active))
    claimed = claimed?(query, log)
    if active or claimed, do: {:error, :conflict}, else: :ok
  end

  defp claimed?(_query, %{schedule_id: nil}), do: false

  defp claimed?(query, log) do
    Repo.exists?(where(query, [l], l.schedule_id == ^log.schedule_id and l.scheduled_date == ^log.scheduled_date and l.state != :discarded))
  end

  defp fetch_session(ctx, client_id, id, lock? \\ false) do
    with {:ok, id} <- uuid(id),
         {:ok, log} <- scoped_log(ctx, client_id, id, lock?) |> found() do
      {:ok, enrich(log, ctx.business_id)}
    end
  end

  defp scoped_log(ctx, client_id, id, lock?) do
    query = WorkoutLog.for_client(ctx.business_id, client_id)
    query = if lock?, do: lock(query, "FOR UPDATE"), else: query
    query |> WorkoutLog.include_content(ctx.business_id) |> Repo.get(id)
  end

  defp enrich(log, business_id), do: [log] |> enrich_logs(business_id) |> hd()

  defp enrich_logs(logs, business_id) do
    workouts =
      logs
      |> Enum.map(& &1.workout)
      |> Enum.reject(&is_nil/1)
      |> Enum.uniq_by(& &1.id)
      |> Content.load_exercises(business_id)
      |> Map.new(&{&1.id, &1})

    Enum.map(logs, fn log ->
      log
      |> Map.put(:workout, Map.get(workouts, log.workout_id))
      |> WorkoutLog.put_recorder_name()
    end)
  end

  defp exercise_ids(log),
    do: Enum.map(log.exercise_logs, & &1.exercise_id) ++ Enum.map(workout_entries(log.workout), & &1.exercise_id)

  defp workout_entries(%Workout{} = workout), do: Enum.flat_map(workout.groups, & &1.exercises)
  defp workout_entries(_workout), do: []
  defp today(client), do: Client.local_date(client, DateTime.utc_now())
  defp params(attrs), do: Map.new(attrs, fn {key, value} -> {to_string(key), value} end)

  defp uuid(value) do
    case Ecto.UUID.cast(value) do
      {:ok, id} -> {:ok, id}
      :error -> {:error, :not_found}
    end
  end

  defp found(nil), do: {:error, :not_found}
  defp found(value), do: {:ok, value}
  defp changed({:ok, _value}), do: {:ok, :changed}
  defp changed({:error, reason}), do: {:error, reason}

  defp create_id(attrs, schema, required? \\ true) do
    case Map.fetch(attrs, "id") do
      {:ok, value} -> validate_create_id(value, schema)
      :error when not required? -> {:ok, Ecto.UUID.generate()}
      :error -> {:error, add_error(change(struct(schema)), :id, "is required")}
    end
  end

  defp validate_create_id(value, schema) do
    case Ecto.UUID.cast(value) do
      {:ok, id} -> {:ok, id}
      :error -> {:error, add_error(change(struct(schema)), :id, "must be a valid UUID")}
    end
  end

  defp same_fields?(schema, left, right, fields) do
    Enum.all?(fields, fn field ->
      Ecto.Type.equal?(schema.__schema__(:type, field), Map.fetch!(left, field), Map.fetch!(right, field))
    end)
  end

  defp persist(changeset, operation) do
    constraint = primary_key(changeset)
    changeset = if operation == :insert, do: unique_constraint(changeset, :id, name: constraint), else: changeset

    case apply(Repo, operation, [changeset]) do
      {:ok, row} -> {:ok, row}
      {:error, changeset} -> persistence_error(changeset)
    end
  end

  defp persistence_error(changeset) do
    names = Enum.map(changeset.errors, fn {_field, {_message, metadata}} -> metadata[:constraint_name] end)

    cond do
      primary_key(changeset) in names -> {:error, :not_found}
      Enum.any?(names, &(&1 in ["workout_logs_one_active", "workout_logs_current_occurrence"])) -> {:error, :conflict}
      true -> {:error, changeset}
    end
  end

  defp primary_key(changeset), do: changeset.data.__struct__.__schema__(:source) <> "_pkey"
end
