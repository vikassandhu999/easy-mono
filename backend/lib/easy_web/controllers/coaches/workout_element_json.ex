defmodule EasyWeb.Coaches.WorkoutElementJSON do
  alias Easy.Training.{Exercise, PlannedSet, WorkoutElement}

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
      planned_workout_id: element.planned_workout_id,
      business_id: element.business_id,
      exercise: exercise_data(element.exercise),
      planned_sets: planned_sets_data(element.planned_sets),
      inserted_at: element.inserted_at,
      updated_at: element.updated_at
    }
  end

  defp exercise_data(%Exercise{} = exercise) do
    %{id: exercise.id, name: exercise.name, mechanics: exercise.mechanics, force: exercise.force}
  end

  defp exercise_data(_), do: nil

  defp planned_sets_data(sets) when is_list(sets), do: Enum.map(sets, &planned_set_data/1)
  defp planned_sets_data(_), do: []

  defp planned_set_data(%PlannedSet{} = set) do
    %{
      target_reps: set.target_reps,
      load_value: set.load_value,
      load_unit: set.load_unit,
      intensity_target: set.intensity_target,
      tempo: set.tempo,
      rest_seconds: set.rest_seconds,
      duration_seconds: set.duration_seconds,
      distance_value: set.distance_value,
      distance_unit: set.distance_unit,
      set_type: set.set_type,
      notes: set.notes
    }
  end
end
