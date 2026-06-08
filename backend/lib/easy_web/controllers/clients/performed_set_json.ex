defmodule EasyWeb.Clients.PerformedSetJSON do
  alias Easy.Training.{Exercise, PerformedSet}

  @spec show(map()) :: map()
  def show(%{set: set}) do
    %{data: data(set)}
  end

  defp data(%PerformedSet{} = set) do
    %{
      id: set.id,
      position: set.position,
      actual_reps: set.actual_reps,
      load_value: set.load_value,
      load_unit: set.load_unit,
      intensity_felt: set.intensity_felt,
      rpe: set.rpe,
      rir: set.rir,
      duration_seconds: set.duration_seconds,
      distance_value: set.distance_value,
      distance_unit: set.distance_unit,
      tempo_actual: set.tempo_actual,
      completed: set.completed,
      notes: set.notes,
      exercise_id: set.exercise_id,
      workout_element_id: set.workout_element_id,
      workout_session_id: set.workout_session_id,
      exercise: exercise_data(set.exercise),
      inserted_at: set.inserted_at,
      updated_at: set.updated_at
    }
  end

  defp exercise_data(%Exercise{} = exercise) do
    %{id: exercise.id, name: exercise.name, mechanics: exercise.mechanics, force: exercise.force}
  end

  defp exercise_data(_), do: nil
end
