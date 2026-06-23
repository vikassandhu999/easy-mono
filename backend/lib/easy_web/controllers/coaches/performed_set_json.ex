defmodule EasyWeb.Coaches.PerformedSetJSON do
  alias Easy.Training.{TrainingExercise, PerformedSet}

  @spec show(%{set: PerformedSet.t()}) :: map()
  def show(%{set: set}) do
    %{data: data(set)}
  end

  defp data(%PerformedSet{} = set) do
    %{
      id: set.id,
      exercise_name: set.exercise_name,
      set_type: set.set_type,
      position: set.position,
      reps: set.reps,
      load_value: set.load_value,
      load_unit: set.load_unit,
      rpe: set.rpe,
      duration_seconds: set.duration_seconds,
      distance_value: set.distance_value,
      distance_unit: set.distance_unit,
      completed: set.completed,
      notes: set.notes,
      exercise_id: set.exercise_id,
      training_session_id: set.training_session_id,
      exercise: exercise_data(set.exercise),
      inserted_at: set.inserted_at,
      updated_at: set.updated_at
    }
  end

  defp exercise_data(%TrainingExercise{} = exercise) do
    %{id: exercise.id, name: exercise.name, mechanics: exercise.mechanics, force: exercise.force}
  end

  defp exercise_data(_), do: nil
end
