defmodule Easy.Training.Execution do
  alias Easy.Ctx
  alias Easy.Repo
  alias Easy.Training.{PlannedSet, Programming, TrainingSession}

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
end
