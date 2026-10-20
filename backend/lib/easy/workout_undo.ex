defmodule Easy.Workouts.Undo do
  import Ecto.Query
  alias Easy.{Ctx, Repo}
  alias Easy.Orgs.Coach
  alias Easy.Workouts.{Content, Exercise, Workout, WorkoutExerciseReference, WorkoutLog, WorkoutSchedule}
  @schemas [Workout, WorkoutExerciseReference, WorkoutSchedule]
  @salt "client workout undo"
  @spec snapshot(Ctx.t(), String.t()) :: map()
  def snapshot(ctx, client_id) do
    Map.new(@schemas, fn schema ->
      rows = query(schema, ctx, client_id) |> order_by(^primary_keys(schema)) |> Repo.all()
      {schema, Enum.map(rows, &Map.take(&1, schema.__schema__(:fields)))}
    end)
  end

  @spec token(Ctx.t(), String.t(), map(), Date.t()) :: String.t()
  def token(ctx, client_id, before, today) do
    payload = %{
      business_id: ctx.business_id,
      client_id: client_id,
      before: before,
      today: today,
      after: fingerprint(snapshot(ctx, client_id))
    }

    Phoenix.Token.encrypt(EasyWeb.Endpoint, @salt, payload)
  end

  @spec restore(Ctx.t(), String.t(), String.t(), Date.t()) :: {:ok, :restored} | {:error, :conflict}
  def restore(ctx, client_id, token, today) do
    with {:ok, payload} <- Phoenix.Token.decrypt(EasyWeb.Endpoint, @salt, token, max_age: 86_400),
         true <- payload.business_id == ctx.business_id and payload.client_id == client_id,
         true <- payload.today == today,
         true <- payload.after == fingerprint(snapshot(ctx, client_id)),
         true <- lock_references(ctx, payload.before),
         true <- preserves_logs?(ctx, client_id, payload.before) do
      retained = retained_ids(ctx, client_id)

      Enum.each(Enum.reverse(@schemas), &delete_unretained(&1, ctx, client_id, retained))

      Enum.each(@schemas, &restore_rows(&1, payload.before[&1]))

      query(Workout, ctx, client_id) |> Repo.all() |> Enum.each(&Content.sync_references/1)
      {:ok, :restored}
    else
      _ -> {:error, :conflict}
    end
  end

  defp delete_unretained(WorkoutExerciseReference, ctx, client_id, retained) do
    query(WorkoutExerciseReference, ctx, client_id)
    |> where([r], r.workout_id not in ^retained[Workout])
    |> Repo.delete_all()
  end

  defp delete_unretained(schema, ctx, client_id, retained) do
    query(schema, ctx, client_id)
    |> where([r], r.id not in ^retained[schema])
    |> Repo.delete_all()
  end

  defp restore_rows(WorkoutExerciseReference, rows) do
    Repo.insert_all(WorkoutExerciseReference, rows,
      on_conflict: :nothing,
      conflict_target: [:workout_id, :exercise_id]
    )
  end

  defp restore_rows(schema, rows) do
    fields = schema.__schema__(:fields) -- [:id]
    Repo.insert_all(schema, rows, on_conflict: {:replace, fields}, conflict_target: [:id])
  end

  defp retained_ids(ctx, client_id) do
    logs = WorkoutLog.for_client(ctx.business_id, client_id) |> order_by([l], asc: l.id) |> Repo.all()
    workout_ids = logs |> Enum.map(& &1.workout_id) |> Enum.reject(&is_nil/1)
    schedule_ids = logs |> Enum.map(& &1.schedule_id) |> Enum.reject(&is_nil/1)
    %{Workout => workout_ids, WorkoutSchedule => schedule_ids}
  end

  defp preserves_logs?(ctx, client_id, before) do
    current = snapshot(ctx, client_id)
    logs = WorkoutLog.for_client(ctx.business_id, client_id) |> order_by([l], asc: l.id) |> Repo.all()

    Enum.all?(logs, fn log ->
      same_workout?(before, current, log.workout_id) and
        same_row?(before[WorkoutSchedule], current[WorkoutSchedule], log.schedule_id, [:until_date])
    end)
  end

  defp same_workout?(before, current, id),
    do: same_row?(before[Workout], current[Workout], id, [:archived_at])

  defp same_row?(_, _, nil, _), do: true

  defp same_row?(before, current, id, ignored) do
    old = Enum.find(before, &(&1.id == id))
    new = Enum.find(current, &(&1.id == id))
    old && new && Map.drop(old, ignored ++ [:updated_at]) == Map.drop(new, ignored ++ [:updated_at])
  end

  defp lock_references(ctx, before) do
    exercises =
      before[Workout]
      |> Enum.flat_map(& &1.groups)
      |> Enum.flat_map(& &1.exercises)
      |> Enum.map(& &1.exercise_id)
      |> Enum.uniq()

    coaches = before[WorkoutSchedule] |> Enum.map(& &1.coach_id) |> Enum.reject(&is_nil/1) |> Enum.uniq()

    existing_exercises =
      Exercise.visible(ctx.business_id)
      |> where([e], e.id in ^exercises)
      |> order_by([e], asc: e.id)
      |> lock("FOR KEY SHARE")
      |> select([e], e.id)
      |> Repo.all()

    existing_coaches =
      Coach.for_business(ctx.business_id)
      |> where([c], c.id in ^coaches)
      |> order_by([c], asc: c.id)
      |> lock("FOR KEY SHARE")
      |> select([c], c.id)
      |> Repo.all()

    length(existing_exercises) == length(exercises) and length(existing_coaches) == length(coaches)
  end

  defp fingerprint(rows), do: :crypto.hash(:sha256, :erlang.term_to_binary(rows))

  defp primary_keys(WorkoutExerciseReference), do: [:workout_id, :exercise_id]
  defp primary_keys(_schema), do: [:id]

  defp query(WorkoutExerciseReference, ctx, client_id) do
    from(r in WorkoutExerciseReference,
      join: w in Workout,
      on: w.id == r.workout_id and w.business_id == r.business_id,
      where: r.business_id == ^ctx.business_id and w.client_id == ^client_id
    )
  end

  defp query(Workout, ctx, client_id), do: Workout.for_owner(ctx.business_id, client_id)
  defp query(WorkoutSchedule, ctx, client_id), do: WorkoutSchedule.for_client(ctx.business_id, client_id)
end
