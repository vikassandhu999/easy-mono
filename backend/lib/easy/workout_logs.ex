defmodule Easy.WorkoutLogs do
  import Ecto.Query
  import Ecto.Changeset
  alias Easy.Clients.Client
  alias Easy.{Ctx, Repo}
  alias Easy.Workouts.{Exercise, ExerciseSet, Timing, Workout, WorkoutLog, WorkoutSchedule}
  @type result :: {:ok, term()} | {:error, atom() | Ecto.Changeset.t()}
  @salt "client workout log undo"

  @spec start_client_workout_log(Ctx.t(), map()) :: result()
  def start_client_workout_log(ctx, attrs), do: write(ctx, &start(ctx, &1, encode(attrs)))

  defp start(ctx, client, attrs) do
    cs = WorkoutLog.insert_changeset(ctx.business_id, ctx.user_id, client.id, DateTime.utc_now(:second), attrs)

    with {:ok, log} <- apply_action(cs, :insert),
         :ok <- record_date(log.date, client),
         {:ok, workout, schedule, date} <- prescription(ctx, client, attrs),
         :ok <- available(ctx, client.id, schedule, date),
         {:ok, row} <-
           cs
           |> put_change(:workout_id, if(workout, do: workout.id))
           |> put_change(:schedule_id, if(schedule, do: schedule.id))
           |> put_change(:scheduled_date, date)
           |> Repo.insert() do
      get(ctx, row.id)
    end
  end

  @spec get_client_workout_log(Ctx.t(), String.t()) :: result()
  def get_client_workout_log(ctx, id), do: with({:ok, _} <- client(ctx), do: get(ctx, id))

  @spec list_client_workout_logs(Ctx.t(), keyword()) :: result()
  def list_client_workout_logs(ctx, opts \\ []) do
    with {:ok, client} <- client(ctx) do
      query = WorkoutLog.for_client(ctx.business_id, client.id)
      query = if opts[:date], do: where(query, [l], l.date == ^opts[:date]), else: query
      limit = opts |> Keyword.get(:limit, 20) |> min(100) |> max(1)
      rows = query |> WorkoutLog.include_content(ctx.business_id) |> order_by([l], desc: l.date, desc: l.id) |> limit(^limit) |> offset(^(opts[:offset] || 0)) |> Repo.all()
      {:ok, %{count: Repo.aggregate(query, :count), workout_logs: rows}}
    end
  end

  @spec update_client_workout_log(Ctx.t(), String.t(), map()) :: result()
  def update_client_workout_log(ctx, id, attrs), do: mutate(ctx, id, &update(ctx, &1, attrs, :active))

  @spec finish_client_workout_log(Ctx.t(), String.t(), map()) :: result()
  def finish_client_workout_log(ctx, id, attrs), do: mutate(ctx, id, &update(ctx, &1, attrs, :completed))

  @spec discard_client_workout_log(Ctx.t(), String.t(), map()) :: result()
  def discard_client_workout_log(ctx, id, _attrs \\ %{}), do: mutate(ctx, id, &transition(&1, :active, :discarded))

  @spec reopen_client_workout_log(Ctx.t(), String.t(), map()) :: result()
  def reopen_client_workout_log(ctx, id, _attrs \\ %{}) do
    mutate(ctx, id, fn row ->
      with :ok <- available(ctx, row.client_id, row.schedule, row.scheduled_date, row.id), do: transition(row, :completed, :active)
    end)
  end

  @spec delete_client_workout_log(Ctx.t(), String.t(), map()) :: result()
  def delete_client_workout_log(ctx, id, _attrs \\ %{}) do
    write(ctx, fn _ ->
      with {:ok, row} <- get(ctx, id),
           {:ok, _} <- Repo.delete(row) do
        {:ok, %{undo_token: token(ctx, snapshot(row), nil)}}
      end
    end)
  end

  @spec restore_client_workout_log(Ctx.t(), map()) :: result()
  def restore_client_workout_log(ctx, attrs) do
    write(ctx, fn _ ->
      with token when is_binary(token) <- encode(attrs)["undo_token"],
           {:ok, payload} <- Phoenix.Token.decrypt(EasyWeb.Endpoint, @salt, token, max_age: 86_400),
           true <- payload.business_id == ctx.business_id && payload.client_id == ctx.client_id,
           {:ok, current} <- current(ctx, payload.before.log.id),
           true <- fingerprint(current) == payload.after,
           true <- fingerprint(reference_snapshot(ctx, payload.before.log)) == payload.references,
           :ok <- restore_references(ctx, payload.before),
           :ok <- restore_available(ctx, payload.before.log),
           {:ok, row} <- restore_snapshot(ctx, payload.before, current) do
        {:ok, row}
      else
        _ -> {:error, :conflict}
      end
    end)
  end

  defp restore_available(_, %{state: :discarded}), do: :ok

  defp restore_available(ctx, log),
    do: available(ctx, ctx.client_id, log.schedule_id, log.scheduled_date, log.id, log.state == :active)

  defp mutate(ctx, id, operation) do
    write(ctx, fn _ ->
      with {:ok, before} <- get(ctx, id),
           {:ok, after_row} <- operation.(before) do
        {:ok, %{data: after_row, undo_token: token(ctx, snapshot(before), snapshot(after_row))}}
      end
    end)
  end

  defp update(ctx, row, attrs, state) do
    attrs = encode(attrs)

    with true <- row.state == :active || {:error, :conflict},
         {:ok, swaps} <- swaps(ctx, row, Map.get(attrs, "swaps", wire_swaps(row))),
         cs = row |> WorkoutLog.update_changeset(attrs) |> put_change(:state, state) |> put_change(:swaps, swaps),
         cs = if(state == :completed, do: validate_required(cs, [:difficulty, :pain]), else: cs),
         {:ok, saved} <- Repo.update(cs),
         :ok <- replace_sets(ctx, saved, Map.get(attrs, "sets", Enum.map(row.sets, &wire_set/1)), row.sets) do
      get(ctx, row.id)
    end
  end

  defp transition(row, from, to) do
    if row.state == from, do: row |> WorkoutLog.update_changeset(%{}) |> put_change(:state, to) |> Repo.update(), else: {:error, :conflict}
  end

  defp prescription(ctx, client, attrs) do
    case attrs["schedule_id"] do
      nil ->
        with true <- is_nil(attrs["scheduled_date"]) || {:error, :invalid_prescription},
             {:ok, workout} <- owned_workout(ctx, attrs["workout_id"]) do
          {:ok, workout, nil, nil}
        end

      id ->
        with {:ok, schedule} <- WorkoutSchedule.for_client(ctx.business_id, client.id) |> Repo.get(id) |> found(),
             true <- is_nil(schedule.coach_id) || {:error, :forbidden},
             {:ok, date} <- occurrence_date(attrs["scheduled_date"]),
             :ok <- record_date(date, client),
             true <- Timing.applies?(schedule, date) || {:error, :invalid_prescription},
             true <- is_nil(attrs["workout_id"]) || attrs["workout_id"] == schedule.workout_id || {:error, :invalid_prescription},
             {:ok, workout} <- owned_workout(ctx, schedule.workout_id),
             do: {:ok, workout, schedule, date}
    end
  end

  defp occurrence_date(value) when is_binary(value) do
    case Date.from_iso8601(value) do
      {:ok, date} -> {:ok, date}
      _ -> {:error, :invalid_prescription}
    end
  end

  defp occurrence_date(_), do: {:error, :invalid_prescription}

  defp owned_workout(_, nil), do: {:ok, nil}
  defp owned_workout(ctx, id), do: Workout.for_owner(ctx.business_id, ctx.client_id) |> Workout.include_content(ctx.business_id) |> Repo.get(id) |> found()

  defp available(ctx, client_id, schedule, date, except \\ nil, require_active_slot \\ true) do
    schedule_id = if is_map(schedule), do: schedule.id, else: schedule
    rows = WorkoutLog.for_client(ctx.business_id, client_id)
    rows = if except, do: where(rows, [l], l.id != ^except), else: rows
    active = require_active_slot && Repo.exists?(where(rows, [l], l.state == :active))
    claimed = schedule_id && Repo.exists?(where(rows, [l], l.schedule_id == ^schedule_id and l.scheduled_date == ^date and l.state != :discarded))
    if active || claimed, do: {:error, :conflict}, else: :ok
  end

  defp swaps(ctx, row, desired) when is_map(desired) do
    prescribed = prescribed(row)

    Enum.reduce_while(desired, {:ok, %{}}, fn {id, exercise_id}, {:ok, acc} ->
      with true <- Map.has_key?(prescribed, id) || {:error, :invalid_prescription},
           {:ok, snapshot} <- swap_snapshot(ctx, row.swaps[id], exercise_id) do
        {:cont, {:ok, Map.put(acc, id, snapshot)}}
      else
        error -> {:halt, error}
      end
    end)
  end

  defp swaps(_, _, _), do: {:error, :invalid_prescription}
  defp swap_snapshot(_ctx, %{"id" => id} = snapshot, id), do: {:ok, snapshot}

  defp swap_snapshot(_, _, id) when not is_binary(id), do: {:error, :invalid_set}
  defp swap_snapshot(ctx, _, id), do: with({:ok, exercise} <- Exercise.visible(ctx.business_id) |> Repo.get(id) |> found(), do: {:ok, exercise_snapshot(exercise)})

  defp replace_sets(ctx, row, desired, old) when is_list(desired) and length(desired) <= 1_000 do
    prescribed = prescribed(row)

    result =
      Enum.reduce_while(desired, {:ok, []}, fn attrs, {:ok, ids} ->
        with {:ok, set} <- persist_set(ctx, row, prescribed, old, attrs),
             true <- set.id not in ids || {:error, :invalid_set} do
          {:cont, {:ok, [set.id | ids]}}
        else
          error -> {:halt, error}
        end
      end)

    with {:ok, ids} <- result do
      Repo.delete_all(from(s in ExerciseSet, where: s.business_id == ^ctx.business_id and s.workout_log_id == ^row.id and s.id not in ^ids))
      :ok
    end
  end

  defp replace_sets(_, _, _, _), do: {:error, :invalid_set}

  defp persist_set(ctx, row, prescribed, old, attrs) when is_map(attrs) do
    prior = Enum.find(old, &(&1.id == attrs["id"]))

    with true <- is_nil(attrs["id"]) || not is_nil(prior) || {:error, :invalid_set},
         {:ok, snapshot} <- set_snapshot(ctx, row, prescribed, attrs, prior) do
      prior = prior || matching_set(old, attrs)
      attrs = complete_set_values(attrs)
      cs = set_changeset(ctx, row, prior, snapshot, attrs)
      persist_set_changeset(cs, prior)
    end
  end

  defp persist_set(_, _, _, _, _), do: {:error, :invalid_set}
  defp persist_set_changeset(%{valid?: false} = cs, _), do: {:error, cs}
  defp persist_set_changeset(cs, nil), do: Repo.insert(cs)
  defp persist_set_changeset(cs, _prior), do: Repo.update(cs)

  defp complete_set_values(attrs) do
    empty = Map.new(ExerciseSet.metric_fields(), &{to_string(&1), nil})
    empty |> Map.merge(%{"side" => nil, "entered_units" => %{}}) |> Map.merge(attrs)
  end

  defp set_changeset(ctx, row, nil, snapshot, attrs),
    do: ExerciseSet.insert_changeset(ctx.business_id, row.id, attrs["workout_exercise_id"], attrs["exercise_id"], snapshot, attrs)

  defp set_changeset(ctx, row, prior, snapshot, attrs) do
    prior
    |> change(%{
      business_id: ctx.business_id,
      workout_log_id: row.id,
      workout_exercise_id: attrs["workout_exercise_id"],
      exercise_id: attrs["exercise_id"],
      exercise_snapshot: snapshot
    })
    |> ExerciseSet.update_changeset(attrs)
  end

  defp matching_set(old, attrs),
    do:
      Enum.find(
        old,
        &(&1.workout_exercise_id && &1.workout_exercise_id == attrs["workout_exercise_id"] && &1.round == attrs["round"] &&
            to_string(&1.side || "") == to_string(attrs["side"] || ""))
      )

  defp set_snapshot(ctx, row, prescribed, attrs, prior) do
    case attrs["workout_exercise_id"] do
      nil ->
        if prior && prior.exercise_id == attrs["exercise_id"] do
          {:ok, prior.exercise_snapshot}
        else
          swap_snapshot(ctx, nil, attrs["exercise_id"])
        end

      id ->
        with {:ok, item} <- Map.get(prescribed, id) |> found(),
             snapshot = row.swaps[id] || item.exercise_snapshot,
             true <- snapshot["id"] == attrs["exercise_id"] || {:error, :invalid_set},
             do: {:ok, snapshot}
    end
  end

  defp prescribed(%{workout: nil}), do: %{}
  defp prescribed(row), do: row.workout.groups |> Enum.flat_map(& &1.exercises) |> Map.new(&{&1.id, &1})
  defp record_date(date, client), do: if(Date.after?(date, Client.local_date(client, DateTime.utc_now())), do: {:error, :future_date}, else: :ok)

  defp client(%Ctx{coach_id: nil, client_id: id} = ctx) when is_binary(id), do: Client.for_business(ctx.business_id) |> Repo.get(id) |> found()
  defp client(_), do: {:error, :not_found}

  defp write(ctx, operation) do
    with {:ok, _} <- client(ctx) do
      Repo.transact(fn ->
        client = Client.for_business(ctx.business_id) |> where([c], c.id == ^ctx.client_id) |> lock("FOR UPDATE") |> preload(:business) |> Repo.one()
        operation.(client)
      end)
    end
  end

  defp get(ctx, id) do
    case Ecto.UUID.cast(id) do
      {:ok, uuid} ->
        WorkoutLog.for_client(ctx.business_id, ctx.client_id)
        |> WorkoutLog.include_content(ctx.business_id)
        |> preload(:schedule)
        |> Repo.get(uuid)
        |> found()

      _ ->
        {:error, :not_found}
    end
  end

  defp current(ctx, id) do
    case get(ctx, id) do
      {:ok, row} -> {:ok, snapshot(row)}
      {:error, :not_found} -> {:ok, nil}
    end
  end

  defp token(ctx, before, after_snapshot) do
    payload = %{
      business_id: ctx.business_id,
      client_id: ctx.client_id,
      before: before,
      after: fingerprint(after_snapshot),
      references: fingerprint(reference_snapshot(ctx, before.log))
    }

    Phoenix.Token.encrypt(EasyWeb.Endpoint, @salt, payload)
  end

  defp reference_snapshot(ctx, log) do
    workout = if log.workout_id, do: Workout.for_owner(ctx.business_id, ctx.client_id) |> Workout.include_content(ctx.business_id) |> Repo.get(log.workout_id)
    schedule = if log.schedule_id, do: WorkoutSchedule.for_client(ctx.business_id, ctx.client_id) |> Repo.get(log.schedule_id)
    %{workout: workout_reference(workout), schedule: schedule_reference(schedule)}
  end

  defp schedule_reference(nil), do: nil
  defp schedule_reference(schedule), do: Map.take(schedule, [:id, :workout_id, :weekdays_mask, :from_date, :time, :place, :meeting_url, :coach_id])

  defp workout_reference(nil), do: nil

  defp workout_reference(workout) do
    groups =
      Enum.map(workout.groups, fn group ->
        items = Enum.map(group.exercises, &Map.take(&1, [:id, :exercise_id, :targets_mode, :targets, :rest, :exercise_snapshot, :position]))
        group |> Map.take([:id, :name, :rounds, :position]) |> Map.put(:exercises, items)
      end)

    workout |> Map.take([:id, :name, :description, :type, :video]) |> Map.put(:groups, groups)
  end

  defp fingerprint(row), do: :crypto.hash(:sha256, :erlang.term_to_binary(row))
  defp snapshot(row), do: %{log: Map.take(row, WorkoutLog.__schema__(:fields)), sets: Enum.map(row.sets, &Map.take(&1, ExerciseSet.__schema__(:fields)))}

  defp restore_references(ctx, before) do
    with {:ok, _} <- owned_workout(ctx, before.log.workout_id),
         true <- valid_restored_occurrence?(ctx, before.log),
         true <- Enum.all?(before.sets, fn s -> Repo.exists?(Exercise.visible(ctx.business_id) |> where([e], e.id == ^s.exercise_id)) end),
         do: :ok
  end

  defp valid_restored_occurrence?(_, %{schedule_id: nil}), do: true

  defp valid_restored_occurrence?(ctx, log) do
    case WorkoutSchedule.for_client(ctx.business_id, ctx.client_id) |> Repo.get(log.schedule_id) do
      nil -> false
      schedule -> schedule.workout_id == log.workout_id and Timing.applies?(schedule, log.scheduled_date)
    end
  end

  defp restore_snapshot(ctx, before, current) do
    if current, do: Repo.delete_all(from(s in ExerciseSet, where: s.workout_log_id == ^before.log.id and s.business_id == ^ctx.business_id))
    log = struct(WorkoutLog, before.log)
    result = if current, do: Repo.update(change(struct(WorkoutLog, current.log), before.log)), else: Repo.insert(log)
    with {:ok, _} <- result, {:ok, _} <- Easy.Result.traverse(before.sets, &Repo.insert(struct(ExerciseSet, &1))), do: get(ctx, log.id)
  end

  @spec present(WorkoutLog.t()) :: map()
  def present(row) do
    row
    |> Map.take([:id, :date, :time, :at_utc, :text, :recorded_by, :state, :difficulty, :pain, :pain_note, :workout_id, :schedule_id, :scheduled_date, :inserted_at, :updated_at])
    |> Map.put(:swaps, wire_swaps(row))
    |> Map.put(:time, if(row.time, do: row.time |> Time.to_iso8601() |> String.slice(0, 5)))
    |> Map.put(:swap_exercises, row.swaps)
    |> Map.put(:sets, Enum.map(row.sets, &present_set/1))
  end

  defp wire_swaps(row), do: Map.new(row.swaps, fn {id, exercise} -> {id, exercise["id"]} end)
  defp wire_set(row), do: row |> Map.take([:id, :workout_exercise_id, :exercise_id, :round, :side, :entered_units] ++ ExerciseSet.metric_fields()) |> encode()

  defp present_set(row),
    do:
      Map.put(
        row
        |> Map.take([:id, :workout_exercise_id, :exercise_id, :round, :side, :entered_units] ++ ExerciseSet.metric_fields())
        |> Map.new(fn {k, v} -> {k, if(match?(%Decimal{}, v), do: Decimal.to_float(v), else: v)} end),
        :exercise,
        row.exercise_snapshot
      )

  defp exercise_snapshot(row),
    do:
      row
      |> Map.take([:id, :name, :kind, :goals, :places, :metrics, :count_label, :grade_scale, :unilateral, :equipment, :muscles, :media])
      |> Map.put(:is_builtin, is_nil(row.business_id))
      |> encode()

  defp found(nil), do: {:error, :not_found}
  defp found(row), do: {:ok, row}
  defp encode(value), do: value |> Jason.encode!() |> Jason.decode!()
end
