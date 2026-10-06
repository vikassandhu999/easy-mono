defmodule Easy.Training.History do
  import Ecto.Query

  alias Easy.ClientAccess
  alias Easy.Ctx
  alias Easy.Plans.Reader, as: PlanReader
  alias Easy.Repo
  alias Easy.Training.Execution
  alias Easy.Training.Library
  alias Easy.Training.TrainingPerformedSet
  alias Easy.Training.TrainingSession

  @spec client_occurrences(Ctx.t(), Date.t(), Date.t()) :: {:ok, [map()]} | {:error, term()}
  def client_occurrences(%Ctx{} = ctx, from, to) do
    with {:ok, id} <- Ctx.fetch_client_id(ctx), do: occurrences(ctx, id, from, to)
  end

  @spec occurrences_for_client(Ctx.t(), String.t(), Date.t(), Date.t()) :: {:ok, [map()]} | {:error, term()}
  def occurrences_for_client(%Ctx{} = ctx, id, from, to) do
    with :ok <- ClientAccess.authorize_client_id(ctx, id), do: occurrences(ctx, id, from, to)
  end

  defp occurrences(ctx, id, from, to) do
    with {:ok, from} <- PlanReader.local_date(ctx, from),
         {:ok, to} <- PlanReader.local_date(ctx, to),
         true <- Date.diff(to, from) in 0..366 || {:error, :invalid_date_range} do
      result =
        Repo.query!(
          """
            SELECT e.plan_id,e.plan_revision_id,e.schedule_entry_id,e.occurrence_date,e.workout_id,e.workout_name,
            (SELECT s.id FROM training_sessions s JOIN plan_revisions r ON r.id=s.plan_revision_id
             WHERE s.client_id=$1 AND s.business_id=$4 AND s.state='completed' AND r.plan_id=e.plan_id
             AND s.schedule_entry_id=e.schedule_entry_id AND s.occurrence_date=e.occurrence_date
             ORDER BY s.ended_at,s.id LIMIT 1) AS session_id
            FROM expected_workouts(ARRAY[$1]::uuid[],$2,$3) e JOIN plans p ON p.id=e.plan_id AND p.business_id=$4
            ORDER BY e.occurrence_date,e.schedule_entry_id
          """,
          [Ecto.UUID.dump!(id), from, to, Ecto.UUID.dump!(ctx.business_id)]
        )

      rows =
        Enum.map(result.rows, fn [plan, revision, entry, date, workout, name, session] ->
          %{
            plan_id: uuid(plan),
            plan_revision_id: uuid(revision),
            schedule_entry_id: uuid(entry),
            occurrence_date: date,
            workout_id: uuid(workout),
            workout_name: name,
            session_id: uuid(session)
          }
        end)

      extras =
        Repo.all(
          from(s in TrainingSession,
            where:
              s.business_id == ^ctx.business_id and s.client_id == ^id and s.state == :completed and
                is_nil(s.schedule_entry_id) and s.local_date >= ^from and s.local_date <= ^to,
            order_by: [desc: s.local_date, desc: s.id]
          )
        )

      {:ok, %{data: rows, extra_sessions: Enum.map(extras, &Execution.load/1)}}
    end
  end

  @spec client_exercise_history(Ctx.t(), String.t()) :: {:ok, map()} | {:error, term()}
  def client_exercise_history(%Ctx{} = ctx, exercise_id) do
    with {:ok, id} <- Ctx.fetch_client_id(ctx), do: history(ctx, id, exercise_id)
  end

  @spec exercise_history_for_client(Ctx.t(), String.t(), String.t()) :: {:ok, map()} | {:error, term()}
  def exercise_history_for_client(%Ctx{} = ctx, id, exercise_id) do
    with :ok <- ClientAccess.authorize_client_id(ctx, id), do: history(ctx, id, exercise_id)
  end

  defp history(ctx, id, exercise_id) do
    with {:ok, _} <- Library.get_exercise(ctx, exercise_id) do
      base =
        from(ps in TrainingPerformedSet,
          join: s in TrainingSession,
          on: s.id == ps.session_id,
          where:
            s.client_id == ^id and s.business_id == ^ctx.business_id and ps.business_id == ^ctx.business_id and
              ps.exercise_id == ^exercise_id and s.state == :completed and
              is_nil(ps.deleted_at)
        )

      bests =
        Repo.all(
          from([ps, s] in base,
            where: ps.kind == :working and ps.outcome == :done and not is_nil(ps.reps) and not is_nil(ps.load_kg),
            group_by: ps.reps,
            order_by: ps.reps,
            select: %{reps: ps.reps, best_kg: max(ps.load_kg)}
          )
        )

      sets =
        Repo.all(
          from([ps, s] in base,
            order_by: [desc: s.local_date, desc: ps.inserted_at, desc: ps.id],
            select: %{ps | local_date: s.local_date}
          )
        )

      {:ok,
       %{
         bests: bests,
         sets:
           sets
           |> Repo.preload(exercise: Execution.exercise_query(ctx.business_id), session: [:plan_revision])
           |> Enum.map(&history_set/1)
       }}
    end
  end

  defp history_set(set) do
    session = set.session

    prescription =
      if session.plan_revision,
        do: Enum.find(session.plan_revision.content["workouts"], &(&1["id"] == session.workout_id))

    Execution.set_name(set, prescription)
  end

  defp uuid(nil), do: nil
  defp uuid(v), do: Ecto.UUID.load!(v)
end
