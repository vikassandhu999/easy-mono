defmodule Easy.Workouts.Undo do
  import Ecto.Query
  alias Easy.{Ctx, Repo}
  alias Easy.Orgs.Coach
  alias Easy.Workouts.{Exercise, ExerciseGroup, Workout, WorkoutExercise, WorkoutLog, WorkoutSchedule}
  @schemas [Workout, ExerciseGroup, WorkoutExercise, WorkoutSchedule]
  @salt "client workout undo"
  @spec snapshot(Ctx.t(), String.t()) :: map()
  def snapshot(ctx, client_id) do
    Map.new(@schemas, fn schema ->
      rows = query(schema, ctx, client_id) |> order_by([r], asc: r.id) |> Repo.all()
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

      Enum.each(Enum.reverse(@schemas), fn schema ->
        ids = retained[schema]
        Repo.delete_all(from(r in query(schema, ctx, client_id), where: r.id not in ^ids))
      end)

      Enum.each(@schemas, fn schema ->
        fields = schema.__schema__(:fields) -- [:id]
        Repo.insert_all(schema, payload.before[schema], on_conflict: {:replace, fields}, conflict_target: [:id])
      end)

      {:ok, :restored}
    else
      _ -> {:error, :conflict}
    end
  end

  defp retained_ids(ctx, client_id) do
    logs = WorkoutLog.for_client(ctx.business_id, client_id) |> order_by([l], asc: l.id) |> Repo.all()
    workout_ids = logs |> Enum.map(& &1.workout_id) |> Enum.reject(&is_nil/1)
    schedule_ids = logs |> Enum.map(& &1.schedule_id) |> Enum.reject(&is_nil/1)
    groups = query(ExerciseGroup, ctx, client_id) |> where([g], g.workout_id in ^workout_ids) |> order_by([g], asc: g.id) |> Repo.all()
    group_ids = Enum.map(groups, & &1.id)
    item_ids = query(WorkoutExercise, ctx, client_id) |> where([e], e.exercise_group_id in ^group_ids) |> order_by([e], asc: e.id) |> select([e], e.id) |> Repo.all()
    %{Workout => workout_ids, WorkoutSchedule => schedule_ids, ExerciseGroup => group_ids, WorkoutExercise => item_ids}
  end

  defp preserves_logs?(ctx, client_id, before) do
    current = snapshot(ctx, client_id)
    logs = WorkoutLog.for_client(ctx.business_id, client_id) |> order_by([l], asc: l.id) |> Repo.all()

    Enum.all?(logs, fn log ->
      same_workout?(before, current, log.workout_id) and
        same_row?(before[WorkoutSchedule], current[WorkoutSchedule], log.schedule_id, [:until_date])
    end)
  end

  defp same_workout?(_, _, nil), do: true

  defp same_workout?(before, current, id) do
    before_groups = Enum.filter(before[ExerciseGroup], &(&1.workout_id == id))
    current_groups = Enum.filter(current[ExerciseGroup], &(&1.workout_id == id))
    group_ids = Enum.map(before_groups, & &1.id)
    before_items = Enum.filter(before[WorkoutExercise], &(&1.exercise_group_id in group_ids))
    current_items = Enum.filter(current[WorkoutExercise], &(&1.exercise_group_id in group_ids))

    same_groups = content_rows(before_groups) == content_rows(current_groups)
    same_items = content_rows(before_items) == content_rows(current_items)
    same_row?(before[Workout], current[Workout], id, [:archived_at]) and same_groups and same_items
  end

  defp same_row?(_, _, nil, _), do: true

  defp same_row?(before, current, id, ignored) do
    old = Enum.find(before, &(&1.id == id))
    new = Enum.find(current, &(&1.id == id))
    old && new && Map.drop(old, ignored ++ [:updated_at]) == Map.drop(new, ignored ++ [:updated_at])
  end

  defp content_rows(rows), do: Enum.map(rows, &Map.drop(&1, [:inserted_at, :updated_at]))

  defp lock_references(ctx, before) do
    exercises = before[WorkoutExercise] |> Enum.map(& &1.exercise_id) |> Enum.uniq()
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

  defp query(ExerciseGroup, ctx, client_id) do
    from(g in ExerciseGroup,
      join: w in Workout,
      on: w.id == g.workout_id and w.business_id == g.business_id,
      where: g.business_id == ^ctx.business_id and w.client_id == ^client_id
    )
  end

  defp query(WorkoutExercise, ctx, client_id) do
    from(e in WorkoutExercise,
      join: g in ExerciseGroup,
      on: g.id == e.exercise_group_id and g.business_id == e.business_id,
      join: w in Workout,
      on: w.id == g.workout_id and w.business_id == g.business_id,
      where: e.business_id == ^ctx.business_id and w.client_id == ^client_id
    )
  end

  defp query(Workout, ctx, client_id), do: Workout.for_owner(ctx.business_id, client_id)
  defp query(WorkoutSchedule, ctx, client_id), do: WorkoutSchedule.for_client(ctx.business_id, client_id)
end
