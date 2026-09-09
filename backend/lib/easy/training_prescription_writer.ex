defmodule Easy.Training.PrescriptionWriter do
  alias Easy.Ctx
  alias Easy.Repo
  alias Easy.Result
  alias Easy.Training.{Library, PrescribedExercise, PrescriptionInput, TrainingPlan, TrainingWorkout, WorkoutSchedule}

  import Ecto.Changeset
  import Ecto.Query

  @max_position 2_147_483_647

  @spec replace(Ctx.t(), TrainingPlan.t(), map()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def replace(%Ctx{} = ctx, plan, attrs) do
    with {:ok, prescription} <- validate_prescription(ctx, plan, attrs),
         {:ok, workouts} <- persist_prescription_workouts(ctx, plan, prescription),
         {:ok, _schedule} <- persist_workout_schedule(ctx, plan, prescription.schedule, workouts) do
      plan
      |> TrainingPlan.revision_changeset()
      |> Repo.update()
    end
  end

  defp validate_prescription(ctx, plan, attrs) do
    with {:ok, input} <- PrescriptionInput.parse(plan, attrs),
         existing = load_existing_nodes(plan),
         :ok <- PrescriptionInput.validate_nodes(plan, input.workouts, existing),
         :ok <- validate_exercise_visibility(ctx, input.workouts) do
      {:ok, Map.put(input, :existing, existing)}
    end
  end

  defp load_existing_nodes(plan) do
    existing_workouts =
      TrainingWorkout
      |> TrainingWorkout.for_business(plan.business_id)
      |> TrainingWorkout.for_plan(plan.id)
      |> Repo.all()
      |> Map.new(&{&1.id, &1})

    existing_exercises =
      PrescribedExercise
      |> PrescribedExercise.for_business(plan.business_id)
      |> where([item], item.training_workout_id in ^Map.keys(existing_workouts))
      |> Repo.all()
      |> Map.new(&{&1.id, &1})

    %{workouts: existing_workouts, exercises: existing_exercises}
  end

  defp validate_exercise_visibility(ctx, workouts) do
    exercise_ids = prescribed_inputs(workouts) |> Enum.map(&Map.get(&1, :exercise_id))

    if Enum.all?(exercise_ids, &valid_uuid?/1) do
      case Library.get_exercises(ctx, exercise_ids) do
        {:ok, _exercises} -> :ok
        {:error, :not_found} -> {:error, :not_found}
      end
    else
      {:error, :not_found}
    end
  end

  defp prescribed_inputs(workouts), do: Enum.flat_map(workouts, &Map.get(&1, :prescribed_exercises))
  defp valid_uuid?(value), do: match?({:ok, _uuid}, Ecto.UUID.cast(value))

  defp persist_prescription_workouts(ctx, plan, prescription) do
    with :ok <- delete_workout_schedule(plan),
         :ok <- stage_retained_workouts(plan, prescription),
         :ok <- delete_omitted_workouts(plan, prescription.workouts) do
      persist_workout_inputs(ctx, plan, prescription)
    end
  end

  defp persist_workout_inputs(ctx, plan, prescription) do
    with {:ok, workouts} <-
           Result.traverse(prescription.workouts, &persist_workout(ctx, plan, &1, prescription.existing)) do
      keys = Enum.map(prescription.workouts, &node_key/1)
      {:ok, Map.new(Enum.zip(keys, workouts))}
    end
  end

  defp delete_workout_schedule(plan) do
    WorkoutSchedule
    |> WorkoutSchedule.for_business(plan.business_id)
    |> WorkoutSchedule.for_plan(plan.id)
    |> Repo.delete_all()

    :ok
  end

  defp stage_retained_workouts(plan, prescription) do
    retained =
      prescription.workouts
      |> Enum.map(&Map.get(&1, :id))
      |> Enum.reject(&is_nil/1)
      |> Enum.map(&Map.fetch!(prescription.existing.workouts, &1))

    current_positions = Enum.map(Map.values(prescription.existing.workouts), & &1.position)
    requested_positions = Enum.map(prescription.workouts, &Map.get(&1, :position))

    stage_positions(plan, retained, current_positions ++ requested_positions, fn workout, position ->
      TrainingWorkout
      |> TrainingWorkout.for_business(plan.business_id)
      |> TrainingWorkout.for_plan(plan.id)
      |> where([row], row.id == ^workout.id)
      |> Repo.update_all(set: [position: position])
    end)
  end

  defp delete_omitted_workouts(plan, workouts) do
    requested_ids = workouts |> Enum.map(&Map.get(&1, :id)) |> Enum.reject(&is_nil/1)

    TrainingWorkout
    |> TrainingWorkout.for_business(plan.business_id)
    |> TrainingWorkout.for_plan(plan.id)
    |> where([workout], workout.id not in ^requested_ids)
    |> Repo.delete_all()

    :ok
  end

  defp persist_workout(ctx, plan, input, existing) do
    result =
      case Map.get(input, :id) do
        nil ->
          TrainingWorkout.insert_changeset(ctx.business_id, plan.id, input) |> Repo.insert()

        id ->
          existing.workouts
          |> Map.fetch!(id)
          |> TrainingWorkout.update_changeset(input)
          |> force_requested_position(input)
          |> Repo.update()
      end

    with {:ok, workout} <- result do
      persist_prescribed_exercises(ctx, workout, input, existing)
    end
  end

  defp persist_prescribed_exercises(ctx, workout, workout_input, existing) do
    inputs = Map.get(workout_input, :prescribed_exercises)

    with :ok <- stage_retained_exercises(workout, inputs, existing),
         :ok <- delete_omitted_exercises(workout, inputs),
         {:ok, _items} <- Result.traverse(inputs, &persist_prescribed_exercise(ctx, workout, &1, existing)) do
      {:ok, workout}
    end
  end

  defp stage_retained_exercises(workout, inputs, existing) do
    retained =
      inputs
      |> Enum.map(&Map.get(&1, :id))
      |> Enum.reject(&is_nil/1)
      |> Enum.map(&Map.fetch!(existing.exercises, &1))

    existing_for_workout =
      existing.exercises
      |> Map.values()
      |> Enum.filter(&(&1.training_workout_id == workout.id))

    current_positions = Enum.map(existing_for_workout, & &1.position)
    requested_positions = Enum.map(inputs, &Map.get(&1, :position))

    stage_positions(workout, retained, current_positions ++ requested_positions, fn item, position ->
      PrescribedExercise
      |> PrescribedExercise.for_business(workout.business_id)
      |> PrescribedExercise.for_workout(workout.id)
      |> where([row], row.id == ^item.id)
      |> Repo.update_all(set: [position: position])
    end)
  end

  defp delete_omitted_exercises(workout, inputs) do
    requested_ids = inputs |> Enum.map(&Map.get(&1, :id)) |> Enum.reject(&is_nil/1)

    PrescribedExercise
    |> PrescribedExercise.for_business(workout.business_id)
    |> PrescribedExercise.for_workout(workout.id)
    |> where([item], item.id not in ^requested_ids)
    |> Repo.delete_all()

    :ok
  end

  defp persist_prescribed_exercise(ctx, workout, input, existing) do
    case Map.get(input, :id) do
      nil ->
        PrescribedExercise.insert_changeset(ctx.business_id, workout.id, input) |> Repo.insert()

      id ->
        existing.exercises
        |> Map.fetch!(id)
        |> PrescribedExercise.update_changeset(input)
        |> force_requested_position(input)
        |> Repo.update()
    end
  end

  defp force_requested_position(changeset, input) do
    force_change(changeset, :position, Map.fetch!(input, :position))
  end

  defp persist_workout_schedule(ctx, plan, schedule, workouts) do
    Result.traverse(schedule, &persist_schedule_entry(ctx, plan, &1, workouts))
  end

  defp persist_schedule_entry(ctx, plan, entry, workouts) do
    case scheduled_workout(entry, workouts) do
      nil ->
        {:ok, nil}

      workout ->
        WorkoutSchedule.insert_changeset(ctx.business_id, plan.id, workout.id, entry) |> Repo.insert()
    end
  end

  defp scheduled_workout(%{workout_id: nil, workout_ref: nil}, _workouts), do: nil
  defp scheduled_workout(%{workout_id: id}, workouts) when not is_nil(id), do: Map.fetch!(workouts, {:id, id})
  defp scheduled_workout(%{workout_ref: ref}, workouts), do: Map.fetch!(workouts, {:ref, ref})

  defp node_key(%{id: id}) when not is_nil(id), do: {:id, id}
  defp node_key(%{local_ref: ref}), do: {:ref, ref}

  defp stage_positions(_owner, [], _positions, _update), do: :ok

  defp stage_positions(owner, retained, positions, update) do
    count = length(retained)
    used = MapSet.new(positions)

    case free_stage_positions(used, count) do
      {:ok, positions} ->
        retained
        |> Enum.zip(positions)
        |> Enum.each(fn {row, position} -> update.(row, position) end)

        :ok

      :error ->
        {:error, prescription_error(owner, :workouts, "positions are too large to safely reorder")}
    end
  end

  defp free_stage_positions(used, count) do
    positions =
      0..min(@max_position, MapSet.size(used) + count)
      |> Stream.reject(&MapSet.member?(used, &1))
      |> Enum.take(count)

    if length(positions) == count, do: {:ok, positions}, else: :error
  end

  defp prescription_error(plan, field, message), do: plan |> change() |> add_error(field, message)
end
