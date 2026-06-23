defmodule EasyWeb.Clients.WorkoutSessionJSON do
  alias Easy.Training.{TrainingExercise, TrainingPerformedSet, TrainingSession}

  @spec show(map()) :: map()
  def show(%{session: session}) do
    %{data: data(session)}
  end

  @spec index(map()) :: map()
  def index(%{sessions: sessions, count: count}) do
    %{data: Enum.map(sessions, &data/1), count: count}
  end

  defp data(%TrainingSession{} = session) do
    %{
      id: session.id,
      date: session.date,
      started_at: session.started_at,
      ended_at: session.ended_at,
      state: session.state,
      soreness_rating: session.soreness_rating,
      notes: session.notes,
      training_workout_id: session.training_workout_id,
      training_schedule_entry_id: session.training_schedule_entry_id,
      planned_snapshot: session.planned_snapshot,
      performed_sets: performed_sets_data(session.performed_sets),
      inserted_at: session.inserted_at,
      updated_at: session.updated_at
    }
  end

  defp performed_sets_data(sets) when is_list(sets), do: Enum.map(sets, &performed_set_data/1)
  defp performed_sets_data(_), do: []

  defp performed_set_data(%TrainingPerformedSet{} = set) do
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
