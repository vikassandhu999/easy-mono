defmodule Easy.Workouts.Undo do
  import Ecto.Query
  alias Easy.{Ctx, Repo}
  alias Easy.Orgs.Coach
  alias Easy.Workouts.{Exercise, ExerciseGroup, Workout, WorkoutExercise, WorkoutSchedule}
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
         true <- lock_references(ctx, payload.before) do
      Enum.each(Enum.reverse(@schemas), fn schema -> Repo.delete_all(query(schema, ctx, client_id)) end)
      Enum.each(@schemas, fn schema -> Repo.insert_all(schema, payload.before[schema]) end)
      {:ok, :restored}
    else
      _ -> {:error, :conflict}
    end
  end

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
