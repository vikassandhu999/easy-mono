defmodule Easy.Workouts do
  import Ecto.Query

  alias Easy.Clients
  alias Easy.Ctx
  alias Easy.Repo
  alias Easy.Training.TrainingExercise
  alias Easy.Training.TrainingPlan
  alias Easy.Training.TrainingWorkout
  alias Easy.Training.TrainingWorkoutExercise

  # Offset that lifts every element clear of the 0..n-1 target range during a
  # reorder, so the (training_workout_id, position) unique index never collides
  # mid-reassignment.
  @position_reorder_offset 1_000_000

  @spec get_workout(Ctx.t(), String.t()) :: {:ok, TrainingWorkout.t()} | {:error, :not_found}
  def get_workout(%Ctx{} = ctx, workout_id) do
    workout =
      TrainingWorkout
      |> TrainingWorkout.for_business(ctx.business_id)
      |> Repo.get(workout_id)

    with {:ok, workout} <- ok_or_not_found(workout),
         {:ok, _plan} <- get_plan(ctx, workout.training_plan_id) do
      {:ok, workout}
    end
  end

  @spec get_workout_with_elements(Ctx.t(), String.t()) ::
          {:ok, TrainingWorkout.t()} | {:error, :not_found}
  def get_workout_with_elements(%Ctx{} = ctx, workout_id) do
    with {:ok, _workout} <- get_workout(ctx, workout_id) do
      TrainingWorkout
      |> TrainingWorkout.for_business(ctx.business_id)
      |> TrainingWorkout.include_exercises(ctx.business_id)
      |> Repo.get(workout_id)
      |> ok_or_not_found()
    end
  end

  @spec get_workout_for_plan(Ctx.t(), String.t(), String.t()) ::
          {:ok, TrainingWorkout.t()} | {:error, :not_found}
  def get_workout_for_plan(%Ctx{} = ctx, plan_id, workout_id) do
    with {:ok, _plan} <- get_plan(ctx, plan_id) do
      TrainingWorkout
      |> TrainingWorkout.for_business(ctx.business_id)
      |> TrainingWorkout.for_plan(plan_id)
      |> Repo.get(workout_id)
      |> ok_or_not_found()
    end
  end

  @spec list_workouts(Ctx.t(), String.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), workouts: [TrainingWorkout.t()]}} | {:error, :not_found}
  def list_workouts(%Ctx{} = ctx, plan_id, opts \\ []) do
    offset = Keyword.get(opts, :offset, 0)
    limit = min(Keyword.get(opts, :limit, 20), 100)

    with {:ok, plan} <- get_plan(ctx, plan_id) do
      base = TrainingWorkout |> TrainingWorkout.for_business(ctx.business_id) |> TrainingWorkout.for_plan(plan.id)

      {:ok,
       %{
         count: Repo.aggregate(base, :count, :id),
         workouts:
           base
           |> TrainingWorkout.ordered()
           |> Easy.Utils.paginate(offset, limit)
           |> TrainingWorkout.include_exercises(ctx.business_id)
           |> Repo.all()
       }}
    end
  end

  @spec get_workout_element(Ctx.t(), String.t()) ::
          {:ok, TrainingWorkoutExercise.t()} | {:error, :not_found}
  def get_workout_element(%Ctx{} = ctx, element_id) do
    element =
      TrainingWorkoutExercise
      |> TrainingWorkoutExercise.for_business(ctx.business_id)
      |> Repo.get(element_id)

    with {:ok, element} <- ok_or_not_found(element),
         {:ok, _workout} <- get_workout(ctx, element.training_workout_id) do
      {:ok, element}
    end
  end

  @spec get_workout_element_with_exercise(Ctx.t(), String.t()) ::
          {:ok, TrainingWorkoutExercise.t()} | {:error, :not_found}
  def get_workout_element_with_exercise(%Ctx{} = ctx, element_id) do
    with {:ok, _element} <- get_workout_element(ctx, element_id) do
      TrainingWorkoutExercise
      |> TrainingWorkoutExercise.for_business(ctx.business_id)
      |> TrainingWorkoutExercise.include_exercise(ctx.business_id)
      |> Repo.get(element_id)
      |> ok_or_not_found()
    end
  end

  @spec create_workout(Ctx.t(), String.t(), map()) ::
          {:ok, TrainingWorkout.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_workout(%Ctx{} = ctx, plan_id, attrs) do
    with {:ok, plan} <- get_plan(ctx, plan_id) do
      TrainingWorkout.insert_changeset(ctx.business_id, nil, plan.id, attrs)
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

  @spec create_workout_element(Ctx.t(), String.t(), map()) ::
          {:ok, TrainingWorkoutExercise.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_workout_element(%Ctx{} = ctx, workout_id, attrs) do
    with {:ok, workout} <- get_workout(ctx, workout_id),
         {:ok, changeset} <-
           TrainingWorkoutExercise.insert_changeset(ctx.business_id, workout.id, attrs)
           |> validate_exercise_in_business() do
      changeset
      |> maybe_put_next_position(ctx.business_id, workout.id, attrs)
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

  @spec reorder_workout_elements(Ctx.t(), String.t(), [String.t()]) ::
          {:ok, [TrainingWorkoutExercise.t()]} | {:error, :not_found | :invalid_element_ids}
  def reorder_workout_elements(%Ctx{} = ctx, workout_id, ordered_ids) do
    with {:ok, workout} <- get_workout(ctx, workout_id),
         :ok <- validate_complete_element_set(ctx.business_id, workout.id, ordered_ids) do
      {:ok, _} = Repo.transaction(fn -> reassign_positions(ctx.business_id, workout.id, ordered_ids) end)
      {:ok, ordered_workout_elements(ctx.business_id, workout.id)}
    end
  end

  defp get_plan(%Ctx{} = ctx, plan_id) do
    plan =
      TrainingPlan
      |> TrainingPlan.for_business(ctx.business_id)
      |> Repo.get(plan_id)

    with {:ok, plan} <- ok_or_not_found(plan),
         :ok <- Clients.authorize_client_id(ctx, plan.client_id) do
      {:ok, plan}
    end
  end

  defp maybe_put_next_position(changeset, business_id, workout_id, attrs) do
    if changeset.valid? and not Map.has_key?(attrs, :position) do
      Ecto.Changeset.put_change(changeset, :position, next_position(business_id, workout_id))
    else
      changeset
    end
  end

  defp next_position(business_id, workout_id) do
    query =
      TrainingWorkoutExercise
      |> TrainingWorkoutExercise.for_business(business_id)
      |> TrainingWorkoutExercise.for_workout(workout_id)
      |> select([e], max(e.position))

    case Repo.one(query) do
      nil -> 0
      max -> max + 1
    end
  end

  # ordered_ids must be exactly the workout's current element ids (no more, no fewer)
  # so the reorder is a pure permutation.
  defp validate_complete_element_set(business_id, workout_id, ordered_ids) do
    current_ids =
      TrainingWorkoutExercise
      |> TrainingWorkoutExercise.for_business(business_id)
      |> TrainingWorkoutExercise.for_workout(workout_id)
      |> select([e], e.id)
      |> Repo.all()

    if MapSet.equal?(MapSet.new(current_ids), MapSet.new(ordered_ids)) do
      :ok
    else
      {:error, :invalid_element_ids}
    end
  end

  # Collision-free position reassignment under the unique index: shift every
  # element clear of the 0..n-1 range, then set each to its final index.
  defp reassign_positions(business_id, workout_id, ordered_ids) do
    TrainingWorkoutExercise
    |> TrainingWorkoutExercise.for_business(business_id)
    |> TrainingWorkoutExercise.for_workout(workout_id)
    |> Repo.update_all(inc: [position: @position_reorder_offset])

    ordered_ids
    |> Enum.with_index()
    |> Enum.each(fn {id, index} ->
      TrainingWorkoutExercise
      |> TrainingWorkoutExercise.for_workout(workout_id)
      |> where([e], e.id == ^id)
      |> Repo.update_all(set: [position: index])
    end)
  end

  defp ordered_workout_elements(business_id, workout_id) do
    TrainingWorkoutExercise
    |> TrainingWorkoutExercise.for_business(business_id)
    |> TrainingWorkoutExercise.for_workout(workout_id)
    |> TrainingWorkoutExercise.ordered()
    |> TrainingWorkoutExercise.include_exercise(business_id)
    |> Repo.all()
  end

  defp validate_exercise_in_business(%{valid?: false} = changeset), do: {:ok, changeset}

  defp validate_exercise_in_business(changeset) do
    business_id = Ecto.Changeset.get_field(changeset, :business_id)
    exercise_id = Ecto.Changeset.get_field(changeset, :exercise_id)

    cond do
      is_nil(business_id) || is_nil(exercise_id) ->
        {:ok, changeset}

      TrainingExercise |> TrainingExercise.for_business_or_system(business_id) |> Repo.get(exercise_id) ->
        {:ok, changeset}

      true ->
        {:error, :not_found}
    end
  end

  defp preload_element({:ok, %TrainingWorkoutExercise{} = element}) do
    {:ok,
     Repo.preload(element,
       exercise: TrainingExercise.for_business_or_system(element.business_id)
     )}
  end

  defp preload_element(error), do: error

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
