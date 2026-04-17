defmodule EasyWeb.Clients.WorkoutSessionJSON do
  alias Easy.Training.{Exercise, PerformedSet, WorkoutSession}

  @spec show(map()) :: map()
  def show(%{session: session} = assigns) do
    last_performed = Map.get(assigns, :last_performed_by_element, %{})
    summary = Map.get(assigns, :summary)

    result = data(session, last_performed)
    result = if summary, do: Map.put(result, :summary, summary), else: result
    %{data: result}
  end

  @spec index(map()) :: map()
  def index(%{sessions: sessions, count: count}) do
    %{data: Enum.map(sessions, &data(&1, %{})), count: count}
  end

  defp data(%WorkoutSession{} = session, last_performed_by_element) do
    %{
      id: session.id,
      started_at: session.started_at,
      ended_at: session.ended_at,
      state: session.state,
      soreness_rating: session.soreness_rating,
      mood: session.mood,
      notes: session.notes,
      planned_workout_id: session.planned_workout_id,
      planned_snapshot: session.planned_snapshot,
      performed_sets: performed_sets_data(session.performed_sets),
      last_performed_by_element: last_performed_by_element,
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
