defmodule Easy.Training.WorkoutReads do
  alias Easy.Repo
  alias Easy.Training.Workout
  alias Easy.Training.WorkoutElement


  @spec fetch_workout(String.t(), String.t()) :: {:ok, Workout.t()} | {:error, :not_found}
  def fetch_workout(business_id, workout_id) do
    Workout
    |> Workout.for_business(business_id)
    |> Repo.get(workout_id)
    |> ok_or_not_found()
  end

  @spec fetch_workout_with_elements(String.t(), String.t()) ::
          {:ok, Workout.t()} | {:error, :not_found}
  def fetch_workout_with_elements(business_id, workout_id) do
    Workout
    |> Workout.for_business(business_id)
    |> Workout.with_elements()
    |> Repo.get(workout_id)
    |> ok_or_not_found()
  end

  @spec list_workouts(String.t(), String.t(), non_neg_integer(), pos_integer()) ::
          {:ok, %{count: non_neg_integer(), workouts: [Workout.t()]}} | {:error, :not_found}
  def list_workouts(business_id, plan_id, offset, limit) do
    with {:ok, _plan} <- Easy.Training.PlanReads.fetch_plan(business_id, plan_id) do
      base = Workout |> Workout.for_business(business_id) |> Workout.for_plan(plan_id)

      {:ok,
       %{
         count: Repo.aggregate(base, :count, :id),
         workouts:
           base
           |> Workout.ordered()
           |> Easy.Utils.paginate(offset, limit)
           |> Workout.with_elements()
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
    |> WorkoutElement.with_exercise()
    |> Repo.get(element_id)
    |> ok_or_not_found()
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
