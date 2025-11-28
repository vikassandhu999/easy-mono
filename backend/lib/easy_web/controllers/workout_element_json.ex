defmodule EasyWeb.WorkoutElementJSON do
  alias Easy.Training.Programming.WorkoutElement

  def show(%{workout_element: workout_element}) do
    %{data: data(workout_element)}
  end

  def data(%WorkoutElement{} = element) do
    %{
      id: element.id,
      position: element.position,
      superset_group_id: element.superset_group_id,
      notes: element.notes,
      exercise_id: element.exercise_id,
      planned_workout_id: element.planned_workout_id,
      sets: render_sets(element.planned_sets),
      inserted_at: element.inserted_at,
      updated_at: element.updated_at
    }
  end

  defp render_sets(nil), do: []

  defp render_sets(sets) when is_list(sets) do
    Enum.map(sets, &render_set/1)
  end

  defp render_sets(_), do: []

  defp render_set(set) do
    %{
      id: set.id,
      position: set.position,
      reps_min: set.reps_min,
      reps_max: set.reps_max,
      load_value: set.load_value,
      load_type: set.load_type,
      rest_seconds: set.rest_seconds
    }
  end
end
