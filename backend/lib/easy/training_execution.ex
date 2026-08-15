defmodule Easy.Training.Execution do
  alias Easy.Ctx
  alias Easy.Repo
  alias Easy.Training.{PlannedSet, Programming, TrainingExercise, TrainingPerformedSet, TrainingSession}

  import Ecto.Query

  @snapshot_version 1
  @active_session_constraint "training_sessions_one_active_client_index"

  @spec start_client_session(Ctx.t(), String.t() | nil, map()) ::
          {:ok, TrainingSession.t()} | {:error, :not_found | :conflict | Ecto.Changeset.t()}
  def start_client_session(%Ctx{} = ctx, workout_id, attrs) do
    started_at = DateTime.utc_now(:second)
    date = DateTime.to_date(started_at)

    with {:ok, client_id} <- Ctx.fetch_client_id(ctx),
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

  @spec create_client_performed_set(Ctx.t(), String.t(), map()) ::
          {:ok, TrainingPerformedSet.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_client_performed_set(%Ctx{} = ctx, session_id, attrs) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      Repo.transaction(fn -> create_performed_set(ctx.business_id, client_id, session_id, attrs) end)
    end
  end

  @spec update_client_performed_set(Ctx.t(), String.t(), map()) ::
          {:ok, TrainingPerformedSet.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_client_performed_set(%Ctx{} = ctx, set_id, attrs) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      mutate_client_active_performed_set(ctx.business_id, client_id, set_id, fn set ->
        set
        |> TrainingPerformedSet.update_changeset(attrs)
        |> Repo.update()
      end)
    end
  end

  @spec delete_client_performed_set(Ctx.t(), String.t()) ::
          {:ok, TrainingPerformedSet.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_client_performed_set(%Ctx{} = ctx, set_id) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      mutate_client_active_performed_set(ctx.business_id, client_id, set_id, &Repo.delete/1)
    end
  end

  defp lock_client_active_session(business_id, client_id, session_id) do
    TrainingSession
    |> TrainingSession.for_client(business_id, client_id)
    |> TrainingSession.for_state(:active)
    |> lock("FOR UPDATE")
    |> Repo.get(session_id)
    |> ok_or_not_found()
  end

  defp create_performed_set(business_id, client_id, session_id, attrs) do
    with {:ok, session} <- lock_client_active_session(business_id, client_id, session_id),
         {:ok, exercise} <- fetch_visible_exercise(business_id, Map.get(attrs, :exercise_id)),
         {:ok, set} <- insert_performed_set(session, attrs, exercise) do
      set
    else
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp fetch_visible_exercise(_business_id, nil), do: {:ok, nil}

  defp fetch_visible_exercise(business_id, exercise_id) do
    TrainingExercise
    |> TrainingExercise.for_business_or_system(business_id)
    |> Repo.get(exercise_id)
    |> ok_or_not_found()
  end

  defp fetch_client_active_performed_set(business_id, client_id, set_id) do
    active_session_ids =
      TrainingSession
      |> TrainingSession.for_client(business_id, client_id)
      |> TrainingSession.for_state(:active)
      |> select([session], session.id)

    TrainingPerformedSet
    |> TrainingPerformedSet.for_business(business_id)
    |> where([set], set.training_session_id in subquery(active_session_ids))
    |> TrainingPerformedSet.include_exercise(business_id)
    |> lock("FOR UPDATE")
    |> Repo.get(set_id)
    |> ok_or_not_found()
  end

  defp mutate_client_active_performed_set(business_id, client_id, set_id, mutation) do
    Repo.transaction(fn ->
      with {:ok, set} <- fetch_client_active_performed_set(business_id, client_id, set_id),
           {:ok, _session} <- lock_client_active_session(business_id, client_id, set.training_session_id),
           {:ok, updated_set} <- mutation.(set) do
        updated_set
      else
        {:error, reason} -> Repo.rollback(reason)
      end
    end)
  end

  defp insert_performed_set(session, attrs, exercise) do
    position =
      TrainingPerformedSet
      |> TrainingPerformedSet.for_business(session.business_id)
      |> TrainingPerformedSet.for_session(session.id)
      |> select([set], max(set.position))
      |> Repo.one()
      |> then(&((&1 || -1) + 1))

    attrs = if exercise, do: Map.put(attrs, :exercise_name, exercise.name), else: attrs

    session.business_id
    |> TrainingPerformedSet.insert_changeset(session.id, position, attrs)
    |> validate_snapshot_reference(session)
    |> Repo.insert()
    |> case do
      {:ok, set} -> {:ok, %{set | exercise: exercise}}
      error -> error
    end
  end

  defp validate_snapshot_reference(changeset, session) do
    reference = Ecto.Changeset.get_field(changeset, :snapshot_exercise_ref)

    references =
      session.prescription_snapshot
      |> get_in(["workout", "exercises"])
      |> List.wrap()
      |> Enum.map(&Map.get(&1, "ref"))

    if is_nil(reference) or reference in references do
      changeset
    else
      Ecto.Changeset.add_error(changeset, :snapshot_exercise_ref, "is not in the Training Session snapshot")
    end
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
           Programming.resolve_client_startable_prescription(ctx, workout_id, date) do
      {:ok,
       %{
         kind: :planned,
         date: date,
         started_at: started_at,
         snapshot_version: @snapshot_version,
         prescription_snapshot: prescription_snapshot(plan, workout),
         source_plan_id: plan.id,
         source_workout_id: workout.id
       }}
    end
  end

  defp prescription_snapshot(plan, workout) do
    %{
      "version" => @snapshot_version,
      "plan" => %{"id" => plan.id, "name" => plan.name, "revision" => plan.revision},
      "workout" => %{
        "id" => workout.id,
        "name" => workout.name,
        "exercises" => Enum.map(workout.prescribed_exercises, &snapshot_exercise/1)
      }
    }
  end

  defp snapshot_exercise(prescribed_exercise) do
    %{
      "ref" => prescribed_exercise.id,
      "position" => prescribed_exercise.position,
      "exercise_id" => prescribed_exercise.exercise_id,
      "exercise_name" => prescribed_exercise.exercise.name,
      "tracking_type" => prescribed_exercise.exercise.tracking_type,
      "sets" => Enum.map(prescribed_exercise.prescribed_sets, &PlannedSet.to_snapshot/1)
    }
  end

  defp normalize_start_result({:ok, session}, business_id) do
    session =
      TrainingSession
      |> TrainingSession.for_business(business_id)
      |> TrainingSession.include_sets(business_id)
      |> Repo.get(session.id)

    {:ok, session}
  end

  defp normalize_start_result({:error, changeset}, _business_id) do
    if active_session_conflict?(changeset), do: {:error, :conflict}, else: {:error, changeset}
  end

  defp active_session_conflict?(changeset) do
    Enum.any?(changeset.errors, fn {_field, {_message, metadata}} ->
      Keyword.get(metadata, :constraint_name) == @active_session_constraint
    end)
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
