defmodule EasyWeb.Coaches.WorkoutElementJSON do
  alias Easy.Training.{TrainingExercise, PlannedSet, WorkoutElement}

  @spec show(map()) :: map()
  def show(%{element: element}) do
    %{data: data(element)}
  end

  defp data(%WorkoutElement{} = element) do
    %{
      id: element.id,
      position: element.position,
      superset_group_id: element.superset_group_id,
      notes: element.notes,
      exercise_id: element.exercise_id,
      training_workout_id: element.training_workout_id,
      exercise: exercise_data(element.exercise),
      planned_sets: planned_sets_data(element.planned_sets),
      inserted_at: element.inserted_at,
      updated_at: element.updated_at
    }
  end

  defp exercise_data(%TrainingExercise{} = exercise) do
    %{id: exercise.id, name: exercise.name, mechanics: exercise.mechanics, force: exercise.force}
  end

  defp exercise_data(_), do: nil

  defp planned_sets_data(sets) when is_list(sets), do: Enum.map(sets, &planned_set_data/1)
  defp planned_sets_data(_), do: []

  defp planned_set_data(%PlannedSet{} = set) do
    %{
      set_type: set.set_type,
      reps: set.reps,
      load_value: set.load_value,
      load_unit: set.load_unit,
      duration_seconds: set.duration_seconds,
      distance_value: set.distance_value,
      distance_unit: set.distance_unit,
      rpe: set.rpe,
      rest_seconds: set.rest_seconds,
      notes: set.notes
    }
  end
end
