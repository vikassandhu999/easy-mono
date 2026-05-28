defmodule Easy.Training.Workouts do
  alias Easy.Repo
  alias Easy.Training.Exercise
  alias Easy.Training.TrainingPlan
  alias Easy.Training.Workout
  alias Easy.Training.WorkoutElement

  @spec fetch_workout(String.t(), String.t()) :: {:ok, Workout.t()} | {:error, :not_found}
  def fetch_workout(business_id, workout_id) do
    Workout
    |> Workout.for_business(business_id)
    |> Repo.get(workout_id)
    |> ok_or_not_found()
  end

  @spec fetch_workout_for_plan(String.t(), String.t(), String.t()) ::
          {:ok, Workout.t()} | {:error, :not_found}
  def fetch_workout_for_plan(business_id, plan_id, workout_id) do
    Workout
    |> Workout.for_business(business_id)
    |> Workout.for_plan(plan_id)
    |> Repo.get(workout_id)
    |> ok_or_not_found()
  end

  @spec fetch_workout_with_elements(String.t(), String.t()) ::
          {:ok, Workout.t()} | {:error, :not_found}
  def fetch_workout_with_elements(business_id, workout_id) do
    Workout
    |> Workout.for_business(business_id)
    |> Workout.with_elements(business_id)
    |> Repo.get(workout_id)
    |> ok_or_not_found()
  end

  @spec list_workouts(String.t(), String.t(), non_neg_integer(), pos_integer()) ::
          {:ok, %{count: non_neg_integer(), workouts: [Workout.t()]}} | {:error, :not_found}
  def list_workouts(business_id, plan_id, offset, limit) do
    with {:ok, plan} <- fetch_plan(business_id, plan_id) do
      base = Workout |> Workout.for_business(business_id) |> Workout.for_plan(plan.id)

      {:ok,
       %{
         count: Repo.aggregate(base, :count, :id),
         workouts:
           base
           |> Workout.ordered()
           |> Easy.Utils.paginate(offset, limit)
           |> Workout.with_elements(business_id)
           |> Repo.all()
       }}
    end
  end

  @spec fetch_workout_element(String.t(), String.t()) ::
          {:ok, WorkoutElement.t()} | {:error, :not_found}
  def fetch_workout_element(business_id, element_id) do
    WorkoutElement
    |> WorkoutElement.for_business(business_id)
    |> Repo.get(element_id)
    |> ok_or_not_found()
  end

  @spec fetch_workout_element_with_exercise(String.t(), String.t()) ::
          {:ok, WorkoutElement.t()} | {:error, :not_found}
  def fetch_workout_element_with_exercise(business_id, element_id) do
    WorkoutElement
    |> WorkoutElement.for_business(business_id)
    |> WorkoutElement.with_exercise(business_id)
    |> Repo.get(element_id)
    |> ok_or_not_found()
  end

  @spec create_workout(String.t(), String.t(), map()) ::
          {:ok, Workout.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_workout(training_plan_id, business_id, attrs) do
    with {:ok, plan} <- fetch_plan(business_id, training_plan_id) do
      plan.id
      |> Workout.insert_changeset(business_id, attrs)
      |> Repo.insert()
    end
  end

  @spec update_workout(Workout.t(), map()) :: {:ok, Workout.t()} | {:error, Ecto.Changeset.t()}
  def update_workout(%Workout{} = workout, attrs) do
    workout
    |> Workout.update_changeset(attrs)
    |> Repo.update()
  end

  @spec update_workout(String.t(), String.t(), map()) ::
          {:ok, Workout.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_workout(business_id, workout_id, attrs) do
    with {:ok, workout} <- fetch_workout(business_id, workout_id) do
      update_workout(workout, attrs)
    end
  end

  @spec delete_workout(Workout.t()) :: {:ok, Workout.t()} | {:error, Ecto.Changeset.t()}
  def delete_workout(%Workout{} = workout), do: Repo.delete(workout)

  @spec delete_workout(String.t(), String.t()) ::
          {:ok, Workout.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_workout(business_id, workout_id) do
    with {:ok, workout} <- fetch_workout(business_id, workout_id) do
      delete_workout(workout)
    end
  end

  @spec duplicate_workout(Workout.t()) :: {:ok, Workout.t()} | {:error, Ecto.Changeset.t()}
  def duplicate_workout(%Workout{} = workout) do
    element_query =
      WorkoutElement
      |> WorkoutElement.for_business(workout.business_id)
      |> WorkoutElement.ordered()

    Repo.transaction(fn ->
      workout = Repo.preload(workout, workout_elements: element_query)

      case copy_workout_into(workout, workout.training_plan_id) do
        {:ok, new_workout} ->
          Repo.preload(new_workout,
            workout_elements: WorkoutElement.with_exercise(element_query, workout.business_id)
          )

        {:error, reason} ->
          Repo.rollback(reason)
      end
    end)
  end

  @spec duplicate_workout(String.t(), String.t()) ::
          {:ok, Workout.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def duplicate_workout(business_id, workout_id) do
    with {:ok, workout} <- fetch_workout(business_id, workout_id) do
      duplicate_workout(workout)
    end
  end

  @spec create_workout_element(String.t(), String.t(), map()) ::
          {:ok, WorkoutElement.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_workout_element(workout_id, business_id, attrs) do
    with {:ok, workout} <- fetch_workout(business_id, workout_id),
         {:ok, changeset} <-
           workout.id
           |> WorkoutElement.insert_changeset(business_id, attrs)
           |> validate_exercise_in_business() do
      changeset
      |> Repo.insert()
      |> preload_element()
    end
  end

  @spec update_workout_element(WorkoutElement.t(), map()) ::
          {:ok, WorkoutElement.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_workout_element(%WorkoutElement{} = element, attrs) do
    with {:ok, changeset} <-
           element
           |> WorkoutElement.update_changeset(attrs)
           |> validate_exercise_in_business() do
      changeset
      |> Repo.update()
      |> preload_element()
    end
  end

  @spec update_workout_element(String.t(), String.t(), map()) ::
          {:ok, WorkoutElement.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_workout_element(business_id, element_id, attrs) do
    with {:ok, element} <- fetch_workout_element_with_exercise(business_id, element_id) do
      update_workout_element(element, attrs)
    end
  end

  @spec delete_workout_element(WorkoutElement.t()) ::
          {:ok, WorkoutElement.t()} | {:error, Ecto.Changeset.t()}
  def delete_workout_element(%WorkoutElement{} = element), do: Repo.delete(element)

  @spec delete_workout_element(String.t(), String.t()) ::
          {:ok, WorkoutElement.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_workout_element(business_id, element_id) do
    with {:ok, element} <- fetch_workout_element(business_id, element_id) do
      delete_workout_element(element)
    end
  end

  defp fetch_plan(business_id, plan_id) do
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

      Exercise |> Exercise.for_business(business_id) |> Repo.get(exercise_id) ->
        {:ok, changeset}

      true ->
        {:error, :not_found}
    end
  end

  defp copy_workout_into(workout, dest_plan_id) do
    attrs = %{name: workout.name, notes: workout.notes}

    with {:ok, new_workout} <-
           dest_plan_id
           |> Workout.insert_changeset(workout.business_id, attrs)
           |> Repo.insert(),
         :ok <- copy_elements(workout.workout_elements, new_workout.id, workout.business_id) do
      {:ok, new_workout}
    end
  end

  defp copy_elements(elements, new_workout_id, business_id) do
    Enum.reduce_while(elements, :ok, fn element, :ok ->
      result =
        new_workout_id
        |> WorkoutElement.insert_changeset(business_id, WorkoutElement.copy_attrs(element))
        |> Repo.insert()

      case result do
        {:ok, _} -> {:cont, :ok}
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end

  defp preload_element({:ok, %WorkoutElement{} = element}) do
    {:ok, Repo.preload(element, exercise: Exercise.for_business(element.business_id))}
  end

  defp preload_element(error), do: error

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
