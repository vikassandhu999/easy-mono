defmodule EasyWeb.WorkoutSessionJSON do
  alias Easy.Training.Tracking.{WorkoutSession, PerformedSet}

  @doc """
  Renders a list of workout sessions.
  """
  def index(%{sessions: sessions}) do
    %{data: for(session <- sessions, do: data(session))}
  end

  @doc """
  Renders a single workout session.
  """
  def show(%{session: session}) do
    %{data: data(session)}
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
      sets: sets_data(session.performed_sets)
    }
  end

  defp sets_data(sets) when is_list(sets) do
    for set <- sets, do: set_data(set)
  end

  defp sets_data(_), do: []

  defp set_data(%PerformedSet{} = set) do
    %{
      id: set.id,
      position: set.position,
      reps: set.reps,
      weight_kg: set.weight_kg,
      rpe: set.rpe,
      rir: set.rir,
      completed: set.completed,
      notes: set.notes,
      exercise_id: set.exercise_id
    }
  end
end
