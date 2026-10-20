defmodule Easy.Workouts.Content do
  import Ecto.Query

  alias Easy.Repo
  alias Easy.Workouts.{Exercise, ExerciseGroup, Workout, WorkoutExercise, WorkoutExerciseReference}

  @metadata [:name, :description, :type, :video_id]

  @spec same?(Workout.t(), Workout.t()) :: boolean()
  def same?(left, right), do: comparable(left) == comparable(right)

  @spec fresh_ids(map()) :: map()
  def fresh_ids(attrs) do
    attrs
    |> map_list(:groups, &fresh_group/1)
    |> map_list("groups", &fresh_group/1)
  end

  @spec sync_references(Workout.t()) :: :ok
  def sync_references(%Workout{} = workout) do
    WorkoutExerciseReference
    |> where([r], r.business_id == ^workout.business_id and r.workout_id == ^workout.id)
    |> Repo.delete_all()

    rows =
      workout.groups
      |> Enum.flat_map(& &1.exercises)
      |> Enum.map(& &1.exercise_id)
      |> Enum.uniq()
      |> Enum.map(&%{business_id: workout.business_id, workout_id: workout.id, exercise_id: &1})

    Repo.insert_all(WorkoutExerciseReference, rows)
    :ok
  end

  @spec load_exercises([Workout.t()], String.t()) :: [Workout.t()]
  def load_exercises([], _business_id), do: []

  def load_exercises(workouts, business_id) do
    ids = for workout <- workouts, workout.business_id == business_id, do: workout.id

    exercises =
      business_id
      |> Exercise.visible()
      |> join(:inner, [e], r in WorkoutExerciseReference, on: r.exercise_id == e.id and r.business_id == ^business_id)
      |> where([_e, r], r.workout_id in ^ids)
      |> select([e, r], {r.workout_id, e})
      |> Exercise.include_media(business_id)
      |> Repo.all()
      |> Map.new(fn {workout_id, exercise} -> {{workout_id, exercise.id}, exercise} end)

    Enum.map(workouts, &load_workout(&1, exercises))
  end

  @spec exercises_by_id(String.t(), [String.t()]) :: %{optional(String.t()) => Exercise.t()}
  def exercises_by_id(business_id, ids) do
    ids = for id <- ids, {:ok, id} <- [Ecto.UUID.cast(id)], do: id

    business_id
    |> Exercise.visible()
    |> where([e], e.id in ^ids)
    |> Exercise.include_media(business_id)
    |> Repo.all()
    |> Map.new(&{&1.id, &1})
  end

  defp comparable(workout) do
    {Map.take(workout, @metadata), Enum.map(workout.groups, &comparable_group/1)}
  end

  defp comparable_group(group), do: {group.name, group.rounds, Enum.map(group.exercises, &comparable_entry/1)}

  defp comparable_entry(entry) do
    targets = Enum.map(entry.targets, &(Ecto.embedded_dump(&1, :json) |> normalize()))
    {entry.exercise_id, entry.side_mode, entry.targets_mode, targets}
  end

  defp load_workout(workout, exercises) do
    groups = Enum.map(workout.groups, &load_group(&1, workout.id, exercises))
    %{workout | groups: groups}
  end

  defp load_group(group, workout_id, exercises) do
    entries = Enum.map(group.exercises, &%{&1 | exercise: Map.get(exercises, {workout_id, &1.exercise_id})})
    %{group | exercises: entries}
  end

  defp normalize(%Decimal{} = value) do
    if Decimal.equal?(value, 0), do: Decimal.new(0), else: Decimal.normalize(value)
  end

  defp normalize(value) when is_map(value), do: Map.new(value, fn {key, item} -> {key, normalize(item)} end)
  defp normalize(value) when is_list(value), do: Enum.map(value, &normalize/1)
  defp normalize(value), do: value

  defp fresh_group(%ExerciseGroup{} = group), do: group |> Ecto.embedded_dump(:json) |> fresh_group()

  defp fresh_group(group) when is_map(group) do
    group
    |> Map.drop([:id, "id"])
    |> map_list(:exercises, &fresh_entry/1)
    |> map_list("exercises", &fresh_entry/1)
  end

  defp fresh_group(value), do: value

  defp fresh_entry(%WorkoutExercise{} = entry), do: entry |> Ecto.embedded_dump(:json) |> fresh_entry()
  defp fresh_entry(entry) when is_map(entry), do: Map.drop(entry, [:id, "id"])
  defp fresh_entry(value), do: value

  defp map_list(attrs, key, fun) do
    case Map.fetch(attrs, key) do
      {:ok, values} when is_list(values) -> Map.put(attrs, key, Enum.map(values, fun))
      _ -> attrs
    end
  end
end
