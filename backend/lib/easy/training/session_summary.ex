defmodule Easy.Training.SessionSummary do
  import Ecto.Query

  alias Easy.Repo
  alias Easy.Training.{PerformedSet, Streak, WorkoutSession}

  @type t :: %{
          duration_minutes: non_neg_integer() | nil,
          sets_count: non_neg_integer(),
          total_volume_kg: float(),
          volume_delta_kg: float() | nil,
          prs: [map()],
          workout_streak: Streak.t()
        }

  @spec build(WorkoutSession.t()) :: t()
  def build(%WorkoutSession{} = session) do
    sets = load_sets(session.id)
    total_volume = compute_volume(sets)
    prev_volume = previous_volume(session)
    date = if session.ended_at, do: DateTime.to_date(session.ended_at), else: Date.utc_today()

    %{
      duration_minutes: duration_minutes(session),
      sets_count: length(sets),
      total_volume_kg: Float.round(total_volume, 1),
      volume_delta_kg: volume_delta(total_volume, prev_volume),
      prs: [],
      workout_streak: Streak.compute(session.business_id, session.client_id, date)
    }
  end

  # -- Duration -------------------------------------------------------------

  defp duration_minutes(%WorkoutSession{started_at: nil}), do: nil
  defp duration_minutes(%WorkoutSession{ended_at: nil}), do: nil

  defp duration_minutes(%WorkoutSession{started_at: started_at, ended_at: ended_at}) do
    DateTime.diff(ended_at, started_at, :second) |> div(60)
  end

  # -- Volume ---------------------------------------------------------------

  defp load_sets(session_id) do
    PerformedSet
    |> PerformedSet.for_session(session_id)
    |> Repo.all()
  end

  defp compute_volume(sets) do
    Enum.reduce(sets, 0.0, fn set, acc ->
      case {set.load_value, parse_reps(set.actual_reps), set.load_unit} do
        {load, reps, unit} when not is_nil(load) and reps > 0 and unit in [:kg, :lbs] ->
          weight = Decimal.to_float(load)
          acc + weight * reps

        _ ->
          acc
      end
    end)
  end

  defp parse_reps(nil), do: 0

  defp parse_reps(reps) when is_binary(reps) do
    case Integer.parse(reps) do
      {n, _} when n > 0 -> n
      _ -> 0
    end
  end

  defp parse_reps(_), do: 0

  # -- Previous volume (same planned_workout) --------------------------------

  defp previous_volume(%WorkoutSession{planned_workout_id: nil}), do: nil

  defp previous_volume(%WorkoutSession{} = session) do
    prev_session =
      WorkoutSession
      |> WorkoutSession.for_business(session.business_id)
      |> WorkoutSession.for_client(session.client_id)
      |> WorkoutSession.with_state(:completed)
      |> WorkoutSession.for_planned_workout(session.planned_workout_id)
      |> WorkoutSession.exclude(session.id)
      |> WorkoutSession.newest()
      |> limit(1)
      |> Repo.one()

    case prev_session do
      nil -> nil
      %WorkoutSession{id: prev_id} -> prev_id |> load_sets() |> compute_volume()
    end
  end

  # -- Volume delta ----------------------------------------------------------

  defp volume_delta(_current, nil), do: nil

  defp volume_delta(current, previous) do
    Float.round(current - previous, 1)
  end
end
