defmodule EasyWeb.Coach.PlannedWorkoutJSON do
  alias Easy.Training.Programming.PlannedWorkout

  def show(%{planned_workout: planned_workout}) do
    %{data: data(planned_workout)}
  end

  def data(%PlannedWorkout{} = workout) do
    %{
      id: workout.id,
      name: workout.name,
      notes: workout.notes,
      day_number: workout.day_number,
      training_plan_id: workout.training_plan_id,
      elements: render_elements(workout.workout_elements),
      inserted_at: workout.inserted_at,
      updated_at: workout.updated_at
    }
  end

  defp render_elements(nil), do: []

  defp render_elements(elements) when is_list(elements) do
    Enum.map(elements, &render_element/1)
  end

  defp render_elements(_), do: []

  defp render_element(element) do
    %{
      id: element.id,
      position: element.position,
      superset_group_id: element.superset_group_id,
      notes: element.notes,
      exercise_id: element.exercise_id,
      exercise: render_exercise(element.exercise),
      sets: render_sets(element.planned_sets)
    }
  end

  defp render_exercise(nil), do: nil

  defp render_exercise(exercise) do
    %{
      id: exercise.id,
      name: exercise.name,
      description: exercise.description
    }
  end

  defp render_sets(nil), do: []

  defp render_sets(sets) when is_list(sets) do
    Enum.map(sets, &render_set/1)
  end

  defp render_sets(_), do: []

  defp render_set(set) do
    %{
      target_reps: set.target_reps,
      load_value: set.load_value,
      load_type: set.load_type,
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
