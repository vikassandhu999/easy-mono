defmodule EasyWeb.Clients.WorkoutSessionJSON do
  alias Easy.Training.{TrainingExercise, TrainingPerformedSet, TrainingSession}
  alias EasyWeb.TrainingSessionJSON

  @spec show(map()) :: map()
  def show(%{session: session}) do
    %{data: data(session)}
  end

  @spec index(map()) :: map()
  def index(%{sessions: sessions, count: count}) do
    %{data: Enum.map(sessions, &data/1), count: count}
  end

  @spec active(map()) :: map()
  def active(%{session: nil}), do: %{data: nil}
  def active(%{session: session}), do: %{data: data(session)}

  defp data(%TrainingSession{} = session) do
    %{
      id: session.id,
      kind: session.kind,
      date: session.date,
      started_at: session.started_at,
      closed_at: session.closed_at,
      state: session.state,
      soreness_rating: session.soreness_rating,
      notes: session.notes,
      snapshot_version: session.snapshot_version,
      prescription_snapshot: session.prescription_snapshot,
      source_plan_id: session.source_plan_id,
      source_workout_id: session.source_workout_id,
      ended_at: session.closed_at || session.ended_at,
      training_workout_id: session.source_workout_id || session.training_workout_id,
      planned_snapshot: TrainingSessionJSON.legacy_snapshot(session),
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
      planned_exercise_index: set.planned_exercise_index,
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
      swapped_from_exercise_id: set.swapped_from_exercise_id,
      exercise: exercise_data(set.exercise),
      inserted_at: set.inserted_at,
      updated_at: set.updated_at
    }
  end

  defp exercise_data(%TrainingExercise{} = exercise) do
    %{
      id: exercise.id,
      name: exercise.name,
      mechanics: exercise.mechanics,
      force: exercise.force,
      tracking_type: exercise.tracking_type
    }
  end

  defp exercise_data(_), do: nil
end
