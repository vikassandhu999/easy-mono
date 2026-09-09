defmodule Easy.Training.PlanCopy do
  alias Easy.ClientAccess
  alias Easy.Clients
  alias Easy.Ctx
  alias Easy.Orgs.Business
  alias Easy.Repo
  alias Easy.Result
  alias Easy.Training.{PrescribedExercise, TrainingPlan, TrainingWorkout, WorkoutSchedule}

  import Ecto.Query

  @spec duplicate_template(Ctx.t(), String.t()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def duplicate_template(%Ctx{} = ctx, template_id) do
    with :ok <- Ctx.ensure_coach(ctx) do
      Repo.transact(fn ->
        lock_business_for_duplicate_name(ctx.business_id)
        duplicate_locked_template(ctx, template_id)
      end)
    end
  end

  @spec assign_template_to_client(Ctx.t(), String.t(), String.t(), map()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def assign_template_to_client(%Ctx{} = ctx, client_id, template_id, attrs) do
    with :ok <- Ctx.ensure_coach(ctx) do
      Repo.transact(fn -> assign_visible_template(ctx, client_id, template_id, attrs) end)
    end
  end

  defp duplicate_locked_template(ctx, template_id) do
    with {:ok, template} <- load_copy_source(ctx, template_id) do
      duplicate_template_rows(ctx, template)
    end
  end

  defp assign_visible_template(ctx, client_id, template_id, attrs) do
    with :ok <- ClientAccess.authorize_client_id(ctx, client_id),
         {:ok, template} <- load_copy_source(ctx, template_id) do
      assign_template_rows(ctx, client_id, template, attrs)
    end
  end

  defp load_copy_source(ctx, template_id) do
    ctx
    |> template_query()
    |> TrainingPlan.for_archived(false)
    |> TrainingPlan.include_workouts(ctx.business_id)
    |> lock("FOR UPDATE")
    |> Repo.get(template_id)
    |> case do
      nil -> {:error, :not_found}
      template -> {:ok, template}
    end
  end

  defp assign_template_rows(ctx, client_id, template, attrs) do
    with {:ok, copy} <-
           TrainingPlan.insert_changeset(
             ctx.business_id,
             ctx.user_id,
             client_id,
             template,
             attrs
           )
           |> Repo.insert(),
         :ok <- copy_prescription(ctx, template, copy),
         {:ok, _count} <- Clients.advance_stage_to_coaching(ctx, client_id) do
      {:ok, copy}
    end
  end

  defp duplicate_template_rows(ctx, template) do
    attrs = %{
      name: duplicate_template_name(template.name, ctx.business_id),
      description: template.description
    }

    with {:ok, copy} <- TrainingPlan.insert_changeset(ctx.business_id, ctx.user_id, attrs) |> Repo.insert(),
         :ok <- copy_prescription(ctx, template, copy) do
      {:ok, copy}
    end
  end

  defp duplicate_template_name(original_name, business_id) do
    existing_names =
      TrainingPlan
      |> TrainingPlan.for_business(business_id)
      |> TrainingPlan.templates()
      |> select([template], template.name)
      |> Repo.all()

    Easy.CopyName.next(original_name, existing_names)
  end

  defp lock_business_for_duplicate_name(business_id) do
    Business
    |> where([business], business.id == ^business_id)
    |> select([business], business.id)
    |> lock("FOR UPDATE")
    |> Repo.one()
  end

  defp template_query(%Ctx{} = ctx) do
    TrainingPlan
    |> TrainingPlan.for_business(ctx.business_id)
    |> TrainingPlan.templates()
  end

  defp copy_prescription(%Ctx{} = ctx, source, destination) do
    with {:ok, workout_pairs} <- duplicate_workout_rows(ctx, source.workouts, destination),
         {:ok, _schedule} <- duplicate_schedule_rows(ctx, source.workout_schedule, destination, Map.new(workout_pairs)) do
      :ok
    end
  end

  defp duplicate_workout_rows(ctx, workouts, copy) do
    Result.traverse(workouts, fn workout ->
      attrs = %{name: workout.name, position: workout.position}

      with {:ok, copied_workout} <- TrainingWorkout.insert_changeset(ctx.business_id, copy.id, attrs) |> Repo.insert(),
           {:ok, _exercises} <- duplicate_prescribed_exercise_rows(ctx, workout.prescribed_exercises, copied_workout) do
        {:ok, {workout.id, copied_workout.id}}
      end
    end)
  end

  defp duplicate_prescribed_exercise_rows(ctx, prescribed_exercises, copied_workout) do
    Result.traverse(prescribed_exercises, fn prescribed_exercise ->
      attrs = PrescribedExercise.copy_attrs(prescribed_exercise)

      PrescribedExercise.insert_changeset(ctx.business_id, copied_workout.id, attrs) |> Repo.insert()
    end)
  end

  defp duplicate_schedule_rows(ctx, schedule, copy, workout_ids) do
    Result.traverse(schedule, fn row ->
      attrs = %{weekday: row.weekday}
      copied_workout_id = Map.fetch!(workout_ids, row.training_workout_id)

      WorkoutSchedule.insert_changeset(ctx.business_id, copy.id, copied_workout_id, attrs) |> Repo.insert()
    end)
  end
end
