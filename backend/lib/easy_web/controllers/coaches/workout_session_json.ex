defmodule EasyWeb.Coaches.WorkoutSessionJSON do
  alias Easy.Training.{Exercise, PerformedSet, WorkoutSession}

  def show(%{session: session}) do
    %{data: data(session)}
  end

  def index(%{sessions: sessions, count: count}) do
    %{data: Enum.map(sessions, &data/1), count: count}
  end

  defp data(%WorkoutSession{} = session) do
    %{
      id: session.id,
      started_at: session.started_at,
      ended_at: session.ended_at,
      state: session.state,
      soreness_rating: session.soreness_rating,
      notes: session.notes,
      client_id: session.client_id,
      business_id: session.business_id,
      planned_workout_id: session.planned_workout_id,
      planned_snapshot: session.planned_snapshot,
      performed_sets: performed_sets_data(session.performed_sets),
      inserted_at: session.inserted_at,
      updated_at: session.updated_at
    }
  end

  defp performed_sets_data(sets) when is_list(sets), do: Enum.map(sets, &performed_set_data/1)
  defp performed_sets_data(_), do: []

  defp performed_set_data(%PerformedSet{} = set) do
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
      business_id: set.business_id,
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
