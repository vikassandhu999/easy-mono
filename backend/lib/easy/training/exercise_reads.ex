defmodule Easy.Training.ExerciseReads do
  alias Easy.Repo
  alias Easy.Training.Equipment
  alias Easy.Training.Exercise
  alias Easy.Training.Muscle

  @spec fetch_exercise(String.t(), String.t()) :: {:ok, Exercise.t()} | {:error, :not_found}
  def fetch_exercise(business_id, exercise_id) do
    Exercise
    |> Exercise.for_business(business_id)
    |> Exercise.with_preloads()
    |> Repo.get(exercise_id)
    |> ok_or_not_found()
  end

  @spec fetch_business_exercise(String.t(), String.t()) ::
          {:ok, Exercise.t()} | {:error, :not_found}
  def fetch_business_exercise(business_id, exercise_id) do
    Exercise
    |> Exercise.for_business_only(business_id)
    |> Repo.get(exercise_id)
    |> ok_or_not_found()
  end

  @spec list_exercises(
          String.t(),
          String.t() | nil,
          [String.t()] | nil,
          non_neg_integer(),
          pos_integer()
        ) ::
          {:ok, %{count: non_neg_integer(), exercises: [Exercise.t()]}}
  def list_exercises(business_id, search, muscle_ids, offset, limit) do
    base =
      Exercise
      |> Exercise.for_business(business_id)
      |> Exercise.search(search)
      |> Exercise.with_muscle_ids(muscle_ids)

    {:ok,
     %{
       count: Repo.aggregate(base, :count, :id),
       exercises:
         base
         |> Exercise.newest()
         |> Easy.Utils.paginate(offset, limit)
         |> Exercise.with_preloads()
         |> Repo.all()
     }}
  end

  @spec list_muscles(String.t() | nil) :: {:ok, [Muscle.t()]}
  def list_muscles(search) do
    muscles =
      Muscle
      |> Muscle.search(search)
      |> Muscle.alphabetical()
      |> Repo.all()

    {:ok, muscles}
  end

  @spec list_equipment(String.t() | nil) :: {:ok, [Equipment.t()]}
  def list_equipment(search) do
    equipment =
      Equipment
      |> Equipment.search(search)
      |> Equipment.alphabetical()
      |> Repo.all()

    {:ok, equipment}
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
