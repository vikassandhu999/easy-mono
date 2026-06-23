defmodule Easy.Workouts do
  alias Easy.Ctx
  alias Easy.Repo
  alias Easy.Training.TrainingExercise
  alias Easy.Training.TrainingPlan
  alias Easy.Training.TrainingWorkout
  alias Easy.Training.TrainingWorkoutExercise

  @spec get_workout(Ctx.t(), String.t()) :: {:ok, TrainingWorkout.t()} | {:error, :not_found}
  def get_workout(%Ctx{} = ctx, workout_id) do
    TrainingWorkout
    |> TrainingWorkout.for_business(ctx.business_id)
    |> Repo.get(workout_id)
    |> ok_or_not_found()
  end

  @spec get_workout_for_plan(Ctx.t(), String.t(), String.t()) ::
          {:ok, TrainingWorkout.t()} | {:error, :not_found}
  def get_workout_for_plan(%Ctx{} = ctx, plan_id, workout_id) do
    TrainingWorkout
    |> TrainingWorkout.for_business(ctx.business_id)
    |> TrainingWorkout.for_plan(plan_id)
    |> Repo.get(workout_id)
    |> ok_or_not_found()
  end

  @spec get_workout_with_elements(Ctx.t(), String.t()) ::
          {:ok, TrainingWorkout.t()} | {:error, :not_found}
  def get_workout_with_elements(%Ctx{} = ctx, workout_id) do
    TrainingWorkout
    |> TrainingWorkout.for_business(ctx.business_id)
    |> TrainingWorkout.with_elements(ctx.business_id)
    |> Repo.get(workout_id)
    |> ok_or_not_found()
  end

  @spec list_workouts(Ctx.t(), String.t(), non_neg_integer(), pos_integer()) ::
          {:ok, %{count: non_neg_integer(), workouts: [TrainingWorkout.t()]}} | {:error, :not_found}
  def list_workouts(%Ctx{} = ctx, plan_id, offset, limit) do
    with {:ok, plan} <- get_plan(ctx.business_id, plan_id) do
      base = TrainingWorkout |> TrainingWorkout.for_business(ctx.business_id) |> TrainingWorkout.for_plan(plan.id)

      {:ok,
       %{
         count: Repo.aggregate(base, :count, :id),
         workouts:
           base
           |> TrainingWorkout.ordered()
           |> Easy.Utils.paginate(offset, limit)
           |> TrainingWorkout.with_elements(ctx.business_id)
           |> Repo.all()
       }}
    end
  end

  @spec get_workout_element(Ctx.t(), String.t()) ::
          {:ok, TrainingWorkoutExercise.t()} | {:error, :not_found}
  def get_workout_element(%Ctx{} = ctx, element_id) do
    TrainingWorkoutExercise
    |> TrainingWorkoutExercise.for_business(ctx.business_id)
    |> Repo.get(element_id)
    |> ok_or_not_found()
  end

  @spec get_workout_element_with_exercise(Ctx.t(), String.t()) ::
          {:ok, TrainingWorkoutExercise.t()} | {:error, :not_found}
  def get_workout_element_with_exercise(%Ctx{} = ctx, element_id) do
    TrainingWorkoutExercise
    |> TrainingWorkoutExercise.for_business(ctx.business_id)
    |> TrainingWorkoutExercise.with_exercise(ctx.business_id)
    |> Repo.get(element_id)
    |> ok_or_not_found()
  end

  @spec create_workout(Ctx.t(), String.t(), map()) ::
          {:ok, TrainingWorkout.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_workout(%Ctx{} = ctx, plan_id, attrs) do
    with {:ok, plan} <- get_plan(ctx.business_id, plan_id) do
      plan.id
      |> TrainingWorkout.insert_changeset(ctx.business_id, nil, attrs)
      |> Repo.insert()
    end
  end

  @spec update_workout(Ctx.t(), String.t(), map()) ::
          {:ok, TrainingWorkout.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_workout(%Ctx{} = ctx, workout_id, attrs) do
    with {:ok, workout} <- get_workout(ctx, workout_id) do
      workout
      |> TrainingWorkout.update_changeset(attrs)
      |> Repo.update()
    end
  end

  @spec delete_workout(Ctx.t(), String.t()) ::
          {:ok, TrainingWorkout.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_workout(%Ctx{} = ctx, workout_id) do
    with {:ok, workout} <- get_workout(ctx, workout_id) do
      Repo.delete(workout)
    end
  end

  @spec duplicate_workout(Ctx.t(), String.t()) ::
          {:ok, TrainingWorkout.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def duplicate_workout(%Ctx{} = ctx, workout_id) do
    with {:ok, workout} <- get_workout(ctx, workout_id) do
      duplicate_workout_struct(workout)
    end
  end

  @spec create_workout_element(Ctx.t(), String.t(), map()) ::
          {:ok, TrainingWorkoutExercise.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_workout_element(%Ctx{} = ctx, workout_id, attrs) do
    with {:ok, workout} <- get_workout(ctx, workout_id),
         {:ok, changeset} <-
           workout.id
           |> TrainingWorkoutExercise.insert_changeset(ctx.business_id, attrs)
           |> validate_exercise_in_business() do
      changeset
      |> Repo.insert()
      |> preload_element()
    end
  end

  @spec update_workout_element(Ctx.t(), String.t(), map()) ::
          {:ok, TrainingWorkoutExercise.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_workout_element(%Ctx{} = ctx, element_id, attrs) do
    with {:ok, element} <- get_workout_element_with_exercise(ctx, element_id),
         {:ok, changeset} <-
           element
           |> TrainingWorkoutExercise.update_changeset(attrs)
           |> validate_exercise_in_business() do
      changeset
      |> Repo.update()
      |> preload_element()
    end
  end

  @spec delete_workout_element(Ctx.t(), String.t()) ::
          {:ok, TrainingWorkoutExercise.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_workout_element(%Ctx{} = ctx, element_id) do
    with {:ok, element} <- get_workout_element(ctx, element_id) do
      Repo.delete(element)
    end
  end

  defp duplicate_workout_struct(%TrainingWorkout{} = workout) do
    element_query =
      TrainingWorkoutExercise
      |> TrainingWorkoutExercise.for_business(workout.business_id)
      |> TrainingWorkoutExercise.ordered()

    Repo.transaction(fn ->
      workout = Repo.preload(workout, workout_elements: element_query)

      case copy_workout_into(workout, workout.training_plan_id) do
        {:ok, new_workout} ->
          Repo.preload(new_workout,
            workout_elements: TrainingWorkoutExercise.with_exercise(element_query, workout.business_id)
          )

        {:error, reason} ->
          Repo.rollback(reason)
      end
    end)
  end

  defp get_plan(business_id, plan_id) do
    TrainingPlan
    |> TrainingPlan.for_business(business_id)
    |> Repo.get(plan_id)
    |> ok_or_not_found()
  end

  defp validate_exercise_in_business(%{valid?: false} = changeset), do: {:ok, changeset}

  defp validate_exercise_in_business(changeset) do
    business_id = Ecto.Changeset.get_field(changeset, :business_id)
    exercise_id = Ecto.Changeset.get_field(changeset, :exercise_id)

    cond do
      is_nil(business_id) || is_nil(exercise_id) ->
        {:ok, changeset}

      TrainingExercise |> TrainingExercise.owned_or_system(business_id) |> Repo.get(exercise_id) ->
        {:ok, changeset}

      true ->
        {:error, :not_found}
    end
  end

  defp copy_workout_into(workout, dest_plan_id) do
    attrs = %{name: workout.name, notes: workout.notes}

    with {:ok, new_workout} <-
           dest_plan_id
           |> TrainingWorkout.insert_changeset(workout.business_id, nil, attrs)
           |> Repo.insert(),
         :ok <- copy_elements(workout.workout_elements, new_workout.id, workout.business_id) do
      {:ok, new_workout}
    end
  end

  defp copy_elements(elements, new_workout_id, business_id) do
    Enum.reduce_while(elements, :ok, fn element, :ok ->
      result =
        new_workout_id
        |> TrainingWorkoutExercise.insert_changeset(business_id, TrainingWorkoutExercise.copy_attrs(element))
        |> Repo.insert()

      case result do
        {:ok, _} -> {:cont, :ok}
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end

  defp preload_element({:ok, %TrainingWorkoutExercise{} = element}) do
    {:ok, Repo.preload(element, exercise: TrainingExercise.for_business(element.business_id))}
  end

  defp preload_element(error), do: error

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
